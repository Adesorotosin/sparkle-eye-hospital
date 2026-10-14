"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, ArrowDownToLine, ArrowLeft, ArrowUpFromLine,
  Boxes, CheckCircle2, ClipboardList, LoaderCircle, Package, Plus,
  RefreshCw, Search, Truck, X, LogOut,
} from "lucide-react";
import {
  createInventoryItem,
  createInventorySupplier,
  getInventoryData,
  issueInventoryStock,
  receiveInventoryStock,
  type InventoryDomain,
  type InventoryItemRecord,
  type InventoryMovementRecord,
  type InventorySupplierRecord,
} from "@/app/actions/inventory";

type TabKey = "all" | "optical" | "hospital" | "pharmacy";
type ModalKey = "item" | "receive" | "issue" | "supplier" | null;

const money = (value: number) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", maximumFractionDigits: 2,
}).format(Number(value || 0));

const domainLabel: Record<InventoryDomain, string> = {
  optical: "Optical",
  pharmacy: "Pharmacy",
  hospital: "Hospital consumables",
};

const categoriesByDomain: Record<InventoryDomain, string[]> = {
  optical: ["Frames", "Lenses", "Cases", "Spectacle Ropes", "Contact Lenses", "Optical Accessories", "Other Optical"],
  pharmacy: ["Medication", "Eye Drops", "Antibiotics", "Consumables", "Other Pharmacy"],
  hospital: ["PPE", "Nursing Supplies", "Laboratory Supplies", "Dressings", "Cleaning & Infection Control", "Office Supplies", "Other Consumables"],
};

