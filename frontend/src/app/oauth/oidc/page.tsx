"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

function Callback() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setError(t("login.sso_error"));
      return;
    }
    api.oidcCallback(code, state).then(async (res) => {
      if (res.success) {
        await refresh();
        router.replace("/dashboard");
      } else {
        setError(res.message || t("login.sso_error"));
      }
    });
  }, [params, refresh, router, t]);

  return (
    <section className="py-24 text-center">
      {error ? (
        <p className="text-red-400">
          {error} —{" "}
          <a href="/login" className="text-gold underline">{t("login.title")}</a>
        </p>
      ) : (
        <p className="text-zinc-400">{t("login.sso_progress")}</p>
      )}
    </section>
  );
}

export default function OidcCallbackPage() {
  return (
    <Suspense fallback={null}>
      <Callback />
    </Suspense>
  );
}
