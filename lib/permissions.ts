export const PERMISSION_CATALOG = [
  { key: "patients.view", label: "View patient directory and permitted records", group: "Patients" },
  { key: "patients.register", label: "Register patients", group: "Patients" },
  { key: "patients.update", label: "Update patient demographics", group: "Patients" },
  { key: "clinical.view", label: "View clinical records", group: "Clinical" },
  { key: "clinical.notes.create", label: "Create clinical notes", group: "Clinical" },
  { key: "clinical.notes.update", label: "Update clinical notes", group: "Clinical" },
  { key: "clinical.prescriptions.view", label: "View prescriptions", group: "Clinical" },
  { key: "clinical.prescriptions.create", label: "Issue prescriptions", group: "Clinical" },
  { key: "clinical.diagnostics.order", label: "Order diagnostics", group: "Clinical" },
  { key: "clinical.results.view", label: "View investigation results", group: "Clinical" },
  { key: "clinical.results.update", label: "Enter investigation results", group: "Clinical" },
  { key: "nursing.triage", label: "Record triage and vitals", group: "Nursing" },
  { key: "pharmacy.dispense", label: "Dispense prescriptions", group: "Pharmacy" },
  { key: "billing.view", label: "View invoices and balances", group: "Billing" },
  { key: "billing.collect", label: "Collect and record payments", group: "Billing" },
  { key: "billing.refund", label: "Approve refunds", group: "Billing" },
  { key: "optical.orders.view", label: "View optical orders", group: "Optical" },
  { key: "optical.orders.manage", label: "Manage optical orders", group: "Optical" },
  { key: "inventory.view", label: "View inventory", group: "Inventory" },
  { key: "inventory.manage", label: "Manage stock and procurement", group: "Inventory" },
  { key: "appointments.view", label: "View appointments", group: "Scheduling" },
  { key: "appointments.manage", label: "Create and manage appointments", group: "Scheduling" },
  { key: "staff.view", label: "View staff directory", group: "Administration" },
  { key: "staff.manage", label: "Create and manage staff accounts", group: "Administration" },
  { key: "roles.manage", label: "Create and manage roles", group: "Administration" },
  { key: "audit.view", label: "View audit and security logs", group: "Administration" },
  { key: "settings.manage", label: "Manage system settings", group: "Administration" },
  { key: "notifications.manage", label: "Manage hospital notifications", group: "Administration" },
  { key: "surgery.manage", label: "Access the surgical suite", group: "Clinical" },
  // Backward-compatible keys used by the existing Staff & Access Control screen.
  { key: "view_patient_records", label: "Legacy: View patient records", group: "Legacy permissions" },
  { key: "edit_clinical_notes", label: "Legacy: Edit clinical notes", group: "Legacy permissions" },
  { key: "order_diagnostics", label: "Legacy: Order diagnostics", group: "Legacy permissions" },
  { key: "view_lab_results", label: "Legacy: View laboratory results", group: "Legacy permissions" },
  { key: "issue_prescriptions", label: "Legacy: Issue prescriptions", group: "Legacy permissions" },
  { key: "controlled_substance_override", label: "Legacy: Controlled substance override", group: "Legacy permissions" },
  { key: "pharmacy_dispensing_approval", label: "Legacy: Pharmacy dispensing approval", group: "Legacy permissions" },
  { key: "view_financial_reports", label: "Legacy: View financial reports", group: "Legacy permissions" },
  { key: "insurance_claims_access", label: "Legacy: Insurance claims access", group: "Legacy permissions" },
  { key: "revenue_dashboard", label: "Legacy: Revenue dashboard", group: "Legacy permissions" },
  { key: "approve_refunds", label: "Legacy: Approve refunds", group: "Legacy permissions" },
  { key: "user_account_management", label: "Legacy: User account management", group: "Legacy permissions" },
  { key: "system_configuration", label: "Legacy: System configuration", group: "Legacy permissions" },
  { key: "audit_log_access", label: "Legacy: Audit log access", group: "Legacy permissions" },
  { key: "api_key_management", label: "Legacy: API key management", group: "Legacy permissions" },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];
export const PERMISSION_KEYS = PERMISSION_CATALOG.map((item) => item.key) as PermissionKey[];

