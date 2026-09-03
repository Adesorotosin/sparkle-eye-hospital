"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Grid,
  Sliders,
  Upload,
  Check,
  Bell,
  ChevronDown,
} from "lucide-react";

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState("Hospital Profile");

  // Toggle States
  const [modules, setModules] = useState({
    ehr: true,
    pharmacy: true,
    optical: true,
    billing: true,
    patientPortal: false,
    telemedicine: false,
  });

  const toggleModule = (key: keyof typeof modules) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-12">
      {/* 1. TOP GLOBAL NAVIGATION */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#4F46E5] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-[#0F172A]">
                Sparkle Eye
              </h1>
              <p className="text-[10px] tracking-wider text-[#64748B] uppercase font-medium">
                Specialist Hospital
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex items-center gap-8 text-sm font-medium">
            <Link
              href="/admin"
              className="text-[#64748B] hover:text-[#0F172A] transition-colors py-5"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/access-control"
              className="text-[#64748B] hover:text-[#0F172A] transition-colors py-5"
            >
              Staff & Access Control
            </Link>
            <Link
              href="/admin/audit"
              className="text-[#64748B] hover:text-[#0F172A] transition-colors py-5"
            >
              Audit Logs
            </Link>
            <Link
              href="/admin/settings"
              className="text-[#4F46E5] font-semibold border-b-2 border-[#4F46E5] py-5"
            >
              System Settings
            </Link>
          </nav>

          {/* User & Notifications */}
          <div className="flex items-center gap-4">
            <button className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-full transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#4F46E5] rounded-full"></span>
            </button>
            <div className="h-8 w-[1px] bg-[#E2E8F0]" />
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80"
                alt="Dr. Alabi Benson"
                className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0]"
              />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold leading-tight text-[#0F172A]">
                  Dr. Alabi Benson
                </p>
                <p className="text-[11px] text-[#64748B]">Chief Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 pt-8">
        {/* PAGE HEADER & ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              System Settings & Facility Profile
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Manage global hospital configurations, department structures, and default billing settings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#0F172A] bg-white hover:bg-[#F8FAFC] transition-all shadow-sm">
              Discard
            </button>
            <button className="px-5 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium transition-all shadow-sm flex items-center gap-2">
              <Check className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div className="border-b border-[#E2E8F0] mb-8">
          <div className="flex gap-8 overflow-x-auto">
            {[
              "Hospital Profile",
              "Departments & Wards",
              "Billing & Tax Defaults",
              "Operational Hours",
              "Integrations & API",
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                  activeTab === tab
                    ? "text-[#4F46E5] font-semibold"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5] rounded-t-md" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN (2/3 Width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card 1: Facility Identity */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">
                  Facility Identity
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {/* Logo Upload Box */}
                <div className="border-2 border-dashed border-[#818CF8] bg-[#EEF2FF]/40 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#EEF2FF]/70 transition-all">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#4F46E5] shadow-sm mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-[#4F46E5]">
                    Upload Logo
                  </span>
                  <span className="text-[10px] text-[#64748B] mt-1">
                    PNG, JPG up to 2MB
                  </span>
                </div>

                {/* Form Fields */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Legal Hospital Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Sparkle Eye Specialist Hospital"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Medical License/Registration ID
                    </label>
                    <input
                      type="text"
                      defaultValue="MED-2024-LIC-00982"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Official Phone Number
                    </label>
                    <input
                      type="text"
                      defaultValue="+234 801 234 5678"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Support Email
                    </label>
                    <input
                      type="email"
                      defaultValue="support@sparkleeye.ng"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Physical Address & Localization */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">
                  Physical Address & Localization
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Primary Street Address
                  </label>
                  <input
                    type="text"
                    defaultValue="42 Vision Avenue, Lekki Phase 1"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    defaultValue="Lagos"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    defaultValue="Lagos State"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Default Currency
                  </label>
                  <select className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]">
                    <option>₦ - NGN (Naira)</option>
                    <option>$ - USD (Dollar)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3.5 bottom-3 pointer-events-none" />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Timezone
                  </label>
                  <select className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]">
                    <option>(GMT+01:00) West Africa Time - Lagos</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3.5 bottom-3 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (1/3 Width) */}
          <div className="space-y-6">
            {/* Card 1: Active Portals & Modules */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Grid className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">
                  Active Portals & Modules
                </h3>
              </div>

              <div className="space-y-4">
                {[
                  {
                    key: "ehr",
                    title: "EHR Module",
                    desc: "Electronic health records",
                  },
                  {
                    key: "pharmacy",
                    title: "Pharmacy Portal",
                    desc: "Medication dispensing",
                  },
                  {
                    key: "optical",
                    title: "Optical & OCT Diagnostic Center",
                    desc: "Eye diagnostics",
                  },
                  {
                    key: "billing",
                    title: "Billing & Payments",
                    desc: "Financial transactions",
                  },
                  {
                    key: "patientPortal",
                    title: "Patient Self-Service Portal",
                    desc: "Patient portal access",
                  },
                  {
                    key: "telemedicine",
                    title: "Telemedicine",
                    desc: "Virtual consultations",
                  },
                ].map((mod) => (
                  <div
                    key={mod.key}
                    className="flex items-center justify-between pt-3 first:pt-0 border-t border-[#F1F5F9] first:border-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {mod.title}
                      </p>
                      <p className="text-xs text-[#64748B]">{mod.desc}</p>
                    </div>
                    {/* Toggle Switch */}
                    <button
                      onClick={() =>
                        toggleModule(mod.key as keyof typeof modules)
                      }
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        modules[mod.key as keyof typeof modules]
                          ? "bg-[#4F46E5]"
                          : "bg-[#E2E8F0]"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          modules[mod.key as keyof typeof modules]
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: System Defaults */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Sliders className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">
                  System Defaults
                </h3>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Fiscal Year Start
                  </label>
                  <select className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]">
                    <option>January</option>
                    <option>April</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3.5 bottom-3 pointer-events-none" />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Default Language
                  </label>
                  <select className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]">
                    <option>English (Nigeria)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3.5 bottom-3 pointer-events-none" />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Date Format
                  </label>
                  <select className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]">
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3.5 bottom-3 pointer-events-none" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Session Timeout
                  </label>
                  <input
                    type="text"
                    defaultValue="30 minutes"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}