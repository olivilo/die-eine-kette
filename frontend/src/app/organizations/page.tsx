"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, DataTable, Badge, Card } from "@/components/ui";
import { api, formatDate, type Organization } from "@/lib/api";

export default function OrganizationsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const lng = i18n.resolvedLanguage;
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdmin = (user?.role ?? 0) >= 10;

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    else if (!authLoading && user && !isAdmin) router.replace("/dashboard");
  }, [authLoading, user, isAdmin, router]);

  const load = useCallback(() => {
    api.organizations().then((res) => {
      setOrgs(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user && isAdmin) load();
  }, [user, isAdmin, load]);

  if (authLoading || !user || !isAdmin) return <p className="py-20 text-center text-zinc-400">…</p>;

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    await api.createOrganization(name.trim());
    setBusy(false);
    setName(""); setShowForm(false);
    load();
  }

  async function remove(id: number) {
    await api.deleteOrganization(id);
    load();
  }

  const columns = [t("orgs.name"), t("orgs.users"), t("orgs.status"), t("orgs.created"), ""];
  const rows = orgs.map((o) => [
    <span key="n" className="font-medium text-zinc-100">{o.name}</span>,
    o.user_count ?? 0,
    o.status === 1 ? <Badge key="s" tone="ok">{t("orgs.active")}</Badge> : <Badge key="s" tone="off">{t("orgs.inactive")}</Badge>,
    formatDate(o.created_time, lng),
    <button key="d" onClick={() => remove(o.id)} className="text-xs text-zinc-500 hover:text-red-400">{t("common.delete")}</button>,
  ]);

  const action = (
    <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gold-light">
      + {t("orgs.new")}
    </button>
  );

  return (
    <section className="py-8">
      <PageHeader title={t("nav.organizations")} subtitle={t("orgs.subtitle")} action={action} />
      {showForm && (
        <Card className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-300">
            {t("orgs.name")}
            <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold" />
          </label>
          <button onClick={create} disabled={busy} className="rounded-md bg-gold px-4 py-2 font-semibold text-ink hover:bg-gold-light disabled:opacity-60">{t("common.create")}</button>
          <button onClick={() => setShowForm(false)} className="rounded-md border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 hover:border-gold">{t("common.cancel")}</button>
        </Card>
      )}
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("orgs.empty")} />
      </div>
    </section>
  );
}
