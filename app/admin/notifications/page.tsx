"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Siren,
  Plus,
  Sliders,
  Radio,
  Bell,
  Search,
  X,
  AlertTriangle,
  Megaphone,
  Filter,
  ShieldCheck,
  Clock3,
  UserCircle,
  Info,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  triggeredBy?: string | null;
  target?: string | null;
  category: string;
  createdAt?: string | null;
}

interface AuthenticatedUser {
  name?: string;
  staffId?: string;
  role?: string;
  title?: string;
  department?: string;
}

type TabName =
  | "All"
  | "Announcements"
  | "Clinical Escalations"
  | "Finance"
  | "Security";

export default function NotificationsAlertCenterPage() {
  const [activeTab, setActiveTab] =
    useState<TabName>("All");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [isLoadingNotifications, setIsLoadingNotifications] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [currentUser, setCurrentUser] =
    useState<AuthenticatedUser | null>(null);

  const [
    isEmergencyModalOpen,
    setIsEmergencyModalOpen,
  ] = useState(false);

  const [
    isAnnouncementModalOpen,
    setIsAnnouncementModalOpen,
  ] = useState(false);

  const [
    emergencyData,
    setEmergencyData,
  ] = useState({
    codeType: "Code Blue (Cardiac Arrest)",
    location: "",
    targetRoles: "All Surgical Staff",
    instructions: "",
  });

  const [
    announcementData,
    setAnnouncementData,
  ] = useState({
    title: "",
    category: "Announcements",
    targetDept: "All Hospital Staff",
    message: "",
  });

  // ----------------------------------------------------------
  // Load authenticated user
  // ----------------------------------------------------------
  const loadCurrentUser = async () => {
    try {
      const response = await fetch(
        "/api/auth/me",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data?.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error(
        "Failed to load authenticated user:",
        err
      );
    }
  };

  // ----------------------------------------------------------
  // Load notifications
  // ----------------------------------------------------------
  const loadNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      setError(null);

      const response = await fetch(
        "/api/notifications",
        {
          cache: "no-store",
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Unable to load notifications (${response.status}).`
        );
      }

      setNotifications(
        Array.isArray(data.notifications)
          ? data.notifications
          : []
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load notifications.";

      console.error(
        "Failed to load notifications:",
        err
      );

      setError(message);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
    loadNotifications();
  }, []);

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  const isCategoryMatch = (
    category: string,
    tab: TabName
  ) => {
    if (tab === "All") {
      return true;
    }

    return category === tab;
  };

  const filteredNotifications =
    useMemo(() => {
      const normalizedSearch =
        searchQuery
          .trim()
          .toLowerCase();

      return notifications.filter(
        (item) => {
          const categoryMatches =
            isCategoryMatch(
              item.category,
              activeTab
            );

          if (!categoryMatches) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          return [
            item.title,
            item.message,
            item.type,
            item.category,
            item.target ?? "",
            item.triggeredBy ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
        }
      );
    }, [
      notifications,
      activeTab,
      searchQuery,
    ]);

  const countForTab = (
    tab: TabName
  ) => {
    return notifications.filter((item) =>
      isCategoryMatch(
        item.category,
        tab
      )
    ).length;
  };

  const displayName =
    currentUser?.name ||
    currentUser?.staffId ||
    "Authenticated Administrator";

  const displayTitle =
    currentUser?.title ||
    currentUser?.department ||
    "IT Administrator";

  // ----------------------------------------------------------
  // Broadcast Emergency Alert
  // ----------------------------------------------------------
  const handleTriggerEmergency = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (
      !emergencyData.location.trim()
    ) {
      setError(
        "Please provide the emergency location."
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        "/api/notifications",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            type: "Emergency",
            title: `${emergencyData.codeType} — ${emergencyData.location.trim()}`,
            message:
              emergencyData.instructions.trim() ||
              "Immediate response required. Please follow standard emergency response protocols.",
            target:
              emergencyData.targetRoles,
            category: "Security",
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to broadcast emergency alert."
        );
      }

      if (data.notification) {
        setNotifications(
          (previous) => [
            data.notification,
            ...previous,
          ]
        );
      }

      setIsEmergencyModalOpen(false);

      setEmergencyData({
        codeType:
          "Code Blue (Cardiac Arrest)",
        location: "",
        targetRoles:
          "All Surgical Staff",
        instructions: "",
      });

      setSuccessMessage(
        "Emergency alert was recorded successfully and added to the Admin notification feed."
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to broadcast emergency alert.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------------
  // Create Announcement
  // ----------------------------------------------------------
  const handleCreateAnnouncement =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      if (
        !announcementData.title.trim() ||
        !announcementData.message.trim()
      ) {
        setError(
          "Announcement title and message are required."
        );
        return;
      }

      const category =
        announcementData.category ===
        "Clinical"
          ? "Clinical Escalations"
          : announcementData.category ===
            "Finance"
          ? "Finance"
          : "Announcements";

      const type =
        announcementData.category ===
        "Clinical"
          ? "Clinical"
          : announcementData.category ===
            "Finance"
          ? "Finance"
          : "Announcement";

      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(
          "/api/notifications",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              type,
              title:
                announcementData.title.trim(),
              message:
                announcementData.message.trim(),
              target:
                announcementData.targetDept.trim() ||
                "All Hospital Staff",
              category,
            }),
          }
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to publish announcement."
          );
        }

        if (data.notification) {
          setNotifications(
            (previous) => [
              data.notification,
              ...previous,
            ]
          );
        }

        setIsAnnouncementModalOpen(false);

        setAnnouncementData({
          title: "",
          category: "Announcements",
          targetDept:
            "All Hospital Staff",
          message: "",
        });

        setSuccessMessage(
          "Announcement published successfully and recorded in the audit trail."
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to publish announcement.";

        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    };

  const getTypeStyles = (
    type: string
  ) => {
    switch (type) {
      case "Emergency":
        return {
          border:
            "bg-[#DC2626]",
          badge:
            "bg-[#FEE2E2] text-[#991B1B]",
        };

      case "Clinical":
        return {
          border:
            "bg-[#10B981]",
          badge:
            "bg-[#ECFDF5] text-[#059669]",
        };

      case "Finance":
        return {
          border:
            "bg-[#D97706]",
          badge:
            "bg-[#FEF3C7] text-[#B45309]",
        };

      default:
        return {
          border:
            "bg-[#4F46E5]",
          badge:
            "bg-[#EEF2FF] text-[#4F46E5]",
        };
    }
  };

  const tabs: TabName[] = [
    "All",
    "Announcements",
    "Clinical Escalations",
    "Finance",
    "Security",
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-12">
      {/* GLOBAL HEADER */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Search alerts, announcements, or staff..."
                className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              <span className="text-xs font-semibold text-[#475569]">
                Admin session active
              </span>
            </div>

            <div className="h-8 w-px bg-[#E2E8F0]" />

            <div className="flex items-center gap-3">
              <UserCircle className="w-9 h-9 text-[#64748B]" />

              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold leading-tight text-[#0F172A]">
                  {displayName}
                </p>

                <p className="text-[11px] text-[#64748B]">
                  {displayTitle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8">
        {/* ERROR */}
        {error && (
          <div className="mb-4 flex items-start justify-between gap-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
              className="text-rose-500 hover:text-rose-700"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SUCCESS */}
        {successMessage && (
          <div className="mb-4 flex items-start justify-between gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
            <span>
              {successMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage(null)
              }
              className="text-emerald-500 hover:text-emerald-700"
              aria-label="Dismiss success message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Notifications & Emergency Alert Center
            </h2>

            <p className="text-sm text-[#64748B] mt-1">
              Manage hospital announcements,
              administrative alerts, and
              recorded emergency broadcasts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setIsEmergencyModalOpen(
                  true
                )
              }
              className="px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-sm font-semibold transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              <Siren className="w-4 h-4" />
              Broadcast Emergency Alert
            </button>

            <button
              type="button"
              onClick={() =>
                setIsAnnouncementModalOpen(
                  true
                )
              }
              className="px-4 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Create Announcement
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="border-b border-[#E2E8F0] mb-6 overflow-x-auto">
          <div className="flex gap-7 min-w-max">
            {tabs.map((tab) => {
              const isActive =
                activeTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab)
                  }
                  className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                    isActive
                      ? "text-[#4F46E5] font-semibold"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  <span>{tab}</span>

                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-[#EEF2FF] text-[#4F46E5]"
                        : "bg-[#F1F5F9] text-[#64748B]"
                    }`}
                  >
                    {countForTab(tab)}
                  </span>

                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5] rounded-t-md" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FEED */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#4F46E5]" />

                <span className="text-xs font-bold text-[#0F172A]">
                  Active Feed —{" "}
                  {activeTab} (
                  {
                    filteredNotifications.length
                  }
                  )
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium bg-[#F8FAFC] px-2.5 py-1 rounded-md border border-[#E2E8F0]">
                <Filter className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>
                  {searchQuery
                    ? "Search + tab filter"
                    : "Filtered by tab"}
                </span>
              </div>
            </div>

            {isLoadingNotifications ? (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-[#64748B]">
                  <Clock3 className="w-4 h-4 animate-pulse" />
                  Loading notifications…
                </div>
              </div>
            ) : filteredNotifications.length ===
              0 ? (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-12 text-center">
                <Bell className="w-8 h-8 text-[#CBD5E1] mx-auto mb-3" />

                <p className="text-sm font-semibold text-[#0F172A]">
                  No notifications found
                </p>

                <p className="text-xs text-[#64748B] mt-1">
                  {searchQuery
                    ? "Try a different search term."
                    : `There are no items currently listed under ${activeTab}.`}
                </p>
              </div>
            ) : (
              filteredNotifications.map(
                (item) => {
                  const styles =
                    getTypeStyles(
                      item.type
                    );

                  if (
                    item.type ===
                    "Emergency"
                  ) {
                    return (
                      <div
                        key={item.id}
                        className="bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] p-6 shadow-sm relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#DC2626]" />

                        <div className="flex items-center justify-between mb-3 gap-4">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider text-[#DC2626] uppercase">
                            <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                            Emergency
                          </span>

                          <span className="text-xs text-[#64748B] text-right">
                            {item.timestamp}
                            {item.triggeredBy
                              ? ` · ${item.triggeredBy}`
                              : ""}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-[#0F172A] mb-2">
                          {item.title}
                        </h3>

                        <p className="text-xs text-[#475569] leading-relaxed mb-4">
                          {item.message}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <span className="inline-block bg-[#FEE2E2] text-[#991B1B] text-[11px] font-bold px-3 py-1 rounded-md">
                            Target:{" "}
                            {item.target ||
                              "Unspecified"}
                          </span>

                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#64748B]">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                            Recorded
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm relative overflow-hidden"
                    >
                      <div
                        className={`absolute top-0 left-0 bottom-0 w-1.5 ${styles.border}`}
                      />

                      <div className="flex items-center justify-between mb-3 gap-4">
                        <span
                          className={`inline-block text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded ${styles.badge}`}
                        >
                          {item.type}
                        </span>

                        <span className="text-xs text-[#64748B]">
                          {item.timestamp}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#0F172A] mb-2">
                        {item.title}
                      </h3>

                      <p className="text-xs text-[#64748B] leading-relaxed mb-4">
                        {item.message}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F1F5F9]">
                        <span className="text-[11px] font-semibold text-[#64748B]">
                          Target:{" "}
                          {item.target ||
                            "Unspecified"}
                        </span>

                        {item.triggeredBy && (
                          <span className="text-[11px] text-[#94A3B8]">
                            By{" "}
                            {item.triggeredBy}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Automated rules */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sliders className="w-5 h-5 text-[#4F46E5]" />

                <h3 className="font-semibold text-base text-[#0F172A]">
                  Automated Alert Rules
                </h3>
              </div>

              <div className="mb-5 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex gap-2">
                <Info className="w-4 h-4 text-[#64748B] shrink-0 mt-0.5" />

                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  These rules are currently
                  configuration placeholders.
                  They are not connected to
                  automated backend jobs yet.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title:
                      "Triage Score Escalation",
                    description:
                      "Future automation for clinical triage thresholds.",
                  },
                  {
                    title:
                      "Failed Login Attempt Limit",
                    description:
                      "Security logging currently records failed login events; automatic account locking is separate.",
                  },
                  {
                    title:
                      "Drug Expiry Warning",
                    description:
                      "Future automation for medication expiry monitoring.",
                  },
                ].map((rule) => (
                  <div
                    key={rule.title}
                    className="flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">
                        {rule.title}
                      </p>

                      <p className="text-[11px] text-[#64748B] mt-1 leading-relaxed">
                        {rule.description}
                      </p>
                    </div>

                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-[#F1F5F9] text-[#64748B]">
                      Not connected
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery channels */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Radio className="w-5 h-5 text-[#4F46E5]" />

                <h3 className="font-semibold text-base text-[#0F172A]">
                  Delivery Channels
                </h3>
              </div>

              <div className="mb-5 p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  The current implementation
                  records notifications in the
                  hospital system. External
                  delivery channels require
                  additional infrastructure.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    name: "In-App Notifications",
                    status:
                      "Database feed active",
                  },
                  {
                    name: "Desktop Push",
                    status:
                      "Not connected",
                  },
                  {
                    name: "SMS Broadcast",
                    status:
                      "Not connected",
                  },
                  {
                    name: "Email Digests",
                    status:
                      "Not connected",
                  },
                ].map((channel) => (
                  <div
                    key={channel.name}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#F1F5F9]"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#0F172A]">
                        {channel.name}
                      </p>

                      <p className="text-[10px] text-[#64748B] mt-0.5">
                        {channel.status}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md ${
                        channel.status ===
                        "Database feed active"
                          ? "bg-[#DCFCE7] text-[#15803D]"
                          : "bg-[#F1F5F9] text-[#64748B]"
                      }`}
                    >
                      {channel.status ===
                      "Database feed active"
                        ? "Active"
                        : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current scope */}
            <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#4F46E5] shrink-0 mt-0.5" />

                <div>
                  <h3 className="text-sm font-bold text-[#312E81]">
                    Current notification scope
                  </h3>

                  <p className="text-[11px] text-[#4338CA] mt-1 leading-relaxed">
                    Notifications created here
                    are stored in the hospital
                    database and recorded in
                    the Admin audit trail.
                    External SMS, email, browser
                    push, and real-time staff
                    delivery are not yet enabled.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ----------------------------------------------------
          EMERGENCY MODAL
      ----------------------------------------------------- */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#FCA5A5] shadow-2xl overflow-hidden">
            <div className="bg-[#DC2626] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />

                <h3 className="font-bold text-base">
                  Broadcast Emergency Alert
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsEmergencyModalOpen(
                    false
                  )
                }
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg"
                aria-label="Close emergency dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleTriggerEmergency
              }
              className="p-6 space-y-4"
            >
              <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg p-3 text-xs text-[#991B1B]">
                <strong>Important:</strong>{" "}
                This currently records the
                emergency alert in the Admin
                system. It does not automatically
                send SMS, browser push, or
                real-time alerts to other staff.
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Emergency Code / Type
                </label>

                <select
                  value={
                    emergencyData.codeType
                  }
                  onChange={(event) =>
                    setEmergencyData(
                      (previous) => ({
                        ...previous,
                        codeType:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full text-xs font-medium border border-[#CBD5E1] rounded-lg px-3 py-2 bg-white text-[#0F172A] focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                >
                  <option>
                    Code Blue (Cardiac Arrest)
                  </option>

                  <option>
                    Code Red (Fire / Evacuation)
                  </option>

                  <option>
                    Code Black (Security Incident / Lockout)
                  </option>

                  <option>
                    Code Pink (Pediatric Emergency)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Ward / Location
                </label>

                <input
                  type="text"
                  required
                  value={
                    emergencyData.location
                  }
                  onChange={(event) =>
                    setEmergencyData(
                      (previous) => ({
                        ...previous,
                        location:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="e.g. Surgical Theater 2, ER Ward B"
                  className="w-full text-xs border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Target Response Team
                </label>

                <select
                  value={
                    emergencyData.targetRoles
                  }
                  onChange={(event) =>
                    setEmergencyData(
                      (previous) => ({
                        ...previous,
                        targetRoles:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full text-xs font-medium border border-[#CBD5E1] rounded-lg px-3 py-2 bg-white text-[#0F172A] focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                >
                  <option>
                    All Surgical Staff
                  </option>

                  <option>
                    On-Duty Doctors & Nurses
                  </option>

                  <option>
                    Security & Administrative Personnel
                  </option>

                  <option>
                    Hospital-Wide Broadcast
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Clinical Instructions / Notes
                </label>

                <textarea
                  rows={4}
                  value={
                    emergencyData.instructions
                  }
                  onChange={(event) =>
                    setEmergencyData(
                      (previous) => ({
                        ...previous,
                        instructions:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Provide immediate action steps or escalation details..."
                  className="w-full text-xs border border-[#CBD5E1] rounded-lg p-3 text-[#0F172A] focus:ring-2 focus:ring-[#DC2626] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() =>
                    setIsEmergencyModalOpen(
                      false
                    )
                  }
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Siren className="w-4 h-4" />

                  {isSubmitting
                    ? "Recording..."
                    : "Trigger Emergency Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          ANNOUNCEMENT MODAL
      ----------------------------------------------------- */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#E2E8F0] shadow-2xl overflow-hidden">
            <div className="bg-[#4F46E5] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />

                <h3 className="font-bold text-base">
                  Create Hospital Announcement
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsAnnouncementModalOpen(
                    false
                  )
                }
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg"
                aria-label="Close announcement dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={
                handleCreateAnnouncement
              }
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Announcement Title
                </label>

                <input
                  type="text"
                  required
                  value={
                    announcementData.title
                  }
                  onChange={(event) =>
                    setAnnouncementData(
                      (previous) => ({
                        ...previous,
                        title:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="e.g. Scheduled System Downtime"
                  className="w-full text-xs border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:ring-2 focus:ring-[#4F46E5] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Category
                  </label>

                  <select
                    value={
                      announcementData.category
                    }
                    onChange={(event) =>
                      setAnnouncementData(
                        (previous) => ({
                          ...previous,
                          category:
                            event.target.value,
                        })
                      )
                    }
                    className="w-full text-xs font-medium border border-[#CBD5E1] rounded-lg px-3 py-2 bg-white text-[#0F172A] focus:ring-2 focus:ring-[#4F46E5] focus:outline-none"
                  >
                    <option value="Announcements">
                      Announcements
                    </option>

                    <option value="Clinical">
                      Clinical Escalations
                    </option>

                    <option value="Finance">
                      Finance
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1">
                    Target Department
                  </label>

                  <input
                    type="text"
                    value={
                      announcementData.targetDept
                    }
                    onChange={(event) =>
                      setAnnouncementData(
                        (previous) => ({
                          ...previous,
                          targetDept:
                            event.target.value,
                        })
                      )
                    }
                    placeholder="e.g. Ophthalmology"
                    className="w-full text-xs border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:ring-2 focus:ring-[#4F46E5] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">
                  Announcement Message
                </label>

                <textarea
                  rows={5}
                  required
                  value={
                    announcementData.message
                  }
                  onChange={(event) =>
                    setAnnouncementData(
                      (previous) => ({
                        ...previous,
                        message:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Type the full message details here..."
                  className="w-full text-xs border border-[#CBD5E1] rounded-lg p-3 text-[#0F172A] focus:ring-2 focus:ring-[#4F46E5] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() =>
                    setIsAnnouncementModalOpen(
                      false
                    )
                  }
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />

                  {isSubmitting
                    ? "Publishing..."
                    : "Publish Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}