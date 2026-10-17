"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, Clock3, LoaderCircle, RefreshCw, Search, UserRound } from "lucide-react";

type Appointment = {
  id: string;
  patientName: string;
  physician?: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "checked_in" | "completed" | "cancelled" | "no_show" | string;
  notes?: string | null;
};

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function appointmentTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { scheduled: "Scheduled", checked_in: "Checked in", completed: "Completed", cancelled: "Cancelled", no_show: "No show" };
  return labels[status] ?? status.replaceAll("_", " ");
}

function statusStyle(status: string) {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "checked_in") return "bg-blue-100 text-blue-800";
  if (status === "cancelled" || status === "no_show") return "bg-slate-100 text-slate-500";
  return "bg-amber-100 text-amber-800";
}

function patientCode(name: string) {
  return /\(([^()]+)\)\s*$/.exec(name)?.[1]?.trim() ?? "";
}

export default function WorkflowQueuePage() {
  const router = useRouter();
  const [date, setDate] = useState(localDateString());
  const [search, setSearch] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/appointments?date=${encodeURIComponent(date)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load the doctor’s queue.");
      setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the doctor’s queue.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { void loadQueue(); }, [loadQueue]);

  const filtered = useMemo(() => appointments
    .filter((item) => item.status !== "cancelled" && item.status !== "no_show")
    .filter((item) => {
      const term = search.trim().toLowerCase();
      return !term || item.patientName.toLowerCase().includes(term) ||
        (item.physician ?? "").toLowerCase().includes(term) ||
        (item.notes ?? "").toLowerCase().includes(term);
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  [appointments, search]);

  const waitingCount = filtered.filter((item) => item.status === "scheduled" || item.status === "checked_in").length;
  const checkedInCount = filtered.filter((item) => item.status === "checked_in").length;
  const completedCount = filtered.filter((item) => item.status === "completed").length;

  return (
    <div className="min-h-full bg-[#F4F6FB] px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Clinical queue</p>
              <h1 className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">Workflow Queue</h1>
              <p className="mt-2 max-w-2xl text-sm leading-5 text-slate-500">One clear list of appointments for the selected day. Patient status comes from the appointment system; this screen does not move patients between stages.</p>
            </div>
            <button type="button" onClick={() => void loadQueue()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
            </button>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">Active appointments</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{loading ? "—" : filtered.length}</p></div>
            <div className="rounded-xl bg-amber-50 p-3"><p className="text-xs font-semibold text-amber-800">Waiting / checked in</p><p className="mt-1 text-2xl font-extrabold text-amber-900">{loading ? "—" : waitingCount}</p></div>
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-800">Completed</p><p className="mt-1 text-2xl font-extrabold text-emerald-900">{loading ? "—" : completedCount}</p></div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5">
            <label className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-500"><CalendarDays className="h-4 w-4 shrink-0" /><span className="sr-only">Queue date</span><input aria-label="Queue date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none" /></label>
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, doctor or note…" className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" /></label>
          </div>

          {error && <div className="m-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><p>{error}</p><button type="button" onClick={() => void loadQueue()} className="mt-2 font-bold underline underline-offset-2">Try again</button></div></div>}

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-14 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />Loading appointments…</div>
          ) : !error && filtered.length === 0 ? (
            <div className="px-4 py-14 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No appointments found</p><p className="mt-1 text-xs text-slate-500">Try another date or search term.</p></div>
          ) : (
            <>
              <div className="space-y-3 p-3 sm:hidden">
                {filtered.map((item) => {
                  const code = patientCode(item.patientName);
                  return <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-sm font-bold text-slate-900">{item.patientName.replace(/\s*\([^()]+\)\s*$/, "")}</h2>{code && <p className="mt-1 text-xs text-slate-500">{code}</p>}</div><span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${statusStyle(item.status)}`}>{statusLabel(item.status)}</span></div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs"><span className="flex items-center gap-1.5 text-slate-600"><Clock3 className="h-3.5 w-3.5" />{appointmentTime(item.startTime)}</span><span className="truncate text-slate-500">{item.physician || "Doctor not assigned"}</span></div>
                    {code && <button type="button" onClick={() => router.push(`/doctor/patients/${encodeURIComponent(code)}/encounter`)} className="mt-3 min-h-10 w-full rounded-xl bg-purple-700 px-3 py-2 text-sm font-bold text-white hover:bg-purple-800">Open patient</button>}
                  </article>;
                })}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Time</th><th className="px-5 py-3 font-semibold">Patient</th><th className="px-5 py-3 font-semibold">Doctor</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{filtered.map((item) => { const code = patientCode(item.patientName); return <tr key={item.id} className="hover:bg-slate-50/80"><td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">{appointmentTime(item.startTime)}</td><td className="px-5 py-4"><p className="font-bold text-slate-900">{item.patientName.replace(/\s*\([^()]+\)\s*$/, "")}</p>{code && <p className="mt-1 text-xs text-slate-500">{code}</p>}</td><td className="px-5 py-4 text-slate-600">{item.physician || "Not assigned"}</td><td className="px-5 py-4"><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${statusStyle(item.status)}`}>{statusLabel(item.status)}</span></td><td className="px-5 py-4">{code ? <button type="button" onClick={() => router.push(`/doctor/patients/${encodeURIComponent(code)}/encounter`)} className="font-bold text-purple-700 hover:text-purple-900">Open patient →</button> : <button type="button" onClick={() => router.push("/doctor/patients")} className="font-bold text-purple-700 hover:text-purple-900">Find record →</button>}</td></tr>; })}</tbody>
                </table>
              </div>
            </>
          )}
          {!loading && !error && <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">{checkedInCount} checked in · {completedCount} completed</p>}
        </section>
      </div>
    </div>
  );
}
