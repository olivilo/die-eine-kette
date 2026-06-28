"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, DataTable, Badge, Card } from "@/components/ui";
import { api, formatNumber, formatDate, type Redemption } from "@/lib/api";

export default function RedemptionPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const lng = i18n.resolvedLanguage;
  const [items, setItems] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [quota, setQuota] = useState(500000);
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const isAdmin = (user?.role ?? 0) >= 10;

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    else if (!authLoading && user && !isAdmin) router.replace("/dashboard");
  }, [authLoading, user, isAdmin, router]);

  const load = useCallback(() => {
    api.redemptions().then((res) => {
      setItems(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user && isAdmin) load();
  }, [user, isAdmin, load]);

  if (authLoading || !user || !isAdmin) return <p className="py-20 text-center text-zinc-400">…</p>;

  async function create() {
    if (!name.trim() || count < 1) return;
    setBusy(true);
    await api.createRedemptions(name.trim(), quota, count);
    setBusy(false);
    setShowForm(false);
    load();
  }

  async function remove(id: number) {
    await api.deleteRedemption(id);
    load();
  }

  const input = "rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold";
  const columns = [t("redemption.name"), t("redemption.key"), t("redemption.quota"), t("redemption.status"), t("redemption.created"), ""];
  const rows = items.map((r) => [
    <span key="n" className="font-medium text-zinc-100">{r.name || "—"}</span>,
    <code key="k" className="rounded bg-ink px-2 py-1 text-xs text-zinc-400">{r.key}</code>,
    formatNumber(r.quota, lng),
    r.status === 1 ? <Badge key="s" tone="ok">{t("redemption.unused")}</Badge> : <Badge key="s" tone="off">{t("redemption.used")}</Badge>,
    formatDate(r.created_time, lng),
    <button key="d" onClick={() => remove(r.id)} className="text-xs text-zinc-500 hover:text-red-400">{t("common.delete")}</button>,
  ]);

  const action = (
    <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gold-light">
      + {t("redemption.new")}
    </button>
  );

  return (
    <section className="py-8">
      <PageHeader title={t("nav.redemption")} subtitle={t("redemption.subtitle")} action={action} />
      {showForm && (
        <Card className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("common.name")}
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("redemption.quota")}
            <input type="number" value={quota} onChange={(e) => setQuota(Number(e.target.value))} className={`${input} w-36`} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("redemption.count")}
            <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} className={`${input} w-24`} />
          </label>
          <button onClick={create} disabled={busy} className="rounded-md bg-gold px-4 py-2 font-semibold text-ink hover:bg-gold-light disabled:opacity-60">{t("common.create")}</button>
          <button onClick={() => setShowForm(false)} className="rounded-md border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 hover:border-gold">{t("common.cancel")}</button>
        </Card>
      )}
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("redemption.empty")} />
      </div>
    </section>
  );
}
