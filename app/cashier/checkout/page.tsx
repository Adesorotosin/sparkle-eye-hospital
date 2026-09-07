"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  X,
  ShieldAlert,
  Info,
  Calendar,
  UserCheck,
  CheckCircle2,
  Percent,
  Banknote,
  Printer,
  LayoutDashboard,
  ArrowRight,
  History,
  Receipt,
} from "lucide-react";
import { usePatientFlow } from "@/context/PatientFlowContext";
import { PaymentMethod } from "@/types/hospital";

export default function BillingCheckoutView() {
  const router = useRouter();
  const { patient, applyDiscount, processPayment } = usePatientFlow();
  const { invoice } = patient;

  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("cash");

  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountInput, setDiscountInput] = useState(invoice.discountAmount.toString());
  const [reasonInput, setReasonInput] = useState("Staff discount / management approval");
  const [adminPinInput, setAdminPinInput] = useState("");
  const [discountError, setDiscountError] = useState("");

  const [amountRenderedInput, setAmountRenderedInput] = useState("70000");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [lastChangeDue, setLastChangeDue] = useState(0);

  const amountRendered = parseFloat(amountRenderedInput) || 0;
  const changeDue = Math.max(0, amountRendered - invoice.grandTotal);
  const isUnderpaid = amountRendered < invoice.grandTotal;

  const handleApplyDiscount = () => {
    setDiscountError("");
    const numericValue = parseFloat(discountInput) || 0;

    const success = applyDiscount(discountType, numericValue, reasonInput, adminPinInput);
    if (success) {
      setDiscountModalOpen(false);
      setAdminPinInput("");
    } else {
      setDiscountError("Invalid Admin PIN. Authorized PIN required (e.g. 1234).");
    }
  };

  const handleQuickCash = (amount: number) => {
    setAmountRenderedInput(amount.toString());
  };

  const handleProcessPayment = () => {
    const result = processPayment(selectedPayment, amountRendered);
    if (result.success) {
      setPaymentSuccess(true);
      setLastChangeDue(result.changeDue);
    } else {
      alert("Insufficient amount rendered for this transaction.");
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="relative min-h-screen w-full bg-[#F3F0F7] text-slate-800 font-sans antialiased">
      {/* TOP HEADER */}
      <header className="w-full bg-[#3F1D85] text-white px-6 py-3.5 flex flex-col md:flex-row items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7E57C2] flex items-center justify-center font-bold text-white">
            ✦
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide">Sparkle Eye Specialist Hospital</h1>
            <p className="text-[11px] text-purple-200/80 font-medium">Hospital Billing & Cashier Console</p>
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

      {/* PATIENT BAR */}
      <div className="w-full bg-[#5E35B1] text-white px-6 py-2.5 text-xs font-semibold flex items-center gap-2 print:hidden">
        <span>Patient:</span>
        <span className="text-purple-200">{patient.fullName}</span>
        <span className="text-purple-400">|</span>
        <span>ID:</span>
        <span className="text-purple-200">{patient.patientId}</span>
        <span className="text-purple-400">|</span>
        <span>Coverage Plan:</span>
        <span className="text-purple-200">{patient.coveragePlan}</span>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Itemized Bill */}
        <section className="lg:col-span-7 bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-sm space-y-6 print:w-full print:shadow-none print:border-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Itemized Bill</h2>
              <p className="text-xs text-slate-500 font-medium">Invoice No: #{invoice.invoiceNo}</p>
            </div>
            <span
              className={`px-3 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider ${
                invoice.status === "paid"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {invoice.status}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-12 font-bold text-slate-400 border-b border-slate-200 pb-2">
              <span className="col-span-7">ITEM NAME</span>
              <span className="col-span-2 text-center">QTY</span>
              <span className="col-span-3 text-right">AMOUNT</span>
            </div>

            <div className="space-y-2.5 font-medium text-slate-700">
              {invoice.items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 items-center">
                  <span className="col-span-7 text-slate-800 font-semibold">{item.name}</span>
                  <span className="col-span-2 text-center text-slate-500">{item.quantity}</span>
                  <span className="col-span-3 text-right text-slate-900 font-bold">
                    ₦{item.totalPrice.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold">₦{invoice.subtotal.toLocaleString()}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold items-center">
                <span className="flex items-center gap-1">
                  Discount Approved <Lock className="w-3 h-3" />
                </span>
                <span>-₦{invoice.discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>VAT (0%)</span>
              <span>₦0.00</span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
              <div className="flex items-center gap-1.5">
                <span>Grand Total</span>
                {invoice.status !== "paid" && (
                  <button
                    onClick={() => setDiscountModalOpen(true)}
                    className="text-xs font-semibold text-[#5E35B1] hover:underline flex items-center gap-1 print:hidden"
                  >
                    <Lock className="w-3 h-3" /> Apply Discount
                  </button>
                )}
              </div>
              <span className="text-base text-[#5E35B1]">₦{invoice.grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl flex items-center gap-2 text-[11px] text-slate-600 print:hidden">
            <Info className="w-4 h-4 text-[#5E35B1] shrink-0" />
            <span>All transactions are logged permanently and cannot be deleted or modified after processing.</span>
          </div>
        </section>

        {/* RIGHT COLUMN: Interactive Payment Console */}
        <section className="lg:col-span-5 bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-sm space-y-6 print:hidden">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {paymentSuccess || invoice.status === "paid" ? "Post-Payment Actions" : "Payment Method"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {paymentSuccess || invoice.status === "paid"
                ? "Transaction complete. Proceed with post-payment workflow."
                : "Select the patient's preferred transaction channel"}
            </p>
          </div>

          {paymentSuccess || invoice.status === "paid" ? (
            <div className="space-y-5">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-left space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">Payment Completed</h3>
                    <p className="text-xs text-emerald-800 font-medium">
                      Invoice #{invoice.invoiceNo} marked as <span className="font-bold uppercase text-emerald-900">PAID</span>
                    </p>
                  </div>
                </div>

                {lastChangeDue > 0 && (
                  <div className="mt-3 p-2.5 bg-emerald-100/60 border border-emerald-300/50 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>Change Returned:</span>
                    <span className="text-sm">₦{lastChangeDue.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={handlePrintReceipt}
                  className="w-full p-3.5 bg-white border border-slate-300 hover:border-[#5E35B1] hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5E35B1]">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">Print Patient Receipt</p>
                      <p className="text-[11px] text-slate-500 font-normal">Generate physical or PDF receipt copy</p>
                    </div>
                  </div>
                  <Receipt className="w-4 h-4 text-slate-400 group-hover:text-[#5E35B1] transition" />
                </button>

                <button
                  onClick={() => router.push("/cashier")}
                  className="w-full p-3.5 bg-[#5E35B1] hover:bg-[#4527A0] text-white rounded-xl text-xs font-bold transition flex items-center justify-between shadow-xs group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                      <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">Return to Cashier Dashboard</p>
                      <p className="text-[11px] text-purple-100/80 font-normal">Back to queue overview and shift summary</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-purple-200 group-hover:translate-x-1 transition" />
                </button>
              </div>

              {patient.activityLogs && patient.activityLogs.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-slate-400" /> Recent Audit Entries
                    </span>
                    <span>{patient.activityLogs.length} Total</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {patient.activityLogs.slice(0, 2).map((log) => (
                      <div key={log.id} className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 flex items-start justify-between">
                        <div>
                          <span className="font-bold text-slate-800">[{log.module}]</span> {log.action}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2 text-xs font-semibold text-slate-700">
                {[
                  { id: "cash", name: "Cash Payment" },
                  { id: "pos", name: "POS Terminal" },
                  { id: "transfer", name: "Bank Transfer" },
                  { id: "card", name: "Debit/Credit Card" },
                  { id: "hmo", name: "HMO / Health Insurance" },
                ].map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      selectedPayment === method.id
                        ? "bg-[#EDE7F6] border-[#5E35B1] text-[#5E35B1]"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={selectedPayment === method.id}
                        onChange={() => setSelectedPayment(method.id as PaymentMethod)}
                        className="accent-[#5E35B1]"
                      />
                      <span>{method.name}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex justify-between text-xs font-bold text-slate-900">
                  <span>Amount Due:</span>
                  <span className="text-base font-extrabold text-[#5E35B1]">
                    ₦{invoice.grandTotal.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 block">Quick Cash Tender</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Exact", value: invoice.grandTotal },
                      { label: "₦50,000", value: 50000 },
                      { label: "₦70,000", value: 70000 },
                      { label: "₦100,000", value: 100000 },
                    ].map((tender, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleQuickCash(tender.value)}
                        className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200 transition"
                      >
                        {tender.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 block">Amount Rendered (₦)</label>
                  <input
                    type="number"
                    value={amountRenderedInput}
                    onChange={(e) => setAmountRenderedInput(e.target.value)}
                    className={`w-full p-2.5 bg-white border rounded-xl font-bold text-sm text-slate-900 focus:outline-none ${
                      isUnderpaid ? "border-amber-400 focus:border-amber-500" : "border-slate-300 focus:border-[#5E35B1]"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-700 block">Change Due</span>
                    <span className="text-sm font-bold text-emerald-800">
                      ₦{changeDue.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 block">Outstanding Balance</span>
                    <span className={`text-sm font-bold ${isUnderpaid ? "text-amber-700" : "text-slate-800"}`}>
                      ₦{isUnderpaid ? (invoice.grandTotal - amountRendered).toLocaleString() : "0.00"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleProcessPayment}
                  disabled={isUnderpaid}
                  className={`w-full py-3 font-bold text-xs rounded-xl shadow-sm transition ${
                    isUnderpaid
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-[#5E35B1] hover:bg-[#4527A0] text-white cursor-pointer"
                  }`}
                >
                  {isUnderpaid ? "Insufficient Amount Rendered" : "Process Payment & Issue Receipt"}
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      {/* DISCOUNT AUTHORIZATION MODAL */}
      {discountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#5E35B1]">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Discount Authorization</h3>
              </div>
              <button onClick={() => setDiscountModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {discountError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {discountError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Discount Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType("fixed")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                      discountType === "fixed"
                        ? "bg-[#EDE7F6] border-[#5E35B1] text-[#5E35B1]"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" /> Flat Amount (₦)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("percentage")}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                      discountType === "percentage"
                        ? "bg-[#EDE7F6] border-[#5E35B1] text-[#5E35B1]"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" /> Percentage (%)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  {discountType === "fixed" ? "Discount Amount (₦)" : "Discount Percentage (%)"}
                </label>
                <input
                  type="number"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder={discountType === "fixed" ? "e.g. 5000" : "e.g. 10"}
                  className="w-full p-2.5 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#5E35B1]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Reason for Discount</label>
                <textarea
                  rows={2}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Admin Approval PIN (Try 1234)</label>
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Enter 1234"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs tracking-widest text-slate-900 focus:outline-none focus:border-[#5E35B1]"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center gap-2 text-[11px] font-medium text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>This action will be logged with timestamp and approver identity.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setDiscountModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyDiscount}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#5E35B1] hover:bg-[#4527A0] rounded-xl shadow-sm cursor-pointer"
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