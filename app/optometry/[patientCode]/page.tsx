"use client";

import React, {
  useEffect,
  useState,
  useTransition,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Save,
  User,
} from "lucide-react";

import { getOptometryPatient } from "@/app/actions/optometry";
import { saveOptometryEncounter } from "@/app/actions/optometry-encounter";
import { VISUAL_ACUITY_OPTIONS } from "@/lib/visual-acuity";

type Refraction = {
  sphere: string;
  cylinder: string;
  axis: string;
  add: string;
};

type RefractionSet = {
  objective: Refraction;
  subjective: Refraction;
};

function emptyRefractionSet(): RefractionSet {
  return {
    objective: emptyRefraction(),
    subjective: emptyRefraction(),
  };
}

function normalizeRefraction(value: unknown): Refraction {
  if (!value || typeof value !== "object") return emptyRefraction();
  const data = value as Partial<Refraction>;
  return {
    sphere: String(data.sphere ?? ""),
    cylinder: String(data.cylinder ?? ""),
    axis: String(data.axis ?? ""),
    add: String(data.add ?? ""),
  };
}

function normalizeRefractionSet(value: unknown): RefractionSet {
  if (value && typeof value === "object" && ("objective" in value || "subjective" in value)) {
    const data = value as Partial<RefractionSet>;
    return {
      objective: normalizeRefraction(data.objective),
      subjective: normalizeRefraction(data.subjective),
    };
  }

  // Older records stored one set of values; retain them as subjective refraction.
  return {
    objective: emptyRefraction(),
    subjective: normalizeRefraction(value),
  };
}

type PatientData = {
  id: string;
  patientCode: string;
  fullName: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  allergies: string | null;
  status: string;
  optometryStatus:
    | "referred"
    | "in_examination"
    | "completed"
    | null;

  vitals: {
    visualAcuityOD: string;
    visualAcuityOS: string;
    visualAcuityOU: string;
    visualAcuityODPinhole: string;
    visualAcuityOSPinhole: string;
    visualAcuityODGlasses: string;
    visualAcuityOSGlasses: string;
    visualAcuityOUGlasses: string;
    visualAcuityODNear: string;
    visualAcuityOSNear: string;
    visualAcuityOUNear: string;
    withCorrection: boolean;
    iopOD: number | null;
    iopOS: number | null;
    primaryComplaint: string;
    symptoms: unknown;
    severity: string | null;
    durationText: string | null;
    recordedAt: string | null;
  } | null;

  previousOptometryEncounter: {
    id: string;

    visualAcuityOD: string;
    visualAcuityOS: string;
    visualAcuityOU: string;
    withCorrection: boolean;

    slitLampOD: string;
    slitLampOS: string;

    refractionOD: RefractionSet | Refraction | null;
    refractionOS: RefractionSet | Refraction | null;

    diagnosis: string;
    status: "draft" | "completed";
    createdAt: string;
  } | null;
};

function emptyRefraction(): Refraction {
  return {
    sphere: "",
    cylinder: "",
    axis: "",
    add: "",
  };
}

