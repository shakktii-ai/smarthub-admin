'use server';

import { revalidatePath } from 'next/cache';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';

const ALERTS = '/api/risk/v1/alerts';
const RULES = '/api/risk/v1/rules';
const SUMMARY = '/api/risk/v1/summary';
const EVALUATE = '/api/risk/v1/evaluate';
const MERCHANTS = '/api/merchants/v1';
const PAGE_SIZE = 50;
const STATUSES = ['open', 'acknowledged', 'resolved', 'dismissed'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const ACTIONS = ['acknowledge', 'resolve', 'dismiss', 'assign'];

const clean = (value, max) => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
};

const positiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const emptySummary = {
  total_open: 0,
  critical_open: 0,
  by_severity: {},
  by_status: {},
};

// Both tabs are read together: the counts and the rule list are needed before
// the operator switches tab, and three parallel reads against indexed endpoints
// are cheaper than a second round trip on every tab click.
export async function loadRisk(filters = {}) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return {
      error: a.error,
      alerts: { rows: [], total: 0, page: 1, limit: PAGE_SIZE },
      summary: emptySummary,
      rules: [],
      statusCounts: {},
      me: null,
    };
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const params = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };

  const status = STATUSES.includes(filters.status) ? filters.status : null;
  if (status) params.status = status;

  const severity = SEVERITIES.includes(filters.severity) ? filters.severity : null;
  if (severity) params.severity = severity;

  const type = clean(filters.type, 60);
  if (type) params.alert_type = type;
  const merchant = clean(filters.merchant, 40);
  if (merchant) params.merchant_code = merchant;
  const search = clean(filters.q, 100);
  if (search) params.q = search;

  const [alertsResult, summaryResult, rulesResult] = await Promise.allSettled([
    a.api.get(ALERTS, params),
    a.api.get(SUMMARY),
    a.api.get(RULES, { limit: 200 }),
  ]);

  const alerts =
    alertsResult.status === 'fulfilled'
      ? {
          rows: alertsResult.value?.items ?? [],
          total: Number(alertsResult.value?.total) || 0,
          page,
          limit: PAGE_SIZE,
        }
      : { rows: [], total: 0, page, limit: PAGE_SIZE };

  const summary =
    summaryResult.status === 'fulfilled'
      ? { ...emptySummary, ...(summaryResult.value || {}) }
      : emptySummary;

  const rules =
    rulesResult.status === 'fulfilled' ? rulesResult.value?.items ?? [] : [];

  return {
    error:
      alertsResult.status === 'rejected'
        ? alertsResult.reason?.message || 'Could not load the risk alerts.'
        : null,
    rulesError:
      rulesResult.status === 'rejected'
        ? rulesResult.reason?.message || 'Could not load the risk rules.'
        : null,
    alerts,
    summary,
    rules,
    statusCounts: summary.by_status || {},
    me: { id: a.profile.id, name: a.profile.full_name || a.profile.email },
  };
}

// Acknowledge / resolve / dismiss / assign all live on the alert itself, so one
// action keeps the four transitions together and returns the updated alert.
export async function decideRiskAlert(alertRef, action, note, assigneeId) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const ref = clean(alertRef, 40);
  if (!ref) {
    return { error: 'Unknown risk alert.' };
  }
  if (!ACTIONS.includes(action)) {
    return { error: 'Choose a valid alert action.' };
  }

  const { profile, api } = a;
  if (!rateLimit(`risk-alert:${profile.id}`, 80)) {
    return { error: 'Too many alert changes. Try again in a minute.' };
  }

  const noteText = clean(note, 2000);

  if ((action === 'resolve' || action === 'dismiss') && (!noteText || noteText.length < 8)) {
    return {
      error: `A ${action === 'resolve' ? 'resolution' : 'dismissal'} needs a note of at least 8 characters, so the next person knows why the case is closed.`,
    };
  }

  const target = positiveInt(assigneeId);
  if (action === 'assign' && !target) {
    return { error: 'Pick the person this alert should belong to.' };
  }

  const path = `${ALERTS}/${encodeURIComponent(ref)}/${action}`;
  const body =
    action === 'acknowledge'
      ? {}
      : action === 'assign'
        ? { assigned_to: target }
        : { resolution_note: noteText };

  try {
    const alert = await api.post(path, body);
    revalidatePath('/super-admin/risk');
    return { alert };
  } catch (error) {
    return { error: error.message || 'Could not update that alert.' };
  }
}

