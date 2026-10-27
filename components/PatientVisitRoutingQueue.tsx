"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, Loader2, RefreshCw, Users } from "lucide-react";
import {
  getPatientVisitRoutes,
  updatePatientVisitRoute,
  type PatientVisitRoute,
  type VisitDestination,
} from "@/app/actions/patient-visit-routing";

const TITLES: Record<VisitDestination, string> = {
  TRIAGE: "Reception arrivals for triage",
  DOCTOR: "Visiting patients awaiting doctor review",
  PHARMACY: "Visiting patients awaiting pharmacy review",
  LABORATORY: "Visiting patients awaiting laboratory review",
  DIAGNOSTICS: "Visiting patients awaiting investigation review",
  OPTOMETRY: "Visiting patients awaiting optometry review",
};

export default function PatientVisitRoutingQueue({ destination }: { destination: VisitDestination }) {
  const [routes, setRoutes] = useState<PatientVisitRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const result = await getPatientVisitRoutes(destination);
    if (result.success) {
      setRoutes(result.routes);
      setMessage("");
    } else {
      setRoutes([]);
      setError(result.message ?? "Unable to load arrival queue.");
    }
    setLoading(false);
  }, [destination]);

  useEffect(() => { void load(); }, [load]);

  async function update(route: PatientVisitRoute, status: "acknowledged" | "completed") {
    setBusyId(route.id);
    setError("");
    setMessage("");
    const result = await updatePatientVisitRoute({ id: route.id, destination, status });
    if (!result.success) setError(result.message);
    else {
      setMessage(result.message);
      await load();
    }
    setBusyId("");
  }

  return (
    <section className="mb-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-blue-700"><Users className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold text-gray-900">{TITLES[destination]}</h2>
            <p className="text-xs text-gray-500">Reception routes patient arrivals here only. This is not a clinical order or authorization to treat.</p>
          </div>
          {routes.length > 0 && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">{routes.length} waiting</span>}
        </div>
        <button type="button" onClick={() => { setLoading(true); void load(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      {(message || error) && <p className={`mb-3 rounded-lg p-3 text-sm ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{error || message}</p>}
      {loading ? <div className="flex items-center gap-2 py-5 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading arrivals...</div> :
        error ? null :
        routes.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm text-gray-500">No visiting patients are waiting in this arrival queue.</p> :
        <div className="space-y-3">{routes.map((route) => (
          <article key={route.id} className="rounded-xl border border-gray-100 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{route.patientName}</p>
                <p className="mt-1 text-xs text-gray-500">Patient code: {route.patientCode}{route.registrationNumber ? ` · Registration: ${route.registrationNumber}` : ""}</p>
                <p className="mt-1 text-xs text-gray-500">{route.age == null ? "Age not recorded" : `${route.age} years`}{route.gender ? ` · ${route.gender}` : ""}{route.phone ? ` · ${route.phone}` : ""}</p>
                <p className="mt-1 text-xs text-gray-500">Arrived {new Date(route.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
                {route.reason && <p className="mt-2 text-sm text-gray-700">{route.reason}</p>}
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{route.status}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {route.status === "pending" && <button type="button" disabled={busyId === route.id} onClick={() => void update(route, "acknowledged")} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"><Clock3 className="h-4 w-4" /> Acknowledge arrival</button>}
              <button type="button" disabled={busyId === route.id} onClick={() => void update(route, "completed")} className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50">{busyId === route.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Mark handled</button>
            </div>
          </article>
        ))}</div>}
    </section>
  );
}
