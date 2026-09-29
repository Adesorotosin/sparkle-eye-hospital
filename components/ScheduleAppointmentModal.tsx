"use client";

import React, { useEffect, useState } from "react";
import { X, User, AlertCircle, Loader2 } from "lucide-react";

interface Doctor {
  id: string;
  staffId: string;
  name: string;
  title?: string | null;
  department?: string | null;
}

interface ScheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBooked?: () => void;
}

export default function ScheduleAppointmentModal({
  isOpen,
  onClose,
  onBooked,
}: ScheduleAppointmentModalProps) {
  const [patientName, setPatientName] = useState("");
  const [doctorStaffId, setDoctorStaffId] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointmentType, setAppointmentType] = useState("Consultation");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:45");
  const [priority, setPriority] = useState("Confirmed");
  const [notes, setNotes] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);

    setDate(localDate);
    setError("");
    setSubmitting(false);

    const loadDoctors = async () => {
      setLoadingDoctors(true);

      try {
        const response = await fetch("/api/doctors", { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load doctors.");
        }

        const availableDoctors = Array.isArray(payload?.doctors)
          ? payload.doctors
          : [];

        setDoctors(availableDoctors);

        if (availableDoctors.length > 0) {
          setDoctorStaffId((current) =>
            availableDoctors.some((doctor: Doctor) => doctor.id === current)
              ? current
              : availableDoctors[0].id
          );
        } else {
          setDoctorStaffId("");
        }
      } catch (err) {
        setDoctors([]);
        setDoctorStaffId("");
        setError(err instanceof Error ? err.message : "Failed to load doctors.");
      } finally {
        setLoadingDoctors(false);
      }
    };

    void loadDoctors();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!doctorStaffId) {
      setError("Please select an active doctor.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName,
          doctorStaffId,
          date,
          startTime,
          endTime,
          notes: [
            appointmentType ? `Appointment type: ${appointmentType}` : "",
            priority ? `Priority: ${priority}` : "",
            notes.trim(),
          ]
            .filter(Boolean)
            .join(" • "),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to book appointment.");
      }

      onBooked?.();
      onClose();
      setPatientName("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Schedule Appointment
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Select an active doctor from the staff directory.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-bold text-slate-700">
          <div>
            <label className="block mb-1 text-slate-600">Patient Name / MRN</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Search patient or enter name..."
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pl-9 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-slate-600">Assigned Physician</label>
            <select
              required
              value={doctorStaffId}
              onChange={(e) => setDoctorStaffId(e.target.value)}
              disabled={loadingDoctors || submitting}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition disabled:opacity-60"
            >
              {loadingDoctors && <option value="">Loading doctors...</option>}
              {!loadingDoctors && doctors.length === 0 && (
                <option value="">No active doctors available</option>
              )}
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}{doctor.title ? ` — ${doctor.title}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-slate-600">Appointment / Procedure Type</label>
              <input
                type="text"
                required
                placeholder="e.g. Cataract Extraction, Glaucoma Check"
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block mb-1 text-slate-600">Status / Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
              >
                <option>Confirmed</option>
                <option>Pending</option>
                <option>Priority</option>
                <option>Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 text-slate-600">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-600">Start Time</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-600">End Time</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-slate-600">
              Clinical Notes / Special Instructions
            </label>
            <textarea
              rows={2}
              placeholder="Add surgical requirements, pre-op preparations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingDoctors || doctors.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-5 py-2 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Booking..." : "Confirm & Book Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
