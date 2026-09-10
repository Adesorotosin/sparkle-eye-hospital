"use client";

import React, { useState } from "react";
import {
  Siren,
  Plus,
  Sliders,
  Radio,
  XCircle,
  Bell,
  Search,
  X,
  AlertTriangle,
  Megaphone,
  Filter,
} from "lucide-react";

export default function NotificationsAlertCenterPage() {
  const [activeTab, setActiveTab] = useState("All");

  // Modal State Controls
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Active Feed Items State
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      type: "Emergency",
      title: "Code Blue — Surgical Theater 2",
      message:
        "Resuscitation team required immediately. Patient requires cardiac arrest intervention. All nearby anesthesiologists report to Theater 2 post-haste.",
      timestamp: "2 minutes ago",
      triggeredBy: "Dr. Adeyemi",
      target: "All Surgical Staff",
      category: "Security", // Emergency/Security
    },
    {
      id: "2",
      type: "Announcement",
      title: "Scheduled Maintenance — Server Downtime",
      message:
        "System maintenance scheduled for Sep 5, 2026 from 2:00 AM — 4:00 AM. All services, including scheduling and clinical uploads, will be briefly unavailable.",
      timestamp: "1 hour ago",
      target: "All Staff",
      category: "Announcements",
    },
    {
      id: "3",
      type: "Clinical",
      title: "Updated Glaucoma Screening Protocol",
      message:
        "New screening protocol effective Sep 10, 2026. All ophthalmology staff and clinical associates must review updated tonometry guidelines to ensure audit compliance.",
      timestamp: "3 hours ago",
      target: "Ophthalmology Unit",
      category: "Clinical Escalations",
    },
    {
      id: "4",
      type: "Finance",
      title: "POS Cash Reconciliation Deadline",
      message:
        "All frontline POS terminals must complete daily cash reconciliation by 6:00 PM today. Non-compliance will be auto-flagged in the executive compliance audit trail.",
      timestamp: "5 hours ago",
      target: "Billing & Cashier Dept",
      category: "Security",
    },
  ]);

  // Filter helper logic to route items to tabs accurately
  const isCategoryMatch = (itemCategory: string, tabName: string) => {
    if (tabName === "All") return true;
    if (tabName === "Announcements")
      return itemCategory === "Announcements" || itemCategory === "Announcement";
    if (tabName === "Clinical Escalations")
      return itemCategory === "Clinical Escalations" || itemCategory === "Clinical";
    if (tabName === "Security")
      return (
        itemCategory === "Security" ||
        itemCategory === "Emergency" ||
        itemCategory === "Finance"
      );
    return true;
  };

  const filteredNotifications = notifications.filter((item) =>
    isCategoryMatch(item.category, activeTab)
  );

  // Emergency Form State
  const [emergencyData, setEmergencyData] = useState({
    codeType: "Code Blue (Cardiac Arrest)",
    location: "Surgical Theater 2",
    targetRoles: "All Surgical Staff",
    instructions: "",
  });

  // Announcement Form State
  const [announcementData, setAnnouncementData] = useState({
    title: "",
    category: "Announcements",
    targetDept: "All Hospital Staff",
    message: "",
  });

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

  // Handle Dispatch Emergency Alert
  const handleTriggerEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    const newEmergency = {
      id: Date.now().toString(),
      type: "Emergency",
      title: `${emergencyData.codeType} — ${emergencyData.location}`,
      message:
        emergencyData.instructions ||
        "Immediate response required. Please follow standard emergency response protocols.",
      timestamp: "Just now",
      triggeredBy: "Dr. Sarah Jenkins",
      target: emergencyData.targetRoles,
      category: "Security",
    };

    setNotifications([newEmergency, ...notifications]);
    setIsEmergencyModalOpen(false);
    setEmergencyData({
      codeType: "Code Blue (Cardiac Arrest)",
      location: "",
      targetRoles: "All Surgical Staff",
      instructions: "",
    });
  };

  // Handle Dispatch Announcement
  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementData.title || !announcementData.message) return;

    const newAnnouncement = {
      id: Date.now().toString(),
      type: announcementData.category,
      title: announcementData.title,
      message: announcementData.message,
      timestamp: "Just now",
      target: announcementData.targetDept,
      category:
        announcementData.category === "Clinical"
          ? "Clinical Escalations"
          : announcementData.category === "Finance"
          ? "Security"
          : "Announcements",
    };

    setNotifications([newAnnouncement, ...notifications]);
    setIsAnnouncementModalOpen(false);
    setAnnouncementData({
      title: "",
      category: "Announcements",
      targetDept: "All Hospital Staff",
      message: "",
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-12">
      {/* 1. TOP GLOBAL NAVIGATION */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search alerts, announcements, or staff..."
                className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              title="Emergency Alarm Status"
              className="p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-full transition-all relative"
            >
              <XCircle className="w-5 h-5 text-[#EF4444]" />
            </button>
            <div className="h-8 w-[1px] bg-[#E2E8F0]" />
            <div className="flex items-center gap-3 cursor-pointer">
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
            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              className="px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              <Siren className="w-4 h-4 animate-pulse" /> Broadcast Emergency Alert
            </button>
            <button
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="px-4 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Create Announcement
            </button>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div className="border-b border-[#E2E8F0] mb-6">
          <div className="flex gap-8">
            {[
              {
                name: "All",
                count: notifications.length,
              },
              {
                name: "Announcements",
                count: notifications.filter((n) => isCategoryMatch(n.category, "Announcements")).length,
              },
              {
                name: "Clinical Escalations",
                count: notifications.filter((n) => isCategoryMatch(n.category, "Clinical Escalations")).length,
              },
              {
                name: "Security",
                count: notifications.filter((n) => isCategoryMatch(n.category, "Security")).length,
              },
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
          {/* LEFT COLUMN: NOTIFICATION LIST */}
          <div className="lg:col-span-2 space-y-4">
            {/* FEED HEADER BAR */}
            <div className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#4F46E5]" />
                <span className="text-xs font-bold text-[#0F172A]">
                  Active Feed — {activeTab} ({filteredNotifications.length})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#E2E8F0]">
                <Filter className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Filtered by tab</span>
              </div>
            </div>

            {/* DYNAMIC NOTIFICATIONS FEED */}
            {filteredNotifications.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center">
                <p className="text-sm font-semibold text-[#0F172A]">No notifications found</p>
                <p className="text-xs text-[#64748B] mt-1">There are no items currently listed under {activeTab}.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                if (item.type === "Emergency") {
                  return (
                    <div
                      key={item.id}
                      className="bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] p-6 shadow-sm relative overflow-hidden transition-all"
                    >
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#DC2626]" />
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-[#DC2626] uppercase">
                          <span className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
                          Emergency
                        </span>
                        <span className="text-xs text-[#64748B]">
                          {item.timestamp} {item.triggeredBy ? `· ${item.triggeredBy} triggered` : ""}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-[#0F172A] mb-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#475569] leading-relaxed mb-4">
                        {item.message}
                      </p>

                      <div className="flex items-center justify-between pt-2">
                        <span className="inline-block bg-[#FEE2E2] text-[#991B1B] text-[11px] font-bold px-3 py-1 rounded-md">
                          Target: {item.target}
                        </span>
                        <button className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold rounded-lg transition-all shadow-sm">
                          Acknowledge Alert
                        </button>
                      </div>
                    </div>
                  );
                }

                // Standard Cards Layout (Announcements, Clinical, Finance)
                const borderColors: Record<string, string> = {
                  Announcement: "bg-[#4F46E5]",
                  Announcements: "bg-[#4F46E5]",
                  Clinical: "bg-[#10B981]",
                  "Clinical Escalations": "bg-[#10B981]",
                  Finance: "bg-[#D97706]",
                };

                const badgeColors: Record<string, string> = {
                  Announcement: "bg-[#EEF2FF] text-[#4F46E5]",
                  Announcements: "bg-[#EEF2FF] text-[#4F46E5]",
                  Clinical: "bg-[#ECFDF5] text-[#059669]",
                  "Clinical Escalations": "bg-[#ECFDF5] text-[#059669]",
                  Finance: "bg-[#FEF3C7] text-[#D97706]",
                };

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm relative overflow-hidden transition-all"
                  >
                    <div
                      className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                        borderColors[item.type] || "bg-[#4F46E5]"
                      }`}
                    />
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`inline-block text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded ${
                          badgeColors[item.type] || "bg-[#EEF2FF] text-[#4F46E5]"
                        }`}
                      >
                        {item.type}
                      </span>
                      <span className="text-xs text-[#64748B]">{item.timestamp}</span>
                    </div>

                    <h3 className="text-base font-bold text-[#0F172A] mb-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT COLUMN: SETTINGS & RULES */}
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

      {/* EMERGENCY MODAL */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#FCA5A5] shadow-2xl overflow-hidden">
            <div className="bg-[#DC2626] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base">Broadcast Emergency Alert</h3>
              </div>
              <button
                onClick={() => setIsEmergencyModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTriggerEmergency} className="p-6 space-y-4">
              <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg p-3 text-xs text-[#991B1B]">
                <strong>Warning:</strong> Triggering an emergency alert will instantly send push notifications and sticky banners across all active staff interfaces.
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Emergency Code / Type
                </label>
                <select
                  value={emergencyData.codeType}
                  onChange={(e) =>
                    setEmergencyData({ ...emergencyData, codeType: e.target.value })
                  }
                  className="w-full text-xs font-medium border border-[#CBD5E1] rounded-lg px-3 py-2 bg-white text-[#0F172A] focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                >
                  <option>Code Blue (Cardiac Arrest)</option>
                  <option>Code Red (Fire / Evacuation)</option>
                  <option>Code Black (Security Incident / Lockout)</option>
                  <option>Code Pink (Pediatric Emergency)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Ward / Location
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surgical Theater 2, ER Ward B"
                  value={emergencyData.location}
                  onChange={(e) =>
                    setEmergencyData({ ...emergencyData, location: e.target.value })
                  }
                  className="w-full text-xs border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Target Response Team
                </label>
                <select
                  value={emergencyData.targetRoles}
                  onChange={(e) =>
                    setEmergencyData({ ...emergencyData, targetRoles: e.target.value })
                  }
                  className="w-full text-xs font-medium border border-[#CBD5E1] rounded-lg px-3 py-2 bg-white text-[#0F172A] focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                >
                  <option>All Surgical Staff</option>
                  <option>On-Duty Doctors & Nurses</option>
                  <option>Security & Administrative Personnel</option>
                  <option>Hospital-Wide Broadcast</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Clinical Instructions / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide immediate action steps or escalation details..."
                  value={emergencyData.instructions}
                  onChange={(e) =>
                    setEmergencyData({ ...emergencyData, instructions: e.target.value })
                  }
                  className="w-full text-xs border border-[#CBD5E1] rounded-lg p-3 text-[#0F172A] focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsEmergencyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Siren className="w-4 h-4" /> Trigger Emergency Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E2E8F0] shadow-2xl overflow-hidden">
            <div className="bg-[#4F46E5] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                <h3 className="font-bold text-base">Create Hospital Announcement</h3>
              </div>
              <button
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled System Downtime or New Policy Update"
                  value={announcementData.title}
                  onChange={(e) =>
                    setAnnouncementData({ ...announcementData, title: e.target.value })
                  }
                  className="w-full text-xs border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:ring-2 focus:ring-[#4F46E5] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Category Tag
                  </label>
                  <select
                    value={announcementData.category}
                    onChange={(e) =>
                      setAnnouncementData({
                        ...announcementData,
                        category: e.target.value,
                      })
                    }
                    className="w-full text-xs font-medium border border-[#CBD5E1] rounded-lg px-3 py-2 bg-white text-[#0F172A] focus:ring-2 focus:ring-[#4F46E5] focus:outline-none"
                  >
                    <option value="Announcements">Announcements</option>
                    <option value="Clinical">Clinical Escalations</option>
                    <option value="Finance">Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Target Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ophthalmology or All Staff"
                    value={announcementData.targetDept}
                    onChange={(e) =>
                      setAnnouncementData({
                        ...announcementData,
                        targetDept: e.target.value,
                      })
                    }
                    className="w-full text-xs border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:ring-2 focus:ring-[#4F46E5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Announcement Message
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type the full message details here..."
                  value={announcementData.message}
                  onChange={(e) =>
                    setAnnouncementData({
                      ...announcementData,
                      message: e.target.value,
                    })
                  }
                  className="w-full text-xs border border-[#CBD5E1] rounded-lg p-3 text-[#0F172A] focus:ring-2 focus:ring-[#4F46E5] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsAnnouncementModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}