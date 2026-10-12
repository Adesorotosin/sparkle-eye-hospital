"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { BadgeCheck, CheckCircle2, Clock3, Loader2, RefreshCw, XCircle } from "lucide-react";
import {
  decideOpticalChargeApproval,
  getPendingOpticalChargeApprovals,
  type OpticalChargeApprovalItem,
} from "@/app/actions/optician";

function formatCurrency(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

export default function OpticalChargeApprovalsPage() {
  const [items, setItems] = useState<OpticalChargeApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getPendingOpticalChargeApprovals();
      if (!result.success) {
        setError(result.message ?? "Unable to load optical charge approvals.");
        setItems([]);
      } else {
        setItems(result.items);
      }
    } catch (loadError) {
      console.error("Load optical charge approvals failed:", loadError);
      setError("Unable to load optical charge approvals.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  function decide(item: OpticalChargeApprovalItem, decision: "approved" | "rejected") {
    const note = (notes[item.id] ?? "").trim();
    if (decision === "rejected" && !note) {
      setFeedback("Add a reason before rejecting a proposed charge.");
      return;
    }

    setFeedback("");
    startTransition(async () => {
      const result = await decideOpticalChargeApproval(item.id, decision, note);
      setFeedback(result.message);
      if (result.success) {
        setNotes((current) => {
          const next = { ...current };
          delete next[item.id];
          return next;
        });
        await loadApprovals();
      }
    });
  }

  return (
    <div className="min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Doctor Review</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Optical Charge Approvals</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review the eyewear details and proposed charge. Approval allows the Optician to add the charge to the existing invoice workflow; the Cashier still records payment.
            </p>
          </div>
          <button type="button" onClick={() => void loadApprovals()} disabled={loading || isPending} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {feedback ? <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">{feedback}</div> : null}
        {error ? <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

        {loading ? (
          <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading pending approvals…
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><BadgeCheck className="h-6 w-6" /></div>
            <h2 className="mt-4 text-base font-semibold text-slate-900">No pending optical charges</h2>
            <p className="mt-2 text-sm text-slate-500">New requests from the Optician will appear here.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {items.map((item) => (
              <section key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{item.patientName}</h2>
                    <p className="mt-1 text-xs text-slate-500">Patient code: {item.patientCode}</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-700"><Clock3 className="h-3.5 w-3.5" /> Submitted {formatDate(item.submittedAt)}</p>
                  </div>
                  <div className="rounded-xl bg-violet-50 px-4 py-3 sm:text-right">
                    <p className="text-xs font-medium text-violet-600">Proposed charge</p>
                    <p className="mt-1 text-xl font-bold text-violet-900">{formatCurrency(item.opticalCharge)}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Frame</p><p className="mt-1 text-sm font-medium text-slate-800">{item.frameSelection || "Not specified"}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Lens type</p><p className="mt-1 text-sm font-medium text-slate-800">{item.lensType || "Not specified"}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Lens material</p><p className="mt-1 text-sm font-medium text-slate-800">{item.lensMaterial || "Not specified"}</p></div>
                  <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Lens coating</p><p className="mt-1 text-sm font-medium text-slate-800">{item.lensCoating || "Not specified"}</p></div>
                </div>
                {item.dispensingNotes ? <div className="mt-3 rounded-xl border border-slate-100 p-3"><p className="text-xs font-medium text-slate-500">Optician notes</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{item.dispensingNotes}</p></div> : null}

                <label className="mt-4 block">
                  <span className="text-sm font-medium text-slate-700">Decision note (required for rejection)</span>
                  <textarea value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} rows={2} placeholder="Add a note or reason for rejection…" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                </label>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => decide(item, "rejected")} disabled={isPending} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><XCircle className="h-4 w-4" /> Reject charge</button>
                  <button type="button" onClick={() => decide(item, "approved")} disabled={isPending} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve charge</button>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
