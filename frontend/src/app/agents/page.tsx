"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader, DataTable, Badge, Card } from "@/components/ui";
import { api, formatDate, type Agent, type PendingAction } from "@/lib/api";

export default function AgentsPage() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const lng = i18n.resolvedLanguage;
  const [items, setItems] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", allowed_tools: "", allowed_models: "", confirm_tools: "", rate_limit_per_min: 60 });
  const [pending, setPending] = useState<PendingAction[]>([]);
  const isRoot = (user?.role ?? 0) >= 100;

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
    else if (!authLoading && user && !isRoot) router.replace("/dashboard");
  }, [authLoading, user, isRoot, router]);

  const load = useCallback(() => {
    api.agents().then((res) => { setItems(Array.isArray(res.data) ? res.data : []); setLoading(false); });
    api.pendingAgentActions().then((res) => setPending(Array.isArray(res.data) ? res.data.filter((p) => p.status === "pending") : []));
  }, []);
  useEffect(() => { if (user && isRoot) load(); }, [user, isRoot, load]);

  if (authLoading || !user || !isRoot) return <p className="py-20 text-center text-zinc-400">…</p>;

  async function create() {
    if (!form.name.trim()) return;
    setBusy(true);
    const res = await api.createAgent({ ...form, name: form.name.trim() });
    setBusy(false);
    if (res.success && res.data) setNewKey(res.data.key);
    setForm({ name: "", allowed_tools: "", allowed_models: "", confirm_tools: "", rate_limit_per_min: 60 });
    setShowForm(false);
    load();
  }
  async function toggle(a: Agent) {
    await api.updateAgent({ id: a.id, name: a.name, status: a.status === 1 ? 2 : 1, allowed_tools: a.allowed_tools, allowed_models: a.allowed_models, confirm_tools: a.confirm_tools, rate_limit_per_min: a.rate_limit_per_min });
    load();
  }
  async function remove(id: number) { await api.deleteAgent(id); load(); }
  async function decide(id: number, approve: boolean) { await api.approveAgentAction(id, approve); load(); }

  const input = "rounded-md border border-zinc-700 bg-ink px-3 py-2 text-sm text-zinc-100 outline-none focus:border-gold";
  const columns = [t("agents.name"), t("agents.status"), t("agents.tools"), t("agents.rate"), t("agents.last_used"), ""];
  const rows = items.map((a) => [
    <span key="n" className="font-medium text-zinc-100">{a.name}</span>,
    a.status === 1 ? <Badge key="s" tone="ok">{t("agents.active")}</Badge> : <Badge key="s" tone="off">{t("agents.disabled")}</Badge>,
    <span key="t" className="text-zinc-400">{a.allowed_tools || "—"}</span>,
    `${a.rate_limit_per_min}/min`,
    a.last_used_time ? formatDate(a.last_used_time, lng) : "—",
    <div key="a" className="flex gap-3 text-xs">
      <button onClick={() => toggle(a)} className="text-zinc-400 hover:text-gold">{a.status === 1 ? t("agents.kill") : t("agents.enable")}</button>
      <button onClick={() => remove(a.id)} className="text-zinc-500 hover:text-red-400">{t("common.delete")}</button>
    </div>,
  ]);

  const action = (
    <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-gold-light">+ {t("agents.new")}</button>
  );

  return (
    <section className="py-8">
      <PageHeader title={t("nav.agents")} subtitle={t("agents.subtitle")} action={action} />

      <p className="mt-3 max-w-3xl rounded-md border border-gold/30 px-3 py-2 text-xs text-gold-accent">{t("agents.security_note")}</p>

      {pending.length > 0 && (
        <Card className="mt-4 border-gold/40">
          <p className="text-sm font-semibold text-gold-accent">{t("agents.pending_title")} <Badge tone="off">{pending.length}</Badge></p>
          <p className="mt-1 text-xs text-zinc-400">{t("agents.pending_hint")}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-md border border-zinc-800 bg-ink px-3 py-2 text-sm">
                <code className="rounded bg-coal px-2 py-0.5 font-mono text-gold">{p.tool}</code>
                <span className="truncate text-zinc-400">{p.input || "—"}</span>
                <span className="text-xs text-zinc-600">{formatDate(p.created_at, lng)}</span>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => decide(p.id, true)} className="rounded-md bg-gold px-3 py-1 text-xs font-semibold text-ink hover:bg-gold-light">{t("agents.approve")}</button>
                  <button onClick={() => decide(p.id, false)} className="rounded-md border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300 hover:border-red-400 hover:text-red-400">{t("agents.deny")}</button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {newKey && (
        <Card className="mt-4 border-gold/40">
          <p className="text-sm text-gold-accent">{t("agents.key_once")}</p>
          <code className="mt-2 block break-all rounded bg-ink px-3 py-2 font-mono text-sm text-zinc-100">{newKey}</code>
          <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-zinc-400 hover:text-gold">{t("common.cancel")}</button>
        </Card>
      )}

      {showForm && (
        <Card className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">{t("common.name")}
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} /></label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">{t("agents.rate")}
            <input type="number" value={form.rate_limit_per_min} onChange={(e) => setForm({ ...form, rate_limit_per_min: Number(e.target.value) })} className={input} /></label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">{t("agents.tools")}
            <input value={form.allowed_tools} onChange={(e) => setForm({ ...form, allowed_tools: e.target.value })} placeholder="search,fetch" className={input} />
            <span className="text-xs text-zinc-500">{t("agents.tools_hint")}</span></label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300">{t("agents.models")}
            <input value={form.allowed_models} onChange={(e) => setForm({ ...form, allowed_models: e.target.value })} placeholder="gpt-4o-mini" className={input} /></label>
          <label className="flex flex-col gap-1 text-sm text-zinc-300 sm:col-span-2">{t("agents.confirm_tools")}
            <input value={form.confirm_tools} onChange={(e) => setForm({ ...form, confirm_tools: e.target.value })} placeholder="delete_file,send_email" className={input} />
            <span className="text-xs text-zinc-500">{t("agents.confirm_tools_hint")}</span></label>
          <div className="flex gap-2 sm:col-span-2">
            <button onClick={create} disabled={busy} className="rounded-md bg-gold px-4 py-2 font-semibold text-ink hover:bg-gold-light disabled:opacity-60">{t("common.create")}</button>
            <button onClick={() => setShowForm(false)} className="rounded-md border border-zinc-700 px-4 py-2 font-semibold text-zinc-200 hover:border-gold">{t("common.cancel")}</button>
          </div>
        </Card>
      )}
      <div className="mt-6"><DataTable columns={columns} rows={rows} loading={loading} empty={t("agents.empty")} /></div>
    </section>
  );
}
