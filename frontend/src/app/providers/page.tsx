"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader, DataTable, Badge, Card } from "@/components/ui";
import { api, type Channel } from "@/lib/api";
import { providerPresets } from "@/lib/presets";

function statusBadge(status: number, t: (k: string) => string) {
  if (status === 1) return <Badge tone="ok">{t("providers.enabled")}</Badge>;
  if (status === 3) return <Badge tone="warn">{t("providers.auto_disabled")}</Badge>;
  return <Badge tone="off">{t("providers.disabled")}</Badge>;
}

export default function ProvidersPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useRequireAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [presetId, setPresetId] = useState(providerPresets[0].id);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(providerPresets[0].base_url);
  const [models, setModels] = useState(providerPresets[0].models);

  const load = useCallback(() => {
    api.channels().then((res) => {
      setChannels(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (authLoading || !user) return <p className="py-20 text-center text-zinc-400">…</p>;

  function pickPreset(id: string) {
    const p = providerPresets.find((x) => x.id === id) || providerPresets[0];
    setPresetId(id);
    setBaseUrl(p.base_url);
    setModels(p.models);
    if (!name) setName(p.label);
  }

  async function create() {
    const p = providerPresets.find((x) => x.id === presetId)!;
    if (!name.trim()) return;
    setBusy(true);
    await api.createChannel({ name: name.trim(), type: p.type, key: apiKey, base_url: baseUrl, models });
    setBusy(false);
    setName(""); setApiKey(""); setShowForm(false);
    load();
  }

  async function remove(id: number) {
    await api.deleteChannel(id);
    load();
  }

  const input = "rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold";
  const columns = [t("providers.name"), t("providers.type"), t("providers.status"), t("providers.models"), ""];
  const rows = channels.map((c) => [
    <span key="n" className="font-medium text-zinc-100">{c.name || "—"}</span>,
    c.type,
    statusBadge(c.status, t),
    <span key="m" className="text-zinc-400">{(c.models || "").split(",").slice(0, 3).join(", ") || "—"}</span>,
    <button key="d" onClick={() => remove(c.id)} className="text-xs text-zinc-500 hover:text-red-400">{t("common.delete")}</button>,
  ]);

  const action = (
    <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gold-light">
      + {t("providers.new")}
    </button>
  );

  return (
    <section className="py-8">
      <PageHeader title={t("nav.providers")} subtitle={t("providers.subtitle")} action={action} />
      {showForm && (
        <Card className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("providers.preset")}
            <select value={presetId} onChange={(e) => pickPreset(e.target.value)} className={input}>
              {providerPresets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("common.name")}
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("providers.key")}
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" autoComplete="off" className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("providers.base_url")}
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300 sm:col-span-2">
            {t("providers.models")}
            <input value={models} onChange={(e) => setModels(e.target.value)} className={input} />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button onClick={create} disabled={busy} className="rounded-md bg-gold px-4 py-2 font-semibold text-ink hover:bg-gold-light disabled:opacity-60">{t("providers.create")}</button>
            <button onClick={() => setShowForm(false)} className="rounded-md border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 hover:border-gold">{t("common.cancel")}</button>
          </div>
        </Card>
      )}
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("providers.empty")} />
      </div>
    </section>
  );
}
