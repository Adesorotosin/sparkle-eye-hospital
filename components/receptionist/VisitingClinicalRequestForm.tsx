"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ClipboardPlus, Glasses, Pill, TestTube2, UserRoundPlus } from "lucide-react";
import { createExternalDiagnosticOrder } from "@/app/actions/clinical-orders";
import { createVisitingLabOrder } from "@/app/actions/lab-orders";
import { registerVisitingOptometryPatient } from "@/app/actions/optometry";
import { getProcedurePriceCatalog, registerProcedure } from "@/app/actions/procedures";

type Mode = "investigation" | "laboratory" | "refraction" | "medication" | "procedure";
type ProcedureOption = { code: string; name: string; price: number; active: boolean };
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100";
const label = "block text-xs font-bold text-slate-600";

export default function VisitingClinicalRequestForm() {
  const [mode, setMode] = useState<Mode>("investigation");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [procedures, setProcedures] = useState<ProcedureOption[]>([]);
  const [form, setForm] = useState({
    fullName: "", age: "", gender: "", phone: "", allergies: "", referringCenter: "Self-presenting",
    testName: "", price: "", testCode: "", specimenType: "Blood", priority: "NORMAL",
    visitType: "self_presenting" as "self_presenting" | "external_referral",
    procedureCode: "", scheduledDate: "", notes: "",
  });

  useEffect(() => {
    let active = true;
    void getProcedurePriceCatalog().then((result) => {
      if (active && result.success) {
        const options = (result.procedures ?? []).filter((item) => item.active);
        setProcedures(options);
        setForm((current) => ({ ...current, procedureCode: current.procedureCode || options[0]?.code || "" }));
      }
    });
    return () => { active = false; };
  }, []);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const resetFeedback = () => { setError(""); setMessage(""); setPatientCode(""); };

  async function registerStandardPatient(status: "waiting_triage" | "in_consultation" = "waiting_triage") {
    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName.trim(),
        age: form.age ? Number(form.age) : undefined,
        gender: form.gender || undefined,
        phone: form.phone.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        coveragePlan: "Self-Pay",
        isWalkIn: true,
        status,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.patient?.patientId) throw new Error(data?.error || "Could not register the visiting patient.");
    return String(data.patient.patientId);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    if (!form.fullName.trim()) { setError("Enter the patient's full name."); return; }
    if (form.age && (!Number.isInteger(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 150)) { setError("Age must be a whole number between 0 and 150."); return; }
    setBusy(true);
    try {
      if (mode === "investigation") {
        const result = await createExternalDiagnosticOrder({
          fullName: form.fullName,
          age: form.age ? Number(form.age) : null,
          gender: form.gender,
          phone: form.phone,
          referringCenter: form.referringCenter,
          testName: form.testName,
          price: form.price ? Number(form.price) : 0,
        });
        if (!result.success) throw new Error(result.message);
        setPatientCode(result.patientCode || "");
        setMessage(result.message);
      } else if (mode === "laboratory") {
        const result = await createVisitingLabOrder({
          fullName: form.fullName,
          sourceCenter: form.referringCenter,
          contactPhone: form.phone,
          sex: form.gender,
          testCode: form.testCode,
          testName: form.testName,
          specimenType: form.specimenType,
          priority: form.priority as "NORMAL" | "URGENT" | "STAT",
          clinicalNotes: form.notes,
        });
        if (!result.success) throw new Error(result.message);
        setMessage(result.message);
      } else if (mode === "refraction") {
        const result = await registerVisitingOptometryPatient({
          fullName: form.fullName,
          age: form.age ? Number(form.age) : null,
          gender: form.gender,
          phone: form.phone,
          allergies: form.allergies,
          visitType: form.visitType,
        });
        if (!result.success || !result.patientCode) throw new Error(result.message || "Could not register the refraction request.");
        setPatientCode(result.patientCode);
        setMessage("Visiting patient registered for refraction. The request is available to Optometry; after assessment, the doctor can send the spectacle prescription to Inventory.");
      } else if (mode === "medication") {
        const code = await registerStandardPatient("in_consultation");
        setPatientCode(code);
        setMessage("Visiting patient registered. Open the Pharmacy module to review and process the medication request.");
      } else {
        const code = await registerStandardPatient("in_consultation");
        const result = await registerProcedure({
          patientCode: code,
          procedureCode: form.procedureCode,
          scheduledDate: form.scheduledDate || undefined,
          notes: form.notes,
        });
        if (!result.success) {
          setPatientCode(code);
          throw new Error(`Patient registered with code ${code}, but the procedure request failed: ${result.message} You can retry the procedure from Reception actions.`);
        }
        setPatientCode(code);
        setMessage(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register the visiting request.");
    } finally {
      setBusy(false);
    }
  }

  const modes: { key: Mode; label: string; icon: typeof TestTube2 }[] = [
    { key: "investigation", label: "Investigation", icon: TestTube2 },
    { key: "laboratory", label: "Laboratory", icon: ClipboardPlus },
    { key: "refraction", label: "Refraction / glasses", icon: Glasses },
    { key: "medication", label: "Medication", icon: Pill },
    { key: "procedure", label: "Procedure", icon: UserRoundPlus },
  ];

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-4"><h2 className="font-extrabold text-slate-950">Visiting patients & direct requests</h2><p className="mt-1 text-xs text-slate-500">Register an outside patient for a specific service without requiring the full Reception → Triage → Doctor route. Use the appropriate clinical queue for the actual assessment or procedure.</p></div>
    <div className="mb-5 flex flex-wrap gap-2">{modes.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" onClick={() => { setMode(item.key); resetFeedback(); }} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${mode === item.key ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}><Icon className="h-4 w-4"/>{item.label}</button>; })}</div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {message && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><p>{message}</p>{patientCode && <p className="mt-2 font-bold">Patient code: {patientCode}</p>}{patientCode && mode === "medication" && <Link className="mt-2 inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white" href={`/pharmacy?patientId=${encodeURIComponent(patientCode)}`}>Open in Pharmacy</Link>}{mode === "investigation" && message && <Link className="mt-2 inline-flex rounded-lg border px-3 py-2 text-xs font-bold" href="/diagnostics">Open investigation queue</Link>}{mode === "laboratory" && message && <Link className="mt-2 inline-flex rounded-lg border px-3 py-2 text-xs font-bold" href="/laboratory">Open laboratory queue</Link>}</div>}
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className={label}>Patient full name *<input required className={field+" mt-1"} value={form.fullName} onChange={(e) => update("fullName",e.target.value)} /></label>
      <label className={label}>Age<input type="number" min="0" max="150" className={field+" mt-1"} value={form.age} onChange={(e) => update("age",e.target.value)} /></label>
      <label className={label}>Gender<select className={field+" mt-1"} value={form.gender} onChange={(e) => update("gender",e.target.value)}><option value="">Not specified</option><option>Female</option><option>Male</option><option>Other</option></select></label>
      <label className={label}>Phone<input className={field+" mt-1"} value={form.phone} onChange={(e) => update("phone",e.target.value)} /></label>
      {mode !== "refraction" && mode !== "medication" && <label className={label}>Referring centre / source *<input required className={field+" mt-1"} value={form.referringCenter} onChange={(e) => update("referringCenter",e.target.value)} /></label>}
      {mode === "investigation" && <>
        <label className={label}>Investigation / test name *<input required className={field+" mt-1"} value={form.testName} onChange={(e) => update("testName",e.target.value)} placeholder="e.g. Visual field test"/></label>
        <label className={label}>Price (₦)<input type="number" min="0" step="0.01" className={field+" mt-1"} value={form.price} onChange={(e) => update("price",e.target.value)} placeholder="Leave blank for pricing review"/></label>
      </>}
      {mode === "laboratory" && <>
        <label className={label}>Test code *<input required className={field+" mt-1"} value={form.testCode} onChange={(e) => update("testCode",e.target.value)} /></label>
        <label className={label}>Laboratory test *<input required className={field+" mt-1"} value={form.testName} onChange={(e) => update("testName",e.target.value)} /></label>
        <label className={label}>Specimen type *<input required className={field+" mt-1"} value={form.specimenType} onChange={(e) => update("specimenType",e.target.value)} /></label>
        <label className={label}>Priority<select className={field+" mt-1"} value={form.priority} onChange={(e) => update("priority",e.target.value)}><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option><option value="STAT">STAT</option></select></label>
        <label className={label+" sm:col-span-2"}>Clinical notes<textarea className={field+" mt-1"} rows={2} value={form.notes} onChange={(e) => update("notes",e.target.value)} /></label>
      </>}
      {mode === "refraction" && <>
        <label className={label}>Visit type<select className={field+" mt-1"} value={form.visitType} onChange={(e) => update("visitType",e.target.value)}><option value="self_presenting">Self-presenting</option><option value="external_referral">External referral</option></select></label>
        <label className={label+" sm:col-span-2"}>Allergies / notes<input className={field+" mt-1"} value={form.allergies} onChange={(e) => update("allergies",e.target.value)} placeholder="Optional"/></label>
      </>}
      {mode === "medication" && <label className={label+" sm:col-span-2"}>Allergies (important for medication safety)<input className={field+" mt-1"} value={form.allergies} onChange={(e) => update("allergies",e.target.value)} placeholder="Record known allergies or state unknown"/></label>}
      {mode === "procedure" && <>
        <label className={label}>Procedure *<select required className={field+" mt-1"} value={form.procedureCode} onChange={(e) => update("procedureCode",e.target.value)}>{procedures.map((p) => <option key={p.code} value={p.code}>{p.name} — ₦{p.price.toLocaleString("en-NG")}</option>)}</select></label>
        <label className={label}>Scheduled date<input type="date" className={field+" mt-1"} value={form.scheduledDate} onChange={(e) => update("scheduledDate",e.target.value)} /></label>
        <label className={label+" sm:col-span-2"}>Procedure notes<textarea className={field+" mt-1"} rows={2} value={form.notes} onChange={(e) => update("notes",e.target.value)} /></label>
      </>}
      <div className="flex items-end"><button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50">{busy ? "Registering…" : mode === "investigation" ? "Register & send investigation" : mode === "laboratory" ? "Register & send to Laboratory" : mode === "refraction" ? "Register & send to Optometry" : mode === "medication" ? "Register & open Pharmacy" : "Register & send procedure"}</button></div>
    </form>
    <p className="mt-4 text-[11px] text-slate-500">Outside refraction patients become available to Optometry. A spectacle order is created only after the prescription is completed and sent by the doctor; Inventory then records frame selection, lens processing, fixing and collection.</p>
  </section>;
}
