"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, Sparkles, HandCoins, ShieldCheck, Layers, CheckCircle2, Clock, IndianRupee, RefreshCw } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  Pagination,
  Spinner,
  StatCard,
} from "@/components/ui";
import { useApp } from "@/components/ui/AppContext";
import {
  createRecord,
  deleteRecord,
  getEditValues,
  getFilterOptions,
  getFileText,
  getTicketMessages,
  addTicketMessage,
  listRecords,
  performAction,
  updateRecord,
} from "@/services";
import { exportCsv } from "@/lib/csv";
import { ALL_PAGES } from "@/data/pages";
import {
  DataTable,
  DonutCard,
  FilterBar,
  FormModal,
  Tabs,
} from "@/components/ui/blocks";
import { inr, num } from "@/lib/format";

const PAGE_SIZE = 10;
const COLORS = [
  "#1E9E6A",
  "#FF9F1C",
  "#D64545",
  "#8B5CF6",
  "#2F6FED",
  "#94A3B8",
];
// Each section keeps its chip identity: brand blue for merchant, emerald for
// collection, violet for super admin â€” same layout, distinct colour story.
const SECTION = {
  merchantAdmin: { chip: "Merchant Admin", chipIcon: Sparkles, variant: "brand" },
  collectionAdmin: { chip: "Collection Admin", chipIcon: HandCoins, variant: "emerald" },
  superAdmin: { chip: "Super Admin", chipIcon: ShieldCheck, variant: "violet" },
};
// List-page stat tiles cycle the committed hue families of the dashboard cards.
const STAT_ICONS = [Layers, CheckCircle2, Clock, IndianRupee];
const STAT_COLORS = ["blue", "green", "amber", "purple"];
const label = (k) =>
  k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace("Kyc", "KYC")
    .replace("Mcc", "Category (MCC)");
const cell = (col, row) =>
  col.type === "money" ? (
    inr(row[col.key])
  ) : ["status", "priority", "bankStatus", "risk", "riskBand", "kycStatus"].includes(
      col.key,
    ) ? (
    <Badge value={row[col.key]} />
  ) : (
    row[col.key]
  );

