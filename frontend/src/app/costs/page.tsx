"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, Stat, DataTable, Badge, Card } from "@/components/ui";
import { api, formatNumber, formatDate, type CostSummary } from "@/lib/api";

export default function CostsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const lng = i18n.resolvedLanguage;
  const [data, setData] = useState<CostSummary | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const isAdmin = (user?.role ?? 0) >= 10;

  const euro = useCallback(
    (micro: number) => new Intl.NumberFormat(lng, { style: "currency", currency: "EUR", maximumFractionDigits: 4 }).format((micro || 0) / 1_000_000),
    [lng],
  );

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    else if (!authLoading && user && !isAdmin) router.replace("/dashboard");
  }, [authLoading, user, isAdmin, router]);

  useEffect(() => {
    if (user && isAdmin) {
      setLoading(true);
      api.costSummary(days).then((res) => {
        setData(res.data ?? null);
        setLoading(false);
      });
    }
  }, [user, isAdmin, days]);

  if (authLoading || !user || !isAdmin) return <p className="py-20 text-center text-zinc-400">…</p>;

  const recent = data?.recent ?? [];
  const columns = [t("usage.time"), t("providers.cost_source"), t("usage.model"), t("usage.tokens"), t("costs.cost")];
  const rows = recent.map((e) => [
    formatDate(e.created_at, lng),
    <Badge key="s" tone={e.cost_source === "self_hosted" ? "neutral" : "off"}>{t(`providers.cs_${e.cost_source}`, { defaultValue: e.cost_source })}</Badge>,
    <span key="m" className="font-medium text-zinc-100">{e.model || "—"}</span>,
    formatNumber((e.prompt_tokens || 0) + (e.completion_tokens || 0), lng),
    euro(e.cost_micro_eur),
  ]);

  const num = (n: number) => new Intl.NumberFormat(lng).format(n || 0);
  const tk = data?.tokens;
  const ranges: { d: number; label: string }[] = [
    { d: 1, label: t("costs.range_day", "Tag") },
    { d: 7, label: t("costs.range_7d", "7 Tage") },
    { d: 30, label: t("costs.range_30d", "30 Tage") },
    { d: 90, label: t("costs.range_90d", "90 Tage") },
    { d: 365, label: t("costs.range_year", "1 Jahr") },
  ];

  const action = (
    <div className="flex items-center gap-2">
      <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-md border border-zinc-700 bg-coal px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-gold">
        {ranges.map((r) => <option key={r.d} value={r.d}>{r.label}</option>)}
      </select>
      <a href="/api/cost/export" className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:border-gold hover:text-gold">
        {t("costs.export")}
      </a>
    </div>
  );

  return (
    <section className="py-8">
      <PageHeader title={t("nav.costs")} subtitle={t("costs.subtitle")} action={action} />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label={t("costs.external")} value={loading ? "…" : euro(data?.external_micro_eur ?? 0)} />
        <Stat label={t("costs.self_hosted")} value={loading ? "…" : euro(data?.self_hosted_micro_eur ?? 0)} />
        <Stat label={t("costs.total")} value={loading ? "…" : euro(data?.total_micro_eur ?? 0)} />
      </div>

      {/* Token-Durchsatz: in (Prompt) / out (Completion), je Quelle lokal vs. Anbieter */}
      <h2 className="mt-8 font-serif text-lg font-bold text-gold">{t("costs.tokens_title", "Token-Durchsatz")}</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs uppercase tracking-wide text-zinc-400">{t("costs.tokens_in", "Token in (Prompt)")}</div>
          <div className="mt-1 text-2xl font-semibold text-gold">{loading ? "…" : num(tk?.prompt_total ?? 0)}</div>
          <div className="mt-1 text-xs text-zinc-500">
            {t("providers.cs_external", "Extern")}: {num(tk?.external.prompt ?? 0)} · {t("providers.cs_self_hosted", "Self-Hosted")}: {num(tk?.self_hosted.prompt ?? 0)}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-zinc-400">{t("costs.tokens_out", "Token out (Completion)")}</div>
          <div className="mt-1 text-2xl font-semibold text-gold">{loading ? "…" : num(tk?.completion_total ?? 0)}</div>
          <div className="mt-1 text-xs text-zinc-500">
            {t("providers.cs_external", "Extern")}: {num(tk?.external.completion ?? 0)} · {t("providers.cs_self_hosted", "Self-Hosted")}: {num(tk?.self_hosted.completion ?? 0)}
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wide text-zinc-400">{t("costs.tokens_cached", "Cached Tokens")}</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-500">—</div>
          <div className="mt-1 text-xs text-zinc-600">{t("costs.cached_note", "Noch nicht erfasst (anbieterabhängig).")}</div>
        </Card>
      </div>

      <div className="mt-8">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("costs.empty")} />
      </div>
    </section>
  );
}
