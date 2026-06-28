"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, Badge } from "@/components/ui";
import { api } from "@/lib/api";

type Lic = Awaited<ReturnType<typeof api.license>>["data"];

export default function LicenseInfo() {
  const { t, i18n } = useTranslation();
  const [lic, setLic] = useState<Lic | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.license().then((res) => {
      setLic(res.data ?? null);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return null;

  const commercial = !!lic?.commercial;
  const validUntil = lic?.valid_until
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: "medium" }).format(new Date(lic.valid_until))
    : "—";

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold text-gold">{t("license.title")}</h2>
        <Badge tone={commercial ? "ok" : "off"}>{commercial ? lic?.tier : t("license.community")}</Badge>
      </div>
      <p className="mt-2 text-sm text-zinc-400">{t("license.desc")}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <Row label={t("license.customer")} value={lic?.customer || "—"} />
        <Row label={t("license.max_orgs")} value={String(lic?.max_orgs ?? 1)} />
        <Row label={t("license.max_seats")} value={String(lic?.max_seats ?? 5)} />
        <Row label={t("license.max_nodes")} value={String(lic?.max_nodes ?? 1)} />
        <Row label={t("license.valid_until")} value={commercial ? validUntil : "—"} />
        <Row label={t("license.features")} value={(lic?.features?.length ? lic.features.join(", ") : "—")} />
      </dl>

      {!commercial && (
        <p className="mt-4 rounded-md border border-gold/40 px-3 py-2 text-xs text-gold-accent">
          {t("license.upgrade_hint")}
        </p>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-zinc-200">{value}</dd>
    </div>
  );
}
