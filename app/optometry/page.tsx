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
  Plus,
  RefreshCw,
  Search,
  User,
} from "lucide-react";

import {
  getOptometryQueue,
  startOptometryExam,
  updateOptometrySource,
  registerVisitingOptometryPatient,
  type OptometryPatient,
} from "@/app/actions/optometry";

type QueueFilter =
  | "ALL"
  | "WAITING"
  | "IN EXAMINATION"
  | "COMPLETED";

type DashboardTab = "REFRACTION" | "IN_HOUSE" | "VISITING" | "RESULT";

export default function OptometryDashboard() {
  const router = useRouter();

  const [patients, setPatients] =
    useState<OptometryPatient[]>([]);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<QueueFilter>("ALL");

  const [activeTab, setActiveTab] =
    useState<DashboardTab>("REFRACTION");

  const [loading, setLoading] =
    useState(true);

  const [feedback, setFeedback] =
    useState("");

  const [showVisitingForm, setShowVisitingForm] = useState(false);
  const [savingVisitingPatient, setSavingVisitingPatient] = useState(false);
  const [visitingForm, setVisitingForm] = useState({
    fullName: "",
    age: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    visitType: "external_referral" as "external_referral" | "self_presenting",
    referralFacility: "",
    referringClinician: "",
    referralReason: "",
    referralNotes: "",
  });

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

        const isCompleted = patient.optometryStatus === "completed";
        const matchesTab =
          activeTab === "REFRACTION"
            ? !isCompleted
            : activeTab === "IN_HOUSE"
              ? patient.optometrySource === "in_house" && !isCompleted
              : activeTab === "VISITING"
                ? patient.optometrySource === "visiting" && !isCompleted
                : isCompleted;

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
          matchesTab &&
          matchesFilter
        );
      }
    );
  }, [patients, search, filter, activeTab]);

  function getStatusLabel(
    status: OptometryPatient["optometryStatus"]
  ) {
    switch (status) {
      case "referred":
        return "WAITING";

      case "in_examination":
        return "IN EXAMINATION";

      case "completed":
        return "SENT TO DOCTOR";

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


  async function handleSourceChange(
    patientCode: string,
    source: "in_house" | "visiting"
  ) {
    setFeedback("");
    try {
      const result = await updateOptometrySource(patientCode, source);
      setFeedback(result.message);
      if (result.success) await loadQueue();
    } catch (error) {
      console.error("Failed to update Optometry patient source:", error);
      setFeedback("Unable to update patient source.");
    }
  }

  async function handleRegisterVisitingPatient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingVisitingPatient(true);
    setFeedback("");

    const numericAge = visitingForm.age.trim() ? Number(visitingForm.age) : undefined;
    if (numericAge !== undefined && (!Number.isInteger(numericAge) || numericAge < 0 || numericAge > 150)) {
      setFeedback("Age must be a whole number between 0 and 150.");
      setSavingVisitingPatient(false);
      return;
    }

    try {
      const result = await registerVisitingOptometryPatient({
        fullName: visitingForm.fullName,
        age: numericAge,
        dateOfBirth: visitingForm.dateOfBirth || undefined,
        gender: visitingForm.gender,
        phone: visitingForm.phone || undefined,
        visitType: visitingForm.visitType,
        referralFacility: visitingForm.referralFacility || undefined,
        referringClinician: visitingForm.referringClinician || undefined,
        referralReason: visitingForm.referralReason || undefined,
        referralNotes: visitingForm.referralNotes || undefined,
      });

      setFeedback(result.success
        ? `${result.message} Registration No.: ${result.registrationNumber ?? "not returned"} · Patient code: ${result.patientCode ?? "not returned"}.`
        : result.message);

      if (result.success) {
        setShowVisitingForm(false);
        setVisitingForm({
          fullName: "", age: "", dateOfBirth: "", gender: "", phone: "",
          visitType: "external_referral", referralFacility: "", referringClinician: "", referralReason: "", referralNotes: "",
        });
        setActiveTab("VISITING");
        setFilter("ALL");
        await loadQueue();
      }
    } catch (error) {
      console.error("Visiting patient registration failed:", error);
      setFeedback("Unable to register the visiting patient. Please try again.");
    } finally {
      setSavingVisitingPatient(false);
    }
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
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
  <img
    src="/Logo.png"
    alt="Sparkle Eye Specialist Hospital"
    className="h-full w-full object-contain"
  />
</div>

          <div>
            <h1 className="text-sm font-black text-slate-900">
              Dashboard
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
          <button
            type="button"
            onClick={() => setShowVisitingForm(true)}
            className="flex w-fit items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            Register Visiting Patient
          </button>
        </div>

        {feedback && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            {feedback}
          </div>
        )}


        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {([
            ["REFRACTION", "Refraction", patients.filter((p) => p.optometryStatus !== "completed").length],
            ["IN_HOUSE", "In-house", patients.filter((p) => p.optometrySource === "in_house" && p.optometryStatus !== "completed").length],
            ["VISITING", "Visiting", patients.filter((p) => p.optometrySource === "visiting" && p.optometryStatus !== "completed").length],
            ["RESULT", "Result", patients.filter((p) => p.optometryStatus === "completed").length],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveTab(key);
                setFilter("ALL");
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeTab === key ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {label}
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{count}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("REFRACTION");
              setFilter("WAITING");
            }}
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
            onClick={() => {
              setActiveTab("REFRACTION");
              setFilter("IN EXAMINATION");
            }}
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
            onClick={() => {
              setActiveTab("RESULT");
              setFilter("COMPLETED");
            }}
            className="text-left"
          >
            <Stat
              label="Sent to Doctor"
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
                {activeTab === "RESULT"
                  ? "Completed refraction assessments forwarded to the doctor."
                  : activeTab === "VISITING"
                    ? "Patients referred from outside hospitals or eye centres."
                    : activeTab === "IN_HOUSE"
                      ? "Sparkle Eye patients referred internally by the doctor."
                      : "Patients awaiting or undergoing refraction assessment."}
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
                      Source
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
                            <div>{patient.complaint}</div>
                            {patient.optometrySource === "visiting" && patient.referralFacility && (
                              <p className="mt-1 text-[10px] text-violet-700">
                                Referred by: {patient.referralFacility}
                                {patient.referringClinician ? ` · ${patient.referringClinician}` : ""}
                              </p>
                            )}
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
                            <select
                              aria-label={`Patient source for ${patient.fullName}`}
                              value={patient.optometrySource}
                              onChange={(event) => handleSourceChange(patient.patientCode, event.target.value as "in_house" | "visiting")}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500"
                            >
                              <option value="in_house">In-house</option>
                              <option value="visiting">Visiting</option>
                            </select>
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

        {showVisitingForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 py-8">
            <section role="dialog" aria-modal="true" aria-labelledby="visiting-patient-title" className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <h3 id="visiting-patient-title" className="text-lg font-black text-slate-900">Register Visiting Patient</h3>
                  <p className="mt-1 text-sm text-slate-500">Create a full hospital record for an external referral or a patient who came directly to Optometry.</p>
                </div>
                <button type="button" onClick={() => setShowVisitingForm(false)} aria-label="Close registration form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">✕</button>
              </div>
              <form onSubmit={handleRegisterVisitingPatient} className="space-y-6 p-6">
                <div>
                  <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">Patient details</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-bold text-slate-700">
                      Full name <span className="text-rose-600">*</span>
                      <input required value={visitingForm.fullName} onChange={(e) => setVisitingForm((f) => ({ ...f, fullName: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" placeholder="Enter patient's full name" />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold text-slate-700">
                      Gender <span className="text-rose-600">*</span>
                      <select required value={visitingForm.gender} onChange={(e) => setVisitingForm((f) => ({ ...f, gender: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white">
                        <option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                      </select>
                    </label>
                    <label className="space-y-1.5 text-xs font-bold text-slate-700">
                      Date of birth
                      <input type="date" max={new Date().toISOString().slice(0, 10)} value={visitingForm.dateOfBirth} onChange={(e) => setVisitingForm((f) => ({ ...f, dateOfBirth: e.target.value, age: "" }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold text-slate-700">
                      Age (if date of birth is unknown)
                      <input type="number" min="0" max="150" step="1" value={visitingForm.age} onChange={(e) => setVisitingForm((f) => ({ ...f, age: e.target.value, dateOfBirth: "" }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" placeholder="Age in years" />
                    </label>
                    <label className="space-y-1.5 text-xs font-bold text-slate-700 sm:col-span-2">
                      Phone number
                      <input type="tel" value={visitingForm.phone} onChange={(e) => setVisitingForm((f) => ({ ...f, phone: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" placeholder="Patient or caregiver phone number" />
                    </label>
                  </div>
                </div>
                <div>
                  <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">Arrival details</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-bold text-slate-700 sm:col-span-2">
                      How did the patient arrive? <span className="text-rose-600">*</span>
                      <select required value={visitingForm.visitType} onChange={(e) => setVisitingForm((f) => ({ ...f, visitType: e.target.value as "external_referral" | "self_presenting" }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white">
                        <option value="external_referral">Referred by another facility</option>
                        <option value="self_presenting">Came directly / self-presenting</option>
                      </select>
                    </label>
                    {visitingForm.visitType === "external_referral" && (
                      <>
                        <label className="space-y-1.5 text-xs font-bold text-slate-700">
                          Referring hospital / eye centre
                          <input value={visitingForm.referralFacility} onChange={(e) => setVisitingForm((f) => ({ ...f, referralFacility: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" placeholder="Facility name (optional)" />
                        </label>
                        <label className="space-y-1.5 text-xs font-bold text-slate-700">
                          Referring clinician
                          <input value={visitingForm.referringClinician} onChange={(e) => setVisitingForm((f) => ({ ...f, referringClinician: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" placeholder="Doctor / optometrist name (optional)" />
                        </label>
                        <label className="space-y-1.5 text-xs font-bold text-slate-700 sm:col-span-2">
                          Reason for referral
                          <input value={visitingForm.referralReason} onChange={(e) => setVisitingForm((f) => ({ ...f, referralReason: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" placeholder="Reason for referral (optional)" />
                        </label>
                        <label className="space-y-1.5 text-xs font-bold text-slate-700 sm:col-span-2">
                          Referral notes
                          <textarea rows={3} value={visitingForm.referralNotes} onChange={(e) => setVisitingForm((f) => ({ ...f, referralNotes: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white" placeholder="Additional information from the referring facility (optional)" />
                        </label>
                      </>
                    )}
                  </div>
                  {visitingForm.visitType === "self_presenting" && (
                    <p className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-xs font-medium text-blue-800">
                      No external referral is required. The patient will receive a normal hospital record and be added directly to the Visiting Optometry queue.
                    </p>
                  )}
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" disabled={savingVisitingPatient} onClick={() => setShowVisitingForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                  <button type="submit" disabled={savingVisitingPatient} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{savingVisitingPatient ? "Registering patient..." : "Register & Add to Visiting Queue"}</button>
                </div>
              </form>
            </section>
          </div>
        )}
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