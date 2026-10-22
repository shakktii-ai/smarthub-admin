"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, TrendingUp } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Pagination,
  Spinner,
} from "@/components/ui";
import { useApp } from "@/components/ui/AppContext";
import {
  createRecord,
  getFilterOptions,
  listRecords,
  performAction,
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
const label = (k) =>
  k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace("Kyc", "KYC")
    .replace("Mcc", "Category (MCC)");
const cell = (col, row) =>
  col.type === "money" ? (
    inr(row[col.key])
  ) : ["status", "priority", "bankStatus", "risk", "riskBand"].includes(
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
  const [tab, setTab] = useState("All");
  const [filters, setFilters] = useState({});
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [version, setVersion] = useState(0);
  const search = q || globalSearch;

  useEffect(() => {
    setPage(1);
  }, [tab, filters, search, range]);
  const load = useCallback(() => {
    setError(false);
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
      .catch(() => setError(true));
  }, [config, tab, search, filters, page, range]);
  useEffect(load, [load, version]);

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

  const runAction = async () => {
    setBusy(true);
    try {
      await performAction(config.resource, selected.id, confirm);
      toast(`${confirm.label}: done (simulated)`);
      setConfirm(null);
      setSelected(null);
      setVersion((v) => v + 1);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };
  const doExport = async () => {
    const res = await listRecords(config.resource, {
      tab,
      tabField: config.tabField,
      search,
      filters,
      base: config.base,
      page: 1,
      pageSize: 100000,
      range,
    });
    exportCsv(
      `${config.resource}-${new Date().toISOString().slice(0, 10)}.csv`,
      config.columns,
      res.rows,
    );
    toast(`Exported ${res.rows.length} rows to CSV`);
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{config.title}</h1>
          <p className="text-sm text-slate-600">{config.subtitle}</p>
        </div>
        <div className="flex gap-2">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {config.stats.map(([k, v], i) => (
          <Card key={k}>
            <p className="text-sm text-slate-600">{k}</p>
            <p className="text-2xl font-bold">{v}</p>
            {i === 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp size={12} aria-hidden />
                12.4%{" "}
                <span className="font-normal text-slate-500">
                  vs previous 30 days
                </span>
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* {chart.length > 0 && <DonutCard title={`${label(config.tabField)} breakdown`} data={chart} ariaLabel={`Donut chart of ${config.title} by ${config.tabField}`} />} */}

      <Card>
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
          <ErrorState onRetry={load} />
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
                      onClick={() => toast(`${r.name} downloaded (simulated)`)}
                    >
                      Download
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="!px-2 !py-1"
                    onClick={() =>
                      config.detailHref
                        ? router.push(config.detailHref(r))
                        : setSelected(r)
                    }
                  >
                    View
                  </Button>
                </>
              )}
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
              .filter(([k]) => k !== "iso")
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-slate-500">{label(k)}</dt>
                  <dd className="text-right font-medium">
                    {["amount", "volume", "gmv"].includes(k) ? (
                      inr(v)
                    ) : k === "status" ? (
                      <Badge value={v} />
                    ) : (
                      String(v)
                    )}
                  </dd>
                </div>
              ))}
          </dl>
          <p className="mt-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
            Demo mode: actions below only change local sample data.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(config.actions || [])
              .filter((a) => !a.when || a.when(selected))
              .map((a) => (
                <Button
                  key={a.label}
                  variant={a.danger ? "danger" : "primary"}
                  onClick={() => setConfirm(a)}
                >
                  {a.label}
                </Button>
              ))}
            <Button
              variant="outline"
              onClick={() =>
                exportCsv(`${selected.id}.csv`, config.columns, [selected])
              }
            >
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
          onConfirm={runAction}
          onCancel={() => setConfirm(null)}
        />
      )}
      {showForm && (
        <FormModal
          title={config.create.label}
          fields={config.create.form}
          onClose={() => setShowForm(false)}
          onSubmit={async (v) => {
            await createRecord(config.resource, v, config.create);
            setShowForm(false);
            setVersion((n) => n + 1);
            toast(`${config.create.label}: created (simulated)`);
          }}
        />
      )}
    </>
  );
}
