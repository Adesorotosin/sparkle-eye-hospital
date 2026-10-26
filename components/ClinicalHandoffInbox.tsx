"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock3, Loader2, ReceiptText, RefreshCw } from "lucide-react";
import { getClinicalHandoffs, updateClinicalHandoffStatus, type ClinicalHandoff, type HandoffDestination } from "@/app/actions/clinical-handoffs";

export default function ClinicalHandoffInbox({ destination }: { destination: HandoffDestination }) {
  const router = useRouter();
  const [requests, setRequests] = useState<ClinicalHandoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const response = await getClinicalHandoffs(destination);
    if (response.success) setRequests(response.requests);
    else setError(response.message ?? "Unable to load requests.");
    setLoading(false);
  }, [destination]);

  useEffect(() => { void load(); }, [load]);

  const update = async (item: ClinicalHandoff, status: "acknowledged" | "completed") => {
    setBusyId(item.id);
    setMessage("");
    setError("");
    const response = await updateClinicalHandoffStatus({ id: item.id, destination, status });
    if (!response.success) setError(response.message);
    else {
      setMessage(response.message);
      await load();
    }
    setBusyId("");
  };

  const title = destination === "CASHIER" ? "Doctor requests for billing" : "Doctor requests for Reception";
  const Icon = destination === "CASHIER" ? ReceiptText : CalendarDays;

  return (
    <section className="mb-6 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-2 text-amber-700"><Icon className="h-5 w-5" /></div>
          <div><h2 className="font-semibold text-gray-900">{title}</h2><p className="text-xs text-gray-500">Requests sent from the Doctor&apos;s module</p></div>
          {requests.length > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{requests.length} pending</span>}
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>
      </div>
      {(message || error) && <p className={`mb-3 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{error || message}</p>}
      {loading ? <div className="flex items-center gap-2 py-6 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading requests...</div> :
        requests.length === 0 && !error ? <p className="rounded-xl border border-dashed p-5 text-sm text-gray-500">No pending doctor requests.</p> :
        <div className="space-y-3">{requests.map((item) => (
          <article key={item.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="mt-1 text-sm text-gray-700">{item.patientName} <span className="text-gray-400">·</span> {item.patientCode}</p>
                <p className="mt-1 text-xs text-gray-500">{item.handoffType.replace(/_/g, " ")} · Received {new Date(item.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "acknowledged" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{item.status}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{item.details}</p>
            {item.targetDate && <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-purple-700"><CalendarDays className="h-4 w-4" /> Follow-up target: {item.targetDate}{item.preferredTime ? ` at ${item.preferredTime}` : " · time to be agreed with patient"}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {destination === "CASHIER" ?
                <button type="button" onClick={() => router.push(`/billing?patientCode=${encodeURIComponent(item.patientCode)}`)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><ReceiptText className="h-4 w-4" /> Open billing</button> :
                item.handoffType === "FOLLOW_UP" ?
                  <button type="button" onClick={() => router.push("/appointments")} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><CalendarDays className="h-4 w-4" /> Open appointments</button> :
                  <span className="self-center text-xs text-gray-500">Use the procedure registration form to schedule this request.</span>}
              {item.status === "pending" && <button type="button" onClick={() => void update(item, "acknowledged")} disabled={busyId === item.id} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"><Clock3 className="h-4 w-4" /> Acknowledge</button>}
              <button type="button" onClick={() => void update(item, "completed")} disabled={busyId === item.id} className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50">{busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark handled</button>
            </div>
          </article>
        ))}</div>}
    </section>
  );
}
