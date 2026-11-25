"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Role = { id: string; name: string; slug: string; description: string | null; base_role: string; permissions: Record<string, boolean>; is_active: boolean };
type Permission = { key: string; label: string; group: string };
const BASE_ROLES = [
  ["DOCTOR","Doctor"],["OPHTHALMOLOGIST","Ophthalmologist"],["NURSE","Nurse"],
  ["RECEPTIONIST","Receptionist"],["CASHIER","Cashier"],["PHARMACIST","Pharmacist"],
  ["OPTOMETRIST","Optometrist"],["OPTICIAN","Optician"],["LAB_SCIENTIST","Laboratory Staff"],["INVENTORY_MANAGER","Inventory Manager"]
];

export default function CustomRolesPage() {
  const [roles,setRoles]=useState<Role[]>([]);
  const [catalog,setCatalog]=useState<Permission[]>([]);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [baseRole,setBaseRole]=useState("DOCTOR");
  const [permissions,setPermissions]=useState<Record<string,boolean>>({});
  const [editing,setEditing]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  const grouped=useMemo(()=>catalog.reduce<Record<string,Permission[]>>((acc,p)=>{(acc[p.group]??=[]).push(p);return acc;},{}),[catalog]);
  async function load(){const r=await fetch("/api/admin/roles",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error);setRoles(d.roles??[]);setCatalog((d.permissions ?? []).map((item:Permission)=>item).filter((item:Permission)=>!item.group.startsWith("Legacy"))); }
  useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
  function reset(){setName("");setDescription("");setBaseRole("DOCTOR");setPermissions({});setEditing(null);}
  function startEdit(role:Role){setEditing(role.id);setName(role.name);setDescription(role.description??"");setBaseRole(role.base_role);setPermissions(role.permissions??{});setNotice("");setError("");}
  async function save(){setBusy(true);setError("");setNotice("");try{const response=await fetch(editing?"/api/admin/roles/"+editing:"/api/admin/roles",{method:editing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,description,baseRole,permissions})});const d=await response.json();if(!response.ok)throw new Error(d.error);await load();reset();setNotice(editing?"Role updated.":"Custom role created.");}catch(e){setError(e instanceof Error?e.message:"Unable to save role.");}finally{setBusy(false);}}
  async function toggle(role:Role){setBusy(true);try{const response=await fetch("/api/admin/roles/"+role.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({isActive:!role.is_active})});const d=await response.json();if(!response.ok)throw new Error(d.error);await load();}catch(e){setError(e instanceof Error?e.message:"Unable to update role.");}finally{setBusy(false);}}
  async function remove(role:Role){if(!window.confirm("Delete the custom role "+role.name+"?"))return;setBusy(true);try{const response=await fetch("/api/admin/roles/"+role.id,{method:"DELETE"});const d=await response.json();if(!response.ok)throw new Error(d.error);await load();setNotice("Role deleted.");}catch(e){setError(e instanceof Error?e.message:"Unable to delete role.");}finally{setBusy(false);}}
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/admin/access-control" className="text-sm text-emerald-700 hover:underline">← Staff & Access Control</Link><h1 className="mt-2 text-2xl font-bold">Custom roles</h1><p className="mt-1 text-sm text-slate-600">Create reusable permission profiles layered over a predefined hospital role.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Hybrid RBAC</span></div>
    {notice&&<p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}{error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">{editing?"Edit custom role":"Create a custom role"}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Role name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="e.g. Senior Optometry Assistant"/></label><label className="text-sm font-medium">Based on<select disabled={!!editing} value={baseRole} onChange={e=>setBaseRole(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100">{BASE_ROLES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label className="text-sm font-medium sm:col-span-2">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Describe the responsibilities for this role"/></label></div>
      <div className="mt-5 space-y-4">{Object.entries(grouped).map(([group,items])=><fieldset key={group} className="rounded-lg border border-slate-200 p-3"><legend className="px-1 text-sm font-semibold capitalize">{group} permissions</legend><div className="grid gap-2 sm:grid-cols-2">{items.map(p=><label key={p.key} className="flex items-start gap-2 text-sm"><span className="min-w-0 flex-1"><span className="font-medium">{p.label}</span><span className="block text-xs text-slate-500">{p.key}</span></span><select aria-label={p.label+" permission"} value={Object.prototype.hasOwnProperty.call(permissions,p.key)?(permissions[p.key]?"allow":"deny"):"inherit"} onChange={e=>setPermissions(old=>{const next={...old};if(e.target.value==="inherit")delete next[p.key];else next[p.key]=e.target.value==="allow";return next;})} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"><option value="inherit">Inherit</option><option value="allow">Allow</option><option value="deny">Deny</option></select></label>)}</div></fieldset>)}</div>
      <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy||!name.trim()} onClick={()=>void save()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?"Saving…":editing?"Save changes":"Create role"}</button>{editing&&<button onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>}</div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Existing custom roles <span className="text-sm font-normal text-slate-500">({roles.length})</span></h2><div className="mt-4 space-y-3">{roles.length===0&&<p className="text-sm text-slate-500">No custom roles yet.</p>}{roles.map(role=><article key={role.id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold">{role.name}</h3><p className="text-xs text-slate-500">Based on {role.base_role.replaceAll("_"," ")}</p>{role.description&&<p className="mt-1 text-sm text-slate-600">{role.description}</p>}</div><span className={role.is_active?"rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700":"rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"}>{role.is_active?"Active":"Inactive"}</span></div><p className="mt-2 text-xs text-slate-500">{Object.values(role.permissions??{}).filter(Boolean).length} permission overrides enabled</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>startEdit(role)} className="rounded-md border px-3 py-1.5 text-xs font-medium">Edit</button><button onClick={()=>void toggle(role)} disabled={busy} className="rounded-md border px-3 py-1.5 text-xs font-medium">{role.is_active?"Deactivate":"Activate"}</button><button onClick={()=>void remove(role)} disabled={busy} className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700">Delete</button></div></article>)}</div></section>
    </div>
  </div></main>;
}
