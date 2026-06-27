"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, Stat } from "@/components/ui";
import { formatNumber } from "@/lib/api";

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();
  const lng = i18n.resolvedLanguage;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <p className="py-20 text-center text-zinc-400">…</p>;
  }

  return (
    <section className="py-8">
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.welcome", { name: user.display_name || user.username })} />
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={t("dashboard.quota")} value={formatNumber(user.quota, lng)} />
        <Stat label={t("dashboard.used")} value={formatNumber(user.used_quota, lng)} />
        <Stat label={t("dashboard.requests")} value={formatNumber(user.request_count, lng)} />
        <Stat label={t("dashboard.role")} value={user.role ?? 0} />
      </div>
    </section>
  );
}
