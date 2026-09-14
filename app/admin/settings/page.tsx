"use client";

import React, { useState } from "react";
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
} from "lucide-react";

// --- TYPES ---
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

// --- CONSTANTS ---
const MODULE_ITEMS: { key: keyof SystemModules; title: string; desc: string }[] = [
  { key: "ehr", title: "EHR Module", desc: "Electronic health records" },
  { key: "pharmacy", title: "Pharmacy Portal", desc: "Medication dispensing" },
  { key: "optical", title: "Optical & OCT Center", desc: "Eye diagnostics" },
  { key: "billing", title: "Billing & Payments", desc: "Financial transactions" },
  { key: "patientPortal", title: "Patient Self-Service", desc: "Patient portal access" },
  { key: "telemedicine", title: "Telemedicine", desc: "Virtual consultations" },
];

const TAB_OPTIONS = [
  "General Setup",
  "Departments & Wards",
  "Billing & Tax Defaults",
  "Operational Hours",
  "Integrations & API",
] as const;

type TabType = (typeof TAB_OPTIONS)[number];

export default function AdminSettingsPage() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState<TabType>("General Setup");

  // Admin & Facility Info State
  const [adminName, setAdminName] = useState("Dr. Alex Morgan");
  const [hospitalName, setHospitalName] = useState("Sparkle Eye Specialist Hospital");

  // System Modules State
  const [modules, setModules] = useState<SystemModules>({
    ehr: true,
    pharmacy: true,
    optical: true,
    billing: true,
    patientPortal: false,
    telemedicine: false,
  });

  // Departments State
  const [departments, setDepartments] = useState<Department[]>([
    { id: "1", name: "Ophthalmology & Surgery", staffCount: 14, status: "Active" },
    { id: "2", name: "Optometry & Refraction", staffCount: 8, status: "Active" },
    { id: "3", name: "Pediatric Eye Care", staffCount: 5, status: "Active" },
  ]);

  // Billing State
  const [billing, setBilling] = useState<BillingSettings>({
    vatRate: "7.5%",
    invoiceDueDays: "30 Days",
  });

  // Modals & UI Feedback State
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // New Department Form Inputs
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptStaff, setNewDeptStaff] = useState<number | "">("");

  // --- HANDLERS ---
  const toggleModule = (key: keyof SystemModules) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBillingChange = (field: keyof BillingSettings, value: string) => {
    setBilling((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    const newDept: Department = {
      id: Date.now().toString(),
      name: newDeptName.trim(),
      staffCount: typeof newDeptStaff === "number" ? newDeptStaff : 0,
      status: "Active",
    };

    setDepartments((prev) => [...prev, newDept]);
    setNewDeptName("");
    setNewDeptStaff("");
    setIsAddDeptModalOpen(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate backend API persistence delay
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsSaving(false);
    setIsSaveModalOpen(false);

    // Show temporary success notification
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleDiscard = () => {
    // Reset back to initial default values
    setAdminName("Dr. Alex Morgan");
    setHospitalName("Sparkle Eye Specialist Hospital");
    setModules({
      ehr: true,
      pharmacy: true,
      optical: true,
      billing: true,
      patientPortal: false,
      telemedicine: false,
    });
    setBilling({
      vatRate: "7.5%",
      invoiceDueDays: "30 Days",
    });
    setIsDiscardModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 text-[#0F172A] relative">
      {/* SUCCESS TOAST NOTIFICATION */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg transition-all animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">System settings updated successfully!</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* TOP HEADER & GLOBAL ACTIONS */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Building className="w-6 h-6 text-[#4F46E5]" />
              <h1 className="text-xl font-bold text-[#0F172A]">{hospitalName || "Hospital Facility"}</h1>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              Logged in as: <span className="font-semibold text-[#0F172A]">{adminName || "Administrator"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDiscardModalOpen(true)}
              className="px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-[#64748B]" />
              Discard Changes
            </button>
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              className="px-4 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium flex items-center gap-2 shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] overflow-x-auto pb-1">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
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

        {/* TAB 1: GENERAL SETUP */}
        {activeTab === "General Setup" && (
          <div className="space-y-6">
            {/* ADMIN & FACILITY PROFILE EDITING PANEL */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-4">
                <UserCheck className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">Administrator & Hospital Profile</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Admin Full Name
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="e.g. Dr. Alex Morgan"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Hospital / Facility Name
                  </label>
                  <input
                    type="text"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="e.g. Sparkle Eye Specialist Hospital"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>
            </div>

            {/* ACTIVE PORTALS & MODULES */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Grid className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">Active Portals & Modules</h3>
              </div>

              <div className="space-y-4">
                {MODULE_ITEMS.map((mod) => {
                  const isActive = modules[mod.key];
                  return (
                    <div
                      key={mod.key}
                      className="flex items-center justify-between pt-3 first:pt-0 border-t border-[#F1F5F9] first:border-0"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">{mod.title}</p>
                        <p className="text-xs text-[#64748B]">{mod.desc}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        aria-label={`Toggle ${mod.title}`}
                        onClick={() => toggleModule(mod.key)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                          isActive ? "bg-[#4F46E5]" : "bg-[#E2E8F0]"
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEPARTMENTS & WARDS */}
        {activeTab === "Departments & Wards" && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-base text-[#0F172A]">Clinical Departments & Wards</h3>
                <p className="text-xs text-[#64748B]">Manage active hospital units and staff allocation.</p>
              </div>
              <button
                onClick={() => setIsAddDeptModalOpen(true)}
                className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Department
              </button>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {departments.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#64748B]">No departments configured yet.</p>
              ) : (
                departments.map((dept) => (
                  <div key={dept.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{dept.name}</p>
                      <p className="text-xs text-[#64748B]">{dept.staffCount} Staff Assigned</p>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                      {dept.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: BILLING & TAX */}
        {activeTab === "Billing & Tax Defaults" && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-4">
              <Receipt className="w-5 h-5 text-[#4F46E5]" />
              <h3 className="font-semibold text-base text-[#0F172A]">Tax & Currency Defaults</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Value Added Tax (VAT)</label>
                <input
                  type="text"
                  value={billing.vatRate}
                  onChange={(e) => handleBillingChange("vatRate", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">Invoice Due Period</label>
                <input
                  type="text"
                  value={billing.invoiceDueDays}
                  onChange={(e) => handleBillingChange("invoiceDueDays", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: OPERATIONAL HOURS */}
        {activeTab === "Operational Hours" && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-4">
              <Clock className="w-5 h-5 text-[#4F46E5]" />
              <h3 className="font-semibold text-base text-[#0F172A]">Facility Shift & Work Hours</h3>
            </div>
            <p className="text-xs text-[#64748B]">Emergency & Optical units operate on a 24/7 rotational shift schedule.</p>
          </div>
        )}

        {/* TAB 5: INTEGRATIONS & API */}
        {activeTab === "Integrations & API" && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-4">
              <Key className="w-5 h-5 text-[#4F46E5]" />
              <h3 className="font-semibold text-base text-[#0F172A]">External Services & Webhooks</h3>
            </div>
            <p className="text-xs text-[#64748B]">Active connections to payment gateways, SMS portals, and laboratory systems.</p>
          </div>
        )}

        {/* MODAL: ADD DEPARTMENT */}
        {isAddDeptModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsAddDeptModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#4F46E5]">
                  <Users className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDeptModalOpen(false)}
                  className="text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#0F172A]">Add Clinical Department</h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Create a new active department or ward unit for {hospitalName || "the facility"}.
                </p>
              </div>

              <form onSubmit={handleAddDepartment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Department Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corneal Specialist Unit"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Initial Staff Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newDeptStaff}
                    onChange={(e) =>
                      setNewDeptStaff(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setIsAddDeptModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-sm bg-[#4F46E5] text-white hover:bg-[#4338CA] font-medium"
                  >
                    Add Department
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: SAVE CONFIRMATION */}
        {isSaveModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsSaveModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E2E8F0]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#4F46E5]">
                  <Save className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Confirm Configuration Updates</h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Are you sure you want to save these system changes for {hospitalName}?
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm border border-[#E2E8F0] text-[#0F172A] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="px-4 py-2 rounded-lg text-sm bg-[#4F46E5] text-white hover:bg-[#4338CA] flex items-center gap-2 disabled:opacity-50 font-medium"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: DISCARD CONFIRMATION */}
        {isDiscardModalOpen && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsDiscardModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E2E8F0]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setIsDiscardModalOpen(false)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#0F172A]">Discard Unsaved Changes?</h3>
                <p className="text-xs text-[#64748B] mt-1">
                  Any modifications made since your last save will be reset.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDiscardModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm border border-[#E2E8F0] text-[#0F172A]"
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={handleDiscard}
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