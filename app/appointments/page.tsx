'use client';

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Settings,
  Plus,
  ArrowLeft,
} from "lucide-react";
import ScheduleAppointmentModal from "@/components/ScheduleAppointmentModal";

export default function ResourceCalendar() {
  const [viewMode, setViewMode] = useState<"Day" | "Week" | "Month" | "Resource Grid">("Resource Grid");
  const [selectedPhysician, setSelectedPhysician] = useState("All Physicians");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Date state initialized to August 30, 2026
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 30));
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper functions to navigate days/weeks/months
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (viewMode === "Month") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else if (viewMode === "Week") {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() - 1);
      }
      return newDate;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (viewMode === "Month") {
        newDate.setMonth(newDate.getMonth() + 1);
      } else if (viewMode === "Week") {
        newDate.setDate(newDate.getDate() + 7);
      } else {
        newDate.setDate(newDate.getDate() + 1);
      }
      return newDate;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date(2026, 7, 30));
  };

  // Safe client-side date formatting to avoid hydration mismatches
  const formattedDateString = isMounted
    ? currentDate.toLocaleDateString("en-US", {
        weekday: viewMode === "Month" ? undefined : "long",
        year: "numeric",
        month: "long",
        day: viewMode === "Month" ? undefined : "numeric",
      })
    : "Sunday, August 30, 2026";

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex flex-col text-slate-800 font-sans antialiased selection:bg-purple-100 selection:text-purple-900">
      {/* TOP NAVBAR / HEADER */}
      <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <button 
            onClick={() => window.history.back()} 
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer flex items-center justify-center"
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Resource Calendar
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {formattedDateString}
            </p>
          </div>
        </div>

        {/* View Controls & Actions */}
        <div className="flex flex-wrap items-center gap-4">
          {/* View Segment Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold text-slate-600">
            {(["Resource Grid", "Day", "Week", "Month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
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
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition focus:outline-none shadow-2xs cursor-pointer"
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
          <button 
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button 
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition ml-1 cursor-pointer"
          >
            Today
          </button>
        </div>

        <h2 className="text-sm font-extrabold text-slate-900">
          {formattedDateString}
        </h2>

        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer">
            <Printer className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DYNAMIC VIEW CONTAINER */}
      <main className="flex-1 p-6 overflow-x-auto">
        {/* RESOURCE GRID / DAY VIEW */}
        {(viewMode === "Resource Grid" || viewMode === "Day") && (
          <div className="min-w-[1100px] bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Resource Columns Header */}
            <div className="grid grid-cols-12 border-b border-slate-200/80 bg-slate-50/50 text-xs">
              <div className="col-span-1 p-4 border-r border-slate-200/80"></div>
              <div className="col-span-3 p-4 border-r border-slate-200/80 border-t-4 border-t-emerald-500">
                <div className="flex items-center gap-2 font-extrabold text-slate-900">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Consultation Room 1
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Dr. James Okoro &mdash; Ophthalmology</p>
              </div>
              <div className="col-span-3 p-4 border-r border-slate-200/80 border-t-4 border-t-emerald-500">
                <div className="flex items-center gap-2 font-extrabold text-slate-900">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Consultation Room 2
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Dr. Amina Bello &mdash; Retina Specialist</p>
              </div>
              <div className="col-span-3 p-4 border-r border-slate-200/80 border-t-4 border-t-sky-500">
                <div className="flex items-center gap-2 font-extrabold text-slate-900">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  OR-1 (Cataract Suite)
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Surgical Theater</p>
              </div>
              <div className="col-span-2 p-4 border-t-4 border-t-amber-500">
                <div className="flex items-center gap-2 font-extrabold text-slate-900">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  OR-2 (Laser Suite)
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Laser Center</p>
              </div>
            </div>

            {/* HOURLY SLOTS */}
            <div className="divide-y divide-slate-100 text-xs">
              <div className="grid grid-cols-12 min-h-[90px]">
                <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">08:00 AM</div>
                <div className="col-span-3 p-2 border-r border-slate-200/80">
                  <div className="bg-purple-50 border-l-4 border-l-purple-600 rounded-xl p-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <strong className="font-extrabold text-purple-950">Adebayo Funmi</strong>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                    </div>
                    <p className="text-[11px] text-purple-700 font-medium mt-1">Post-Op Follow-up (08:00–08:30)</p>
                  </div>
                </div>
                <div className="col-span-3 p-2 border-r border-slate-200/80">
                  <div className="bg-emerald-50/80 border-l-4 border-l-emerald-600 rounded-xl p-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <strong className="font-extrabold text-slate-900">Oluwaseun Adeyemi</strong>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-1">Retinal Exam (08:30–09:15)</p>
                  </div>
                </div>
                <div className="col-span-3 p-2 border-r border-slate-200/80">
                  <div className="bg-emerald-50/60 border-l-4 border-l-emerald-600 rounded-xl p-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <strong className="font-extrabold text-slate-900">Adebayo Funmi</strong>
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">Priority</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-1">Cataract Extraction + IOL</p>
                  </div>
                </div>
                <div className="col-span-2 p-2"></div>
              </div>

              <div className="grid grid-cols-12 min-h-[90px]">
                <div className="col-span-1 p-3 border-r border-slate-200/80 font-bold text-slate-400 bg-slate-50/30">09:00 AM</div>
                <div className="col-span-3 p-2 border-r border-slate-200/80">
                  <div className="bg-purple-50 border-l-4 border-l-purple-600 rounded-xl p-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <strong className="font-extrabold text-purple-950">Margaret Chen</strong>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                    </div>
                    <p className="text-[11px] text-purple-700 font-medium mt-1">Annual Eye Exam</p>
                  </div>
                </div>
                <div className="col-span-3 p-2 border-r border-slate-200/80"></div>
                <div className="col-span-3 p-2 border-r border-slate-200/80 bg-slate-50/40 flex items-center justify-center text-[10px] text-slate-400">
                  [OR-1 Suite Continuous]
                </div>
                <div className="col-span-2 p-2">
                  <div className="bg-amber-50 border-l-4 border-l-amber-500 rounded-xl p-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <strong className="font-extrabold text-slate-900">Priya Sharma</strong>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">Confirmed</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-1">LASIK Procedure</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {viewMode === "Week" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">Weekly Resource Allocation</h3>
            <div className="grid grid-cols-7 gap-4 min-w-[900px]">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, idx) => (
                <div key={day} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 min-h-[420px] flex flex-col">
                  <div className="font-extrabold text-xs text-slate-800 mb-3 pb-2 border-b border-slate-200">
                    {day} (Aug {24 + idx})
                  </div>
                  <div className="space-y-2.5 flex-1">
                    <div className="bg-purple-50 p-2.5 rounded-xl border-l-2 border-purple-600 text-[11px] shadow-2xs">
                      <strong className="block text-purple-950 font-bold">08:00 AM</strong>
                      <span className="text-slate-600">Consult Room 1 (4 Slots)</span>
                    </div>
                    {idx % 2 === 0 && (
                      <div className="bg-sky-50 p-2.5 rounded-xl border-l-2 border-sky-600 text-[11px] shadow-2xs">
                        <strong className="block text-slate-900 font-bold">11:00 AM</strong>
                        <span className="text-slate-600">OR-1 Surgery Block</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {viewMode === "Month" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">August 2026 Capacity Overview</h3>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-3">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
            <div className="grid grid-cols-7 gap-2.5">
              {Array.from({ length: 31 }).map((_, i) => {
                const dayNum = i + 1;
                const isSelected = dayNum === 30;
                return (
                  <div 
                    key={i} 
                    className={`border rounded-xl p-3 min-h-[110px] flex flex-col justify-between transition cursor-pointer ${
                      isSelected 
                        ? "bg-purple-50/60 border-purple-500 ring-1 ring-purple-500 shadow-xs" 
                        : "bg-white border-slate-200 hover:border-purple-300"
                    }`}
                  >
                    <span className={`text-xs font-extrabold ${isSelected ? "text-purple-700" : "text-slate-700"}`}>
                      {dayNum}
                    </span>
                    {i % 3 === 0 && (
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-1 rounded-lg text-center shadow-2xs">
                        4 Surgeries
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
        </div>
        <span className="text-[11px] text-slate-400 font-medium">Last synced: Just now</span>
      </footer>

      {/* SCHEDULE MODAL */}
      <ScheduleAppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}