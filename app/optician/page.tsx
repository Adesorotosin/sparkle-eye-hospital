"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Glasses,
  LogOut,
  PackageCheck,
  RefreshCw,
  Search,
  User,
} from "lucide-react";

import {
  getOpticianQueue,
  startOpticianMeasurements,
  markOpticalOrderReady,
  markOpticalOrderCollected,
  type OpticalOrder,
} from "@/app/actions/optician";

export default function OpticianDashboard() {
  const [orders, setOrders] = useState<OpticalOrder[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadQueue() {
    setLoading(true);
    setFeedback("");

    try {
      const result = await getOpticianQueue();

      if (result.success) {
        setOrders(result.orders);
      } else {
  setFeedback(
    result.message ?? "Unable to load the Optician queue."
  );
}
    } catch (error) {
      console.error("Failed to load Optician queue:", error);
      setFeedback("Unable to load the Optician queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return orders;
    }

    return orders.filter((order) => {
      return (
        order.patientName.toLowerCase().includes(query) ||
        order.patientCode.toLowerCase().includes(query) ||
        order.frameSelection?.toLowerCase().includes(query) ||
        order.lensType?.toLowerCase().includes(query)
      );
    });
  }, [orders, search]);

  const waiting = orders.filter(
    (order) => order.status === "referred"
  ).length;

  const processing = orders.filter(
    (order) =>
      order.status === "measurements" ||
      order.status === "ready_for_dispense"
  ).length;

  const collected = orders.filter(
    (order) => order.status === "collected"
  ).length;

  function handleStartMeasurements(orderId: string) {
    setFeedback("");

    startTransition(async () => {
      try {
        const result = await startOpticianMeasurements(orderId);

        setFeedback(result.message);

        if (result.success) {
          await loadQueue();
        }
      } catch (error) {
        console.error(
          "Failed to start optical measurements:",
          error
        );

        setFeedback(
          "Unable to start optical measurements."
        );
      }
    });
  }

  function handleMarkReady(orderId: string) {
    setFeedback("");

    startTransition(async () => {
      try {
        const result =
          await markOpticalOrderReady(orderId);

        setFeedback(result.message);

        if (result.success) {
          await loadQueue();
        }
      } catch (error) {
        console.error(
          "Failed to mark optical order ready:",
          error
        );

        setFeedback(
          "Unable to mark this optical order ready."
        );
      }
    });
  }

  function handleMarkCollected(orderId: string) {
    setFeedback("");

    startTransition(async () => {
      try {
        const result =
          await markOpticalOrderCollected(orderId);

        setFeedback(result.message);

        if (result.success) {
          await loadQueue();
        }
      } catch (error) {
        console.error(
          "Failed to mark optical order collected:",
          error
        );

        setFeedback(
          "Unable to mark this optical order as collected."
        );
      }
    });
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      localStorage.removeItem(
        "sparkle_staff_token"
      );

      window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Hospital Logo */}
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
            <img
              src="/Logo.png"
              alt="Sparkle Eye Specialist Hospital"
              className="h-full w-full object-contain"
            />
          </div>

          <div>
            <h1 className="text-sm font-black text-slate-900">
              Optician Dashboard
            </h1>

            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Optical Dispensing &amp; Eyewear
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 lg:flex">
            <User className="h-4 w-4 text-emerald-700" />

            <span className="text-xs font-bold text-emerald-700">
              Optician
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Optical Dispensing
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage measurements, eyewear preparation and patient collection.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadQueue()}
            disabled={loading || isPending}
            className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh Queue
          </button>
        </div>

        {feedback ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {feedback}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            label="Waiting"
            value={waiting}
            icon={Clock3}
            className="text-amber-600"
          />

          <Stat
            label="In Progress"
            value={processing}
            icon={PackageCheck}
            className="text-emerald-600"
          />

          <Stat
            label="Collected"
            value={collected}
            icon={CheckCircle2}
            className="text-blue-600"
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-black text-slate-900">
                Optical Orders
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Eyewear and dispensing workflow.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search patient, frame or lens..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-225">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Patient
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Prescription
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Frame
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />

                        <p className="text-xs font-bold text-slate-500">
                          Loading optical orders...
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center"
                    >
                      <div className="mx-auto flex max-w-md flex-col items-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                          <Glasses className="h-6 w-6 text-emerald-600" />
                        </div>

                        <h4 className="mt-4 text-sm font-black text-slate-900">
                          No optical orders found
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Completed Optometry assessments will appear here
                          once an optical order has been created.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <OpticalOrderRow
                      key={order.id}
                      order={order}
                      isPending={isPending}
                      onStartMeasurements={
                        handleStartMeasurements
                      }
                      onMarkReady={
                        handleMarkReady
                      }
                      onMarkCollected={
                        handleMarkCollected
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function OpticalOrderRow({
  order,
  isPending,
  onStartMeasurements,
  onMarkReady,
  onMarkCollected,
}: {
  order: OpticalOrder;
  isPending: boolean;
  onStartMeasurements: (
    orderId: string
  ) => void;
  onMarkReady: (
    orderId: string
  ) => void;
  onMarkCollected: (
    orderId: string
  ) => void;
}) {
  const prescription = getPrescriptionLabel(
    order
  );

  const frame =
    order.frameSelection ||
    "Awaiting selection";

  return (
    <tr className="border-t border-slate-100 transition hover:bg-slate-50/70">
      <td className="px-5 py-4">
        <Link
          href={`/optician/${order.patientCode}`}
          className="group"
        >
          <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
            {order.patientName}
          </p>

          <p className="text-[11px] text-slate-400">
            {order.patientCode}
          </p>
        </Link>
      </td>

      <td className="px-5 py-4">
        <p className="text-xs font-semibold text-slate-700">
          {prescription}
        </p>

        {order.lensType ? (
          <p className="mt-1 text-[10px] text-slate-400">
            {order.lensType}
          </p>
        ) : null}
      </td>

      <td className="px-5 py-4">
        <p className="text-xs font-semibold text-slate-700">
          {frame}
        </p>

        {order.lensMaterial ? (
          <p className="mt-1 text-[10px] text-slate-400">
            {order.lensMaterial}
          </p>
        ) : null}
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={order.status} />
      </td>

      <td className="px-5 py-4 text-right">
        {order.status === "referred" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              onStartMeasurements(order.id)
            }
            className="rounded-xl bg-emerald-700 px-3 py-2 text-[10px] font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Take Measurements
          </button>
        ) : null}

        {order.status === "measurements" ? (
          <Link
            href={`/optician/${order.patientCode}`}
            className="inline-flex rounded-xl bg-emerald-700 px-3 py-2 text-[10px] font-black text-white transition hover:bg-emerald-800"
          >
            Open Order
          </Link>
        ) : null}

        {order.status === "ready_for_dispense" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              onMarkCollected(order.id)
            }
            className="rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark Collected
          </button>
        ) : null}

        {order.status === "collected" ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Collected
          </span>
        ) : null}
      </td>
    </tr>
  );
}

