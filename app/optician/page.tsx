"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Glasses,
  LogOut,
  PackageCheck,
  Search,
  User,
} from "lucide-react";

type DispensingStatus =
  | "WAITING"
  | "MEASUREMENTS"
  | "READY FOR DISPENSE"
  | "COLLECTED";

interface OpticalOrder {
  id: string;
  patientId: string;
  patientName: string;
  prescription: string;
  frame: string;
  status: DispensingStatus;
  date: string;
}

const INITIAL_ORDERS: OpticalOrder[] = [
  {
    id: "OPT-001",
    patientId: "SPK-30892",
    patientName: "Samuel Adeyemi",
    prescription: "Distance",
    frame: "Awaiting selection",
    status: "WAITING",
    date: "Today",
  },
  {
    id: "OPT-002",
    patientId: "SPK-30901",
    patientName: "Grace Okafor",
    prescription: "Progressive",
    frame: "Ray-Ban Style A",
    status: "MEASUREMENTS",
    date: "Today",
  },
  {
    id: "OPT-003",
    patientId: "SPK-30905",
    patientName: "Ibrahim Musa",
    prescription: "Reading",
    frame: "Classic Black",
    status: "READY FOR DISPENSE",
    date: "Today",
  },
  {
    id: "OPT-004",
    patientId: "SPK-30911",
    patientName: "Esther Johnson",
    prescription: "Distance",
    frame: "Metallic Gold",
    status: "COLLECTED",
    date: "Yesterday",
  },
];

function nextStatus(
  status: DispensingStatus
): DispensingStatus | null {
  if (status === "WAITING") {
    return "MEASUREMENTS";
  }

  if (status === "MEASUREMENTS") {
    return "READY FOR DISPENSE";
  }

  if (status === "READY FOR DISPENSE") {
    return "COLLECTED";
  }

  return null;
}

export default function OpticianDashboard() {
  const [orders, setOrders] =
    useState<OpticalOrder[]>(
      INITIAL_ORDERS
    );

  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) return orders;

    return orders.filter(
      (order) =>
        order.patientName
          .toLowerCase()
          .includes(query) ||
        order.patientId
          .toLowerCase()
          .includes(query) ||
        order.frame
          .toLowerCase()
          .includes(query)
    );
  }, [orders, search]);

  const waiting = orders.filter(
    (order) => order.status === "WAITING"
  ).length;

  const processing = orders.filter(
    (order) =>
      order.status === "MEASUREMENTS" ||
      order.status === "READY FOR DISPENSE"
  ).length;

  const collected = orders.filter(
    (order) =>
      order.status === "COLLECTED"
  ).length;

  function advanceOrder(id: string) {
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== id) return order;

        const next = nextStatus(
          order.status
        );

        if (!next) return order;

        return {
          ...order,
          status: next,
        };
      })
    );
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Glasses className="h-5 w-5" />
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
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Optical Dispensing
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage measurements, eyewear preparation and patient collection.
          </p>
        </div>

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
                placeholder="Search patient or frame..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-212.5">
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
                {filteredOrders.map(
                  (order) => (
                    <tr
                      key={order.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-900">
                          {order.patientName}
                        </p>

                        <p className="text-[11px] text-slate-400">
                          {order.patientId}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold">
                        {order.prescription}
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold">
                        {order.frame}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                          {order.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {order.status !==
                        "COLLECTED" ? (
                          <button
                            type="button"
                            onClick={() =>
                              advanceOrder(
                                order.id
                              )
                            }
                            className="rounded-xl bg-emerald-700 px-3 py-2 text-[10px] font-black text-white"
                          >
                            {order.status ===
                            "WAITING"
                              ? "Take Measurements"
                              : order.status ===
                                  "MEASUREMENTS"
                                ? "Mark Ready"
                                : "Mark Collected"}
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600">
                            Collected
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
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

        <p className="mt-1 text-2xl font-black">
          {value}
        </p>
      </div>

      <Icon className={`h-6 w-6 ${className}`} />
    </div>
  );
}