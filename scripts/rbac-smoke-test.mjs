import assert from "node:assert/strict";
import { resolvePermissions } from "../lib/permissions.ts";

const doctor = resolvePermissions("DOCTOR", {}, {});
assert.equal(doctor["clinical.view"], true, "Doctors inherit clinical view.");
assert.equal(doctor["clinical.prescriptions.create"], true, "Doctors inherit prescribing.");

const restrictedDoctor = resolvePermissions(
  "DOCTOR",
  { "clinical.prescriptions.create": false, "inventory.view": true },
  {}
);
assert.equal(restrictedDoctor["clinical.prescriptions.create"], false, "Custom role can deny a base permission.");
assert.equal(restrictedDoctor["inventory.view"], true, "Custom role can add a permission.");

const individualOverride = resolvePermissions(
  "DOCTOR",
  { "clinical.view": false },
  { "clinical.view": true }
);
assert.equal(individualOverride["clinical.view"], true, "Staff-specific overrides take precedence.");

const legacyOverride = resolvePermissions(
  "DOCTOR",
  {},
  { view_patient_records: false, edit_clinical_notes: false }
);
assert.equal(legacyOverride["patients.view"], false, "Legacy patient-view overrides map to the canonical permission.");
assert.equal(legacyOverride["clinical.notes.update"], false, "Legacy clinical-note overrides map to the canonical permission.");

const receptionist = resolvePermissions("RECEPTIONIST", {}, {});
assert.equal(receptionist["patients.register"], true);
assert.equal(receptionist["clinical.view"], undefined, "Reception must not inherit clinical chart access.");

const admin = resolvePermissions("IT_ADMIN", {}, {});
assert.equal(admin["roles.manage"], true);
assert.equal(admin.controlled_substance_override, false, "System administration does not grant professional controlled-substance authority.");

console.log("RBAC smoke tests passed.");
