"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Glasses, Loader2, RefreshCw } from "lucide-react";
import { getOpticianPatient } from "@/app/actions/optician";

type PatientRecord = NonNullable<Awaited<ReturnType<typeof getOpticianPatient>>["patient"]>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function display(value: unknown) {
  return value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
}
function prescriptionValues(value: unknown) {
  const refraction = record(value);
  if (!refraction) return { sphere: "—", cylinder: "—", axis: "—", add: "—", nearVA: "—" };
  const subjective = record(refraction.subjective);
  const objective = record(refraction.objective);
  const values = subjective && Object.values(subjective).some(v => v !== null && v !== undefined && String(v).trim() !== "")
    ? subjective
    : objective && Object.values(objective).some(v => v !== null && v !== undefined && String(v).trim() !== "")
      ? objective
      : refraction;
  return {
    sphere: display(values.sphere),
    cylinder: display(values.cylinder),
    axis: display(values.axis),
    add: display(values.add),
    nearVA: display(values.nearVA ?? values.near_va ?? refraction.nearVA ?? refraction.near_va),
  };
}

export default function OpticianPatientPage() {
  const params = useParams<{ patientCode: string }>();
  const patientCode = decodeURIComponent(params.patientCode ?? "");
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPrescription() {
    setLoading(true);
    setError("");
    try {
      const result = await getOpticianPatient(patientCode);
      if (!result.success || !result.patient) throw new Error(result.message || "No spectacle prescription is available.");
      setPatient(result.patient);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load the spectacle prescription.");
      setPatient(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (patientCode) void loadPrescription(); }, [patientCode]);

  const od = prescriptionValues(patient?.optometry.refractionOD);
  const os = prescriptionValues(patient?.optometry.refractionOS);
  const order = patient?.opticalOrder;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/optician" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-violet-700"><ArrowLeft className="h-4 w-4" /> Back to prescriptions</Link>
          <button onClick={() => void loadPrescription()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"><RefreshCw className="h-4 w-4" /> Refresh</button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-8">
        {loading ? <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading spectacle prescription…</div> : error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">{error}</div> : patient ? <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-4"><span className="rounded-xl bg-violet-100 p-3 text-violet-700"><Glasses className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-violet-700">Spectacle prescription</p><h1 className="mt-1 text-2xl font-extrabold">{patient.fullName}</h1><p className="mt-2 text-sm text-slate-500">{patient.patientCode}{patient.age !== null ? ` · ${patient.age} years` : ""}{patient.gender ? ` · ${patient.gender}` : ""}{patient.phone ? ` · ${patient.phone}` : ""}</p></div></div>
            <p className="mt-5 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">This workspace is read-only. Frame selection, lens production, fitting, readiness and collection are managed by the Inventory module.</p>
          </section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold">Spectacle prescription</h2><p className="mt-1 text-xs text-slate-500">Values from the latest completed Optometry assessment.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="bg-slate-50 text-xs text-slate-500"><th className="px-5 py-3">Eye</th><th className="px-4 py-3">SPH</th><th className="px-4 py-3">CYL</th><th className="px-4 py-3">Axis</th><th className="px-4 py-3">ADD</th><th className="px-4 py-3">Final VA</th><th className="px-4 py-3">Near VA</th></tr></thead><tbody className="divide-y divide-slate-100"><tr><td className="px-5 py-4 font-bold">R (OD)</td><td className="px-4 py-4">{od.sphere}</td><td className="px-4 py-4">{od.cylinder}</td><td className="px-4 py-4">{od.axis}</td><td className="px-4 py-4">{od.add}</td><td className="px-4 py-4">{display(patient.optometry.visualAcuityOD)}</td><td className="px-4 py-4">{od.nearVA}</td></tr><tr><td className="px-5 py-4 font-bold">L (OS)</td><td className="px-4 py-4">{os.sphere}</td><td className="px-4 py-4">{os.cylinder}</td><td className="px-4 py-4">{os.axis}</td><td className="px-4 py-4">{os.add}</td><td className="px-4 py-4">{display(patient.optometry.visualAcuityOS)}</td><td className="px-4 py-4">{os.nearVA}</td></tr></tbody></table></div>
            <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <div><p className="text-xs font-bold text-slate-500">Lens type</p><p className="mt-1 font-semibold">{display(order?.lensType)}</p></div>
              <div><p className="text-xs font-bold text-slate-500">Lens finish / coating</p><p className="mt-1 font-semibold">{display(order?.lensCoating)}</p></div>
              <div><p className="text-xs font-bold text-slate-500">Lens material</p><p className="mt-1 font-semibold">{display(order?.lensMaterial)}</p></div>
              <div><p className="text-xs font-bold text-slate-500">Distance IPD (binocular)</p><p className="mt-1 font-semibold">{display(order?.pdBinocular)}</p></div>
              <div><p className="text-xs font-bold text-slate-500">Monocular IPD (R / L)</p><p className="mt-1 font-semibold">{display(order?.pdOD)} / {display(order?.pdOS)}</p></div>
              <div><p className="text-xs font-bold text-slate-500">Segment height (R / L)</p><p className="mt-1 font-semibold">{display(order?.segmentHeightOD)} / {display(order?.segmentHeightOS)}</p></div>
              <div className="sm:col-span-2 lg:col-span-3"><p className="text-xs font-bold text-slate-500">Notes</p><p className="mt-1 whitespace-pre-wrap font-medium">{display(order?.dispensingNotes)}</p></div>
            </div>
          </section>
        </> : null}
      </main>
    </div>
  );
}
