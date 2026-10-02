"use client";

import React, {
  useEffect,
  useState,
  useTransition,
} from "react";
import { useParams } from "next/navigation";
import { saveConsultationEncounter } from "@/app/actions/consultation";
import { referPatientToOptometry } from "@/app/actions/optometry-referral";
import { createLabOrder } from "@/app/actions/lab-orders";
import {
  createDiagnosticOrder,
  createPrescription,
} from "@/app/actions/clinical-orders";
import {
  Calendar,
  Check,
  ClipboardList,
  History,
  Pill,
} from "lucide-react";

type Refraction = {
  sphere: string;
  cylinder: string;
  axis: string;
};

type PatientVitals = {
  visualAcuityOD: string;
  visualAcuityOS: string;
  visualAcuityOU?: string;
  withCorrection?: boolean;

  iop?: number;
  iopOD?: number;
  iopOS?: number;
  iopInstrument?: string;

  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;

  primaryComplaint: string;
  symptoms?: string[];
  severity?: "Mild" | "Moderate" | "Severe";
  durationText?: string;

  recordedAt: string;
};

type PatientEncounter = {
  id: string;
  slitLampOD?: string;
  slitLampOS?: string;
  refractionOD?: Refraction;
  refractionOS?: Refraction;
  diagnosis?: string;
  status: "draft" | "completed";
  createdAt: string;
};

type PatientDiagnostic = {
  id: string;
  name: string;
  price: number;
  status: "ordered" | "ready_for_test" | "completed";
  findings?: string;
  interpretation?: string;
  completedAt?: string;
};

type PatientLaboratoryResult = {
  id: string;
  labOrderId: string;
  testName: string;
  specimenType?: string;
  sampleId?: string;
  priority?: string;
  status: string;
  resultData: unknown;
  laboratoryComments?: string;
  verifiedAt?: string;
  createdAt?: string;
};

type PatientHistoryItem = {
  date: string;
  title: string;
  details: string;
};

type PatientRecord = {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  allergies: string[];

  vitals?: PatientVitals;
  diagnostics: PatientDiagnostic[];
  laboratoryResults: PatientLaboratoryResult[];

  history: PatientHistoryItem[];

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
    od: Refraction;
    os: Refraction;
  };

  previousRefraction?: {
    date: string;
    od: Refraction;
    os: Refraction;
  };

  diagnosis: string;
};

type DiagnosticTest = {
  name: string;
  price: number;
};

type LaboratoryTest = {
  code: string;
  name: string;
  specimenType: string;
  price: number;
};

type LabOrderPriority = "NORMAL" | "URGENT" | "STAT";

type LaboratoryResultRow = {
  id: string;
  name: string;
  result: string;
  unit: string;
  referenceRange: string;
  flag: string;
};

const DIAGNOSTIC_TESTS: DiagnosticTest[] = [
  {
    name: "Visual Field Test (Humphrey)",
    price: 12000,
  },
  {
    name: "Optical Coherence Tomography (OCT)",
    price: 18000,
  },
  {
    name: "Pachymetry (Corneal Thickness)",
    price: 7000,
  },
  {
    name: "Gonioscopy",
    price: 6000,
  },
  {
    name: "Fundus Photography",
    price: 9000,
  },
];

const LABORATORY_TESTS: LaboratoryTest[] = [
  {
    code: "FBC",
    name: "Full Blood Count",
    specimenType: "EDTA Whole Blood",
    price: 5000,
  },
  {
    code: "BGL",
    name: "Blood Glucose",
    specimenType: "Blood",
    price: 2500,
  },
  {
    code: "MALARIA",
    name: "Malaria Parasite",
    specimenType: "Blood",
    price: 2500,
  },
  {
    code: "LIPID",
    name: "Lipid Profile",
    specimenType: "Blood",
    price: 7000,
  },
  {
    code: "URINALYSIS",
    name: "Urinalysis",
    specimenType: "Urine",
    price: 2000,
  },
];

const SURGERY_OPTIONS = [
  "Cataract (Phacoemulsification + IOL)",
  "Glaucoma Trabeculectomy",
  "Pterygium Excision with Graft",
  "Intravitreal Injection",
];

