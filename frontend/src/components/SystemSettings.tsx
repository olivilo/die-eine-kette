"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { Card } from "@/components/ui";
import { api } from "@/lib/api";

type FieldType = "text" | "number" | "password" | "toggle" | "textarea";
type Field = { key: string; type: FieldType };
type Section = { id: string; fields: Field[] };

// Gruppierte System-Einstellungen (root-only). Werte ↔ /api/option.
const SECTIONS: Section[] = [
  { id: "system", fields: [
    { key: "SystemName", type: "text" }, { key: "Footer", type: "text" },
    { key: "RegisterEnabled", type: "toggle" }, { key: "PasswordLoginEnabled", type: "toggle" },
    { key: "PasswordRegisterEnabled", type: "toggle" }, { key: "EmailVerificationEnabled", type: "toggle" },
  ] },
  { id: "pricing", fields: [
    { key: "QuotaPerUnit", type: "number" }, { key: "QuotaForNewUser", type: "number" },
    { key: "DisplayInCurrencyEnabled", type: "toggle" },
    { key: "ModelRatio", type: "textarea" }, { key: "CompletionRatio", type: "textarea" }, { key: "GroupRatio", type: "textarea" },
  ] },
  { id: "smtp", fields: [
    { key: "SMTPServer", type: "text" }, { key: "SMTPPort", type: "number" }, { key: "SMTPAccount", type: "text" },
    { key: "SMTPFrom", type: "text" }, { key: "SMTPToken", type: "password" },
    { key: "EmailDomainRestrictionEnabled", type: "toggle" }, { key: "EmailDomainWhitelist", type: "text" },
  ] },
  { id: "reliability", fields: [
    { key: "AutomaticDisableChannelEnabled", type: "toggle" }, { key: "AutomaticEnableChannelEnabled", type: "toggle" },
    { key: "ChannelDisableThreshold", type: "number" }, { key: "RetryTimes", type: "number" },
  ] },
  { id: "sso", fields: [
    { key: "OidcEnabled", type: "toggle" },
    { key: "ServerAddress", type: "text" },
    { key: "OidcClientId", type: "text" }, { key: "OidcClientSecret", type: "password" },
    { key: "OidcWellKnown", type: "text" },
    { key: "OidcAuthorizationEndpoint", type: "text" }, { key: "OidcTokenEndpoint", type: "text" },
    { key: "OidcUserinfoEndpoint", type: "text" },
  ] },
];

const inputCls = "rounded-md border border-zinc-700 bg-ink px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold";

export default function SystemSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [opts, setOpts] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const isRoot = (user?.role ?? 0) >= 100;

  useEffect(() => {
    if (!isRoot) return;
    api.options().then((res) => {
      const m: Record<string, string> = {};
      (res.data || []).forEach((o) => (m[o.key] = o.value));
      setOpts(m);
      setLoaded(true);
    });
  }, [isRoot]);

  if (!isRoot) return null;

  async function save(key: string, value: string) {
    setOpts((m) => ({ ...m, [key]: value }));
    await api.updateOption(key, value);
    setSaved(key);
    setTimeout(() => setSaved((s) => (s === key ? null : s)), 1500);
  }

  const label = (k: string) => t(`settings.opt.${k}`, { defaultValue: k });
  const savedTag = (k: string) => saved === k && <span className="text-xs text-emerald-400">{t("settings.saved")}</span>;

  function renderField(f: Field) {
    const v = opts[f.key] ?? "";
    if (f.type === "toggle") {
      return (
        <label key={f.key} className="flex items-center gap-3 text-sm text-zinc-300">
          <input type="checkbox" checked={v === "true"} onChange={(e) => save(f.key, e.target.checked ? "true" : "false")} className="h-4 w-4 accent-gold" />
          {label(f.key)} {savedTag(f.key)}
        </label>
      );
    }
    if (f.type === "textarea") {
      return (
        <label key={f.key} className="flex flex-col gap-1 text-sm text-zinc-300 sm:col-span-2">
          <span className="flex items-center gap-2">{label(f.key)} {savedTag(f.key)}</span>
          <textarea defaultValue={v} onBlur={(e) => e.target.value !== v && save(f.key, e.target.value)}
            rows={3} spellCheck={false} className={`${inputCls} font-mono text-xs`} />
        </label>
      );
    }
    return (
      <label key={f.key} className="flex flex-col gap-1 text-sm text-zinc-300">
        <span className="flex items-center gap-2">{label(f.key)} {savedTag(f.key)}</span>
        <input
          type={f.type === "number" ? "number" : f.type === "password" ? "password" : "text"}
          defaultValue={f.type === "password" ? "" : v}
          placeholder={f.type === "password" ? "••••••••" : undefined}
          autoComplete={f.type === "password" ? "new-password" : undefined}
          onBlur={(e) => { const nv = e.target.value; if (nv !== "" && nv !== v) save(f.key, nv); }}
          className={inputCls}
        />
      </label>
    );
  }

  if (!loaded) return null;

  return (
    <>
      {SECTIONS.map((sec) => (
        <Card key={sec.id} className="mt-6">
          <h2 className="font-serif text-lg font-bold text-gold">{t(`settings.sec.${sec.id}`)}</h2>
          <p className="mt-1 text-sm text-zinc-400">{t(`settings.secdesc.${sec.id}`)}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sec.fields.map(renderField)}
          </div>
        </Card>
      ))}
      <p className="mt-3 text-xs text-zinc-500">{t("settings.root_only")}</p>
    </>
  );
}
