"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader, DataTable, Badge } from "@/components/ui";
import { api, type Channel } from "@/lib/api";

function statusBadge(status: number, t: (k: string) => string) {
  if (status === 1) return <Badge tone="ok">{t("providers.enabled")}</Badge>;
  if (status === 3) return <Badge tone="warn">{t("providers.auto_disabled")}</Badge>;
  return <Badge tone="off">{t("providers.disabled")}</Badge>;
}

export default function ProvidersPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useRequireAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.channels().then((res) => {
      setChannels(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });
  }, [user]);

  if (authLoading || !user) return <p className="py-20 text-center text-zinc-400">…</p>;

  const columns = [t("providers.name"), t("providers.type"), t("providers.status"), t("providers.models")];
  const rows = channels.map((c) => [
    <span key="n" className="font-medium text-zinc-100">{c.name || "—"}</span>,
    c.type,
    statusBadge(c.status, t),
    <span key="m" className="text-zinc-400">{(c.models || "").split(",").slice(0, 3).join(", ") || "—"}</span>,
  ]);

  return (
    <section className="py-8">
      <PageHeader title={t("nav.providers")} subtitle={t("providers.subtitle")} />
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("providers.empty")} />
      </div>
    </section>
  );
}