function formatEncounterDate(
  value?: string | null
): string {
  if (!value) return "";

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

function formatResultDate(
  value?: string | null
): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeRefraction(
  value?: Partial<Refraction> | null
): Refraction {
  return {
    sphere: value?.sphere ?? "",
    cylinder: value?.cylinder ?? "",
    axis: value?.axis ?? "",
  };
}

function formatLaboratoryValue(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getLaboratoryResultRows(
  resultData: unknown
): LaboratoryResultRow[] {
  /*
   * Current lab result structure:
   *
   * [
   *   {
   *     name: "Haemoglobin",
   *     result: "13",
   *     unit: "g/dL",
   *     referenceRange: "12.0 - 17.0",
   *     flag: "NORMAL"
   *   }
   * ]
   *
   * We explicitly handle arrays first so that
   * Object.entries() does not render 0, 1, 2, 3...
   * as the parameter names.
   */

  if (Array.isArray(resultData)) {
    return resultData.map(
      (item, index): LaboratoryResultRow => {
        if (
          item &&
          typeof item === "object" &&
          !Array.isArray(item)
        ) {
          const row =
            item as Record<string, unknown>;

          return {
            id: `${index}`,
            name: formatLaboratoryValue(
              row.name ??
                row.parameter ??
                `Parameter ${index + 1}`
            ),
            result: formatLaboratoryValue(
              row.result ?? row.value
            ),
            unit: formatLaboratoryValue(
              row.unit
            ),
            referenceRange:
              formatLaboratoryValue(
                row.referenceRange ??
                  row.reference_range ??
                  row.refRange
              ),
            flag: formatLaboratoryValue(
              row.flag
            ),
          };
        }

        return {
          id: `${index}`,
          name: `Parameter ${index + 1}`,
          result: formatLaboratoryValue(item),
          unit: "—",
          referenceRange: "—",
          flag: "—",
        };
      }
    );
  }

  /*
   * Backward-compatible handling in case another
   * laboratory result is stored as an object.
   */
  if (
    resultData &&
    typeof resultData === "object"
  ) {
    return Object.entries(
      resultData as Record<string, unknown>
    ).map(
      ([name, value], index): LaboratoryResultRow => {
        if (
          value &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          const row =
            value as Record<string, unknown>;

          return {
            id: `${index}`,
            name: formatLaboratoryValue(
              row.name ?? name
            ),
            result: formatLaboratoryValue(
              row.result ?? row.value
            ),
            unit: formatLaboratoryValue(
              row.unit
            ),
            referenceRange:
              formatLaboratoryValue(
                row.referenceRange ??
                  row.reference_range ??
                  row.refRange
              ),
            flag: formatLaboratoryValue(
              row.flag
            ),
          };
        }

        return {
          id: `${index}`,
          name,
          result: formatLaboratoryValue(value),
          unit: "—",
          referenceRange: "—",
          flag: "—",
        };
      }
    );
  }

  return [];
}

function getLaboratoryFlagClass(
  flag: string
): string {
  const normalized = flag
    .trim()
    .toUpperCase();

  if (normalized === "NORMAL") {
    return "bg-green-50 text-green-700";
  }

  if (normalized === "HIGH") {
    return "bg-red-50 text-red-700";
  }

  if (normalized === "LOW") {
    return "bg-amber-50 text-amber-700";
  }

  if (normalized === "CRITICAL") {
    return "bg-red-100 text-red-800";
  }

  return "bg-gray-100 text-gray-600";
}

function mapApiPatientToRecord(
  apiPatient: any
): PatientRecord {
  const encounters: PatientEncounter[] =
    Array.isArray(apiPatient?.encounters)
      ? apiPatient.encounters
      : [];

  const latestEncounter = encounters[0];
  const previousEncounter = encounters[1];

  const currentSlitLamp = {
    od: latestEncounter?.slitLampOD ?? "",
    os: latestEncounter?.slitLampOS ?? "",
  };

  const currentRefraction = {
    od: safeRefraction(
      latestEncounter?.refractionOD
    ),
    os: safeRefraction(
      latestEncounter?.refractionOS
    ),
  };

  const previousRefraction = previousEncounter
    ? {
        date: formatEncounterDate(
          previousEncounter.createdAt
        ),
        od: safeRefraction(
          previousEncounter.refractionOD
        ),
        os: safeRefraction(
          previousEncounter.refractionOS
        ),
      }
    : undefined;

  const diagnostics: PatientDiagnostic[] =
    Array.isArray(apiPatient?.diagnostics)
      ? apiPatient.diagnostics.map(
          (
            diagnostic: any
          ): PatientDiagnostic => ({
            id: diagnostic.id,
            name: diagnostic.name ?? "",
            price: Number(
              diagnostic.price ?? 0
            ),
            status:
              diagnostic.status ===
              "completed"
                ? "completed"
                : diagnostic.status ===
                  "ready_for_test"
                ? "ready_for_test"
                : "ordered",
            findings:
              diagnostic.findings ??
              undefined,
            interpretation:
              diagnostic.interpretation ??
              undefined,
            completedAt:
              diagnostic.completedAt ??
              undefined,
          })
        )
      : [];

  const laboratoryResults: PatientLaboratoryResult[] =
    Array.isArray(
      apiPatient?.laboratoryResults
    )
      ? apiPatient.laboratoryResults.map(
          (
            result: any
          ): PatientLaboratoryResult => ({
            id: result.id,
            labOrderId:
              result.labOrderId ?? "",
            testName:
              result.testName ?? "",
            specimenType:
              result.specimenType ??
              undefined,
            sampleId:
              result.sampleId ??
              undefined,
            priority:
              result.priority ??
              undefined,
            status:
              result.status ??
              "COMPLETED",
            resultData:
              result.resultData ??
              [],
            laboratoryComments:
              result.laboratoryComments ??
              undefined,
            verifiedAt:
              result.verifiedAt ??
              undefined,
            createdAt:
              result.createdAt ??
              undefined,
          })
        )
      : [];

  const history: PatientHistoryItem[] =
    encounters.map(
      (
        encounter: PatientEncounter
      ): PatientHistoryItem => {
        const details = [
          encounter.diagnosis
            ? `Diagnosis: ${encounter.diagnosis}`
            : "No diagnosis recorded.",

          encounter.slitLampOD ||
          encounter.slitLampOS
            ? "Slit lamp findings recorded."
            : null,

          encounter.refractionOD ||
          encounter.refractionOS
            ? "Refraction recorded."
            : null,
        ]
          .filter(Boolean)
          .join(" ");

        return {
          date: formatEncounterDate(
            encounter.createdAt
          ),
          title:
            encounter.status ===
            "completed"
              ? "Completed Consultation"
              : "Consultation Draft",
          details:
            details ||
            "Consultation record saved.",
        };
      }
    );

  if (apiPatient?.vitals) {
    const vitals =
      apiPatient.vitals as PatientVitals;

    const triageDetails = [
      vitals.primaryComplaint
        ? `Complaint: ${vitals.primaryComplaint}`
        : null,

      `VA: OD ${
        vitals.visualAcuityOD || "—"
      }, OS ${
        vitals.visualAcuityOS || "—"
      }`,

      vitals.iopOD !== undefined ||
      vitals.iopOS !== undefined
        ? `IOP: OD ${
            vitals.iopOD ?? "—"
          } / OS ${
            vitals.iopOS ?? "—"
          } mmHg`
        : null,
    ]
      .filter(Boolean)
      .join(" • ");

    history.push({
      date: formatEncounterDate(
        vitals.recordedAt
      ),
      title: "Triage & Vitals",
      details:
        triageDetails ||
        "Triage information recorded.",
    });
  }

  history.sort(
    (
      a: PatientHistoryItem,
      b: PatientHistoryItem
    ) => {
      const parseDate = (
        value: string
      ): number => {
        const [day, month, year] = value
          .split("/")
          .map(Number);

        if (!day || !month || !year) {
          return Number.NaN;
        }

        return new Date(
          year,
          month - 1,
          day
        ).getTime();
      };

      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);

      if (
        Number.isNaN(dateA) ||
        Number.isNaN(dateB)
      ) {
        return 0;
      }

      return dateB - dateA;
    }
  );

  return {
    id: apiPatient.patientId,
    name: apiPatient.fullName ?? "",
    age: apiPatient.age ?? 0,
    gender: apiPatient.gender ?? "",
    mrn: apiPatient.patientId,

    allergies:
      typeof apiPatient.allergies ===
      "string"
        ? apiPatient.allergies
            .split(",")
            .map(
              (item: string) =>
                item.trim()
            )
            .filter(Boolean)
        : Array.isArray(
            apiPatient.allergies
          )
        ? apiPatient.allergies
        : [],

    vitals: apiPatient.vitals,
    diagnostics,
    laboratoryResults,
    history,
    imaging: [],

    slitLamp: currentSlitLamp,
    refraction: currentRefraction,
    previousRefraction,

    diagnosis:
      latestEncounter?.diagnosis ?? "",
  };
}

function TriageSummary({
  vitals,
}: {
  vitals?: PatientRecord["vitals"];
}) {
  if (!vitals) {
    return (
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm text-gray-500">
          No triage information available.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            Triage & Vitals
          </h3>

          <p className="text-xs text-gray-500">
            Recorded{" "}
            {formatEncounterDate(
              vitals.recordedAt
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Visual Acuity OD
          </p>

          <p className="mt-1 font-medium">
            {vitals.visualAcuityOD || "—"}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Visual Acuity OS
          </p>

          <p className="mt-1 font-medium">
            {vitals.visualAcuityOS || "—"}
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            IOP OD
          </p>

          <p className="mt-1 font-medium">
            {vitals.iopOD ?? "—"} mmHg
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            IOP OS
          </p>

          <p className="mt-1 font-medium">
            {vitals.iopOS ?? "—"} mmHg
          </p>
        </div>
      </div>

      {vitals.primaryComplaint && (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-700">
            Primary Complaint
          </p>

          <p className="mt-1 text-sm text-blue-900">
            {vitals.primaryComplaint}
          </p>
        </div>
      )}
    </div>
  );
}

function DiagnosticResults({
  diagnostics,
}: {
  diagnostics: PatientDiagnostic[];
}) {
  if (!diagnostics.length) {
    return (
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-gray-400" />

          <h3 className="font-semibold text-gray-900">
            Diagnostic Results
          </h3>
        </div>

        <p className="mt-3 text-sm text-gray-500">
          No diagnostic tests have been
          ordered.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-gray-500" />

        <h3 className="font-semibold text-gray-900">
          Diagnostic Results
        </h3>
      </div>

      <div className="mt-4 space-y-3">
        {diagnostics.map((diagnostic) => (
          <div
            key={diagnostic.id}
            className="rounded-lg border p-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">
                  {diagnostic.name}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  ₦
                  {diagnostic.price.toLocaleString()}
                </p>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  diagnostic.status ===
                  "completed"
                    ? "bg-green-100 text-green-700"
                    : diagnostic.status ===
                      "ready_for_test"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {diagnostic.status ===
                "ready_for_test"
                  ? "Ready for Test"
                  : diagnostic.status
                      .charAt(0)
                      .toUpperCase() +
                    diagnostic.status.slice(1)}
              </span>
            </div>

            {diagnostic.findings && (
              <p className="mt-3 text-sm text-gray-700">
                <strong>
                  Findings:
                </strong>{" "}
                {diagnostic.findings}
              </p>
            )}

            {diagnostic.interpretation && (
              <p className="mt-2 text-sm text-gray-700">
                <strong>
                  Interpretation:
                </strong>{" "}
                {diagnostic.interpretation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LaboratoryResults({
  results,
}: {
  results: PatientLaboratoryResult[];
}) {
  if (!results.length) {
    return (
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-gray-400" />

          <h3 className="font-semibold text-gray-900">
            Laboratory Results
          </h3>
        </div>

        <p className="mt-3 text-sm text-gray-500">
          No completed laboratory results are
          available.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-gray-500" />

            <h3 className="font-semibold text-gray-900">
              Laboratory Results
            </h3>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Completed and verified laboratory
            investigations.
          </p>
        </div>

        <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
          {results.length}{" "}
          {results.length === 1
            ? "Result"
            : "Results"}
        </span>
      </div>

      <div className="mt-4 space-y-5">
        {results.map((result) => {
          const resultRows =
            getLaboratoryResultRows(
              result.resultData
            );

          return (
            <div
              key={result.id}
              className="overflow-hidden rounded-xl border border-gray-200"
            >
              {/* Laboratory result header */}
              <div className="border-b bg-gray-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">
                      {result.testName ||
                        "Laboratory Test"}
                    </h4>

                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600">
                      {result.specimenType && (
                        <span>
                          Specimen:{" "}
                          <strong className="font-medium text-gray-900">
                            {
                              result.specimenType
                            }
                          </strong>
                        </span>
                      )}

                      {result.sampleId && (
                        <span>
                          Sample ID:{" "}
                          <strong className="font-medium text-gray-900">
                            {result.sampleId}
                          </strong>
                        </span>
                      )}

                      {result.priority && (
                        <span>
                          Priority:{" "}
                          <strong className="font-medium text-gray-900">
                            {result.priority}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                    <Check className="h-3.5 w-3.5" />
                    Verified
                  </span>
                </div>
              </div>

              {/* Laboratory parameters */}
              {resultRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-180px">
                    <thead>
                      <tr className="border-b bg-white text-left">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Parameter
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Result
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Unit
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Reference Range
                        </th>

                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Flag
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {resultRows.map(
                        (row) => (
                          <tr
                            key={row.id}
                            className="border-b last:border-b-0 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {row.name}
                            </td>

                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {row.result}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600">
                              {row.unit}
                            </td>

                            <td className="px-4 py-3 text-sm text-gray-600">
                              {
                                row.referenceRange
                              }
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getLaboratoryFlagClass(
                                  row.flag
                                )}`}
                              >
                                {row.flag}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4">
                  <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                    No result parameters were
                    recorded.
                  </p>
                </div>
              )}

              {/* Laboratory comments */}
              {result.laboratoryComments && (
                <div className="border-t border-gray-200 p-4">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Laboratory Comments
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-900">
                      {
                        result.laboratoryComments
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Result metadata */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 border-t bg-gray-50 px-4 py-3 text-xs text-gray-500">
                {result.verifiedAt && (
                  <span>
                    Verified:{" "}
                    <strong className="font-medium text-gray-700">
                      {formatResultDate(
                        result.verifiedAt
                      )}
                    </strong>
                  </span>
                )}

                {result.createdAt && (
                  <span>
                    Result entered:{" "}
                    <strong className="font-medium text-gray-700">
                      {formatResultDate(
                        result.createdAt
                      )}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function OphthalmologyConsultation() {
  const params = useParams();

  const patientId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : "";

  const [patient, setPatient] =
    useState<PatientRecord | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [activeTab, setActiveTab] =
    useState<
      "slitLamp" | "refraction" | "diagnosis"
    >("slitLamp");

  const [slitLampOD, setSlitLampOD] =
    useState("");

  const [slitLampOS, setSlitLampOS] =
    useState("");

  const [refractionOD, setRefractionOD] =
    useState<Refraction>({
      sphere: "",
      cylinder: "",
      axis: "",
    });

  const [refractionOS, setRefractionOS] =
    useState<Refraction>({
      sphere: "",
      cylinder: "",
      axis: "",
    });

  const [diagnosis, setDiagnosis] =
    useState("");

  const [showHistory, setShowHistory] =
    useState(false);

  const [activeModal, setActiveModal] =
    useState<
      | "diagnostics"
      | "laboratory"
      | "surgery"
      | "prescription"
      | null
    >(null);

  const [
    selectedDiagnostics,
    setSelectedDiagnostics,
  ] = useState<string[]>([]);

  const [
    selectedLaboratoryTests,
    setSelectedLaboratoryTests,
  ] = useState<string[]>([]);

  const [labPriority, setLabPriority] =
    useState<LabOrderPriority>("NORMAL");

  const [labClinicalNotes, setLabClinicalNotes] =
    useState("");

  const [
    isSubmittingLabOrders,
    setIsSubmittingLabOrders,
  ] = useState(false);

  const [surgeryType, setSurgeryType] =
    useState("");

  const [surgeryNotes, setSurgeryNotes] =
    useState("");

  const [medication, setMedication] =
    useState("");

  const [dosage, setDosage] =
    useState("");

  const [frequency, setFrequency] =
    useState("");

  const [duration, setDuration] =
    useState("");

  const [quantity, setQuantity] =
    useState("");

  const [pricePerUnit, setPricePerUnit] =
    useState("");

  const [isPending, startTransition] =
    useTransition();

  const [feedback, setFeedback] =
    useState("");

  useEffect(() => {
    if (!patientId) return;

    let cancelled = false;

    async function loadPatient() {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/patients/${encodeURIComponent(
            patientId
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (response.status === 401) {
          throw new Error(
            "You are not authorized to view this patient."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to view this patient."
          );
        }

        if (response.status === 404) {
          throw new Error(
            "Patient record was not found."
          );
        }

        if (!response.ok) {
          throw new Error(
            "Failed to load patient record."
          );
        }

        const result =
          await response.json();

        if (!result?.patient) {
          throw new Error(
            "Patient record was not returned."
          );
        }

        const mappedPatient =
          mapApiPatientToRecord(
            result.patient
          );

        if (cancelled) return;

        setPatient(mappedPatient);

        setSlitLampOD(
          mappedPatient.slitLamp.od
        );

        setSlitLampOS(
          mappedPatient.slitLamp.os
        );

        setRefractionOD(
          mappedPatient.refraction.od
        );

        setRefractionOS(
          mappedPatient.refraction.os
        );

        setDiagnosis(
          mappedPatient.diagnosis
        );
      } catch (error) {
        console.error(
          "Failed to load patient:",
          error
        );

        if (!cancelled) {
          setPatient(null);

          setFeedback(
            error instanceof Error
              ? error.message
              : "Failed to load patient."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPatient();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  function snapToQuarter(
    value: string
  ): string {
    if (!value.trim()) return "";

    const numeric = Number(value);

    if (Number.isNaN(numeric)) {
      return value;
    }

    const snapped =
      Math.round(numeric * 4) / 4;

    return snapped.toFixed(2);
  }

  function validateAndFormatAxis(
    value: string
  ): string {
    if (!value.trim()) return "";

    const numeric = Number(value);

    if (
      Number.isNaN(numeric) ||
      numeric < 0 ||
      numeric > 180
    ) {
      return value;
    }

    return String(Math.round(numeric));
  }

  function handleRefractionBlur(
    eye: "OD" | "OS",
    field: keyof Refraction
  ) {
    const setter =
      eye === "OD"
        ? setRefractionOD
        : setRefractionOS;

    const current =
      eye === "OD"
        ? refractionOD
        : refractionOS;

    const value = current[field];

    let formatted = value;

    if (field === "axis") {
      formatted =
        validateAndFormatAxis(value);
    } else {
      formatted = snapToQuarter(value);
    }

    setter({
      ...current,
      [field]: formatted,
    });
  }

  function handleReferToOptometry() {
    if (!patientId) return;

    startTransition(async () => {
      try {
        const result = await referPatientToOptometry(patientId);

        setFeedback(result.message);

        if (result.success) {
          setPatient((current) =>
            current
              ? current
              : current
          );
        }
      } catch (error) {
        console.error(
          "Failed to refer patient to Optometry:",
          error
        );

        setFeedback(
          error instanceof Error
            ? error.message
            : "Failed to refer patient to Optometry."
        );
      }
    });
  }

  function handleSave(
    status: "draft" | "completed"
  ) {
    if (!patientId) return;

    if (
      status === "completed" &&
      !diagnosis.trim()
    ) {
      setFeedback(
        "Please enter a diagnosis before completing the encounter."
      );
      return;
    }

    startTransition(async () => {
      try {
        const result =
          await saveConsultationEncounter({
            patientId,
            slitLampOD,
            slitLampOS,
            refractionOD,
            refractionOS,
            diagnosis,
            status,
          });

        if (
          result &&
          typeof result === "object" &&
          "error" in result &&
          result.error
        ) {
          throw new Error(
            String(result.error)
          );
        }

        setFeedback(
          status === "completed"
            ? "Consultation completed successfully."
            : "Consultation draft saved successfully."
        );
      } catch (error) {
        console.error(
          "Failed to save consultation:",
          error
        );

        setFeedback(
          error instanceof Error
            ? error.message
            : "Failed to save consultation."
        );
      }
    });
  }

  function toggleDiagnostic(
    name: string
  ) {
    setSelectedDiagnostics((current) =>
      current.includes(name)
        ? current.filter(
            (item) => item !== name
          )
        : [...current, name]
    );
  }

  function toggleLaboratoryTest(
    code: string
  ) {
    setSelectedLaboratoryTests(
      (current) =>
        current.includes(code)
          ? current.filter(
              (item) => item !== code
            )
          : [...current, code]
    );
  }

  function handleSubmitDiagnostics() {
    if (!patientId) return;

    if (!selectedDiagnostics.length) {
      setFeedback(
        "Please select at least one diagnostic test."
      );
      return;
    }

    startTransition(async () => {
      try {
        for (const testName of selectedDiagnostics) {
          const test =
            DIAGNOSTIC_TESTS.find(
              (item) =>
                item.name === testName
            );

          if (!test) continue;

          const result =
            await createDiagnosticOrder({
              patientCode: patientId,
              name: test.name,
              price: test.price,
            });

          if (
            result &&
            typeof result === "object" &&
            "error" in result &&
            result.error
          ) {
            throw new Error(
              String(result.error)
            );
          }

          if (
            result &&
            typeof result === "object" &&
            "success" in result &&
            result.success === false
          ) {
            throw new Error(
              result.message ||
                "Failed to create diagnostic order."
            );
          }
        }

        setFeedback(
          "Diagnostic orders created successfully."
        );

        setSelectedDiagnostics([]);
        setActiveModal(null);
      } catch (error) {
        console.error(
          "Failed to create diagnostic orders:",
          error
        );

        setFeedback(
          error instanceof Error
            ? error.message
            : "Failed to create diagnostic orders."
        );
      }
    });
  }

  async function handleSubmitLaboratoryOrders() {
    if (!patientId) return;

    if (!selectedLaboratoryTests.length) {
      setFeedback(
        "Please select at least one laboratory test."
      );
      return;
    }

    setIsSubmittingLabOrders(true);

    try {
      const selectedTests =
        LABORATORY_TESTS.filter((test) =>
          selectedLaboratoryTests.includes(
            test.code
          )
        );

      for (const test of selectedTests) {
        const result =
          await createLabOrder({
            patientCode: patientId,
            testCode: test.code,
            testName: test.name,
            specimenType:
              test.specimenType,
            price: test.price,
            priority: labPriority,
            clinicalNotes:
              labClinicalNotes,
          });

        if (!result.success) {
          throw new Error(
            result.message ||
              `Failed to order ${test.name}.`
          );
        }
      }

      setFeedback(
        selectedTests.length === 1
          ? "Laboratory test ordered successfully."
          : `${selectedTests.length} laboratory tests ordered successfully.`
      );

      setSelectedLaboratoryTests([]);
      setLabPriority("NORMAL");
      setLabClinicalNotes("");
      setActiveModal(null);
    } catch (error) {
      console.error(
        "Failed to create laboratory orders:",
        error
      );

      setFeedback(
        error instanceof Error
          ? error.message
          : "Failed to create laboratory orders."
      );
    } finally {
      setIsSubmittingLabOrders(false);
    }
  }

  function handleSavePrescription() {
    if (!patientId) return;

    if (!medication.trim()) {
      setFeedback(
        "Please enter the medication name."
      );
      return;
    }

    if (!dosage.trim()) {
      setFeedback(
        "Please enter the dosage."
      );
      return;
    }

    if (!frequency.trim()) {
      setFeedback(
        "Please enter the frequency."
      );
      return;
    }

    if (!duration.trim()) {
      setFeedback(
        "Please enter the duration."
      );
      return;
    }

    if (!quantity.trim()) {
      setFeedback(
        "Please enter the quantity."
      );
      return;
    }

    if (!pricePerUnit.trim()) {
      setFeedback(
        "Please enter the price per unit."
      );
      return;
    }

    const parsedQuantity =
      Number(quantity);

    const parsedPrice =
      Number(pricePerUnit);

    if (
      Number.isNaN(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setFeedback(
        "Quantity must be a valid number."
      );
      return;
    }

    if (
      Number.isNaN(parsedPrice) ||
      parsedPrice < 0
    ) {
      setFeedback(
        "Price per unit must be a valid number."
      );
      return;
    }

    startTransition(async () => {
      try {
        const result =
          await createPrescription({
            patientCode: patientId,
            drugName: medication,
            dosage: `${dosage} • ${frequency} • ${duration}`,
            quantity: parsedQuantity,
            pricePerUnit: parsedPrice,
          });

        if (
          result &&
          typeof result === "object" &&
          "error" in result &&
          result.error
        ) {
          throw new Error(
            String(result.error)
          );
        }

        if (
          result &&
          typeof result === "object" &&
          "success" in result &&
          result.success === false
        ) {
          throw new Error(
            result.message ||
              "Failed to issue prescription."
          );
        }

        setFeedback(
          "Prescription issued successfully."
        );

        setMedication("");
        setDosage("");
        setFrequency("");
        setDuration("");
        setQuantity("");
        setPricePerUnit("");

        setActiveModal(null);
      } catch (error) {
        console.error(
          "Failed to create prescription:",
          error
        );

        setFeedback(
          error instanceof Error
            ? error.message
            : "Failed to issue prescription."
        );
      }
    });
  }

  function handleScheduleSurgery() {
    setFeedback(
      "Surgery scheduling is not connected yet. No appointment was created."
    );
  }

  const selectedLaboratoryTotal =
    LABORATORY_TESTS.filter((test) =>
      selectedLaboratoryTests.includes(
        test.code
      )
    ).reduce(
      (total, test) =>
        total + test.price,
      0
    );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />

          <p className="mt-3 text-sm text-gray-500">
            Loading patient record...
          </p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Patient unavailable
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {feedback ||
              "The patient record could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                Ophthalmology Consultation
              </h1>

              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {patient.mrn}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              {patient.name} • {patient.age}{" "}
              years • {patient.gender}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowHistory(true)
            }
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <History className="h-4 w-4" />
            History
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-6">
        <TriageSummary
          vitals={patient.vitals}
        />

        <DiagnosticResults
          diagnostics={patient.diagnostics}
        />

        <LaboratoryResults
          results={patient.laboratoryResults}
        />

        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-4">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() =>
                  setActiveTab("slitLamp")
                }
                className={`border-b-2 py-4 text-sm font-medium ${
                  activeTab === "slitLamp"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500"
                }`}
              >
                Slit Lamp
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab("refraction")
                }
                className={`border-b-2 py-4 text-sm font-medium ${
                  activeTab === "refraction"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500"
                }`}
              >
                Refraction
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab("diagnosis")
                }
                className={`border-b-2 py-4 text-sm font-medium ${
                  activeTab === "diagnosis"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500"
                }`}
              >
                Diagnosis & Plan
              </button>
            </div>
          </div>

          <div className="p-5">
            {activeTab === "slitLamp" && (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Right Eye (OD)
                  </label>

                  <textarea
                    value={slitLampOD}
                    onChange={(event) =>
                      setSlitLampOD(
                        event.target.value
                      )
                    }
                    rows={8}
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter right eye slit lamp findings..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Left Eye (OS)
                  </label>

                  <textarea
                    value={slitLampOS}
                    onChange={(event) =>
                      setSlitLampOS(
                        event.target.value
                      )
                    }
                    rows={8}
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter left eye slit lamp findings..."
                  />
                </div>
              </div>
            )}

            {activeTab === "refraction" && (
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  {[
                    {
                      eye: "OD" as const,
                      value: refractionOD,
                      setValue:
                        setRefractionOD,
                    },
                    {
                      eye: "OS" as const,
                      value: refractionOS,
                      setValue:
                        setRefractionOS,
                    },
                  ].map(
                    ({
                      eye,
                      value,
                      setValue,
                    }) => (
                      <div
                        key={eye}
                        className="rounded-xl border p-4"
                      >
                        <h3 className="mb-4 font-semibold text-gray-900">
                          {eye === "OD"
                            ? "Right Eye (OD)"
                            : "Left Eye (OS)"}
                        </h3>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
                              Sphere
                            </label>

                            <input
                              value={
                                value.sphere
                              }
                              onChange={(
                                event
                              ) =>
                                setValue({
                                  ...value,
                                  sphere:
                                    event
                                      .target
                                      .value,
                                })
                              }
                              onBlur={() =>
                                handleRefractionBlur(
                                  eye,
                                  "sphere"
                                )
                              }
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
                              Cylinder
                            </label>

                            <input
                              value={
                                value.cylinder
                              }
                              onChange={(
                                event
                              ) =>
                                setValue({
                                  ...value,
                                  cylinder:
                                    event
                                      .target
                                      .value,
                                })
                              }
                              onBlur={() =>
                                handleRefractionBlur(
                                  eye,
                                  "cylinder"
                                )
                              }
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">
                              Axis
                            </label>

                            <input
                              value={
                                value.axis
                              }
                              onChange={(
                                event
                              ) =>
                                setValue({
                                  ...value,
                                  axis:
                                    event
                                      .target
                                      .value,
                                })
                              }
                              onBlur={() =>
                                handleRefractionBlur(
                                  eye,
                                  "axis"
                                )
                              }
                              className="w-full rounded-lg border px-3 py-2 text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {patient.previousRefraction && (
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <h3 className="font-semibold text-gray-900">
                      Previous Refraction
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      {
                        patient
                          .previousRefraction
                          .date
                      }
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-2 text-sm font-medium">
                          Right Eye (OD)
                        </p>

                        <p className="text-sm text-gray-600">
                          Sphere:{" "}
                          {
                            patient
                              .previousRefraction
                              .od.sphere
                          }{" "}
                          • Cylinder:{" "}
                          {
                            patient
                              .previousRefraction
                              .od.cylinder
                          }{" "}
                          • Axis:{" "}
                          {
                            patient
                              .previousRefraction
                              .od.axis
                          }
                        </p>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-medium">
                          Left Eye (OS)
                        </p>

                        <p className="text-sm text-gray-600">
                          Sphere:{" "}
                          {
                            patient
                              .previousRefraction
                              .os.sphere
                          }{" "}
                          • Cylinder:{" "}
                          {
                            patient
                              .previousRefraction
                              .os.cylinder
                          }{" "}
                          • Axis:{" "}
                          {
                            patient
                              .previousRefraction
                              .os.axis
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "diagnosis" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Diagnosis
                </label>

                <textarea
                  value={diagnosis}
                  onChange={(event) =>
                    setDiagnosis(
                      event.target.value
                    )
                  }
                  rows={8}
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter diagnosis and clinical plan..."
                />
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Recent History
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowHistory(true)
                }
                className="text-sm font-medium text-blue-600"
              >
                View all
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {patient.history
                .slice(0, 3)
                .map((item, index) => (
                  <div
                    key={`${item.date}-${item.title}-${index}`}
                    className="rounded-lg bg-gray-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">
                        {item.title}
                      </p>

                      <span className="text-xs text-gray-500">
                        {item.date}
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-gray-600">
                      {item.details}
                    </p>
                  </div>
                ))}

              {!patient.history.length && (
                <p className="text-sm text-gray-500">
                  No history available.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <h3 className="font-semibold text-gray-900">
              Allergies
            </h3>

            {patient.allergies.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {patient.allergies.map(
                  (allergy) => (
                    <span
                      key={allergy}
                      className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700"
                    >
                      {allergy}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                No known allergies recorded.
              </p>
            )}

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900">
                Diagnostic Status
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                {patient.diagnostics.length
                  ? `${
                      patient.diagnostics
                        .length
                    } diagnostic order${
                      patient.diagnostics
                        .length === 1
                        ? ""
                        : "s"
                    } on record.`
                  : "No diagnostic orders on record."}
              </p>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-900">
                Laboratory Status
              </h4>

              <p className="mt-2 text-sm text-gray-500">
                {patient.laboratoryResults
                  .length
                  ? `${
                      patient.laboratoryResults
                        .length
                    } verified laboratory result${
                      patient.laboratoryResults
                        .length === 1
                        ? ""
                        : "s"
                    } on record.`
                  : "No verified laboratory results on record."}
              </p>
            </div>
          </div>
        </section>
      </main>

      {feedback && (
        <div className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
          <div className="flex items-start justify-between gap-4 rounded-xl border bg-white p-4 shadow-lg">
            <p className="text-sm text-gray-700">
              {feedback}
            </p>

            <button
              type="button"
              onClick={() =>
                setFeedback("")
              }
              className="text-gray-400 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() =>
              handleSave("draft")
            }
            disabled={
              isPending ||
              isSubmittingLabOrders
            }
            className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Draft
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setActiveModal(
                  "diagnostics"
                )
              }
              disabled={
                isPending ||
                isSubmittingLabOrders
              }
              className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ClipboardList className="h-4 w-4" />
              Order Diagnostics
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveModal(
                  "laboratory"
                )
              }
              disabled={
                isPending ||
                isSubmittingLabOrders
              }
              className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ClipboardList className="h-4 w-4" />
              Order Laboratory Tests
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveModal("surgery")
              }
              disabled={
                isPending ||
                isSubmittingLabOrders
              }
              className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              Schedule Surgery
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveModal(
                  "prescription"
                )
              }
              disabled={
                isPending ||
                isSubmittingLabOrders
              }
              className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Pill className="h-4 w-4" />
              Issue Prescription
            </button>

            <button
              type="button"
              onClick={handleReferToOptometry}
              disabled={
                isPending ||
                isSubmittingLabOrders
              }
              className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refer to Optometry
            </button>

            <button
              type="button"
              onClick={() =>
                handleSave("completed")
              }
              disabled={
                isPending ||
                isSubmittingLabOrders
              }
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Complete Encounter
            </button>
          </div>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Patient History
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {patient.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowHistory(false)
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5">
              <div className="space-y-4">
                {patient.history.map(
                  (item, index) => (
                    <div
                      key={`${item.date}-${item.title}-${index}`}
                      className="relative rounded-xl border p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {item.title}
                          </h3>

                          <p className="mt-1 text-xs text-gray-500">
                            {item.date}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-gray-600">
                        {item.details}
                      </p>
                    </div>
                  )
                )}

                {!patient.history.length && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No patient history available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === "diagnostics" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Order Diagnostics
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select the tests required for this patient.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 p-5">
              {DIAGNOSTIC_TESTS.map(
                (test) => {
                  const selected =
                    selectedDiagnostics.includes(
                      test.name
                    );

                  return (
                    <button
                      key={test.name}
                      type="button"
                      onClick={() =>
                        toggleDiagnostic(
                          test.name
                        )
                      }
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
                        selected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {test.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          ₦
                          {test.price.toLocaleString()}
                        </p>
                      </div>

                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {selected && (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleSubmitDiagnostics
                }
                disabled={
                  isPending ||
                  !selectedDiagnostics.length
                }
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending
                  ? "Ordering..."
                  : "Order Selected"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "laboratory" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Order Laboratory Tests
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select the specimen-based laboratory tests required for this patient.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (
                    !isSubmittingLabOrders
                  ) {
                    setActiveModal(null);
                  }
                }}
                disabled={
                  isSubmittingLabOrders
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5">
              <div className="space-y-3">
                {LABORATORY_TESTS.map(
                  (test) => {
                    const selected =
                      selectedLaboratoryTests.includes(
                        test.code
                      );

                    return (
                      <button
                        key={test.code}
                        type="button"
                        onClick={() =>
                          toggleLaboratoryTest(
                            test.code
                          )
                        }
                        disabled={
                          isSubmittingLabOrders
                        }
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                selected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {selected && (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </div>

                            <div>
                              <p className="font-medium text-gray-900">
                                {test.name}
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                Code:{" "}
                                {test.code}
                              </p>

                              <p className="text-sm text-gray-500">
                                Specimen:{" "}
                                {
                                  test.specimenType
                                }
                              </p>
                            </div>
                          </div>

                          <p className="shrink-0 font-medium text-gray-900">
                            ₦
                            {test.price.toLocaleString()}
                          </p>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Priority
                </label>

                <select
                  value={labPriority}
                  onChange={(event) =>
                    setLabPriority(
                      event.target
                        .value as LabOrderPriority
                    )
                  }
                  disabled={
                    isSubmittingLabOrders
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
                >
                  <option value="NORMAL">
                    Normal
                  </option>

                  <option value="URGENT">
                    Urgent
                  </option>

                  <option value="STAT">
                    STAT
                  </option>
                </select>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Clinical Notes
                </label>

                <textarea
                  value={labClinicalNotes}
                  onChange={(event) =>
                    setLabClinicalNotes(
                      event.target.value
                    )
                  }
                  disabled={
                    isSubmittingLabOrders
                  }
                  rows={4}
                  placeholder="Optional clinical information for the laboratory..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
                />
              </div>

              {selectedLaboratoryTests.length >
                0 && (
                <div className="mt-5 rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Selected tests
                    </span>

                    <span className="font-medium text-gray-900">
                      {
                        selectedLaboratoryTests.length
                      }
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Laboratory charges
                    </span>

                    <span className="font-semibold text-gray-900">
                      ₦
                      {selectedLaboratoryTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                disabled={
                  isSubmittingLabOrders
                }
                className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleSubmitLaboratoryOrders
                }
                disabled={
                  isSubmittingLabOrders ||
                  !selectedLaboratoryTests.length
                }
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingLabOrders
                  ? "Ordering..."
                  : "Order Laboratory Tests"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "surgery" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Schedule Surgery
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select the planned procedure.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Surgery Type
                </label>

                <select
                  value={surgeryType}
                  onChange={(event) =>
                    setSurgeryType(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                >
                  <option value="">
                    Select surgery
                  </option>

                  {SURGERY_OPTIONS.map(
                    (option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Notes
                </label>

                <textarea
                  value={surgeryNotes}
                  onChange={(event) =>
                    setSurgeryNotes(
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                  placeholder="Add surgery planning notes..."
                />
              </div>

              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
                Surgery scheduling is not connected to the appointment system yet.
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  handleScheduleSurgery();
                  setActiveModal(null);
                }}
                disabled={!surgeryType}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "prescription" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Issue Prescription
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the medication details.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 p-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Medication
                </label>

                <input
                  value={medication}
                  onChange={(event) =>
                    setMedication(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                  placeholder="e.g. Timolol Eye Drops"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Dosage
                  </label>

                  <input
                    value={dosage}
                    onChange={(event) =>
                      setDosage(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="e.g. 1 drop"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Frequency
                  </label>

                  <input
                    value={frequency}
                    onChange={(event) =>
                      setFrequency(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="e.g. Twice daily"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Duration
                  </label>

                  <input
                    value={duration}
                    onChange={(event) =>
                      setDuration(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="e.g. 7 days"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Quantity
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-sm"
                    placeholder="1"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Price per Unit
                </label>

                <input
                  type="number"
                  min="0"
                  value={pricePerUnit}
                  onChange={(event) =>
                    setPricePerUnit(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t p-5">
              <button
                type="button"
                onClick={() =>
                  setActiveModal(null)
                }
                className="rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleSavePrescription
                }
                disabled={isPending}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {isPending
                  ? "Saving..."
                  : "Issue Prescription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}