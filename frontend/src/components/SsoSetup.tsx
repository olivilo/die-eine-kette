"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { Card, Badge } from "@/components/ui";
import { api } from "@/lib/api";

// Provider-Presets: Vorlage für die Discovery-URL (Platzhalter ersetzt der Admin).
const PRESETS: { id: string; well: string }[] = [
  { id: "entra", well: "https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration" },
  { id: "okta", well: "https://{domain}.okta.com/.well-known/openid-configuration" },
  { id: "google", well: "https://accounts.google.com/.well-known/openid-configuration" },
  { id: "keycloak", well: "https://{host}/realms/{realm}/.well-known/openid-configuration" },
  { id: "onelogin", well: "https://{subdomain}.onelogin.com/oidc/2/.well-known/openid-configuration" },
  { id: "custom", well: "" },
];

const input = "rounded-md border border-zinc-700 bg-ink px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold";

export default function SsoSetup() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [opts, setOpts] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [preset, setPreset] = useState("entra");
  const [well, setWell] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const isRoot = (user?.role ?? 0) >= 100;

  useEffect(() => {
    if (!isRoot) return;
    api.options().then((res) => {
      const m: Record<string, string> = {};
      (res.data || []).forEach((o) => (m[o.key] = o.value));
      setOpts(m);
      setWell(m.OidcWellKnown || "");
      setLoaded(true);
    });
  }, [isRoot]);

  if (!isRoot || !loaded) return null;

  async function save(key: string, value: string) {
    setOpts((m) => ({ ...m, [key]: value }));
    await api.updateOption(key, value);
  }

  function pickPreset(id: string) {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p && p.well) setWell(p.well);
  }

  async function discover() {
    setDiscovering(true);
    setMsg(null);
    const res = await api.oidcDiscover(well);
    setDiscovering(false);
    if (res.success && res.data) {
      const d = res.data;
      await save("OidcAuthorizationEndpoint", d.authorization_endpoint);
      await save("OidcTokenEndpoint", d.token_endpoint);
      await save("OidcUserinfoEndpoint", d.userinfo_endpoint || "");
      await save("OidcWellKnown", d.well_known);
      setMsg({ ok: true, text: t("sso.load_ok") });
    } else {
      setMsg({ ok: false, text: res.message || t("sso.load_fail") });
    }
  }

  const redirect = typeof window !== "undefined" ? `${window.location.origin}/oauth/oidc` : "/oauth/oidc";
  const ready = !!(opts.OidcClientId && opts.OidcAuthorizationEndpoint && opts.OidcTokenEndpoint);

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold text-gold">{t("settings.sec.sso")}</h2>
        <Badge tone={opts.OidcEnabled === "true" ? "ok" : "off"}>
          {opts.OidcEnabled === "true" ? t("sso.on") : t("sso.off")}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-zinc-400">{t("settings.secdesc.sso")}</p>

      {/* Schritt 1: Provider + Discovery */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          {t("sso.provider")}
          <select value={preset} onChange={(e) => pickPreset(e.target.value)} className={input}>
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{t(`sso.p_${p.id}`)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          {t("sso.discovery_url")}
          <input value={well} onChange={(e) => setWell(e.target.value)} placeholder="https://…/.well-known/openid-configuration" className={input} />
        </label>
        <div className="sm:col-span-2">
          <button onClick={discover} disabled={discovering || !well} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-gold-light disabled:opacity-60">
            {discovering ? "…" : t("sso.load")}
          </button>
          {msg && <span className={`ml-3 text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</span>}
          <p className="mt-1 text-xs text-zinc-500">{t("sso.discovery_hint")}</p>
        </div>
      </div>

      {/* Schritt 2: Client + Endpunkte */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {([
          ["OidcClientId", "text"], ["OidcClientSecret", "password"], ["ServerAddress", "text"],
          ["OidcAuthorizationEndpoint", "text"], ["OidcTokenEndpoint", "text"], ["OidcUserinfoEndpoint", "text"],
        ] as const).map(([k, type]) => (
          <label key={k} className="flex flex-col gap-1 text-sm text-zinc-300">
            {t(`settings.opt.${k}`, { defaultValue: k })}
            <input
              type={type === "password" ? "password" : "text"}
              defaultValue={type === "password" ? "" : opts[k] || ""}
              placeholder={type === "password" ? "••••••••" : undefined}
              onBlur={(e) => { const v = e.target.value; if (v && v !== opts[k]) save(k, v); }}
              className={input}
            />
          </label>
        ))}
      </div>

      {/* Schritt 3: Redirect-URI + Aktivieren */}
      <div className="mt-4 rounded-md border border-zinc-800 p-3">
        <p className="text-xs text-zinc-400">{t("sso.redirect_note")}</p>
        <code className="mt-1 block break-all rounded bg-ink px-2 py-1 text-xs text-gold-accent">{redirect}</code>
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm text-zinc-300">
        <input type="checkbox" checked={opts.OidcEnabled === "true"} disabled={!ready}
          onChange={(e) => save("OidcEnabled", e.target.checked ? "true" : "false")} className="h-4 w-4 accent-gold" />
        {t("sso.enable")} {!ready && <span className="text-xs text-zinc-500">({t("sso.fill_first")})</span>}
      </label>
    </Card>
  );
}
