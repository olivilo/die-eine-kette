"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, DataTable, Badge, Card } from "@/components/ui";
import { api, formatDate, type Budget } from "@/lib/api";

const SCOPES = ["organization", "group", "user", "token"];
const PERIODS = ["none", "daily", "weekly", "monthly"];
const ON_EXHAUST = ["block", "warn", "downgrade"];

export default function BudgetsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const lng = i18n.resolvedLanguage;
  const [items, setItems] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", scope: "organization", ref: "", amount: 0, period: "monthly", on_exhaust: "block" });
  const isRoot = (user?.role ?? 0) >= 100;

  const euro = useCallback(
    (micro: number) => new Intl.NumberFormat(lng, { style: "currency", currency: "EUR" }).format((micro || 0) / 1_000_000),
    [lng],
  );

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    else if (!authLoading && user && !isRoot) router.replace("/dashboard");
  }, [authLoading, user, isRoot, router]);

  const load = useCallback(() => {
    api.budgets().then((res) => {
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user && isRoot) load();
  }, [user, isRoot, load]);

  if (authLoading || !user || !isRoot) return <p className="py-20 text-center text-zinc-400">…</p>;

  async function create() {
    if (!form.name.trim()) return;
    setBusy(true);
    await api.createBudget({
      name: form.name.trim(),
      scope: form.scope,
      ref: form.ref.trim(),
      amount_micro_eur: Math.round(form.amount * 1_000_000),
      period: form.period,
      on_exhaust: form.on_exhaust,
    });
    setBusy(false);
    setForm({ name: "", scope: "organization", ref: "", amount: 0, period: "monthly", on_exhaust: "block" });
    setShowForm(false);
    load();
  }

  const input = "rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold";
  const columns = [t("budgets.name"), t("budgets.scope"), t("budgets.ref"), t("budgets.limit"), t("budgets.used"), t("budgets.period"), t("budgets.on_exhaust"), t("budgets.reset_at"), ""];
  const rows = items.map((b) => [
    <span key="n" className="flex items-center gap-2 font-medium text-zinc-100">
      {b.name}
      {b.status === 2 && (
        <span className="rounded-full border border-red-700 px-2 py-0.5 text-xs font-semibold text-red-300">
          {t("budgets.autostopped", "Auto-Stop")}
        </span>
      )}
    </span>,
    t(`budgets.scope_${b.scope}`, { defaultValue: b.scope }),
    <span key="r" className="text-zinc-400">{b.ref || "—"}</span>,
    euro(b.amount_micro_eur),
    (() => {
      const pct = b.amount_micro_eur > 0 ? Math.min(100, (b.used_micro_eur / b.amount_micro_eur) * 100) : 0;
      const over = b.amount_micro_eur > 0 && b.used_micro_eur >= b.amount_micro_eur;
      const pctClass = over ? "text-red-400" : pct >= 90 ? "text-amber-400" : "text-zinc-500";
      return (
        <div key="u" className="min-w-28">
          <div className="text-zinc-200">{euro(b.used_micro_eur)} <span className={`text-xs ${pctClass}`}>({pct.toFixed(0)}%)</span></div>
          <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className={`h-full ${over ? "bg-red-500" : pct >= 90 ? "bg-amber-500" : pct >= 75 ? "bg-amber-400/70" : "bg-gold"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      );
    })(),
    t(`budgets.period_${b.period}`, { defaultValue: b.period }),
    <Badge key="e" tone={b.on_exhaust === "block" ? "off" : b.on_exhaust === "warn" ? "warn" : "ok"}>{t(`budgets.ex_${b.on_exhaust}`, { defaultValue: b.on_exhaust })}</Badge>,
    b.reset_at ? formatDate(b.reset_at, lng) : "—",
    <div key="a" className="flex gap-3 text-xs">
      <button onClick={async () => { await api.resetBudget(b.id); load(); }} className="text-zinc-400 hover:text-gold">{t("budgets.reset")}</button>
      <button onClick={async () => { await api.deleteBudget(b.id); load(); }} className="text-zinc-500 hover:text-red-400">{t("common.delete")}</button>
    </div>,
  ]);

  const sel = (label: string, value: string, opts: string[], prefix: string, onChange: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-sm text-zinc-300">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
        {opts.map((o) => <option key={o} value={o}>{t(`${prefix}${o}`, { defaultValue: o })}</option>)}
      </select>
    </label>
  );

  const action = (
    <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gold-light">
      + {t("budgets.new")}
    </button>
  );

  return (
    <section className="py-8">
      <PageHeader title={t("nav.budgets")} subtitle={t("budgets.subtitle")} action={action} />
      {showForm && (
        <Card className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("common.name")}
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
          </label>
          {sel(t("budgets.scope"), form.scope, SCOPES, "budgets.scope_", (v) => setForm({ ...form, scope: v }))}
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("budgets.ref")}
            <input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} placeholder={t("budgets.ref_hint")} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("budgets.limit_eur")}
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className={input} />
          </label>
          {sel(t("budgets.period"), form.period, PERIODS, "budgets.period_", (v) => setForm({ ...form, period: v }))}
          {sel(t("budgets.on_exhaust"), form.on_exhaust, ON_EXHAUST, "budgets.ex_", (v) => setForm({ ...form, on_exhaust: v }))}
          <div className="flex gap-2 sm:col-span-3">
            <button onClick={create} disabled={busy} className="rounded-md bg-gold px-4 py-2 font-semibold text-ink hover:bg-gold-light disabled:opacity-60">{t("common.create")}</button>
            <button onClick={() => setShowForm(false)} className="rounded-md border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 hover:border-gold">{t("common.cancel")}</button>
          </div>
        </Card>
      )}
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("budgets.empty")} />
      </div>
    </section>
  );
}
