"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Shield,
  Pill,
  Stethoscope,
  DollarSign,
  X,
  Check,
  AlertTriangle,
  UserPlus,
  CheckCircle2,
  Trash2,
  UserX,
  UserCheck,
  Loader2,
} from "lucide-react";

interface StaffMember {
  id: string;
  staff_id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  department: string | null;
  assigned_facilities: string[] | string | null;
  permissions: Record<string, boolean> | null;
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
}

interface PermissionGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  items: {
    key: string;
    label: string;
    badge?: string;
    warning?: string;
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "clinical",
    title: "CLINICAL EHR ACCESS",
    icon: Stethoscope,
    items: [
      {
        key: "view_patient_records",
        label: "View Patient Records",
      },
      {
        key: "edit_clinical_notes",
        label: "Edit Clinical Notes",
      },
      {
        key: "order_diagnostics",
        label: "Order Diagnostics",
      },
      {
        key: "view_lab_results",
        label: "View Lab Results",
      },
    ],
  },
  {
    id: "prescription",
    title: "PRESCRIPTION & MEDICATION",
    icon: Pill,
    items: [
      {
        key: "issue_prescriptions",
        label: "Issue Prescriptions",
      },
      {
        key: "controlled_substance_override",
        label: "Controlled Substance Override",
        warning:
          "Requires appropriate professional authorization",
      },
      {
        key: "pharmacy_dispensing_approval",
        label: "Pharmacy Dispensing Approval",
      },
    ],
  },
  {
    id: "financial",
    title: "FINANCIAL & BILLING",
    icon: DollarSign,
    items: [
      {
        key: "view_financial_reports",
        label: "View Financial Reports",
      },
      {
        key: "insurance_claims_access",
        label: "Insurance Claims Access",
      },
      {
        key: "revenue_dashboard",
        label: "Revenue Dashboard",
      },
      {
        key: "approve_refunds",
        label: "Approve Refunds",
      },
    ],
  },
  {
    id: "admin",
    title: "SYSTEM ADMINISTRATION",
    icon: Shield,
    items: [
      {
        key: "user_account_management",
        label: "User Account Management",
      },
      {
        key: "system_configuration",
        label: "System Configuration",
        badge: "Restricted — IT Admin",
      },
      {
        key: "audit_log_access",
        label: "Audit Log Access",
      },
      {
        key: "api_key_management",
        label: "API Key Management",
        badge: "Restricted",
      },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  IT_ADMIN: "IT Administrator",
  OPHTHALMOLOGIST: "Ophthalmologist",
  DOCTOR: "Doctor",
  PHARMACIST: "Pharmacist",
  NURSE: "Nurse",
  CASHIER: "Cashier",
  RECEPTIONIST: "Receptionist",
};

const ROLE_STYLES: Record<string, string> = {
  IT_ADMIN:
    "bg-red-50 text-red-700 border-red-200",
  OPHTHALMOLOGIST:
    "bg-purple-50 text-purple-700 border-purple-200",
  DOCTOR:
    "bg-blue-50 text-blue-700 border-blue-200",
  PHARMACIST:
    "bg-green-50 text-green-700 border-green-200",
  NURSE:
    "bg-pink-50 text-pink-700 border-pink-200",
  CASHIER:
    "bg-amber-50 text-amber-700 border-amber-200",
  RECEPTIONIST:
    "bg-slate-50 text-slate-700 border-slate-200",
};

const DEFAULT_PERMISSIONS: Record<
  string,
  Record<string, boolean>
> = {
  IT_ADMIN: {
    view_patient_records: true,
    edit_clinical_notes: true,
    order_diagnostics: true,
    view_lab_results: true,
    issue_prescriptions: true,
    controlled_substance_override: false,
    pharmacy_dispensing_approval: false,
    view_financial_reports: true,
    insurance_claims_access: true,
    revenue_dashboard: true,
    approve_refunds: true,
    user_account_management: true,
    system_configuration: true,
    audit_log_access: true,
    api_key_management: true,
  },

  OPHTHALMOLOGIST: {
    view_patient_records: true,
    edit_clinical_notes: true,
    order_diagnostics: true,
    view_lab_results: true,
    issue_prescriptions: true,
    controlled_substance_override: false,
    pharmacy_dispensing_approval: false,
    view_financial_reports: false,
    insurance_claims_access: false,
    revenue_dashboard: false,
    approve_refunds: false,
    user_account_management: false,
    system_configuration: false,
    audit_log_access: false,
    api_key_management: false,
  },

  DOCTOR: {
    view_patient_records: true,
    edit_clinical_notes: true,
    order_diagnostics: true,
    view_lab_results: true,
    issue_prescriptions: true,
    controlled_substance_override: false,
    pharmacy_dispensing_approval: false,
    view_financial_reports: false,
    insurance_claims_access: false,
    revenue_dashboard: false,
    approve_refunds: false,
    user_account_management: false,
    system_configuration: false,
    audit_log_access: false,
    api_key_management: false,
  },

  PHARMACIST: {
    view_patient_records: true,
    edit_clinical_notes: false,
    order_diagnostics: false,
    view_lab_results: true,
    issue_prescriptions: false,
    controlled_substance_override: false,
    pharmacy_dispensing_approval: true,
    view_financial_reports: false,
    insurance_claims_access: false,
    revenue_dashboard: false,
    approve_refunds: false,
    user_account_management: false,
    system_configuration: false,
    audit_log_access: false,
    api_key_management: false,
  },

  NURSE: {
    view_patient_records: true,
    edit_clinical_notes: true,
    order_diagnostics: false,
    view_lab_results: true,
    issue_prescriptions: false,
    controlled_substance_override: false,
    pharmacy_dispensing_approval: false,
    view_financial_reports: false,
    insurance_claims_access: false,
    revenue_dashboard: false,
    approve_refunds: false,
    user_account_management: false,
    system_configuration: false,
    audit_log_access: false,
    api_key_management: false,
  },

  CASHIER: {
    view_patient_records: true,
    edit_clinical_notes: false,
    order_diagnostics: false,
    view_lab_results: false,
    issue_prescriptions: false,
    controlled_substance_override: false,
    pharmacy_dispensing_approval: false,
    view_financial_reports: true,
    insurance_claims_access: true,
    revenue_dashboard: true,
    approve_refunds: false,
    user_account_management: false,
    system_configuration: false,
    audit_log_access: false,
    api_key_management: false,
  },

  RECEPTIONIST: {
    view_patient_records: true,
    edit_clinical_notes: false,
    order_diagnostics: false,
    view_lab_results: false,
    issue_prescriptions: false,
    controlled_substance_override: false,
    pharmacy_dispensing_approval: false,
    view_financial_reports: false,
    insurance_claims_access: false,
    revenue_dashboard: false,
    approve_refunds: false,
    user_account_management: false,
    system_configuration: false,
    audit_log_access: false,
    api_key_management: false,
  },
};

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getRoleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

function getRoleStyle(role: string) {
  return (
    ROLE_STYLES[role] ??
    "bg-slate-50 text-slate-700 border-slate-200"
  );
}

function getFacilitiesText(
  facilities: StaffMember["assigned_facilities"]
) {
  if (!facilities) {
    return "Not assigned";
  }

  if (Array.isArray(facilities)) {
    return facilities.length > 0
      ? facilities.join(", ")
      : "Not assigned";
  }

  return facilities || "Not assigned";
}

function getPermissionsForStaff(
  staff: StaffMember | null
) {
  if (!staff) {
    return {};
  }

  return {
    ...(DEFAULT_PERMISSIONS[staff.role] ?? {}),
    ...(staff.permissions ?? {}),
  };
}

export default function AccessControlPage() {
  const [staffList, setStaffList] = useState<
    StaffMember[]
  >([]);

  const [selectedStaffId, setSelectedStaffId] =
    useState<string | null>(null);

  const [draftPermissions, setDraftPermissions] =
    useState<Record<string, boolean>>({});

  const [searchTerm, setSearchTerm] =
    useState("");

  const [showInactive, setShowInactive] =
    useState(false);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [notification, setNotification] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [processingStaffId, setProcessingStaffId] =
    useState<string | null>(null);

  const selectedStaff = useMemo(
    () =>
      staffList.find(
        (staff) =>
          staff.id === selectedStaffId
      ) ?? null,
    [staffList, selectedStaffId]
  );

  const filteredStaff = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    return staffList.filter((staff) => {
      if (
        !showInactive &&
        (!staff.is_active || staff.deleted_at)
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        staff.name,
        staff.email,
        staff.username,
        staff.staff_id,
        staff.role,
        staff.department ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [
    staffList,
    searchTerm,
    showInactive,
  ]);

  const activeCount = staffList.filter(
    (staff) =>
      staff.is_active &&
      !staff.deleted_at
  ).length;

  const inactiveCount =
    staffList.length - activeCount;

  async function loadStaff() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/staff",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load staff directory."
        );
      }

      const staff: StaffMember[] =
        Array.isArray(data?.staff)
          ? data.staff
          : [];

      setStaffList(staff);

      if (staff.length > 0) {
        const firstActive =
          staff.find(
            (member) =>
              member.is_active &&
              !member.deleted_at
          ) ?? staff[0];

        setSelectedStaffId(
          firstActive.id
        );
      } else {
        setSelectedStaffId(null);
      }
    } catch (error) {
      console.error(
        "Failed to load staff:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load staff directory."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStaff();
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      setDraftPermissions(
        getPermissionsForStaff(
          selectedStaff
        )
      );
    } else {
      setDraftPermissions({});
    }
  }, [selectedStaff]);

  function togglePermission(
    key: string
  ) {
    setDraftPermissions((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }

  async function handleSaveChanges() {
    if (!selectedStaff) {
      return;
    }

    setSaving(true);
    setNotification(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/staff/${selectedStaff.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            permissions:
              draftPermissions,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to save permissions."
        );
      }

      if (!data?.staff) {
        throw new Error(
          "The server did not return the updated staff record."
        );
      }

      setStaffList((previous) =>
        previous.map((staff) =>
          staff.id === selectedStaff.id
            ? data.staff
            : staff
        )
      );

      setNotification(
        "Permissions saved successfully."
      );
    } catch (error) {
      console.error(
        "Permission update failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save permissions."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(
    member: StaffMember
  ) {
    setProcessingStaffId(member.id);
    setNotification(null);
    setErrorMessage(null);

    try {
      const nextStatus =
        !member.is_active;

      const response = await fetch(
        `/api/staff/${member.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            isActive: nextStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to update staff status."
        );
      }

      if (!data?.staff) {
        throw new Error(
          "The server did not return the updated staff record."
        );
      }

      setStaffList((previous) =>
        previous.map((staff) =>
          staff.id === member.id
            ? data.staff
            : staff
        )
      );

      setNotification(
        nextStatus
          ? `${member.name} has been reactivated.`
          : `${member.name} has been suspended.`
      );
    } catch (error) {
      console.error(
        "Staff status update failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to update staff status."
      );
    } finally {
      setProcessingStaffId(null);
    }
  }

  async function handleDeleteStaff() {
    if (!selectedStaff) {
      return;
    }

    const deletedStaffId =
      selectedStaff.id;

    const deletedStaffName =
      selectedStaff.name;

    setProcessingStaffId(
      deletedStaffId
    );

    setNotification(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/staff/${deletedStaffId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to deactivate staff member."
        );
      }

      if (!data?.staff) {
        throw new Error(
          "The server did not return the updated staff record."
        );
      }

      setStaffList((previous) =>
        previous.map((staff) =>
          staff.id === deletedStaffId
            ? data.staff
            : staff
        )
      );

      setShowDeleteModal(false);

      const nextStaff = staffList.find(
        (staff) =>
          staff.id !== deletedStaffId &&
          staff.is_active &&
          !staff.deleted_at
      );

      setSelectedStaffId(
        nextStaff?.id ?? null
      );

      setNotification(
        `${deletedStaffName} has been deactivated.`
      );
    } catch (error) {
      console.error(
        "Staff deletion failed:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to deactivate staff member."
      );
    } finally {
      setProcessingStaffId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-12">
      {/* HEADER */}
      <header className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Staff & Access Control
              </h1>

              <p className="text-sm text-[#64748B] mt-1">
                Manage staff accounts, account status,
                and application permissions.
              </p>
            </div>

            <a
              href="/admin/access-control/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Staff Member
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-6">
        {/* NOTIFICATIONS */}
        {notification && (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="w-5 h-5 shrink-0" />

            <span>{notification}</span>

            <button
              type="button"
              onClick={() =>
                setNotification(null)
              }
              className="ml-auto"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />

            <span>{errorMessage}</span>

            <button
              type="button"
              onClick={() =>
                setErrorMessage(null)
              }
              className="ml-auto"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              Total Staff
            </p>

            <p className="text-2xl font-bold mt-2">
              {staffList.length}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              Active
            </p>

            <p className="text-2xl font-bold text-green-700 mt-2">
              {activeCount}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              Inactive
            </p>

            <p className="text-2xl font-bold text-slate-500 mt-2">
              {inactiveCount}
            </p>
          </div>
        </div>

        {/* SEARCH / FILTER */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search by name, email, username, staff ID or role..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm outline-none focus:ring-2 focus:ring-[#4F46E5]"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-[#475569] cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(event) =>
                  setShowInactive(
                    event.target.checked
                  )
                }
                className="w-4 h-4 accent-[#4F46E5]"
              />

              Show inactive staff
            </label>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm min-h-[300px] flex items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-[#64748B]">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading staff directory...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* STAFF DIRECTORY */}
            <section className="xl:col-span-2 bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E2E8F0]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">
                      Staff Directory
                    </h2>

                    <p className="text-xs text-[#64748B] mt-1">
                      {filteredStaff.length} staff member
                      {filteredStaff.length === 1
                        ? ""
                        : "s"}{" "}
                      shown
                    </p>
                  </div>

                  <Shield className="w-5 h-5 text-[#4F46E5]" />
                </div>
              </div>

              <div className="divide-y divide-[#E2E8F0]">
                {filteredStaff.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm font-medium text-[#334155]">
                      No staff members found.
                    </p>

                    <p className="text-xs text-[#64748B] mt-1">
                      Try changing your search or
                      inactive filter.
                    </p>
                  </div>
                ) : (
                  filteredStaff.map(
                    (member) => {
                      const isSelected =
                        member.id ===
                        selectedStaffId;

                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() =>
                            setSelectedStaffId(
                              member.id
                            )
                          }
                          className={`w-full text-left p-4 transition-colors ${
                            isSelected
                              ? "bg-indigo-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                                isSelected
                                  ? "bg-[#4F46E5] text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {getInitials(
                                member.name
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm truncate">
                                    {member.name}
                                  </p>

                                  <p className="text-xs text-[#64748B] truncate mt-0.5">
                                    {member.email}
                                  </p>
                                </div>

                                <span
                                  className={`shrink-0 px-2 py-1 rounded-full border text-[10px] font-semibold ${getRoleStyle(
                                    member.role
                                  )}`}
                                >
                                  {getRoleLabel(
                                    member.role
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[11px] text-[#64748B]">
                                  {member.staff_id}
                                </span>

                                <span className="text-[#CBD5E1]">
                                  •
                                </span>

                                <span
                                  className={`text-[11px] font-medium ${
                                    member.is_active &&
                                    !member.deleted_at
                                      ? "text-green-600"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {member.is_active &&
                                  !member.deleted_at
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    }
                  )
                )}
              </div>
            </section>

            {/* DETAILS / PERMISSIONS */}
            <section className="xl:col-span-3">
              {!selectedStaff ? (
                <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm min-h-[400px] flex items-center justify-center">
                  <div className="text-center px-6">
                    <Shield className="w-10 h-10 mx-auto text-slate-300 mb-3" />

                    <p className="font-semibold text-slate-700">
                      Select a staff member
                    </p>

                    <p className="text-sm text-slate-500 mt-1">
                      Choose a staff account from the
                      directory to manage its permissions.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* PROFILE */}
                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-indigo-100 text-[#4F46E5] flex items-center justify-center font-bold">
                          {getInitials(
                            selectedStaff.name
                          )}
                        </div>

                        <div>
                          <h2 className="text-lg font-bold">
                            {selectedStaff.name}
                          </h2>

                          <p className="text-sm text-[#64748B]">
                            {selectedStaff.title ||
                              getRoleLabel(
                                selectedStaff.role
                              )}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span
                              className={`px-2 py-1 rounded-full border text-[10px] font-semibold ${getRoleStyle(
                                selectedStaff.role
                              )}`}
                            >
                              {getRoleLabel(
                                selectedStaff.role
                              )}
                            </span>

                            <span className="text-xs text-[#64748B]">
                              {selectedStaff.staff_id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                          selectedStaff.is_active &&
                          !selectedStaff.deleted_at
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            selectedStaff.is_active &&
                            !selectedStaff.deleted_at
                              ? "bg-green-500"
                              : "bg-slate-400"
                          }`}
                        />

                        {selectedStaff.is_active &&
                        !selectedStaff.deleted_at
                          ? "Active"
                          : "Inactive"}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-[#E2E8F0]">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-[#94A3B8]">
                          Username
                        </p>

                        <p className="text-sm mt-1">
                          {selectedStaff.username}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-[#94A3B8]">
                          Department
                        </p>

                        <p className="text-sm mt-1">
                          {selectedStaff.department ||
                            "Not specified"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-[#94A3B8]">
                          Email
                        </p>

                        <p className="text-sm mt-1 break-all">
                          {selectedStaff.email}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-[#94A3B8]">
                          Facilities
                        </p>

                        <p className="text-sm mt-1">
                          {getFacilitiesText(
                            selectedStaff.assigned_facilities
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* PERMISSIONS */}
                  <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#E2E8F0]">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h2 className="font-semibold">
                            Permissions
                          </h2>

                          <p className="text-xs text-[#64748B] mt-1">
                            These permissions are stored with
                            the staff account.
                          </p>
                        </div>

                        <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1">
                          Server authorization still applies
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-5">
                      {PERMISSION_GROUPS.map(
                        (group) => {
                          const Icon =
                            group.icon;

                          return (
                            <div
                              key={group.id}
                              className="border border-[#E2E8F0] rounded-xl overflow-hidden"
                            >
                              <div className="px-4 py-3 bg-slate-50 border-b border-[#E2E8F0] flex items-center gap-2">
                                <Icon className="w-4 h-4 text-[#4F46E5]" />

                                <h3 className="text-xs font-bold tracking-wide text-[#334155]">
                                  {group.title}
                                </h3>
                              </div>

                              <div className="divide-y divide-[#E2E8F0]">
                                {group.items.map(
                                  (item) => (
                                    <label
                                      key={
                                        item.key
                                      }
                                      className="flex items-start gap-3 p-4 cursor-pointer hover:bg-slate-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={Boolean(
                                          draftPermissions[
                                            item.key
                                          ]
                                        )}
                                        onChange={() =>
                                          togglePermission(
                                            item.key
                                          )
                                        }
                                        className="mt-0.5 w-4 h-4 accent-[#4F46E5]"
                                      />

                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-sm font-medium">
                                            {
                                              item.label
                                            }
                                          </span>

                                          {item.badge && (
                                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                              {
                                                item.badge
                                              }
                                            </span>
                                          )}
                                        </div>

                                        {item.warning && (
                                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-600">
                                            <AlertTriangle className="w-3.5 h-3.5" />

                                            {
                                              item.warning
                                            }
                                          </div>
                                        )}
                                      </div>
                                    </label>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    <div className="px-5 py-4 border-t border-[#E2E8F0] bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="text-xs text-[#64748B]">
                        Changes are saved to the staff
                        record and recorded in the admin
                        activity log.
                      </p>

                      <button
                        type="button"
                        onClick={
                          handleSaveChanges
                        }
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}

                        {saving
                          ? "Saving..."
                          : "Save Permissions"}
                      </button>
                    </div>
                  </div>

                  {/* ACCOUNT ACTIONS */}
                  <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
                    <h2 className="font-semibold">
                      Account Actions
                    </h2>

                    <p className="text-xs text-[#64748B] mt-1 mb-5">
                      These actions affect the actual staff
                      account on the server.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleStatus(
                            selectedStaff
                          )
                        }
                        disabled={
                          processingStaffId ===
                          selectedStaff.id
                        }
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-60 ${
                          selectedStaff.is_active
                            ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        }`}
                      >
                        {processingStaffId ===
                        selectedStaff.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : selectedStaff.is_active ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}

                        {selectedStaff.is_active
                          ? "Suspend Account"
                          : "Reactivate Account"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setShowDeleteModal(
                            true
                          )
                        }
                        disabled={
                          processingStaffId ===
                          selectedStaff.id
                        }
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-sm font-semibold transition-colors disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />
                        Deactivate Staff
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* DELETE CONFIRMATION */}
      {showDeleteModal &&
        selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close confirmation"
              onClick={() =>
                setShowDeleteModal(false)
              }
              className="absolute inset-0 bg-slate-900/40"
            />

            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-[#E2E8F0] p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>

                <div>
                  <h2 className="font-bold text-lg">
                    Deactivate staff member?
                  </h2>

                  <p className="text-sm text-[#64748B] mt-2">
                    This will deactivate{" "}
                    <strong>
                      {selectedStaff.name}
                    </strong>{" "}
                    and mark the account as deleted.
                    The database record will not be
                    physically removed.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteModal(
                      false
                    )
                  }
                  className="px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleDeleteStaff
                  }
                  disabled={
                    processingStaffId ===
                    selectedStaff.id
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold"
                >
                  {processingStaffId ===
                    selectedStaff.id && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}

                  Deactivate Staff
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}