"use client";

import { useTranslation } from "react-i18next";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader } from "@/components/ui";
import TwoFactor from "@/components/TwoFactor";
import SystemSettings from "@/components/SystemSettings";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, loading } = useRequireAuth();

  if (loading || !user) return <p className="py-20 text-center text-zinc-400">…</p>;

  return (
    <section className="py-8">
      <PageHeader title={t("nav.settings")} subtitle={t("settings.subtitle")} />
      <TwoFactor />
      <SystemSettings />
    </section>
  );
}
