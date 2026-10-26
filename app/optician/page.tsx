import Link from "next/link";
import { Glasses } from "lucide-react";
import { getOpticianQueue, type OpticalOrder } from "@/app/actions/optician";

function refractionText(value: Record<string, unknown> | null | undefined) {
  if (!value) return "Not recorded";
  const record = (item: unknown): Record<string, unknown> | null =>
    item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : null;
  const subjective = record(value.subjective);
  const objective = record(value.objective);
  const hasRx = (item: Record<string, unknown> | null) =>
    Boolean(item && ["sphere", "cylinder", "axis", "add"].some((key) => item[key] !== null && item[key] !== undefined && String(item[key]).trim() !== ""));
  const rx = hasRx(subjective) ? subjective! : hasRx(objective) ? objective! : value;
  const fields = [
    ["SPH", rx.sphere],
    ["CYL", rx.cylinder],
    ["AXIS", rx.axis],
    ["ADD", rx.add],
  ] as const;
  const text = fields.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "").map(([label, v]) => `${label} ${String(v)}`).join(" · ");
  return text || "Not recorded";
}

function statusLabel(status: OpticalOrder["status"]) {
  return ({ referred: "Prescription received", measurements: "In preparation", ready_for_dispense: "Ready for collection", collected: "Collected" } as const)[status];
}

export default async function OpticianDashboard() {
  const result = await getOpticianQueue();
  const orders = result.success ? result.orders : [];
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Glasses className="h-6 w-6" /></div>
            <div><h1 className="text-xl font-extrabold">Optician — Spectacle Prescriptions</h1><p className="mt-1 text-sm text-slate-500">View the doctor&apos;s spectacle request and the completed refraction prescription.</p></div>
          </div>
          <Link href="/optician" className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50">Refresh page</Link>
        </header>
        {!result.success && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{result.message || "Unable to load spectacle prescriptions."}</div>}
        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b p-5"><h2 className="font-bold">Spectacle prescription requests</h2><p className="mt-1 text-sm text-slate-500">Frame selection, lens processing, preparation and collection are managed in Shared Inventory.</p></div>
          {orders.length === 0 ? <div className="p-12 text-center"><Glasses className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold">No spectacle prescriptions found</p><p className="mt-1 text-sm text-slate-500">A doctor&apos;s optical request with a completed refraction will appear here.</p></div> : <div className="divide-y">{orders.map((order) => <article key={order.id} className="grid gap-4 p-5 md:grid-cols-[1.1fr_1.5fr_auto] md:items-center">
            <div><p className="font-bold">{order.patientName}</p><p className="mt-1 font-mono text-xs text-slate-500">{order.patientCode}</p><span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{statusLabel(order.status)}</span></div>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">R / OD</p><p className="mt-1 text-sm">{refractionText(order.refractionOD)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">L / OS</p><p className="mt-1 text-sm">{refractionText(order.refractionOS)}</p></div></div>
            <Link href={`/optician/${encodeURIComponent(order.patientCode)}`} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-emerald-800">View prescription</Link>
          </article>)}</div>}
        </section>
        <p className="mt-4 text-xs text-slate-500">{orders.length} prescription request(s)</p>
      </div>
    </main>
  );
}
