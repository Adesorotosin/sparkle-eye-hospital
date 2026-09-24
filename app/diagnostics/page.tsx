"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { Activity, CheckCircle2, Clock3, RefreshCw, Search, X } from "lucide-react";
import { completeDiagnosticOrder, getDiagnosticQueue, type DiagnosticQueueItem } from "@/app/actions/diagnostics";

export default function DiagnosticsPage() {
  const [orders, setOrders] = useState<DiagnosticQueueItem[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DiagnosticQueueItem | null>(null);
  const [findings, setFindings] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      const result = await getDiagnosticQueue();
      setOrders(result.orders);
      if (!result.success) setMessage(result.message ?? "Unable to load diagnostics.");
    });
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) =>
      !q ||
      o.patientName.toLowerCase().includes(q) ||
      o.patientId.toLowerCase().includes(q) ||
      o.testName.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const ready = filtered.filter((o) => o.status === "ready_for_test");
  const completed = filtered.filter((o) => o.status === "completed");

  const openResult = (order: DiagnosticQueueItem) => {
    setSelected(order);
    setFindings(order.findings ?? "");
    setInterpretation(order.interpretation ?? "");
    setMessage("");
  };

  const saveResult = () => {
    if (!selected) return;
    startTransition(async () => {
      const result = await completeDiagnosticOrder({
        id: selected.id,
        findings,
        interpretation,
      });
      setMessage(result.message);
      if (result.success) {
        setSelected(null);
        setFindings("");
        setInterpretation("");
        await getDiagnosticQueue().then((next) => setOrders(next.orders));
      }
    });
  };

  const card = (order: DiagnosticQueueItem, done = false) => (
    <button
      key={order.id}
      onClick={() => openResult(order)}
      className="text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-purple-300 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-sm text-slate-900">{order.patientName}</p>
          <p className="text-[11px] text-slate-400">{order.patientId}</p>
        </div>
        {done ? (
          <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">COMPLETED</span>
        ) : (
          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">READY</span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-purple-600" />
        <span className="text-xs font-bold text-slate-800">{order.testName}</span>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
        <span>₦{order.price.toLocaleString()}</span>
        <span>{new Date(order.createdAt).toLocaleString("en-GB")}</span>
      </div>
      {done && order.findings && (
        <p className="mt-3 text-[11px] text-slate-600 line-clamp-2">{order.findings}</p>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900">Diagnostic Investigations</h1>
            <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">Sparkle Eye Specialist Hospital</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patient or test..." className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none" />
          </div>
          <button onClick={load} disabled={isPending} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5"><Clock3 className="w-5 h-5 text-amber-600" /><p className="text-2xl font-extrabold mt-3">{ready.length}</p><p className="text-xs text-slate-500">Ready for investigation</p></div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5"><CheckCircle2 className="w-5 h-5 text-emerald-600" /><p className="text-2xl font-extrabold mt-3">{completed.length}</p><p className="text-xs text-slate-500">Results completed</p></div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5"><Activity className="w-5 h-5 text-purple-600" /><p className="text-2xl font-extrabold mt-3">{filtered.length}</p><p className="text-xs text-slate-500">Total visible orders</p></div>
        </div>

        {message && <div className="mb-5 p-3 rounded-xl bg-purple-50 text-purple-800 text-xs font-semibold">{message}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <h2 className="font-extrabold text-sm mb-3">Ready for Investigation</h2>
            <div className="space-y-3">
              {ready.map((o) => card(o))}
              {!ready.length && <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-xs text-slate-400">No paid diagnostic requests are waiting.</div>}
            </div>
          </section>
          <section>
            <h2 className="font-extrabold text-sm mb-3">Completed Results</h2>
            <div className="space-y-3">
              {completed.map((o) => card(o, true))}
              {!completed.length && <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-xs text-slate-400">No completed investigations yet.</div>}
            </div>
          </section>
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-extrabold text-lg">{selected.testName}</h2>
                <p className="text-xs text-slate-500 mt-1">{selected.patientName} · {selected.patientId}</p>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Findings *</label>
                <textarea value={findings} onChange={(e) => setFindings(e.target.value)} disabled={selected.status === "completed"} rows={4} className="mt-1 w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-purple-500" placeholder="Record the investigation findings..." />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Clinical interpretation</label>
                <textarea value={interpretation} onChange={(e) => setInterpretation(e.target.value)} disabled={selected.status === "completed"} rows={4} className="mt-1 w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-purple-500" placeholder="Add the interpretation or recommendation..." />
              </div>
            </div>

            {selected.status === "ready_for_test" ? (
              <button onClick={saveResult} disabled={isPending} className="mt-5 w-full py-3 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 disabled:opacity-50">
                {isPending ? "Saving result..." : "Complete Investigation & Send to Doctor"}
              </button>
            ) : (
              <div className="mt-5 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">This investigation is completed. The result is available to the doctor.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
