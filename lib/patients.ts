// lib/patients.ts

import { supabase } from "@/lib/supabase";

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  allergies: string[];

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
    console.error("Failed to load patient encounters:", encountersError);
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
    const previousDetails = getEncounterDetails(previousEncounter);

    previousRefraction = {
      date: formatDate(previousEncounter.created_at),
      od: previousDetails.refraction.od,
      os: previousDetails.refraction.os,
    };
  }

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
      encounter.slit_lamp_od || encounter.slit_lamp_os
        ? "Slit lamp findings recorded."
        : null,
      encounter.refraction_od || encounter.refraction_os
        ? "Refraction recorded."
        : null,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      date,
      title,
      details: details || "Consultation record saved.",
    };
  });

  /*
   * Triage information can also be added to the history.
   */
  const { data: latestVitals, error: vitalsError } = await supabase
    .from("vitals")
    .select(
      `
        visual_acuity_od,
        visual_acuity_os,
        primary_complaint,
        recorded_at
      `
    )
    .eq("patient_id", patient.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vitalsError) {
    console.error("Failed to load patient vitals:", vitalsError);
    throw vitalsError;
  }

  if (latestVitals) {
    history.push({
      date: formatDate(latestVitals.recorded_at),
      title: "Triage & Vitals",
      details:
        latestVitals.primary_complaint ||
        `Visual acuity recorded: OD ${latestVitals.visual_acuity_od ?? "—"}, OS ${latestVitals.visual_acuity_os ?? "—"}.`,
    });
  }

  /*
   * Sort history newest first.
   */
  history.sort((a, b) => {
    const dateA = new Date(a.date.split("/").reverse().join("-")).getTime();
    const dateB = new Date(b.date.split("/").reverse().join("-")).getTime();

    if (Number.isNaN(dateA) || Number.isNaN(dateB)) {
      return 0;
    }

    return dateB - dateA;
  });

  /*
   * Imaging is not yet connected to a real imaging table in the
   * current repository. Keep this empty instead of displaying
   * fabricated OCT results.
   *
   * We can connect this properly when the diagnostics/imaging
   * database workflow is implemented.
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
          .map((item) => item.trim())
          .filter(Boolean)
      : [],

    history,

    imaging,

    slitLamp,

    refraction,

    previousRefraction,

    diagnosis,
  };

  return patientRecord;
}
