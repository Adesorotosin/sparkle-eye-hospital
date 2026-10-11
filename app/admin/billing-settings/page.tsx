"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, Receipt, ShieldCheck } from "lucide-react";
import {
  getBillingVatSettings,
  saveBillingVatSettings,
} from "@/app/actions/vat-settings";

export default function AdminBillingSettingsPage() {
  const router = useRouter();
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatRate, setVatRate] = useState("5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    getBillingVatSettings().then((result) => {
      if (cancelled) return;
      if (!result.success || !result.settings) {
        setError(result.message || "Unable to load billing settings.");
        if (result.message.toLowerCase().includes("administrator")) {
          router.replace("/unauthorized");
        }
        return;
      }
      setVatEnabled(result.settings.vatEnabled);
      setVatRate(String(result.settings.vatRate));
    }).catch(() => {
      if (!cancelled) setError("Unable to load billing settings.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [router]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const parsedRate = Number(vatRate);
    if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      setError("Enter a VAT rate between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      const result = await saveBillingVatSettings({
        vatEnabled,
        vatRate: parsedRate,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setNotice(result.message);
    } catch {
      setError("VAT settings could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading billing settings…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Executive Overview
        </Link>

        <header className="rounded-2xl bg-[#3F1D85] p-6 text-white shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/10 p-3">
              <Receipt className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-200">Administrator controls</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Billing & VAT Settings</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100">
                Configure whether VAT is applied to unpaid invoices and set the hospital's VAT rate. Cashiers can collect payment but cannot change this policy.
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <section className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-violet-50 p-2 text-violet-700"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h2 className="font-bold text-slate-900">VAT policy</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">Turn VAT on or off for invoices that have not yet been paid.</p>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={vatEnabled}
                onChange={(event) => setVatEnabled(event.target.checked)}
                className="mt-1 h-4 w-4 accent-violet-700"
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">Apply VAT to unpaid invoices</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {vatEnabled ? "VAT will be calculated automatically using the rate below." : "VAT will be set to 0% on unpaid invoices. The saved rate is kept for when VAT is enabled again."}
                </span>
              </span>
            </label>

            <div className="max-w-sm space-y-2">
              <label htmlFor="vat-rate" className="block text-sm font-semibold text-slate-700">VAT rate (%)</label>
              <div className="relative">
                <input
                  id="vat-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={vatRate}
                  onChange={(event) => setVatRate(event.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm font-semibold outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
              </div>
              <p className="text-xs text-slate-500">Enter 5 for 5%. The rate is validated on the server as well.</p>
            </div>
          </section>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <strong>Important:</strong> Saving changes recalculates draft and pending invoices. Paid or cancelled invoices retain their recorded VAT rate and totals. The administrator change is recorded in the activity log.
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <LockKeyhole className="h-4 w-4" />
              Restricted to IT administrators
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5E35B1] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#4b2796] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? "Saving policy…" : "Save VAT policy"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
