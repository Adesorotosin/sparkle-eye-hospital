"use client";

import React, { useMemo, useState } from "react";
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
  CheckCircle2,
  Circle,
  Stethoscope,
  HeartPulse,
  CreditCard,
  Calendar,
  Pill,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";

type StaffRole =
  | "IT_ADMIN"
  | "OPHTHALMOLOGIST"
  | "DOCTOR"
  | "PHARMACIST"
  | "NURSE"
  | "CASHIER"
  | "RECEPTIONIST";

type PermissionState =
  | "view_patient_records"
  | "edit_clinical_notes"
  | "order_diagnostics"
  | "view_lab_results"
  | "issue_prescriptions"
  | "controlled_substance_override"
  | "pharmacy_dispensing_approval"
  | "view_financial_reports"
  | "insurance_claims_access"
  | "revenue_dashboard"
  | "approve_refunds"
  | "user_account_management"
  | "system_configuration"
  | "audit_log_access"
  | "api_key_management";

const ROLE_LABELS: Record<StaffRole, string> = {
  IT_ADMIN: "IT Administrator",
  OPHTHALMOLOGIST: "Ophthalmologist",
  DOCTOR: "Doctor",
  PHARMACIST: "Pharmacist",
  NURSE: "Nurse",
  CASHIER: "Cashier",
  RECEPTIONIST: "Receptionist",
};

const ROLE_DEFAULTS: Record<StaffRole, Record<string, boolean>> = {
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

type PermissionKey = string;

type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  badge?: string;
  warning?: string;
};

type PermissionGroup = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: PermissionDefinition[];
};

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
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
        warning: "Requires appropriate professional authorization",
      },
      {
        key: "pharmacy_dispensing_approval",
        label: "Pharmacy Dispensing Approval",
      },
    ],
  },
  {
    title: "FINANCIAL & BILLING",
    icon: CreditCard,
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

function generateStaffId() {
  const random =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint32Array(1))[0] % 10000
      : Math.floor(Math.random() * 10000);

  return `STAFF-${new Date().getFullYear()}-${String(random).padStart(
    4,
    "0"
  )}`;
}

function generateTemporaryPassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

  const values =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint32Array(16))
      : null;

  let password = "";

  for (let i = 0; i < 16; i += 1) {
    const index = values
      ? values[i] % chars.length
      : Math.floor(Math.random() * chars.length);

    password += chars[index];
  }

  return password;
}

function createPermissions(role: StaffRole): Record<string, boolean> {
  return {
    ...ROLE_DEFAULTS[role],
  };
}

