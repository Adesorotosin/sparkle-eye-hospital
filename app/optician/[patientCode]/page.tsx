"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Glasses,
  Loader2,
  Save,
  Ruler,
  User,
} from "lucide-react";

import {
  getOpticianPatient,
  markOpticalOrderCollected,
  markOpticalOrderReady,
  saveOpticalOrder,
  startOpticianMeasurements,
  type OpticalOrder,
} from "@/app/actions/optician";

interface OpticianPatientPageProps {
  params: Promise<{
    patientCode: string;
  }>;
}

interface Refraction {
  sphere?: string | number | null;
  cylinder?: string | number | null;
  axis?: string | number | null;
  add?: string | number | null;
}

interface OptometryAssessment {
  id?: string;
  visualAcuityOD?: string | null;
  visualAcuityOS?: string | null;
  visualAcuityOU?: string | null;
  withCorrection?: boolean | null;
  refractionOD?: Refraction | null;
  refractionOS?: Refraction | null;
  slitLampOD?: string | null;
  slitLampOS?: string | null;
  diagnosis?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

interface PatientDetails {
  id: string;
  patientCode: string;
  fullName: string;
  age?: number | null;
  gender?: string | null;
  phone?: string | null;
  allergies?: string | null;
  optometry?: OptometryAssessment | null;
  opticalOrder?: OpticalOrder | null;
}

interface PatientResponse {
  success: boolean;
  message?: string;
  patient?: PatientDetails | null;
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCurrency(value: number | null | undefined) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return `₦${Number(value).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatRefraction(refraction?: Refraction | null) {
  if (!refraction) return "No prescription recorded";

  const parts: string[] = [];

  if (refraction.sphere !== null && refraction.sphere !== undefined) {
    parts.push(`SPH ${refraction.sphere}`);
  }

  if (
    refraction.cylinder !== null &&
    refraction.cylinder !== undefined
  ) {
    parts.push(`CYL ${refraction.cylinder}`);
  }

  if (refraction.axis !== null && refraction.axis !== undefined) {
    parts.push(`AXIS ${refraction.axis}`);
  }

  if (refraction.add !== null && refraction.add !== undefined) {
    parts.push(`ADD ${refraction.add}`);
  }

  return parts.length > 0
    ? parts.join(" • ")
    : "No prescription recorded";
}

function statusLabel(status?: OpticalOrder["status"] | null) {
  switch (status) {
    case "referred":
      return "Referred";
    case "measurements":
      return "Measurements";
    case "ready_for_dispense":
      return "Ready for Dispense";
    case "collected":
      return "Collected";
    default:
      return "No Optical Order";
  }
}

function statusClasses(status?: OpticalOrder["status"] | null) {
  switch (status) {
    case "referred":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "measurements":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "ready_for_dispense":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "collected":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    default:
      return "bg-slate-50 text-slate-600 ring-slate-200";
  }
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <h2 className="text-base font-semibold text-slate-900">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      <div className="p-6">{children}</div>
    </section>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
        {formatValue(value)}
      </p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: "text" | "number";
  min?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        step={step}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
    </label>
  );
}

export default function OpticianPatientPage({
  params,
}: OpticianPatientPageProps) {
  const [patientCode, setPatientCode] = useState("");

  const [patient, setPatient] = useState<PatientDetails | null>(null);
  const [optometry, setOptometry] =
    useState<OptometryAssessment | null>(null);
  const [order, setOrder] = useState<OpticalOrder | null>(null);

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const [pdBinocular, setPdBinocular] = useState("");
  const [pdOD, setPdOD] = useState("");
  const [pdOS, setPdOS] = useState("");
  const [segmentHeightOD, setSegmentHeightOD] = useState("");
  const [segmentHeightOS, setSegmentHeightOS] = useState("");

  const [frameSelection, setFrameSelection] = useState("");
  const [lensType, setLensType] = useState("");
  const [lensMaterial, setLensMaterial] = useState("");
  const [lensCoating, setLensCoating] = useState("");
  const [dispensingNotes, setDispensingNotes] = useState("");

  const [opticalCharge, setOpticalCharge] = useState("");

  useEffect(() => {
    let active = true;

    async function resolveParams() {
      const resolved = await params;

      if (!active) return;

      setPatientCode(
        decodeURIComponent(resolved.patientCode)
      );
    }

    resolveParams();

    return () => {
      active = false;
    };
  }, [params]);

  function applyPatientResult(result: PatientResponse) {
    if (!result.success || !result.patient) {
      setFeedback(
        result.message ??
          "Unable to load the Optician patient record."
      );
      return;
    }

    const patientData = result.patient;

    setPatient(patientData);

    /*
     * getOpticianPatient() returns optometry and
     * opticalOrder nested inside patient.
     */
    setOptometry(patientData.optometry ?? null);
    setOrder(patientData.opticalOrder ?? null);

    const opticalOrder =
      patientData.opticalOrder ?? null;

    if (opticalOrder) {
      setPdBinocular(
        opticalOrder.pdBinocular ?? ""
      );

      setPdOD(
        opticalOrder.pdOD ?? ""
      );

      setPdOS(
        opticalOrder.pdOS ?? ""
      );

      setSegmentHeightOD(
        opticalOrder.segmentHeightOD ?? ""
      );

      setSegmentHeightOS(
        opticalOrder.segmentHeightOS ?? ""
      );

      setFrameSelection(
        opticalOrder.frameSelection ?? ""
      );

      setLensType(
        opticalOrder.lensType ?? ""
      );

      setLensMaterial(
        opticalOrder.lensMaterial ?? ""
      );

      setLensCoating(
        opticalOrder.lensCoating ?? ""
      );

      setDispensingNotes(
        opticalOrder.dispensingNotes ?? ""
      );

      setOpticalCharge(
        opticalOrder.opticalCharge !== null &&
        opticalOrder.opticalCharge !== undefined &&
        opticalOrder.opticalCharge > 0
          ? String(
              opticalOrder.opticalCharge
            )
          : ""
      );
    } else {
      setPdBinocular("");
      setPdOD("");
      setPdOS("");
      setSegmentHeightOD("");
      setSegmentHeightOS("");
      setFrameSelection("");
      setLensType("");
      setLensMaterial("");
      setLensCoating("");
      setDispensingNotes("");
      setOpticalCharge("");
    }
  }

  useEffect(() => {
    if (!patientCode) return;

    async function loadPatient() {
      setLoading(true);
      setFeedback("");

      try {
        const result = (await getOpticianPatient(
          patientCode
        )) as PatientResponse;

        applyPatientResult(result);
      } catch (error) {
        console.error(
          "Failed to load Optician patient:",
          error
        );

        setFeedback(
          "Unable to load the Optician patient record."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPatient();
  }, [patientCode]);

  const prescriptionReady = useMemo(() => {
    if (!optometry) return false;

    return Boolean(
      optometry.refractionOD ||
        optometry.refractionOS ||
        optometry.visualAcuityOD ||
        optometry.visualAcuityOS
    );
  }, [optometry]);

  function refreshPatient() {
    if (!patientCode) return;

    startTransition(async () => {
      try {
        const result = (await getOpticianPatient(
          patientCode
        )) as PatientResponse;

        if (!result.success) {
          setFeedback(
            result.message ??
              "Unable to refresh the patient record."
          );
          return;
        }

        applyPatientResult(result);
      } catch (error) {
        console.error(
          "Failed to refresh Optician patient:",
          error
        );

        setFeedback(
          "Unable to refresh the patient record."
        );
      }
    });
  }

  function handleStartMeasurements() {
    if (!order) return;

    setFeedback("");

    startTransition(async () => {
      const result =
        await startOpticianMeasurements(
          order.id
        );

      setFeedback(result.message);

      if (result.success) {
        refreshPatient();
      }
    });
  }

  function handleSaveOrder() {
    if (!order) return;

    setFeedback("");

    const parsedCharge =
      opticalCharge.trim() === ""
        ? undefined
        : Number(opticalCharge);

    if (
      parsedCharge !== undefined &&
      (!Number.isFinite(parsedCharge) ||
        parsedCharge < 0)
    ) {
      setFeedback(
        "Please enter a valid optical charge."
      );
      return;
    }

    startTransition(async () => {
      const result =
        await saveOpticalOrder({
          orderId: order.id,
          pdBinocular,
          pdOD,
          pdOS,
          segmentHeightOD,
          segmentHeightOS,
          frameSelection,
          lensType,
          lensMaterial,
          lensCoating,
          dispensingNotes,
          opticalCharge:
            parsedCharge,
        });

      setFeedback(result.message);

      if (result.success) {
        refreshPatient();
      }
    });
  }

  function handleMarkReady() {
    if (!order) return;

    setFeedback("");

    const parsedCharge =
      opticalCharge.trim() === ""
        ? 0
        : Number(opticalCharge);

    if (
      !Number.isFinite(parsedCharge) ||
      parsedCharge <= 0
    ) {
      setFeedback(
        "Please enter the total optical charge before marking the order ready."
      );
      return;
    }

    startTransition(async () => {
      /*
       * Save the latest optical information first.
       *
       * This prevents a user from entering a charge or
       * changing frame/lens details and immediately clicking
       * Mark Ready without those latest values reaching the DB.
       */
      const saveResult =
        await saveOpticalOrder({
          orderId: order.id,
          pdBinocular,
          pdOD,
          pdOS,
          segmentHeightOD,
          segmentHeightOS,
          frameSelection,
          lensType,
          lensMaterial,
          lensCoating,
          dispensingNotes,
          opticalCharge:
            parsedCharge,
        });

      if (!saveResult.success) {
        setFeedback(saveResult.message);
        return;
      }

      const result =
        await markOpticalOrderReady(
          order.id
        );

      setFeedback(result.message);

      if (result.success) {
        refreshPatient();
      }
    });
  }

  function handleMarkCollected() {
    if (!order) return;

    setFeedback("");

    startTransition(async () => {
      const result =
        await markOpticalOrderCollected(
          order.id
        );

      setFeedback(result.message);

      if (result.success) {
        refreshPatient();
      }
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
              <img
                src="/Logo.png"
                alt="Sparkle Eye Specialist Hospital"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="ml-3">
              <p className="text-sm font-semibold text-slate-900">
                Optician Workspace
              </p>

              <p className="text-xs text-slate-500">
                Optical Dispensing & Eyewear
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto flex max-w-7xl items-center justify-center px-6 py-24">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading patient record...
          </div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
              <img
                src="/Logo.png"
                alt="Sparkle Eye Specialist Hospital"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="ml-3">
              <p className="text-sm font-semibold text-slate-900">
                Optician Workspace
              </p>

              <p className="text-xs text-slate-500">
                Optical Dispensing & Eyewear
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-10">
          <Link
            href="/optician"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Optician Dashboard
          </Link>

          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-semibold text-red-900">
              Patient record unavailable
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {feedback ||
                `The patient ${patientCode} could not be loaded.`}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const orderStatus = order?.status ?? null;

  const measurementsStarted =
    orderStatus === "measurements" ||
    orderStatus === "ready_for_dispense" ||
    orderStatus === "collected";

  const orderCollected =
    orderStatus === "collected";

  const orderReady =
    orderStatus === "ready_for_dispense";

  const parsedOpticalCharge =
    opticalCharge.trim() === ""
      ? 0
      : Number(opticalCharge);

  const hasValidOpticalCharge =
    Number.isFinite(
      parsedOpticalCharge
    ) &&
    parsedOpticalCharge > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
              <img
                src="/Logo.png"
                alt="Sparkle Eye Specialist Hospital"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="ml-3">
              <p className="text-sm font-semibold text-slate-900">
                Optician Workspace
              </p>

              <p className="text-xs text-slate-500">
                Optical Dispensing & Eyewear
              </p>
            </div>
          </div>

          <Link
            href="/optician"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-violet-600">
              Optical Patient Workspace
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {patient.fullName}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <span>{patient.patientCode}</span>

              {patient.age !== null &&
              patient.age !== undefined ? (
                <span>{patient.age} years</span>
              ) : null}

              {patient.gender ? (
                <span>{patient.gender}</span>
              ) : null}
            </div>
          </div>

          {order ? (
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ring-1 ${statusClasses(
                order.status
              )}`}
            >
              {order.status === "collected" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Clock3 className="h-4 w-4" />
              )}

              {statusLabel(order.status)}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              No Optical Order
            </div>
          )}
        </div>

        {feedback ? (
          <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
            {feedback}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <SectionCard
              title="Optometry Prescription"
              description="Completed clinical assessment received from Optometry. This information is read-only."
            >
              {!optometry ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    No completed Optometry assessment found.
                  </p>

                  <p className="mt-1 text-sm text-amber-700">
                    The optical order should only be processed after
                    Optometry completes the patient's assessment.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <ReadOnlyField
                      label="Visual Acuity OD"
                      value={optometry.visualAcuityOD}
                    />

                    <ReadOnlyField
                      label="Visual Acuity OS"
                      value={optometry.visualAcuityOS}
                    />

                    <ReadOnlyField
                      label="Visual Acuity OU"
                      value={optometry.visualAcuityOU}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        Right Eye — OD
                      </p>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {formatRefraction(
                          optometry.refractionOD
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">
                        Left Eye — OS
                      </p>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {formatRefraction(
                          optometry.refractionOS
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ReadOnlyField
                      label="Correction Used"
                      value={
                        optometry.withCorrection
                          ? "With correction"
                          : "Without correction"
                      }
                    />

                    <ReadOnlyField
                      label="Clinical Impression"
                      value={optometry.diagnosis}
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400">
                      Optometry assessment recorded{" "}
                      {formatDate(
                        optometry.createdAt
                      )}
                    </p>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Optical Measurements"
              description="Record the measurements required to prepare the patient's eyewear."
            >
              {!order ? (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <Glasses className="mt-0.5 h-5 w-5 text-slate-400" />

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Optical order not created
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      This patient needs an optical order before
                      measurements can be recorded.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {!measurementsStarted ? (
                    <div className="flex flex-col gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <Ruler className="mt-0.5 h-5 w-5 text-blue-600" />

                        <div>
                          <p className="text-sm font-semibold text-blue-900">
                            Ready to take measurements
                          </p>

                          <p className="mt-1 text-sm text-blue-700">
                            Start the measurement stage before entering
                            optical measurements.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleStartMeasurements}
                        disabled={
                          isPending ||
                          !prescriptionReady
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Ruler className="h-4 w-4" />
                        )}

                        Start Measurements
                      </button>
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-3">
                    <InputField
                      label="Binocular PD"
                      value={pdBinocular}
                      onChange={setPdBinocular}
                      placeholder="e.g. 62"
                      disabled={
                        !measurementsStarted ||
                        orderCollected
                      }
                    />

                    <InputField
                      label="PD — Right Eye"
                      value={pdOD}
                      onChange={setPdOD}
                      placeholder="e.g. 31"
                      disabled={
                        !measurementsStarted ||
                        orderCollected
                      }
                    />

                    <InputField
                      label="PD — Left Eye"
                      value={pdOS}
                      onChange={setPdOS}
                      placeholder="e.g. 31"
                      disabled={
                        !measurementsStarted ||
                        orderCollected
                      }
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField
                      label="Segment Height — OD"
                      value={segmentHeightOD}
                      onChange={setSegmentHeightOD}
                      placeholder="e.g. 18"
                      disabled={
                        !measurementsStarted ||
                        orderCollected
                      }
                    />

                    <InputField
                      label="Segment Height — OS"
                      value={segmentHeightOS}
                      onChange={setSegmentHeightOS}
                      placeholder="e.g. 18"
                      disabled={
                        !measurementsStarted ||
                        orderCollected
                      }
                    />
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Frame & Lens Selection"
              description="Record the physical eyewear selected for the patient."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <InputField
                  label="Frame Selection"
                  value={frameSelection}
                  onChange={setFrameSelection}
                  placeholder="Frame name, model or description"
                  disabled={
                    !measurementsStarted ||
                    orderCollected
                  }
                />

                <InputField
                  label="Lens Type"
                  value={lensType}
                  onChange={setLensType}
                  placeholder="e.g. Single Vision"
                  disabled={
                    !measurementsStarted ||
                    orderCollected
                  }
                />

                <InputField
                  label="Lens Material"
                  value={lensMaterial}
                  onChange={setLensMaterial}
                  placeholder="e.g. CR-39, Polycarbonate"
                  disabled={
                    !measurementsStarted ||
                    orderCollected
                  }
                />

                <InputField
                  label="Lens Coating"
                  value={lensCoating}
                  onChange={setLensCoating}
                  placeholder="e.g. Anti-reflective"
                  disabled={
                    !measurementsStarted ||
                    orderCollected
                  }
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Dispensing Notes"
              description="Add relevant fitting, preparation or collection notes."
            >
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Notes
                </span>

                <textarea
                  value={dispensingNotes}
                  onChange={(event) =>
                    setDispensingNotes(
                      event.target.value
                    )
                  }
                  rows={5}
                  disabled={
                    !measurementsStarted ||
                    orderCollected
                  }
                  placeholder="Enter any relevant dispensing or fitting notes..."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </label>
            </SectionCard>

            <SectionCard
              title="Optical Billing"
              description="Enter the total charge for the patient's eyewear order. This amount will be added to the patient's invoice when the order is marked ready."
            >
              <div className="max-w-md">
                <InputField
                  label="Total Optical Charge (₦)"
                  value={opticalCharge}
                  onChange={setOpticalCharge}
                  placeholder="e.g. 85000"
                  type="number"
                  min="0"
                  step="0.01"
                  disabled={
                    !measurementsStarted ||
                    orderReady ||
                    orderCollected
                  }
                />

                <p className="mt-2 text-xs text-slate-500">
                  Include the complete eyewear charge, including frame,
                  lenses, coatings and other optical items supplied.
                </p>

                {hasValidOpticalCharge ? (
                  <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-violet-500">
                      Current Optical Charge
                    </p>

                    <p className="mt-1 text-lg font-bold text-violet-900">
                      {formatCurrency(
                        parsedOpticalCharge
                      )}
                    </p>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <Glasses className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Optical Order
                  </p>

                  <p className="text-xs text-slate-400">
                    {order
                      ? statusLabel(order.status)
                      : "Not created"}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs text-slate-400">
                    Patient
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {patient.fullName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">
                    Patient Code
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {patient.patientCode}
                  </p>
                </div>

                {order ? (
                  <div>
                    <p className="text-xs text-slate-400">
                      Referred
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {formatDate(order.referredAt)}
                    </p>
                  </div>
                ) : null}

                {order ? (
                  <div className="border-t border-white/10 pt-4">
                    <p className="text-xs text-slate-400">
                      Optical Charge
                    </p>

                    <p className="mt-1 text-lg font-bold text-white">
                      {opticalCharge
                        ? formatCurrency(
                            Number(
                              opticalCharge
                            )
                          )
                        : "Not set"}
                    </p>
                  </div>
                ) : null}

                {order?.invoiceId ? (
                  <div>
                    <p className="text-xs text-slate-400">
                      Invoice
                    </p>

                    <p className="mt-1 break-all text-xs font-medium text-slate-300">
                      {order.invoiceId}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-slate-500" />

                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Patient Information
                  </h2>

                  <p className="text-xs text-slate-500">
                    Basic patient details
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <ReadOnlyField
                  label="Patient Code"
                  value={patient.patientCode}
                />

                <ReadOnlyField
                  label="Full Name"
                  value={patient.fullName}
                />

                <ReadOnlyField
                  label="Age"
                  value={
                    patient.age !== null &&
                    patient.age !== undefined
                      ? `${patient.age} years`
                      : null
                  }
                />

                <ReadOnlyField
                  label="Gender"
                  value={patient.gender}
                />

                <ReadOnlyField
                  label="Phone"
                  value={patient.phone}
                />
              </div>
            </section>

            {order ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  Workflow Actions
                </h2>

                <div className="mt-5 space-y-3">
                  {measurementsStarted &&
                  !orderReady &&
                  !orderCollected ? (
                    <button
                      type="button"
                      onClick={handleSaveOrder}
                      disabled={isPending}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}

                      Save Optical Order
                    </button>
                  ) : null}

                  {measurementsStarted &&
                  !orderReady &&
                  !orderCollected ? (
                    <button
                      type="button"
                      onClick={handleMarkReady}
                      disabled={
                        isPending ||
                        !hasValidOpticalCharge
                      }
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}

                      Mark Ready for Dispense
                    </button>
                  ) : null}

                  {orderReady ? (
                    <button
                      type="button"
                      onClick={handleMarkCollected}
                      disabled={isPending}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}

                      Mark Collected
                    </button>
                  ) : null}

                  {orderCollected ? (
                    <div className="rounded-xl bg-emerald-50 p-4 text-center">
                      <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />

                      <p className="mt-2 text-sm font-semibold text-emerald-800">
                        Eyewear Collected
                      </p>

                      <p className="mt-1 text-xs text-emerald-600">
                        This optical order has been completed.
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
}