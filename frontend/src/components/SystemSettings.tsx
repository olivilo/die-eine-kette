"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { Card } from "@/components/ui";
import { api } from "@/lib/api";

const TEXT_KEYS = ["SystemName", "Footer"] as const;
const TOGGLE_KEYS = [
  "RegisterEnabled",
  "PasswordLoginEnabled",
  "PasswordRegisterEnabled",
  "EmailVerificationEnabled",
] as const;

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

  const labelFor = (k: string) => t(`settings.opt.${k}`, { defaultValue: k });

  return (
    <Card className="mt-6">
      <h2 className="font-serif text-lg font-bold text-gold">{t("settings.system")}</h2>
      <p className="mt-2 text-sm text-zinc-400">{t("settings.system_desc")}</p>

      {!loaded ? (
        <p className="mt-4 text-zinc-500">…</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {TEXT_KEYS.map((k) => (
            <label key={k} className="flex flex-col gap-1 text-sm text-zinc-300">
              <span className="flex items-center gap-2">
                {labelFor(k)} {saved === k && <span className="text-xs text-emerald-400">{t("settings.saved")}</span>}
              </span>
              <input
                defaultValue={opts[k] || ""}
                onBlur={(e) => e.target.value !== (opts[k] || "") && save(k, e.target.value)}
                className="max-w-md rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold"
              />
            </label>
          ))}

          {TOGGLE_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={opts[k] === "true"}
                onChange={(e) => save(k, e.target.checked ? "true" : "false")}
                className="h-4 w-4 accent-gold"
              />
              {labelFor(k)} {saved === k && <span className="text-xs text-emerald-400">{t("settings.saved")}</span>}
            </label>
          ))}
        </div>
      )}
    </Card>
  );
}
