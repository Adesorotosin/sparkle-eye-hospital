"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Clock,
  CheckCircle2,
  ArrowRight,
  Stethoscope,
  Filter,
  Bell,
  Check,
  AlertCircle,
  X,
  CalendarDays,
} from "lucide-react";

type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

type QueueStatus =
  | "waiting"
  | "in-consultation"
  | "completed";

interface Appointment {
  id: string;
  patientName: string;
  physician: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
}

interface PatientRecord {
  id?: string;
  patientId: string;
  fullName: string;
  age: number | null;
  gender: string | null;
  primaryComplaint?: string | null;
  status?: string | null;
  lastVisitAt?: string | null;
}

interface QueuePatient {
  id: string;
  fullName: string;
  age: number | null;
  gender: string | null;
  triageNote: string;
  priority: "Normal" | "Priority";
  status: QueueStatus;
  appointmentStatus: AppointmentStatus;
  appointmentStart: string;
  appointmentEnd: string;
  appointmentDate: string;
  appointmentTime: string;
  physician: string;
  appointmentId: string;
  hasAppointment: boolean;
}

interface ActivityLog {
  id: string;
  action: string;
  details?: string;
  user: string;
  timestamp: string;
  category?: string;
}

interface AppointmentsResponse {
  appointments?: Appointment[];
  currentStaff?: {
    id?: string;
    name?: string;
    role?: string;
  };
  error?: string;
}

interface PatientsResponse {
  patients?: PatientRecord[];
  error?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "urgent" | "info";
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getAppointmentDateString(startTime: string) {
  const date = new Date(startTime);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return getLocalDateString(date);
}

function formatAppointmentTime(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return "Time unavailable";
  }

  const formatTime = (value: Date) =>
    value.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return `${formatTime(startDate)} – ${formatTime(endDate)}`;
}

function formatAppointmentDate(dateString: string) {
  if (!dateString) {
    return "Date unavailable";
  }

  const value = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(value.getTime())) {
    return dateString;
  }

  return value.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function extractPatientCode(patientName: string) {
  const match = /\(([^()]+)\)\s*$/.exec(patientName);

  return match?.[1]?.trim() || null;
}

function getAppointmentStatusLabel(status: AppointmentStatus) {
  switch (status) {
    case "scheduled":
      return "Scheduled";

    case "checked_in":
      return "Checked In";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "no_show":
      return "No Show";

    default:
      return status;
  }
}

function normalizeAppointment(
  value: unknown
): Appointment | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;

  const id =
    typeof row.id === "string"
      ? row.id
      : "";

  const patientName =
    typeof row.patientName === "string"
      ? row.patientName
      : "";

  const physician =
    typeof row.physician === "string"
      ? row.physician
      : "";

  const startTime =
    typeof row.startTime === "string"
      ? row.startTime
      : "";

  const endTime =
    typeof row.endTime === "string"
      ? row.endTime
      : "";

  const rawStatus =
    typeof row.status === "string"
      ? row.status
      : "scheduled";

  const allowedStatuses: AppointmentStatus[] = [
    "scheduled",
    "checked_in",
    "completed",
    "cancelled",
    "no_show",
  ];

  const status = allowedStatuses.includes(
    rawStatus as AppointmentStatus
  )
    ? (rawStatus as AppointmentStatus)
    : "scheduled";

  const notes =
    typeof row.notes === "string"
      ? row.notes
      : null;

  if (
    !id ||
    !patientName ||
    !startTime ||
    !endTime
  ) {
    return null;
  }

  return {
    id,
    patientName,
    physician,
    startTime,
    endTime,
    status,
    notes,
  };
}

function getPatientLastVisitDate(
  patient: PatientRecord
) {
  if (!patient.lastVisitAt) {
    return "";
  }

  const date = new Date(
    patient.lastVisitAt
  );

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return getLocalDateString(date);
}

