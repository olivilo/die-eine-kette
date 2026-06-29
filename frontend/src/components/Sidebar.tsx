"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Server, KeyRound, Activity, Euro, Building2, Wallet,
  Users, ScrollText, Ticket, Settings, HelpCircle, Bot, LogOut, PanelLeftClose, PanelLeftOpen, X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import LanguageSwitcher from "./LanguageSwitcher";

type Item = { k: string; Icon: LucideIcon; min?: number };
type Group = { key: string; items: Item[] };

// min = benötigte Rolle (10 = Admin, 100 = Root); ohne min = alle.
const GROUPS: Group[] = [
  { key: "overview", items: [{ k: "dashboard", Icon: LayoutDashboard }] },
  { key: "ai", items: [
    { k: "providers", Icon: Server },
    { k: "tokens", Icon: KeyRound },
    { k: "usage", Icon: Activity },
    { k: "costs", Icon: Euro, min: 10 },
  ] },
  { key: "tenants", items: [
    { k: "organizations", Icon: Building2, min: 100 },
    { k: "budgets", Icon: Wallet, min: 100 },
    { k: "agents", Icon: Bot, min: 100 },
  ] },
  { key: "admin", items: [
    { k: "users", Icon: Users, min: 10 },
    { k: "logs", Icon: ScrollText, min: 10 },
    { k: "redemption", Icon: Ticket, min: 10 },
  ] },
  { key: "system", items: [
    { k: "settings", Icon: Settings },
    { k: "faq", Icon: HelpCircle },
  ] },
];

export default function Sidebar({
  collapsed, onToggle, mobileOpen, onCloseMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const role = user?.role ?? 0;
  const wide = !collapsed;

  const isActive = (k: string) => pathname === `/${k}` || pathname.startsWith(`/${k}/`);

  return (
    <>
      {/* Backdrop (nur Mobil, wenn offen) */}
      <div
        onClick={onCloseMobile}
        className={`fixed inset-0 z-30 bg-black/60 md:hidden ${mobileOpen ? "block" : "hidden"}`}
        aria-hidden
      />
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-zinc-800 bg-coal transition-all duration-200
          ${wide ? "w-64" : "w-16"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Markenkopf — Name in EINER Zeile */}
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-3">
          <a href="/" className="flex items-center gap-2 overflow-hidden">
            <Image src="/brand/mark.svg" alt="" width={32} height={32} priority className="shrink-0" />
            {wide && (
              <span className="whitespace-nowrap font-serif text-base font-bold tracking-wide text-gold">
                Die Eine Kette
              </span>
            )}
          </a>
          <button
            onClick={onCloseMobile}
            className="ml-auto rounded p-1 text-zinc-400 hover:text-gold md:hidden"
            aria-label={t("navgroup.menu")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Einklapp-Toggle (Desktop) — direkt unter dem Kopf, immer sichtbar */}
        <button
          onClick={onToggle}
          className={`hidden items-center gap-2 border-b border-zinc-800 px-3 py-2 text-xs text-zinc-500 hover:text-gold md:flex ${wide ? "justify-end" : "justify-center"}`}
          aria-label={wide ? t("navgroup.collapse") : t("navgroup.expand")}
          title={wide ? t("navgroup.collapse") : t("navgroup.expand")}
        >
          {wide ? <><PanelLeftClose size={16} /> {t("navgroup.collapse")}</> : <PanelLeftOpen size={16} />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          {GROUPS.map((g) => {
            const items = g.items.filter((it) => role >= (it.min ?? 0));
            if (items.length === 0) return null;
            return (
              <div key={g.key} className="mb-1 px-2">
                {wide && (
                  <div className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {t(`navgroup.${g.key}`)}
                  </div>
                )}
                {!wide && <div className="mx-2 my-2 border-t border-zinc-800/70" />}
                <ul className="flex flex-col gap-0.5">
                  {items.map(({ k, Icon }) => {
                    const active = isActive(k);
                    return (
                      <li key={k}>
                        <a
                          href={`/${k}`}
                          onClick={onCloseMobile}
                          title={!wide ? t(`nav.${k}`) : undefined}
                          className={`group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition
                            ${active ? "bg-ink text-gold" : "text-zinc-300 hover:bg-ink/60 hover:text-gold"}
                            ${wide ? "" : "justify-center"}`}
                        >
                          {/* Ring-Akzent (Kette): aktiv = gefüllter Goldpunkt */}
                          {wide && (
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full border ${active ? "border-gold bg-gold" : "border-zinc-600"}`} />
                          )}
                          <Icon size={18} className={active ? "text-gold" : "text-zinc-400 group-hover:text-gold"} />
                          {wide && <span className="truncate">{t(`nav.${k}`)}</span>}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Fuß: Sprache · Nutzer · Abmelden · Einklappen */}
        <div className="border-t border-zinc-800 p-2">
          {wide ? (
            <div className="flex flex-col gap-2">
              <LanguageSwitcher />
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-zinc-400">{user?.display_name || user?.username}</span>
                <button onClick={() => void logout()} className="flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs font-semibold text-zinc-200 hover:border-gold hover:text-gold">
                  <LogOut size={14} /> {t("common.logout")}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => void logout()} title={t("common.logout")} className="flex w-full justify-center rounded-md py-2 text-zinc-300 hover:text-gold">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
