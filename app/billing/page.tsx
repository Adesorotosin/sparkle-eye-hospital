"use client";

import React, { useState } from "react";
import {
  Lock,
  X,
  CreditCard,
  Building2,
  CheckCircle2,
  ShieldAlert,
  Info,
  Calendar,
  UserCheck,
} from "lucide-react";

export default function BillingCheckoutView() {
  const [discountModalOpen, setDiscountModalOpen] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState("cash");

  const [discountAmount, setDiscountAmount] = useState("5000");
  const [reason, setReason] = useState(
    "Staff discount / loyalty program / management approval"
  );
  const [adminPin, setAdminPin] = useState("••••");

  // Calculations
  const originalTotal = 69700;
  const numericDiscount = parseFloat(discountAmount) || 0;
  const grandTotal = Math.max(0, originalTotal - numericDiscount);

  return (
    <div className="relative min-h-screen w-full bg-[#E5E9EE] text-slate-800 font-sans antialiased">
      {/* TOP HEADER */}
      <header className="w-full bg-[#0F3A48] text-white px-6 py-3.5 flex flex-col md:flex-row items-center justify-between shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00A3BF] flex items-center justify-center font-bold text-white">
            ✦
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">
              Sparkle Eye Specialist Hospital
            </h1>
            <p className="text-[11px] text-teal-200/80 font-medium">
              Hospital Billing & Cashier Console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-teal-100 font-medium">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-teal-300" />
            <span>
              Cashier: <strong className="text-white">Folake Adeyemi</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 border-l border-teal-800 pl-6">
            <Calendar className="w-4 h-4 text-teal-300" />
            <span>Aug 27, 2026</span>
          </div>
        </div>
      </header>

      {/* PATIENT BAR */}
      <div className="w-full bg-[#386273] text-white px-6 py-2.5 text-xs font-semibold flex items-center gap-2">
        <span>Patient:</span>
        <span className="text-teal-200">Mrs. Chidinma Okafor</span>
        <span className="text-teal-400">|</span>
        <span>ID:</span>
        <span className="text-teal-200">SPK-30892</span>
        <span className="text-teal-400">|</span>
        <span>Coverage Plan:</span>
        <span className="text-teal-200">Private Cash</span>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Itemized Bill */}
        <section className="lg:col-span-7 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Itemized Bill
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Invoice No: #INV-2026-4851
              </p>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-md uppercase tracking-wider">
              Draft Invoice
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between font-bold text-slate-400 border-b border-slate-200 pb-2">
              <span>ITEM NAME</span>
            </div>

            <div className="space-y-2.5 font-medium text-slate-700">
              <div className="flex justify-between">
                <span>Consultation Fee</span>
              </div>
              <div className="flex justify-between">
                <span>Comprehensive Eye Exam</span>
              </div>
              <div className="flex justify-between">
                <span>Tonometer (IOP Test)</span>
              </div>
              <div className="flex justify-between">
                <span>Timolol Maleate 0.5%</span>
              </div>
              <div className="flex justify-between">
                <span>Prednisolone Acetate 1%</span>
              </div>
              <div className="flex justify-between">
                <span>Protective Eye Shield</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold items-center">
              <span className="flex items-center gap-1">
                Discount Approved <Lock className="w-3 h-3" />
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT (0%)</span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
              <div className="flex items-center gap-1.5">
                <span>Grand Total</span>
                <button
                  onClick={() => setDiscountModalOpen(true)}
                  className="text-xs font-semibold text-[#0B7285] hover:underline flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" /> Apply Discount
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-[11px] text-slate-500">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              All transactions are logged permanently and cannot be deleted or
              modified after processing.
            </span>
          </div>
        </section>

        {/* RIGHT COLUMN: Payment Method */}
        <section className="lg:col-span-5 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Payment Method
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Select the patient's preferred transaction channel
            </p>
          </div>

          {/* Radio Group Options */}
          <div className="space-y-2.5 text-xs font-semibold text-slate-700">
            <label
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                selectedPayment === "cash"
                  ? "bg-[#E6F4F1] border-[#0B7285] text-[#0B7285]"
                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment"
                  checked={selectedPayment === "cash"}
                  onChange={() => setSelectedPayment("cash")}
                  className="accent-[#0B7285]"
                />
                <span>Cash Payment</span>
              </div>
            </label>

            {[
              { id: "pos", name: "POS Terminal" },
              { id: "transfer", name: "Bank Transfer" },
              { id: "card", name: "Debit/Credit Card" },
              { id: "hmo", name: "HMO / Health Insurance" },
            ].map((method) => (
              <label
                key={method.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  selectedPayment === method.id
                    ? "bg-[#E6F4F1] border-[#0B7285] text-[#0B7285]"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={selectedPayment === method.id}
                    onChange={() => setSelectedPayment(method.id)}
                    className="accent-[#0B7285]"
                  />
                  <span>{method.name}</span>
                </div>
              </label>
            ))}
          </div>

          {/* Amount Summary Box */}
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-xs font-bold text-slate-900">
              <span>Amount Due:</span>
              <span className="text-base font-extrabold text-slate-900">
                ₦{grandTotal.toLocaleString()}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500">
                Amount Rendered
              </label>
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-sm text-slate-900">
                ₦70,000
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-700 block">
                  Change Due
                </span>
                <span className="text-sm font-bold text-emerald-800">
                  ₦5,300
                </span>
              </div>
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 block">
                  Outstanding Balance
                </span>
                <span className="text-sm font-bold text-slate-800">₦0.00</span>
              </div>
            </div>

            <button className="w-full py-3 bg-[#0B7285] hover:bg-[#085260] text-white font-bold text-xs rounded-xl shadow-sm transition">
              Process Payment & Issue Receipt
            </button>

            <button className="w-full py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
              Save as Pending Bill
            </button>
          </div>
        </section>
      </main>

      {/* DISCOUNT AUTHORIZATION MODAL OVERLAY */}
      {discountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-[#0B7285]">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Discount Authorization Required
                </h3>
              </div>
              <button
                onClick={() => setDiscountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Original Bill Summary */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Original Bill Total:</span>
                <span className="text-sm font-extrabold text-slate-900">
                  ₦{originalTotal.toLocaleString()}
                </span>
              </div>

              {/* Discount Amount Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Discount Amount (₦)
                </label>
                <input
                  type="text"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-full p-2.5 bg-white border border-teal-500 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B7285]/20"
                />
              </div>

              {/* Reason Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Reason for Discount
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0B7285] resize-none"
                />
              </div>

              {/* Admin PIN Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Admin Approval PIN
                </label>
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs tracking-widest text-slate-900 focus:outline-none focus:border-[#0B7285]"
                />
              </div>

              {/* Warning Banner */}
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center gap-2 text-[11px] font-medium text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  This action will be logged with timestamp and approver identity.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDiscountModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setDiscountModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#0B7285] hover:bg-[#085260] rounded-xl shadow-sm transition"
                >
                  Authorize Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}