export default function OptometryExaminationPage() {
  const params = useParams();
  const router = useRouter();

  const patientCode = String(params.patientCode ?? "");

  const [patient, setPatient] =
    useState<PatientData | null>(null);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [isPending, startTransition] =
    useTransition();

  const [visualAcuityOD, setVisualAcuityOD] =
    useState("6/6");

  const [visualAcuityOS, setVisualAcuityOS] =
    useState("6/6");

  const [visualAcuityOU, setVisualAcuityOU] =
    useState("6/6");

  // Always keep this state boolean.
  const [withCorrection, setWithCorrection] =
    useState<boolean>(false);

  const [refractionOD, setRefractionOD] =
    useState<RefractionSet>(emptyRefractionSet());

  const [refractionOS, setRefractionOS] =
    useState<RefractionSet>(emptyRefractionSet());

  const [slitLampOD, setSlitLampOD] =
    useState("");

  const [slitLampOS, setSlitLampOS] =
    useState("");



  async function loadPatient() {
    setLoading(true);
    setError("");

    try {
      const result =
        await getOptometryPatient(patientCode);

      if (!result.success || !result.patient) {
        setError(
          result.message ??
            "Unable to load patient."
        );
        return;
      }

      const data =
        result.patient as PatientData;

      setPatient(data);

      /*
       * If an Optometry encounter already exists,
       * it becomes the source of truth for the
       * Optometry examination form.
       *
       * This allows saved drafts to survive
       * refreshes and page reloads.
       */
      const previous =
        data.previousOptometryEncounter;

      if (previous) {
        setVisualAcuityOD(
          previous.visualAcuityOD ||
            data.vitals?.visualAcuityOD ||
            "6/6"
        );

        setVisualAcuityOS(
          previous.visualAcuityOS ||
            data.vitals?.visualAcuityOS ||
            "6/6"
        );

        setVisualAcuityOU(
          previous.visualAcuityOU ||
            data.vitals?.visualAcuityOU ||
            "6/6"
        );

        // IMPORTANT:
        // Always convert the database value to a boolean.
        setWithCorrection(
          Boolean(previous.withCorrection)
        );

        setSlitLampOD(
          previous.slitLampOD || ""
        );

        setSlitLampOS(
          previous.slitLampOS || ""
        );

        setRefractionOD(
          normalizeRefractionSet(previous.refractionOD)
        );

        setRefractionOS(
          normalizeRefractionSet(previous.refractionOS)
        );
      } else if (data.vitals) {
        /*
         * First-time Optometry examination:
         * start with measurements captured during
         * triage.
         */
        setVisualAcuityOD(
          data.vitals.visualAcuityOD || "6/6"
        );

        setVisualAcuityOS(
          data.vitals.visualAcuityOS || "6/6"
        );

        setVisualAcuityOU(
          data.vitals.visualAcuityOU || "6/6"
        );

        // IMPORTANT:
        // Always convert the database value to a boolean.
        setWithCorrection(
          Boolean(data.vitals.withCorrection)
        );

        setRefractionOD(
          emptyRefraction()
        );

        setRefractionOS(
          emptyRefraction()
        );

        setSlitLampOD("");
        setSlitLampOS("");
      } else {
        /*
         * No previous Optometry encounter and
         * no triage vitals.
         */
        setVisualAcuityOD("6/6");
        setVisualAcuityOS("6/6");
        setVisualAcuityOU("6/6");
        setWithCorrection(false);

        setRefractionOD(
          emptyRefraction()
        );

        setRefractionOS(
          emptyRefraction()
        );

        setSlitLampOD("");
        setSlitLampOS("");
      }
    } catch (loadError) {
      console.error(
        "Failed to load Optometry patient:",
        loadError
      );

      setError(
        "Unable to load the patient record."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (patientCode) {
      loadPatient();
    }
  }, [patientCode]);

  function updateRefraction(
    eye: "OD" | "OS",
    method: "objective" | "subjective",
    field: keyof Refraction,
    value: string
  ) {
    const update = (current: RefractionSet): RefractionSet => ({
      ...current,
      [method]: {
        ...current[method],
        [field]: value,
      },
    });

    if (eye === "OD") {
      setRefractionOD(update);
    } else {
      setRefractionOS(update);
    }
  }

  function handleSave(
    status: "draft" | "completed"
  ) {
    setFeedback("");
    setError("");

    startTransition(async () => {
      try {
        const result =
          await saveOptometryEncounter({
            patientCode,

            visualAcuityOD,
            visualAcuityOS,
            visualAcuityOU,

            withCorrection,

            refractionOD,
            refractionOS,

            slitLampOD,
            slitLampOS,

            clinicalImpression: "",

            status,
          });

        if (!result.success) {
          setError(result.message);
          return;
        }

        setFeedback(result.message);

        /*
         * The completed assessment is now available
         * to the doctor for clinical review.
         */
        await loadPatient();
      } catch (saveError) {
        console.error(
          "Failed to save Optometry assessment:",
          saveError
        );

        setError(
          "Unable to save the Optometry assessment."
        );
      }
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6FB]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          Loading patient record...
        </div>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6FB] px-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
            <Eye className="h-5 w-5 text-rose-600" />
          </div>

          <h1 className="mt-4 text-lg font-black text-slate-900">
            Unable to load patient
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/optometry")
            }
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"
          >
            Return to Optometry
          </button>
        </div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  const assessmentCompleted =
    patient.optometryStatus === "completed";

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.push("/optometry")
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
              <img
                src="/Logo.png"
                alt="Sparkle Eye Specialist Hospital"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <h1 className="text-sm font-black text-slate-900">
                Optometry Examination
              </h1>

              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Vision Assessment &amp; Refraction
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 md:flex">
            <User className="h-4 w-4 text-blue-700" />

            <span className="text-xs font-bold text-blue-700">
              Optometrist
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                Patient
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                {patient.fullName}
              </h2>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>
                  Patient Code:{" "}
                  <strong className="text-slate-700">
                    {patient.patientCode}
                  </strong>
                </span>

                {patient.age !== null && (
                  <span>
                    Age:{" "}
                    <strong className="text-slate-700">
                      {patient.age}
                    </strong>
                  </span>
                )}

                {patient.gender && (
                  <span>
                    Gender:{" "}
                    <strong className="text-slate-700">
                      {patient.gender}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            <div>
              <StatusBadge
                status={
                  patient.optometryStatus
                }
              />
            </div>
          </div>

          {patient.allergies && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                Allergies
              </p>

              <p className="mt-1 text-sm font-medium text-amber-900">
                {patient.allergies}
              </p>
            </div>
          )}
        </section>

        {feedback && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            {feedback}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {error}
          </div>
        )}





        <section className="rounded-2xl border border-purple-200 bg-purple-50/40 shadow-sm">
          <SectionHeader
            icon={Eye}
            title="Visual Acuity Recorded by Nurse"
            description="Read-only triage measurements received from the nurse."
          />
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Unaided OD", value: patient?.vitals?.visualAcuityOD },
              { label: "Unaided OS", value: patient?.vitals?.visualAcuityOS },
              { label: "Unaided OU", value: patient?.vitals?.visualAcuityOU },
              { label: "Pinhole OD", value: patient?.vitals?.visualAcuityODPinhole },
              { label: "Pinhole OS", value: patient?.vitals?.visualAcuityOSPinhole },
              { label: "With glasses OD", value: patient?.vitals?.visualAcuityODGlasses },
              { label: "With glasses OS", value: patient?.vitals?.visualAcuityOSGlasses },
              { label: "With glasses OU", value: patient?.vitals?.visualAcuityOUGlasses },
              { label: "Near OD", value: patient?.vitals?.visualAcuityODNear },
              { label: "Near OS", value: patient?.vitals?.visualAcuityOSNear },
              { label: "Near OU", value: patient?.vitals?.visualAcuityOUNear },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-purple-100 bg-white px-4 py-3">
                <p className="text-xs font-medium text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{item.value || "Not recorded"}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={Eye}
            title="Visual Acuity"
            description="Record visual acuity measured during the Optometry assessment."
          />

          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <SelectField
              label="Right Eye (OD)"
              value={visualAcuityOD}
              onChange={setVisualAcuityOD}
              options={VISUAL_ACUITY_OPTIONS}
            />

            <SelectField
              label="Left Eye (OS)"
              value={visualAcuityOS}
              onChange={setVisualAcuityOS}
              options={VISUAL_ACUITY_OPTIONS}
            />

            <SelectField
              label="Both Eyes (OU)"
              value={visualAcuityOU}
              onChange={setVisualAcuityOU}
              options={VISUAL_ACUITY_OPTIONS}
            />
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={withCorrection}
                onChange={(event) =>
                  setWithCorrection(
                    event.target.checked
                  )
                }
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />

              <span>
                <span className="block text-sm font-bold text-slate-800">
                  With correction
                </span>

                <span className="block text-xs text-slate-500">
                  Visual acuity was measured with the patient's current correction.
                </span>
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <SectionHeader
            icon={FileText}
            title="Refraction"
            description="Record objective and subjective refraction separately for each eye."
          />

          <div className="grid gap-6 p-5 xl:grid-cols-2">
            <RefractionCard
              eye="OD"
              method="objective"
              refraction={refractionOD.objective}
              onChange={(field, value) =>
                updateRefraction("OD", "objective", field, value)
              }
            />

            <RefractionCard
              eye="OD"
              method="subjective"
              refraction={refractionOD.subjective}
              onChange={(field, value) =>
                updateRefraction("OD", "subjective", field, value)
              }
            />

            <RefractionCard
              eye="OS"
              method="objective"
              refraction={refractionOS.objective}
              onChange={(field, value) =>
                updateRefraction("OS", "objective", field, value)
              }
            />

            <RefractionCard
              eye="OS"
              method="subjective"
              refraction={refractionOS.subjective}
              onChange={(field, value) =>
                updateRefraction("OS", "subjective", field, value)
              }
            />
          </div>
        </section>





        <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-[#F4F6FB]/95 px-4 py-4 backdrop-blur md:-mx-8 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:justify-end">
            {!assessmentCompleted && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    handleSave("draft")
                  }
                  disabled={isPending}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSave("completed")
                  }
                  disabled={isPending}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}

                  Complete Assessment
                </button>
              </>
            )}

            {assessmentCompleted && (
              <button
                type="button"
                onClick={() =>
                  router.push("/optometry")
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Optometry
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <Icon className="h-4 w-4" />
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-900">
          {title}
        </h3>

        <p className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-700">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RefractionCard({
  eye,
  method,
  refraction,
  onChange,
}: {
  eye: "OD" | "OS";
  method: "objective" | "subjective";
  refraction: Refraction;
  onChange: (
    field: keyof Refraction,
    value: string
  ) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-4">
        <p className="text-xs font-black text-slate-900">
          {eye === "OD"
            ? "Right Eye — OD"
            : "Left Eye — OS"}
        </p>

        <p className="mt-0.5 text-[11px] font-semibold capitalize text-blue-700">
          {method} refraction
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <RefractionInput
          label="Sphere"
          value={refraction.sphere}
          onChange={(value) =>
            onChange("sphere", value)
          }
          placeholder="e.g. -1.50"
        />

        <RefractionInput
          label="Cylinder"
          value={refraction.cylinder}
          onChange={(value) =>
            onChange("cylinder", value)
          }
          placeholder="e.g. -0.50"
        />

        <RefractionInput
          label="Axis"
          value={refraction.axis}
          onChange={(value) =>
            onChange("axis", value)
          }
          placeholder="e.g. 180"
        />

        <RefractionInput
          label="Add"
          value={refraction.add}
          onChange={(value) =>
            onChange("add", value)
          }
          placeholder="e.g. +1.50"
        />
      </div>
    </div>
  );
}

function RefractionInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label>
      <span className="text-[11px] font-bold text-slate-600">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function StatusBadge({
  status,
}: {
  status:
    | "referred"
    | "in_examination"
    | "completed"
    | null;
}) {
  const label =
    status === "referred"
      ? "WAITING"
      : status === "in_examination"
        ? "IN EXAMINATION"
        : status === "completed"
          ? "SENT TO DOCTOR"
          : "NOT REFERRED";

  const classes =
    status === "referred"
      ? "bg-amber-50 text-amber-700"
      : status === "in_examination"
        ? "bg-blue-50 text-blue-700"
        : status === "completed"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-[10px] font-black ${classes}`}
    >
      {label}
    </span>
  );
}

