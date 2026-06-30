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
  const [limit, setLimit] = useState("500000");
  const [unlimited, setUnlimited] = useState(false);
  const [expiry, setExpiry] = useState(""); // leer = nie
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null); // einmalige Key-Anzeige
  const [copied, setCopied] = useState(false);

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
    const res = await api.createToken({
      name: name.trim(),
      unlimited_quota: unlimited,
      remain_quota: unlimited ? 0 : Math.max(0, Number(limit) || 0),
      // Ablauf: leer = nie (-1), sonst Unix-Sekunden zum Tagesende.
      expired_time: expiry ? Math.floor(new Date(`${expiry}T23:59:59`).getTime() / 1000) : -1,
    });
    setBusy(false);
    if (res.data?.key) {
      setNewKey(res.data.key); // einmalig anzeigen — danach nur noch maskiert
      setCopied(false);
    }
    setName("");
    setLimit("500000");
    setUnlimited(false);
    setExpiry("");
    setShowForm(false);
    load();
  }

  async function remove(id: number) {
    setConfirmId(null);
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
    confirmId === tk.id ? (
      <span key="d" className="flex items-center gap-2 text-xs">
        <span className="text-zinc-400">{t("common.confirmQuestion", "Sicher?")}</span>
        <button onClick={() => remove(tk.id)} className="font-semibold text-red-400 hover:text-red-300">{t("common.yes", "Ja")}</button>
        <button onClick={() => setConfirmId(null)} className="text-zinc-500 hover:text-zinc-300">{t("common.no", "Nein")}</button>
      </span>
    ) : (
      <button key="d" onClick={() => setConfirmId(tk.id)} className="text-xs text-zinc-500 hover:text-red-400">{t("common.delete")}</button>
    ),
  ]);

  const action = (
    <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gold-light">
      + {t("tokens.new")}
    </button>
  );

  return (
    <section className="py-8">
      <PageHeader title={t("nav.tokens")} subtitle={t("tokens.subtitle")} action={action} />
      {newKey && (
        <Card className="mt-4 border-gold/50 bg-gold/5">
          <div className="text-sm font-semibold text-gold">{t("tokens.key_once_title", "Token-Key — jetzt kopieren")}</div>
          <p className="mt-1 text-xs text-zinc-400">{t("tokens.key_once_hint", "Dieser Key wird nur EINMAL angezeigt. Danach ist er nur noch maskiert sichtbar.")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="select-all break-all rounded-md border border-zinc-700 bg-ink px-3 py-2 font-mono text-sm text-zinc-100">{newKey}</code>
            <button
              onClick={() => { navigator.clipboard?.writeText(newKey); setCopied(true); }}
              className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-ink hover:bg-gold-light"
            >
              {copied ? t("common.copied", "Kopiert ✓") : t("common.copy", "Kopieren")}
            </button>
            <button onClick={() => setNewKey(null)} className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-gold">
              {t("common.done", "Fertig")}
            </button>
          </div>
        </Card>
      )}
      {showForm && (
        <Card className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-300">
            {t("common.name")}
            <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold" />
          </label>
          <label className="flex w-36 flex-col gap-1 text-sm text-zinc-300">
            {t("tokens.limit", "Limit (Quota)")}
            <input
              type="number"
              min={0}
              value={unlimited ? "" : limit}
              disabled={unlimited}
              onChange={(e) => setLimit(e.target.value)}
              className="rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold disabled:opacity-50"
            />
          </label>
          <label className="flex w-44 flex-col gap-1 text-sm text-zinc-300">
            {t("tokens.expiry", "Ablauf (leer = nie)")}
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold"
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-zinc-300">
            <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} className="accent-gold" />
            {t("tokens.unlimited", "Unbegrenzt")}
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
