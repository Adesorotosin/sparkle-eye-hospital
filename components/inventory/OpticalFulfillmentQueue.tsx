"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { CheckCircle2, Glasses, LoaderCircle, PackageCheck, RefreshCw, Save } from "lucide-react";
import {
  getOpticianQueue,
  saveOpticalOrder,
  submitOpticalChargeForApproval,
  markOpticalOrderReady,
  markOpticalOrderCollected,
  type OpticalOrder,
} from "@/app/actions/optician";

type Draft = {
  frameSelection: string;
  lensType: string;
  lensMaterial: string;
  lensCoating: string;
  pdBinocular: string;
  pdOD: string;
  pdOS: string;
  segmentHeightOD: string;
  segmentHeightOS: string;
  dispensingNotes: string;
  opticalCharge: string;
};

const toDraft = (order: OpticalOrder): Draft => ({
  frameSelection: order.frameSelection || "",
  lensType: order.lensType || "",
  lensMaterial: order.lensMaterial || "",
  lensCoating: order.lensCoating || "",
  pdBinocular: order.pdBinocular || "",
  pdOD: order.pdOD || "",
  pdOS: order.pdOS || "",
  segmentHeightOD: order.segmentHeightOD || "",
  segmentHeightOS: order.segmentHeightOS || "",
  dispensingNotes: order.dispensingNotes || "",
  opticalCharge: order.opticalCharge > 0 ? String(order.opticalCharge) : "",
});

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
const labelClass = "block text-xs font-bold text-slate-600";

