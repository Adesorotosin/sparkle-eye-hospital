"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, RefreshCw, Save, Tags, X } from "lucide-react";
import {
  createProcedurePrice,
  getProcedurePriceCatalog,
  updateProcedurePrice,
  type ProcedurePrice,
} from "@/app/actions/procedures";

const CATEGORIES = ["Clinical procedures", "Diagnostic eye test", "OCT imaging", "Pharmacy drugs"] as const;
type PriceCategory = typeof CATEGORIES[number];

const currency = (value: number) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", maximumFractionDigits: 2,
}).format(value);

function normalizeCategory(category: string): PriceCategory {
  const value = category.toLowerCase();
  if (value.includes("oct")) return "OCT imaging";
  if (value.includes("diagnostic") || value.includes("refraction")) return "Diagnostic eye test";
  if (value.includes("pharmacy") || value.includes("drug")) return "Pharmacy drugs";
  return "Clinical procedures";
}

export default function ProcedurePricesPage() {
  const [items, setItems] = useState<ProcedurePrice[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { price: string; active: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState<PriceCategory | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [adding, setAdding] = useState(false);
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
      setDrafts(Object.fromEntries(result.procedures.map(item => [item.id, { price: String(item.price), active: item.active }])));
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
    const result = await updateProcedurePrice({ id: item.id, price: Number(draft.price), active: draft.active });
    if (!result.success) setError(result.message || "Could not save this price.");
    else {
      setMessage(`${item.name} saved successfully.`);
      await loadPrices();
    }
    setSavingId(null);
  }

  async function addItem(category: PriceCategory) {
    const price = Number(newPrice);
    if (!newName.trim() || !newPrice.trim() || !Number.isFinite(price) || price < 0) {
      setError("Enter an item name and a valid non-negative price.");
      return;
    }
    setAdding(true);
    setError("");
    setMessage("");
    try {
      const result = await createProcedurePrice({ name: newName, category, price });
      if (!result.success) throw new Error(result.message);
      setMessage(result.message);
      setNewName("");
      setNewPrice("");
      setAddingCategory(null);
      await loadPrices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add this price item.");
    } finally {
      setAdding(false);
    }
  }

  const grouped = useMemo(() => {
    const groups = Object.fromEntries(CATEGORIES.map(category => [category, [] as ProcedurePrice[]])) as Record<PriceCategory, ProcedurePrice[]>;
    for (const item of items) groups[normalizeCategory(item.category)].push(item);
    return groups;
  }, [items]);

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
        <strong>Pricing control.</strong> These are the administrator-managed prices used by the hospital workflow. Review prices before making items available for billing. Pharmacy drug prices in this catalogue are separate from stock quantities and inventory movements.
      </div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {message && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{message}</div>}

      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading price catalogue…</div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map(category => (
            <section key={category} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
                <div><h2 className="font-bold text-slate-900">{category}</h2><p className="mt-1 text-xs text-slate-500">{grouped[category].length} price item(s)</p></div>
                <button onClick={() => { setAddingCategory(addingCategory === category ? null : category); setNewName(""); setNewPrice(""); setError(""); }} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700"><Plus className="h-4 w-4" /> Add item</button>
              </div>
              {addingCategory === category && (
                <form onSubmit={event => { event.preventDefault(); void addItem(category); }} className="grid gap-3 border-b border-violet-100 bg-violet-50/60 p-5 md:grid-cols-[minmax(0,1fr)_180px_auto_auto] md:items-end">
                  <label className="block text-xs font-semibold text-slate-600">Item name<input required maxLength={120} value={newName} onChange={event => setNewName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Enter procedure, test or drug name" /></label>
                  <label className="block text-xs font-semibold text-slate-600">Price (₦)<input required type="number" min="0" step="0.01" value={newPrice} onChange={event => setNewPrice(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="0.00" /></label>
                  <button disabled={adding} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add price</button>
                  <button type="button" onClick={() => setAddingCategory(null)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600"><X className="h-4 w-4" /> Cancel</button>
                </form>
              )}
              <div className="divide-y divide-slate-100">
                {grouped[category].length === 0 ? <p className="px-5 py-6 text-sm text-slate-500">No items in this section yet. Use “Add item” to create the first price.</p> : grouped[category].map(item => {
                  const draft = drafts[item.id] ?? { price: String(item.price), active: item.active };
                  const changed = Number(draft.price) !== item.price || draft.active !== item.active;
                  return (
                    <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_180px_130px_100px] md:items-center">
                      <div><p className="font-semibold text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-500">Current price: {currency(item.price)}</p></div>
                      <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Fixed price (₦)</span><input type="number" min="0" step="0.01" value={draft.price} onChange={event => setDrafts(current => ({ ...current, [item.id]: { ...draft, price: event.target.value } }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></label>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={draft.active} onChange={event => setDrafts(current => ({ ...current, [item.id]: { ...draft, active: event.target.checked } }))} className="h-4 w-4 rounded border-slate-300 accent-violet-600" /> Available at reception</label>
                      <button onClick={() => void saveItem(item)} disabled={!changed || savingId === item.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">{savingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</button>
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
