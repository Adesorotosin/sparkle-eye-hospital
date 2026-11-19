"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, HeartPulse, Loader2, Pill, TestTube2, UserRound } from "lucide-react";
import type { PatientRecord } from "@/types/hospital";

const money = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(Number(value || 0));
const dateLabel = (value?: string) => value ? new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function ReceptionEhrPage() {
  const params = useParams<{ code: string }>();
  const patientCode = decodeURIComponent(String(params.code || ""));
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/patients/${encodeURIComponent(patientCode)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load the patient EHR.");
        if (active) setPatient(data.patient as PatientRecord);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load the patient EHR.");
      } finally {
        if (active) setLoading(false);
      }
    }
    if (patientCode) void load();
    return () => { active = false; };
  }, [patientCode]);

  if (loading) return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto flex max-w-6xl justify-center py-24 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading patient EHR…</div></main>;
  if (!patient) return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 text-center"><p className="text-sm text-rose-700">{error || "Patient record not found."}</p><Link href="/receptionist" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><ArrowLeft className="h-4 w-4" /> Back to Reception</Link></div></main>;

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5">
          <div className="flex items-center gap-3"><Link href="/receptionist" aria-label="Back to Reception" className="rounded-xl border p-2 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></Link><div><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Reception · Electronic health record</p><h1 className="text-xl font-extrabold">{patient.fullName}</h1><p className="text-xs text-slate-500">{patient.patientId} · {patient.age ?? "—"} years · {patient.gender || "—"}</p></div></div>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">Read-only chart</span>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-sm font-bold"><UserRound className="h-4 w-4 text-blue-600" /> Patient details</div><dl className="mt-4 space-y-2 text-sm"><div><dt className="text-xs text-slate-500">Patient code</dt><dd className="font-semibold">{patient.patientId}</dd></div><div><dt className="text-xs text-slate-500">Coverage</dt><dd>{patient.coveragePlan || "Self-Pay"}</dd></div><div><dt className="text-xs text-slate-500">Phone</dt><dd>{patient.phone || "—"}</dd></div><div><dt className="text-xs text-slate-500">Age / gender</dt><dd>{patient.age ?? "—"} / {patient.gender || "—"}</dd></div></dl></article>
          <article className="rounded-2xl border bg-white p-5 md:col-span-2"><div className="flex items-center gap-2 text-sm font-bold"><HeartPulse className="h-4 w-4 text-rose-600" /> Allergies and latest vitals</div>{patient.allergies ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><strong>Allergies:</strong> {patient.allergies}</p> : <p className="mt-3 text-sm text-slate-500">No allergy information recorded.</p>}{patient.vitals ? <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Blood pressure", patient.vitals.bpSystolic != null ? `${patient.vitals.bpSystolic}/${patient.vitals.bpDiastolic ?? "—"}` : "—"],["Pulse", patient.vitals.pulse ?? "—"],["Temperature", patient.vitals.temperature ?? "—"],["SpO₂", patient.vitals.spo2 ?? "—"],["IOP right", patient.vitals.iopOD ?? "—"],["IOP left", patient.vitals.iopOS ?? "—"],["Visual acuity OD", patient.vitals.visualAcuityOD],["Visual acuity OS", patient.vitals.visualAcuityOS]].map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{value || "—"}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No triage vitals recorded.</p>}</article>
        </section>

        <section className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 font-bold"><CalendarDays className="h-4 w-4 text-blue-600" /> Clinical encounter history</div>{patient.encounters?.length ? <div className="mt-4 space-y-3">{patient.encounters.map((encounter,index)=><article key={encounter.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">Visit {patient.encounters!.length-index}</p><p className="text-xs text-slate-500">{dateLabel(encounter.createdAt)}</p></div><div className="mt-3 grid gap-3 md:grid-cols-2"><div><p className="text-xs font-semibold text-slate-500">Presenting complaint / history</p><p className="mt-1 whitespace-pre-wrap text-sm">{encounter.presentingComplaint || encounter.historyOfPresentingComplaint || "Not recorded"}</p></div><div><p className="text-xs font-semibold text-slate-500">Past medical history</p><p className="mt-1 whitespace-pre-wrap text-sm">{encounter.pastMedicalHistory || "Not recorded"}</p></div><div><p className="text-xs font-semibold text-slate-500">Past ocular history</p><p className="mt-1 whitespace-pre-wrap text-sm">{encounter.pastOcularHistory || "Not recorded"}</p></div><div><p className="text-xs font-semibold text-slate-500">Family ocular history</p><p className="mt-1 whitespace-pre-wrap text-sm">{encounter.familyOcularHistory || "Not recorded"}</p></div><div><p className="text-xs font-semibold text-slate-500">Diagnosis</p><p className="mt-1 whitespace-pre-wrap text-sm">{encounter.diagnosis || "Not recorded"}</p></div><div className="md:col-span-2"><p className="text-xs font-semibold text-slate-500">Treatment plan</p><p className="mt-1 whitespace-pre-wrap text-sm">{encounter.treatmentPlan || "Not recorded"}</p></div></div><span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold capitalize">{encounter.status}</span></article>)}</div> : <p className="mt-3 text-sm text-slate-500">No consultation encounters recorded.</p>}</section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 font-bold"><TestTube2 className="h-4 w-4 text-violet-600" /> Diagnostic and laboratory history</div><div className="mt-4 space-y-3">{patient.diagnostics.map(item=><div key={item.id} className="flex justify-between gap-3 border-b pb-2 text-sm"><span>{item.name}</span><span className="text-xs text-slate-500">{item.status}</span></div>)}{patient.laboratoryResults.map(item=><div key={item.id} className="flex justify-between gap-3 border-b pb-2 text-sm"><span>{item.testName}</span><span className="text-xs text-slate-500">{item.status}</span></div>)}{!patient.diagnostics.length&&!patient.laboratoryResults.length&&<p className="text-sm text-slate-500">No diagnostic or laboratory records.</p>}</div></article>
          <article className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 font-bold"><Pill className="h-4 w-4 text-emerald-600" /> Prescription history</div><div className="mt-4 space-y-3">{patient.prescriptions.map(item=><div key={item.id} className="flex justify-between gap-3 border-b pb-2 text-sm"><div><p className="font-semibold">{item.drugName}</p><p className="text-xs text-slate-500">{item.dosage} · Qty {item.quantity}</p></div><span className="text-xs capitalize text-slate-500">{item.status.replace(/_/g," ")}</span></div>)}{!patient.prescriptions.length&&<p className="text-sm text-slate-500">No prescriptions recorded.</p>}</div></article>
        </section>

        <section className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 font-bold"><FileText className="h-4 w-4 text-blue-600" /> Current billing summary</div>{patient.invoice ? <div className="mt-3 flex flex-wrap justify-between gap-3 text-sm"><div><p className="font-semibold">{patient.invoice.invoiceNo}</p><p className="text-xs capitalize text-slate-500">{patient.invoice.status}</p></div><p className="text-lg font-extrabold">{money(patient.invoice.grandTotal)}</p></div> : <p className="mt-3 text-sm text-slate-500">No active invoice.</p>}</section>
        <p className="text-xs text-slate-500">This Reception EHR view is read-only. Clinical documentation and treatment decisions remain within authorized clinical modules.</p>
      </div>
    </main>
  );
}
