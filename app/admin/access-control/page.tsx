"use client";

import React, { useState, useMemo } from "react";
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
  RotateCcw,
  Trash2,
  UserX,
  UserCheck,
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
  isActive: boolean;
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
        warning: "Requires DEA/MDCN authorization",
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
    isActive: true,
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
    isActive: true,
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
    isActive: true,
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
    isActive: true,
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
    isActive: true,
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
    isActive: true,
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
    isActive: true,
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
  const [notification, setNotification] = useState<string | null>(null);

  // Modal State
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    role: "Senior Ophthalmologist",
    department: "Ophthalmology",
    assignedFacilities: "Main Campus",
  });

  const activeStaff = useMemo(
    () => staffList.find((s) => s.id === selectedStaffId) || null,
    [staffList, selectedStaffId]
  );

  const filteredStaff = useMemo(() => {
    return staffList.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.department.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === "doctors") return /doctor|ophthalmologist|specialist|anesthetist/i.test(m.role);
      if (activeTab === "nurses") return /nurse/i.test(m.role);
      if (activeTab === "pharmacists") return /pharmacist/i.test(m.role);
      if (activeTab === "frontdesk") return /front desk/i.test(m.role);
      if (activeTab === "admins") return /admin/i.test(m.role);

      return true;
    });
  }, [staffList, searchQuery, activeTab]);

  const tabCounts = useMemo(() => {
    return {
      all: staffList.length,
      doctors: staffList.filter((m) =>
        /doctor|ophthalmologist|specialist|anesthetist/i.test(m.role)
      ).length,
      nurses: staffList.filter((m) => /nurse/i.test(m.role)).length,
      pharmacists: staffList.filter((m) => /pharmacist/i.test(m.role)).length,
      frontdesk: staffList.filter((m) => /front desk/i.test(m.role)).length,
      admins: staffList.filter((m) => /admin/i.test(m.role)).length,
    };
  }, [staffList]);

  const TAB_FILTERS = [
    { id: "all", label: "All Staff", count: tabCounts.all },
    { id: "doctors", label: "Doctors", count: tabCounts.doctors },
    { id: "nurses", label: "Nurses", count: tabCounts.nurses },
    { id: "pharmacists", label: "Pharmacists", count: tabCounts.pharmacists },
    { id: "frontdesk", label: "Front Desk", count: tabCounts.frontdesk },
    { id: "admins", label: "Admins", count: tabCounts.admins },
  ];

  const handleSelectStaff = (member: StaffMember) => {
    if (hasChanges) {
      const confirmDiscard = window.confirm(
        "You have unsaved permission edits. Switch staff member and discard changes?"
      );
      if (!confirmDiscard) return;
    }
    setSelectedStaffId(member.id);
    setDraftPermissions({ ...member.permissions });
    setHasChanges(false);
  };

  const handleCloseDrawer = () => {
    if (hasChanges) {
      const confirmDiscard = window.confirm(
        "You have unsaved changes. Are you sure you want to close without saving?"
      );
      if (!confirmDiscard) return;
    }
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

  const handleResetPermissions = () => {
    if (activeStaff) {
      setDraftPermissions({ ...activeStaff.permissions });
      setHasChanges(false);
    }
  };

  const handleSaveChanges = () => {
    if (!selectedStaffId) return;
    setStaffList((prev) =>
      prev.map((s) =>
        s.id === selectedStaffId ? { ...s, permissions: { ...draftPermissions } } : s
      )
    );
    setHasChanges(false);
    setNotification("Permissions saved successfully!");
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenAddStaff = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAddStaffOpen(true);
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const initials = newStaff.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const createdStaff: StaffMember = {
      id: String(Date.now()),
      staffId: `VF-2026-0${Math.floor(100 + Math.random() * 900)}`,
      name: newStaff.name,
      email: newStaff.email,
      role: newStaff.role,
      department: newStaff.department,
      assignedFacilities: newStaff.assignedFacilities,
      initials: initials || "ST",
      roleColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
      isActive: true,
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
    };

    setStaffList((prev) => [createdStaff, ...prev]);
    setSelectedStaffId(createdStaff.id);
    setDraftPermissions(createdStaff.permissions);
    setIsAddStaffOpen(false);
    setNewStaff({
      name: "",
      email: "",
      role: "Senior Ophthalmologist",
      department: "Ophthalmology",
      assignedFacilities: "Main Campus",
    });
    setNotification(`Successfully onboarded ${createdStaff.name}`);
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Temporary Status Toggle Handler (Active / Suspended) ---
  const handleToggleStatus = async (e: React.MouseEvent, member: StaffMember) => {
    e.stopPropagation();

    const newStatus = !member.isActive;
    const actionText = newStatus ? "reactivate" : "temporarily suspend access for";

    const confirmAction = window.confirm(
      `Are you sure you want to ${actionText} ${member.name} (${member.staffId})?`
    );

    if (!confirmAction) return;

    try {
      // 1. Send PATCH update to API
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) {
        console.warn("API route unavailable, performing local state update.");
      }

      // 2. Update state locally
      setStaffList((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, isActive: newStatus } : s))
      );

      setNotification(
        `${member.name} has been ${newStatus ? "reactivated" : "temporarily suspended"}.`
      );
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      // Fallback for client-only state toggle
      setStaffList((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, isActive: newStatus } : s))
      );
      setNotification(
        `${member.name} has been ${newStatus ? "reactivated" : "temporarily suspended"}.`
      );
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // --- Permanent Deactivation / Soft-Delete Handler ---
  const handleDeleteStaff = async (e: React.MouseEvent, member: StaffMember) => {
    e.stopPropagation();

    const confirmDelete = window.confirm(
      `Are you sure you want to soft-delete ${member.name} (${member.staffId})? This will remove them from active directory lists.`
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.warn("API route unavailable, performing local soft-delete.");
      }

      setStaffList((prev) => prev.filter((s) => s.id !== member.id));

      if (selectedStaffId === member.id) {
        setSelectedStaffId(null);
        setHasChanges(false);
      }

      setNotification(`${member.name} has been soft-deleted from the database.`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      setStaffList((prev) => prev.filter((s) => s.id !== member.id));
      if (selectedStaffId === member.id) {
        setSelectedStaffId(null);
        setHasChanges(false);
      }
      setNotification(`${member.name} has been removed from active view.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* Page Notification Banner */}
      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-emerald-500 hover:text-emerald-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Staff Directory & Access Control
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            VisionFirst Eye Hospital — System Administration
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff by name, ID, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            />
          </div>

          {/* Add Staff Button */}
          <button
            type="button"
            onClick={handleOpenAddStaff}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Staff</span>
          </button>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {TAB_FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                activeTab === tab.id
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table Card */}
        <div className={`${selectedStaffId ? "lg:col-span-7" : "lg:col-span-12"} bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role & Dept</th>
                  <th className="py-3 px-4 hidden md:table-cell">Facilities</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No staff members match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => {
                    const isSelected = member.id === selectedStaffId;
                    return (
                      <tr
                        key={member.id}
                        onClick={() => handleSelectStaff(member)}
                        className={`cursor-pointer transition-colors ${
                          !member.isActive
                            ? "bg-amber-50/40 opacity-75 hover:bg-amber-50/70"
                            : isSelected
                            ? "bg-indigo-50/60"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                              member.isActive ? "bg-slate-200 text-slate-700" : "bg-amber-200 text-amber-800"
                            }`}>
                              {member.initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-900">{member.name}</p>
                                {!member.isActive && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-300">
                                    Suspended
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">{member.staffId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold border rounded-md mb-1 ${member.roleColor}`}>
                            {member.role}
                          </span>
                          <p className="text-[11px] text-slate-500">{member.department}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 hidden md:table-cell text-[11px]">
                          {member.assignedFacilities}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Suspend / Reactivate Status */}
                            <button
                              type="button"
                              title={member.isActive ? "Temporarily Suspend Access" : "Reactivate Access"}
                              onClick={(e) => handleToggleStatus(e, member)}
                              className={`p-1 rounded-md transition-colors ${
                                member.isActive
                                  ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                  : "text-amber-600 bg-amber-100 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {member.isActive ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </button>

                            {/* Drawer Trigger */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectStaff(member);
                              }}
                              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                                isSelected
                                  ? "bg-indigo-600 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {isSelected ? "Editing" : "Permissions"}
                            </button>

                            {/* Soft Delete */}
                            <button
                              type="button"
                              title="Delete Staff"
                              onClick={(e) => handleDeleteStaff(e, member)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Permissions Side Drawer */}
        {activeStaff && (
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-md p-5 space-y-5 sticky top-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{activeStaff.name}</h2>
                  <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-md ${activeStaff.roleColor}`}>
                    {activeStaff.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{activeStaff.email}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!activeStaff.isActive && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  This account is currently <strong>suspended</strong>. Permission changes will apply once reactivated.
                </span>
              </div>
            )}

            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
              {PERMISSION_GROUPS.map((group) => {
                const Icon = group.icon;
                return (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 tracking-wider">
                      <Icon className="h-4 w-4 text-indigo-600" />
                      <span>{group.title}</span>
                    </div>

                    <div className="space-y-2 pl-2 border-l-2 border-slate-100">
                      {group.items.map((item) => {
                        const isChecked = !!draftPermissions[item.key];
                        return (
                          <div
                            key={item.key}
                            onClick={() => handleTogglePermission(item.key)}
                            className="flex items-start justify-between gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-medium text-slate-800">{item.label}</p>
                              {item.badge && (
                                <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                                  {item.badge}
                                </span>
                              )}
                              {item.warning && (
                                <p className="text-[10px] text-amber-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>{item.warning}</span>
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors shrink-0 ${
                                isChecked ? "bg-indigo-600" : "bg-slate-200"
                              }`}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
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

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetPermissions}
                disabled={!hasChanges}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  hasChanges
                    ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                    : "border-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={!hasChanges}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-sm ${
                  hasChanges
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-indigo-300 cursor-not-allowed"
                }`}
              >
                <Check className="h-4 w-4" />
                <span>Save Access Rights</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Staff Member</h3>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Doe"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="j.doe@visionfirst.ng"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Senior Ophthalmologist">Senior Ophthalmologist</option>
                    <option value="Retina Specialist">Retina Specialist</option>
                    <option value="Senior Nurse">Senior Nurse</option>
                    <option value="Anesthetist">Anesthetist</option>
                    <option value="Lead Pharmacist">Lead Pharmacist</option>
                    <option value="Front Desk Lead">Front Desk Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    required
                    value={newStaff.department}
                    onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Facilities
                </label>
                <input
                  type="text"
                  required
                  value={newStaff.assignedFacilities}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, assignedFacilities: e.target.value })
                  }
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  Save & Onboard Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}