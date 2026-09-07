'use client';

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
} from "lucide-react";

export default function ExecutiveOverviewDashboard() {
  const [timeRange, setTimeRange] = useState("Last 30 Days");
  const [department, setDepartment] = useState("All Departments");

  return (
    <div className="p-6 md:p-8 text-slate-800 font-sans antialiased max-w-7xl mx-auto space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Executive Overview
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Sparkle Eye Specialist Hospital &mdash; Management Portal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Filter */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer focus:outline-hidden shadow-2xs"
            >
              <option>Last 30 Days</option>
              <option>Last 7 Days</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Department Filter */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer focus:outline-hidden shadow-2xs"
            >
              <option>Department: All Departments</option>
              <option>Department: Ophthalmology</option>
              <option>Department: Surgery</option>
              <option>Department: Diagnostics</option>
              <option>Department: Pharmacy</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Export Button -> Routes to Reports */}
          <Link
            href="/admin/reports"
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export PDF/Excel
          </Link>
        </div>
      </div>

      {/* TOP KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Revenue -> Links to Reports */}
        <Link 
          href="/admin/reports" 
          className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs relative overflow-hidden border-l-4 border-l-indigo-600 hover:border-slate-300 transition-all"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Total Revenue
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            &#8358;42.5M
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-md">
            <TrendingUp className="w-3 h-3" />
            +12.4% <span className="text-slate-400 font-normal">vs last period</span>
          </div>
        </Link>

        {/* Card 2: Active Encounters -> Links to Patients EMR */}
        <Link 
          href="/patients"
          className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs relative overflow-hidden border-l-4 border-l-sky-500 hover:border-slate-300 transition-all"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Active Patient Encounters
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            1,240
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-md">
            <TrendingUp className="w-3 h-3" />
            +4.1% <span className="text-slate-400 font-normal">vs last period</span>
          </div>
        </Link>

        {/* Card 3: Average Wait Time -> Links to Triage Module */}
        <Link 
          href="/triage"
          className="group bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs relative overflow-hidden border-l-4 border-l-amber-500 hover:border-slate-300 transition-all"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Average Wait Time
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            18 mins
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-md">
            <TrendingDown className="w-3 h-3 text-emerald-600" />
            -2.5% <span className="text-slate-400 font-normal">vs last period</span>
          </div>
        </Link>

        {/* Card 4: OR Occupancy Rate */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs relative overflow-hidden border-l-4 border-l-emerald-500 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              OR Occupancy Rate
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              84%
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" />
              +8.0% <span className="text-slate-400 font-normal">vs last period</span>
            </div>
          </div>
          {/* Donut Gauge Badge */}
          <div className="relative w-12 h-12 rounded-full border-4 border-slate-100 border-t-emerald-500 border-r-emerald-500 flex items-center justify-center font-bold text-[10px] text-slate-700">
            84%
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Chart: Revenue vs HMO Claims */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
                Revenue vs. HMO Claims Clearance
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                30-day trend &mdash; all departments
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                Revenue
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                HMO Claims
              </span>
            </div>
          </div>

          {/* SVG Line Chart Graphic */}
          <div className="h-64 w-full relative pt-4">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 500 180"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeDasharray="4" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f5f9" strokeDasharray="4" />
              <line x1="0" y1="130" x2="500" y2="130" stroke="#f1f5f9" strokeDasharray="4" />

              {/* Area Fills */}
              <path
                d="M 0 110 Q 125 60 250 20 T 500 30 L 500 170 L 0 170 Z"
                fill="url(#indigoGrad)"
              />
              <path
                d="M 0 135 Q 125 95 250 65 T 500 75 L 500 170 L 0 170 Z"
                fill="url(#skyGrad)"
              />

              {/* Line 1: Revenue (Indigo) */}
              <path
                d="M 0 110 Q 125 60 250 20 T 500 30"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Line 2: HMO Claims (Sky Blue) */}
              <path
                d="M 0 135 Q 125 95 250 65 T 500 75"
                fill="none"
                stroke="#0284c7"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-4 border-t border-slate-100 pt-2">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
            </div>
          </div>
        </div>

        {/* Right Chart: Patient Volume by Specialty */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
              Patient Volume by Eye Specialty
            </h2>
            <p className="text-[11px] text-slate-400 font-medium mb-6">
              Current month
            </p>

            <div className="space-y-5">
              {/* Cataract */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1.5">
                  <span>Cataract</span>
                  <span>486 patients</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full w-[78%]"></div>
                </div>
              </div>

              {/* Glaucoma */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1.5">
                  <span>Glaucoma</span>
                  <span>312 patients</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full w-[58%]"></div>
                </div>
              </div>

              {/* Cornea */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1.5">
                  <span>Cornea</span>
                  <span>198 patients</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 rounded-full w-[38%]"></div>
                </div>
              </div>

              {/* Pediatric */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1.5">
                  <span>Pediatric</span>
                  <span>124 patients</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-300 rounded-full w-[22%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM TABLES & BREAKDOWN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Referring Physicians */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs">
          <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
            Top Referring Physicians
          </h2>
          <p className="text-[11px] text-slate-400 font-medium mb-5">
            Ranked by referral volume
          </p>

          <div className="space-y-4">
            {/* Dr. Adeyemo */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-[140px]">
                <span className="text-xs font-bold text-slate-400">1</span>
                <strong className="text-xs font-bold text-slate-900">
                  Dr. Adeyemo, O.
                </strong>
              </div>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full w-[85%]"></div>
              </div>
              <span className="text-xs font-extrabold text-slate-800 text-right min-w-[70px]">
                142 referrals
              </span>
            </div>

            {/* Dr. Okonkwo */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-[140px]">
                <span className="text-xs font-bold text-slate-400">2</span>
                <strong className="text-xs font-bold text-slate-900">
                  Dr. Okonkwo, C.
                </strong>
              </div>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full w-[60%]"></div>
              </div>
              <span className="text-xs font-extrabold text-slate-800 text-right min-w-[70px]">
                98 referrals
              </span>
            </div>

            {/* Dr. Ibrahim */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-[140px]">
                <span className="text-xs font-bold text-slate-400">3</span>
                <strong className="text-xs font-bold text-slate-900">
                  Dr. Ibrahim, H.
                </strong>
              </div>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full w-[50%]"></div>
              </div>
              <span className="text-xs font-extrabold text-slate-800 text-right min-w-[70px]">
                87 referrals
              </span>
            </div>

            {/* Dr. Mensah */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-[140px]">
                <span className="text-xs font-bold text-slate-400">4</span>
                <strong className="text-xs font-bold text-slate-900">
                  Dr. Mensah, K.
                </strong>
              </div>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-300 rounded-full w-[38%]"></div>
              </div>
              <span className="text-xs font-extrabold text-slate-800 text-right min-w-[70px]">
                63 referrals
              </span>
            </div>
          </div>
        </div>

        {/* Insurance Claims Summary */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">
              Insurance Claims Summary
            </h2>
            <p className="text-[11px] text-slate-400 font-medium mb-5">
              Claims value status breakdown
            </p>

            <div className="space-y-4">
              {/* Approved Claims */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Approved Claims
                  </span>
                  <strong className="font-extrabold text-slate-900">
                    &#8358;28.2M
                  </strong>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[78%]"></div>
                </div>
              </div>

              {/* Pending Review */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Pending Review
                  </span>
                  <strong className="font-extrabold text-slate-900">
                    &#8358;6.8M
                  </strong>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-[19%]"></div>
                </div>
              </div>

              {/* Rejected/Disputed */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="flex items-center gap-2 font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Rejected/Disputed
                  </span>
                  <strong className="font-extrabold text-slate-900">
                    &#8358;1.4M
                  </strong>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full w-[4%]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs mt-4">
            <span className="text-slate-500 font-bold">Total Submitted</span>
            <Link href="/billing" className="font-extrabold text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1 transition-colors">
              &#8358;36.4M <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}