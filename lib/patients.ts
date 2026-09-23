// lib/patients.ts

import { supabase } from "@/lib/supabase";

export interface PatientVitals {
  visualAcuityOD: string;
  visualAcuityOS: string;
  visualAcuityOU: string;
  withCorrection?: boolean;

  iopOD?: number;
  iopOS?: number;
  iopInstrument?: string;

  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;

  primaryComplaint: string;
  symptoms: string[];
  severity?: "Mild" | "Moderate" | "Severe";
  durationText?: string;

  recordedAt: string;
}

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  allergies: string[];

  vitals?: PatientVitals;

  history: {
    date: string;
    title: string;
    details: string;
  }[];

  imaging: {
    id: string;
    type: string;
    date: string;
    color: string;
    path: string;
  }[];

  slitLamp: {
    od: string;
    os: string;
  };

  refraction: {
    od: {
      sphere: string;
      cylinder: string;
      axis: string;
    };
    os: {
      sphere: string;
      cylinder: string;
      axis: string;
    };
  };

  previousRefraction?: {
    date: string;
    od: {
      sphere: string;
      cylinder: string;
      axis: string;
    };
    os: {
      sphere: string;
      cylinder: string;
      axis: string;
    };
  };

  diagnosis: string;
}

type EncounterRow = {
  id: string;
  slit_lamp_od?: string | null;
  slit_lamp_os?: string | null;
  refraction_od?: {
    sphere?: string;
    cylinder?: string;
    axis?: string;
  } | null;
  refraction_os?: {
    sphere?: string;
    cylinder?: string;
    axis?: string;
  } | null;
  diagnosis?: string | null;
  status?: "draft" | "completed" | null;
  created_at?: string | null;
};

type PatientRow = {
  id: string;
  patient_code: string;
  full_name: string;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  allergies?: string | null;
  coverage_plan?: string | null;
};

type VitalsRow = {
  visual_acuity_od?: string | null;
  visual_acuity_os?: string | null;
  visual_acuity_ou?: string | null;
  with_correction?: boolean | null;

  iop_od?: number | string | null;
  iop_os?: number | string | null;
  iop_instrument?: string | null;

  bp_systolic?: number | string | null;
  bp_diastolic?: number | string | null;
  pulse?: number | string | null;
  temperature?: number | string | null;
  spo2?: number | string | null;

  primary_complaint?: string | null;
  symptoms?: string | string[] | null;
  severity?: string | null;
  duration_text?: string | null;

  recorded_at?: string | null;
};

function formatDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function safeRefraction(
  value?: {
    sphere?: string;
    cylinder?: string;
    axis?: string;
  } | null
) {
  return {
    sphere: value?.sphere ?? "",
    cylinder: value?.cylinder ?? "",
    axis: value?.axis ?? "",
  };
}

function parseSymptoms(value?: string | string[] | null): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toNumber(
  value?: number | string | null
): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : undefined;
}

function getEncounterDetails(encounter: EncounterRow) {
  return {
    slitLamp: {
      od: encounter.slit_lamp_od ?? "",
      os: encounter.slit_lamp_os ?? "",
    },

    refraction: {
      od: safeRefraction(encounter.refraction_od),
      os: safeRefraction(encounter.refraction_os),
    },

    diagnosis: encounter.diagnosis ?? "",
  };
}

function mapVitals(row: VitalsRow): PatientVitals {
  const severity =
    row.severity === "Mild" ||
    row.severity === "Moderate" ||
    row.severity === "Severe"
      ? row.severity
      : undefined;

  return {
    visualAcuityOD: row.visual_acuity_od ?? "",
    visualAcuityOS: row.visual_acuity_os ?? "",
    visualAcuityOU: row.visual_acuity_ou ?? "",

    withCorrection:
      row.with_correction !== null &&
      row.with_correction !== undefined
        ? Boolean(row.with_correction)
        : undefined,

    iopOD: toNumber(row.iop_od),
    iopOS: toNumber(row.iop_os),
    iopInstrument: row.iop_instrument ?? undefined,

    bpSystolic: toNumber(row.bp_systolic),
    bpDiastolic: toNumber(row.bp_diastolic),
    pulse: toNumber(row.pulse),
    temperature: toNumber(row.temperature),
    spo2: toNumber(row.spo2),

    primaryComplaint: row.primary_complaint ?? "",

    symptoms: parseSymptoms(row.symptoms),

    severity,

    durationText: row.duration_text ?? undefined,

    recordedAt:
      row.recorded_at ??
      new Date().toISOString(),
  };
}