export default function OpticalFulfillmentQueue() {
  const [orders, setOrders] = useState<OpticalOrder[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getOpticianQueue();
    if (!result.success) {
      setError(result.message || "Unable to load optical orders.");
    } else {
      setOrders(result.orders);
      setDrafts((current) => {
        const next = { ...current };
        for (const order of result.orders) next[order.id] = { ...toDraft(order), ...current[order.id] };
        return next;
      });
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  const edit = (id: string, field: keyof Draft, value: string) => {
    setDrafts((current) => ({ ...current, [id]: { ...toDraft(orders.find((order) => order.id === id)!), ...current[id], [field]: value } }));
  };

  const runAction = (action: () => Promise<{ success: boolean; message: string }>) => {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await action();
      if (!result.success) setError(result.message);
      else {
        setMessage(result.message);
        await load();
      }
    });
  };

  const save = (order: OpticalOrder) => {
    const draft = drafts[order.id] ?? toDraft(order);
    runAction(() => saveOpticalOrder({
      orderId: order.id,
      frameSelection: draft.frameSelection,
      lensType: draft.lensType,
      lensMaterial: draft.lensMaterial,
      lensCoating: draft.lensCoating,
      pdBinocular: draft.pdBinocular,
      pdOD: draft.pdOD,
      pdOS: draft.pdOS,
      segmentHeightOD: draft.segmentHeightOD,
      segmentHeightOS: draft.segmentHeightOS,
      dispensingNotes: draft.dispensingNotes,
      ...(draft.opticalCharge.trim() ? { opticalCharge: Number(draft.opticalCharge) } : {}),
    }));
  };

  const statusLabel = (status: OpticalOrder["status"]) => ({
    referred: "Awaiting inventory preparation",
    measurements: "Glasses being prepared",
    ready_for_dispense: "Glasses fixed — ready for collection",
    collected: "Collected",
  } as const)[status];

  return <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 bg-violet-50/60 p-5">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-white p-2 text-violet-700"><Glasses className="h-5 w-5"/></span><div><h2 className="font-extrabold text-slate-950">Optical inventory & glasses workflow</h2><p className="mt-1 text-xs text-slate-600">Record the patient&apos;s chosen frame, prescribed lens type, preparation status and collection. Managed by Inventory.</p></div></div>
      <button type="button" onClick={() => void load()} disabled={loading || pending} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}/>Refresh</button>
    </div>
    {error && <p role="alert" className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {message && <p role="status" className="mx-5 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {loading ? <div className="p-10 text-center text-sm text-slate-500"><LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin"/>Loading optical requests…</div> : orders.length === 0 ? <div className="p-10 text-center"><Glasses className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-2 font-semibold">No optical requests</p><p className="mt-1 text-sm text-slate-500">Doctor-approved spectacle requests will appear here.</p></div> : <div className="divide-y divide-slate-100">{orders.map((order) => {
      const draft = drafts[order.id] ?? toDraft(order);
      return <article key={order.id} className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-extrabold">{order.patientName}</h3><p className="mt-1 font-mono text-xs text-slate-500">{order.patientCode}</p><p className="mt-2 text-xs text-slate-600">Prescribed lens: <strong>{order.lensType || "Not specified"}</strong></p></div><span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700">{statusLabel(order.status)}</span></div>
        {order.status !== "collected" && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className={labelClass}>Frame chosen by patient<input className={inputClass+" mt-1"} value={draft.frameSelection} onChange={(e) => edit(order.id,"frameSelection",e.target.value)} placeholder="Frame style / SKU / colour"/></label>
          <label className={labelClass}>Lens type<input className={inputClass+" mt-1"} value={draft.lensType} onChange={(e) => edit(order.id,"lensType",e.target.value)} placeholder="Single vision, bifocal, progressive…"/></label>
          <label className={labelClass}>Lens material<input className={inputClass+" mt-1"} value={draft.lensMaterial} onChange={(e) => edit(order.id,"lensMaterial",e.target.value)} placeholder="Lens material"/></label>
          <label className={labelClass}>Lens finish / coating<input className={inputClass+" mt-1"} value={draft.lensCoating} onChange={(e) => edit(order.id,"lensCoating",e.target.value)} placeholder="White, photochromic, blue coated…"/></label>
          <label className={labelClass}>Distance IPD — binocular (mm)<input className={inputClass+" mt-1"} value={draft.pdBinocular} onChange={(e) => edit(order.id,"pdBinocular",e.target.value)} placeholder="Distance IPD"/></label>
          <label className={labelClass}>Monocular IPD — R / L (mm)<div className="mt-1 grid grid-cols-2 gap-2"><input aria-label="Right monocular IPD" className={inputClass} value={draft.pdOD} onChange={(e) => edit(order.id,"pdOD",e.target.value)} placeholder="Right"/><input aria-label="Left monocular IPD" className={inputClass} value={draft.pdOS} onChange={(e) => edit(order.id,"pdOS",e.target.value)} placeholder="Left"/></div></label>
          <label className={labelClass}>Segment height — R / L (mm)<div className="mt-1 grid grid-cols-2 gap-2"><input aria-label="Right segment height" className={inputClass} value={draft.segmentHeightOD} onChange={(e) => edit(order.id,"segmentHeightOD",e.target.value)} placeholder="Right"/><input aria-label="Left segment height" className={inputClass} value={draft.segmentHeightOS} onChange={(e) => edit(order.id,"segmentHeightOS",e.target.value)} placeholder="Left"/></div></label>
          <label className={labelClass}>Optical charge (₦)<input type="number" min="0" step="0.01" className={inputClass+" mt-1"} value={draft.opticalCharge} onChange={(e) => edit(order.id,"opticalCharge",e.target.value)} placeholder="Enter approved charge"/></label>
          <label className={labelClass+" sm:col-span-2 lg:col-span-3"}>Preparation notes<textarea rows={2} className={inputClass+" mt-1"} value={draft.dispensingNotes} onChange={(e) => edit(order.id,"dispensingNotes",e.target.value)} placeholder="Frame SKU, lens instructions, lab notes, promised collection date…"/></label>
        </div>}
        <div className="flex flex-wrap gap-2">
          {order.status !== "collected" && order.status !== "ready_for_dispense" && <button type="button" disabled={pending} onClick={() => save(order)} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-3 py-2 text-xs font-bold text-white hover:bg-violet-800 disabled:opacity-50"><Save className="h-4 w-4"/>{order.status === "referred" ? "Save details & send to optical lab" : "Save frame & lens details"}</button>}
          {order.status === "measurements" && <button type="button" disabled={pending} onClick={() => runAction(() => submitOpticalChargeForApproval(order.id))} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50">Send charge for doctor approval</button>}
          {order.status === "measurements" && <button type="button" disabled={pending} onClick={() => runAction(() => markOpticalOrderReady(order.id))} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50"><PackageCheck className="h-4 w-4"/>Mark glasses fixed</button>}
          {order.status === "ready_for_dispense" && <button type="button" disabled={pending} onClick={() => runAction(() => markOpticalOrderCollected(order.id))} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/>Mark glasses collected</button>}
          {order.status === "collected" && <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4"/>Collection recorded</span>}
        </div>
        {order.status === "ready_for_dispense" && <p className="text-xs text-slate-500">Collection is only recorded after the linked invoice is paid.</p>}
      </article>;
    })}</div>}
  </section>;
}