// The threshold is stored as JSON, but the form collects the three shapes the
// engine actually evaluates. Building the JSON here means the browser cannot
// save ₹50,000 as 5,000,000 paise or the wrong key.
const buildThreshold = (category, values) => {
  const window = positiveInt(values.windowSeconds) || 3_600;

  if (category === 'velocity') {
    const limit = positiveInt(values.maxPayments);
    if (!limit) return { error: 'Enter how many payments are allowed before the rule fires.' };
    return { threshold: { max_payments: limit, window_seconds: window } };
  }
  if (category === 'amount') {
    const rupees = Number(values.maxAmount);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      return { error: 'Enter the rupee amount allowed before the rule fires.' };
    }
    return { threshold: { max_amount_paise: Math.round(rupees * 100), window_seconds: window } };
  }
  if (category === 'device') {
    const limit = positiveInt(values.maxDevices);
    if (!limit) return { error: 'Enter how many distinct devices are allowed.' };
    return { threshold: { max_devices: limit, window_seconds: window } };
  }

  // Existing custom categories keep their JSON. A new custom category is not
  // offered by the form, but editing an old rule must not wipe its threshold.
  const raw = String(values.thresholdRaw || '').trim();
  if (!raw) return { threshold: null };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: 'The custom threshold must be a JSON object, for example {"limit": 10}.' };
    }
    return { threshold: parsed };
  } catch {
    return { error: 'The custom threshold is not valid JSON.' };
  }
};

export async function saveRiskRule(ruleCode, values = {}) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, api } = a;
  if (!rateLimit(`risk-rule:${profile.id}`, 40)) {
    return { error: 'Too many rule changes. Try again in a minute.' };
  }

  const editing = clean(ruleCode, 40);
  const name = clean(values.name, 255);
  const category = clean(values.category, 60);
  const severity = SEVERITIES.includes(values.severity) ? values.severity : 'medium';
  const description = clean(values.description, 2000);
  const code = clean(values.code, 40);

  if (!name) {
    return { error: 'The rule needs a name, because an alert quotes it.' };
  }
  if (!category) {
    return { error: 'Pick the kind of rule this is.' };
  }
  if (!editing && code && !/^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/.test(code)) {
    return {
      error:
        'A rule code can use letters, numbers, hyphens and underscores, and must be 2–40 characters.',
    };
  }

  const built = buildThreshold(category, values);
  if (built.error) {
    return { error: built.error };
  }

  const body = {
    name,
    category,
    severity,
    threshold: built.threshold,
    description,
  };

  try {
    const rule = editing
      ? await api.patch(`${RULES}/${encodeURIComponent(editing)}`, body)
      : await api.post(RULES, {
          ...(code ? { rule_code: code.toUpperCase() } : {}),
          ...body,
        });
    revalidatePath('/super-admin/risk');
    return { rule };
  } catch (error) {
    return { error: error.message || 'Could not save that rule.' };
  }
}

// The backend has no delete route: a rule stays in the rulebook so old alerts
// keep a readable name. Turning it off is the supported retirement path.
export async function setRiskRuleActive(ruleCode, active) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const code = clean(ruleCode, 40);
  if (!code) {
    return { error: 'Unknown risk rule.' };
  }
  if (typeof active !== 'boolean') {
    return { error: 'Choose whether the rule is on or off.' };
  }

  try {
    const rule = await a.api.patch(`${RULES}/${encodeURIComponent(code)}`, {
      is_active: active,
    });
    revalidatePath('/super-admin/risk');
    return { rule };
  } catch (error) {
    return { error: error.message || 'Could not change that rule.' };
  }
}

// A manual evaluation, for a merchant the operator is worried about. It creates
// real alerts for every active rule that fires, exactly like a live event.
export async function evaluateRisk({ merchant, amountPaise, eventType, deviceId } = {}) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, api } = a;
  if (!rateLimit(`risk-evaluate:${profile.id}`, 30)) {
    return { error: 'Too many manual checks. Try again in a minute.' };
  }

  const merchantCode = clean(merchant, 40);
  if (!merchantCode) {
    return { error: 'Pick the merchant to evaluate.' };
  }

  const amount = Number(amountPaise);
  if (!Number.isInteger(amount) || amount < 0) {
    return { error: 'Enter the payment amount in rupees.' };
  }

  const device = positiveInt(deviceId);
  try {
    const result = await api.post(EVALUATE, {
      merchant_code: merchantCode,
      amount_paise: amount,
      event_type: clean(eventType, 40) || 'payment',
      ...(device ? { device_id: device } : {}),
    });
    revalidatePath('/super-admin/risk');
    return { result };
  } catch (error) {
    return { error: error.message || 'Could not run the risk check.' };
  }
}

export async function searchMerchants(query) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error, merchants: [] };
  }

  const text = clean(query, 100);
  if (!rateLimit(`risk-merchant:${a.profile.id}`, 40)) {
    return { error: 'Too many searches. Try again in a minute.', merchants: [] };
  }

  try {
    const res = await a.api.get(MERCHANTS, {
      limit: 20,
      ...(text ? { q: text } : {}),
    });
    return {
      merchants: (res?.items ?? []).map((merchant) => ({
        id: merchant.merchant_code,
        name: merchant.display_name || merchant.legal_name || merchant.merchant_code,
        meta: merchant.merchant_code,
      })),
    };
  } catch (error) {
    return { error: error.message || 'Could not search merchants.', merchants: [] };
  }
}
