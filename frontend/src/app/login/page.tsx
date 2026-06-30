"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { apiError } from "@/lib/apiError";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oidc, setOidc] = useState<{ clientId: string; authEndpoint: string } | null>(null);

  useEffect(() => {
    api.statusInfo().then((res) => {
      const d = res.data;
      if (d?.oidc && d.oidc_client_id && d.oidc_authorization_endpoint) {
        setOidc({ clientId: d.oidc_client_id, authEndpoint: d.oidc_authorization_endpoint });
      }
    });
  }, []);

  async function startSso() {
    if (!oidc) return;
    setBusy(true);
    const res = await api.oauthState();
    if (!res.success || !res.data) { setBusy(false); setError(t("login.sso_error")); return; }
    const redirect = `${window.location.origin}/oauth/oidc`;
    const url =
      `${oidc.authEndpoint}?client_id=${encodeURIComponent(oidc.clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirect)}&response_type=code` +
      `&scope=${encodeURIComponent("openid profile email")}&state=${encodeURIComponent(res.data)}`;
    window.location.href = url;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await login(username, password, totp);
    setBusy(false);
    if (res.ok) {
      router.push("/dashboard");
    } else if (res.totpRequired) {
      setTotpRequired(true);
      setError(null);
    } else {
      setError(apiError(res.message, t));
    }
  }

  return (
    <section className="mx-auto flex max-w-sm flex-col items-center gap-6 py-20">
      <Image src="/brand/mark.svg" alt="" width={56} height={56} priority />
      <h1 className="font-serif text-2xl font-bold text-gold">{t("login.title")}</h1>

      <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          {t("login.username")}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="rounded-md border border-zinc-700 bg-coal px-3 py-2 text-zinc-100 outline-none focus:border-gold"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-300">
          {t("login.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="rounded-md border border-zinc-700 bg-coal px-3 py-2 text-zinc-100 outline-none focus:border-gold"
          />
        </label>

        {totpRequired && (
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("login.totp")}
            <input
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              autoFocus
              className="rounded-md border border-zinc-700 bg-coal px-3 py-2 tracking-[0.3em] text-zinc-100 outline-none focus:border-gold"
            />
            <span className="text-xs text-zinc-500">{t("login.totp_hint")}</span>
          </label>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-gold px-4 py-2 font-semibold text-ink transition hover:bg-gold-light disabled:opacity-60"
        >
          {busy ? "…" : t("login.submit")}
        </button>

        {oidc && (
          <>
            <div className="flex items-center gap-3 text-xs text-zinc-600">
              <span className="h-px flex-1 bg-zinc-800" />{t("login.or")}<span className="h-px flex-1 bg-zinc-800" />
            </div>
            <button
              type="button"
              onClick={startSso}
              disabled={busy}
              className="rounded-md border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 transition hover:border-gold hover:text-gold disabled:opacity-60"
            >
              {t("login.sso")}
            </button>
          </>
        )}
      </form>
    </section>
  );
}
