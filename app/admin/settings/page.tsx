"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Grid,
  Upload,
  Check,
  AlertTriangle,
  X,
  Plus,
  Clock,
  Key,
  Receipt,
  Save,
  Users,
  Loader2,
} from "lucide-react";

// --- TYPESCRIPT INTERFACES ---
interface HospitalProfile {
  name: string;
  licenseId: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
}

interface SystemModules {
  ehr: boolean;
  pharmacy: boolean;
  optical: boolean;
  billing: boolean;
  patientPortal: boolean;
  telemedicine: boolean;
}

interface BillingDefaults {
  vatRate: string;
  invoiceDueDays: string;
}

interface Department {
  id: number;
  name: string;
  status: "Active" | "Inactive";
  staffCount: number;
}

export default function SystemSettingsPage() {
  const [activeTab, setActiveTab] = useState("Hospital Profile");

  // Loading & Async States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modals & Feedback State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // New Department Form State
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptStaff, setNewDeptStaff] = useState<number | "">("");

  // --- FORM STATES ---
  const [profile, setProfile] = useState<HospitalProfile>({
    name: "",
    licenseId: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
  });

  const [initialProfile, setInitialProfile] = useState<HospitalProfile>(profile);

  const [modules, setModules] = useState<SystemModules>({
    ehr: false,
    pharmacy: false,
    optical: false,
    billing: false,
    patientPortal: false,
    telemedicine: false,
  });

  const [billing, setBilling] = useState<BillingDefaults>({
    vatRate: "",
    invoiceDueDays: "",
  });

  const [departments, setDepartments] = useState<Department[]>([]);

  // Helper for Toast Feedback
  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- FETCH SETTINGS FROM API ---
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/admin/settings");
        const json = await res.json();

        if (json.success && json.data) {
          setProfile(json.data.profile);
          setInitialProfile(json.data.profile);
          setModules(json.data.modules);
          setBilling(json.data.billing);
          setDepartments(json.data.departments || []);
        } else {
          triggerToast("Failed to load settings from server.", "error");
        }
      } catch (err) {
        console.error("Failed to load system settings:", err);
        triggerToast("Network error while fetching system settings.", "error");
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  // --- HANDLER FUNCTIONS ---
  const handleProfileChange = (field: keyof HospitalProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleBillingChange = (field: keyof BillingDefaults, value: string) => {
    setBilling((prev) => ({ ...prev, [field]: value }));
  };

  const toggleModule = (key: keyof SystemModules) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // --- PERSIST TO SERVER (PUT) ---
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          modules,
          billing,
          departments,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setInitialProfile(profile);
        setIsSaveModalOpen(false);
        triggerToast("System settings saved successfully!", "success");
      } else {
        triggerToast(json.error || "Failed to save settings.", "error");
      }
    } catch (err) {
      console.error("Failed to update system settings:", err);
      triggerToast("An error occurred while saving settings.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setProfile(initialProfile);
    setIsDiscardModalOpen(false);
    triggerToast("Changes discarded back to last saved state.", "success");
  };

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    const newDepartment: Department = {
      id: departments.length > 0 ? Math.max(...departments.map((d) => d.id)) + 1 : 1,
      name: newDeptName.trim(),
      status: "Active",
      staffCount: typeof newDeptStaff === "number" ? newDeptStaff : 0,
    };

    setDepartments((prev) => [newDepartment, ...prev]);
    setNewDeptName("");
    setNewDeptStaff("");
    setIsAddDeptModalOpen(false);
    triggerToast(`Department "${newDepartment.name}" added locally. Click Save to persist.`, "success");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#64748B]">
          <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5]" />
          <p className="text-sm font-medium">Loading hospital configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 transition-all animate-bounce text-white ${
            toastMessage.type === "error" ? "bg-rose-600" : "bg-[#0F172A]"
          }`}
        >
          {toastMessage.type === "error" ? (
            <AlertTriangle className="w-5 h-5 text-amber-300" />
          ) : (
            <Check className="w-5 h-5 text-emerald-400" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* PAGE HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            System Settings & Facility Profile
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            Manage global hospital configurations, department structures, and default billing settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDiscardModalOpen(true)}
            className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-medium text-[#0F172A] bg-white hover:bg-[#F8FAFC] transition-all shadow-sm"
          >
            Discard
          </button>
          <button
            onClick={() => setIsSaveModalOpen(true)}
            className="px-5 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-medium transition-all shadow-sm flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>

      {/* SUB NAVIGATION TABS */}
      <div className="border-b border-[#E2E8F0] mb-8">
        <div className="flex gap-8 overflow-x-auto">
          {[
            "Hospital Profile",
            "Departments & Wards",
            "Billing & Tax Defaults",
            "Operational Hours",
            "Integrations & API",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab
                  ? "text-[#4F46E5] font-semibold"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5] rounded-t-md" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: HOSPITAL PROFILE */}
      {activeTab === "Hospital Profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">Facility Identity</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="border-2 border-dashed border-[#818CF8] bg-[#EEF2FF]/40 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#EEF2FF]/70 transition-all">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[#4F46E5] shadow-sm mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-[#4F46E5]">Upload Logo</span>
                  <span className="text-[10px] text-[#64748B] mt-1">PNG, JPG up to 2MB</span>
                </div>

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Legal Hospital Name
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => handleProfileChange("name", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Registration ID
                    </label>
                    <input
                      type="text"
                      value={profile.licenseId}
                      onChange={(e) => handleProfileChange("licenseId", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Official Phone
                    </label>
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => handleProfileChange("phone", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleProfileChange("email", e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">Physical Address</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => handleProfileChange("address", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => handleProfileChange("city", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    value={profile.state}
                    onChange={(e) => handleProfileChange("state", e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <Grid className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="font-semibold text-base text-[#0F172A]">Active Portals & Modules</h3>
              </div>

              <div className="space-y-4">
                {[
                  { key: "ehr", title: "EHR Module", desc: "Electronic health records" },
                  { key: "pharmacy", title: "Pharmacy Portal", desc: "Medication dispensing" },
                  { key: "optical", title: "Optical & OCT Center", desc: "Eye diagnostics" },
                  { key: "billing", title: "Billing & Payments", desc: "Financial transactions" },
                  { key: "patientPortal", title: "Patient Self-Service", desc: "Patient portal access" },
                  { key: "telemedicine", title: "Telemedicine", desc: "Virtual consultations" },
                ].map((mod) => (
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
                      onClick={() => toggleModule(mod.key as keyof SystemModules)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                        modules[mod.key as keyof SystemModules] ? "bg-[#4F46E5]" : "bg-[#E2E8F0]"
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          modules[mod.key as keyof SystemModules] ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0]">
            <div className="flex justify-between items-center mb-4">
              <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#4F46E5]">
                <Users className="w-5 h-5" />
              </div>
              <button
                onClick={() => setIsAddDeptModalOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-[#0F172A]">Add Clinical Department</h3>
              <p className="text-xs text-[#64748B] mt-1">
                Create a new active department or ward unit for Sparkle Eye Hospital.
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center text-[#4F46E5]">
                <Save className="w-5 h-5" />
              </div>
              <button onClick={() => setIsSaveModalOpen(false)} className="text-[#64748B] hover:text-[#0F172A]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Confirm Configuration Updates</h3>
              <p className="text-xs text-[#64748B] mt-1">
                Are you sure you want to save these system changes to Sparkle Eye Specialist Hospital?
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
                className="px-4 py-2 rounded-lg text-sm bg-[#4F46E5] text-white hover:bg-[#4338CA] flex items-center gap-2 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button onClick={() => setIsDiscardModalOpen(false)} className="text-[#64748B] hover:text-[#0F172A]">
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
                onClick={() => setIsDiscardModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm border border-[#E2E8F0] text-[#0F172A]"
              >
                Continue Editing
              </button>
              <button
                onClick={handleDiscard}
                className="px-4 py-2 rounded-lg text-sm bg-rose-600 text-white hover:bg-rose-700"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}