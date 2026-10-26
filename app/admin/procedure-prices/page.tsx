"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, RefreshCw, Save, Tags } from "lucide-react";
import { getProcedurePriceCatalog, updateProcedurePrice, type ProcedurePrice } from "@/app/actions/procedures";

const currency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

export default function ProcedurePricesPage() {
  const [items, setItems] = useState<ProcedurePrice[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { price: string; active: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPrices = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await getProcedurePriceCatalog();
    if (!result.success) {
      setError(result.message || "Could not load the procedure price catalogue.");
      setItems([]);
      setDrafts({});
    } else {
      setItems(result.procedures);
      setDrafts(Object.fromEntries(result.procedures.map((item) => [
        item.id,
        { price: String(item.price), active: item.active },
      ])));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadPrices updates state after its async request resolves.
    void loadPrices();
  }, [loadPrices]);

  async function saveItem(item: ProcedurePrice) {
    const draft = drafts[item.id];
    if (!draft || draft.price.trim() === "" || !Number.isFinite(Number(draft.price)) || Number(draft.price) < 0) {
      setError("Enter a valid non-negative price before saving.");
      return;
    }

    setSavingId(item.id);
    setError("");
    setMessage("");
    const result = await updateProcedurePrice({
      id: item.id,
      price: Number(draft.price),
      active: draft.active,
    });
    if (!result.success) {
      setError(result.message || "Could not save this price.");
    } else {
      setMessage(`${item.name} saved successfully.`);
      await loadPrices();
    }
    setSavingId(null);
  }

  const grouped = items.reduce<Record<string, ProcedurePrice[]>>((groups, item) => {
    (groups[item.category] ??= []).push(item);
    return groups;
  }, {});

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6 text-slate-800 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-100 p-3 text-violet-700"><Tags className="h-6 w-6" /></div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Procedure Price Catalogue</h1>
            <p className="mt-1 text-sm text-slate-500">Manage the fixed prices used by reception and patient billing.</p>
          </div>
        </div>
        <button onClick={() => void loadPrices()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </header>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <strong>Provisional starting prices.</strong> These amounts are illustrative defaults, not confirmed hospital tariffs. Please have management verify them before using the system for live billing. The intravitreal injection amount is a procedure fee only and excludes medication.
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {message && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{message}</div>}

      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading price catalogue…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">No price catalogue found. Confirm the new Supabase migration has been applied.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <section key={category} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                <h2 className="font-bold text-slate-900">{category}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {categoryItems.map((item) => {
                  const draft = drafts[item.id] ?? { price: String(item.price), active: item.active };
                  const changed = Number(draft.price) !== item.price || draft.active !== item.active;
                  return (
                    <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_180px_130px_100px] md:items-center">
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">Current price: {currency(item.price)}</p>
                      </div>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-500">Fixed price (₦)</span>
                        <input type="number" min="0" step="100" value={draft.price} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, price: event.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" />
                      </label>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={draft.active} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, active: event.target.checked } }))} className="h-4 w-4 rounded border-slate-300 accent-violet-600" />
                        Available at reception
                      </label>
                      <button onClick={() => void saveItem(item)} disabled={!changed || savingId === item.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
                        {savingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
