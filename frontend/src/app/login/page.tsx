"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await login(username, password);
    setBusy(false);
    if (res.ok) router.push("/dashboard");
    else setError(res.message || t("login.error"));
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

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-gold px-4 py-2 font-semibold text-ink transition hover:bg-gold-light disabled:opacity-60"
        >
          {busy ? "…" : t("login.submit")}
        </button>
      </form>
    </section>
  );
}
