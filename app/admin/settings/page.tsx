"use client";

import React, { useEffect, useState } from "react";
import {
  Grid,
  Plus,
  Receipt,
  Clock,
  Key,
  Users,
  X,
  Save,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Building,
  CheckCircle2,
  UserCheck,
  RefreshCw,
  ShieldCheck,
  PlugZap,
  Trash2,
} from "lucide-react";

export interface SystemModules {
  ehr: boolean;
  pharmacy: boolean;
  optical: boolean;
  billing: boolean;
  patientPortal: boolean;
  telemedicine: boolean;
}

export interface Department {
  id: string;
  name: string;
  staffCount: number;
  status: "Active" | "Inactive";
}

export interface BillingSettings {
  vatRate: string;
  invoiceDueDays: string;
}

interface OperationalDay {
  enabled: boolean;
  open: string;
  close: string;
}

interface OperationalHours {
  mode: string;
  monday: OperationalDay;
  tuesday: OperationalDay;
  wednesday: OperationalDay;
  thursday: OperationalDay;
  friday: OperationalDay;
  saturday: OperationalDay;
  sunday: OperationalDay;
}

interface IntegrationStatus {
  configured: boolean;
}

interface Integrations {
  paymentGateway: IntegrationStatus;
  sms: IntegrationStatus;
  laboratory: IntegrationStatus;
}

interface AuthenticatedUser {
  id?: string;
  staffId?: string;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  title?: string;
  department?: string;
}

const DEFAULT_MODULES: SystemModules = {
  ehr: true,
  pharmacy: true,
  optical: true,
  billing: true,
  patientPortal: false,
  telemedicine: false,
};

const DEFAULT_BILLING: BillingSettings = {
  vatRate: "7.5%",
  invoiceDueDays: "30 Days",
};

const DEFAULT_OPERATIONAL_HOURS: OperationalHours = {
  mode: "24/7",
  monday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  tuesday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  wednesday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  thursday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  friday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  saturday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
  sunday: {
    enabled: true,
    open: "00:00",
    close: "23:59",
  },
};

const DEFAULT_INTEGRATIONS: Integrations = {
  paymentGateway: {
    configured: false,
  },
  sms: {
    configured: false,
  },
  laboratory: {
    configured: false,
  },
};

const MODULE_ITEMS: {
  key: keyof SystemModules;
  title: string;
  desc: string;
}[] = [
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
    title: "Optical & OCT Center",
    desc: "Eye diagnostics",
  },
  {
    key: "billing",
    title: "Billing & Payments",
    desc: "Financial transactions",
  },
  {
    key: "patientPortal",
    title: "Patient Self-Service",
    desc: "Patient portal access",
  },
  {
    key: "telemedicine",
    title: "Telemedicine",
    desc: "Virtual consultations",
  },
];

const TAB_OPTIONS = [
  "General Setup",
  "Departments & Wards",
  "Billing & Tax Defaults",
  "Operational Hours",
  "Integrations & API",
] as const;

type TabType = (typeof TAB_OPTIONS)[number];

