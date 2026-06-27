"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col items-center gap-8 py-20 text-center md:py-28">
      <Image src="/brand/logo.svg" alt={t("brand.name")} width={460} height={120} priority className="max-w-full" />

      <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight text-gold md:text-5xl">
        {t("hero.title")}
      </h1>

      <p className="max-w-2xl text-lg text-zinc-300">{t("hero.subtitle")}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href="/login"
          className="rounded-lg bg-gold px-5 py-2.5 font-semibold text-ink transition hover:bg-gold-light"
        >
          {t("hero.cta_start")}
        </a>
        <a
          href="https://github.com/"
          className="rounded-lg border border-zinc-700 px-5 py-2.5 font-semibold text-zinc-200 transition hover:border-gold hover:text-gold"
        >
          {t("hero.cta_docs")}
        </a>
      </div>

      <span className="mt-4 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold-accent">
        {t("common.phase")}
      </span>
    </section>
  );
}
