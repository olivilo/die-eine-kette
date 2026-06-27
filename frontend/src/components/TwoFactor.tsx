"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { Card, Badge } from "@/components/ui";
import { api } from "@/lib/api";

export default function TwoFactor() {
  const { t } = useTranslation();
  const { user, refresh } = useAuth();
  const [uri, setUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enabled = !!user?.totp_enabled;

  async function startSetup() {
    setBusy(true); setError(null);
    const res = await api.totpSetup();
    setBusy(false);
    if (res.success && res.data) { setUri(res.data.uri); setSecret(res.data.secret); }
    else setError(res.message || "error");
  }

  async function confirmEnable() {
    setBusy(true); setError(null);
    const res = await api.totpEnable(code);
    setBusy(false);
    if (res.success && res.data) {
      setBackupCodes(res.data.backup_codes);
      setUri(null); setSecret(null); setCode("");
      await refresh();
    } else setError(t("twofa.invalid"));
  }

  async function disable() {
    setBusy(true); setError(null);
    const res = await api.totpDisable(code);
    setBusy(false);
    if (res.success) { setCode(""); setBackupCodes(null); await refresh(); }
    else setError(t("twofa.invalid"));
  }

  const inputCls = "rounded-md border border-zinc-700 bg-ink px-3 py-2 tracking-[0.3em] text-zinc-100 outline-none focus:border-gold";
  const btn = "rounded-md bg-gold px-4 py-2 font-semibold text-ink transition hover:bg-gold-light disabled:opacity-60";
  const btnGhost = "rounded-md border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 hover:border-gold hover:text-gold";

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold text-gold">{t("twofa.title")}</h2>
        {enabled ? <Badge tone="ok">{t("twofa.on")}</Badge> : <Badge tone="off">{t("twofa.off")}</Badge>}
      </div>
      <p className="mt-2 text-sm text-zinc-400">{t("twofa.desc")}</p>

      {/* Backup-Codes nach Aktivierung */}
      {backupCodes && (
        <div className="mt-4 rounded-md border border-gold/40 p-4">
          <p className="text-sm text-gold-accent">{t("twofa.backup_title")}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-sm text-zinc-200 sm:grid-cols-4">
            {backupCodes.map((c) => <span key={c} className="rounded bg-ink px-2 py-1 text-center">{c}</span>)}
          </div>
        </div>
      )}

      {/* Deaktiviert → Setup starten / QR zeigen */}
      {!enabled && !uri && !backupCodes && (
        <button onClick={startSetup} disabled={busy} className={`mt-4 ${btn}`}>{t("twofa.enable")}</button>
      )}

      {!enabled && uri && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="rounded-lg bg-white p-3"><QRCodeSVG value={uri} size={148} /></div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-zinc-400">{t("twofa.scan")}</p>
            <code className="break-all rounded bg-ink px-2 py-1 text-xs text-zinc-400">{secret}</code>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" inputMode="numeric" className={inputCls} />
            <div className="flex gap-2">
              <button onClick={confirmEnable} disabled={busy} className={btn}>{t("twofa.confirm")}</button>
              <button onClick={() => { setUri(null); setSecret(null); setError(null); }} className={btnGhost}>{t("twofa.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Aktiviert → deaktivieren */}
      {enabled && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("twofa.code")}
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" inputMode="numeric" className={inputCls} />
          </label>
          <button onClick={disable} disabled={busy} className={btnGhost}>{t("twofa.disable")}</button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </Card>
  );
}
