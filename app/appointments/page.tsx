'use client';

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Settings,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import ScheduleAppointmentModal from "@/components/ScheduleAppointmentModal";

export default function ResourceCalendar() {
  const [viewMode, setViewMode] = useState<"Day" | "Week" | "Month" | "Resource Grid">("Day");
  const [selectedPhysician, setSelectedPhysician] = useState("All Physicians");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex flex-col text-slate-800 font-sans antialiased selection:bg-purple-100 selection:text-purple-900">
      {/* TOP NAVBAR / HEADER */}
      <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Resource Calendar
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Wednesday, August 30, 2026
          </p>
        </div>

        {/* View Controls & Actions */}
        <div className="flex flex-wrap items-center gap-4">
          {/* View Segment Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold text-slate-600">
            {(["Day", "Week", "Month", "Resource Grid"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-1.5 rounded-lg transition ${
                  viewMode === mode
                    ? "bg-purple-600 text-white shadow-xs"
                    : "hover:text-slate-900"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Physician Dropdown Filter */}
          <select
            value={selectedPhysician}
            onChange={(e) => setSelectedPhysician(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition focus:outline-none shadow-2xs"
          >
            <option>All Physicians</option>
            <option>Dr. James Okoro</option>
            <option>Dr. Amina Bello</option>
          </select>

          {/* Schedule Primary Action */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Schedule Appointment / OR Slot
          </button>
        </div>
      </header>

      {/* CALENDAR CONTROLS SUB-HEADER */}
      <div className="bg-white border-b border-slate-200/80 px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition ml-1">
            Today
          </button>
        </div>

        <h2 className="text-sm font-extrabold text-slate-900">
          August 30, 2026
        </h2>

        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition">
            <Printer className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RESOURCE GRID MAIN VIEW */}
      <main className="flex-1 p-6 overflow-x-auto">
        <div className="min-w-[1100px] bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Resource Columns Header */}
          <div className="grid grid-cols-12 border-b border-slate-200/80 bg-slate-50/50 text-xs">
            <div className="col-span-1 p-4 border-r border-slate-200/80"></div>

            {/* Room 1 */}
            <div className="col-span-3 p-4 border-r border-slate-200/80 border-t-4 border-t-emerald-500">
              <div className="flex items-center gap-2 font-extrabold text-slate-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Consultation Room 1
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Dr. James Okoro &mdash; Ophthalmology
              </p>
            </div>

            {/* Room 2 */}
            <div className="col-span-3 p-4 border-r border-slate-200/80 border-t-4 border-t-emerald-500">
              <div className="flex items-center gap-2 font-extrabold text-slate-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Consultation Room 2
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Dr. Amina Bello &mdash; Retina Specialist
              </p>
            </div>

            {/* OR-1 */}
            <div className="col-span-3 p-4 border-r border-slate-200/80 border-t-4 border-t-sky-500">
              <div className="flex items-center gap-2 font-extrabold text-slate-900">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                OR-1 (Cataract Suite)
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Surgical Theater
              </p>
            </div>

            {/* OR-2 */}
            <div className="col-span-2 p-4 border-t-4 border-t-amber-500">
              <div className="flex items-center gap-2 font-extrabold text-slate-900">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                OR-2 (Laser Eye Suite)
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Laser Center
              </p>
            </div>
          </div>

          {/* GRID HOURLY SLOTS */}
          <div className="divide-y divide-slate-100 text-xs">
            {/* 08:00 AM */}
            <div className="grid grid-cols-12 min-h-[90px]">
              <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">
                08:00 AM
              </div>
              {/* Room 1 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-purple-50 border-l-4 border-l-purple-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-purple-950">Adebayo Funmi</strong>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                  </div>
                  <p className="text-[11px] text-purple-700 font-medium mt-1">Post-Op Follow-up (08:00–08:30)</p>
                </div>
              </div>
              {/* Room 2 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-emerald-50/80 border-l-4 border-l-emerald-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-900">Oluwaseun Adeyemi</strong>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">Retinal Exam (08:30–09:15)</p>
                </div>
              </div>
              {/* OR-1 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-emerald-50/60 border-l-4 border-l-emerald-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-900">Adebayo Funmi</strong>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">Priority</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">Cataract Extraction + IOL (08:00–10:00)</p>
                </div>
              </div>
              {/* OR-2 */}
              <div className="col-span-2 p-2"></div>
            </div>

            {/* 09:00 AM */}
            <div className="grid grid-cols-12 min-h-[90px]">
              <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">
                09:00 AM
              </div>
              {/* Room 1 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-purple-50 border-l-4 border-l-purple-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-purple-950">Margaret Chen</strong>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                  </div>
                  <p className="text-[11px] text-purple-700 font-medium mt-1">Annual Eye Exam (09:00–09:45)</p>
                </div>
              </div>
              {/* Room 2 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              {/* OR-1 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80 bg-slate-50/40 flex items-center justify-center text-[10px] text-slate-400 font-medium">
                [OR-1 Buyout Cont.]
              </div>
              {/* OR-2 */}
              <div className="col-span-2 p-2">
                <div className="bg-amber-50 border-l-4 border-l-amber-500 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-900">Priya Sharma</strong>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">LASIK Procedure (09:00–10:00)</p>
                </div>
              </div>
            </div>

            {/* 10:00 AM */}
            <div className="grid grid-cols-12 min-h-[90px]">
              <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">
                10:00 AM
              </div>
              {/* Room 1 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-purple-50 border-l-4 border-l-purple-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-purple-950">Priya Sharma</strong>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">Pending</span>
                  </div>
                  <p className="text-[11px] text-purple-700 font-medium mt-1">Glaucoma Check (10:00–10:30)</p>
                </div>
              </div>
              {/* Room 2 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-emerald-50/80 border-l-4 border-l-emerald-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-900">James Mitchell</strong>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">Urgent</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">Macular Review (10:00–11:00)</p>
                </div>
              </div>
              {/* OR-1 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-slate-100 border-l-4 border-l-slate-400 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-800">Sterilization Window</strong>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold text-[10px]">Blocked</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Maintenance / Sterility Block</p>
                </div>
              </div>
              {/* OR-2 */}
              <div className="col-span-2 p-2"></div>
            </div>

            {/* 11:00 AM */}
            <div className="grid grid-cols-12 min-h-[90px]">
              <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">
                11:00 AM
              </div>
              {/* Room 1 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-purple-50 border-l-4 border-l-purple-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-purple-950">Emmanuel Okafor</strong>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                  </div>
                  <p className="text-[11px] text-purple-700 font-medium mt-1">Diabetic Screening (11:30–12:00)</p>
                </div>
              </div>
              {/* Room 2 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              {/* OR-1 */}
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-emerald-50/60 border-l-4 border-l-emerald-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-900">Margaret Chen</strong>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">Priority</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">Phaco + IOL Insertion (11:00–01:00)</p>
                </div>
              </div>
              {/* OR-2 */}
              <div className="col-span-2 p-2">
                <div className="bg-amber-50 border-l-4 border-l-amber-500 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-900">David Kim</strong>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">PRK Laser Treatment</p>
                </div>
              </div>
            </div>

            {/* 12:00 PM */}
            <div className="grid grid-cols-12 min-h-[60px]">
              <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">
                12:00 PM
              </div>
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              <div className="col-span-3 p-2 border-r border-slate-200/80 bg-slate-50/40 flex items-center justify-center text-[10px] text-slate-400 font-medium">
                [OR-1 Buyout Cont.]
              </div>
              <div className="col-span-2 p-2"></div>
            </div>

            {/* 01:00 PM */}
            <div className="grid grid-cols-12 min-h-[90px]">
              <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">
                01:00 PM
              </div>
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-emerald-50/80 border-l-4 border-l-emerald-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-900">Sarah Nakamura</strong>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">Vitreous Consult (01:00–01:45)</p>
                </div>
              </div>
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              <div className="col-span-2 p-2">
                <div className="bg-slate-100 border-l-4 border-l-slate-400 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-800">Calibration</strong>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-bold text-[10px]">Blocked</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Equipment Calibration Block</p>
                </div>
              </div>
            </div>

            {/* 02:00 PM */}
            <div className="grid grid-cols-12 min-h-[90px]">
              <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">
                02:00 PM
              </div>
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-purple-50 border-l-4 border-l-purple-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-purple-950">Fatima Al-Rashid</strong>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                  </div>
                  <p className="text-[11px] text-purple-700 font-medium mt-1">Contact Lens Fitting (02:00–02:30)</p>
                </div>
              </div>
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-emerald-50/60 border-l-4 border-l-emerald-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-900">Emmanuel Okafor</strong>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">Urgent</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">Secondary IOL Implant (02:00–03:30)</p>
                </div>
              </div>
              <div className="col-span-2 p-2"></div>
            </div>

            {/* 03:00 PM */}
            <div className="grid grid-cols-12 min-h-[90px]">
              <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">
                03:00 PM
              </div>
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-emerald-50/80 border-l-4 border-l-emerald-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-900">Chen Wei Lin</strong>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">Pending</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">OCT Follow-up</p>
                </div>
              </div>
              <div className="col-span-3 p-2 border-r border-slate-200/80 bg-slate-50/40 flex items-center justify-center text-[10px] text-slate-400 font-medium">
                [Secondary Implant Cont.]
              </div>
              <div className="col-span-2 p-2">
                <div className="bg-amber-50 border-l-4 border-l-amber-500 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-slate-900">Fatima Al-Rashid</strong>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium mt-1">YAG Capsulotomy</p>
                </div>
              </div>
            </div>

            {/* 04:00 PM */}
            <div className="grid grid-cols-12 min-h-[90px]">
              <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">
                04:00 PM
              </div>
              <div className="col-span-3 p-2 border-r border-slate-200/80">
                <div className="bg-purple-50 border-l-4 border-l-purple-600 rounded-xl p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <strong className="font-extrabold text-purple-950">David Kim</strong>
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold text-[10px]">New</span>
                  </div>
                  <p className="text-[11px] text-purple-700 font-medium mt-1">New Patient Consult (04:00–04:30)</p>
                </div>
              </div>
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              <div className="col-span-2 p-2"></div>
            </div>

            {/* 05:00 PM */}
            <div className="grid grid-cols-12 min-h-[60px]">
              <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">
                05:00 PM
              </div>
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
              <div className="col-span-2 p-2"></div>
            </div>
          </div>
        </div>
      </main>

      {/* BOTTOM SUMMARY FOOTER */}
      <footer className="bg-white border-t border-slate-200/80 px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-600">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            18 Appointments Today
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            4 Surgeries Scheduled
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            2 Maintenance Windows
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            3 Open Slots Available
          </span>
        </div>

        <span className="text-[11px] text-slate-400 font-medium">
          Last updated: 07:45 AM
        </span>
      </footer>

      {/* SCHEDULE APPOINTMENT / OR SLOT MODAL */}
      <ScheduleAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}