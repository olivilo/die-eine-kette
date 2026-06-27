"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-coal p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <p className="py-20 text-center text-zinc-400">…</p>;
  }

  return (
    <section className="py-12">
      <h1 className="font-serif text-3xl font-bold text-gold">{t("dashboard.title")}</h1>
      <p className="mt-2 text-zinc-300">
        {t("dashboard.welcome", { name: user.display_name || user.username })}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={t("dashboard.quota")} value={user.quota ?? 0} />
        <Stat label={t("dashboard.used")} value={user.used_quota ?? 0} />
        <Stat label={t("dashboard.requests")} value={user.request_count ?? 0} />
        <Stat label={t("dashboard.role")} value={user.role ?? 0} />
      </div>
    </section>
  );
}
