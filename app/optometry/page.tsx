"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Eye,
  LogOut,
  Search,
  User,
} from "lucide-react";

type ExamStatus =
  | "WAITING"
  | "IN EXAMINATION"
  | "COMPLETED";

interface OptometryPatient {
  id: string;
  name: string;
  age: number;
  complaint: string;
  appointment: string;
  status: ExamStatus;
  visualAcuity: string;
}

const INITIAL_PATIENTS: OptometryPatient[] = [
  {
    id: "SPK-30892",
    name: "Samuel Adeyemi",
    age: 42,
    complaint: "Blurred distance vision",
    appointment: "08:30 AM",
    status: "WAITING",
    visualAcuity: "Not recorded",
  },
  {
    id: "SPK-30901",
    name: "Grace Okafor",
    age: 29,
    complaint: "Eye strain",
    appointment: "09:00 AM",
    status: "IN EXAMINATION",
    visualAcuity: "RE 6/9 · LE 6/6",
  },
  {
    id: "SPK-30905",
    name: "Ibrahim Musa",
    age: 51,
    complaint: "Difficulty reading",
    appointment: "09:30 AM",
    status: "WAITING",
    visualAcuity: "Not recorded",
  },
  {
    id: "SPK-30911",
    name: "Esther Johnson",
    age: 36,
    complaint: "Headaches",
    appointment: "10:00 AM",
    status: "COMPLETED",
    visualAcuity: "RE 6/6 · LE 6/6",
  },
];

export default function OptometryDashboard() {
  const [patients, setPatients] =
    useState<OptometryPatient[]>(
      INITIAL_PATIENTS
    );

  const [search, setSearch] = useState("");

  const filteredPatients = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) return patients;

    return patients.filter(
      (patient) =>
        patient.name
          .toLowerCase()
          .includes(query) ||
        patient.id
          .toLowerCase()
          .includes(query)
    );
  }, [patients, search]);

  const waiting = patients.filter(
    (patient) =>
      patient.status === "WAITING"
  ).length;

  const examining = patients.filter(
    (patient) =>
      patient.status === "IN EXAMINATION"
  ).length;

  const completed = patients.filter(
    (patient) =>
      patient.status === "COMPLETED"
  ).length;

  function startExam(id: string) {
    setPatients((current) =>
      current.map((patient) =>
        patient.id === id
          ? {
              ...patient,
              status: "IN EXAMINATION",
            }
          : patient
      )
    );
  }

  function completeExam(id: string) {
    setPatients((current) =>
      current.map((patient) =>
        patient.id === id
          ? {
              ...patient,
              status: "COMPLETED",
              visualAcuity:
                "RE 6/6 · LE 6/6",
            }
          : patient
      )
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
            Optometry
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage visual assessments, refraction and preliminary eye measurements.
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
            label="In Examination"
            value={examining}
            icon={Activity}
            className="text-blue-600"
          />

          <Stat
            label="Completed Today"
            value={completed}
            icon={CheckCircle2}
            className="text-emerald-600"
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-black text-slate-900">
                Optometry Queue
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Patients awaiting vision assessment.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search patient..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs outline-none focus:border-blue-500"
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
                    Complaint
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Appointment
                  </th>

                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Visual Acuity
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
                  (patient) => (
                    <tr
                      key={patient.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-900">
                          {patient.name}
                        </p>

                        <p className="text-[11px] text-slate-400">
                          {patient.id} · Age {patient.age}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-xs font-medium text-slate-600">
                        {patient.complaint}
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold">
                        {patient.appointment}
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold">
                        {patient.visualAcuity}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                          {patient.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {patient.status ===
                          "WAITING" && (
                          <button
                            type="button"
                            onClick={() =>
                              startExam(
                                patient.id
                              )
                            }
                            className="rounded-xl bg-blue-700 px-3 py-2 text-[10px] font-black text-white"
                          >
                            Start Assessment
                          </button>
                        )}

                        {patient.status ===
                          "IN EXAMINATION" && (
                          <button
                            type="button"
                            onClick={() =>
                              completeExam(
                                patient.id
                              )
                            }
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white"
                          >
                            Complete Assessment
                          </button>
                        )}

                        {patient.status ===
                          "COMPLETED" && (
                          <span className="text-[10px] font-bold text-emerald-600">
                            Assessment Complete
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