const DAY_LABELS: {
  key: keyof Omit<OperationalHours, "mode">;
  label: string;
}[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

function cloneOperationalHours(
  value: OperationalHours
): OperationalHours {
  return JSON.parse(
    JSON.stringify(value)
  ) as OperationalHours;
}

function cloneModules(
  value: SystemModules
): SystemModules {
  return { ...value };
}

function cloneBilling(
  value: BillingSettings
): BillingSettings {
  return { ...value };
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] =
    useState<TabType>("General Setup");

  const [currentUser, setCurrentUser] =
    useState<AuthenticatedUser | null>(null);

  const [hospitalName, setHospitalName] =
    useState("Sparkle Eye Specialist Hospital");

  const [modules, setModules] =
    useState<SystemModules>(
      cloneModules(DEFAULT_MODULES)
    );

  const [billing, setBilling] =
    useState<BillingSettings>(
      cloneBilling(DEFAULT_BILLING)
    );

  const [
    operationalHours,
    setOperationalHours,
  ] = useState<OperationalHours>(
    cloneOperationalHours(
      DEFAULT_OPERATIONAL_HOURS
    )
  );

  const [
    departments,
    setDepartments,
  ] = useState<Department[]>([]);

  const [integrations, setIntegrations] =
    useState<Integrations>(
      DEFAULT_INTEGRATIONS
    );

  const [
    savedHospitalName,
    setSavedHospitalName,
  ] = useState(
    "Sparkle Eye Specialist Hospital"
  );

  const [
    savedModules,
    setSavedModules,
  ] = useState<SystemModules>(
    cloneModules(DEFAULT_MODULES)
  );

  const [
    savedBilling,
    setSavedBilling,
  ] = useState<BillingSettings>(
    cloneBilling(DEFAULT_BILLING)
  );

  const [
    savedOperationalHours,
    setSavedOperationalHours,
  ] = useState<OperationalHours>(
    cloneOperationalHours(
      DEFAULT_OPERATIONAL_HOURS
    )
  );

  const [
    isAddDeptModalOpen,
    setIsAddDeptModalOpen,
  ] = useState(false);

  const [
    isDeleteDeptModalOpen,
    setIsDeleteDeptModalOpen,
  ] = useState(false);

  const [
    departmentToDelete,
    setDepartmentToDelete,
  ] = useState<Department | null>(null);

  const [
    isSaveModalOpen,
    setIsSaveModalOpen,
  ] = useState(false);

  const [
    isDiscardModalOpen,
    setIsDiscardModalOpen,
  ] = useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    isAddingDepartment,
    setIsAddingDepartment,
  ] = useState(false);

  const [
    isDeletingDepartment,
    setIsDeletingDepartment,
  ] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [showToast, setShowToast] =
    useState(false);

  const [toastMessage, setToastMessage] =
    useState(
      "Settings saved successfully."
    );

  const [newDeptName, setNewDeptName] =
    useState("");

  const [
    lastUpdatedAt,
    setLastUpdatedAt,
  ] = useState<string | null>(null);

  const showSuccessToast = (
    message: string
  ) => {
    setToastMessage(message);
    setShowToast(true);

    window.setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const loadSettings = async (
    showRefreshState = false
  ) => {
    try {
      setErrorMessage("");

      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const [
        settingsResponse,
        meResponse,
        departmentsResponse,
      ] = await Promise.all([
        fetch("/api/admin/settings", {
          method: "GET",
          cache: "no-store",
        }),

        fetch("/api/auth/me", {
          method: "GET",
          cache: "no-store",
        }),

        fetch(
          "/api/admin/settings/departments",
          {
            method: "GET",
            cache: "no-store",
          }
        ),
      ]);

      const settingsData =
        await settingsResponse.json();

      const meData =
        await meResponse.json();

      const departmentsData =
        await departmentsResponse.json();

      if (!settingsResponse.ok) {
        throw new Error(
          settingsData?.error ||
            "Failed to load system settings."
        );
      }

      if (!departmentsResponse.ok) {
        throw new Error(
          departmentsData?.error ||
            "Failed to load departments."
        );
      }

      const loadedHospitalName =
        settingsData?.settings
          ?.hospitalName ||
        "Sparkle Eye Specialist Hospital";

      const loadedModules =
        settingsData?.settings?.modules ??
        DEFAULT_MODULES;

      const loadedBilling =
        settingsData?.settings?.billing ??
        DEFAULT_BILLING;

      const loadedHours =
        settingsData?.settings
          ?.operationalHours ??
        DEFAULT_OPERATIONAL_HOURS;

      const loadedIntegrations =
        settingsData?.settings
          ?.integrations ??
        DEFAULT_INTEGRATIONS;

      setHospitalName(
        loadedHospitalName
      );

      setSavedHospitalName(
        loadedHospitalName
      );

      setModules(
        cloneModules(loadedModules)
      );

      setSavedModules(
        cloneModules(loadedModules)
      );

      setBilling(
        cloneBilling(loadedBilling)
      );

      setSavedBilling(
        cloneBilling(loadedBilling)
      );

      setOperationalHours(
        cloneOperationalHours(
          loadedHours
        )
      );

      setSavedOperationalHours(
        cloneOperationalHours(
          loadedHours
        )
      );

      setIntegrations(
        loadedIntegrations
      );

      setDepartments(
        departmentsData?.departments ??
          []
      );

      setCurrentUser(
        meResponse.ok
          ? meData?.user ?? null
          : null
      );

      setLastUpdatedAt(
        settingsData?.settings
          ?.updatedAt ?? null
      );
    } catch (error) {
      console.error(
        "Settings load error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load system settings."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const toggleModule = (
    key: keyof SystemModules
  ) => {
    setModules((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const handleBillingChange = (
    field: keyof BillingSettings,
    value: string
  ) => {
    setBilling((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateOperationalDay = (
    day: keyof Omit<
      OperationalHours,
      "mode"
    >,
    field: keyof OperationalDay,
    value: boolean | string
  ) => {
    setOperationalHours(
      (previous) => ({
        ...previous,
        [day]: {
          ...previous[day],
          [field]: value,
        },
      })
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage("");

      const response = await fetch(
        "/api/admin/settings",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            hospitalName,
            modules,
            billing,
            operationalHours,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to save system settings."
        );
      }

      setSavedHospitalName(
        hospitalName
      );

      setSavedModules(
        cloneModules(modules)
      );

      setSavedBilling(
        cloneBilling(billing)
      );

      setSavedOperationalHours(
        cloneOperationalHours(
          operationalHours
        )
      );

      setLastUpdatedAt(
        data?.settings?.updatedAt ??
          new Date().toISOString()
      );

      setIsSaveModalOpen(false);

      showSuccessToast(
        "Settings saved successfully."
      );
    } catch (error) {
      console.error(
        "Settings save error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save system settings."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setHospitalName(
      savedHospitalName
    );

    setModules(
      cloneModules(savedModules)
    );

    setBilling(
      cloneBilling(savedBilling)
    );

    setOperationalHours(
      cloneOperationalHours(
        savedOperationalHours
      )
    );

    setIsDiscardModalOpen(false);
    setErrorMessage("");
  };

  const handleAddDepartment = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const name =
      newDeptName.trim();

    if (!name) {
      return;
    }

    try {
      setIsAddingDepartment(true);
      setErrorMessage("");

      const response = await fetch(
        "/api/admin/settings/departments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to create department."
        );
      }

      setDepartments(
        (previous) => [
          ...previous,
          data.department,
        ].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );

      setNewDeptName("");
      setIsAddDeptModalOpen(false);

      showSuccessToast(
        "Department created successfully."
      );
    } catch (error) {
      console.error(
        "Department creation error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create department."
      );
    } finally {
      setIsAddingDepartment(false);
    }
  };

  const openDeleteDepartmentModal = (
    department: Department
  ) => {
    setDepartmentToDelete(
      department
    );
    setIsDeleteDeptModalOpen(true);
    setErrorMessage("");
  };

  const closeDeleteDepartmentModal = () => {
    if (isDeletingDepartment) {
      return;
    }

    setIsDeleteDeptModalOpen(false);
    setDepartmentToDelete(null);
  };

  const handleDeleteDepartment =
    async () => {
      if (!departmentToDelete) {
        return;
      }

      try {
        setIsDeletingDepartment(
          departmentToDelete.id
        );

        setErrorMessage("");

        const response = await fetch(
          `/api/admin/settings/departments?id=${encodeURIComponent(
            departmentToDelete.id
          )}`,
          {
            method: "DELETE",
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to delete department."
          );
        }

        setDepartments(
          (previous) =>
            previous.filter(
              (department) =>
                department.id !==
                departmentToDelete.id
            )
        );

        setIsDeleteDeptModalOpen(false);
        setDepartmentToDelete(null);

        showSuccessToast(
          "Department deleted successfully."
        );
      } catch (error) {
        console.error(
          "Department deletion error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to delete department."
        );
      } finally {
        setIsDeletingDepartment(null);
      }
    };

  const displayName =
    currentUser?.name ||
    currentUser?.username ||
    "Administrator";

  const displayTitle =
    currentUser?.title ||
    currentUser?.role ||
    "IT Administrator";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#64748B]">
          <Loader2 className="w-7 h-7 animate-spin text-[#4F46E5]" />
          <p className="text-sm font-medium">
            Loading system settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 text-[#0F172A] relative">
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg">
          <CheckCircle2 className="w-5 h-5" />

          <span className="text-sm font-medium">
            {toastMessage}
          </span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-6 h-6 text-[#4F46E5]" />

              <h1 className="text-xl font-bold text-[#0F172A]">
                {hospitalName ||
                  "Hospital Facility"}
              </h1>
            </div>

            <p className="text-xs text-[#64748B] mt-1">
              Logged in as:{" "}
              <span className="font-semibold text-[#0F172A]">
                {displayName}
              </span>
              {" · "}
              {displayTitle}
            </p>

            {lastUpdatedAt && (
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Last configuration update:{" "}
                {new Date(
                  lastUpdatedAt
                ).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() =>
                void loadSettings(true)
              }
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  isRefreshing
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                setIsDiscardModalOpen(true)
              }
              className="px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-[#64748B]" />
              Discard Changes
            </button>

            <button
              type="button"
              onClick={() =>
                setIsSaveModalOpen(true)
              }
              className="px-4 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </div>

        {/* ERROR */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />

            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-800">
                Settings error
              </p>

              <p className="text-xs text-rose-700 mt-1">
                {errorMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setErrorMessage("")
              }
              className="text-xs font-semibold text-rose-700 hover:text-rose-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TABS */}
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] overflow-x-auto pb-1">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() =>
                setActiveTab(tab)
              }
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-all ${
                activeTab === tab
                  ? "bg-white text-[#4F46E5] shadow-sm border border-[#E2E8F0]"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100/60"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* GENERAL SETUP */}
        {activeTab === "General Setup" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-4">
                <UserCheck className="w-5 h-5 text-[#4F46E5]" />

                <div>
                  <h3 className="font-semibold text-base">
                    Administrator & Hospital Profile
                  </h3>

                  <p className="text-xs text-[#64748B] mt-0.5">
                    The administrator identity comes
                    from the authenticated staff account.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Logged-in Administrator
                  </label>

                  <div className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm">
                    {displayName}
                  </div>

                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Manage staff identity from
                    Staff & Access Control.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Hospital / Facility Name
                  </label>

                  <input
                    type="text"
                    value={hospitalName}
                    onChange={(event) =>
                      setHospitalName(
                        event.target.value
                      )
                    }
                    maxLength={150}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Grid className="w-5 h-5 text-[#4F46E5]" />

                <div>
                  <h3 className="font-semibold text-base">
                    Active Portals & Modules
                  </h3>

                  <p className="text-xs text-[#64748B] mt-1">
                    These settings are persisted as
                    system configuration.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {MODULE_ITEMS.map(
                  (module) => {
                    const isActive =
                      modules[module.key];

                    return (
                      <div
                        key={module.key}
                        className="flex items-center justify-between pt-3 first:pt-0 border-t border-[#F1F5F9] first:border-0"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {module.title}
                          </p>

                          <p className="text-xs text-[#64748B]">
                            {module.desc}
                          </p>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={
                            isActive
                          }
                          aria-label={`Toggle ${module.title}`}
                          onClick={() =>
                            toggleModule(
                              module.key
                            )
                          }
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                            isActive
                              ? "bg-[#4F46E5]"
                              : "bg-[#E2E8F0]"
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              isActive
                                ? "translate-x-5"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

        {/* DEPARTMENTS */}
        {activeTab ===
          "Departments & Wards" && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="font-semibold text-base">
                  Clinical Departments & Wards
                </h3>

                <p className="text-xs text-[#64748B]">
                  Manage hospital units.
                  Staff counts are calculated
                  from active staff records.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsAddDeptModalOpen(true)
                }
                className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Department
              </button>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {departments.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#64748B]">
                  No departments configured.
                </p>
              ) : (
                departments.map(
                  (department) => (
                    <div
                      key={department.id}
                      className="py-4 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {department.name}
                        </p>

                        <p className="text-xs text-[#64748B]">
                          {department.staffCount} active{" "}
                          {department.staffCount ===
                          1
                            ? "staff member"
                            : "staff members"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                            department.status ===
                            "Active"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {department.status}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            openDeleteDepartmentModal(
                              department
                            )
                          }
                          disabled={
                            department.staffCount >
                              0 ||
                            isDeletingDepartment ===
                              department.id
                          }
                          title={
                            department.staffCount >
                            0
                              ? "Cannot delete a department with active staff."
                              : "Delete department"
                          }
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-white text-rose-600 text-xs font-semibold hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                          {isDeletingDepartment ===
                          department.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}

                          Delete
                        </button>
                      </div>
                    </div>
                  )
                )
              )}
            </div>
          </div>
        )}

        {/* BILLING */}
        {activeTab ===
          "Billing & Tax Defaults" && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-4">
              <Receipt className="w-5 h-5 text-[#4F46E5]" />

              <div>
                <h3 className="font-semibold text-base">
                  Tax & Currency Defaults
                </h3>

                <p className="text-xs text-[#64748B] mt-1">
                  These values are stored as system
                  billing defaults.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Value Added Tax (VAT)
                </label>

                <input
                  type="text"
                  value={billing.vatRate}
                  onChange={(event) =>
                    handleBillingChange(
                      "vatRate",
                      event.target.value
                    )
                  }
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Invoice Due Period
                </label>

                <input
                  type="text"
                  value={
                    billing.invoiceDueDays
                  }
                  onChange={(event) =>
                    handleBillingChange(
                      "invoiceDueDays",
                      event.target.value
                    )
                  }
                  maxLength={50}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
            </div>
          </div>
        )}

        {/* OPERATIONAL HOURS */}
        {activeTab ===
          "Operational Hours" && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-4">
              <Clock className="w-5 h-5 text-[#4F46E5]" />

              <div>
                <h3 className="font-semibold text-base">
                  Facility Shift & Work Hours
                </h3>

                <p className="text-xs text-[#64748B] mt-1">
                  Configure the facility's operating
                  schedule.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {DAY_LABELS.map(
                ({ key, label }) => {
                  const day =
                    operationalHours[key];

                  return (
                    <div
                      key={key}
                      className="grid grid-cols-1 md:grid-cols-[180px_1fr_1fr] gap-3 items-center border border-[#E2E8F0] rounded-xl p-4"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={
                            day.enabled
                          }
                          onClick={() =>
                            updateOperationalDay(
                              key,
                              "enabled",
                              !day.enabled
                            )
                          }
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                            day.enabled
                              ? "bg-[#4F46E5]"
                              : "bg-[#CBD5E1]"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                              day.enabled
                                ? "translate-x-5"
                                : ""
                            }`}
                          />
                        </button>

                        <span className="text-sm font-semibold">
                          {label}
                        </span>
                      </div>

                      <label className="text-xs text-[#64748B]">
                        Opening time
                        <input
                          type="time"
                          value={day.open}
                          disabled={
                            !day.enabled
                          }
                          onChange={(event) =>
                            updateOperationalDay(
                              key,
                              "open",
                              event.target.value
                            )
                          }
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </label>

                      <label className="text-xs text-[#64748B]">
                        Closing time
                        <input
                          type="time"
                          value={day.close}
                          disabled={
                            !day.enabled
                          }
                          onChange={(event) =>
                            updateOperationalDay(
                              key,
                              "close",
                              event.target.value
                            )
                          }
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </label>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* INTEGRATIONS */}
        {activeTab ===
          "Integrations & API" && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-4">
              <PlugZap className="w-5 h-5 text-[#4F46E5]" />

              <div>
                <h3 className="font-semibold text-base">
                  External Services & Webhooks
                </h3>

                <p className="text-xs text-[#64748B] mt-1">
                  Current integration configuration
                  status.
                </p>
              </div>
            </div>

            {[
              {
                name: "Payment Gateway",
                description:
                  "External payment processing.",
                status:
                  integrations
                    .paymentGateway
                    .configured,
              },
              {
                name: "SMS Provider",
                description:
                  "SMS notifications and messaging.",
                status:
                  integrations.sms
                    .configured,
              },
              {
                name: "Laboratory System",
                description:
                  "External laboratory result exchange.",
                status:
                  integrations
                    .laboratory
                    .configured,
              },
            ].map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between gap-4 border border-[#E2E8F0] rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                    <Key className="w-5 h-5 text-[#4F46E5]" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold">
                      {integration.name}
                    </p>

                    <p className="text-xs text-[#64748B]">
                      {integration.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${
                    integration.status
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {integration.status
                    ? "Configured"
                    : "Not configured"}
                </span>
              </div>
            ))}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 mt-0.5" />

              <p className="text-xs text-amber-800">
                Integration credentials are not exposed
                or edited from this page. They should be
                configured through secure server-side
                environment variables or dedicated
                integration management.
              </p>
            </div>
          </div>
        )}

        {/* ADD DEPARTMENT MODAL */}
        {isAddDeptModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() =>
              !isAddingDepartment &&
              setIsAddDeptModalOpen(false)
            }
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0]"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#4F46E5]">
                  <Users className="w-5 h-5" />
                </div>

                <button
                  type="button"
                  disabled={
                    isAddingDepartment
                  }
                  onClick={() =>
                    setIsAddDeptModalOpen(false)
                  }
                  className="text-[#64748B] hover:text-[#0F172A] disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold">
                  Add Clinical Department
                </h3>

                <p className="text-xs text-[#64748B] mt-1">
                  Create a new department for{" "}
                  {hospitalName}.
                </p>
              </div>

              <form
                onSubmit={
                  handleAddDepartment
                }
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Department Name
                  </label>

                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={100}
                    placeholder="e.g. Corneal Specialist Unit"
                    value={newDeptName}
                    onChange={(event) =>
                      setNewDeptName(
                        event.target.value
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    disabled={
                      isAddingDepartment
                    }
                    onClick={() =>
                      setIsAddDeptModalOpen(
                        false
                      )
                    }
                    className="px-4 py-2 rounded-lg text-sm border border-[#E2E8F0] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isAddingDepartment ||
                      !newDeptName.trim()
                    }
                    className="px-4 py-2 rounded-lg text-sm bg-[#4F46E5] text-white hover:bg-[#4338CA] font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {isAddingDepartment && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}

                    {isAddingDepartment
                      ? "Adding..."
                      : "Add Department"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE DEPARTMENT MODAL */}
        {isDeleteDeptModalOpen &&
          departmentToDelete && (
            <div
              className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={
                closeDeleteDepartmentModal
              }
            >
              <div
                className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0]"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <div className="flex justify-between items-center mb-5">
                  <div className="w-11 h-11 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                    <Trash2 className="w-5 h-5" />
                  </div>

                  <button
                    type="button"
                    disabled={
                      !!isDeletingDepartment
                    }
                    onClick={
                      closeDeleteDepartmentModal
                    }
                    className="text-[#64748B] hover:text-[#0F172A] disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    Delete Department?
                  </h3>

                  <p className="text-sm text-[#334155] mt-2">
                    You are about to delete{" "}
                    <span className="font-semibold">
                      {departmentToDelete.name}
                    </span>
                    .
                  </p>

                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />

                      <p className="text-xs leading-5 text-amber-800">
                        This action will permanently
                        remove the department from the
                        hospital department list. A
                        department with active staff
                        assigned to it should not be
                        deleted.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6">
                  <button
                    type="button"
                    disabled={
                      !!isDeletingDepartment
                    }
                    onClick={
                      closeDeleteDepartmentModal
                    }
                    className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      !!isDeletingDepartment
                    }
                    onClick={() =>
                      void handleDeleteDepartment()
                    }
                    className="px-4 py-2.5 rounded-lg text-sm bg-rose-600 text-white hover:bg-rose-700 font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    {isDeletingDepartment && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}

                    {isDeletingDepartment
                      ? "Deleting..."
                      : "Delete Department"}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* SAVE MODAL */}
        {isSaveModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() =>
              !isSaving &&
              setIsSaveModalOpen(false)
            }
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E2E8F0]"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#4F46E5]">
                  <Save className="w-5 h-5" />
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    setIsSaveModalOpen(false)
                  }
                  className="text-[#64748B] hover:text-[#0F172A] disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold">
                  Confirm Configuration Updates
                </h3>

                <p className="text-xs text-[#64748B] mt-1">
                  Save these system configuration
                  changes for {hospitalName}?
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    setIsSaveModalOpen(false)
                  }
                  className="px-4 py-2 rounded-lg text-sm border border-[#E2E8F0] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    void handleSave()
                  }
                  className="px-4 py-2 rounded-lg text-sm bg-[#4F46E5] text-white hover:bg-[#4338CA] flex items-center gap-2 disabled:opacity-50 font-medium"
                >
                  {isSaving && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  {isSaving
                    ? "Saving..."
                    : "Confirm & Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DISCARD MODAL */}
        {isDiscardModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() =>
              setIsDiscardModalOpen(false)
            }
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E2E8F0]"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsDiscardModalOpen(
                      false
                    )
                  }
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold">
                  Discard Unsaved Changes?
                </h3>

                <p className="text-xs text-[#64748B] mt-1">
                  Any changes made since the last
                  successful save will be reverted.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setIsDiscardModalOpen(
                      false
                    )
                  }
                  className="px-4 py-2 rounded-lg text-sm border border-[#E2E8F0]"
                >
                  Continue Editing
                </button>

                <button
                  type="button"
                  onClick={
                    handleDiscard
                  }
                  className="px-4 py-2 rounded-lg text-sm bg-rose-600 text-white hover:bg-rose-700 font-medium"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}