'use client';

import React, { useState } from "react";
import { X, Calendar, Clock, User, Stethoscope, AlertCircle } from "lucide-react";

interface ScheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduleAppointmentModal({
  isOpen,
  onClose,
}: ScheduleAppointmentModalProps) {
  const [patientName, setPatientName] = useState("");
  const [resource, setResource] = useState("Consultation Room 1");
  const [physician, setPhysician] = useState("Dr. James Okoro");
  const [appointmentType, setAppointmentType] = useState("Consultation");
  const [date, setDate] = useState("2026-08-30");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:45");
  const [priority, setPriority] = useState("Confirmed");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic to save appointment to state or database
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Schedule Appointment / OR Slot
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Book a consultation room or surgical theater
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-bold text-slate-700">
          {/* Patient Search / Name */}
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

          {/* Resource & Physician Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-slate-600">Resource / Room</label>
              <select
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
              >
                <option>Consultation Room 1</option>
                <option>Consultation Room 2</option>
                <option>OR-1 (Cataract Suite)</option>
                <option>OR-2 (Laser Eye Suite)</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-slate-600">Assigned Physician</label>
              <select
                value={physician}
                onChange={(e) => setPhysician(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
              >
                <option>Dr. James Okoro</option>
                <option>Dr. Amina Bello</option>
                <option>Dr. Sarah Patel</option>
                <option>Dr. Fatima Hassan</option>
              </select>
            </div>
          </div>

          {/* Procedure Type & Priority */}
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

          {/* Date, Start Time, End Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 text-slate-600">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-600">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-600">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block mb-1 text-slate-600">Clinical Notes / Special Instructions</label>
            <textarea
              rows={2}
              placeholder="Add surgical requirements, pre-op preparations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-5 py-2 rounded-xl transition shadow-xs"
            >
              Confirm & Book Slot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}