function StatusBadge({
  status,
}: {
  status: OpticalOrder["status"];
}) {
  const config: Record<
    OpticalOrder["status"],
    {
      label: string;
      className: string;
    }
  > = {
    referred: {
      label: "WAITING",
      className:
        "bg-amber-50 text-amber-700",
    },
    measurements: {
      label: "MEASUREMENTS",
      className:
        "bg-blue-50 text-blue-700",
    },
    ready_for_dispense: {
      label: "READY FOR DISPENSE",
      className:
        "bg-emerald-50 text-emerald-700",
    },
    collected: {
      label: "COLLECTED",
      className:
        "bg-slate-100 text-slate-600",
    },
  };

  const current = config[status];

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${current.className}`}
    >
      {current.label}
    </span>
  );
}

function getPrescriptionLabel(
  order: OpticalOrder
) {
  const od = formatRefraction(
    order.refractionOD
  );
  const os = formatRefraction(
    order.refractionOS
  );

  if (!od && !os) {
    return "Prescription available";
  }

  if (od && os) {
    return `OD ${od} · OS ${os}`;
  }

  return od
    ? `OD ${od}`
    : `OS ${os}`;
}

function formatRefraction(
  refraction:
    | {
        sphere?: string | null;
        cylinder?: string | null;
        axis?: string | null;
        add?: string | null;
      }
    | null
    | undefined
) {
  if (!refraction) {
    return "";
  }

  const parts = [
    refraction.sphere,
    refraction.cylinder,
    refraction.axis
      ? `×${refraction.axis}`
      : null,
  ].filter(Boolean);

  return parts.join(" ");
}

function Stat({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
  className: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-2xl font-black text-slate-900">
          {value}
        </p>
      </div>

      <Icon
        className={`h-6 w-6 ${className}`}
      />
    </div>
  );
}