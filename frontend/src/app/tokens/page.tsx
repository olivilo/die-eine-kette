"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader, DataTable, Badge, Card } from "@/components/ui";
import { api, formatNumber, formatDate, type Token } from "@/lib/api";

export default function TokensPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useRequireAuth();
  const lng = i18n.resolvedLanguage;
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.tokens().then((res) => {
      setTokens(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (authLoading || !user) return <p className="py-20 text-center text-zinc-400">…</p>;

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    await api.createToken(name.trim());
    setBusy(false);
    setName("");
    setShowForm(false);
    load();
  }

  async function remove(id: number) {
    await api.deleteToken(id);
    load();
  }

  const columns = [t("tokens.name"), t("tokens.status"), t("tokens.used"), t("tokens.remaining"), t("tokens.created"), ""];
  const rows = tokens.map((tk) => [
    <span key="n" className="font-medium text-zinc-100">{tk.name || "—"}</span>,
    tk.status === 1 ? <Badge key="s" tone="ok">{t("tokens.enabled")}</Badge> : <Badge key="s" tone="off">{t("tokens.disabled")}</Badge>,
    formatNumber(tk.used_quota, lng),
    tk.unlimited_quota ? "∞" : formatNumber(tk.remain_quota, lng),
    formatDate(tk.created_time, lng),
    <button key="d" onClick={() => remove(tk.id)} className="text-xs text-zinc-500 hover:text-red-400">{t("common.delete")}</button>,
  ]);

  const action = (
    <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gold-light">
      + {t("tokens.new")}
    </button>
  );

  return (
    <section className="py-8">
      <PageHeader title={t("nav.tokens")} subtitle={t("tokens.subtitle")} action={action} />
      {showForm && (
        <Card className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-300">
            {t("common.name")}
            <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold" />
          </label>
          <button onClick={create} disabled={busy} className="rounded-md bg-gold px-4 py-2 font-semibold text-ink hover:bg-gold-light disabled:opacity-60">{t("tokens.create")}</button>
          <button onClick={() => setShowForm(false)} className="rounded-md border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 hover:border-gold">{t("common.cancel")}</button>
        </Card>
      )}
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("tokens.empty")} />
      </div>
    </section>
  );
}
