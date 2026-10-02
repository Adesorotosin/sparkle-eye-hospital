"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Eye,
  LogOut,
  RefreshCw,
  Search,
  User,
} from "lucide-react";

import {
  getOptometryQueue,
  startOptometryExam,
  type OptometryPatient,
} from "@/app/actions/optometry";

type QueueFilter =
  | "ALL"
  | "WAITING"
  | "IN EXAMINATION"
  | "COMPLETED";

export default function OptometryDashboard() {
  const router = useRouter();

  const [patients, setPatients] =
    useState<OptometryPatient[]>([]);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<QueueFilter>("ALL");

  const [loading, setLoading] =
    useState(true);

  const [feedback, setFeedback] =
    useState("");

  const [isPending, startTransition] =
    useTransition();

  const loadQueue = useCallback(
    async () => {
      setLoading(true);
      setFeedback("");

      try {
        const result =
          await getOptometryQueue();

        if (!result.success) {
          setFeedback(
            result.message ??
              "Unable to load Optometry queue."
          );

          setPatients([]);
          return;
        }

        setPatients(result.patients);
      } catch (error) {
        console.error(
          "Failed to load Optometry queue:",
          error
        );

        setFeedback(
          "Unable to load the Optometry queue."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const waiting = patients.filter(
    (patient) =>
      patient.optometryStatus ===
      "referred"
  ).length;

  const examining = patients.filter(
    (patient) =>
      patient.optometryStatus ===
      "in_examination"
  ).length;

  const completed = patients.filter(
    (patient) =>
      patient.optometryStatus ===
      "completed"
  ).length;

  const filteredPatients = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return patients.filter(
      (patient) => {
        const matchesSearch =
          !query ||
          patient.fullName
            .toLowerCase()
            .includes(query) ||
          patient.patientCode
            .toLowerCase()
            .includes(query);

        const matchesFilter =
          filter === "ALL" ||
          (filter === "WAITING" &&
            patient.optometryStatus ===
              "referred") ||
          (filter ===
            "IN EXAMINATION" &&
            patient.optometryStatus ===
              "in_examination") ||
          (filter === "COMPLETED" &&
            patient.optometryStatus ===
              "completed");

        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );
  }, [patients, search, filter]);

  function getStatusLabel(
    status: OptometryPatient["optometryStatus"]
  ) {
    switch (status) {
      case "referred":
        return "WAITING";

      case "in_examination":
        return "IN EXAMINATION";

      case "completed":
        return "COMPLETED";

      default:
        return "UNKNOWN";
    }
  }

  function handleStartExam(
    patientCode: string
  ) {
    setFeedback("");

    startTransition(async () => {
      try {
        const result =
          await startOptometryExam(
            patientCode
          );

        setFeedback(result.message);

        if (!result.success) {
          return;
        }

        router.push(
          `/optometry/${encodeURIComponent(
            patientCode
          )}`
        );
      } catch (error) {
        console.error(
          "Failed to start Optometry examination:",
          error
        );

        setFeedback(
          "Unable to start the Optometry examination."
        );
      }
    });
  }

  async function handleLogout() {
    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
        }
      );
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Eye className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-sm font-black text-slate-900">
              Optometry Dashboard
            </h1>

            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Vision Assessment &amp; Refraction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 lg:flex">
            <User className="h-4 w-4 text-blue-700" />

            <span className="text-xs font-bold text-blue-700">
              Optometrist
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
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
              Optometry
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage referred patients, visual
              assessments and refraction.
            </p>
          </div>

          <button
            type="button"
            onClick={loadQueue}
            disabled={loading}
            className="flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

        {feedback && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            {feedback}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              setFilter("WAITING")
            }
            className="text-left"
          >
            <Stat
              label="Waiting"
              value={waiting}
              icon={Clock3}
              className="text-amber-600"
              active={
                filter === "WAITING"
              }
            />
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter(
                "IN EXAMINATION"
              )
            }
            className="text-left"
          >
            <Stat
              label="In Examination"
              value={examining}
              icon={Activity}
              className="text-blue-600"
              active={
                filter ===
                "IN EXAMINATION"
              }
            />
          </button>

          <button
            type="button"
            onClick={() =>
              setFilter("COMPLETED")
            }
            className="text-left"
          >
            <Stat
              label="Completed Today"
              value={completed}
              icon={CheckCircle2}
              className="text-emerald-600"
              active={
                filter === "COMPLETED"
              }
            />
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="font-black text-slate-900">
                  Optometry Queue
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setFilter("ALL")
                  }
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
                >
                  {patients.length} patients
                </button>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Patients referred by the clinical
                team for Optometry assessment.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search patient name or code..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-60 items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Loading Optometry queue...
              </div>
            </div>
          ) : filteredPatients.length ===
            0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Eye className="h-5 w-5 text-slate-400" />
              </div>

              <h4 className="mt-4 text-sm font-black text-slate-900">
                No patients found
              </h4>

              <p className="mt-1 max-w-sm text-xs text-slate-500">
                {patients.length === 0
                  ? "Patients referred from Doctor consultation will appear here."
                  : "Try changing the search or queue filter."}
              </p>

              {filter !== "ALL" && (
                <button
                  type="button"
                  onClick={() =>
                    setFilter("ALL")
                  }
                  className="mt-4 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                >
                  Show All Patients
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-212.5">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Patient
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Complaint
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Triage VA
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Correction
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
                  {filteredPatients.map(
                    (patient) => {
                      const status =
                        getStatusLabel(
                          patient.optometryStatus
                        );

                      return (
                        <tr
                          key={patient.id}
                          className="border-t border-slate-100 transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900">
                              {patient.fullName}
                            </p>

                            <p className="text-[11px] text-slate-400">
                              {patient.patientCode}

                              {patient.age !==
                                null &&
                                ` · Age ${patient.age}`}
                            </p>
                          </td>

                          <td className="max-w-56 px-5 py-4 text-xs font-medium text-slate-600">
                            {patient.complaint}
                          </td>

                          <td className="px-5 py-4">
                            <div className="space-y-0.5 text-xs font-semibold text-slate-700">
                              <p>
                                OD:{" "}
                                {patient.visualAcuityOD}
                              </p>

                              <p>
                                OS:{" "}
                                {patient.visualAcuityOS}
                              </p>

                              <p>
                                OU:{" "}
                                {patient.visualAcuityOU}
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                patient.withCorrection
                                  ? "bg-violet-50 text-violet-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {patient.withCorrection
                                ? "With correction"
                                : "Unaided"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={status}
                            />
                          </td>

                          <td className="px-5 py-4 text-right">
                            {patient.optometryStatus ===
                              "referred" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleStartExam(
                                    patient.patientCode
                                  )
                                }
                                disabled={
                                  isPending
                                }
                                className="rounded-xl bg-blue-700 px-3 py-2 text-[10px] font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isPending
                                  ? "Opening..."
                                  : "Start Assessment"}
                              </button>
                            )}

                            {patient.optometryStatus ===
                              "in_examination" && (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/optometry/${encodeURIComponent(
                                      patient.patientCode
                                    )}`
                                  )
                                }
                                className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black text-blue-700 transition hover:bg-blue-100"
                              >
                                Continue Assessment
                              </button>
                            )}

                            {patient.optometryStatus ===
                              "completed" && (
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/optometry/${encodeURIComponent(
                                      patient.patientCode
                                    )}`
                                  )
                                }
                                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100"
                              >
                                View Assessment
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles =
    status === "WAITING"
      ? "bg-amber-50 text-amber-700"
      : status === "IN EXAMINATION"
        ? "bg-blue-50 text-blue-700"
        : "bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles}`}
    >
      {status}
    </span>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  className,
  active,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
  className: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm transition ${
        active
          ? "border-blue-300 ring-2 ring-blue-100"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
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