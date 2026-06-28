"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, DataTable } from "@/components/ui";
import { api, formatNumber, formatDate, type LogEntry } from "@/lib/api";

export default function LogsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const lng = i18n.resolvedLanguage;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = (user?.role ?? 0) >= 10;

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    else if (!authLoading && user && !isAdmin) router.replace("/dashboard");
  }, [authLoading, user, isAdmin, router]);

  useEffect(() => {
    if (user && isAdmin) {
      api.logsAll().then((res) => {
        setLogs(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      });
    }
  }, [user, isAdmin]);

  if (authLoading || !user || !isAdmin) return <p className="py-20 text-center text-zinc-400">…</p>;

  const columns = [t("usage.time"), t("logs.user"), t("usage.model"), t("usage.tokens"), t("usage.quota"), t("usage.detail")];
  const rows = logs.map((l) => [
    formatDate(l.created_at, lng),
    <span key="u" className="text-zinc-300">{l.username || "—"}</span>,
    <span key="m" className="font-medium text-zinc-100">{l.model_name || "—"}</span>,
    formatNumber((l.prompt_tokens || 0) + (l.completion_tokens || 0), lng),
    formatNumber(l.quota, lng),
    <span key="c" className="text-zinc-400">{l.content || "—"}</span>,
  ]);

  return (
    <section className="py-8">
      <PageHeader title={t("nav.logs")} subtitle={t("logs.subtitle")} />
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("logs.empty")} />
      </div>
    </section>
  );
}
