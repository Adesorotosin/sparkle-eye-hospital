"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Clock3,
  Package,
  RefreshCw,
} from "lucide-react";
import { getInventoryData } from "@/app/actions/inventory";

type Overview = {
  summary: {
    activeItemTypes: number;
    unitsInStock: number;
    lowStockCount: number;
    outOfStockCount: number;
    stockValue: number;
  };
  lowStockItems: Array<{
    id: string;
    name: string;
    sku: string;
    domain: string;
    stock: number;
    reorder_level: number;
    unit_of_measure: string;
  }>;
  recentMovements: Array<{
    id: string;
    movement_type: string;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    created_at: string;
    performed_by_name: string;
    department: string | null;
    item: { name: string; domain: string; unit_of_measure: string } | null;
  }>;
  updatedAt: string;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function InventoryOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Reuse the authenticated inventory server action instead of parsing an
      // API response that may be an HTML login/error page rather than JSON.
      const result = await getInventoryData();
      if (!result.success) {
        throw new Error(result.message || "Unable to load inventory overview.");
      }

      const activeItems = result.items.filter((item) => item.is_active);
      const lowStockItems = activeItems
        .filter((item) => Number(item.stock) <= Number(item.reorder_level))
        .sort((a, b) => Number(a.stock) - Number(b.stock))
        .slice(0, 6);

      setData({
        summary: {
          activeItemTypes: activeItems.length,
          unitsInStock: activeItems.reduce((sum, item) => sum + Number(item.stock || 0), 0),
          lowStockCount: activeItems.filter((item) => Number(item.stock) <= Number(item.reorder_level)).length,
          outOfStockCount: activeItems.filter((item) => Number(item.stock) <= 0).length,
          stockValue: activeItems.reduce((sum, item) => sum + Number(item.stock || 0) * Number(item.unit_cost || 0), 0),
        },
        lowStockItems,
        recentMovements: result.movements.slice(0, 6).map((movement) => ({
          id: movement.id,
          movement_type: movement.movement_type,
          quantity: Number(movement.quantity),
          previous_stock: Number(movement.previous_stock),
          new_stock: Number(movement.new_stock),
          created_at: movement.created_at,
          performed_by_name: movement.performed_by_name,
          department: movement.department,
          item: movement.item
            ? {
                name: movement.item.name,
                domain: movement.item.domain,
                unit_of_measure: movement.item.unit_of_measure,
              }
            : null,
        })),
        updatedAt: new Date().toISOString(),
      });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load inventory overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = data
    ? [
        { label: "Active item types", value: data.summary.activeItemTypes.toLocaleString(), icon: Package, tone: "bg-violet-50 text-violet-700" },
        { label: "Units in stock", value: data.summary.unitsInStock.toLocaleString(), icon: Boxes, tone: "bg-sky-50 text-sky-700" },
        { label: "Low-stock items", value: data.summary.lowStockCount.toLocaleString(), icon: AlertTriangle, tone: data.summary.lowStockCount ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700" },
        { label: "Out of stock", value: data.summary.outOfStockCount.toLocaleString(), icon: AlertTriangle, tone: data.summary.outOfStockCount ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700" },
      ]
    : [];

  return (
    <section id="inventory-overview" className="scroll-mt-6 space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700">Operations</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">Inventory Overview</h2>
          <p className="mt-1 text-xs text-slate-500">Read-only stock visibility across optical, pharmacy and hospital consumables.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data && <span className="text-[11px] text-slate-400">Updated {dateTime(data.updatedAt)}</span>}
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <Link href="/inventory" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700">
            View full inventory <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold text-slate-500">{card.label}</p><span className={`rounded-xl p-2 ${card.tone}`}><Icon className="h-4 w-4" /></span></div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">{loading && !data ? "…" : card.value}</p>
            </div>
          );
        })}
      </div>

      {data && <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-7">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
            <div><h3 className="text-sm font-extrabold text-slate-900">Items needing attention</h3><p className="mt-1 text-xs text-slate-500">Stock at or below the configured reorder level</p></div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">{data.summary.lowStockCount} alerts</span>
          </div>
          {data.lowStockItems.length ? <div className="divide-y divide-slate-100">
            {data.lowStockItems.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{item.name}</p><p className="mt-1 text-[11px] text-slate-400">{item.sku} · {item.domain}</p></div>
              <div className="text-right"><p className={`text-sm font-extrabold ${Number(item.stock) <= 0 ? "text-rose-700" : "text-amber-700"}`}>{item.stock} {item.unit_of_measure}</p><p className="text-[10px] text-slate-400">Reorder at {item.reorder_level}</p></div>
            </div>)}
          </div> : <div className="p-8 text-center text-sm text-emerald-700">No low-stock items at the moment.</div>}
          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3"><p className="text-[11px] text-slate-500">Estimated recorded stock value: <strong className="text-slate-800">{money(data.summary.stockValue)}</strong>. Based on stored unit costs; items without a unit cost count as ₦0.</p></div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-5">
          <div className="border-b border-slate-100 p-5"><h3 className="text-sm font-extrabold text-slate-900">Recent stock movements</h3><p className="mt-1 text-xs text-slate-500">Latest receipts, issues and dispensing entries</p></div>
          {data.recentMovements.length ? <div className="divide-y divide-slate-100">
            {data.recentMovements.map((movement) => {
              const inbound = /receive|purchase|return|opening/i.test(movement.movement_type);
              return <div key={movement.id} className="flex gap-3 px-5 py-3.5">
                <span className={`mt-0.5 rounded-lg p-2 ${inbound ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{inbound ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{movement.item?.name || "Inventory item"}</p><p className="mt-1 text-[10px] text-slate-500">{movement.movement_type.replaceAll("_", " ")} · {movement.performed_by_name || "Staff"}{movement.department ? ` · ${movement.department}` : ""}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><Clock3 className="h-3 w-3" />{dateTime(movement.created_at)}</p></div>
                <div className="shrink-0 text-right"><p className="text-xs font-extrabold text-slate-800">{movement.quantity}</p><p className="mt-1 text-[10px] text-slate-400">{movement.previous_stock} → {movement.new_stock}</p></div>
              </div>;
            })}
          </div> : <div className="p-8 text-center text-sm text-slate-500">No stock movements recorded yet.</div>}
        </div>
      </div>}

      {!loading && !error && !data && <p className="text-sm text-slate-500">Inventory data is currently unavailable.</p>}
    </section>
  );
}
