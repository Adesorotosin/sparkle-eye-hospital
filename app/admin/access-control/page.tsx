"use client";

import React, { useState } from "react";
import {
  Search,
  Shield,
  Pill,
  Stethoscope,
  DollarSign,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";

// --- Types ---
interface StaffMember {
  id: string;
  staffId: string;
  name: string;
  email: string;
  role: string;
  department: string;
  assignedFacilities: string;
  initials: string;
  roleColor: string;
  permissions: Record<string, boolean>;
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

// --- Data Definitions ---
const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "clinical",
    title: "CLINICAL EHR ACCESS",
    icon: Stethoscope,
    items: [
      { key: "view_patient_records", label: "View Patient Records" },
      { key: "edit_clinical_notes", label: "Edit Clinical Notes" },
      { key: "order_diagnostics", label: "Order Diagnostics" },
      { key: "view_lab_results", label: "View Lab Results" },
    ],
  },
  {
    id: "prescription",
    title: "PRESCRIPTION & MEDICATION",
    icon: Pill,
    items: [
      { key: "issue_prescriptions", label: "Issue Prescriptions" },
      {
        key: "controlled_substance_override",
        label: "Controlled Substance Override",
        warning: "Requires DEA authorization",
      },
      { key: "pharmacy_dispensing_approval", label: "Pharmacy Dispensing Approval" },
    ],
  },
  {
    id: "financial",
    title: "FINANCIAL & BILLING",
    icon: DollarSign,
    items: [
      { key: "view_financial_reports", label: "View Financial Reports" },
      { key: "insurance_claims_access", label: "Insurance Claims Access" },
      { key: "revenue_dashboard", label: "Revenue Dashboard" },
      { key: "approve_refunds", label: "Approve Refunds" },
    ],
  },
  {
    id: "admin",
    title: "SYSTEM ADMINISTRATION",
    icon: Shield,
    items: [
      { key: "user_account_management", label: "User Account Management" },
      {
        key: "system_configuration",
        label: "System Configuration",
        badge: "Restricted — Super Admin Only",
      },
      { key: "audit_log_access", label: "Audit Log Access" },
      {
        key: "api_key_management",
        label: "API Key Management",
        badge: "Restricted",
      },
    ],
  },
];

