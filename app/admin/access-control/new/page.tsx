"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  User,
  Briefcase,
  Shield,
  Lock,
  ClipboardList,
  Send,
  Bell,
  ChevronDown,
  Copy,
  CheckCircle2,
  Circle,
  Stethoscope,
  HeartPulse,
  CreditCard,
  Calendar,
} from "lucide-react";

export default function OnboardStaffPage() {
  // Role Selector State
  const [selectedRole, setSelectedRole] = useState("doctor");

  // Toggle States
  const [twoFactor, setTwoFactor] = useState(true);
  const [ipRestriction, setIpRestriction] = useState(false);

  // Granular Permission Checkboxes State
  const [permissions, setPermissions] = useState({
    medicalRecords: true,
    prescribeMedications: true,
    processRefunds: false,
    exportReports: false,
  });

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
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
              className="text-[#4F46E5] font-semibold border-b-2 border-[#4F46E5] py-5"
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
              className="text-[#64748B] hover:text-[#0F172A] transition-colors py-5"
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
      <main className="max-w-7xl mx-auto px-6 pt-6">
        {/* BACK LINK */}
        <Link
          href="/admin/access-control"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Staff Directory
        </Link>

        {/* PAGE HEADER & ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Onboard New Staff Member
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Provision accounts, set up system permissions, and issue automated security credentials.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/access-control"
              className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#0F172A] bg-white hover:bg-[#F8FAFC] transition-all shadow-sm"
            >
              Cancel
            </Link>
            <button className="px-5 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium transition-all shadow-sm flex items-center gap-2">
              <Send className="w-4 h-4" /> Send Invitation & Provision Account
            </button>
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN (2/3 Width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card 1: Personal Details & Credentials */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">
                  Personal Details & Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Adaeze"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Okonkwo"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Official Work Email
                  </label>
                  <input
                    type="email"
                    defaultValue="adaeze.okonkwo@sparkleeye.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    defaultValue="+234 812 345 6789"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    National ID / NIN Number
                  </label>
                  <input
                    type="text"
                    defaultValue="12345678901"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Professional & Regulatory Information */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">
                  Professional & Regulatory Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#0F172A]">
                      Staff ID
                    </label>
                    <span className="text-[10px] font-medium bg-[#F1F5F9] text-[#64748B] px-2 py-0.5 rounded">
                      Auto-generated
                    </span>
                  </div>
                  <input
                    type="text"
                    defaultValue="DOC-2216"
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A] font-medium cursor-not-allowed"
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Department
                  </label>
                  <select className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]">
                    <option>Ophthalmology</option>
                    <option>Nursing & Triage</option>
                    <option>Pharmacy</option>
                    <option>Billing & Cashier</option>
                    <option>Reception & Front Desk</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3.5 bottom-3 pointer-events-none" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Professional License Number
                  </label>
                  <input
                    type="text"
                    defaultValue="MDCN/RN/2024/08834"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Role & Security Permissions */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">
                  Role & Security Permissions
                </h3>
              </div>

              {/* Role Presets Grid */}
              <label className="block text-xs font-semibold text-[#0F172A] mb-3">
                Role Preset Selector
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {/* Option 1: Doctor */}
                <div
                  onClick={() => setSelectedRole("doctor")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    selectedRole === "doctor"
                      ? "border-[#4F46E5] bg-[#EEF2FF]/30"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${
                      selectedRole === "doctor"
                        ? "border-[#4F46E5] bg-[#4F46E5] text-white"
                        : "border-[#CBD5E1]"
                    }`}
                  >
                    {selectedRole === "doctor" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-[#4F46E5]" />
                      <p className="text-sm font-bold text-[#0F172A]">
                        Ophthalmologist / Doctor
                      </p>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Full clinical & prescription access
                    </p>
                  </div>
                </div>

                {/* Option 2: Nurse */}
                <div
                  onClick={() => setSelectedRole("nurse")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    selectedRole === "nurse"
                      ? "border-[#4F46E5] bg-[#EEF2FF]/30"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${
                      selectedRole === "nurse"
                        ? "border-[#4F46E5] bg-[#4F46E5] text-white"
                        : "border-[#CBD5E1]"
                    }`}
                  >
                    {selectedRole === "nurse" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-[#64748B]" />
                      <p className="text-sm font-bold text-[#0F172A]">
                        Nurse / Triage
                      </p>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Patient vitals & medication administration
                    </p>
                  </div>
                </div>

                {/* Option 3: Cashier */}
                <div
                  onClick={() => setSelectedRole("cashier")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    selectedRole === "cashier"
                      ? "border-[#4F46E5] bg-[#EEF2FF]/30"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${
                      selectedRole === "cashier"
                        ? "border-[#4F46E5] bg-[#4F46E5] text-white"
                        : "border-[#CBD5E1]"
                    }`}
                  >
                    {selectedRole === "cashier" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-[#64748B]" />
                      <p className="text-sm font-bold text-[#0F172A]">
                        Cashier / Billing
                      </p>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      POS, invoicing, and payment overrides
                    </p>
                  </div>
                </div>

                {/* Option 4: Receptionist */}
                <div
                  onClick={() => setSelectedRole("receptionist")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    selectedRole === "receptionist"
                      ? "border-[#4F46E5] bg-[#EEF2FF]/30"
                      : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 ${
                      selectedRole === "receptionist"
                        ? "border-[#4F46E5] bg-[#4F46E5] text-white"
                        : "border-[#CBD5E1]"
                    }`}
                  >
                    {selectedRole === "receptionist" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#64748B]" />
                      <p className="text-sm font-bold text-[#0F172A]">
                        Receptionist
                      </p>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Patient registration & scheduling
                    </p>
                  </div>
                </div>
              </div>

              {/* Granular Permission Overrides */}
              <div className="pt-4 border-t border-[#F1F5F9]">
                <label className="block text-xs font-semibold text-[#0F172A] mb-3">
                  Granular Permission Overrides
                </label>

                <div className="space-y-3">
                  {[
                    {
                      key: "medicalRecords",
                      label: "Can access patient medical records",
                    },
                    {
                      key: "prescribeMedications",
                      label: "Can prescribe medications",
                    },
                    { key: "processRefunds", label: "Can process refunds" },
                    {
                      key: "exportReports",
                      label: "Can export financial reports",
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={
                          permissions[item.key as keyof typeof permissions]
                        }
                        onChange={() =>
                          togglePermission(
                            item.key as keyof typeof permissions
                          )
                        }
                        className="w-4 h-4 text-[#4F46E5] rounded border-[#CBD5E1] focus:ring-[#4F46E5]"
                      />
                      <span className="text-xs text-[#0F172A] font-medium">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (1/3 Width) */}
          <div className="space-y-6">
            {/* Card 1: Account Setup & Security */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Lock className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">
                  Account Setup & Security
                </h3>
              </div>

              <div className="space-y-5">
                {/* Temporary Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Temporary Password
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      defaultValue="••••••••"
                      readOnly
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A] font-mono pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-[#64748B] hover:text-[#0F172A] transition-colors"
                      title="Copy Password"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Auto-generated secure password
                  </p>
                </div>

                {/* 2FA Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-xs font-semibold text-[#0F172A]">
                      Two-Factor Authentication
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Require 2FA on first login
                    </p>
                  </div>
                  <button
                    onClick={() => setTwoFactor(!twoFactor)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      twoFactor ? "bg-[#4F46E5]" : "bg-[#E2E8F0]"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        twoFactor ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Expiry Date */}
                <div className="relative pt-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Account Expiry Date
                  </label>
                  <select className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] appearance-none focus:outline-none focus:ring-2 focus:ring-[#4F46E5]">
                    <option>No Expiry</option>
                    <option>30 Days</option>
                    <option>90 Days</option>
                    <option>1 Year</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3.5 bottom-3 pointer-events-none" />
                </div>

                {/* IP Restriction Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-xs font-semibold text-[#0F172A]">
                      IP Restriction
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Restrict to hospital network
                    </p>
                  </div>
                  <button
                    onClick={() => setIpRestriction(!ipRestriction)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      ipRestriction ? "bg-[#4F46E5]" : "bg-[#E2E8F0]"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        ipRestriction ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Onboarding Checklist */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardList className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">
                  Onboarding Checklist
                </h3>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-[#0F172A]">Overall Progress</span>
                  <span className="text-[#4F46E5]">2 of 5 complete</span>
                </div>
                <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div className="h-full bg-[#4F46E5] rounded-full w-[40%]" />
                </div>
              </div>

              {/* Step Checklist Items */}
              <div className="space-y-3.5 text-xs font-medium">
                <div className="flex items-center gap-2.5 text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>Personal details completed</span>
                </div>

                <div className="flex items-center gap-2.5 text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>Department assigned</span>
                </div>

                <div className="flex items-center gap-2.5 text-[#64748B]">
                  <Circle className="w-4 h-4 text-[#CBD5E1] shrink-0" />
                  <span>Role permissions configured</span>
                </div>

                <div className="flex items-center gap-2.5 text-[#64748B]">
                  <Circle className="w-4 h-4 text-[#CBD5E1] shrink-0" />
                  <span>Security credentials generated</span>
                </div>

                <div className="flex items-center gap-2.5 text-[#64748B]">
                  <Circle className="w-4 h-4 text-[#CBD5E1] shrink-0" />
                  <span>Welcome email sent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}