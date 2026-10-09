"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Download, ArrowUpRight } from "lucide-react";

interface AdminStats {
  totalRevenue: number;
  activePatientEncounters: number;
  totalStaff: number;
  lowStockCount: number;
  todaysAppointments: number;
}

interface RevenuePoint {
  label: string;
  revenue: number;
}

interface SpecialtyVolume {
  specialty: string;
  patients: number;
}

interface ReferringPhysician {
  physician: string;
  referrals: number;
}

interface AdminAnalytics {
  revenueTrend: RevenuePoint[];
  patientVolumeBySpecialty: SpecialtyVolume[];
  specialtyTracked: boolean;
  topReferringPhysicians: ReferringPhysician[];
  referralTracked: boolean;
  claimsModuleAvailable: boolean;
  claimsSummary: {
    approved: number;
    pending: number;
    rejected: number;
    total: number;
  } | null;
  error?: string;
}

const currency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

export default function ExecutiveOverviewDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/admin/stats").then(async (response) => {
        if (!response.ok) throw new Error("Unable to load dashboard totals.");
        return response.json();
      }),
      fetch("/api/admin/analytics").then(async (response) => {
        if (!response.ok) throw new Error("Unable to load dashboard analytics.");
        return response.json();
      }),
    ])
      .then(([statsData, analyticsData]) => {
        if (cancelled) return;
        setStats(statsData);
        setAnalytics(analyticsData);
        setAnalyticsError("");
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Admin dashboard loading error:", error);
          setAnalyticsError("Some dashboard data could not be loaded. Please refresh the page.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAnalytics(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const chart = useMemo(() => {
    const values = analytics?.revenueTrend ?? [];
    const maxValue = Math.max(1, ...values.map((item) => item.revenue));
    const points = values.map((item, index) => {
      const x = values.length <= 1 ? 250 : 12 + (index * 476) / (values.length - 1);
      const y = 150 - (item.revenue / maxValue) * 120;
      return { x, y };
    });
    return {
      line: points.map((point) => `${point.x},${point.y}`).join(" "),
      area: points.length
        ? `12,160 ${points.map((point) => `${point.x},${point.y}`).join(" ")} 488,160`
        : "",
      values,
    };
  }, [analytics]);

  const maxSpecialtyCount = Math.max(
    1,
    ...(analytics?.patientVolumeBySpecialty ?? []).map((item) => item.patients)
  );
  const maxReferralCount = Math.max(
    1,
    ...(analytics?.topReferringPhysicians ?? []).map((item) => item.referrals)
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6 font-sans text-slate-800 antialiased md:p-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Executive Overview</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Sparkle Eye Specialist Hospital — Management Portal</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Last 30 Days
          </span>
          <Link href="/admin/reports" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            <Download className="h-3.5 w-3.5 text-slate-500" />
            Export Reports
          </Link>
        </div>
      </header>

      {analyticsError && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {analyticsError}
        </div>
      )}

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/reports" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-300">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Revenue</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {stats ? currency(stats.totalRevenue) : "Loading…"}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">From all paid invoices</p>
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Patient Encounters</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {stats ? stats.activePatientEncounters.toLocaleString() : "Loading…"}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">Patients with an unpaid invoice in progress</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Wait Time</p>
          <p className="mt-2 text-2xl font-black text-slate-400">Not tracked</p>
          <p className="mt-2 text-[11px] text-slate-500">Requires queue arrival and service timestamps</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Operating Theatre Occupancy</p>
          <p className="mt-2 text-2xl font-black text-slate-400">Not tracked</p>
          <p className="mt-2 text-[11px] text-slate-500">Requires theatre scheduling data</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-8">
          <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Revenue Trend</h2>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Revenue from paid invoices over the last 30 days</p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-full bg-violet-600" /> Revenue</span>
            </div>
          </div>
          {loadingAnalytics ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-400">Loading revenue trend…</div>
          ) : (
            <>
              {chart.values.some((item) => item.revenue > 0) ? (
                <div className="w-full">
                  <svg className="h-56 w-full" viewBox="0 0 500 180" preserveAspectRatio="none" role="img" aria-label="Revenue by week for the last 30 days">
                    {[30, 70, 110, 150].map((y) => <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />)}
                    <polygon points={chart.area} fill="#6d4aff" fillOpacity="0.12" />
                    <polyline points={chart.line} fill="none" stroke="#6d4aff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {chart.values.map((item, index) => {
                      const x = chart.values.length <= 1 ? 250 : 12 + (index * 476) / (chart.values.length - 1);
                      const maxValue = Math.max(1, ...chart.values.map((entry) => entry.revenue));
                      const y = 150 - (item.revenue / maxValue) * 120;
                      return <circle key={item.label} cx={x} cy={y} r="4" fill="#6d4aff" />;
                    })}
                  </svg>
                  <div className="mt-2 grid grid-cols-4 border-t border-slate-100 pt-2 text-[11px] font-bold text-slate-400">
                    {chart.values.map((item) => <div key={item.label} className="text-center">{item.label}</div>)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {chart.values.map((item) => (
                      <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2 sm:col-span-1">
                        <p className="text-[10px] font-semibold text-slate-500">{item.label} revenue</p>
                        <p className="mt-1 text-sm font-bold text-slate-800">{currency(item.revenue)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-56 flex-col items-center justify-center rounded-xl bg-slate-50 px-5 text-center">
                  <p className="text-sm font-semibold text-slate-700">No paid invoice revenue recorded in this period</p>
                  <p className="mt-1 text-xs text-slate-500">The chart will populate when paid invoices have a payment date.</p>
                </div>
              )}
              <p className="mt-4 rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs text-sky-800">
                HMO claims cannot be compared yet because this application does not have an insurance claims register. No sample claim figures are shown.
              </p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Patient Volume by Eye Specialty</h2>
          <p className="mb-5 mt-1 text-[11px] font-medium text-slate-500">Based on recorded patient specialty</p>
          {loadingAnalytics ? <p className="py-10 text-center text-sm text-slate-400">Loading specialty data…</p> : analytics?.patientVolumeBySpecialty.length ? (
            <div className="space-y-5">
              {analytics.patientVolumeBySpecialty.map((item, index) => (
                <div key={item.specialty}>
                  <div className="mb-1.5 flex justify-between gap-3 text-xs font-bold text-slate-800">
                    <span>{item.specialty}</span><span>{item.patients.toLocaleString()} patients</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${(item.patients / maxSpecialtyCount) * 100}%`, opacity: Math.max(0.45, 1 - index * 0.12) }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold">{analytics?.specialtyTracked ? "No specialty records for this period." : "Specialty data is not being recorded yet."}</p>
              <p className="mt-1 text-xs text-slate-500">Counts will appear when patient records include an eye specialty.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-6">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Top Referring Physicians</h2>
          <p className="mb-5 mt-1 text-[11px] font-medium text-slate-500">Ranked by referrals recorded against patient records</p>
          {loadingAnalytics ? <p className="py-10 text-center text-sm text-slate-400">Loading referral data…</p> : analytics?.topReferringPhysicians.length ? (
            <div className="space-y-4">
              {analytics.topReferringPhysicians.map((item, index) => (
                <div key={item.physician} className="flex items-center gap-3">
                  <span className="w-4 text-xs font-bold text-slate-400">{index + 1}</span>
                  <strong className="min-w-0 flex-1 truncate text-xs font-bold text-slate-900">{item.physician}</strong>
                  <div className="h-2 w-1/4 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${(item.referrals / maxReferralCount) * 100}%` }} />
                  </div>
                  <span className="min-w-[85px] text-right text-xs font-extrabold text-slate-700">{item.referrals} referrals</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold">{analytics?.referralTracked ? "No referring physician records found." : "Referral sources are not being recorded yet."}</p>
              <p className="mt-1 text-xs text-slate-500">The ranking will populate once patient records capture a referring physician.</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Insurance Claims Summary</h2>
              <p className="mb-5 mt-1 text-[11px] font-medium text-slate-500">Claims value by review status</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">Module not configured</span>
          </div>
          <div className="rounded-xl border border-dashed border-slate-300 p-5">
            <p className="text-sm font-bold text-slate-800">No insurance claims data available</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              This application does not yet have a claims register for submitted, approved, pending, or rejected HMO claims. These figures will remain unavailable until we build the module and begin recording claims.
            </p>
            <button type="button" onClick={() => window.location.assign("/admin/reports")} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-900">
              View available reports <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
            <span className="font-bold text-slate-500">Total claims submitted</span>
            <span className="font-extrabold text-slate-400">Not available</span>
          </div>
        </div>
      </section>
    </main>
  );
}
