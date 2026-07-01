"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui";
import { api } from "@/lib/api";

// Passwort-Änderung für das eigene Konto (PUT /user/self). Das Backend erzwingt 8–20
// Zeichen; wir spiegeln das clientseitig plus eine Bestätigungseingabe. Die laufende
// Session bleibt nach der Änderung gültig.
const MIN = 8;
const MAX = 20;

export default function ChangePassword() {
  const { t } = useTranslation();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = pw.length > 0 && pw.length < MIN;
  const tooLong = pw.length > MAX;
  const mismatch = confirm.length > 0 && pw !== confirm;
  const valid = pw.length >= MIN && pw.length <= MAX && pw === confirm;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    setDone(false);
    const res = await api.updateSelf({ password: pw });
    setBusy(false);
    if (res.success) {
      setDone(true);
      setPw("");
      setConfirm("");
      // Sicherheits-Banner (Default-Passwort) sofort neu prüfen lassen.
      window.dispatchEvent(new Event("dek:security-refresh"));
    } else {
      setError(res.message || t("passwd.failed", "Änderung fehlgeschlagen."));
    }
  }

  const inputCls = "rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold";
  const btn = "rounded-md bg-gold px-4 py-2 font-semibold text-ink transition hover:bg-gold-light disabled:opacity-60";

  return (
    <Card className="mt-6">
      <h2 className="font-serif text-lg font-bold text-gold">{t("passwd.title", "Passwort ändern")}</h2>
      <p className="mt-2 text-sm text-zinc-400">
        {t("passwd.desc", "Lege ein neues Passwort für dein Konto fest (8–20 Zeichen).")}
      </p>

      <div className="mt-4 flex max-w-md flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          {t("passwd.new", "Neues Passwort")}
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setDone(false); }}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          {t("passwd.confirm", "Passwort bestätigen")}
          <input
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setDone(false); }}
            autoComplete="new-password"
            className={inputCls}
          />
        </label>

        {tooShort && <p className="text-sm text-amber-400">{t("passwd.too_short", "Mindestens 8 Zeichen.")}</p>}
        {tooLong && <p className="text-sm text-amber-400">{t("passwd.too_long", "Höchstens 20 Zeichen.")}</p>}
        {mismatch && <p className="text-sm text-amber-400">{t("passwd.mismatch", "Die Passwörter stimmen nicht überein.")}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {done && <p className="text-sm text-emerald-400">{t("passwd.done", "Passwort geändert.")}</p>}

        <div>
          <button onClick={submit} disabled={busy || !valid} className={btn}>
            {t("passwd.save", "Passwort ändern")}
          </button>
        </div>
      </div>
    </Card>
  );
}
