"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
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
  LogOut,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import {
  applyBillingDiscount,
  getBillingPatient,
  processBillingPayment,
  type BillingPaymentMethod,
  type DiscountType,
} from "@/app/actions/billing";

import type { PatientRecord } from "@/types/hospital";

export default function BillingCheckoutView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientCodeFromUrl =
    searchParams.get("patientId") ??
    searchParams.get("patientCode") ??
    "";

  const [patient, setPatient] =
    useState<PatientRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [discountModalOpen, setDiscountModalOpen] =
    useState(false);

  const [selectedPayment, setSelectedPayment] =
    useState<BillingPaymentMethod>("cash");

  const [discountType, setDiscountType] =
    useState<DiscountType>("fixed");

  const [discountInput, setDiscountInput] =
    useState("");

  const [reasonInput, setReasonInput] = useState(
    "Staff discount / management approval"
  );

  const [adminPinInput, setAdminPinInput] =
    useState("");

  const [discountError, setDiscountError] =
    useState("");

  const [amountRenderedInput, setAmountRenderedInput] =
    useState("");

  const [paymentSuccess, setPaymentSuccess] =
    useState(false);

  const [lastChangeDue, setLastChangeDue] =
    useState(0);

  const [processingPayment, setProcessingPayment] =
    useState(false);

  const [processingDiscount, setProcessingDiscount] =
    useState(false);

  const loadBillingPatient = async () => {
    setLoading(true);
    setError("");

    try {
      const result =
        await getBillingPatient(patientCodeFromUrl);

      if (!result.success || !result.patient) {
        setPatient(null);
        setError(
          result.message ||
            "Unable to load the billing record."
        );
        return;
      }

      setPatient(result.patient);

      const total =
        Number(result.patient.invoice.grandTotal) || 0;

      setAmountRenderedInput(
        total > 0 ? String(total) : ""
      );

      if (result.patient.invoice.discountAmount > 0) {
        setDiscountInput(
          String(
            result.patient.invoice.discountAmount
          )
        );
      }
    } catch (err) {
      console.error(
        "Billing page load error:",
        err
      );

      setPatient(null);
      setError(
        "Unable to load the patient's billing record."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingPatient();
  }, [patientCodeFromUrl]);

  const invoice = patient?.invoice;

  const amountRendered =
    Number(amountRenderedInput) || 0;

  const grandTotal =
    Number(invoice?.grandTotal ?? 0);

  const isUnderpaid =
    selectedPayment === "cash" &&
    amountRendered < grandTotal;

  const changeDue = useMemo(() => {
    if (selectedPayment !== "cash") {
      return 0;
    }

    return Math.max(
      0,
      amountRendered - grandTotal
    );
  }, [
    selectedPayment,
    amountRendered,
    grandTotal,
  ]);

  const handleApplyDiscount = async () => {
    if (!patient) return;

    setDiscountError("");
    setProcessingDiscount(true);

    try {
      const numericValue =
        Number(discountInput);

      const result =
        await applyBillingDiscount({
          patientCode: patient.patientId,
          discountType,
          value: numericValue,
          reason: reasonInput,
          adminPin: adminPinInput,
        });

      if (!result.success) {
        setDiscountError(
          result.message ||
            "Unable to apply discount."
        );
        return;
      }

      setDiscountModalOpen(false);
      setAdminPinInput("");

      await loadBillingPatient();
    } catch (err) {
      console.error(
        "Discount application error:",
        err
      );

      setDiscountError(
        "An unexpected error occurred."
      );
    } finally {
      setProcessingDiscount(false);
    }
  };

  const handleQuickCash = (amount: number) => {
    setAmountRenderedInput(
      String(amount)
    );
  };

  const handleProcessPayment = async () => {
    if (!patient) return;

    if (
      selectedPayment === "cash" &&
      amountRendered < grandTotal
    ) {
      return;
    }

    setProcessingPayment(true);
    setError("");

    try {
      const result =
        await processBillingPayment({
          patientCode: patient.patientId,
          paymentMethod: selectedPayment,
          amountRendered,
        });

      if (!result.success) {
        setError(
          result.message ||
            "Unable to process payment."
        );
        return;
      }

      setPaymentSuccess(true);
      setLastChangeDue(
        result.changeDue ?? 0
      );

      await loadBillingPatient();
    } catch (err) {
      console.error(
        "Payment processing error:",
        err
      );

      setError(
        "An unexpected error occurred while processing payment."
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      console.error(
        "Logout API error:",
        err
      );
    } finally {
      const cookiesToClear = [
        "is_logged_in",
        "user_role",
        "staff_id",
        "auth_token",
        "token",
        "session",
        "next-auth.session-token",
      ];

      cookiesToClear.forEach((name) => {
        document.cookie =
          `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax;`;
      });

      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}

      window.location.href = "/";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F0F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#5E35B1]">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-semibold">
            Loading billing record...
          </p>
        </div>
      </div>
    );
  }

  if (!patient || !invoice) {
    return (
      <div className="min-h-screen bg-[#F3F0F7]">
        <header className="w-full bg-[#3F1D85] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/10 border border-white/20">
              <Image
                src="/logo.png"
                alt="Sparkle Eye Specialist Hospital Logo"
                width={40}
                height={40}
                className="object-contain p-1"
              />
            </div>

            <div>
              <h1 className="text-sm font-extrabold">
                Sparkle Eye Specialist Hospital
              </h1>
              <p className="text-[11px] text-purple-200">
                Hospital Billing & Cashier Console
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </header>

        <main className="max-w-xl mx-auto p-6">
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-900">
              Billing Record Not Found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {error ||
                "There is currently no pending billing record."}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={loadBillingPatient}
                className="px-4 py-2.5 rounded-xl bg-[#5E35B1] text-white text-xs font-bold flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                onClick={() =>
                  router.push("/cashier")
                }
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold"
              >
                Cashier Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#F3F0F7] text-slate-800 font-sans antialiased">
      {/* HEADER */}
      <header className="w-full bg-[#3F1D85] text-white px-6 py-3.5 flex flex-col md:flex-row items-center justify-between shadow-sm gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white/10 border border-white/20">
            <Image
              src="/logo.png"
              alt="Sparkle Eye Specialist Hospital Logo"
              width={40}
              height={40}
              className="object-contain p-1"
              priority
            />
          </div>

          <div>
            <h1 className="text-sm font-extrabold tracking-wide">
              Sparkle Eye Specialist Hospital
            </h1>

            <p className="text-[11px] text-purple-200/80 font-medium">
              Hospital Billing & Cashier Console
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-purple-100 font-medium">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-300" />

            <span>
              Cashier:{" "}
              <strong className="text-white">
                Folake Adeyemi
              </strong>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 border-l border-purple-800 pl-6">
            <Calendar className="w-4 h-4 text-purple-300" />
            <span>Today</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-500/30 font-semibold text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* PATIENT BAR */}
      <div className="w-full bg-[#5E35B1] text-white px-6 py-2.5 text-xs font-semibold flex flex-wrap items-center gap-2 print:hidden">
        <span>Patient:</span>

        <span className="text-purple-200 font-bold">
          {patient.fullName}
        </span>

        <span className="text-purple-400">
          |
        </span>

        <span>ID:</span>

        <span className="text-purple-200 font-bold">
          {patient.patientId}
        </span>

        <span className="text-purple-400">
          |
        </span>

        <span>Coverage Plan:</span>

        <span className="text-purple-200 font-bold">
          {patient.coveragePlan}
        </span>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-4 print:hidden">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BILL */}
        <section className="lg:col-span-7 bg-white rounded-2xl p-6 border border-purple-100 shadow-sm space-y-6 print:w-full print:shadow-none print:border-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Itemized Bill
              </h2>

              <p className="text-xs text-slate-500 font-medium">
                Invoice No: #
                {invoice.invoiceNo}
              </p>
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
              <span className="col-span-7">
                ITEM NAME
              </span>

              <span className="col-span-2 text-center">
                QTY
              </span>

              <span className="col-span-3 text-right">
                AMOUNT
              </span>
            </div>

            <div className="space-y-3 font-medium text-slate-700">
              {invoice.items.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  No billable items have been added yet.
                </div>
              ) : (
                invoice.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 items-center"
                  >
                    <div className="col-span-7">
                      <div className="font-semibold text-slate-800">
                        {item.name}
                      </div>

                      <div className="text-[10px] text-slate-400 uppercase">
                        {item.category}
                      </div>
                    </div>

                    <span className="col-span-2 text-center text-slate-500">
                      {item.quantity}
                    </span>

                    <span className="col-span-3 text-right text-slate-900 font-bold">
                      ₦
                      {item.totalPrice.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TOTALS */}
          <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>

              <span className="font-semibold">
                ₦
                {invoice.subtotal.toLocaleString()}
              </span>
            </div>

            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span className="flex items-center gap-1">
                  Discount Approved
                  <Lock className="w-3 h-3" />
                </span>

                <span>
                  -₦
                  {invoice.discountAmount.toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>VAT</span>
              <span>₦0.00</span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
              <div className="flex items-center gap-2">
                <span>
                  Grand Total
                </span>

                {invoice.status !== "paid" && (
                  <button
                    onClick={() => {
                      setDiscountError("");
                      setDiscountInput(
                        invoice.discountAmount > 0
                          ? String(
                              invoice.discountAmount
                            )
                          : ""
                      );
                      setDiscountModalOpen(true);
                    }}
                    className="text-xs font-semibold text-[#5E35B1] hover:underline flex items-center gap-1 print:hidden"
                  >
                    <Lock className="w-3 h-3" />
                    Apply Discount
                  </button>
                )}
              </div>

              <span className="text-base text-[#5E35B1] font-extrabold">
                ₦
                {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-[11px] text-slate-500 print:hidden">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />

            <span>
              All billing and payment actions are
              recorded in the hospital audit log.
            </span>
          </div>
        </section>

        {/* PAYMENT */}
        <section className="lg:col-span-5 bg-white rounded-2xl p-6 border border-purple-100 shadow-sm space-y-6 print:hidden">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {paymentSuccess ||
              invoice.status === "paid"
                ? "Post-Payment Actions"
                : "Payment Method"}
            </h2>

            <p className="text-xs text-slate-500 font-medium">
              {paymentSuccess ||
              invoice.status === "paid"
                ? "Transaction completed successfully."
                : "Select the patient's payment channel."}
            </p>
          </div>

          {paymentSuccess ||
          invoice.status === "paid" ? (
            <div className="space-y-5">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">
                      Payment Completed
                    </h3>

                    <p className="text-xs text-emerald-800">
                      Invoice #
                      {invoice.invoiceNo} is now{" "}
                      <strong>PAID</strong>.
                    </p>
                  </div>
                </div>

                {lastChangeDue > 0 && (
                  <div className="p-3 bg-emerald-100 border border-emerald-200 rounded-xl flex justify-between text-xs font-bold text-emerald-900">
                    <span>
                      Change Returned
                    </span>

                    <span>
                      ₦
                      {lastChangeDue.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handlePrintReceipt}
                className="w-full p-3.5 bg-white border border-slate-300 hover:border-[#5E35B1] text-slate-800 rounded-xl text-xs font-bold flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-[#5E35B1]">
                    <Printer className="w-4 h-4" />
                  </div>

                  <div className="text-left">
                    <p>
                      Print Patient Receipt
                    </p>

                    <p className="text-[11px] text-slate-500 font-normal">
                      Generate physical or PDF receipt copy
                    </p>
                  </div>
                </div>

                <Receipt className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() =>
                  router.push("/cashier")
                }
                className="w-full p-3.5 bg-[#5E35B1] hover:bg-[#4527A0] text-white rounded-xl text-xs font-bold flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4" />

                  <div className="text-left">
                    <p>
                      Return to Cashier Dashboard
                    </p>

                    <p className="text-[11px] text-purple-100">
                      Back to billing queue
                    </p>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4" />
              </button>

              {patient.activityLogs &&
                patient.activityLogs.length > 0 && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        Recent Audit Entries
                      </span>
                    </div>

                    <div className="space-y-2 mt-3">
                      {patient.activityLogs
                        .slice(0, 3)
                        .map((log) => (
                          <div
                            key={log.id}
                            className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100"
                          >
                            <span className="font-bold text-slate-800">
                              [{log.module}]
                            </span>{" "}
                            {log.action}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <>
              {/* PAYMENT METHODS */}
              <div className="space-y-2 text-xs font-semibold">
                {[
                  {
                    id: "cash",
                    name: "Cash Payment",
                  },
                  {
                    id: "pos",
                    name: "POS Terminal",
                  },
                  {
                    id: "transfer",
                    name: "Bank Transfer",
                  },
                  {
                    id: "card",
                    name: "Debit/Credit Card",
                  },
                  {
                    id: "hmo",
                    name: "HMO / Health Insurance",
                  },
                ].map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${
                      selectedPayment ===
                      method.id
                        ? "bg-purple-50 border-[#5E35B1] text-[#5E35B1]"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="payment"
                        checked={
                          selectedPayment ===
                          method.id
                        }
                        onChange={() =>
                          setSelectedPayment(
                            method.id as BillingPaymentMethod
                          )
                        }
                        className="accent-[#5E35B1]"
                      />

                      <span>
                        {method.name}
                      </span>
                    </div>
                  </label>
                ))}
              </div>

              {/* AMOUNT */}
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <div className="flex justify-between text-xs font-bold">
                  <span>
                    Amount Due
                  </span>

                  <span className="text-base text-[#5E35B1]">
                    ₦
                    {grandTotal.toLocaleString()}
                  </span>
                </div>

                {selectedPayment ===
                  "cash" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold text-slate-500">
                        Quick Cash Tender
                      </label>

                      <div className="grid grid-cols-4 gap-2">
                        {[
                          {
                            label: "Exact",
                            value: grandTotal,
                          },
                          {
                            label: "₦50k",
                            value: 50000,
                          },
                          {
                            label: "₦70k",
                            value: 70000,
                          },
                          {
                            label: "₦100k",
                            value: 100000,
                          },
                        ].map(
                          (tender) => (
                            <button
                              key={
                                tender.label
                              }
                              type="button"
                              onClick={() =>
                                handleQuickCash(
                                  tender.value
                                )
                              }
                              className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200"
                            >
                              {
                                tender.label
                              }
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-500">
                        Amount Rendered (₦)
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={
                          amountRenderedInput
                        }
                        onChange={(e) =>
                          setAmountRenderedInput(
                            e.target.value
                          )
                        }
                        className={`w-full p-3 bg-white border rounded-xl font-bold text-sm ${
                          isUnderpaid
                            ? "border-amber-400"
                            : "border-slate-300 focus:border-[#5E35B1]"
                        }`}
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-700 block">
                      Change Due
                    </span>

                    <span className="text-sm font-bold text-emerald-800">
                      ₦
                      {changeDue.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 block">
                      Outstanding
                    </span>

                    <span
                      className={`text-sm font-bold ${
                        isUnderpaid
                          ? "text-amber-700"
                          : "text-slate-800"
                      }`}
                    >
                      ₦
                      {isUnderpaid
                        ? (
                            grandTotal -
                            amountRendered
                          ).toLocaleString()
                        : "0.00"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={
                    handleProcessPayment
                  }
                  disabled={
                    processingPayment ||
                    isUnderpaid ||
                    grandTotal <= 0
                  }
                  className={`w-full py-3.5 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 ${
                    processingPayment ||
                    isUnderpaid ||
                    grandTotal <= 0
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-[#5E35B1] hover:bg-[#4527A0] text-white"
                  }`}
                >
                  {processingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Process Payment & Issue Receipt
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </section>
      </main>

      {/* DISCOUNT MODAL */}
      {discountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-[#5E35B1]">
                  <Lock className="w-4 h-4" />
                </div>

                <h3 className="text-sm font-bold">
                  Discount Authorization
                </h3>
              </div>

              <button
                onClick={() =>
                  setDiscountModalOpen(false)
                }
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {discountError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {discountError}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold block mb-2">
                  Discount Type
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      setDiscountType(
                        "fixed"
                      )
                    }
                    className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      discountType ===
                      "fixed"
                        ? "bg-purple-50 border-[#5E35B1] text-[#5E35B1]"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    Flat Amount
                  </button>

                  <button
                    onClick={() =>
                      setDiscountType(
                        "percentage"
                      )
                    }
                    className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${
                      discountType ===
                      "percentage"
                        ? "bg-purple-50 border-[#5E35B1] text-[#5E35B1]"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <Percent className="w-4 h-4" />
                    Percentage
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1.5">
                  {discountType ===
                  "fixed"
                    ? "Discount Amount (₦)"
                    : "Discount Percentage (%)"}
                </label>

                <input
                  type="number"
                  min="0"
                  value={discountInput}
                  onChange={(e) =>
                    setDiscountInput(
                      e.target.value
                    )
                  }
                  placeholder={
                    discountType ===
                    "fixed"
                      ? "e.g. 5000"
                      : "e.g. 10"
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#5E35B1]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1.5">
                  Reason
                </label>

                <textarea
                  rows={3}
                  value={reasonInput}
                  onChange={(e) =>
                    setReasonInput(
                      e.target.value
                    )
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs resize-none focus:outline-none focus:border-[#5E35B1]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1.5">
                  Administrator PIN
                </label>

                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) =>
                    setAdminPinInput(
                      e.target.value
                    )
                  }
                  placeholder="Enter administrator PIN"
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm tracking-widest focus:outline-none focus:border-[#5E35B1]"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2 text-[11px] text-amber-800">
                <ShieldAlert className="w-4 h-4 shrink-0" />

                <span>
                  Discount authorization will be
                  recorded in the hospital audit log.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() =>
                    setDiscountModalOpen(false)
                  }
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    handleApplyDiscount
                  }
                  disabled={
                    processingDiscount
                  }
                  className="px-5 py-2.5 bg-[#5E35B1] text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {processingDiscount && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

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