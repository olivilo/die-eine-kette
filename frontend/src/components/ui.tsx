// Schlanke UI-Primitive im shadcn-Stil (ins Projekt kopiert, voll themebar).
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-800 pb-4">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-zinc-800 bg-coal p-4 ${className}`}>{children}</div>;
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gold">{value}</div>
    </Card>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "ok" | "warn" | "off" | "neutral" }) {
  const tones = {
    ok: "border-emerald-700 text-emerald-300",
    warn: "border-amber-700 text-amber-300",
    off: "border-zinc-700 text-zinc-400",
    neutral: "border-gold/40 text-gold-accent",
  } as const;
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

export function DataTable({
  columns,
  rows,
  empty,
  loading,
}: {
  columns: string[];
  rows: ReactNode[][];
  empty: string;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-coal text-xs uppercase tracking-wide text-zinc-400">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {loading ? (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">{empty}</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="text-zinc-200 hover:bg-coal/60">
                {r.map((cell, j) => (
                  <td key={j} className="px-4 py-3">{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
