"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Glasses, Loader2, RefreshCw, Save } from "lucide-react";
import {
  getOpticianQueue,
  markOpticalOrderCollected,
  markOpticalOrderReady,
  saveOpticalOrder,
  submitOpticalChargeForApproval,
  type OpticalOrder,
} from "@/app/actions/optician";

type ProductionForm = {
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

function formFromOrder(order: OpticalOrder): ProductionForm {
  return {
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
    opticalCharge: order.opticalCharge ? String(order.opticalCharge) : "",
  };
}

function rxValue(refraction: Record<string, unknown> | null, key: string) {
  if (!refraction) return "—";
  const subjective = refraction.subjective && typeof refraction.subjective === "object" ? refraction.subjective as Record<string, unknown> : null;
  const objective = refraction.objective && typeof refraction.objective === "object" ? refraction.objective as Record<string, unknown> : null;
  const hasValues = (values: Record<string, unknown> | null) => Boolean(values && Object.values(values).some(value => value !== null && value !== undefined && String(value).trim() !== ""));
  const values = hasValues(subjective) ? subjective : hasValues(objective) ? objective : refraction;
  const value = values[key];
  return value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
}

function stageLabel(status: OpticalOrder["status"]) {
  if (status === "referred") return "Awaiting Inventory";
  if (status === "measurements") return "Sent to optical lab";
  if (status === "ready_for_dispense") return "Glasses fixed — ready for collection";
  return "Collected";
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

export default function InventoryOpticalPage() {
  const [orders, setOrders] = useState<OpticalOrder[]>([]);
  const [forms, setForms] = useState<Record<string, ProductionForm>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getOpticianQueue();
      if (!result.success) throw new Error(result.message || "Unable to load optical production orders.");
      setOrders(result.orders ?? []);
      setForms(previous => {
        const next = { ...previous };
        for (const order of result.orders ?? []) if (!next[order.id]) next[order.id] = formFromOrder(order);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load optical production orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  function updateForm(orderId: string, field: keyof ProductionForm, value: string) {
    setForms(previous => ({
      ...previous,
      [orderId]: { ...(previous[orderId] ?? { frameSelection: "", lensType: "", lensMaterial: "", lensCoating: "", pdBinocular: "", pdOD: "", pdOS: "", segmentHeightOD: "", segmentHeightOS: "", dispensingNotes: "", opticalCharge: "" }), [field]: value },
    }));
  }

  async function saveProduction(order: OpticalOrder) {
    const form = forms[order.id] ?? formFromOrder(order);
    if (!form.frameSelection.trim() || !form.lensType.trim()) {
      setError("Enter the frame selected by the patient and the required lens type before sending the order to the optical lab.");
      return;
    }
    setSavingId(order.id);
    setError("");
    setNotice("");
    try {
      const result = await saveOpticalOrder({ orderId: order.id, ...form });
      if (!result.success) throw new Error(result.message);
      setNotice(`Saved production details for ${order.patientName}. The order is now routed to the optical lab.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save optical production details.");
    } finally {
      setSavingId("");
    }
  }

  async function submitCharge(order: OpticalOrder) {
    setActionId(order.id);
    setError("");
    setNotice("");
    try {
      const result = await submitOpticalChargeForApproval(order.id);
      if (!result.success) throw new Error(result.message);
      setNotice(result.message);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit the optical charge for approval.");
    } finally {
      setActionId("");
    }
  }

  async function markReady(order: OpticalOrder) {
    setActionId(order.id);
    setError("");
    setNotice("");
    try {
      const result = await markOpticalOrderReady(order.id);
      if (!result.success) throw new Error(result.message);
      setNotice(result.message);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to mark glasses ready.");
    } finally {
      setActionId("");
    }
  }

  async function markCollected(order: OpticalOrder) {
    setActionId(order.id);
    setError("");
    setNotice("");
    try {
      const result = await markOpticalOrderCollected(order.id);
      if (!result.success) throw new Error(result.message);
      setNotice(result.message || "Glasses marked as collected.");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to mark glasses collected.");
    } finally {
      setActionId("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><Link href="/inventory" className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50" aria-label="Back to inventory"><ArrowLeft className="h-4 w-4" /></Link><span className="rounded-xl bg-violet-100 p-3 text-violet-700"><Glasses className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-violet-700">Inventory module</p><h1 className="text-xl font-extrabold">Glasses production & collection</h1><p className="text-xs text-slate-500">Manage frames, lens orders, optical lab status, fitting and collection.</p></div></div><button onClick={() => void loadOrders()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><RefreshCw className="h-4 w-4" /> Refresh</button></div></header>
      <main className="mx-auto max-w-7xl space-y-5 px-5 py-8 sm:px-8">
        <section className="grid gap-3 sm:grid-cols-4">{[{label:"Awaiting Inventory",count:orders.filter(o=>o.status==="referred").length},{label:"Sent to optical lab",count:orders.filter(o=>o.status==="measurements").length},{label:"Ready for collection",count:orders.filter(o=>o.status==="ready_for_dispense").length},{label:"Collected",count:orders.filter(o=>o.status==="collected").length}].map(item=><div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-extrabold">{item.count}</p></div>)}</section>
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
        {loading ? <div className="flex justify-center rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading optical orders…</div> : orders.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><Glasses className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 font-extrabold">No glasses requests yet</h2><p className="mt-1 text-sm text-slate-500">Optical orders sent by the doctor will appear here.</p></div> : <div className="space-y-5">{orders.map(order=>{const form=forms[order.id] ?? formFromOrder(order); return <section key={order.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-lg font-extrabold">{order.patientName}</h2><p className="mt-1 text-xs text-slate-500">{order.patientCode}{order.age !== null ? ` · ${order.age} years` : ""}{order.gender ? ` · ${order.gender}` : ""}</p><p className="mt-2 inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800"><span className="h-2 w-2 rounded-full bg-violet-600" />{stageLabel(order.status)}</p></div><div className="text-right"><p className="text-xs text-slate-500">Optical charge</p><p className="font-extrabold">{order.opticalCharge ? `₦${order.opticalCharge.toLocaleString("en-NG")}` : "Not set"}</p><p className="mt-1 text-[11px] text-slate-500">Charge approval: {order.chargeApprovalStatus.replace(/_/g," ")}</p></div></div>
          <div className="grid gap-5 p-5 lg:grid-cols-[0.8fr_1.2fr]"><div><h3 className="mb-3 font-extrabold">Doctor's prescription</h3><div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[320px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-2.5">Eye</th><th className="p-2.5">SPH</th><th className="p-2.5">CYL</th><th className="p-2.5">Axis</th><th className="p-2.5">ADD</th><th className="p-2.5">VA</th></tr></thead><tbody><tr className="border-t"><td className="p-2.5 font-bold">R</td><td className="p-2.5">{rxValue(order.refractionOD, "sphere")}</td><td className="p-2.5">{rxValue(order.refractionOD, "cylinder")}</td><td className="p-2.5">{rxValue(order.refractionOD, "axis")}</td><td className="p-2.5">{rxValue(order.refractionOD, "add")}</td><td className="p-2.5">{order.visualAcuityOD || "—"}</td></tr><tr className="border-t"><td className="p-2.5 font-bold">L</td><td className="p-2.5">{rxValue(order.refractionOS, "sphere")}</td><td className="p-2.5">{rxValue(order.refractionOS, "cylinder")}</td><td className="p-2.5">{rxValue(order.refractionOS, "axis")}</td><td className="p-2.5">{rxValue(order.refractionOS, "add")}</td><td className="p-2.5">{order.visualAcuityOS || "—"}</td></tr></tbody></table></div></div>
          <div><h3 className="mb-3 font-extrabold">Inventory and optical lab tracking</h3><div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">Frame chosen by patient<input value={form.frameSelection} onChange={e=>updateForm(order.id,"frameSelection",e.target.value)} className={inputClass} placeholder="Frame style / SKU" /></label>
            <label className="text-xs font-bold text-slate-600">Lens type from prescription<input value={form.lensType} onChange={e=>updateForm(order.id,"lensType",e.target.value)} className={inputClass} placeholder="Single vision, bifocal, progressive…" /></label>
            <label className="text-xs font-bold text-slate-600">Lens material<input value={form.lensMaterial} onChange={e=>updateForm(order.id,"lensMaterial",e.target.value)} className={inputClass} /></label>
            <label className="text-xs font-bold text-slate-600">Lens finish / coating<input value={form.lensCoating} onChange={e=>updateForm(order.id,"lensCoating",e.target.value)} className={inputClass} placeholder="White, photochromic, blue coated…" /></label>
            <label className="text-xs font-bold text-slate-600">Distance IPD (binocular)<input value={form.pdBinocular} onChange={e=>updateForm(order.id,"pdBinocular",e.target.value)} className={inputClass} /></label>
            <label className="text-xs font-bold text-slate-600">Monocular IPD (R / L)<span className="mt-1 grid grid-cols-2 gap-2"><input aria-label="Right monocular IPD" value={form.pdOD} onChange={e=>updateForm(order.id,"pdOD",e.target.value)} className={inputClass} placeholder="R" /><input aria-label="Left monocular IPD" value={form.pdOS} onChange={e=>updateForm(order.id,"pdOS",e.target.value)} className={inputClass} placeholder="L" /></span></label>
            <label className="text-xs font-bold text-slate-600">Segment height (R / L)<span className="mt-1 grid grid-cols-2 gap-2"><input aria-label="Right segment height" value={form.segmentHeightOD} onChange={e=>updateForm(order.id,"segmentHeightOD",e.target.value)} className={inputClass} placeholder="R" /><input aria-label="Left segment height" value={form.segmentHeightOS} onChange={e=>updateForm(order.id,"segmentHeightOS",e.target.value)} className={inputClass} placeholder="L" /></span></label>
            <label className="text-xs font-bold text-slate-600">Total optical charge (₦)<input type="number" min="0" step="0.01" value={form.opticalCharge} onChange={e=>updateForm(order.id,"opticalCharge",e.target.value)} className={inputClass} placeholder="Enter approved price" /></label>
            <label className="text-xs font-bold text-slate-600 sm:col-span-2">Optical lab / fitting notes<textarea rows={2} value={form.dispensingNotes} onChange={e=>updateForm(order.id,"dispensingNotes",e.target.value)} className={inputClass} placeholder="Lens fitting, lab instructions, collection notes…" /></label>
          </div><div className="mt-4 flex flex-wrap gap-2"><button disabled={savingId===order.id} onClick={()=>void saveProduction(order)} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{savingId===order.id?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>} Save details & send to lab</button>{order.status==="measurements" && order.chargeApprovalStatus!=="approved" && order.chargeApprovalStatus!=="pending" && order.opticalCharge>0 && <button disabled={actionId===order.id} onClick={()=>void submitCharge(order)} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-extrabold text-amber-900 disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/> Submit charge for doctor approval</button>}{order.status==="measurements" && order.chargeApprovalStatus==="approved" && order.opticalCharge>0 && <button disabled={actionId===order.id} onClick={()=>void markReady(order)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-extrabold text-emerald-800 disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/> Mark glasses fixed / ready</button>}{order.status==="ready_for_dispense" && <button disabled={actionId===order.id} onClick={()=>void markCollected(order)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/> Mark glasses collected</button>}</div><p className="mt-3 text-[11px] leading-5 text-slate-500">Marking glasses ready uses the existing billing safeguards. Collection is blocked until the linked invoice is paid.</p></div></div></section>})}</div>}
      </main>
    </div>
  );
}
