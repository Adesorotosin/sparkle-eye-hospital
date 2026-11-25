"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Loader2, MapPin, Phone, UserRound } from "lucide-react";

type ReceptionPatientSummary = {
  id: string;
  patientId: string;
  fullName: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  coveragePlan: string | null;
  address: string | null;
  registrationNumber: string | null;
  status: string | null;
  isWalkIn: boolean;
  createdAt: string;
  lastVisitAt: string | null;
};

const dateLabel = (value?: string | null) =>
  value ? new Date(value).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function ReceptionPatientPage() {
  const params = useParams<{ code: string }>();
  const patientCode = decodeURIComponent(String(params.code || ""));
  const [patient, setPatient] = useState<ReceptionPatientSummary | null>(null);
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
        if (!response.ok) throw new Error(data.error || "Unable to load patient information.");
        if (active) setPatient(data.patient as ReceptionPatientSummary);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load patient information.");
      } finally {
        if (active) setLoading(false);
      }
    }
    if (patientCode) void load();
    return () => { active = false; };
  }, [patientCode]);

  if (loading) return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto flex max-w-4xl justify-center py-24 text-sm text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading patient information…</div></main>;

  if (!patient) return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 text-center"><p className="text-sm text-rose-700">{error || "Patient not found."}</p><Link href="/receptionist" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><ArrowLeft className="h-4 w-4" /> Back to Reception</Link></div></main>;

  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <Link href="/receptionist" aria-label="Back to Reception" className="rounded-xl border p-2 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Reception · Patient information</p>
              <h1 className="text-xl font-extrabold">{patient.fullName}</h1>
              <p className="text-xs text-slate-500">{patient.patientId} · {patient.age ?? "—"} years · {patient.gender || "—"}</p>
            </div>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">Reception access</span>
        </header>

        <section className="rounded-2xl border bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-bold"><UserRound className="h-4 w-4 text-blue-600" /> Registration details</div>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-xs text-slate-500">Patient code</dt><dd className="mt-1 text-sm font-semibold">{patient.patientId}</dd></div>
            <div><dt className="text-xs text-slate-500">Registration number</dt><dd className="mt-1 text-sm font-semibold">{patient.registrationNumber || "—"}</dd></div>
            <div><dt className="text-xs text-slate-500">Age / gender</dt><dd className="mt-1 text-sm font-semibold">{patient.age ?? "—"} / {patient.gender || "—"}</dd></div>
            <div><dt className="text-xs text-slate-500">Coverage plan</dt><dd className="mt-1 text-sm font-semibold">{patient.coveragePlan || "Self-Pay"}</dd></div>
            <div><dt className="text-xs text-slate-500">Registration date</dt><dd className="mt-1 text-sm font-semibold">{dateLabel(patient.createdAt)}</dd></div>
            <div><dt className="text-xs text-slate-500">Last visit</dt><dd className="mt-1 text-sm font-semibold">{dateLabel(patient.lastVisitAt)}</dd></div>
            <div><dt className="text-xs text-slate-500">Patient status</dt><dd className="mt-1 text-sm font-semibold capitalize">{patient.status || "—"}</dd></div>
            <div><dt className="text-xs text-slate-500">Registration type</dt><dd className="mt-1 text-sm font-semibold">{patient.isWalkIn ? "Walk-in" : "Scheduled"}</dd></div>
          </dl>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold"><Phone className="h-4 w-4 text-blue-600" /> Contact</div>
            <p className="mt-3 text-sm">{patient.phone || "No phone number recorded."}</p>
          </article>
          <article className="rounded-2xl border bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4 text-blue-600" /> Address</div>
            <p className="mt-3 text-sm">{patient.address || "No address recorded."}</p>
          </article>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-blue-900"><CalendarDays className="h-4 w-4" /> Clinical information is protected</div>
          <p className="mt-1 text-sm text-blue-800">Clinical notes, diagnoses, test results, prescriptions, allergies and treatment details are available only to authorised clinical staff. Reception can access registration and contact information needed for front-desk operations.</p>
        </section>
      </div>
    </main>
  );
}
