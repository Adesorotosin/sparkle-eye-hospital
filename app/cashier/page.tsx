"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Clock,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Calendar,
  Receipt,
  Filter,
} from "lucide-react";
import { usePatientFlow } from "@/context/PatientFlowContext";

export default function CashierDashboard() {
  const router = useRouter();
  const { patient } = usePatientFlow();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");

  const queueList = [
    {
      id: "PAT-2026-089",
      fullName: patient.patientId === "PAT-2026-089" ? patient.fullName : "Amina Bello",
      coveragePlan: "HMO - AXA Mansard",
      status: patient.patientId === "PAT-2026-089" ? patient.invoice.status : "pending",
      grandTotal: patient.patientId === "PAT-2026-089" ? patient.invoice.grandTotal : 45000,
      timeInQueue: "10:45 AM",
      doctor: "Dr. Adebayo",
    },
    {
      id: "PAT-2026-090",
      fullName: "Chukwudi Okeke",
      coveragePlan: "Private / Out-of-Pocket",
      status: "pending",
      grandTotal: 28500,
      timeInQueue: "11:12 AM",
      doctor: "Dr. Nnamdi",
    },
    {
      id: "PAT-2026-091",
      fullName: "Folashade Adekunle",
      coveragePlan: "HMO - Hygeia",
      status: "paid",
      grandTotal: 15000,
      timeInQueue: "09:30 AM",
      doctor: "Dr. Sarah",
    },
  ];

  const filteredQueue = queueList.filter((item) => {
    const matchesSearch =
      item.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectPatientToCheckout = () => {
    router.push("/cashier/checkout");
  };

  return (
    <div className="min-h-screen w-full bg-[#F3F0F7] text-slate-800 font-sans antialiased">
      {/* TOP HEADER */}
      <header className="w-full bg-[#3F1D85] text-white px-6 py-3.5 flex flex-col md:flex-row items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7E57C2] flex items-center justify-center font-bold text-white shadow-xs">
            ✦
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">Sparkle Eye Specialist Hospital</h1>
            <p className="text-[11px] text-purple-200/80 font-medium">Cashier Dashboard & Billing Queue</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-purple-100 font-medium">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-300" />
            <span>Cashier: <strong className="text-white">Folake Adeyemi</strong></span>
          </div>
          <div className="flex items-center gap-2 border-l border-purple-800 pl-6">
            <Calendar className="w-4 h-4 text-purple-300" />
            <span>Sep 4, 2026</span>
          </div>
        </div>
      </header>

      {/* SUB-NAV / METRICS BAR */}
      <div className="bg-[#5E35B1] text-white px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">Pending Checkout</p>
            <p className="text-xl font-extrabold text-white">2 Patients</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">Completed Today</p>
            <p className="text-xl font-extrabold text-white">14 Invoices</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">Total Revenue (Shift)</p>
            <p className="text-xl font-extrabold text-white">₦685,000</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-400/20 text-purple-200 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">Active Register</p>
            <p className="text-xl font-extrabold text-white">POS Terminal #02</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-400/20 text-purple-200 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MAIN QUEUE CONTENT */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#5E35B1]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Filter Status:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === "all" ? "bg-[#5E35B1] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === "pending" ? "bg-[#5E35B1] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter("paid")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === "paid" ? "bg-[#5E35B1] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Paid
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Patient Info</th>
                  <th className="py-3 px-4">Coverage Plan</th>
                  <th className="py-3 px-4">Attending Doctor</th>
                  <th className="py-3 px-4">Time in Queue</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-purple-50/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.fullName}</div>
                      <div className="text-[11px] text-slate-400">{item.id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{item.coveragePlan}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.doctor}</td>
                    <td className="py-3.5 px-4 text-slate-500">{item.timeInQueue}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₦{item.grandTotal.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                          item.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={handleSelectPatientToCheckout}
                        className="px-3.5 py-2 bg-[#5E35B1] hover:bg-[#4527A0] text-white rounded-xl font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5 group cursor-pointer"
                      >
                        <span>{item.status === "paid" ? "View Receipt" : "Checkout"}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}