export default function ResourcePage({ dashboard, pageKey }) {
  const config = ALL_PAGES[dashboard][pageKey];
  const router = useRouter();
  const { range, search: globalSearch, toast } = useApp();
  const section = SECTION[dashboard] || SECTION.merchantAdmin;
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("All");
  const [filters, setFilters] = useState({});
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editValues, setEditValues] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  // A form-backed action (e.g. assigning a device needs a merchant code) opens a FormModal
  // instead of a yes/no ConfirmDialog; its entered values ride along with the action.
  const [actionForm, setActionForm] = useState(null);
  // The support message thread drawer, enabled per page via config.thread.
  const [threadRow, setThreadRow] = useState(null);
  const [threadMsgs, setThreadMsgs] = useState(null);
  const [threadText, setThreadText] = useState("");
  const [threadInternal, setThreadInternal] = useState(false);
  const [threadBusy, setThreadBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const search = q || globalSearch;

  useEffect(() => {
    setPage(1);
  }, [tab, filters, search, range]);
  const load = useCallback(() => {
    setError(null);
    setData(null);
    listRecords(config.resource, {
      tab,
      tabField: config.tabField,
      search,
      filters,
      base: config.base,
      page,
      pageSize: PAGE_SIZE,
      range,
    })
      .then(setData)
      .catch(setError);
  }, [config, tab, search, filters, page, range]);
  useEffect(load, [load, version]);
  // Re-fetch on demand: same seam as the first paint, with a spinning button while it runs.
  const refresh = () => { setRefreshing(true); load(); setTimeout(() => setRefreshing(false), 600); };

  const [options, setOptions] = useState({});
  useEffect(() => {
    Promise.all(
      (config.filters || []).map(async (k) => [
        k,
        await getFilterOptions(config.resource, k),
      ]),
    )
      .then((e) => setOptions(Object.fromEntries(e)))
      .catch(() => setOptions({}));
  }, [config, version]);
  const tabs = useMemo(
    () =>
      data && config.tabField
        ? [["All", data.all], ...Object.entries(data.counts)]
        : [],
    [data, config],
  );
  const chart = useMemo(
    () =>
      data && config.tabField
        ? Object.entries(data.counts).map(([name, value], i) => ({
            name,
            value,
            color: COLORS[i % COLORS.length],
          }))
        : [],
    [data, config],
  );
  // Stat cards are computed from the rows that were actually loaded. A page can declare
  // statsFor(data) in its config; without one the honest default is the scoped total plus the
  // biggest status buckets. Nothing renders until the data is in, so a failed or unmapped list
  // never shows invented numbers above it.
  const stats = useMemo(() => {
    if (!data) return [];
    if (config.statsFor) return config.statsFor(data);
    return [["Total", num(data.all)], ...Object.entries(data.counts).slice(0, 3)];
  }, [data, config]);

  // Actions that need operator input (a merchant code, a date) open a form; the plain transitions
  // confirm with a yes/no dialog. Either way the row rides along so a route that keys on a row
  // field (regenerating a static QR by merchant code) can read it.
  const openAction = (a) => (a.form ? setActionForm(a) : setConfirm(a));
  const runAction = async (a, values) => {
    setBusy(true);
    try {
      await performAction(config.resource, selected.id, values ? { ...a, ...values } : a, selected);
      toast(`${a.label}: completed`);
      setConfirm(null);
      setActionForm(null);
      setSelected(null);
      setVersion((v) => v + 1);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const openThread = async (row) => {
    setThreadRow(row);
    setThreadMsgs(null);
    setThreadText("");
    try {
      setThreadMsgs(await getTicketMessages(row.id));
    } catch (e) {
      setThreadMsgs([]);
      toast(e.message || "Could not load the message thread.", "error");
    }
  };
  const sendThread = async () => {
    if (!threadText.trim()) return;
    setThreadBusy(true);
    try {
      await addTicketMessage(threadRow.id, threadText.trim(), threadInternal);
      setThreadText("");
      setThreadMsgs(await getTicketMessages(threadRow.id));
    } catch (e) {
      toast(e.message || "Could not send the reply.", "error");
    } finally {
      setThreadBusy(false);
    }
  };
  // The edit form is the create form with this row's own values in the boxes, and the values come
  // from the seam rather than from the table: the columns are lossy on purpose ("Yes"/"No",
  // "Web: https://â€¦"), so pre-filling from them would save those words back into the record.
  const openEdit = async (row) => {
    setEditRow(row);
    setEditValues(null);
    try {
      setEditValues(await getEditValues(config.resource, row));
    } catch (e) {
      setEditRow(null);
      toast(e.message || "Could not read this row for editing.", "error");
    }
  };
  const saveEdit = async (values) => {
    try {
      await updateRecord(config.resource, editRow.id, values);
    } catch (e) {
      // Staying open keeps what the operator typed; the error text explains why it did not save.
      toast(e.message || "Could not save the changes.", "error");
      return;
    }
    setEditRow(null);
    setEditValues(null);
    setSelected(null);
    setVersion((v) => v + 1);
    toast(`Updated ${editRow.id}`);
  };
  const runDelete = async () => {
    setBusy(true);
    try {
      await deleteRecord(config.resource, deleteRow.id);
    } catch (e) {
      setBusy(false);
      toast(e.message || "Could not delete the record.", "error");
      return;
    }
    setBusy(false);
    setDeleteRow(null);
    setSelected(null);
    setVersion((v) => v + 1);
    toast(`${config.delete.successLabel || "Deleted"} ${deleteRow.id}`);
  };
  const doExport = async () => {
    let res;
    try {
      res = await listRecords(config.resource, {
        tab,
        tabField: config.tabField,
        search,
        filters,
        base: config.base,
        page: 1,
        pageSize: 100000,
        range,
      });
    } catch (e) {
      toast(e.message || "Could not load rows for export.", "error");
      return;
    }
    exportCsv(
      `${config.resource}-${new Date().toISOString().slice(0, 10)}.csv`,
      config.columns,
      res.rows,
    );
    toast(`Exported ${res.rows.length} rows to CSV`);
  };

  const downloadRow = async (row) => {
    // A generated report has its own file in object storage, streamed back through the
    // authenticated client. Every other row is written out from the columns on screen.
    if (!row.downloadPath) {
      exportCsv(`${row.id}.csv`, config.columns, [row]);
      toast(`Exported ${row.id} to CSV`);
      return;
    }
    try {
      const text = await getFileText(row.downloadPath);
      const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${row.id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast(`Downloaded ${row.id}.csv`);
    } catch (e) {
      toast(e.message || "Could not download the report.", "error");
    }
  };

  return (
    <PageShell variant={section.variant}>
      <PageHeader
        chip={section.chip}
        chipIcon={section.chipIcon}
        title={config.title}
        subtitle={config.subtitle}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} disabled={refreshing}>
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} aria-hidden />
              Refresh
            </Button>
            <Button variant="outline" onClick={doExport}>
              <Download size={16} aria-hidden />
              Export CSV
            </Button>
            {config.createHref && (
              <Button onClick={() => router.push(config.createHref)}>
                <Plus size={16} aria-hidden />
                {config.createLabel || "Add"}
              </Button>
            )}
            {config.create && (
              <Button onClick={() => setShowForm(true)}>
                <Plus size={16} aria-hidden />
                {config.create.label}
              </Button>
            )}
          </div>
        }
      />

      {stats.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
          {stats.map(([k, v], i) => (
            <StatCard
              key={k}
              label={k}
              value={v}
              color={STAT_COLORS[i % STAT_COLORS.length]}
              icon={STAT_ICONS[i % STAT_ICONS.length]}
              i={i}
              style={{ minWidth: '18rem' }}
            />
          ))}
        </div>
      )}

      {/* {chart.length > 0 && <DonutCard title={`${label(config.tabField)} breakdown`} data={chart} ariaLabel={`Donut chart of ${config.title} by ${config.tabField}`} />} */}

      <Card delay={220}>
        <FilterBar
          search={q}
          onSearch={setQ}
          filters={(config.filters || []).map((k) => ({
            key: k,
            label: label(k),
            options: options[k] || [],
          }))}
          values={filters}
          onChange={setFilters}
          onReset={() => {
            setQ("");
            setFilters({});
            setTab("All");
          }}
        />
        {tabs.length > 0 && <Tabs tabs={tabs} active={tab} onChange={setTab} />}

        {error ? (
          error.unmapped ? (
            <div className="p-8 text-sm">
              <p className="font-medium">This page has no backend endpoint yet.</p>
              <p className="mt-1 text-slate-600">{error.message}</p>
            </div>
          ) : (
            <>
              <ErrorState onRetry={load} />
              <p className="pb-4 text-center text-xs text-slate-500">{error.message}</p>
            </>
          )
        ) : !data ? (
          <Spinner />
        ) : data.rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <DataTable
              columns={config.columns}
              rows={data.rows}
              renderCell={cell}
              renderActions={(r) => (
                <>
                  {config.download && (
                    <Button
                      variant="outline"
                      className="mr-2 !px-2 !py-1"
                      onClick={(e) => { e.stopPropagation(); downloadRow(r); }}
                    >
                      Download
                    </Button>
                  )}
                  {config.edit && (
                    <Button
                      variant="outline"
                      className="mr-2 !px-2 !py-1"
                      onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                    >
                      Edit
                    </Button>
                  )}
                  {config.delete && (
                    <Button
                      variant="danger"
                      className="mr-2 !px-2 !py-1"
                      onClick={(e) => { e.stopPropagation(); setDeleteRow(r); }}
                    >
                      {config.delete.buttonLabel || "Delete"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="!px-2 !py-1"
                    onClick={(e) => { e.stopPropagation(); config.detailHref ? router.push(config.detailHref(r)) : setSelected(r); }}
                  >
                    View
                  </Button>
                </>
              )}
              onRowClick={(r) => config.detailHref ? router.push(config.detailHref(r)) : setSelected(r)}
            />
            <Pagination
              page={page}
              total={data.total}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </>
        )}
      </Card>

      {selected && (
        <Drawer
          title={`${config.title.replace(/s$/, "")} Details`}
          onClose={() => setSelected(null)}
        >
          <dl className="divide-y divide-slate-100 text-sm">
            {Object.entries(selected)
              // `raw` repeats everything already listed; `documents` is a file list the loan
              // review screen renders with presigned links, not a JSON blob in a drawer.
              .filter(([k]) => k !== "iso" && k !== "raw" && k !== "documents")
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-slate-500">{label(k)}</dt>
                  <dd className="text-right font-medium">
                    {["amount", "volume", "gmv"].includes(k) ? (
                      inr(v)
                    ) : k === "status" ? (
                      <Badge value={v} />
                    ) : v !== null && typeof v === "object" ? (
                      JSON.stringify(v)
                    ) : (
                      String(v ?? "-")
                    )}
                  </dd>
                </div>
              ))}
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            {(config.actions || [])
              .filter((a) => !a.when || a.when(selected))
              .map((a) => (
                <Button
                  key={a.label}
                  variant={a.danger ? "danger" : "primary"}
                  onClick={() => openAction(a)}
                >
                  {a.label}
                </Button>
              ))}
            {config.thread && (
              <Button variant="outline" onClick={() => openThread(selected)}>
                Thread
              </Button>
            )}
            {config.edit && (
              <Button variant="primary" onClick={() => openEdit(selected)}>
                Edit
              </Button>
            )}
            {config.delete && (
              <Button variant="danger" onClick={() => setDeleteRow(selected)}>
                {config.delete.buttonLabel || "Delete"}
              </Button>
            )}
            <Button variant="outline" onClick={() => downloadRow(selected)}>
              <Download size={16} aria-hidden />
              Download
            </Button>
          </div>
        </Drawer>
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.label}
          message={confirm.confirm}
          danger={confirm.danger}
          busy={busy}
          onConfirm={() => runAction(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {actionForm && (
        <FormModal
          title={actionForm.label}
          fields={actionForm.form}
          initial={actionForm.initial || {}}
          onClose={() => setActionForm(null)}
          onSubmit={(values) => runAction(actionForm, values)}
        />
      )}
      {threadRow && (
        <Drawer
          title={`Thread Â· ${threadRow.id}`}
          onClose={() => setThreadRow(null)}
        >
          <p className="mb-3 text-sm text-slate-600">
            {threadRow.subject || "Support ticket conversation."}
          </p>
          <div className="mb-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {threadMsgs === null ? (
              <Spinner />
            ) : threadMsgs.length === 0 ? (
              <p className="text-sm text-slate-500">No messages yet.</p>
            ) : (
              threadMsgs.map((m) => (
                <div
                  key={m.id}
                  className={
                    "rounded-xl border p-3 text-sm " +
                    (m.internal
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50")
                  }
                >
                  <p className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{m.author}</span>
                    <span>{m.createdOn}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-800">{m.body}</p>
                  {m.internal && (
                    <p className="mt-1 text-xs font-medium text-amber-700">Internal note</p>
                  )}
                </div>
              ))
            )}
          </div>
          <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={threadInternal}
              onChange={(e) => setThreadInternal(e.target.checked)}
            />
            Internal note (not shown to the merchant)
          </label>
          <textarea
            rows={3}
            className="mb-2 w-full rounded-xl border border-slate-300 p-2.5 text-sm shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            placeholder="Write a replyâ€¦"
            value={threadText}
            onChange={(e) => setThreadText(e.target.value)}
          />
          <Button onClick={sendThread} disabled={threadBusy || !threadText.trim()}>
            {threadBusy ? "Sendingâ€¦" : "Send reply"}
          </Button>
        </Drawer>
      )}
      {showForm && (
        <FormModal
          title={config.create.label}
          fields={config.create.form}
          tabs={config.create.tabs}
          initial={config.create.initial || {}}
          onClose={() => setShowForm(false)}
          onSubmit={async (v) => {
            try {
              await createRecord(config.resource, v, config.create);
            } catch (e) {
              toast(e.message || "Could not create the record.", "error");
              return;
            }
            setShowForm(false);
            setVersion((n) => n + 1);
            toast(`${config.create.label}: created`);
          }}
        />
      )}
      {editRow && editValues && (
        <FormModal
          title={config.edit.label || "Edit"}
          fields={(config.create?.form || []).filter(
            (f) => !(config.edit.skip || []).includes(f.name),
          )}
          initial={editValues || {}}
          onClose={() => {
            setEditRow(null);
            setEditValues(null);
          }}
          onSubmit={saveEdit}
        />
      )}
      {deleteRow && (
        <ConfirmDialog
          title={config.delete.label || "Delete"}
          message={
            config.delete.confirm ||
            "This removes the record from the backend. It cannot be undone from this screen."
          }
          danger
          busy={busy}
          onConfirm={runDelete}
          onCancel={() => setDeleteRow(null)}
        />
      )}
    </PageShell>
  );
}
