import Link from "next/link";
import { ArrowLeft, Glasses } from "lucide-react";
import { getOpticianPatient } from "@/app/actions/optician";

interface PageProps { params: Promise<{ patientCode: string }> }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function formatRx(value: unknown) {
  const root = asRecord(value);
  if (!root) return "—";
  const subjective = asRecord(root.subjective);
  const objective = asRecord(root.objective);
  const hasValues = (item: Record<string, unknown> | null) => Boolean(item && ["sphere", "cylinder", "axis", "add"].some((key) => item[key] !== null && item[key] !== undefined && String(item[key]).trim() !== ""));
  const rx = hasValues(subjective) ? subjective! : hasValues(objective) ? objective! : root;
  const fields: Array<[string, unknown]> = [
    ["SPH", rx.sphere], ["CYL", rx.cylinder], ["AXIS", rx.axis], ["ADD", rx.add],
  ];
  const parts = fields.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "").map(([label, value]) => `${label} ${String(value)}`);
  return parts.join(" · ") || "—";
}

function Value({ label, value }: { label: string; value?: string | number | null }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 break-words text-sm font-semibold text-slate-900">{value === null || value === undefined || value === "" ? "—" : value}</p></div>;
}

export default async function OpticianPatientPrescriptionPage({ params }: PageProps) {
  const { patientCode } = await params;
  const result = await getOpticianPatient(decodeURIComponent(patientCode));
  const patient = result.success ? result.patient : null;
  if (!patient) {
    return <main className="min-h-screen bg-slate-50 p-6"><div className="mx-auto max-w-xl rounded-2xl border bg-white p-8"><h1 className="text-lg font-bold">Spectacle prescription unavailable</h1><p className="mt-2 text-sm text-slate-600">{result.message || "No completed optometry prescription was found."}</p><Link href="/optician" className="mt-5 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Back to prescriptions</Link></div></main>;
  }
  const rx = patient.optometry;
  const order = patient.opticalOrder;
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-5xl">
    <Link href="/optician" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Back to prescriptions</Link>
    <header className="mb-6 flex items-center gap-4 rounded-2xl border bg-white p-5"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Glasses className="h-6 w-6" /></div><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Sparkle Eye Specialist Hospital</p><h1 className="mt-1 text-xl font-extrabold">Spectacle Prescription</h1><p className="mt-1 text-sm text-slate-500">Patient: {patient.fullName} · {patient.patientCode}</p></div></header>
    <section className="mb-5 rounded-2xl border bg-white p-5"><h2 className="mb-4 font-bold">Patient details</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Value label="Name" value={patient.fullName}/><Value label="Patient code" value={patient.patientCode}/><Value label="Age" value={patient.age}/><Value label="Date" value={rx?.createdAt ? new Date(rx.createdAt).toLocaleDateString("en-NG") : null}/></div></section>
    <section className="mb-5 overflow-hidden rounded-2xl border bg-white"><div className="border-b p-5"><h2 className="font-bold">Refraction measurements</h2><p className="mt-1 text-sm text-slate-500">Values shown from the completed optometry assessment. This screen is read-only.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Eye</th><th className="p-4">SPH / CYL / Axis / ADD</th><th className="p-4">Final visual acuity</th></tr></thead><tbody className="divide-y"><tr><th className="p-4">R (OD)</th><td className="p-4">{formatRx(rx?.refractionOD)}</td><td className="p-4">{rx?.visualAcuityOD || "—"}</td></tr><tr><th className="p-4">L (OS)</th><td className="p-4">{formatRx(rx?.refractionOS)}</td><td className="p-4">{rx?.visualAcuityOS || "—"}</td></tr></tbody></table></div><div className="grid gap-3 border-t p-5 sm:grid-cols-2"><Value label="Both eyes visual acuity" value={rx?.visualAcuityOU}/><Value label="Correction used" value={rx?.withCorrection ? "With correction" : "Not recorded as with correction"}/><Value label="Lens type" value={order?.lensType}/><Value label="Lens material" value={order?.lensMaterial}/><Value label="Lens finish / coating" value={order?.lensCoating}/><Value label="Distance IPD / binocular" value={order?.pdBinocular}/><Value label="Monocular IPD — right" value={order?.pdOD}/><Value label="Monocular IPD — left" value={order?.pdOS}/><Value label="Segment height — right" value={order?.segmentHeightOD}/><Value label="Segment height — left" value={order?.segmentHeightOS}/></div><div className="border-t p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Clinical / dispensing notes</p><p className="mt-2 whitespace-pre-wrap text-sm">{order?.dispensingNotes || "—"}</p></div></section>
    <p className="text-xs text-slate-500">Frame selection, lens processing, preparation, and collection are handled by the Inventory module. Prescriber and signature fields are intentionally omitted from this view.</p>
  </div></main>;
}
