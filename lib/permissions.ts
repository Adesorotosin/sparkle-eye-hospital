export const PERMISSION_CATALOG = [
  { key: "patients.view", label: "View patient directory and records", group: "Patients" },
  { key: "patients.register", label: "Register patients", group: "Patients" },
  { key: "patients.update", label: "Update patient demographics", group: "Patients" },
  { key: "clinical.view", label: "View clinical records", group: "Clinical" },
  { key: "clinical.notes.create", label: "Create clinical notes", group: "Clinical" },
  { key: "clinical.notes.update", label: "Update clinical notes", group: "Clinical" },
  { key: "clinical.prescriptions.create", label: "Issue prescriptions", group: "Clinical" },
  { key: "clinical.diagnostics.order", label: "Order diagnostics", group: "Clinical" },
  { key: "clinical.results.view", label: "View investigation results", group: "Clinical" },
  { key: "nursing.triage", label: "Record triage and vitals", group: "Nursing" },
  { key: "pharmacy.dispense", label: "Dispense prescriptions", group: "Pharmacy" },
  { key: "billing.view", label: "View invoices and balances", group: "Billing" },
  { key: "billing.collect", label: "Collect and record payments", group: "Billing" },
  { key: "billing.refund", label: "Approve refunds", group: "Billing" },
  { key: "optical.orders.view", label: "View optical orders", group: "Optical" },
  { key: "optical.orders.manage", label: "Manage optical orders", group: "Optical" },
  { key: "inventory.view", label: "View inventory", group: "Inventory" },
  { key: "inventory.manage", label: "Manage stock and procurement", group: "Inventory" },
  { key: "appointments.manage", label: "Manage appointments", group: "Scheduling" },
  { key: "staff.view", label: "View staff directory", group: "Administration" },
  { key: "staff.manage", label: "Create and manage staff accounts", group: "Administration" },
  { key: "roles.manage", label: "Create and manage roles", group: "Administration" },
  { key: "audit.view", label: "View audit and security logs", group: "Administration" },
  { key: "settings.manage", label: "Manage system settings", group: "Administration" },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]["key"];
export const PERMISSION_KEYS = PERMISSION_CATALOG.map((item) => item.key) as PermissionKey[];
