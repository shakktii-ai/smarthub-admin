# CHANGES_LOG.md — smarthub-admin

## 2026-11-18 (late, IST) — Raw endpoint strings out of UI copy + local backend 500 root cause for the approve dialog

**The merchant-onboarding approve dialog showed a raw endpoint string; the underlying route was also 500ing whenever an operator actually approved.**

- Approval dialog now reads plain English: "Approving creates the merchant account, links the applicant as owner, and moves this application to Approved. This cannot be undone." (components/onboarding/ApplicationDetail.jsx).
- Every other raw-endpoint-in-copy occurrence cleaned: merchants Suspend/Activate dialogs, onboarding-advance step message, MerchantDirectory approve + onboarding-step dialogs, document-review caption, AppFeatureFlags help caption.
- Root cause of the 500: merchant_onboarding/service.py _link_owner bound user.role_list (the method) instead of calling user.role_list(); the "argument of type 'method' is not iterable" traceback crashed before the response ever reached the browser, which is why the browser reported a CORS error (no Access-Control-Allow-Origin header on the crashed response). Fixed in the backend repo (1169/1169 tests pass) + regression test added.
- Local dev now points the admin panel at http://127.0.0.1:8000 (user-side env edit), which is how the crash was reproduced. After the local fix the approve POST returns 401 (expected auth contract), not a 500.
- Reminder: the dialog text change shows immediately (fast refresh); the route fix ships on the next backend deploy.

## 2026-11-18 (IST) — Super-admin Mandate Refunds console

**Owner: the refund side of the mandate lifecycle, as a proper super-admin tool — not patches.**

- New navigation entry **Mandate Refunds** (icon `Undo2`, registered in `config/dashboards/superAdmin.js` + `Sidebar.jsx` ICONS map).
- New page `app/super-admin/mandate-refunds/page.jsx` + server actions in `actions.js`:
  - `listMandateDebits` — search (order id / mandate id / phone / name) + status filter, paginated 20/page, SSR.
  - `listRefunds` — recent refunds with the same search/filter.
  - `refundMandateDebit` — refund one **successful** debit; full by default, partial with `amount_paise`; sends a fresh `Idempotency-Key` per click; requires super_admin.
- Search hits `/api/super-admin/v1/mandate-debits` and `/refunds`; refund POSTs to `/api/super-admin/v1/mandate-debits/{order_id}/refund` (full or partial).
- New client `components/superadmin/MandateRefunds.jsx`: search bar, **Debits | Refunds** tabs, status filter, debit columns (order, mandate, customer, amount, status, refundable balance, date) and refunds columns (refund id, order, mandate, customer, amount, FULL/PARTIAL type, status, date), pagination, and a **Refund modal**: pick full vs partial with a live refundable balance check, optional reason (goes to the audit log), confirm disabled until the amount is valid.
- Flow is read-then-write against the existing provider-backed `MandateService.create_refund`; balances are enforced server-side — the UI only stops obvious mistakes.
- Not built (per owner): no agent/manager self-serve refund anywhere; refunds stay super-admin with audit.
- Verification note: repo has no test suite for this app; no build was run as requested — review by hand; `components/ui` Button/Modal/inputCls primitives reused as in sibling pages.