export async function getPatientById(
  id: string
): Promise<PatientRecord | null> {
  if (!id) {
    return null;
  }

  /*
   * The doctor route uses the patient's human-readable code:
   *
   * /doctor/patients/SPK-12345/encounter
   *
   * So we resolve the patient using patient_code rather than
   * treating the code as the Supabase UUID.
   */
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select(
      `
        id,
        patient_code,
        full_name,
        age,
        gender,
        phone,
        allergies,
        coverage_plan
      `
    )
    .eq("patient_code", id)
    .maybeSingle();

  if (patientError) {
    console.error("Failed to load patient:", patientError);
    throw patientError;
  }

  if (!patient) {
    return null;
  }

  /*
   * Load all encounters so that:
   *
   * - the newest encounter becomes the current consultation data
   * - the previous encounter can be displayed for comparison
   * - the history timeline is based on real database records
   */
  const { data: encounters, error: encountersError } = await supabase
    .from("encounters")
    .select(
      `
        id,
        slit_lamp_od,
        slit_lamp_os,
        refraction_od,
        refraction_os,
        diagnosis,
        status,
        created_at
      `
    )
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false });

  if (encountersError) {
    console.error(
      "Failed to load patient encounters:",
      encountersError
    );
    throw encountersError;
  }

  const encounterRows = (encounters ?? []) as EncounterRow[];

  const latestEncounter = encounterRows[0];
  const previousEncounter = encounterRows[1];

  /*
   * Current consultation values.
   */
  let slitLamp = {
    od: "",
    os: "",
  };

  let refraction = {
    od: {
      sphere: "",
      cylinder: "",
      axis: "",
    },
    os: {
      sphere: "",
      cylinder: "",
      axis: "",
    },
  };

  let diagnosis = "";

  if (latestEncounter) {
    const details = getEncounterDetails(latestEncounter);

    slitLamp = details.slitLamp;
    refraction = details.refraction;
    diagnosis = details.diagnosis;
  }

  /*
   * Previous refraction is used by the doctor's
   * "Compare Previous Exam" feature.
   */
  let previousRefraction:
    | PatientRecord["previousRefraction"]
    | undefined;

  if (previousEncounter) {
    const previousDetails =
      getEncounterDetails(previousEncounter);

    previousRefraction = {
      date: formatDate(previousEncounter.created_at),
      od: previousDetails.refraction.od,
      os: previousDetails.refraction.os,
    };
  }

  /*
   * Get the patient's latest triage/vitals record.
   *
   * This now loads the complete triage record rather than
   * only visual acuity and chief complaint.
   */
  const { data: latestVitals, error: vitalsError } =
    await supabase
      .from("vitals")
      .select(
        `
          visual_acuity_od,
          visual_acuity_os,
          visual_acuity_ou,
          with_correction,
          iop_od,
          iop_os,
          iop_instrument,
          bp_systolic,
          bp_diastolic,
          pulse,
          temperature,
          spo2,
          primary_complaint,
          symptoms,
          severity,
          duration_text,
          recorded_at
        `
      )
      .eq("patient_id", patient.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (vitalsError) {
    console.error(
      "Failed to load patient vitals:",
      vitalsError
    );
    throw vitalsError;
  }

  const vitals = latestVitals
    ? mapVitals(latestVitals as VitalsRow)
    : undefined;

  /*
   * Build the consultation history from actual encounters.
   */
  const history = encounterRows.map((encounter) => {
    const date = formatDate(encounter.created_at);

    const title =
      encounter.status === "completed"
        ? "Completed Consultation"
        : "Consultation Draft";

    const details = [
      encounter.diagnosis
        ? `Diagnosis: ${encounter.diagnosis}`
        : "No diagnosis recorded.",

      encounter.slit_lamp_od ||
      encounter.slit_lamp_os
        ? "Slit lamp findings recorded."
        : null,

      encounter.refraction_od ||
      encounter.refraction_os
        ? "Refraction recorded."
        : null,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      date,
      title,
      details:
        details || "Consultation record saved.",
    };
  });

  /*
   * Add triage information to the history timeline.
   */
  if (vitals) {
    const triageDetails = [
      vitals.primaryComplaint
        ? `Complaint: ${vitals.primaryComplaint}`
        : null,

      `VA: OD ${vitals.visualAcuityOD || "—"}, OS ${
        vitals.visualAcuityOS || "—"
      }`,

      vitals.iopOD !== undefined ||
      vitals.iopOS !== undefined
        ? `IOP: OD ${
            vitals.iopOD ?? "—"
          } / OS ${vitals.iopOS ?? "—"} mmHg`
        : null,
    ]
      .filter(Boolean)
      .join(" • ");

    history.push({
      date: formatDate(vitals.recordedAt),
      title: "Triage & Vitals",
      details:
        triageDetails ||
        "Triage information recorded.",
    });
  }

  /*
   * Sort history newest first.
   */
  history.sort((a, b) => {
    const dateA = new Date(
      a.date.split("/").reverse().join("-")
    ).getTime();

    const dateB = new Date(
      b.date.split("/").reverse().join("-")
    ).getTime();

    if (
      Number.isNaN(dateA) ||
      Number.isNaN(dateB)
    ) {
      return 0;
    }

    return dateB - dateA;
  });

  /*
   * Imaging is not yet connected to a real imaging table
   * in the current repository.
   *
   * Keep this empty instead of displaying fabricated results.
   */
  const imaging: PatientRecord["imaging"] = [];

  const patientRecord: PatientRecord = {
    id: patient.patient_code,

    name: patient.full_name,

    age: patient.age ?? 0,

    gender: patient.gender ?? "",

    mrn: patient.patient_code,

    allergies: patient.allergies
      ? patient.allergies
          .split(",")
          .map((item: any) => item.trim())
          .filter(Boolean)
      : [],

    vitals,

    history,

    imaging,

    slitLamp,

    refraction,

    previousRefraction,

    diagnosis,
  };

  return patientRecord;
}