export default function OnboardStaffPage() {
  const [selectedRole, setSelectedRole] = useState<StaffRole>("DOCTOR");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [department, setDepartment] = useState("Ophthalmology");
  const [title, setTitle] = useState("Doctor");
  const [staffId, setStaffId] = useState(() => generateStaffId());
  const [professionalLicense, setProfessionalLicense] = useState("");
  const [assignedFacilities, setAssignedFacilities] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState(() =>
    generateTemporaryPassword()
  );

  const [permissions, setPermissions] = useState<Record<string, boolean>>(() =>
    createPermissions("DOCTOR")
  );

  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createdStaff, setCreatedStaff] = useState<{
    staffId: string;
    username: string;
    name: string;
  } | null>(null);

  const fullName = useMemo(
    () => `${firstName} ${lastName}`.trim(),
    [firstName, lastName]
  );

  const completedSteps = [
    Boolean(
      firstName.trim() && lastName.trim() && email.trim() && username.trim()
    ),
    Boolean(department),
    Boolean(selectedRole),
    Boolean(temporaryPassword),
  ].filter(Boolean).length;

  function handleRoleChange(role: StaffRole) {
    setSelectedRole(role);
    setPermissions(createPermissions(role));

    const roleTitle = ROLE_LABELS[role];
    setTitle(roleTitle);

    const departmentByRole: Record<StaffRole, string> = {
      IT_ADMIN: "Information Technology",
      OPHTHALMOLOGIST: "Ophthalmology",
      DOCTOR: "Clinical Services",
      PHARMACIST: "Pharmacy",
      NURSE: "Nursing & Triage",
      CASHIER: "Billing & Cashier",
      RECEPTIONIST: "Reception & Front Desk",
    };

    setDepartment(departmentByRole[role]);
  }

  function togglePermission(key: string) {
    setPermissions((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMessage("Unable to copy the temporary password.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setCreatedStaff(null);

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanFirstName || !cleanLastName || !cleanEmail || !cleanUsername) {
      setErrorMessage(
        "Please complete the required personal and account fields."
      );
      setSubmitting(false);
      return;
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMessage("Please enter a valid work email address.");
      setSubmitting(false);
      return;
    }

    if (temporaryPassword.length < 8) {
      setErrorMessage(
        "The temporary password must contain at least 8 characters."
      );
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          staffId: staffId.trim(),
          username: cleanUsername,
          password: temporaryPassword,
          name: `${cleanFirstName} ${cleanLastName}`.trim(),
          email: cleanEmail,
          role: selectedRole,
          title: title.trim() || ROLE_LABELS[selectedRole],
          department: department.trim() || null,
          assignedFacilities: assignedFacilities
            .split(",")
            .map((facility) => facility.trim())
            .filter(Boolean),
          permissions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create staff account.");
      }

      const created = data?.staff;

      setCreatedStaff({
        staffId: created?.staff_id ?? staffId,
        username: created?.username ?? cleanUsername,
        name: created?.name ?? fullName,
      });

      setSuccessMessage("Staff account created successfully.");

      // Reset form after successful submission
      setStaffId(generateStaffId());
      setTemporaryPassword(generateTemporaryPassword());
      setFirstName("");
      setLastName("");
      setEmail("");
      setUsername("");
      setProfessionalLicense("");
      setAssignedFacilities("");
      setPermissions(createPermissions(selectedRole));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to create staff account."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans pb-12">
      {/* TOP NAVIGATION */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#4F46E5] rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>

            <div>
              <h1 className="font-bold text-base leading-tight">Sparkle Eye</h1>
              <p className="text-[10px] tracking-wider text-[#64748B] uppercase font-medium">
                Specialist Hospital
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-6">
        <Link
          href="/admin/access-control"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Staff Directory
        </Link>

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Onboard New Staff Member
            </h2>

            <p className="text-sm text-[#64748B] mt-1">
              Create a real staff account and assign its initial application
              permissions.
            </p>
          </div>

          <Link
            href="/admin/access-control"
            className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-medium bg-white hover:bg-[#F8FAFC] shadow-sm"
          >
            Cancel
          </Link>
        </div>

        {/* ALERTS */}
        {errorMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />

            <span className="flex-1">{errorMessage}</span>

            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-800">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />

              <div>
                <p className="font-semibold">{successMessage}</p>

                {createdStaff && (
                  <div className="mt-2 text-xs space-y-1">
                    <p>
                      Staff ID: <strong>{createdStaff.staffId}</strong>
                    </p>

                    <p>
                      Username: <strong>{createdStaff.username}</strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* PERSONAL DETAILS */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-[#4F46E5]" />

                <h3 className="font-semibold text-base">
                  Personal Details & Credentials
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    First Name *
                  </label>

                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    type="text"
                    required
                    autoComplete="given-name"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Last Name *
                  </label>

                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    type="text"
                    required
                    autoComplete="family-name"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    placeholder="Enter last name"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5">
                    Official Work Email *
                  </label>

                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    placeholder="name@sparkleeye.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Username *
                  </label>

                  <input
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value.toLowerCase().replace(/\s+/g, "")
                      )
                    }
                    type="text"
                    required
                    autoComplete="username"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    placeholder="e.g. ada.okonkwo"
                  />

                  <p className="text-[11px] text-[#64748B] mt-1">
                    This username will be used during login.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Staff ID *
                  </label>

                  <input
                    value={staffId}
                    onChange={(event) => setStaffId(event.target.value)}
                    type="text"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />

                  <p className="text-[11px] text-[#64748B] mt-1">
                    Generated automatically, but editable before submission.
                  </p>
                </div>
              </div>
            </div>

            {/* PROFESSIONAL */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5 text-[#4F46E5]" />

                <h3 className="font-semibold text-base">
                  Professional Information
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Department *
                  </label>

                  <select
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  >
                    <option>Information Technology</option>
                    <option>Ophthalmology</option>
                    <option>Clinical Services</option>
                    <option>Nursing & Triage</option>
                    <option>Pharmacy</option>
                    <option>Billing & Cashier</option>
                    <option>Reception & Front Desk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Job Title
                  </label>

                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    placeholder="e.g. Senior Nurse"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5">
                    Professional License Number
                  </label>

                  <input
                    value={professionalLicense}
                    onChange={(event) =>
                      setProfessionalLicense(event.target.value)
                    }
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    placeholder="Optional — stored for future regulatory records"
                  />

                  <p className="text-[11px] text-[#64748B] mt-1">
                    This field is collected by the UI but is not currently
                    persisted because the staff table/API does not expose a
                    license-number field.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5">
                    Assigned Facilities
                  </label>

                  <input
                    value={assignedFacilities}
                    onChange={(event) =>
                      setAssignedFacilities(event.target.value)
                    }
                    type="text"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    placeholder="Main Campus, Eye Clinic"
                  />

                  <p className="text-[11px] text-[#64748B] mt-1">
                    Separate multiple facilities with commas.
                  </p>
                </div>
              </div>
            </div>

            {/* ROLE */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-[#4F46E5]" />

                <h3 className="font-semibold text-base">
                  Role & Security Permissions
                </h3>
              </div>

              <label className="block text-xs font-semibold mb-3">Role</label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    [
                      "OPHTHALMOLOGIST",
                      Stethoscope,
                      "Clinical ophthalmology access",
                    ],
                    ["DOCTOR", Stethoscope, "Clinical and prescription access"],
                    ["PHARMACIST", Pill, "Pharmacy and dispensing access"],
                    ["NURSE", HeartPulse, "Nursing and triage access"],
                    ["CASHIER", CreditCard, "Billing and payment access"],
                    [
                      "RECEPTIONIST",
                      Calendar,
                      "Registration and scheduling access",
                    ],
                    ["IT_ADMIN", Shield, "System administration access"],
                  ] as const
                ).map(([role, Icon, description]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleChange(role)}
                    className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${
                      selectedRole === role
                        ? "border-[#4F46E5] bg-[#EEF2FF]/40"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                        selectedRole === role
                          ? "border-[#4F46E5] bg-[#4F46E5]"
                          : "border-[#CBD5E1]"
                      }`}
                    >
                      {selectedRole === role && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-[#4F46E5]" />

                        <p className="text-sm font-bold">
                          {ROLE_LABELS[role]}
                        </p>
                      </div>

                      <p className="text-xs text-[#64748B] mt-0.5">
                        {description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
                <label className="block text-xs font-semibold mb-3">
                  Permission Overrides
                </label>

                <div className="space-y-3">
                  {PERMISSION_GROUPS.map((group) => {
                    const Icon = group.icon;

                    return (
                      <div
                        key={group.title}
                        className="border border-[#E2E8F0] rounded-xl overflow-hidden"
                      >
                        <div className="px-4 py-3 bg-slate-50 border-b border-[#E2E8F0] flex items-center gap-2">
                          <Icon className="w-4 h-4 text-[#4F46E5]" />

                          <span className="text-xs font-bold tracking-wide">
                            {group.title}
                          </span>
                        </div>

                        <div className="divide-y divide-[#E2E8F0]">
                          {group.items.map((item) => (
                            <label
                              key={item.key}
                              className="flex items-start gap-3 p-3.5 cursor-pointer hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(permissions[item.key])}
                                onChange={() => togglePermission(item.key)}
                                className="mt-0.5 w-4 h-4 accent-[#4F46E5]"
                              />

                              <div>
                                <span className="text-xs font-medium">
                                  {item.label}
                                </span>

                                {item.warning && (
                                  <p className="text-[11px] text-amber-600 mt-1">
                                    {item.warning}
                                  </p>
                                )}

                                {item.badge && (
                                  <span className="block w-fit mt-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[11px] text-[#64748B] mt-4">
                  These permissions are stored with the account, but server-side
                  role authorization remains the actual security boundary.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* ACCOUNT SECURITY */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Lock className="w-5 h-5 text-[#4F46E5]" />

                <h3 className="font-semibold text-base">Account Security</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Temporary Password *
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={temporaryPassword}
                    onChange={(event) =>
                      setTemporaryPassword(event.target.value)
                    }
                    required
                    className="w-full px-3.5 py-2.5 pr-11 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />

                  <button
                    type="button"
                    onClick={copyPassword}
                    className="absolute right-3 top-3 text-[#64748B] hover:text-[#0F172A]"
                    title="Copy temporary password"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-[#64748B] mt-1">
                  The password is hashed by the server before it is stored.
                </p>
              </div>

              <div className="mt-5 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />

                  <p className="text-[11px] text-amber-800">
                    Give the temporary password to the staff member through an
                    appropriate secure channel. Do not put passwords in activity
                    logs or emails.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-[#E2E8F0]">
                <p className="text-xs font-semibold">
                  Security controls currently supported
                </p>

                <div className="space-y-2.5 mt-3 text-xs">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Database-backed session authentication
                  </div>

                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Server-side role authorization
                  </div>

                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-4 h-4" />
                    Bcrypt password hashing
                  </div>
                </div>

                <p className="text-[11px] text-[#64748B] mt-3">
                  2FA, IP restrictions, and account expiry are intentionally not
                  presented as active controls because they are not yet
                  persisted by the current backend.
                </p>
              </div>
            </div>

            {/* CHECKLIST */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <ClipboardList className="w-5 h-5 text-[#4F46E5]" />

                <h3 className="font-semibold text-base">
                  Onboarding Checklist
                </h3>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span>Form Completion</span>

                  <span className="text-[#4F46E5]">
                    {completedSteps} of 4
                  </span>
                </div>

                <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4F46E5] rounded-full transition-all"
                    style={{
                      width: `${(completedSteps / 4) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3.5 text-xs font-medium">
                <div
                  className={`flex items-center gap-2.5 ${
                    firstName && lastName && email && username
                      ? "text-[#0F172A]"
                      : "text-[#64748B]"
                  }`}
                >
                  {firstName && lastName && email && username ? (
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#CBD5E1]" />
                  )}

                  <span>Personal details completed</span>
                </div>

                <div className="flex items-center gap-2.5 text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span>Department assigned</span>
                </div>

                <div className="flex items-center gap-2.5 text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span>Role permissions configured</span>
                </div>

                <div className="flex items-center gap-2.5 text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span>Security credentials generated</span>
                </div>

                <div className="flex items-center gap-2.5 text-[#64748B]">
                  <Circle className="w-4 h-4 text-[#CBD5E1]" />
                  <span>Account creation pending</span>
                </div>
              </div>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-5 py-3 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Staff Account...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Create Staff Account
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}