const departments = ["Optician", "Pharmacy", "Laboratory", "Nursing", "Consulting Room", "Reception", "Investigation Room", "Other"];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItemRecord[]>([]);
  const [suppliers, setSuppliers] = useState<InventorySupplierRecord[]>([]);
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [modal, setModal] = useState<ModalKey>(null);
  const [movementFilter, setMovementFilter] = useState("all");

  const [itemForm, setItemForm] = useState({
    sku: "", name: "", domain: "optical" as InventoryDomain, category: "Frames",
    unitOfMeasure: "unit", reorderLevel: "5", price: "0", unitCost: "0",
  });
  const [receiveForm, setReceiveForm] = useState({
    itemId: "", quantity: "1", unitCost: "", supplierId: "", reference: "", notes: "",
  });
  const [issueForm, setIssueForm] = useState({
    itemId: "", quantity: "1", department: "Optician", reference: "", notes: "",
  });
  const [supplierForm, setSupplierForm] = useState({ name: "", contactPerson: "", phone: "", email: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getInventoryData();
    if (!result.success) {
      setError(result.message);
    } else {
      setItems(result.items);
      setSuppliers(result.suppliers);
      setMovements(result.movements);
      setRole(result.role);
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const isManager = role === "IT_ADMIN" || role === "PHARMACIST" || role === "INVENTORY_MANAGER";
  const dashboardHref = role === "PHARMACIST" ? "/pharmacy" : role === "OPTICIAN" ? "/optician" : role === "LAB_SCIENTIST" ? "/laboratory" : role === "NURSE" ? "/nurse" : "/admin";
  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesTab = tab === "all" || item.domain === tab;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term) || item.category.toLowerCase().includes(term);
    return item.is_active && matchesTab && matchesSearch;
  }), [items, search, tab]);

  const lowStockItems = items.filter((item) => item.is_active && item.stock <= item.reorder_level);
  const totalUnits = items.filter((item) => item.is_active).reduce((sum, item) => sum + Number(item.stock || 0), 0);
  const inventoryValue = items.filter((item) => item.is_active).reduce((sum, item) => sum + Number(item.stock || 0) * Number(item.unit_cost || 0), 0);
  const recentMovements = movements.filter((movement) => movementFilter === "all" || movement.movement_type === movementFilter);

  const closeModal = () => setModal(null);
  const refreshAfterSuccess = async (message: string) => {
    setNotice(message);
    setError("");
    closeModal();
    await loadData();
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  const submitItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    const result = await createInventoryItem({
      sku: itemForm.sku, name: itemForm.name, domain: itemForm.domain, category: itemForm.category,
      unitOfMeasure: itemForm.unitOfMeasure, reorderLevel: Number(itemForm.reorderLevel),
      price: Number(itemForm.price), unitCost: Number(itemForm.unitCost),
    });
    if (result.success) {
      setItemForm({ sku: "", name: "", domain: "optical", category: "Frames", unitOfMeasure: "unit", reorderLevel: "5", price: "0", unitCost: "0" });
      await refreshAfterSuccess(result.message);
    } else setError(result.message);
    setSaving(false);
  };

  const submitReceive = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    const result = await receiveInventoryStock({
      itemId: receiveForm.itemId, quantity: Number(receiveForm.quantity),
      unitCost: receiveForm.unitCost === "" ? null : Number(receiveForm.unitCost),
      supplierId: receiveForm.supplierId || undefined, reference: receiveForm.reference, notes: receiveForm.notes,
    });
    if (result.success) {
      setReceiveForm({ itemId: "", quantity: "1", unitCost: "", supplierId: "", reference: "", notes: "" });
      await refreshAfterSuccess(result.message);
    } else setError(result.message);
    setSaving(false);
  };

  const submitIssue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    const result = await issueInventoryStock({
      itemId: issueForm.itemId, quantity: Number(issueForm.quantity), department: issueForm.department,
      reference: issueForm.reference, notes: issueForm.notes,
    });
    if (result.success) {
      setIssueForm({ itemId: "", quantity: "1", department: "Optician", reference: "", notes: "" });
      await refreshAfterSuccess(result.message);
    } else setError(result.message);
    setSaving(false);
  };

  const submitSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    const result = await createInventorySupplier(supplierForm);
    if (result.success) {
      setSupplierForm({ name: "", contactPerson: "", phone: "", email: "" });
      await refreshAfterSuccess(result.message);
    } else setError(result.message);
    setSaving(false);
  };

  const selectedItem = (id: string) => items.find((item) => item.id === id);
  const inputClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
  const labelClass = "block text-xs font-bold text-slate-600";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {role !== "INVENTORY_MANAGER" && <Link href={dashboardHref} aria-label="Back to dashboard" className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" />
            </Link>}
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Boxes className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950">Shared Inventory</h1>
              <p className="mt-0.5 text-xs text-slate-500">Optical products, pharmacy stock and hospital consumables</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh</button>
            <button onClick={() => setModal("issue")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold hover:bg-slate-50"><ArrowUpFromLine className="h-4 w-4" /> Issue stock</button>
            {isManager && <button onClick={() => setModal("receive")} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-700"><ArrowDownToLine className="h-4 w-4" /> Receive stock</button>}
            {role === "INVENTORY_MANAGER" && <button onClick={() => void handleSignOut()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" /> Sign out</button>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span><button onClick={() => setError("")} className="ml-auto"><X className="h-4 w-4" /></button></div>}
        {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>{notice}</span><button onClick={() => setNotice("")} className="ml-auto"><X className="h-4 w-4" /></button></div>}
        {!loading && error.includes("migration") && <p className="text-xs text-slate-500">Before using this page, apply <code>supabase/migrations/20261013000000_shared_inventory_module.sql</code> in the project’s Supabase SQL editor.</p>}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active item types", value: items.filter((item) => item.is_active).length.toLocaleString(), hint: "Across all inventory categories", icon: Package },
            { label: "Units in stock", value: totalUnits.toLocaleString(), hint: "Current counted quantities", icon: Boxes },
            { label: "Low-stock alerts", value: lowStockItems.length.toLocaleString(), hint: "At or below reorder level", icon: AlertTriangle },
            { label: "Stock value", value: money(inventoryValue), hint: "Quantity × recorded unit cost", icon: Activity },
          ].map((stat) => {
            const Icon = stat.icon;
            return <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-500">{stat.label}</p><span className="rounded-xl bg-violet-50 p-2 text-violet-700"><Icon className="h-4 w-4" /></span></div><p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{stat.value}</p><p className="mt-1 text-xs text-slate-500">{stat.hint}</p></div>;
          })}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="font-extrabold text-slate-950">Inventory catalogue</h2><p className="mt-1 text-xs text-slate-500">One catalogue with separate categories for optical, pharmacy and general hospital stock.</p></div>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input aria-label="Search inventory" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item, SKU or category…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-500" /></div>
              {isManager && <button onClick={() => setModal("item")} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100"><Plus className="h-4 w-4" /> New item</button>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
            {([{ key: "all", label: "All inventory" }, { key: "optical", label: "Optical" }, { key: "hospital", label: "Hospital consumables" }, { key: "pharmacy", label: "Pharmacy" }] as {key: TabKey; label: string}[]).map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`rounded-full px-3 py-2 text-xs font-bold transition ${tab === item.key ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item.label}</button>)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-5 py-3 font-extrabold">Item</th><th className="px-5 py-3 font-extrabold">Category</th><th className="px-5 py-3 font-extrabold">Stock</th><th className="px-5 py-3 font-extrabold">Unit cost</th><th className="px-5 py-3 font-extrabold">Unit price</th><th className="px-5 py-3 font-extrabold">Status</th><th className="px-5 py-3 font-extrabold">Action</th></tr></thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500"><LoaderCircle className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading inventory…</td></tr> : filteredItems.length === 0 ? <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500">No inventory items match this filter. {isManager ? "Add a new item to get started." : ""}</td></tr> : filteredItems.map((item) => {
                  const low = item.stock <= item.reorder_level;
                  return <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4"><p className="font-bold text-slate-900">{item.name}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{item.sku} · {domainLabel[item.domain]}</p></td>
                    <td className="px-5 py-4 text-slate-600">{item.category}</td>
                    <td className="px-5 py-4"><span className="font-extrabold text-slate-900">{item.stock}</span> <span className="text-xs text-slate-500">{item.unit_of_measure}</span><p className="mt-1 text-[10px] text-slate-400">Reorder at {item.reorder_level}</p></td>
                    <td className="px-5 py-4 text-slate-600">{money(item.unit_cost)}</td><td className="px-5 py-4 font-semibold text-slate-800">{money(item.price)}</td>
                    <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${low ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{low ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}{low ? "Low stock" : "In stock"}</span></td>
                    <td className="px-5 py-4"><button onClick={() => { setReceiveForm((v) => ({...v, itemId: item.id})); setModal(isManager ? "receive" : "issue"); if (!isManager) setIssueForm((v) => ({...v, itemId: item.id})); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold hover:border-violet-300 hover:text-violet-700">{isManager ? "Receive" : "Issue"}</button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="rounded-xl bg-sky-50 p-2 text-sky-700"><ClipboardList className="h-4 w-4" /></span><div><h2 className="font-extrabold text-slate-950">Stock movement history</h2><p className="mt-1 text-xs text-slate-500">Latest 100 recorded receipts and department issues.</p></div></div><select aria-label="Filter stock movements" value={movementFilter} onChange={(event) => setMovementFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"><option value="all">All movements</option><option value="RECEIVE">Stock received</option><option value="ISSUE">Department issues</option><option value="RETURN">Returns</option><option value="DAMAGE">Damaged</option><option value="EXPIRED">Expired</option><option value="SALE">Patient sales</option></select></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead><tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><th className="px-5 py-3 font-extrabold">Date</th><th className="px-5 py-3 font-extrabold">Item</th><th className="px-5 py-3 font-extrabold">Movement</th><th className="px-5 py-3 font-extrabold">Quantity</th><th className="px-5 py-3 font-extrabold">Stock after</th><th className="px-5 py-3 font-extrabold">Department / Supplier</th><th className="px-5 py-3 font-extrabold">Recorded by</th></tr></thead><tbody className="divide-y divide-slate-100 text-xs">
            {loading ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">Loading movement history…</td></tr> : recentMovements.length === 0 ? <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-500">No movements recorded yet.</td></tr> : recentMovements.map((movement) => <tr key={movement.id}><td className="whitespace-nowrap px-5 py-3 text-slate-500">{new Date(movement.created_at).toLocaleString()}</td><td className="px-5 py-3"><p className="font-bold text-slate-800">{movement.item?.name ?? "Inventory item"}</p><p className="mt-0.5 text-[10px] text-slate-400">{movement.item?.sku ?? movement.item_id}</p></td><td className="px-5 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${movement.movement_type === "RECEIVE" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>{movement.movement_type.replace(/_/g, " ")}</span>{movement.reference && <p className="mt-1 text-[10px] text-slate-400">Ref: {movement.reference}</p>}</td><td className="px-5 py-3 font-extrabold">{movement.movement_type === "RECEIVE" || movement.movement_type === "RETURN" ? "+" : "−"}{movement.quantity}</td><td className="px-5 py-3 font-semibold">{movement.new_stock} {movement.item?.unit_of_measure ?? ""}</td><td className="px-5 py-3 text-slate-600">{movement.department ?? movement.supplier?.name ?? "—"}</td><td className="px-5 py-3 text-slate-600">{movement.performed_by_name}</td></tr>)}
          </tbody></table></div>
        </section>

        <div className="flex flex-col gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4 text-xs text-violet-900 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold">Supplier register</p><p className="mt-1 text-violet-800">Keep supplier details attached to received stock for traceability.</p></div><div className="flex items-center gap-3"><span className="inline-flex items-center gap-1.5 font-bold"><Truck className="h-4 w-4" /> {suppliers.length} active suppliers</span>{isManager && <button onClick={() => setModal("supplier")} className="rounded-xl border border-violet-200 bg-white px-3 py-2 font-bold hover:bg-violet-100">Add supplier</button>}</div></div>
      </main>

      {modal && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
        <div role="dialog" aria-modal="true" className="my-6 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="font-extrabold text-slate-950">{modal === "item" ? "Add inventory item" : modal === "receive" ? "Receive stock" : modal === "issue" ? "Issue stock to department" : "Add supplier"}</h3><p className="mt-1 text-xs text-slate-500">{modal === "item" ? "New items start at zero stock; record a receipt to add quantity." : modal === "receive" ? "Stock and its movement audit entry are saved together." : modal === "issue" ? "The system prevents issues that exceed available stock." : "Supplier details can be linked to future receipts."}</p></div><button onClick={closeModal} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
          {modal === "item" && <form onSubmit={submitItem} className="grid gap-4 p-5 sm:grid-cols-2">
            <label className={labelClass}>SKU / item code<input required maxLength={40} value={itemForm.sku} onChange={(e) => setItemForm({...itemForm, sku: e.target.value})} placeholder="e.g. OPT-FRM-001" className={inputClass} /></label>
            <label className={labelClass}>Item name<input required value={itemForm.name} onChange={(e) => setItemForm({...itemForm, name: e.target.value})} placeholder="e.g. Black optical frame" className={inputClass} /></label>
            <label className={labelClass}>Inventory group<select value={itemForm.domain} onChange={(e) => { const domain = e.target.value as InventoryDomain; setItemForm({...itemForm, domain, category: categoriesByDomain[domain][0]}); }} className={inputClass}><option value="optical">Optical</option><option value="pharmacy">Pharmacy</option><option value="hospital">Hospital consumables</option></select></label>
            <label className={labelClass}>Item category<select value={itemForm.category} onChange={(e) => setItemForm({...itemForm, category: e.target.value})} className={inputClass}>{categoriesByDomain[itemForm.domain].map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className={labelClass}>Unit of measure<input required value={itemForm.unitOfMeasure} onChange={(e) => setItemForm({...itemForm, unitOfMeasure: e.target.value})} placeholder="unit, box, pack, pair" className={inputClass} /></label>
            <label className={labelClass}>Reorder level<input required type="number" min="0" step="1" value={itemForm.reorderLevel} onChange={(e) => setItemForm({...itemForm, reorderLevel: e.target.value})} className={inputClass} /></label>
            <label className={labelClass}>Unit cost (₦)<input required type="number" min="0" step="0.01" value={itemForm.unitCost} onChange={(e) => setItemForm({...itemForm, unitCost: e.target.value})} className={inputClass} /></label>
            <label className={labelClass}>Unit selling price (₦)<input required type="number" min="0" step="0.01" value={itemForm.price} onChange={(e) => setItemForm({...itemForm, price: e.target.value})} className={inputClass} /></label>
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Create item"}</button></div>
          </form>}
          {modal === "receive" && <form onSubmit={submitReceive} className="grid gap-4 p-5 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>Inventory item<select required value={receiveForm.itemId} onChange={(e) => setReceiveForm({...receiveForm, itemId: e.target.value})} className={inputClass}><option value="">Select item…</option>{items.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name} ({item.stock} {item.unit_of_measure})</option>)}</select></label>
            <label className={labelClass}>Quantity received<input required type="number" min="1" step="1" value={receiveForm.quantity} onChange={(e) => setReceiveForm({...receiveForm, quantity: e.target.value})} className={inputClass} /></label>
            <label className={labelClass}>Unit cost (₦), optional<input type="number" min="0" step="0.01" value={receiveForm.unitCost} onChange={(e) => setReceiveForm({...receiveForm, unitCost: e.target.value})} className={inputClass} placeholder="Use existing cost" /></label>
            <label className={labelClass}>Supplier<select value={receiveForm.supplierId} onChange={(e) => setReceiveForm({...receiveForm, supplierId: e.target.value})} className={inputClass}><option value="">Not specified</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label className={labelClass}>Invoice / reference<input value={receiveForm.reference} onChange={(e) => setReceiveForm({...receiveForm, reference: e.target.value})} className={inputClass} placeholder="Purchase invoice number" /></label>
            <label className={`${labelClass} sm:col-span-2`}>Notes<textarea value={receiveForm.notes} onChange={(e) => setReceiveForm({...receiveForm, notes: e.target.value})} rows={2} className={inputClass} placeholder="Optional receipt notes" /></label>
            {selectedItem(receiveForm.itemId) && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:col-span-2">Current stock: <strong>{selectedItem(receiveForm.itemId)?.stock} {selectedItem(receiveForm.itemId)?.unit_of_measure}</strong></p>}
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Confirm receipt"}</button></div>
          </form>}
          {modal === "issue" && <form onSubmit={submitIssue} className="grid gap-4 p-5 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>Inventory item<select required value={issueForm.itemId} onChange={(e) => setIssueForm({...issueForm, itemId: e.target.value})} className={inputClass}><option value="">Select item…</option>{items.filter((item) => item.is_active && item.stock > 0).map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name} ({item.stock} {item.unit_of_measure})</option>)}</select></label>
            <label className={labelClass}>Quantity to issue<input required type="number" min="1" step="1" value={issueForm.quantity} onChange={(e) => setIssueForm({...issueForm, quantity: e.target.value})} className={inputClass} /></label>
            <label className={labelClass}>Receiving department<select required value={issueForm.department} onChange={(e) => setIssueForm({...issueForm, department: e.target.value})} className={inputClass}>{departments.map((department) => <option key={department}>{department}</option>)}</select></label>
            <label className={labelClass}>Issue reference<input value={issueForm.reference} onChange={(e) => setIssueForm({...issueForm, reference: e.target.value})} className={inputClass} placeholder="Optional requisition number" /></label>
            <label className={labelClass}>Notes<input value={issueForm.notes} onChange={(e) => setIssueForm({...issueForm, notes: e.target.value})} className={inputClass} placeholder="Purpose / note" /></label>
            {selectedItem(issueForm.itemId) && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:col-span-2">Available: <strong>{selectedItem(issueForm.itemId)?.stock} {selectedItem(issueForm.itemId)?.unit_of_measure}</strong></p>}
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Issue stock"}</button></div>
          </form>}
          {modal === "supplier" && <form onSubmit={submitSupplier} className="grid gap-4 p-5 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>Supplier / company name<input required value={supplierForm.name} onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})} className={inputClass} placeholder="Company name" /></label>
            <label className={labelClass}>Contact person<input value={supplierForm.contactPerson} onChange={(e) => setSupplierForm({...supplierForm, contactPerson: e.target.value})} className={inputClass} /></label>
            <label className={labelClass}>Phone number<input value={supplierForm.phone} onChange={(e) => setSupplierForm({...supplierForm, phone: e.target.value})} className={inputClass} /></label>
            <label className={`${labelClass} sm:col-span-2`}>Email address<input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({...supplierForm, email: e.target.value})} className={inputClass} /></label>
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{saving ? "Saving…" : "Save supplier"}</button></div>
          </form>}
        </div>
      </div>}
    </div>
  );
}
