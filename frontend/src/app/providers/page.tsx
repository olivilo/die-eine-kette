"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader, DataTable, Badge, Card } from "@/components/ui";
import { api, type Channel } from "@/lib/api";
import { providerPresets, channelTypeLabel } from "@/lib/presets";

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
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [presetId, setPresetId] = useState(providerPresets[0].id);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(providerPresets[0].base_url);
  const [models, setModels] = useState(providerPresets[0].models);
  const [costSource, setCostSource] = useState<"external" | "self_hosted">("external");
  const [profile, setProfile] = useState({
    power_draw_kw: 0.45,
    electricity_eur_per_kwh: 0.32,
    hardware_capex_eur: 4000,
    hardware_lifetime_hours: 26280,
    maintenance_eur_per_month: 40,
    throughput_ktokens_per_hour: 1800,
  });

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
    // Lokale/On-Prem-Anbieter laufen auf eigener Hardware → als self-hosted vorbelegen.
    setCostSource(p.group.startsWith("Lokal") ? "self_hosted" : "external");
    if (!name) setName(p.label);
  }

  async function create() {
    const p = providerPresets.find((x) => x.id === presetId)!;
    if (!name.trim()) return;
    setBusy(true);
    // Self-Hosted-Nodes brauchen oft keinen echten Key; der Motor verlangt aber einen
    // nicht-leeren Wert (Multi-Key-Anlage). Platzhalter setzen, falls leer.
    const key = apiKey || (costSource === "self_hosted" ? "local-node" : apiKey);
    await api.createChannel({
      name: name.trim(), type: p.type, key, base_url: baseUrl, models,
      cost_source: costSource,
      ...(costSource === "self_hosted" ? profile : {}),
    });
    setBusy(false);
    setName(""); setApiKey(""); setShowForm(false);
    load();
  }

  async function remove(id: number) {
    await api.deleteChannel(id);
    load();
  }

  async function test(c: Channel) {
    setTestMsg({ ok: true, text: `${c.name}: …` });
    const res = await api.testChannel(c.id);
    if (res.success) {
      const secs = res.data?.time ? ` (${res.data.time.toFixed(2)}s)` : "";
      setTestMsg({ ok: true, text: `${c.name}: ${t("providers.test_ok")}${secs}` });
    } else {
      setTestMsg({ ok: false, text: `${c.name}: ${res.message || t("providers.test_fail")}` });
    }
  }

  const selectedPreset = providerPresets.find((x) => x.id === presetId);
  const input = "rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold";
  const columns = [t("providers.name"), t("providers.type"), t("providers.cost_source"), t("providers.status"), t("providers.models"), ""];
  const rows = channels.map((c) => [
    <span key="n" className="font-medium text-zinc-100">{c.name || "—"}</span>,
    <span key="t" className="text-zinc-300">{channelTypeLabel(c.type)}</span>,
    <Badge key="cs" tone={c.cost_source === "self_hosted" ? "neutral" : "off"}>
      {t(`providers.cs_${c.cost_source || "external"}`, { defaultValue: c.cost_source || "external" })}
    </Badge>,
    statusBadge(c.status, t),
    <span key="m" className="text-zinc-400">{(c.models || "").split(",").slice(0, 3).join(", ") || "—"}</span>,
    <div key="a" className="flex gap-3 text-xs">
      <button onClick={() => test(c)} className="text-zinc-400 hover:text-gold">{t("providers.test")}</button>
      <button onClick={() => remove(c.id)} className="text-zinc-500 hover:text-red-400">{t("common.delete")}</button>
    </div>,
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
              {[...new Set(providerPresets.map((p) => p.group))].map((group) => (
                <optgroup key={group} label={group}>
                  {providerPresets.filter((p) => p.group === group).map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </optgroup>
              ))}
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
          {selectedPreset?.note && (
            <p className="text-xs text-zinc-500 sm:col-span-2">ℹ️ {selectedPreset.note}</p>
          )}
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("providers.cost_source")}
            <select value={costSource} onChange={(e) => setCostSource(e.target.value as "external" | "self_hosted")} className={input}>
              <option value="external">{t("providers.cs_external")}</option>
              <option value="self_hosted">{t("providers.cs_self_hosted")}</option>
            </select>
          </label>
          {costSource === "self_hosted" && (
            <div className="grid gap-3 sm:col-span-3 sm:grid-cols-3">
              {([
                ["power_draw_kw", "kw"],
                ["electricity_eur_per_kwh", "eurkwh"],
                ["hardware_capex_eur", "capex"],
                ["hardware_lifetime_hours", "life"],
                ["maintenance_eur_per_month", "maint"],
                ["throughput_ktokens_per_hour", "tput"],
              ] as const).map(([key, k]) => (
                <label key={key} className="flex flex-col gap-1 text-sm text-zinc-300">
                  {t(`providers.sh_${k}`)}
                  <input type="number" step="any" value={profile[key]}
                    onChange={(e) => setProfile({ ...profile, [key]: Number(e.target.value) })} className={input} />
                </label>
              ))}
              <p className="text-xs text-zinc-500 sm:col-span-3">{t("providers.sh_hint")}</p>
            </div>
          )}
          <div className="flex gap-2 sm:col-span-3">
            <button onClick={create} disabled={busy} className="rounded-md bg-gold px-4 py-2 font-semibold text-ink hover:bg-gold-light disabled:opacity-60">{t("providers.create")}</button>
            <button onClick={() => setShowForm(false)} className="rounded-md border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 hover:border-gold">{t("common.cancel")}</button>
          </div>
        </Card>
      )}
      {testMsg && (
        <p className={`mt-4 text-sm ${testMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{testMsg.text}</p>
      )}
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("providers.empty")} />
      </div>
    </section>
  );
}
