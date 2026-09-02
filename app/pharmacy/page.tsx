'use client';

import React, { useState } from "react";
import {
  Search,
  ChevronRight,
  Info,
  Printer,
  CheckCircle,
  Pill,
  User,
  Calendar,
  CreditCard,
  ShieldAlert,
} from "lucide-react";

export default function PharmacyDispensingQueue() {
  const [selectedPrescription, setSelectedPrescription] = useState("Adebayo Funmi");

  const unfulfilledOrders = [
    { id: "1", name: "Adebayo Funmi", time: "10:42 AM" },
    { id: "2", name: "Chen Wei Lin", time: "10:38 AM" },
    { id: "3", name: "Priya Sharma", time: "10:15 AM" },
    { id: "4", name: "Emmanuel Okafor", time: "09:58 AM" },
    { id: "5", name: "Fatima Al-Rashid", time: "09:30 AM" },
  ];

  const readyOrders = [
    { id: "6", name: "James Mitchell", time: "09:12 AM" },
    { id: "7", name: "Oluwaseun Adeyemi", time: "08:55 AM" },
    { id: "8", name: "Sarah Nakamura", time: "08:30 AM" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex text-slate-800 font-sans antialiased selection:bg-purple-100 selection:text-purple-900">
      {/* LEFT SIDEBAR: PRESCRIPTION QUEUE */}
      <aside className="w-80 bg-[#0B132B] text-white flex flex-col shrink-0 border-r border-slate-800">
        {/* Brand & Terminal Info */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-white shadow-md">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-white">
                HospitalRx
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">
                Dispensing Console
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="mt-4 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search prescriptions..."
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition"
            />
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Unfulfilled Section */}
          <div>
            <div className="flex items-center gap-2 px-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                UNFULFILLED ({unfulfilledOrders.length})
              </h2>
            </div>
            <div className="space-y-1">
              {unfulfilledOrders.map((item) => {
                const isSelected = selectedPrescription === item.name;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedPrescription(item.name)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group ${
                      isSelected
                        ? "bg-slate-800 text-white border border-slate-700 shadow-xs"
                        : "text-slate-300 hover:bg-slate-800/50"
                    }`}
                  >
                    <div>
                      <strong className="text-xs font-bold block group-hover:text-white">
                        {item.name}
                      </strong>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        Received: {item.time}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ready For Pickup Section */}
          <div>
            <div className="flex items-center gap-2 px-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                READY FOR PICKUP ({readyOrders.length})
              </h2>
            </div>
            <div className="space-y-1">
              {readyOrders.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedPrescription(item.name)}
                  className="w-full text-left p-3 rounded-xl text-slate-300 hover:bg-slate-800/50 transition flex items-center justify-between group"
                >
                  <div>
                    <strong className="text-xs font-bold block group-hover:text-white">
                      {item.name}
                    </strong>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                      Received: {item.time}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Completed Footer Summary */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            COMPLETED
          </span>
          <span className="font-bold text-slate-300">12 today</span>
        </div>
      </aside>

      {/* RIGHT MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BREADCRUMB HEADER */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Dispensing Queue</span>
            <span>&rsaquo;</span>
            <span className="text-slate-900 font-bold">Order Detail</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            <span>Terminal active &mdash; Gate 4</span>
          </div>
        </header>

        {/* WORKSPACE AREA */}
        <main className="flex-1 p-8 overflow-y-auto max-w-[1400px] w-full mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            {/* Order Header Card */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {selectedPrescription}
                  </h1>
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    34M
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    MRN #PHR-90412
                  </span>
                </div>
              </div>

              <span className="px-3 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold">
                Unfulfilled
              </span>
            </div>

            {/* Prescribing Info Meta */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block">
                  PRESCRIBING PHYSICIAN
                </span>
                <strong className="font-bold text-slate-900 text-xs mt-0.5 block">
                  Dr. James Okoro &mdash; Ophthalmology
                </strong>
              </div>
              <div className="md:text-right">
                <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block">
                  DATE PRESCRIBED
                </span>
                <strong className="font-bold text-slate-900 text-xs mt-0.5 block">
                  Aug 29, 2026
                </strong>
              </div>
            </div>

            {/* Diagnosis Banner */}
            <div className="bg-slate-50/80 border border-slate-200/60 rounded-xl p-3.5 flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">
                DIAGNOSIS:
              </span>
              <strong className="font-bold text-slate-800">
                Post-Operative Cataract Care &mdash; OD
              </strong>
            </div>

            {/* Medication Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3">DRUG NAME</th>
                    <th className="pb-3">DOSAGE</th>
                    <th className="pb-3">ROUTE</th>
                    <th className="pb-3">DURATION</th>
                    <th className="pb-3">QTY TO DISPENSE</th>
                    <th className="pb-3">STOCK STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {/* Row 1 */}
                  <tr>
                    <td className="py-3.5">
                      <strong className="font-bold text-slate-900 block">
                        Pred Forte Eye Drops 1%
                      </strong>
                      <span className="text-[10px] text-slate-400">
                        Prednisolone Acetate
                      </span>
                    </td>
                    <td className="py-3.5">1 drop OS q2h</td>
                    <td className="py-3.5">Ophthalmic</td>
                    <td className="py-3.5">7 Days</td>
                    <td className="py-3.5 font-bold text-slate-900">
                      1 bottle (5mL)
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200/60">
                        In Stock: 42 bottles
                      </span>
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr>
                    <td className="py-3.5">
                      <strong className="font-bold text-slate-900 block">
                        Moxifloxacin 0.5% Eye Drops
                      </strong>
                    </td>
                    <td className="py-3.5">1 drop OS qid</td>
                    <td className="py-3.5">Ophthalmic</td>
                    <td className="py-3.5">10 Days</td>
                    <td className="py-3.5 font-bold text-slate-900">
                      1 bottle (5mL)
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200/60">
                        In Stock: 28 bottles
                      </span>
                    </td>
                  </tr>

                  {/* Row 3 */}
                  <tr>
                    <td className="py-3.5">
                      <strong className="font-bold text-slate-900 block">
                        Ketorolac 0.5% Eye Drops
                      </strong>
                    </td>
                    <td className="py-3.5">1 drop OS qid</td>
                    <td className="py-3.5">Ophthalmic</td>
                    <td className="py-3.5">5 Days</td>
                    <td className="py-3.5 font-bold text-slate-900">
                      1 bottle (5mL)
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                        Low Stock: 6 bottles
                      </span>
                    </td>
                  </tr>

                  {/* Row 4 */}
                  <tr>
                    <td className="py-3.5">
                      <strong className="font-bold text-slate-900 block">
                        Acetazolamide 250mg Tablets
                      </strong>
                    </td>
                    <td className="py-3.5">250mg PO bid</td>
                    <td className="py-3.5">Oral</td>
                    <td className="py-3.5">3 Days</td>
                    <td className="py-3.5 font-bold text-slate-900">
                      6 tablets
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200/60">
                        In Stock: 340 tablets
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Inventory Deduction Notice Box */}
            <div className="bg-sky-50/80 border border-sky-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-sky-900">
              <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block">
                  Stock Deduct on Dispense
                </strong>
                <p className="text-[11px] text-sky-800 font-medium mt-0.5">
                  Dispensing will automatically deduct quantities from pharmacy
                  inventory. Low-stock items will trigger a reorder
                  notification to procurement.
                </p>
              </div>
            </div>

            {/* Special Instructions Box */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                SPECIAL INSTRUCTIONS
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Patient advised on proper eye drop administration technique.
                Shake Pred Forte well before use. Wait 5 minutes between
                different eye drops. Return for follow-up in 1 week.
              </p>
            </div>
          </div>
        </main>

        {/* BOTTOM FIXED ACTION BAR */}
        <footer className="bg-white border-t border-slate-200/80 px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky bottom-0 z-20">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              PRESCRIPTION TOTAL
            </span>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xl font-extrabold text-slate-900">
                &#8358;18,500.00
              </span>

              <span className="px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold">
                AXA Mansard HMO &mdash; Covers 80%
              </span>

              <span className="text-xs text-slate-600 font-medium">
                CO-PAY DUE:{" "}
                <strong className="font-extrabold text-purple-700">
                  &#8358;3,700.00
                </strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-2xs">
              <Printer className="w-4 h-4 text-slate-500" />
              Print Label
            </button>

            <button className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Dispense & Send to Billing
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}