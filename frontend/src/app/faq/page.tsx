"use client";

import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui";

type QA = { q: string; a: string };

export default function FaqPage() {
  const { t } = useTranslation();
  const raw = t("faq.items", { returnObjects: true });
  const items: QA[] = Array.isArray(raw) ? (raw as QA[]) : [];

  return (
    <section className="py-8">
      <PageHeader title={t("faq.title")} subtitle={t("faq.subtitle")} />
      <div className="mt-6 max-w-3xl space-y-2">
        {items.map((it, i) => (
          <details key={i} className="group rounded-lg border border-zinc-800 bg-coal p-4 open:border-gold/40">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-zinc-100 marker:hidden">
              <span className="text-gold transition-transform group-open:rotate-90">›</span>
              {it.q}
            </summary>
            <p className="mt-2 pl-5 text-sm leading-relaxed text-zinc-400">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
