"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Boxes, LoaderCircle, Package, RefreshCw, Search } from "lucide-react";
import { getDoctorOpticalInventory } from "@/app/actions/inventory";

type OpticalStockItem = {
  id: string; sku: string; name: string; category: string; stock: number;
  reorder_level: number; unit_of_measure: string; updated_at: string;
};

export default function DoctorOpticalInventoryPage() {
  const [items, setItems] = useState<OpticalStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await getDoctorOpticalInventory();
    if (!result.success) {
      setError(result.message);
      setItems([]);
    } else {
      setItems(result.items as OpticalStockItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadInventory(); }, [loadInventory]);

  const visibleItems = items.filter((item) => {
    const term = search.trim().toLowerCase();
    return !term || item.name.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) || item.category.toLowerCase().includes(term);
  });
  const lowStockCount = items.filter((item) => item.stock <= item.reorder_level).length;
  const totalUnits = items.reduce((total, item) => total + Number(item.stock || 0), 0);

  return (
    <div className="min-h-full bg-[#F4F6FB] px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><Package className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-slate-900 sm:text-xl">Optical Inventory</h1>
              <p className="mt-1 text-sm leading-5 text-slate-500">Check frame, lens and optical accessory availability before planning a patient’s next step.</p>
              <p className="mt-2 text-xs font-medium text-slate-500">Read-only view. Contact the inventory team to receive or adjust stock.</p>
            </div>
          </div>
          <button type="button" onClick={() => void loadInventory()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh stock
          </button>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active optical items</p><div className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-slate-900"><Boxes className="h-5 w-5 text-purple-600" />{loading ? "—" : items.length}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Units in stock</p><div className="mt-2 text-2xl font-extrabold text-slate-900">{loading ? "—" : totalUnits.toLocaleString()}</div></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Low-stock items</p><div className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-amber-900"><AlertTriangle className="h-5 w-5" />{loading ? "—" : lowStockCount}</div></div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search optical items…" className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" /></label>
          </div>

          {error && <div className="m-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"><p>{error}</p><button type="button" onClick={() => void loadInventory()} className="font-bold underline underline-offset-2">Try again</button></div>}

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-14 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />Loading optical stock…</div>
          ) : !error && visibleItems.length === 0 ? (
            <div className="px-4 py-14 text-center"><Package className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No optical items found</p><p className="mt-1 text-xs text-slate-500">{search ? "Try another search term." : "There are currently no active optical items recorded."}</p></div>
          ) : (
            <>
              <div className="space-y-3 p-3 sm:hidden">
                {visibleItems.map((item) => {
                  const low = item.stock <= item.reorder_level;
                  return <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-sm font-bold text-slate-900">{item.name}</h2><p className="mt-1 text-xs text-slate-500">{item.sku} · {item.category}</p></div><span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${low ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{low ? "Low stock" : "In stock"}</span></div>
                    <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-3"><div><p className="text-xs text-slate-500">Available</p><p className="mt-1 text-lg font-extrabold text-slate-900">{item.stock} <span className="text-xs font-medium text-slate-500">{item.unit_of_measure}</span></p></div><p className="text-right text-xs text-slate-500">Reorder level: {item.reorder_level}</p></div>
                  </article>;
                })}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Item</th><th className="px-5 py-3 font-semibold">Category</th><th className="px-5 py-3 font-semibold">Available</th><th className="px-5 py-3 font-semibold">Reorder level</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{visibleItems.map((item) => { const low = item.stock <= item.reorder_level; return <tr key={item.id} className="hover:bg-slate-50/80"><td className="px-5 py-4"><p className="font-bold text-slate-900">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.sku}</p></td><td className="px-5 py-4 text-slate-600">{item.category}</td><td className="px-5 py-4 font-bold text-slate-900">{item.stock} <span className="text-xs font-normal text-slate-500">{item.unit_of_measure}</span></td><td className="px-5 py-4 text-slate-600">{item.reorder_level}</td><td className="px-5 py-4"><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${low ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{low ? "Low stock" : "In stock"}</span></td></tr>; })}</tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
