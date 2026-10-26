"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Glasses, LogOut, RefreshCw } from "lucide-react";
import { getOpticianQueue, type OpticalOrder } from "@/app/actions/optician";

export default function OpticianDashboard() {
  const [orders, setOrders] = useState<OpticalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const result = await getOpticianQueue();
      if (!result.success) throw new Error(result.message || "Unable to load spectacle prescriptions.");
      setOrders(result.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load spectacle prescriptions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadOrders(); }, []);

  async function logout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally {
      localStorage.removeItem("sparkle_staff_token");
      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-100 p-3 text-violet-700"><Glasses className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-violet-700">Sparkle Eye Specialist Hospital</p><h1 className="text-xl font-extrabold">Spectacle prescriptions</h1><p className="text-xs text-slate-500">Review the prescription sent by the doctor. Glasses production is managed by Inventory.</p></div></div>
          <div className="flex gap-2"><button onClick={() => void loadOrders()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><RefreshCw className="h-4 w-4" /> Refresh</button><button onClick={() => void logout()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><LogOut className="h-4 w-4" /> Sign out</button></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-5 px-5 py-8 sm:px-8">
        <section className="rounded-2xl border border-violet-100 bg-violet-50 p-5"><div className="flex items-start gap-3"><ClipboardList className="mt-0.5 h-5 w-5 text-violet-700" /><div><h2 className="font-extrabold text-violet-950">Prescription-only workspace</h2><p className="mt-1 text-sm text-violet-800">Optician access is limited to viewing the spectacle prescription. Frame selection, lens production, fitting, readiness and collection are handled by the Inventory team.</p></div></div></section>
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold">Doctor's optical requests</h2><p className="mt-1 text-xs text-slate-500">{orders.length} request(s)</p></div>
          {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading prescriptions…</p> : orders.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No spectacle prescriptions have been sent yet.</p> : <div className="divide-y divide-slate-100">{orders.map(order => <div key={order.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="font-bold">{order.patientName}</p><p className="mt-1 text-xs text-slate-500">{order.patientCode}{order.age !== null ? ` · ${order.age} years` : ""}{order.gender ? ` · ${order.gender}` : ""}</p><p className="mt-1 text-xs font-semibold text-violet-700">Prescription status: {order.status.replace(/_/g, " ")}</p></div><Link href={`/optician/${encodeURIComponent(order.patientCode)}`} className="rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-violet-800">View spectacle prescription</Link></div>)}</div>}
        </section>
      </main>
    </div>
  );
}
