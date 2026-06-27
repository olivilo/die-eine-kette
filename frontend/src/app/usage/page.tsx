"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader, DataTable } from "@/components/ui";
import { api, formatNumber, formatDate, type LogEntry } from "@/lib/api";

export default function UsagePage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useRequireAuth();
  const lng = i18n.resolvedLanguage;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.logsSelf().then((res) => {
      setLogs(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });
  }, [user]);

  if (authLoading || !user) return <p className="py-20 text-center text-zinc-400">…</p>;

  const columns = [t("usage.time"), t("usage.model"), t("usage.tokens"), t("usage.quota"), t("usage.detail")];
  const rows = logs.map((l) => [
    formatDate(l.created_at, lng),
    <span key="m" className="font-medium text-zinc-100">{l.model_name || "—"}</span>,
    formatNumber((l.prompt_tokens || 0) + (l.completion_tokens || 0), lng),
    formatNumber(l.quota, lng),
    <span key="c" className="text-zinc-400">{l.content || "—"}</span>,
  ]);

  return (
    <section className="py-8">
      <PageHeader title={t("nav.usage")} subtitle={t("usage.subtitle")} />
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("usage.empty")} />
      </div>
    </section>
  );
}
