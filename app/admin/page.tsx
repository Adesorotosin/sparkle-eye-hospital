"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, CalendarDays, ClipboardList, Settings2, Users, Wallet } from "lucide-react";
import InventoryOverview from "@/components/admin/InventoryOverview";

interface AdminStats {
  totalRevenue: number;
  activePatientEncounters: number;
  totalStaff: number;
  lowStockCount: number;
  todaysAppointments: number;
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

function StatCard({ label, value, hint, icon: Icon }: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className="rounded-xl bg-slate-100 p-2 text-slate-600"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/stats", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load hospital overview.");
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load hospital overview.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const number = (value?: number) => loading ? "Loading…" : (value ?? 0).toLocaleString();

  return (
    <main className="mx-auto max-w-7xl space-y-7 p-5 text-slate-800 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Hospital overview</h1>
          <p className="mt-1 text-sm text-slate-500">A simple view of today’s hospital operations.</p>
        </div>
        <Link href="/admin/audit" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">
          <Activity className="h-4 w-4" /> View activity & audit logs
        </Link>
      </header>

      {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}

      <section aria-label="Hospital summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today’s appointments" value={number(stats?.todaysAppointments)} hint="Appointments scheduled today" icon={CalendarDays} />
        <StatCard label="Active patient encounters" value={number(stats?.activePatientEncounters)} hint="Encounters currently in progress" icon={Users} />
        <StatCard label="Total staff" value={number(stats?.totalStaff)} hint="Staff accounts in the hospital" icon={Users} />
        <StatCard label="Revenue received" value={loading ? "Loading…" : currency(stats?.totalRevenue ?? 0)} hint="From paid invoices" icon={Wallet} />
      </section>

      <InventoryOverview />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Quick access</h2>
          <p className="mt-1 text-sm text-slate-500">Go directly to the main administration tasks.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/admin/audit" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400">
            <span><strong className="block text-sm">Activity & audit logs</strong><span className="mt-1 block text-xs text-slate-500">Review staff and system activity</span></span><ArrowUpRight className="h-4 w-4 text-slate-400" />
          </Link>
          <Link href="/admin/reports" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400">
            <span><strong className="block text-sm">Reports</strong><span className="mt-1 block text-xs text-slate-500">View financial and operational reports</span></span><ClipboardList className="h-4 w-4 text-slate-400" />
          </Link>
          <Link href="/admin/access-control" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400">
            <span><strong className="block text-sm">Staff access</strong><span className="mt-1 block text-xs text-slate-500">Manage roles and permissions</span></span><Users className="h-4 w-4 text-slate-400" />
          </Link>
          <Link href="/admin/settings" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400">
            <span><strong className="block text-sm">Hospital settings</strong><span className="mt-1 block text-xs text-slate-500">Configure administrative preferences</span></span><Settings2 className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </section>
    </main>
  );
}
