"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Server, KeyRound, Activity, Euro, Wallet, Building2, Users, ScrollText, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, Stat, Card } from "@/components/ui";
import { formatNumber } from "@/lib/api";

type Quick = { href: string; Icon: typeof Server; titleKey: string; titleDef: string; descKey: string; descDef: string; min?: number };

const QUICK: Quick[] = [
  { href: "/providers", Icon: Server, titleKey: "nav.providers", titleDef: "Anbieter", descKey: "dash.q_providers", descDef: "KI-Anbieter (Cloud & lokal) anbinden und testen." },
  { href: "/tokens", Icon: KeyRound, titleKey: "nav.tokens", titleDef: "Tokens", descKey: "dash.q_tokens", descDef: "API-Tokens mit Limit und Ablauf erstellen." },
  { href: "/usage", Icon: Activity, titleKey: "nav.usage", titleDef: "Nutzung", descKey: "dash.q_usage", descDef: "Verbrauch und Anfragen im Blick behalten." },
  { href: "/costs", Icon: Euro, titleKey: "nav.costs", titleDef: "Kosten", descKey: "dash.q_costs", descDef: "Kosten extern vs. self-hosted, mit CSV-Export.", min: 10 },
  { href: "/budgets", Icon: Wallet, titleKey: "nav.budgets", titleDef: "Budgets", descKey: "dash.q_budgets", descDef: "Ausgaben deckeln, Auto-Stop und Reset.", min: 10 },
  { href: "/users", Icon: Users, titleKey: "nav.users", titleDef: "Nutzer", descKey: "dash.q_users", descDef: "Nutzer, Rollen und Mandanten verwalten.", min: 10 },
  { href: "/organizations", Icon: Building2, titleKey: "nav.organizations", titleDef: "Organisationen", descKey: "dash.q_orgs", descDef: "B2B-Mandanten anlegen und zuordnen.", min: 100 },
  { href: "/logs", Icon: ScrollText, titleKey: "nav.logs", titleDef: "Logs", descKey: "dash.q_logs", descDef: "Alle Anfragen und Ereignisse nachvollziehen.", min: 10 },
];

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

  const role = user.role ?? 0;
  const quick = QUICK.filter((q) => role >= (q.min ?? 0));
  const isAdmin = role >= 10;

  return (
    <section className="py-8">
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.welcome", { name: user.display_name || user.username })} />

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={t("dashboard.quota")} value={formatNumber(user.quota, lng)} />
        <Stat label={t("dashboard.used")} value={formatNumber(user.used_quota, lng)} />
        <Stat label={t("dashboard.requests")} value={formatNumber(user.request_count, lng)} />
        <Stat label={t("dashboard.role")} value={user.role ?? 0} />
      </div>

      {/* Erste Schritte — nur für Admins/Root, als Onboarding-Leitfaden */}
      {isAdmin && (
        <Card className="mt-8">
          <h2 className="font-serif text-lg font-bold text-gold">{t("dash.start_title", "Erste Schritte")}</h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {[
              { n: 1, href: "/providers", txt: t("dash.step1", "Anbieter anbinden") },
              { n: 2, href: "/tokens", txt: t("dash.step2", "API-Token erstellen") },
              { n: 3, href: "/budgets", txt: t("dash.step3", "Budget festlegen") },
            ].map((s) => (
              <li key={s.n}>
                <Link href={s.href} className="flex items-center gap-3 rounded-md border border-zinc-800 px-3 py-2.5 transition hover:border-gold">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold">{s.n}</span>
                  <span className="text-sm text-zinc-200">{s.txt}</span>
                  <ArrowRight size={15} className="ml-auto text-zinc-500" />
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Schnellzugriff */}
      <h2 className="mt-8 font-serif text-lg font-bold text-gold">{t("dash.quick", "Schnellzugriff")}</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quick.map(({ href, Icon, titleKey, titleDef, descKey, descDef }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-lg border border-zinc-800 bg-coal p-4 transition hover:border-gold"
          >
            <div className="flex items-center gap-2 text-gold">
              <Icon size={18} />
              <span className="font-medium text-zinc-100 group-hover:text-gold">{t(titleKey, titleDef)}</span>
              <ArrowRight size={15} className="ml-auto text-zinc-600 transition group-hover:text-gold" />
            </div>
            <p className="mt-2 text-sm text-zinc-400">{t(descKey, descDef)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
