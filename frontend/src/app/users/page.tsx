"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, DataTable, Badge, Card } from "@/components/ui";
import { api, formatNumber, type User } from "@/lib/api";

function roleLabel(role: number | undefined, t: (k: string) => string) {
  if ((role ?? 0) >= 100) return t("users.role_root");
  if ((role ?? 0) >= 10) return t("users.role_admin");
  return t("users.role_user");
}

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const lng = i18n.resolvedLanguage;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdmin = (user?.role ?? 0) >= 10;

  // Schutz: nur Admins
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    else if (!authLoading && user && !isAdmin) router.replace("/dashboard");
  }, [authLoading, user, isAdmin, router]);

  const load = useCallback(() => {
    api.users().then((res) => {
      setUsers(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (user && isAdmin) load();
  }, [user, isAdmin, load]);

  if (authLoading || !user || !isAdmin) return <p className="py-20 text-center text-zinc-400">…</p>;

  async function create() {
    if (!username.trim() || password.length < 8) return;
    setBusy(true);
    await api.createUser(username.trim(), password);
    setBusy(false);
    setUsername(""); setPassword(""); setShowForm(false);
    load();
  }

  async function manage(u: User, action: "enable" | "disable" | "promote" | "demote" | "delete") {
    await api.manageUser(u.username, action);
    load();
  }

  const columns = [t("users.username"), t("users.role"), t("users.status"), t("dashboard.quota"), ""];
  const rows = users.map((u) => {
    const enabled = u.status === 1;
    const self = u.id === user.id;
    return [
      <span key="n" className="font-medium text-zinc-100">{u.display_name || u.username}<span className="ml-2 text-xs text-zinc-500">@{u.username}</span></span>,
      roleLabel(u.role, t),
      enabled ? <Badge key="s" tone="ok">{t("users.enabled")}</Badge> : <Badge key="s" tone="off">{t("users.disabled")}</Badge>,
      formatNumber(u.quota, lng),
      self ? <span key="a" className="text-xs text-zinc-600">—</span> : (
        <div key="a" className="flex gap-3 text-xs">
          <button onClick={() => manage(u, enabled ? "disable" : "enable")} className="text-zinc-400 hover:text-gold">
            {enabled ? t("users.disable") : t("users.enable")}
          </button>
          <button onClick={() => manage(u, (u.role ?? 0) >= 10 ? "demote" : "promote")} className="text-zinc-400 hover:text-gold">
            {(u.role ?? 0) >= 10 ? t("users.demote") : t("users.promote")}
          </button>
          <button onClick={() => manage(u, "delete")} className="text-zinc-500 hover:text-red-400">{t("common.delete")}</button>
        </div>
      ),
    ];
  });

  const action = (
    <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gold-light">
      + {t("users.new")}
    </button>
  );
  const input = "rounded-md border border-zinc-700 bg-ink px-3 py-2 text-zinc-100 outline-none focus:border-gold";

  return (
    <section className="py-8">
      <PageHeader title={t("nav.users")} subtitle={t("users.subtitle")} action={action} />
      {showForm && (
        <Card className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("users.username")}
            <input value={username} onChange={(e) => setUsername(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            {t("login.password")}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={input} />
            <span className="text-xs text-zinc-500">{t("users.pw_hint")}</span>
          </label>
          <button onClick={create} disabled={busy} className="rounded-md bg-gold px-4 py-2 font-semibold text-ink hover:bg-gold-light disabled:opacity-60">{t("common.create")}</button>
          <button onClick={() => setShowForm(false)} className="rounded-md border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 hover:border-gold">{t("common.cancel")}</button>
        </Card>
      )}
      <div className="mt-6">
        <DataTable columns={columns} rows={rows} loading={loading} empty={t("users.empty")} />
      </div>
    </section>
  );
}
