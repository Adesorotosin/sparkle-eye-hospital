"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  completeDiagnosticOrder,
  getDiagnosticQueue,
  type DiagnosticQueueItem,
} from "@/app/actions/diagnostics";

export default function DiagnosticsPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<DiagnosticQueueItem[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] =
    useState<DiagnosticQueueItem | null>(null);
  const [findings, setFindings] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      const result = await getDiagnosticQueue();

      setOrders(result.orders);

      if (!result.success) {
        setMessage(
          result.message ?? "Unable to load diagnostics.",
        );
      } else {
        setMessage("");
      }
    });
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter(
      (order) =>
        !q ||
        order.patientName.toLowerCase().includes(q) ||
        order.patientId.toLowerCase().includes(q) ||
        order.testName.toLowerCase().includes(q),
    );
  }, [orders, search]);

  const ready = filtered.filter(
    (order) => order.status === "ready_for_test",
  );

  const completed = filtered.filter(
    (order) => order.status === "completed",
  );

  const openResult = (order: DiagnosticQueueItem) => {
    setSelected(order);
    setFindings(order.findings ?? "");
    setInterpretation(order.interpretation ?? "");
    setMessage("");
  };

  const closeModal = () => {
    if (isPending) return;

    setSelected(null);
    setFindings("");
    setInterpretation("");
  };

  const saveResult = () => {
    if (!selected) return;

    if (!findings.trim()) {
      setMessage(
        "Please enter the investigation findings before completing.",
      );
      return;
    }

    startTransition(async () => {
      const result = await completeDiagnosticOrder({
        id: selected.id,
        findings: findings.trim(),
        interpretation: interpretation.trim(),
      });

      setMessage(result.message);

      if (result.success) {
        setSelected(null);
        setFindings("");
        setInterpretation("");

        const next = await getDiagnosticQueue();
        setOrders(next.orders);
      }
    });
  };

  const card = (
    order: DiagnosticQueueItem,
    done = false,
  ) => (
    <button
      key={order.id}
      type="button"
      onClick={() => openResult(order)}
      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-purple-300 hover:shadow-md transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-sm text-slate-900">
            {order.patientName}
          </p>

          <p className="text-[11px] text-slate-400">
            {order.patientId}
          </p>
        </div>

        {done ? (
          <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
            COMPLETED
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
            READY
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-purple-600" />

        <span className="text-xs font-bold text-slate-800">
          {order.testName}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
        <span>₦{order.price.toLocaleString()}</span>

        <span>
          {new Date(order.createdAt).toLocaleString("en-GB")}
        </span>
      </div>

      {done && order.findings && (
        <p className="mt-3 text-[11px] text-slate-600 line-clamp-2">
          {order.findings}
        </p>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Hospital branding */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              <Image
                src="/Logo.png"
                alt="Sparkle Eye Specialist Hospital"
                width={44}
                height={44}
                priority
                className="w-full h-full object-contain p-1"
              />
            </div>

            <div>
              <h1 className="font-extrabold text-sm text-slate-900">
                Diagnostic Investigations
              </h1>

              <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">
                Sparkle Eye Specialist Hospital
              </p>
            </div>
          </div>

          {/* Header controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Back to Nurse Dashboard */}
            <button
              type="button"
              onClick={() => router.push("/nurse")}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Nurse Dashboard
            </button>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient or test..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={load}
              disabled={isPending}
              aria-label="Refresh diagnostics"
              className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isPending ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 md:p-6 lg:p-8">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <Clock3 className="w-5 h-5 text-amber-600" />

            <p className="text-2xl font-extrabold mt-3">
              {ready.length}
            </p>

            <p className="text-xs text-slate-500">
              Ready for investigation
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />

            <p className="text-2xl font-extrabold mt-3">
              {completed.length}
            </p>

            <p className="text-xs text-slate-500">
              Results completed
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <Activity className="w-5 h-5 text-purple-600" />

            <p className="text-2xl font-extrabold mt-3">
              {filtered.length}
            </p>

            <p className="text-xs text-slate-500">
              Total visible orders
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-5 p-3 rounded-xl bg-purple-50 text-purple-800 text-xs font-semibold">
            {message}
          </div>
        )}

        {/* Investigation sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ready for investigation */}
          <section>
            <h2 className="font-extrabold text-sm mb-3">
              Ready for Investigation
            </h2>

            <div className="space-y-3">
              {ready.map((order) => card(order))}

              {!ready.length && (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-xs text-slate-400">
                  No paid diagnostic requests are waiting.
                </div>
              )}
            </div>
          </section>

          {/* Completed results */}
          <section>
            <h2 className="font-extrabold text-sm mb-3">
              Completed Results
            </h2>

            <div className="space-y-3">
              {completed.map((order) => card(order, true))}

              {!completed.length && (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-xs text-slate-400">
                  No completed investigations yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Investigation modal */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-lg">
                  {selected.testName}
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  {selected.patientName} · {selected.patientId}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                aria-label="Close investigation"
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-50"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Investigation form */}
            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="findings"
                  className="text-xs font-bold text-slate-700"
                >
                  Findings *
                </label>

                <textarea
                  id="findings"
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  disabled={
                    selected.status === "completed" ||
                    isPending
                  }
                  rows={4}
                  className="mt-1 w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-50"
                  placeholder="Record the investigation findings..."
                />
              </div>

              <div>
                <label
                  htmlFor="interpretation"
                  className="text-xs font-bold text-slate-700"
                >
                  Clinical interpretation
                </label>

                <textarea
                  id="interpretation"
                  value={interpretation}
                  onChange={(e) =>
                    setInterpretation(e.target.value)
                  }
                  disabled={
                    selected.status === "completed" ||
                    isPending
                  }
                  rows={4}
                  className="mt-1 w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-slate-50"
                  placeholder="Add the interpretation or recommendation..."
                />
              </div>
            </div>

            {/* Action */}
            {selected.status === "ready_for_test" ? (
              <button
                type="button"
                onClick={saveResult}
                disabled={isPending || !findings.trim()}
                className="mt-5 w-full py-3 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isPending
                  ? "Saving result..."
                  : "Complete Investigation & Send to Doctor"}
              </button>
            ) : (
              <div className="mt-5 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
                This investigation is completed. The result is
                available to the doctor.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}