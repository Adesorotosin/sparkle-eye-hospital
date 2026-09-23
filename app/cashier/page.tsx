"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import Image from "next/image";
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
  LogOut,
  Loader2,
  RefreshCw,
  AlertCircle,
  Banknote,
} from "lucide-react";

import {
  getCashierDashboard,
  type CashierQueueItem,
} from "@/app/actions/cashier";

export default function CashierDashboard() {
  const router = useRouter();

  const [queue, setQueue] =
    useState<CashierQueueItem[]>([]);

  const [pendingCount, setPendingCount] =
    useState(0);

  const [completedCount, setCompletedCount] =
    useState(0);

  const [revenue, setRevenue] =
    useState(0);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<
      "all" | "pending" | "paid"
    >("all");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const loadDashboard = async (
    showLoader = true
  ) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError("");

    try {
      const result =
        await getCashierDashboard();

      if (!result.success) {
        setError(result.message);
        return;
      }

      setQueue(result.data.queue);
      setPendingCount(
        result.data.pendingCount
      );
      setCompletedCount(
        result.data.completedCount
      );
      setRevenue(result.data.revenue);
    } catch (err) {
      console.error(
        "Cashier dashboard error:",
        err
      );

      setError(
        "Unable to load the cashier dashboard."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredQueue = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    return queue.filter((item) => {
      const matchesSearch =
        !query ||
        item.fullName
          .toLowerCase()
          .includes(query) ||
        item.patientId
          .toLowerCase()
          .includes(query) ||
        item.invoiceNo
          .toLowerCase()
          .includes(query);

      const normalizedStatus =
        item.status === "draft" ||
        item.status === "pending"
          ? "pending"
          : "paid";

      const matchesStatus =
        statusFilter === "all" ||
        normalizedStatus === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    queue,
    searchQuery,
    statusFilter,
  ]);

  const formatTime = (
    value: string
  ) => {
    try {
      return new Intl.DateTimeFormat(
        "en-NG",
        {
          timeZone: "Africa/Lagos",
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(new Date(value));
    } catch {
      return "—";
    }
  };

  const formatDate = () => {
    return new Intl.DateTimeFormat(
      "en-NG",
      {
        timeZone: "Africa/Lagos",
        dateStyle: "medium",
      }
    ).format(new Date());
  };

  const handleSelectPatient =
    (patientId: string) => {
      router.push(
        `/cashier/checkout?patientId=${encodeURIComponent(
          patientId
        )}`
      );
    };

  const handleLogout = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    setIsLoggingOut(true);

    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
        }
      );
    } catch (error) {
      console.error(
        "API Logout Error:",
        error
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

      cookiesToClear.forEach(
        (name) => {
          document.cookie =
            `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax;`;
        }
      );

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
            Loading cashier dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F3F0F7] text-slate-800 font-sans antialiased">
      {/* HEADER */}
      <header className="w-full bg-[#3F1D85] text-white px-6 py-3.5 flex flex-col md:flex-row items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-white/10 border border-white/20">
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
            <h1 className="text-sm font-extrabold tracking-wide text-white leading-tight">
              Sparkle Eye Specialist Hospital
            </h1>

            <p className="text-[11px] text-purple-200/80 font-medium">
              Cashier Dashboard & Billing Queue
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

            <span>
              {formatDate()}
            </span>
          </div>

          <button
            type="button"
            disabled={isLoggingOut}
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 hover:text-white border border-rose-500/30 font-semibold text-xs transition disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />

            <span>
              {isLoggingOut
                ? "Signing out..."
                : "Sign Out"}
            </span>
          </button>
        </div>
      </header>

      {/* METRICS */}
      <div className="bg-[#5E35B1] text-white px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">
              Pending Checkout
            </p>

            <p className="text-xl font-extrabold text-white">
              {pendingCount}{" "}
              {pendingCount === 1
                ? "Patient"
                : "Patients"}
            </p>
          </div>

          <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">
              Completed Today
            </p>

            <p className="text-xl font-extrabold text-white">
              {completedCount}{" "}
              {completedCount === 1
                ? "Invoice"
                : "Invoices"}
            </p>
          </div>

          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">
              Revenue Today
            </p>

            <p className="text-xl font-extrabold text-white">
              ₦
              {revenue.toLocaleString()}
            </p>
          </div>

          <div className="w-9 h-9 rounded-lg bg-purple-400/20 text-purple-200 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/10 p-3.5 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">
              Active Register
            </p>

            <p className="text-xl font-extrabold text-white">
              POS Terminal #02
            </p>
          </div>

          <div className="w-9 h-9 rounded-lg bg-purple-400/20 text-purple-200 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />

            {error}
          </div>
        )}

        <div className="bg-white/90 rounded-2xl p-6 border border-purple-100 shadow-sm space-y-5">
          {/* TOOLBAR */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />

              <input
                type="text"
                placeholder="Search patient name, ID or invoice..."
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#5E35B1]"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />

              <span className="text-xs font-semibold text-slate-600">
                Filter:
              </span>

              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                {[
                  {
                    id: "all",
                    label: "All",
                  },
                  {
                    id: "pending",
                    label: "Pending",
                  },
                  {
                    id: "paid",
                    label: "Paid",
                  },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() =>
                      setStatusFilter(
                        filter.id as
                          | "all"
                          | "pending"
                          | "paid"
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg transition ${
                      statusFilter ===
                      filter.id
                        ? "bg-[#5E35B1] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  loadDashboard(false)
                }
                disabled={refreshing}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-50"
                title="Refresh queue"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">
                    Patient Info
                  </th>

                  <th className="py-3 px-4">
                    Coverage Plan
                  </th>

                  <th className="py-3 px-4">
                    Invoice
                  </th>

                  <th className="py-3 px-4">
                    Time
                  </th>

                  <th className="py-3 px-4 text-right">
                    Grand Total
                  </th>

                  <th className="py-3 px-4 text-center">
                    Status
                  </th>

                  <th className="py-3 px-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-14 text-center"
                    >
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Receipt className="w-8 h-8" />

                        <p className="text-sm font-semibold text-slate-600">
                          No billing records found
                        </p>

                        <p className="text-xs">
                          {searchQuery
                            ? "Try a different search."
                            : "There are no invoices in this queue yet."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map(
                    (item) => {
                      const isPaid =
                        item.status ===
                        "paid";

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-purple-50/40 transition"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">
                              {
                                item.fullName
                              }
                            </div>

                            <div className="text-[11px] text-slate-400">
                              {
                                item.patientId
                              }
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {
                              item.coveragePlan
                            }
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-700">
                              #
                              {
                                item.invoiceNo
                              }
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500">
                            {formatTime(
                              item.createdAt
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            ₦
                            {item.grandTotal.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {isPaid
                                ? "PAID"
                                : "PENDING"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() =>
                                handleSelectPatient(
                                  item.patientId
                                )
                              }
                              className="px-3.5 py-2 bg-[#5E35B1] hover:bg-[#4527A0] text-white rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5 group"
                            >
                              <span>
                                {isPaid
                                  ? "View Receipt"
                                  : "Checkout"}
                              </span>

                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* EMPTY STATE / INFO */}
        <div className="bg-white/80 border border-purple-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5E35B1] flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-800">
              Cashier workflow
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Doctor-generated diagnostics and
              prescriptions appear here through
              their invoices. Once payment is
              completed, the invoice is marked paid
              and the downstream clinical workflow
              is unlocked.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
