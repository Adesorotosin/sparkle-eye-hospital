"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Settings,
} from "lucide-react";
import ScheduleAppointmentModal from "@/components/ScheduleAppointmentModal";

type ViewMode = "Day" | "Week" | "Month" | "Resource Grid";

interface Appointment {
  id: string;
  patientName: string;
  patientId?: string | null;
  physician: string;
  doctorStaffId?: string | null;
  startTime: string;
  endTime: string;
  status: "scheduled" | "checked_in" | "completed" | "cancelled" | "no_show";
  notes?: string | null;
}

interface AppointmentResponse {
  appointments?: Appointment[];
  error?: string;
}

function toLocalDateInput(date: Date) {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : toLocalDateInput(date);
}

function statusLabel(status: Appointment["status"]) {
  return status.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: Appointment["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-800";
    case "checked_in":
      return "bg-sky-100 text-sky-800";
    case "cancelled":
      return "bg-rose-100 text-rose-800";
    case "no_show":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-purple-100 text-purple-800";
  }
}

function extractAppointmentType(notes?: string | null) {
  const match = notes?.match(/Appointment type:\s*([^•]+)/i);
  return match?.[1]?.trim() || "Consultation";
}

export default function ResourceCalendar() {
  const [viewMode, setViewMode] = useState<ViewMode>("Resource Grid");
  const [selectedPhysician, setSelectedPhysician] = useState("All Physicians");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [rangeAppointments, setRangeAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedDate = toLocalDateInput(currentDate);

  const loadDayAppointments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/appointments?date=${encodeURIComponent(selectedDate)}`,
        { cache: "no-store" }
      );
      const payload: AppointmentResponse = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load appointments.");
      }

      setAppointments(payload.appointments ?? []);
    } catch (err) {
      setAppointments([]);
      setError(err instanceof Error ? err.message : "Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const loadRangeAppointments = useCallback(async () => {
    if (viewMode === "Day" || viewMode === "Resource Grid") {
      setRangeAppointments([]);
      return;
    }

    setRangeLoading(true);

    try {
      const dates: string[] = [];

      if (viewMode === "Week") {
        const start = new Date(currentDate);
        start.setDate(start.getDate() - start.getDay());

        for (let index = 0; index < 7; index += 1) {
          const date = new Date(start);
          date.setDate(start.getDate() + index);
          dates.push(toLocalDateInput(date));
        }
      } else {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= lastDay; day += 1) {
          dates.push(toLocalDateInput(new Date(year, month, day)));
        }
      }

      const results = await Promise.all(
        dates.map(async (date) => {
          const response = await fetch(
            `/api/appointments?date=${encodeURIComponent(date)}`,
            { cache: "no-store" }
          );
          const payload: AppointmentResponse = await response.json();

          if (!response.ok) {
            throw new Error(payload.error || "Failed to load calendar appointments.");
          }

          return payload.appointments ?? [];
        })
      );

      setRangeAppointments(results.flat());
    } catch (err) {
      setRangeAppointments([]);
      setError(err instanceof Error ? err.message : "Failed to load calendar.");
    } finally {
      setRangeLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    void loadDayAppointments();
  }, [loadDayAppointments]);

  useEffect(() => {
    void loadRangeAppointments();
  }, [loadRangeAppointments]);

  const physicianOptions = useMemo(() => {
    const names = new Set<string>();

    [...appointments, ...rangeAppointments].forEach((appointment) => {
      if (appointment.physician) names.add(appointment.physician);
    });

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [appointments, rangeAppointments]);

  const visibleAppointments = useMemo(() => {
    if (selectedPhysician === "All Physicians") return appointments;
    return appointments.filter(
      (appointment) => appointment.physician === selectedPhysician
    );
  }, [appointments, selectedPhysician]);

  const visibleRangeAppointments = useMemo(() => {
    if (selectedPhysician === "All Physicians") return rangeAppointments;
    return rangeAppointments.filter(
      (appointment) => appointment.physician === selectedPhysician
    );
  }, [rangeAppointments, selectedPhysician]);

  const handlePrev = () => {
    setCurrentDate((previous) => {
      const next = new Date(previous);
      if (viewMode === "Month") next.setMonth(next.getMonth() - 1);
      else if (viewMode === "Week") next.setDate(next.getDate() - 7);
      else next.setDate(next.getDate() - 1);
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((previous) => {
      const next = new Date(previous);
      if (viewMode === "Month") next.setMonth(next.getMonth() + 1);
      else if (viewMode === "Week") next.setDate(next.getDate() + 7);
      else next.setDate(next.getDate() + 1);
      return next;
    });
  };

  const handleToday = () => setCurrentDate(new Date());

  const formattedDateString =
    viewMode === "Month"
      ? formatDate(currentDate, { month: "long", year: "numeric" })
      : formatDate(currentDate, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });

  const dayCounts = useMemo(() => {
    const scheduled = visibleAppointments.filter(
      (item) => item.status === "scheduled"
    ).length;
    const checkedIn = visibleAppointments.filter(
      (item) => item.status === "checked_in"
    ).length;
    const completed = visibleAppointments.filter(
      (item) => item.status === "completed"
    ).length;

    return { scheduled, checkedIn, completed };
  }, [visibleAppointments]);

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex flex-col text-slate-800 font-sans antialiased selection:bg-purple-100 selection:text-purple-900">
      <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Appointment Calendar
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {formattedDateString}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold text-slate-600">
            {(["Resource Grid", "Day", "Week", "Month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  viewMode === mode
                    ? "bg-purple-600 text-white shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <select
            value={selectedPhysician}
            onChange={(event) => setSelectedPhysician(event.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none shadow-2xs"
          >
            <option>All Physicians</option>
            {physicianOptions.map((physician) => (
              <option key={physician}>{physician}</option>
            ))}
          </select>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Schedule Appointment
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold"
          >
            Today
          </button>
          <button
            onClick={() => {
              void loadDayAppointments();
              void loadRangeAppointments();
            }}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading || rangeLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <h2 className="text-sm font-extrabold text-slate-900">{formattedDateString}</h2>

        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600" title="Print">
            <Printer className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600" title="Settings">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 overflow-x-auto">
        {(viewMode === "Resource Grid" || viewMode === "Day") && (
          <div className="min-w-[760px] bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900">
                  {selectedPhysician === "All Physicians"
                    ? "All Doctors"
                    : selectedPhysician}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {visibleAppointments.length} appointment
                  {visibleAppointments.length === 1 ? "" : "s"} scheduled for this day
                </p>
              </div>
              {loading && <Loader2 className="w-5 h-5 animate-spin text-purple-600" />}
            </div>

            {loading ? (
              <div className="p-12 text-center text-sm text-slate-500">
                Loading appointments...
              </div>
            ) : visibleAppointments.length === 0 ? (
              <div className="p-12 text-center">
                <p className="font-extrabold text-slate-700">No appointments</p>
                <p className="text-xs text-slate-500 mt-1">
                  There are no appointments matching this date and doctor filter.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="grid grid-cols-[110px_minmax(180px,1fr)_minmax(180px,1fr)_120px] gap-4 items-center p-4 hover:bg-slate-50/70 transition"
                  >
                    <div>
                      <p className="font-extrabold text-slate-900">
                        {formatTime(appointment.startTime)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatTime(appointment.endTime)}
                      </p>
                    </div>

                    <div>
                      <p className="font-extrabold text-slate-900">
                        {appointment.patientName}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {extractAppointmentType(appointment.notes)}
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-700">{appointment.physician}</p>
                      <p className="text-[11px] text-slate-400">
                        {appointment.patientId ? `Patient ID: ${appointment.patientId}` : "Patient record linked"}
                      </p>
                    </div>

                    <span className={`justify-self-start px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${statusClass(appointment.status)}`}>
                      {statusLabel(appointment.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === "Week" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs min-w-[950px]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Weekly Appointments</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Real appointments from the scheduling system
                </p>
              </div>
              {rangeLoading && <Loader2 className="w-5 h-5 animate-spin text-purple-600" />}
            </div>

            <div className="grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, index) => {
                const start = new Date(currentDate);
                start.setDate(start.getDate() - start.getDay() + index);
                const dateKey = toLocalDateInput(start);
                const dayAppointments = visibleRangeAppointments.filter(
                  (appointment) => getDateKey(appointment.startTime) === dateKey
                );

                return (
                  <div key={dateKey} className="rounded-xl border border-slate-200 bg-slate-50/50 min-h-[360px] p-3">
                    <div className="pb-3 border-b border-slate-200">
                      <p className="text-[11px] font-bold text-slate-500">
                        {start.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p className="text-sm font-extrabold text-slate-900">
                        {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>

                    <div className="space-y-2 mt-3">
                      {dayAppointments.length === 0 ? (
                        <p className="text-[10px] text-slate-400">No appointments</p>
                      ) : (
                        dayAppointments.map((appointment) => (
                          <div key={appointment.id} className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-2xs">
                            <p className="text-[10px] font-extrabold text-purple-700">
                              {formatTime(appointment.startTime)}
                            </p>
                            <p className="text-[11px] font-extrabold text-slate-900 mt-1">
                              {appointment.patientName}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                              {appointment.physician}
                            </p>
                            <span className={`inline-block mt-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${statusClass(appointment.status)}`}>
                              {statusLabel(appointment.status)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "Month" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {formattedDateString} Appointments
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {visibleRangeAppointments.length} appointment
                  {visibleRangeAppointments.length === 1 ? "" : "s"} in this month
                </p>
              </div>
              {rangeLoading && <Loader2 className="w-5 h-5 animate-spin text-purple-600" />}
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-3">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({
                length: new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth() + 1,
                  0
                ).getDate(),
              }).map((_, index) => {
                const day = index + 1;
                const date = new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day
                );
                const dateKey = toLocalDateInput(date);
                const dayAppointments = visibleRangeAppointments.filter(
                  (appointment) => getDateKey(appointment.startTime) === dateKey
                );
                const isSelected = day === currentDate.getDate();

                return (
                  <button
                    key={dateKey}
                    onClick={() => {
                      setCurrentDate(date);
                      setViewMode("Day");
                    }}
                    className={`text-left border rounded-xl p-2 min-h-[120px] transition ${
                      isSelected
                        ? "bg-purple-50 border-purple-500 ring-1 ring-purple-500"
                        : "bg-white border-slate-200 hover:border-purple-300"
                    }`}
                  >
                    <span className={`text-xs font-extrabold ${isSelected ? "text-purple-700" : "text-slate-700"}`}>
                      {day}
                    </span>

                    <div className="space-y-1 mt-2">
                      {dayAppointments.slice(0, 3).map((appointment) => (
                        <div key={appointment.id} className="rounded-md bg-slate-50 px-1.5 py-1">
                          <p className="text-[9px] font-extrabold text-slate-800 truncate">
                            {formatTime(appointment.startTime)} · {appointment.patientName}
                          </p>
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <p className="text-[9px] font-bold text-purple-600">
                          +{dayAppointments.length - 3} more
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200/80 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-600">
        <div className="flex flex-wrap items-center gap-5">
          <span>{visibleAppointments.length} appointments today</span>
          <span>{dayCounts.scheduled} scheduled</span>
          <span>{dayCounts.checkedIn} checked in</span>
          <span>{dayCounts.completed} completed</span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          Synced from scheduling database
        </span>
      </footer>

      <ScheduleAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onBooked={() => {
          void loadDayAppointments();
          void loadRangeAppointments();
        }}
      />
    </div>
  );
}
