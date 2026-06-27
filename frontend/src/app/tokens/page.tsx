"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { PageHeader, DataTable, Badge } from "@/components/ui";
import { api, formatNumber, formatDate, type Token } from "@/lib/api";

export default function TokensPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useRequireAuth();
  const lng = i18n.resolvedLanguage;
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api.tokens().then((res) => {
      setTokens(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });
  }, [user]);

  if (authLoading || !user) return <p className="py-20 text-center text-zinc-400">…</p>;

  const columns = [t("tokens.name"), t("tokens.status"), t("tokens.used"), t("tokens.remaining"), t("tokens.created")];
  const rows = tokens.map((tk) => [
    <span key="n" className="font-medium text-zinc-100">{tk.name || "—"}</span>,
    tk.status === 1 ? <Badge key="s" tone="ok">{t("tokens.enabled")}</Badge> : <Badge key="s" tone="off">{t("tokens.disabled")}</Badge>,
    formatNumber(tk.used_quota, lng),
    tk.unlimited_quota ? "∞" : formatNumber(tk.remain_quota, lng),
    formatDate(tk.created_time, lng),
  ]);

  return (
    <section className="py-8">
      <PageHeader title={t("nav.tokens")} subtitle={t("tokens.subtitle")} />
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("tokens.empty")} />
      </div>
    </section>
  );
}
