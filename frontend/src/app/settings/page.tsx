"use client";

import { useTranslation } from "react-i18next";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader, Card, Badge } from "@/components/ui";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, loading } = useRequireAuth();

  if (loading || !user) return <p className="py-20 text-center text-zinc-400">…</p>;

  return (
    <section className="py-8">
      <PageHeader title={t("nav.settings")} subtitle={t("settings.subtitle")} />
      <Card className="mt-6">
        <Badge>{t("common.phase")}</Badge>
        <p className="mt-3 text-sm text-zinc-400">{t("settings.soon")}</p>
      </Card>
    </section>
  );
}