const all = (...keys: PermissionKey[]) => Object.fromEntries(keys.map((key) => [key, true])) as Record<string, boolean>;

export const ROLE_DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  IT_ADMIN: { ...all(...PERMISSION_KEYS), controlled_substance_override: false },
  OPHTHALMOLOGIST: all(
    "surgery.manage","patients.view","patients.update","clinical.view","clinical.notes.create","clinical.notes.update","nursing.triage",
    "clinical.prescriptions.view","clinical.prescriptions.create","clinical.diagnostics.order",
    "clinical.results.view","clinical.results.update","appointments.view","appointments.manage","optical.orders.view","optical.orders.manage",
    "view_patient_records","edit_clinical_notes","order_diagnostics","view_lab_results","issue_prescriptions"
  ),
  DOCTOR: all(
    "surgery.manage","patients.view","patients.update","clinical.view","clinical.notes.create","clinical.notes.update","nursing.triage",
    "clinical.prescriptions.view","clinical.prescriptions.create","clinical.diagnostics.order",
    "clinical.results.view","appointments.view","appointments.manage","optical.orders.view","optical.orders.manage",
    "view_patient_records","edit_clinical_notes","order_diagnostics","view_lab_results","issue_prescriptions"
  ),
  NURSE: all(
    "patients.view","patients.update","clinical.view","clinical.notes.create","clinical.results.view","clinical.prescriptions.view","clinical.results.update","clinical.diagnostics.order","nursing.triage","inventory.view",
    "appointments.view","view_patient_records","edit_clinical_notes","view_lab_results"
  ),
  RECEPTIONIST: all(
    "patients.view","patients.register","patients.update","appointments.view","appointments.manage","inventory.view",
    "view_patient_records"
  ),
  CASHIER: all(
    "patients.view","appointments.view","billing.view","billing.collect","view_patient_records",
    "view_financial_reports","insurance_claims_access","revenue_dashboard"
  ),
  PHARMACIST: all(
    "patients.view","patients.update","clinical.prescriptions.view","pharmacy.dispense","inventory.view",
    "view_patient_records","view_lab_results","pharmacy_dispensing_approval"
  ),
  OPTICIAN: all("patients.view","optical.orders.view","optical.orders.manage","inventory.view","appointments.view","view_patient_records"),
  OPTOMETRIST: all(
    "patients.view","patients.register","clinical.view","clinical.notes.create","clinical.diagnostics.order",
    "clinical.results.view","optical.orders.view","optical.orders.manage","appointments.view",
    "view_patient_records","edit_clinical_notes","order_diagnostics","view_lab_results"
  ),
  LAB_SCIENTIST: all(
    "patients.view","clinical.results.view","clinical.results.update","appointments.view","inventory.view",
    "view_patient_records","view_lab_results"
  ),
  INVENTORY_MANAGER: all("inventory.view","inventory.manage"),
};

export function resolvePermissions(
  role: string,
  customRolePermissions: Record<string, boolean> | null | undefined,
  staffPermissions: Record<string, boolean> | null | undefined
): Record<string, boolean> {
  const custom = customRolePermissions ?? {};
  const individual = staffPermissions ?? {};
  const effective: Record<string, boolean> = {
    ...(ROLE_DEFAULT_PERMISSIONS[role] ?? {}),
    ...custom,
    ...individual,
  };
  const legacyAliases: Record<string, string> = {
    view_patient_records: "patients.view",
    edit_clinical_notes: "clinical.notes.update",
    order_diagnostics: "clinical.diagnostics.order",
    view_lab_results: "clinical.results.view",
    issue_prescriptions: "clinical.prescriptions.create",
    pharmacy_dispensing_approval: "pharmacy.dispense",
    approve_refunds: "billing.refund",
    user_account_management: "staff.manage",
    audit_log_access: "audit.view",
    system_configuration: "settings.manage",
  };
  for (const [legacy, canonical] of Object.entries(legacyAliases)) {
    if (Object.prototype.hasOwnProperty.call(custom, legacy)) effective[canonical] = custom[legacy];
    if (Object.prototype.hasOwnProperty.call(individual, legacy)) effective[canonical] = individual[legacy];
  }
  return effective;
}