export default function DoctorDashboard() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<
      | "all"
      | "waiting"
      | "in-consultation"
      | "completed"
    >("all");

  const [selectedDate, setSelectedDate] =
    useState(getLocalDateString());

  const [isLoadingQueue, setIsLoadingQueue] =
    useState(true);

  const [doctorQueue, setDoctorQueue] =
    useState<QueuePatient[]>([]);

  const [appointmentError, setAppointmentError] =
    useState("");

  const [currentStaffName, setCurrentStaffName] =
    useState("");

  const [
    notificationsOpen,
    setNotificationsOpen,
  ] = useState(false);

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const unreadCount =
    notifications.filter(
      (notification) => !notification.read
    ).length;

  const markAllAsRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  /*
   * LOAD DOCTOR QUEUE
   *
   * Sources:
   * 1. Appointments
   * 2. Patients currently in consultation
   * 3. Patients who completed a walk-in/triage consultation
   */
  useEffect(() => {
    let cancelled = false;

    async function loadQueue() {
      setIsLoadingQueue(true);
      setAppointmentError("");

      try {
        /*
         * LOAD APPOINTMENTS
         */
        const appointmentsResponse =
          await fetch(
            `/api/appointments?date=${encodeURIComponent(
              selectedDate
            )}`,
            {
              cache: "no-store",
            }
          );

        const appointmentsData =
          (await appointmentsResponse
            .json()
            .catch(() => ({}))) as AppointmentsResponse;

        if (!appointmentsResponse.ok) {
          throw new Error(
            appointmentsData.error ||
              "Failed to load appointments."
          );
        }

        const appointments =
          Array.isArray(
            appointmentsData.appointments
          )
            ? appointmentsData.appointments
                .map(normalizeAppointment)
                .filter(
                  (
                    appointment
                  ): appointment is Appointment =>
                    appointment !== null
                )
            : [];

        if (
          !cancelled &&
          appointmentsData.currentStaff?.name
        ) {
          setCurrentStaffName(
            appointmentsData.currentStaff.name
          );
        }

        /*
         * LOAD PATIENTS
         */
        const patientsResponse =
          await fetch("/api/patients", {
            cache: "no-store",
          });

        const patientsData =
          (await patientsResponse
            .json()
            .catch(() => ({}))) as PatientsResponse;

        if (!patientsResponse.ok) {
          throw new Error(
            patientsData.error ||
              "Failed to load patient records."
          );
        }

        const patients: PatientRecord[] =
          Array.isArray(
            patientsData.patients
          )
            ? patientsData.patients
            : [];

        if (cancelled) {
          return;
        }

        /*
         * INDEX PATIENTS BY PATIENT CODE
         */
        const patientsByCode = new Map<
          string,
          PatientRecord
        >();

        patients.forEach((patient) => {
          if (patient.patientId) {
            patientsByCode.set(
              patient.patientId.toLowerCase(),
              patient
            );
          }
        });

        /*
         * Keep track of patients already represented
         * by an appointment.
         */
        const appointmentPatientCodes =
          new Set<string>();

        /*
         * MAP APPOINTMENTS
         */
        const mappedAppointments: QueuePatient[] =
          appointments
            .filter(
              (appointment) =>
                appointment.status !==
                  "cancelled" &&
                appointment.status !== "no_show"
            )
            .map((appointment) => {
              const patientCode =
                extractPatientCode(
                  appointment.patientName
                );

              if (patientCode) {
                appointmentPatientCodes.add(
                  patientCode.toLowerCase()
                );
              }

              const patient = patientCode
                ? patientsByCode.get(
                    patientCode.toLowerCase()
                  )
                : undefined;

              /*
               * Determine the clinical status.
               *
               * IMPORTANT:
               * completed_today ALWAYS wins over
               * appointment status.
               */
              let queueStatus: QueueStatus =
                "waiting";

              if (
                patient?.status ===
                "completed_today"
              ) {
                queueStatus = "completed";
              } else if (
                patient?.status ===
                "in_consultation"
              ) {
                queueStatus =
                  "in-consultation";
              } else if (
                appointment.status ===
                "completed"
              ) {
                queueStatus = "completed";
              } else if (
                appointment.status ===
                "checked_in"
              ) {
                queueStatus = "waiting";
              }

              const appointmentDate =
                getAppointmentDateString(
                  appointment.startTime
                );

              /*
               * IMPORTANT:
               * If the patient has completed the
               * consultation, expose the appointment
               * status as completed in the dashboard
               * as well.
               *
               * This prevents:
               * "Completed" filter + "Checked In" badge.
               */
              const displayAppointmentStatus =
                queueStatus === "completed"
                  ? "completed"
                  : appointment.status;

              return {
                id:
                  patient?.patientId ||
                  patientCode ||
                  appointment.id,

                fullName:
                  patient?.fullName ||
                  appointment.patientName,

                age: patient?.age ?? null,

                gender:
                  patient?.gender ?? null,

                triageNote:
                  patient?.primaryComplaint ||
                  appointment.notes ||
                  "No triage notes recorded yet.",

                priority: "Normal",

                status: queueStatus,

                appointmentStatus:
                  displayAppointmentStatus,

                appointmentStart:
                  appointment.startTime,

                appointmentEnd:
                  appointment.endTime,

                appointmentDate,

                appointmentTime:
                  formatAppointmentTime(
                    appointment.startTime,
                    appointment.endTime
                  ),

                physician:
                  appointment.physician,

                appointmentId:
                  appointment.id,

                hasAppointment: true,
              };
            });

        /*
         * NON-APPOINTMENT CLINICAL PATIENTS
         *
         * This includes:
         * - in_consultation
         * - completed_today
         */
        const triagedPatients: QueuePatient[] =
          patients
            .filter((patient) => {
              const validStatus =
                patient.status ===
                  "in_consultation" ||
                patient.status ===
                  "completed_today";

              const patientCode =
                patient.patientId?.toLowerCase();

              const alreadyInAppointment =
                patientCode
                  ? appointmentPatientCodes.has(
                      patientCode
                    )
                  : false;

              return (
                validStatus &&
                !alreadyInAppointment
              );
            })
            .filter((patient) => {
              const patientDate =
                getPatientLastVisitDate(
                  patient
                );

              return (
                !patientDate ||
                patientDate === selectedDate
              );
            })
            .map((patient) => {
              const isCompleted =
                patient.status ===
                "completed_today";

              return {
                id: patient.patientId,

                fullName: patient.fullName,

                age: patient.age ?? null,

                gender: patient.gender ?? null,

                triageNote:
                  patient.primaryComplaint ||
                  "Patient completed triage and is ready for examination.",

                priority: "Normal",

                status: isCompleted
                  ? "completed"
                  : "in-consultation",

                /*
                 * Make the appointment status agree
                 * with the clinical status.
                 */
                appointmentStatus: isCompleted
                  ? "completed"
                  : "checked_in",

                appointmentStart: "",

                appointmentEnd: "",

                appointmentDate:
                  selectedDate,

                appointmentTime:
                  "Walk-in / Triage",

                physician: "",

                appointmentId:
                  `patient-${patient.patientId}`,

                hasAppointment: false,
              };
            });

        /*
         * COMBINE BOTH QUEUES
         */
        const combinedQueue = [
          ...mappedAppointments,
          ...triagedPatients,
        ];

        /*
         * SORT:
         * 1. In consultation
         * 2. Waiting
         * 3. Completed
         */
        combinedQueue.sort((a, b) => {
          if (
            a.status === "in-consultation" &&
            b.status !== "in-consultation"
          ) {
            return -1;
          }

          if (
            a.status !== "in-consultation" &&
            b.status === "in-consultation"
          ) {
            return 1;
          }

          if (
            a.status === "completed" &&
            b.status !== "completed"
          ) {
            return 1;
          }

          if (
            a.status !== "completed" &&
            b.status === "completed"
          ) {
            return -1;
          }

          /*
           * Walk-ins before unavailable appointment
           * timestamps.
           */
          if (
            !a.appointmentStart &&
            b.appointmentStart
          ) {
            return -1;
          }

          if (
            a.appointmentStart &&
            !b.appointmentStart
          ) {
            return 1;
          }

          const aTime = a.appointmentStart
            ? new Date(
                a.appointmentStart
              ).getTime()
            : 0;

          const bTime = b.appointmentStart
            ? new Date(
                b.appointmentStart
              ).getTime()
            : 0;

          if (
            Number.isNaN(aTime) &&
            Number.isNaN(bTime)
          ) {
            return 0;
          }

          if (Number.isNaN(aTime)) {
            return 1;
          }

          if (Number.isNaN(bTime)) {
            return -1;
          }

          return aTime - bTime;
        });

        setDoctorQueue(combinedQueue);
      } catch (error) {
        console.error(
          "Failed to load doctor queue:",
          error
        );

        if (!cancelled) {
          setDoctorQueue([]);

          setAppointmentError(
            error instanceof Error
              ? error.message
              : "Failed to load doctor queue."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingQueue(false);
        }
      }
    }

    loadQueue();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  /*
   * LOAD NOTIFICATIONS
   */
  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const response = await fetch(
          "/api/activity-logs?limit=6",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load activity."
          );
        }

        const data =
          await response.json();

        const logs: ActivityLog[] =
          Array.isArray(data?.logs)
            ? data.logs
            : [];

        if (cancelled) {
          return;
        }

        setNotifications(
          logs.map(
            (
              log: ActivityLog,
              index: number
            ) => ({
              id: log.id,
              title: log.action,
              message:
                log.details ||
                `Logged by ${log.user}`,
              time: new Date(
                log.timestamp
              ).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              read: index >= 2,
              type:
                log.category === "CLINICAL"
                  ? "urgent"
                  : "info",
            })
          )
        );
      } catch (error) {
        console.error(
          "Failed to load notifications:",
          error
        );
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * FILTER QUEUE
   */
  const filteredQueue =
    doctorQueue.filter((item) => {
      const normalizedSearch =
        searchQuery
          .trim()
          .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        item.fullName
          .toLowerCase()
          .includes(normalizedSearch) ||
        item.id
          .toLowerCase()
          .includes(normalizedSearch) ||
        item.physician
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        item.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });

  /*
   * METRICS
   */
  const waitingCount =
    doctorQueue.filter(
      (patient) =>
        patient.status === "waiting" ||
        patient.status ===
          "in-consultation"
    ).length;

  const completedCount =
    doctorQueue.filter(
      (patient) =>
        patient.status === "completed"
    ).length;

  /*
   * OPEN PATIENT ENCOUNTER
   */
  const handleStartConsultation = (
    item: QueuePatient
  ) => {
    /*
     * Completed patients can only be reviewed.
     */
    if (item.status === "completed") {
      router.push(
        `/doctor/patients/${encodeURIComponent(
          item.id
        )}/encounter`
      );
      return;
    }

    /*
     * Scheduled appointment cannot start
     * until the patient checks in.
     */
    if (
      item.hasAppointment &&
      item.appointmentStatus ===
        "scheduled"
    ) {
      return;
    }

    if (
      item.appointmentStatus ===
        "cancelled" ||
      item.appointmentStatus ===
        "no_show"
    ) {
      return;
    }

    router.push(
      `/doctor/patients/${encodeURIComponent(
        item.id
      )}/encounter`
    );
  };

  const isToday =
    selectedDate ===
    getLocalDateString();

  return (
    <div className="min-h-screen w-full bg-[#F3F0F7] text-slate-800 font-sans antialiased">
      {/* HEADER */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 w-96">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

            <input
              type="text"
              placeholder="Search patient records, charts, or orders... (⌘K)"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-12 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5E35B1] transition"
            />

            <span className="absolute right-2.5 top-2 text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
              ⌘K
            </span>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        <div className="flex items-center gap-4 relative">
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen(
                (current) => !current
              )
            }
            className="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-purple-50 hover:text-[#5E35B1] transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />

            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-12 w-80 md:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800">
                    Notifications
                  </h3>

                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[#5E35B1] font-bold text-[10px]">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={
                        markAllAsRead
                      }
                      className="text-[10px] text-[#5E35B1] font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Mark read
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setNotificationsOpen(
                        false
                      )
                    }
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    aria-label="Close notifications"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {notifications.length ===
                0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No notifications.
                  </div>
                ) : (
                  notifications.map(
                    (item) => (
                      <div
                        key={item.id}
                        className={`p-3.5 transition flex gap-3 ${
                          item.read
                            ? "bg-white"
                            : "bg-purple-50/40"
                        }`}
                      >
                        <div className="pt-0.5">
                          {item.type ===
                          "urgent" ? (
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-[#5E35B1] shrink-0" />
                          )}
                        </div>

                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`font-bold text-xs ${
                                item.read
                                  ? "text-slate-700"
                                  : "text-slate-900"
                              }`}
                            >
                              {item.title}
                            </p>

                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {item.time}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 leading-normal">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* METRICS */}
      <div className="bg-[#5E35B1] text-white px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
        {/* WAITING */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">
              Waiting for Exam
            </p>

            <p className="text-2xl font-extrabold text-white">
              {isLoadingQueue
                ? "..."
                : `${waitingCount} Patient${
                    waitingCount === 1
                      ? ""
                      : "s"
                  }`}
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* COMPLETED */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">
              Consultations Done
            </p>

            <p className="text-2xl font-extrabold text-white">
              {isLoadingQueue
                ? "..."
                : `${completedCount} Patient${
                    completedCount === 1
                      ? ""
                      : "s"
                  }`}
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* CLINIC ROOM */}
        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[11px] text-purple-100 uppercase tracking-wider font-semibold">
                Clinic Room
              </p>

              <span className="text-[8px] font-bold uppercase text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded">
                Demo data
              </span>
            </div>

            <p className="text-2xl font-extrabold text-white">
              Optometry Room 03
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-purple-400/20 text-purple-200 flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-purple-100 shadow-sm space-y-5">
          {/* DATE CONTROLS */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#5E35B1]" />

                <h1 className="text-lg font-extrabold text-slate-900">
                  Doctor Appointments & Queue
                </h1>
              </div>

              <p className="text-xs text-slate-500 mt-1">
                {currentStaffName
                  ? `Schedule and clinical queue for ${currentStaffName}`
                  : "Appointments and patients ready for clinical examination."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="appointment-date"
                  className="text-xs font-semibold text-slate-600"
                >
                  Date
                </label>

                <input
                  id="appointment-date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) =>
                    setSelectedDate(
                      event.target.value
                    )
                  }
                  className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#5E35B1]"
                />
              </div>

              {isToday && (
                <span className="px-2.5 py-1.5 rounded-lg bg-purple-100 text-[#5E35B1] text-[10px] font-bold uppercase tracking-wider">
                  Today
                </span>
              )}
            </div>
          </div>

          {/* STATUS FILTER */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />

              <span className="text-xs font-semibold text-slate-600">
                Status:
              </span>

              <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() =>
                    setStatusFilter("all")
                  }
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-[#5E35B1] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setStatusFilter("waiting")
                  }
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    statusFilter === "waiting"
                      ? "bg-[#5E35B1] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Waiting
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      "in-consultation"
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    statusFilter ===
                    "in-consultation"
                      ? "bg-[#5E35B1] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  In Consultation
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setStatusFilter("completed")
                  }
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    statusFilter === "completed"
                      ? "bg-[#5E35B1] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              {formatAppointmentDate(
                selectedDate
              )}
            </div>
          </div>

          {/* ERROR */}
          {appointmentError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />

              <span>
                {appointmentError}
              </span>
            </div>
          )}

          {/* QUEUE TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">
                    Appointment / Queue
                  </th>

                  <th className="py-3 px-4">
                    Patient Details
                  </th>

                  <th className="py-3 px-4">
                    Triage Notes / Chief Complaint
                  </th>

                  <th className="py-3 px-4">
                    Priority
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
                {isLoadingQueue ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-slate-400"
                    >
                      Loading doctor queue...
                    </td>
                  </tr>
                ) : filteredQueue.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <CalendarDays className="w-7 h-7 text-slate-300" />

                        <p className="font-semibold text-slate-500">
                          No patients found
                        </p>

                        <p className="text-[11px] text-slate-400">
                          There are no
                          appointments or
                          triaged patients
                          matching this date
                          and filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map(
                    (item) => {
                      /*
                       * The queue status is now the
                       * primary source of truth.
                       */
                      const isCompleted =
                        item.status ===
                        "completed";

                      const canStart =
                        !isCompleted &&
                        (
                          item.status ===
                            "in-consultation" ||
                          item.appointmentStatus ===
                            "checked_in"
                        );

                      return (
                        <tr
                          key={
                            item.appointmentId
                          }
                          className="hover:bg-purple-50/40 transition"
                        >
                          {/* APPOINTMENT / QUEUE */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-2">
                              <div className="w-8 h-8 rounded-lg bg-purple-100 text-[#5E35B1] flex items-center justify-center shrink-0">
                                <Clock className="w-4 h-4" />
                              </div>

                              <div>
                                <div className="font-extrabold text-slate-900">
                                  {item.hasAppointment
                                    ? item.appointmentTime
                                    : "Walk-in / Triage"}
                                </div>

                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {item.hasAppointment
                                    ? formatAppointmentDate(
                                        item.appointmentDate
                                      )
                                    : "Clinical queue"}
                                </div>

                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {item.hasAppointment
                                    ? item.physician ||
                                      "Physician not specified"
                                    : "No appointment booked"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* PATIENT */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">
                              {item.fullName}
                            </div>

                            <div className="text-[11px] text-slate-400">
                              {item.id}

                              {item.age !==
                              null
                                ? ` • ${item.age} yrs`
                                : ""}

                              {item.gender
                                ? `, ${item.gender}`
                                : ""}
                            </div>
                          </td>

                          {/* COMPLAINT */}
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                            <div className="truncate">
                              {item.triageNote}
                            </div>
                          </td>

                          {/* PRIORITY */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.priority ===
                                "Priority"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {item.priority}
                            </span>
                          </td>

                          {/* STATUS */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                                  isCompleted
                                    ? "bg-emerald-100 text-emerald-800"
                                    : item.status ===
                                      "in-consultation"
                                    ? "bg-purple-100 text-[#5E35B1]"
                                    : item.appointmentStatus ===
                                      "checked_in"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {isCompleted
                                  ? "Completed"
                                  : item.status ===
                                    "in-consultation"
                                  ? "In Consultation"
                                  : getAppointmentStatusLabel(
                                      item.appointmentStatus
                                    )}
                              </span>

                              {!isCompleted &&
                                item.status ===
                                  "in-consultation" && (
                                  <span className="text-[9px] text-[#5E35B1]">
                                    Ready for doctor
                                  </span>
                                )}

                              {!isCompleted &&
                                item.appointmentStatus ===
                                  "scheduled" &&
                                item.status !==
                                  "in-consultation" && (
                                  <span className="text-[9px] text-slate-400">
                                    Awaiting check-in
                                  </span>
                                )}

                              {!isCompleted &&
                                item.appointmentStatus ===
                                  "checked_in" &&
                                item.status !==
                                  "in-consultation" && (
                                  <span className="text-[9px] text-blue-600">
                                    Patient checked in
                                  </span>
                                )}
                            </div>
                          </td>

                          {/* ACTION */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleStartConsultation(
                                  item
                                )
                              }
                              disabled={
                                !canStart &&
                                !isCompleted
                              }
                              className={`px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5 group ${
                                canStart ||
                                isCompleted
                                  ? "bg-[#5E35B1] hover:bg-[#4527A0] text-white cursor-pointer"
                                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                              }`}
                            >
                              <span>
                                {isCompleted
                                  ? "Review EMR"
                                  : canStart
                                  ? "Start Exam"
                                  : "Awaiting Check-in"}
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
      </main>
    </div>
  );
}