const INITIAL_STAFF: StaffMember[] = [
  {
    id: "1",
    staffId: "VF-2024-0142",
    name: "Dr. James Okoro",
    email: "james.okoro@visionfirst.ng",
    role: "Senior Ophthalmologist",
    department: "Ophthalmology",
    assignedFacilities: "Main Campus, OR-1, OR-2",
    initials: "JO",
    roleColor: "bg-purple-100 text-purple-700 border-purple-200",
    permissions: {
      view_patient_records: true,
      edit_clinical_notes: true,
      order_diagnostics: true,
      view_lab_results: true,
      issue_prescriptions: true,
      controlled_substance_override: false,
      pharmacy_dispensing_approval: false,
      view_financial_reports: true,
      insurance_claims_access: false,
      revenue_dashboard: false,
      approve_refunds: false,
      user_account_management: false,
      system_configuration: false,
      audit_log_access: true,
      api_key_management: false,
    },
  },
  {
    id: "2",
    staffId: "VF-2024-0098",
    name: "Dr. Amina Bello",
    email: "amina.bello@visionfirst.ng",
    role: "Retina Specialist",
    department: "Ophthalmology",
    assignedFacilities: "Main Campus, Laser Suite",
    initials: "AB",
    roleColor: "bg-purple-100 text-purple-700 border-purple-200",
    permissions: {
      view_patient_records: true,
      edit_clinical_notes: true,
      order_diagnostics: true,
      view_lab_results: true,
      issue_prescriptions: true,
      controlled_substance_override: true,
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
  },
  {
    id: "3",
    staffId: "VF-2023-0312",
    name: "Maria Lopez, RN",
    email: "maria.lopez@visionfirst.ng",
    role: "Senior Nurse",
    department: "Surgery",
    assignedFacilities: "OR-1, OR-2, Recovery",
    initials: "ML",
    roleColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    permissions: {
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
  },
  {
    id: "4",
    staffId: "VF-2024-0201",
    name: "Dr. Kevin Huang",
    email: "kevin.huang@visionfirst.ng",
    role: "Anesthetist",
    department: "Anesthesiology",
    assignedFacilities: "OR-1, OR-2",
    initials: "KH",
    roleColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
    permissions: {
      view_patient_records: true,
      edit_clinical_notes: true,
      order_diagnostics: true,
      view_lab_results: true,
      issue_prescriptions: true,
      controlled_substance_override: true,
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
  },
  {
    id: "5",
    staffId: "VF-2023-0445",
    name: "Adebayo Funmi",
    email: "adebayo.funmi@visionfirst.ng",
    role: "Lead Pharmacist",
    department: "Pharmacy",
    assignedFacilities: "Main Pharmacy, Ward Dispensary",
    initials: "AF",
    roleColor: "bg-amber-100 text-amber-700 border-amber-200",
    permissions: {
      view_patient_records: true,
      edit_clinical_notes: false,
      order_diagnostics: false,
      view_lab_results: true,
      issue_prescriptions: false,
      controlled_substance_override: true,
      pharmacy_dispensing_approval: true,
      view_financial_reports: true,
      insurance_claims_access: false,
      revenue_dashboard: false,
      approve_refunds: false,
      user_account_management: false,
      system_configuration: false,
      audit_log_access: true,
      api_key_management: false,
    },
  },
  {
    id: "6",
    staffId: "VF-2024-0389",
    name: "Sarah Ogundimu",
    email: "sarah.ogundimu@visionfirst.ng",
    role: "Front Desk Lead",
    department: "Patient Services",
    assignedFacilities: "Reception, Scheduling",
    initials: "SO",
    roleColor: "bg-pink-100 text-pink-700 border-pink-200",
    permissions: {
      view_patient_records: true,
      edit_clinical_notes: false,
      order_diagnostics: false,
      view_lab_results: false,
      issue_prescriptions: false,
      controlled_substance_override: false,
      pharmacy_dispensing_approval: false,
      view_financial_reports: true,
      insurance_claims_access: true,
      revenue_dashboard: false,
      approve_refunds: true,
      user_account_management: true,
      system_configuration: false,
      audit_log_access: true,
      api_key_management: false,
    },
  },
  {
    id: "7",
    staffId: "VF-2023-0567",
    name: "James Carter",
    email: "james.carter@visionfirst.ng",
    role: "Surgical Technician",
    department: "Surgery",
    assignedFacilities: "OR-1, OR-2",
    initials: "JC",
    roleColor: "bg-slate-100 text-slate-700 border-slate-200",
    permissions: {
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
  },
  {
    id: "8",
    staffId: "VF-2024-0412",
    name: "Ngozi Kalu",
    email: "ngozi.kalu@visionfirst.ng",
    role: "Nurse",
    department: "Ward Care",
    assignedFacilities: "Ward A, Ward B",
    initials: "NK",
    roleColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    permissions: {
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
  },
];

const TAB_FILTERS = [
  { id: "all", label: "All Staff", count: 48 },
  { id: "doctors", label: "Doctors", count: 12 },
  { id: "nurses", label: "Nurses", count: 16 },
  { id: "pharmacists", label: "Pharmacists", count: 6 },
  { id: "frontdesk", label: "Front Desk", count: 8 },
  { id: "admins", label: "Admins", count: 6 },
];

export default function AccessControlPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>("1");
  const [draftPermissions, setDraftPermissions] = useState<Record<string, boolean>>(
    INITIAL_STAFF[0].permissions
  );
  const [hasChanges, setHasChanges] = useState(false);

  const activeStaff = staffList.find((s) => s.id === selectedStaffId) || null;

  const handleSelectStaff = (member: StaffMember) => {
    setSelectedStaffId(member.id);
    setDraftPermissions({ ...member.permissions });
    setHasChanges(false);
  };

  const handleCloseDrawer = () => {
    setSelectedStaffId(null);
    setHasChanges(false);
  };

  const handleTogglePermission = (key: string) => {
    setDraftPermissions((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      setHasChanges(true);
      return updated;
    });
  };

  const handleSavePermissions = () => {
    if (!selectedStaffId) return;
    setStaffList((prev) =>
      prev.map((s) =>
        s.id === selectedStaffId ? { ...s, permissions: { ...draftPermissions } } : s
      )
    );
    setHasChanges(false);
  };

  const handleDiscardChanges = () => {
    if (activeStaff) {
      setDraftPermissions({ ...activeStaff.permissions });
      setHasChanges(false);
    }
  };

  const filteredStaff = staffList.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.staffId.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "doctors")
      return (
        matchesSearch &&
        (member.role.toLowerCase().includes("doctor") ||
          member.role.toLowerCase().includes("ophthalmologist") ||
          member.role.toLowerCase().includes("specialist") ||
          member.role.toLowerCase().includes("anesthetist"))
      );
    if (activeTab === "nurses") return matchesSearch && member.role.toLowerCase().includes("nurse");
    if (activeTab === "pharmacists") return matchesSearch && member.role.toLowerCase().includes("pharmacist");
    if (activeTab === "frontdesk") return matchesSearch && member.role.toLowerCase().includes("front desk");
    if (activeTab === "admins") return matchesSearch && member.role.toLowerCase().includes("admin");

    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Staff Directory & Access Control
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            VisionFirst Eye Hospital — Administration
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff by name, ID, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
      </header>

      {/* Primary Layout Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column: Staff Directory Table */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-slate-200">
          {/* Tab Filters */}
          <div className="flex items-center space-x-1 border-b border-slate-200 px-6 overflow-x-auto scrollbar-none">
            {TAB_FILTERS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3.5 px-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      isActive
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table View */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  <th className="py-3 px-6">Staff Member</th>
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-6">Assigned Facilities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStaff.map((member) => {
                  const isSelected = member.id === selectedStaffId;
                  return (
                    <tr
                      key={member.id}
                      onClick={() => handleSelectStaff(member)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-indigo-50/60 font-medium"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {member.initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {member.name}
                            </div>
                            <div className="text-xs text-slate-400 truncate">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {member.staffId}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${member.roleColor}`}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {member.department}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 text-xs truncate max-w-xs">
                        {member.assignedFacilities}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>
              Showing {filteredStaff.length} of {staffList.length} staff members
            </span>
          </div>
        </div>

        {/* Right Drawer Panel: Edit Access Permissions */}
        {selectedStaffId && activeStaff && (
          <div className="w-full lg:w-[420px] bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-lg lg:shadow-none">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Edit Access Permissions
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {activeStaff.name} —{" "}
                  <span className="text-slate-700 font-semibold">
                    {activeStaff.role}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Close panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body: Toggle Sections */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {PERMISSION_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-indigo-600 uppercase border-b border-slate-100 pb-1.5">
                      <GroupIcon className="h-3.5 w-3.5" />
                      <span>{group.title}</span>
                    </div>

                    <div className="space-y-3 pl-1">
                      {group.items.map((item) => {
                        const isChecked = !!draftPermissions[item.key];
                        return (
                          <div
                            key={item.key}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <div className="flex-1 pr-2">
                              <label
                                htmlFor={item.key}
                                className="font-medium text-slate-800 text-xs cursor-pointer select-none block"
                              >
                                {item.label}
                              </label>

                              {item.warning && (
                                <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5 font-medium">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  {item.warning}
                                </p>
                              )}

                              {item.badge && (
                                <p className="text-[11px] text-rose-500 font-medium mt-0.5">
                                  {item.badge}
                                </p>
                              )}
                            </div>

                            {/* Interactive Toggle Switch */}
                            <button
                              id={item.key}
                              type="button"
                              role="switch"
                              aria-checked={isChecked}
                              onClick={() => handleTogglePermission(item.key)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                                isChecked ? "bg-indigo-600" : "bg-slate-200"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  isChecked ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  disabled={!hasChanges}
                  className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                    hasChanges
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 cursor-pointer"
                      : "text-slate-300 cursor-not-allowed"
                  }`}
                >
                  Discard Changes
                </button>

                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={!hasChanges}
                  className={`text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-all flex items-center gap-1.5 ${
                    hasChanges
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-indigo-100"
                      : "bg-indigo-300 text-white cursor-not-allowed"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  Save Permissions
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center font-medium">
                Last modified: Aug 28, 2026 by Admin Sarah Ogundimu
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}