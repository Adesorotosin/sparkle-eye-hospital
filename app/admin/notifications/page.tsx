"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Siren,
  Plus,
  Sliders,
  Radio,
  XCircle,
  Bell,
} from "lucide-react";

export default function NotificationsAlertCenterPage() {
  const [activeTab, setActiveTab] = useState("All");

  // Filter state for notifications feed
  const [filter, setFilter] = useState("All Notifications");

  // Automated Alert Rules Toggles State
  const [alertRules, setAlertRules] = useState({
    triageScore: true,
    failedLogin: true,
    drugExpiry: true,
  });

  const toggleRule = (key: keyof typeof alertRules) => {
    setAlertRules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Delivery Channels Checkboxes State
  const [channels, setChannels] = useState({
    inAppBanners: true,
    desktopPush: true,
    smsBroadcast: true,
    emailDigests: false,
  });

  const toggleChannel = (key: keyof typeof channels) => {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
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
              Staff & Access
            </Link>
            <Link
              href="/admin/audit"
              className="text-[#64748B] hover:text-[#0F172A] transition-colors py-5"
            >
              Audit Logs
            </Link>
            <Link
              href="/admin/notifications"
              className="text-[#4F46E5] font-semibold border-b-2 border-[#4F46E5] py-5"
            >
              Notifications & Alerts
            </Link>
            <Link
              href="/admin/settings"
              className="text-[#64748B] hover:text-[#0F172A] transition-colors py-5"
            >
              Settings
            </Link>
          </nav>

          {/* User & Emergency Status Indicator */}
          <div className="flex items-center gap-4">
            <button className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-full transition-all relative">
              <XCircle className="w-5 h-5 text-[#EF4444]" />
            </button>
            <div className="h-8 w-[1px] bg-[#E2E8F0]" />
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&auto=format&fit=crop&q=80"
                alt="Dr. Sarah Jenkins"
                className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0]"
              />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold leading-tight text-[#0F172A]">
                  Dr. Sarah Jenkins
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Chief Medical Officer
                </p>
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
              Notifications & Emergency Alert Center
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Manage hospital-wide announcements, critical alarms, and system-wide escalation drills
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold transition-all shadow-sm flex items-center gap-2">
              <Siren className="w-4 h-4" /> Broadcast Emergency Alert
            </button>
            <button className="px-4 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold transition-all shadow-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Announcement
            </button>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div className="border-b border-[#E2E8F0] mb-6">
          <div className="flex gap-8">
            {[
              { name: "All", count: 12 },
              { name: "Announcements", count: 4 },
              { name: "Clinical Escalations", count: 5 },
              { name: "Security", count: 3 },
            ].map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                  activeTab === tab.name
                    ? "text-[#4F46E5] font-semibold"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <span>{tab.name}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    activeTab === tab.name
                      ? "bg-[#EEF2FF] text-[#4F46E5]"
                      : "bg-[#F1F5F9] text-[#64748B]"
                  }`}
                >
                  {tab.count}
                </span>
                {activeTab === tab.name && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5] rounded-t-md" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN (2/3 Width): NOTIFICATION LIST */}
          <div className="lg:col-span-2 space-y-4">
            {/* FILTER HEADER BAR */}
            <div className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#4F46E5]" />
                <span className="text-xs font-bold text-[#0F172A]">
                  Active Feed
                </span>
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-xs font-medium border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              >
                <option>All Notifications</option>
                <option>Emergency Only</option>
                <option>Announcements</option>
                <option>Clinical</option>
                <option>Finance</option>
              </select>
            </div>

            {/* Card 1: Emergency Alert */}
            <div className="bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#DC2626]" />
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-[#DC2626] uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
                  Emergency
                </span>
                <span className="text-xs text-[#64748B]">
                  2 minutes ago · Dr. Adeyemi triggered
                </span>
              </div>

              <h3 className="text-lg font-bold text-[#0F172A] mb-2">
                Code Blue — Surgical Theater 2
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed mb-4">
                Resuscitation team required immediately. Patient requires cardiac arrest intervention. All nearby anesthesiologists report to Theater 2 post-haste.
              </p>

              <div className="flex items-center justify-between pt-2">
                <span className="inline-block bg-[#FEE2E2] text-[#991B1B] text-[11px] font-bold px-3 py-1 rounded-md">
                  Target: All Surgical Staff
                </span>
                <button className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold rounded-lg transition-all shadow-sm">
                  Acknowledge Alert
                </button>
              </div>
            </div>

            {/* Card 2: Announcement */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#4F46E5]" />
              <div className="flex items-center justify-between mb-3">
                <span className="inline-block bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded">
                  Announcement
                </span>
                <span className="text-xs text-[#64748B]">1 hour ago</span>
              </div>

              <h3 className="text-base font-bold text-[#0F172A] mb-2">
                Scheduled Maintenance — Server Downtime
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                System maintenance scheduled for Sep 5, 2026 from 2:00 AM — 4:00 AM. All services, including scheduling and clinical uploads, will be briefly unavailable.
              </p>
            </div>

            {/* Card 3: Clinical Alert */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#10B981]" />
              <div className="flex items-center justify-between mb-3">
                <span className="inline-block bg-[#ECFDF5] text-[#059669] text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded">
                  Clinical
                </span>
                <span className="text-xs text-[#64748B]">3 hours ago</span>
              </div>

              <h3 className="text-base font-bold text-[#0F172A] mb-2">
                Updated Glaucoma Screening Protocol
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                New screening protocol effective Sep 10, 2026. All ophthalmology staff and clinical associates must review updated tonometry guidelines to ensure audit compliance.
              </p>
            </div>

            {/* Card 4: Finance Alert */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#D97706]" />
              <div className="flex items-center justify-between mb-3">
                <span className="inline-block bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded">
                  Finance
                </span>
                <span className="text-xs text-[#64748B]">5 hours ago</span>
              </div>

              <h3 className="text-base font-bold text-[#0F172A] mb-2">
                POS Cash Reconciliation Deadline
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                All frontline POS terminals must complete daily cash reconciliation by 6:00 PM today. Non-compliance will be auto-flagged in the executive compliance audit trail.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN (1/3 Width): SETTINGS & RULES */}
          <div className="space-y-6">
            {/* Card 1: Automated Alert Rules */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Sliders className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">
                  Automated Alert Rules
                </h3>
              </div>

              <div className="space-y-5">
                {/* Rule 1 */}
                <div className="flex items-start justify-between">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-[#0F172A]">
                      Triage Score Escalation Flag
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5 leading-tight">
                      Auto-alert when patient triage score exceeds safe clinical limits
                    </p>
                  </div>
                  <button
                    onClick={() => toggleRule("triageScore")}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                      alertRules.triageScore ? "bg-[#4F46E5]" : "bg-[#E2E8F0]"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        alertRules.triageScore ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Rule 2 */}
                <div className="flex items-start justify-between">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-[#0F172A]">
                      Failed Login Attempt Limit
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5 leading-tight">
                      Lock account and notify IT admins after 5 consecutive failed logins
                    </p>
                  </div>
                  <button
                    onClick={() => toggleRule("failedLogin")}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                      alertRules.failedLogin ? "bg-[#4F46E5]" : "bg-[#E2E8F0]"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        alertRules.failedLogin ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Rule 3 */}
                <div className="flex items-start justify-between">
                  <div className="pr-4">
                    <p className="text-xs font-bold text-[#0F172A]">
                      Drug Expiry Warning
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5 leading-tight">
                      Alert hospital pharmacy unit 30 days before medication batch expiry
                    </p>
                  </div>
                  <button
                    onClick={() => toggleRule("drugExpiry")}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                      alertRules.drugExpiry ? "bg-[#4F46E5]" : "bg-[#E2E8F0]"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        alertRules.drugExpiry ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Delivery Channels */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Radio className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">
                  Delivery Channels
                </h3>
              </div>

              <div className="space-y-4">
                {/* Channel 1 */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={channels.inAppBanners}
                    onChange={() => toggleChannel("inAppBanners")}
                    className="w-4 h-4 text-[#4F46E5] rounded border-[#CBD5E1] focus:ring-[#4F46E5] mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">
                      In-App Banners
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Show critical notices as sticky headers in user active dashboards
                    </p>
                  </div>
                </label>

                {/* Channel 2 */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={channels.desktopPush}
                    onChange={() => toggleChannel("desktopPush")}
                    className="w-4 h-4 text-[#4F46E5] rounded border-[#CBD5E1] focus:ring-[#4F46E5] mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">
                      Desktop Push Notifications
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Direct browser notifications for immediate surgical escalations
                    </p>
                  </div>
                </label>

                {/* Channel 3 */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={channels.smsBroadcast}
                    onChange={() => toggleChannel("smsBroadcast")}
                    className="w-4 h-4 text-[#4F46E5] rounded border-[#CBD5E1] focus:ring-[#4F46E5] mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">
                      SMS Broadcast
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Emergency alerts forwarded to registered nurse and physician mobile plans
                    </p>
                  </div>
                </label>

                {/* Channel 4 */}
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={channels.emailDigests}
                    onChange={() => toggleChannel("emailDigests")}
                    className="w-4 h-4 text-[#4F46E5] rounded border-[#CBD5E1] focus:ring-[#4F46E5] mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-[#0F172A]">
                      Email Digests
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      Consolidated non-urgent medical updates sent daily to staff inboxes
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>  
      </main>
    </div>
  );
}