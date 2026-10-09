"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collectLabSample,
  getLabOrders,
  receiveLabSample,
  requestLabRecollection,
  saveLabResult,
  startLabProcessing,
  verifyLabResult,
} from "@/app/actions/lab-orders";

import {
  Activity,
  AlertTriangle,
  Beaker,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileCheck2,
  FlaskConical,
  LogOut,
  Microscope,
  Search,
  TestTube2,
  User,
  XCircle,
} from "lucide-react";

type LabStatus =
  | "PENDING"
  | "COLLECTED"
  | "PROCESSING"
  | "AWAITING_VERIFICATION"
  | "COMPLETED"
  | "RECOLLECTION";

type Priority = "NORMAL" | "URGENT" | "STAT";

type SampleCondition =
  | "ACCEPTABLE"
  | "INSUFFICIENT"
  | "CLOTTED"
  | "HAEMOLYSED"
  | "WRONG_CONTAINER"
  | "WRONG_SAMPLE"
  | "OTHER";

type ResultFlag =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "CRITICAL";

type ResultParameter = {
  name: string;
  result: string;
  unit: string;
  referenceRange: string;
  flag: ResultFlag;
};

type LabResult = {
  parameters: ResultParameter[];
  comments: string;
};

type LabTimelineItem = {
  label: string;
  date?: string;
  by?: string;
  completed: boolean;
};

type LabOrder = {
  id: string;
  patientId: string;
  patientName: string;
  age?: number;
  sex?: string;
  test: string;
  orderedBy: string;
  priority: Priority;
  status: LabStatus;
  orderedAt: string;

  sampleType?: string;
  sampleId?: string;
  collectedAt?: string;
  collectedBy?: string;
  collectionNotes?: string;

  receivedAt?: string;
  receivedBy?: string;
  sampleCondition?: SampleCondition;
  receptionNotes?: string;

  processingAt?: string;
  processedBy?: string;
  processingNotes?: string;

  result?: LabResult;
  resultEnteredAt?: string;
  resultEnteredBy?: string;

  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;

  recollectionReason?: string;
  clinicalNotes?: string;
};

const TEST_TEMPLATES: Record<string, ResultParameter[]> = {
  "Full Blood Count": [
    {
      name: "Haemoglobin",
      result: "",
      unit: "g/dL",
      referenceRange: "12.0 - 17.0",
      flag: "NORMAL",
    },
    {
      name: "WBC",
      result: "",
      unit: "x10⁹/L",
      referenceRange: "4.0 - 11.0",
      flag: "NORMAL",
    },
    {
      name: "RBC",
      result: "",
      unit: "x10¹²/L",
      referenceRange: "4.0 - 6.0",
      flag: "NORMAL",
    },
    {
      name: "PCV",
      result: "",
      unit: "%",
      referenceRange: "36 - 54",
      flag: "NORMAL",
    },
    {
      name: "Platelets",
      result: "",
      unit: "x10⁹/L",
      referenceRange: "150 - 450",
      flag: "NORMAL",
    },
  ],

  "Blood Glucose": [
    {
      name: "Glucose",
      result: "",
      unit: "mmol/L",
      referenceRange: "3.9 - 5.5",
      flag: "NORMAL",
    },
  ],

  "Malaria Parasite": [
    {
      name: "Malaria Parasite",
      result: "",
      unit: "",
      referenceRange: "Negative",
      flag: "NORMAL",
    },
  ],

  "Lipid Profile": [
    {
      name: "Total Cholesterol",
      result: "",
      unit: "mmol/L",
      referenceRange: "< 5.2",
      flag: "NORMAL",
    },
    {
      name: "HDL",
      result: "",
      unit: "mmol/L",
      referenceRange: "> 1.0",
      flag: "NORMAL",
    },
    {
      name: "LDL",
      result: "",
      unit: "mmol/L",
      referenceRange: "< 3.4",
      flag: "NORMAL",
    },
    {
      name: "Triglycerides",
      result: "",
      unit: "mmol/L",
      referenceRange: "< 1.7",
      flag: "NORMAL",
    },
  ],

  Urinalysis: [
    {
      name: "Appearance",
      result: "",
      unit: "",
      referenceRange: "Clear",
      flag: "NORMAL",
    },
    {
      name: "Protein",
      result: "",
      unit: "",
      referenceRange: "Negative",
      flag: "NORMAL",
    },
    {
      name: "Glucose",
      result: "",
      unit: "",
      referenceRange: "Negative",
      flag: "NORMAL",
    },
    {
      name: "Blood",
      result: "",
      unit: "",
      referenceRange: "Negative",
      flag: "NORMAL",
    },
  ],
  RVS: [
    { name: "RVS", result: "", unit: "", referenceRange: "Non-reactive", flag: "NORMAL" },
  ],
  HCV: [
    { name: "HCV", result: "", unit: "", referenceRange: "Negative", flag: "NORMAL" },
  ],
  HBsAg: [
    { name: "HBsAg", result: "", unit: "", referenceRange: "Negative", flag: "NORMAL" },
  ],
  "Glycated Haemoglobin": [
    { name: "HbA1c", result: "", unit: "%", referenceRange: "4.0 - 5.6", flag: "NORMAL" },
  ],
  "Glycated Haemoglobin (HbA1c)": [
    { name: "HbA1c", result: "", unit: "%", referenceRange: "4.0 - 5.6", flag: "NORMAL" },
  ],
  HbA1c: [
    { name: "HbA1c", result: "", unit: "%", referenceRange: "4.0 - 5.6", flag: "NORMAL" },
  ],
};

function inferNumericFlag(result: string, referenceRange: string): ResultFlag | null {
  const value = Number(result.trim().replace(/,/g, ""));
  if (!result.trim() || !Number.isFinite(value)) return null;

  const range = referenceRange.trim().replace(/,/g, "");
  const comparator = range.match(/^(<=|>=|<|>|≤|≥)\s*(-?\d+(?:\.\d+)?)/);
  if (comparator) {
    const limit = Number(comparator[2]);
    const operator = comparator[1];
    if (operator === "<" || operator === "<=" || operator === "≤") {
      return value < limit || (operator !== "<" && value === limit) ? "NORMAL" : "HIGH";
    }
    return value > limit || (operator !== ">" && value === limit) ? "NORMAL" : "LOW";
  }

  const bounds = range.match(/(-?\d+(?:\.\d+)?)\s*(?:-|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (bounds) {
    const low = Number(bounds[1]);
    const high = Number(bounds[2]);
    if (value < low) return "LOW";
    if (value > high) return "HIGH";
    return "NORMAL";
  }
  return null;
}

function qualitativeOptions(parameterName: string): string[] | null {
  const name = parameterName.trim().toLowerCase();
  if (name === "rvs" || name.includes("hiv")) return ["Reactive", "Non-reactive"];
  if (name === "hcv") return ["Positive", "Negative"];
  if (name === "hbsag" || name.includes("hepatitis b surface")) return ["Positive", "Negative"];
  return null;
}

function statusLabel(status: LabStatus) {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "COLLECTED":
      return "Sample Collected";
    case "PROCESSING":
      return "Processing";
    case "AWAITING_VERIFICATION":
      return "Awaiting Verification";
    case "COMPLETED":
      return "Completed";
    case "RECOLLECTION":
      return "Recollection Required";
    default:
      return status;
  }
}

function priorityLabel(priority: Priority) {
  switch (priority) {
    case "STAT":
      return "STAT";
    case "URGENT":
      return "Urgent";
    default:
      return "Normal";
  }
}

function statusClasses(status: LabStatus) {
  switch (status) {
    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "COLLECTED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "PROCESSING":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "AWAITING_VERIFICATION":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "RECOLLECTION":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function priorityClasses(priority: Priority) {
  switch (priority) {
    case "STAT":
      return "bg-red-50 text-red-700 border-red-200";
    case "URGENT":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

function flagClasses(flag: ResultFlag) {
  switch (flag) {
    case "LOW":
      return "bg-blue-50 text-blue-700";
    case "HIGH":
      return "bg-orange-50 text-orange-700";
    case "CRITICAL":
      return "bg-red-50 text-red-700";
    default:
      return "bg-emerald-50 text-emerald-700";
  }
}

function buildTimeline(order: LabOrder): LabTimelineItem[] {
  const processingStarted =
    Boolean(order.processingAt) ||
    order.status === "PROCESSING" ||
    order.status === "AWAITING_VERIFICATION" ||
    order.status === "COMPLETED";

  const resultEntered =
    Boolean(order.resultEnteredAt) ||
    order.status === "AWAITING_VERIFICATION" ||
    order.status === "COMPLETED";

  const resultVerified =
    Boolean(order.verifiedAt) ||
    order.status === "COMPLETED";

  return [
    {
      label: "Test Ordered",
      date: order.orderedAt,
      by: order.orderedBy,
      completed: Boolean(order.orderedAt),
    },
    {
      label: "Sample Collected",
      date: order.collectedAt,
      by: order.collectedBy,
      completed: Boolean(order.collectedAt),
    },
    {
      label: "Sample Received",
      date: order.receivedAt,
      by: order.receivedBy,
      completed: Boolean(order.receivedAt),
    },
    {
      label: "Processing Started",
      date: order.processingAt,
      by: order.processedBy,
      completed: processingStarted,
    },
    {
      label: "Result Entered",
      date: order.resultEnteredAt,
      by: order.resultEnteredBy,
      completed: resultEntered,
    },
    {
      label: "Result Verified",
      date: order.verifiedAt,
      by: order.verifiedBy,
      completed: resultVerified,
    },
  ];
}

export default function LaboratoryPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "overview" | "queue" | "results" | "history"
  >("overview");

  const [selectedOrderId, setSelectedOrderId] =
    useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<LabStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] =
    useState<Priority | "ALL">("ALL");

  const [sampleType, setSampleType] = useState("");
  const [sampleId, setSampleId] = useState("");
  const [collectionNotes, setCollectionNotes] =
    useState("");

  const [sampleCondition, setSampleCondition] =
    useState<SampleCondition>("ACCEPTABLE");
  const [receptionNotes, setReceptionNotes] =
    useState("");

  const [processingNotes, setProcessingNotes] =
    useState("");

  const [resultParameters, setResultParameters] =
    useState<ResultParameter[]>([]);
  const [resultComments, setResultComments] =
    useState("");

  const [verificationNotes, setVerificationNotes] =
    useState("");

  const [recollectionReason, setRecollectionReason] =
    useState("");

  const selectedOrder = useMemo(
    () =>
      orders.find(
        (order) => order.id === selectedOrderId
      ) ?? null,
    [orders, selectedOrderId]
  );

  async function refreshOrders() {
    try {
      const response = await getLabOrders();

      if (!response.success) {
        throw new Error(response.message);
      }

      setOrders(response.orders);
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Unable to load laboratory orders."
      );
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await getLabOrders();

        if (!response.success) {
          throw new Error(response.message);
        }

        if (mounted) {
          setOrders(response.orders);
        }
      } catch (error) {
        if (mounted) {
          setActionMessage(
            error instanceof Error
              ? error.message
              : "Unable to load laboratory orders."
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        order.patientName
          .toLowerCase()
          .includes(query) ||
        order.patientId
          .toLowerCase()
          .includes(query) ||
        order.id.toLowerCase().includes(query) ||
        order.test.toLowerCase().includes(query) ||
        order.sampleId
          ?.toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        order.status === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" ||
        order.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    orders,
    search,
    statusFilter,
    priorityFilter,
  ]);

  const pendingCount = orders.filter(
    (order) => order.status === "PENDING"
  ).length;

  const processingCount = orders.filter(
    (order) => order.status === "PROCESSING"
  ).length;

  const verificationCount = orders.filter(
    (order) =>
      order.status === "AWAITING_VERIFICATION"
  ).length;

  const completedCount = orders.filter(
    (order) => order.status === "COMPLETED"
  ).length;

  const recollectionCount = orders.filter(
    (order) => order.status === "RECOLLECTION"
  ).length;

  const urgentCount = orders.filter(
    (order) =>
      order.priority === "URGENT" ||
      order.priority === "STAT"
  ).length;

  function resetForms() {
    setSampleType("");
    setSampleId("");
    setCollectionNotes("");
    setSampleCondition("ACCEPTABLE");
    setReceptionNotes("");
    setProcessingNotes("");
    setResultParameters([]);
    setResultComments("");
    setVerificationNotes("");
    setRecollectionReason("");
  }

  function selectOrder(order: LabOrder) {
    setSelectedOrderId(order.id);

    setSampleType(order.sampleType ?? "");
    setSampleId(order.sampleId ?? "");
    setCollectionNotes(order.collectionNotes ?? "");
    setSampleCondition(
      order.sampleCondition ?? "ACCEPTABLE"
    );
    setReceptionNotes(order.receptionNotes ?? "");
    setProcessingNotes(order.processingNotes ?? "");

    setResultParameters(
      order.result?.parameters
        ? order.result.parameters.map((parameter) => ({
            ...parameter,
          }))
        : []
    );

    setResultComments(
      order.result?.comments ?? ""
    );

    setVerificationNotes(
      order.verificationNotes ?? ""
    );

    setRecollectionReason(
      order.recollectionReason ?? ""
    );

    setActionMessage("");
  }

  function closeOrder() {
    setSelectedOrderId(null);
    resetForms();
    setActionMessage("");
  }

  async function startSampleCollection() {
    if (!selectedOrder) return;

    if (!sampleType.trim()) {
      setActionMessage(
        "Please enter the specimen/sample type."
      );
      return;
    }

    setIsSubmitting(true);
    setActionMessage("");

    try {
      const response = await collectLabSample({
        labOrderId: selectedOrder.id,
        sampleType: sampleType.trim(),
        collectionNotes:
          collectionNotes.trim() || undefined,
      });

      setActionMessage(response.message);

      if (response.success) {
        await refreshOrders();
      }
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Failed to collect sample."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function receiveSample() {
    if (!selectedOrder) return;

    if (
      sampleCondition !== "ACCEPTABLE" &&
      !receptionNotes.trim()
    ) {
      setActionMessage(
        "Please provide a reason for rejecting this sample."
      );
      return;
    }

    setIsSubmitting(true);
    setActionMessage("");

    try {
      const response = await receiveLabSample({
        labOrderId: selectedOrder.id,
        sampleCondition,
        receptionNotes:
          receptionNotes.trim() || undefined,
      });

      setActionMessage(response.message);

      if (response.success) {
        await refreshOrders();
      }
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Failed to receive sample."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function beginProcessing() {
    if (!selectedOrder) return;

    setIsSubmitting(true);
    setActionMessage("");

    try {
      const response = await startLabProcessing({
        labOrderId: selectedOrder.id,
        processingNotes:
          processingNotes.trim() || undefined,
      });

      setActionMessage(response.message);

      if (response.success) {
        await refreshOrders();
      }
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Failed to start processing."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function prepareResultEntry() {
    if (!selectedOrder) return;

    /*
     * PROCESSING is the authoritative workflow state.
     * Do not block result entry merely because processingAt
     * is missing from the returned order object.
     */
    if (selectedOrder.status !== "PROCESSING") {
      setActionMessage(
        "The investigation must be in processing status before entering a result."
      );
      return;
    }

    if (
      selectedOrder.result?.parameters?.length
    ) {
      setResultParameters(
        selectedOrder.result.parameters.map(
          (parameter) => ({
            ...parameter,
          })
        )
      );

      setResultComments(
        selectedOrder.result.comments ?? ""
      );

      return;
    }

    const template =
      TEST_TEMPLATES[selectedOrder.test];

    if (template) {
      setResultParameters(
        template.map((parameter) => ({
          ...parameter,
        }))
      );
    } else {
      setResultParameters([
        {
          name: selectedOrder.test,
          result: "",
          unit: "",
          referenceRange: "",
          flag: "NORMAL",
        },
      ]);
    }

    setResultComments("");
    setActionMessage("");
  }

  function updateResultParameter(
    index: number,
    field: keyof ResultParameter,
    value: string
  ) {
    setResultParameters((current) =>
      current.map((parameter, parameterIndex) => {
        if (parameterIndex !== index) return parameter;
        const updated = { ...parameter, [field]: value };
        if (field === "result" || field === "referenceRange") {
          const inferred = inferNumericFlag(
            String(updated.result ?? ""),
            String(updated.referenceRange ?? "")
          );
          if (inferred) updated.flag = inferred;
        }
        return updated;
      })
    );
  }

  function addResultParameter() {
    setResultParameters((current) => [
      ...current,
      {
        name: "",
        result: "",
        unit: "",
        referenceRange: "",
        flag: "NORMAL",
      },
    ]);
  }

  function removeResultParameter(index: number) {
    setResultParameters((current) =>
      current.filter(
        (_, parameterIndex) =>
          parameterIndex !== index
      )
    );
  }

  async function saveResult() {
    if (!selectedOrder) return;

    if (!resultParameters.length) {
      setActionMessage(
        "Add at least one laboratory result."
      );
      return;
    }

    const invalidParameter =
      resultParameters.find(
        (parameter) =>
          !parameter.name.trim() ||
          !parameter.result.trim()
      );

    if (invalidParameter) {
      setActionMessage(
        "Every result parameter must have a name and result."
      );
      return;
    }

    setIsSubmitting(true);
    setActionMessage("");

    try {
      const response = await saveLabResult({
        labOrderId: selectedOrder.id,
        resultData: resultParameters,
        laboratoryComments:
          resultComments.trim() || undefined,
      });

      setActionMessage(response.message);

      if (response.success) {
        await refreshOrders();
      }
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Failed to save laboratory result."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyResult() {
    if (!selectedOrder) return;

    setIsSubmitting(true);
    setActionMessage("");

    try {
      const response = await verifyLabResult({
        labOrderId: selectedOrder.id,
        verificationNotes:
          verificationNotes.trim() || undefined,
      });

      setActionMessage(response.message);

      if (response.success) {
        await refreshOrders();
      }
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Failed to verify result."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestRecollection() {
    if (!selectedOrder) return;

    if (!recollectionReason.trim()) {
      setActionMessage(
        "Please provide a reason for recollection."
      );
      return;
    }

    setIsSubmitting(true);
    setActionMessage("");

    try {
      const response =
        await requestLabRecollection({
          labOrderId: selectedOrder.id,
          reason: recollectionReason.trim(),
        });

      setActionMessage(response.message);

      if (response.success) {
        await refreshOrders();
      }
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Failed to request recollection."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markRecollectionCollected() {
    if (!selectedOrder) return;

    if (!sampleType.trim()) {
      setActionMessage(
        "Please enter the new specimen/sample type."
      );
      return;
    }

    setIsSubmitting(true);
    setActionMessage("");

    try {
      const response = await collectLabSample({
        labOrderId: selectedOrder.id,
        sampleType: sampleType.trim(),
        collectionNotes:
          collectionNotes.trim() || undefined,
      });

      setActionMessage(response.message);

      if (response.success) {
        await refreshOrders();
      }
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "Failed to collect replacement sample."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderStatusIcon(status: LabStatus) {
    switch (status) {
      case "PENDING":
        return (
          <Clock3 className="h-4 w-4" />
        );
      case "COLLECTED":
        return (
          <TestTube2 className="h-4 w-4" />
        );
      case "PROCESSING":
        return (
          <Microscope className="h-4 w-4" />
        );
      case "AWAITING_VERIFICATION":
        return (
          <FileCheck2 className="h-4 w-4" />
        );
      case "COMPLETED":
        return (
          <CheckCircle2 className="h-4 w-4" />
        );
      case "RECOLLECTION":
        return (
          <AlertTriangle className="h-4 w-4" />
        );
      default:
        return (
          <Activity className="h-4 w-4" />
        );
    }
  }

  function renderActionForm() {
    if (!selectedOrder) return null;

    switch (selectedOrder.status) {
      case "PENDING":
        return (
          <div className="space-y-5">
            <SectionHeading
              icon={
                <TestTube2 className="h-5 w-5" />
              }
              title="Sample Collection"
              description="Collect the specimen required for this investigation."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Sample / Specimen Type"
                required
              >
                <input
                  value={sampleType}
                  onChange={(event) =>
                    setSampleType(event.target.value)
                  }
                  placeholder={
                    selectedOrder.test
                      ? selectedOrder.test
                      : "e.g. Blood"
                  }
                  className={inputClass}
                />
              </FormField>

              <FormField label="Generated Sample ID">
                <input
                  value="Generated automatically"
                  disabled
                  className={`${inputClass} bg-gray-50 text-gray-400`}
                />
              </FormField>
            </div>

            <FormField label="Collection Notes">
              <textarea
                value={collectionNotes}
                onChange={(event) =>
                  setCollectionNotes(
                    event.target.value
                  )
                }
                placeholder="Optional collection notes..."
                rows={4}
                className={textareaClass}
              />
            </FormField>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={startSampleCollection}
                disabled={isSubmitting}
                className={primaryButtonClass}
              >
                <TestTube2 className="h-4 w-4" />
                {isSubmitting
                  ? "Collecting..."
                  : "Record Sample Collection"}
              </button>
            </div>
          </div>
        );

      case "COLLECTED":
        return (
          <div className="space-y-5">
            <SectionHeading
              icon={
                <FlaskConical className="h-5 w-5" />
              }
              title="Sample Reception"
              description="Inspect and accept or reject the collected specimen."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <InfoBox
                label="Sample ID"
                value={
                  selectedOrder.sampleId ??
                  "Not available"
                }
              />

              <InfoBox
                label="Sample Type"
                value={
                  selectedOrder.sampleType ??
                  "Not recorded"
                }
              />

              <InfoBox
                label="Collected At"
                value={
                  selectedOrder.collectedAt ??
                  "Not recorded"
                }
              />

              <InfoBox
                label="Collected By"
                value={
                  selectedOrder.collectedBy ??
                  "Not recorded"
                }
              />
            </div>

            <FormField label="Sample Condition">
              <select
                value={sampleCondition}
                onChange={(event) =>
                  setSampleCondition(
                    event.target
                      .value as SampleCondition
                  )
                }
                className={inputClass}
              >
                <option value="ACCEPTABLE">
                  Acceptable
                </option>
                <option value="INSUFFICIENT">
                  Insufficient
                </option>
                <option value="CLOTTED">
                  Clotted
                </option>
                <option value="HAEMOLYSED">
                  Haemolysed
                </option>
                <option value="WRONG_CONTAINER">
                  Wrong Container
                </option>
                <option value="WRONG_SAMPLE">
                  Wrong Sample
                </option>
                <option value="OTHER">
                  Other
                </option>
              </select>
            </FormField>

            <FormField
              label={
                sampleCondition === "ACCEPTABLE"
                  ? "Reception Notes"
                  : "Rejection Reason"
              }
              required={
                sampleCondition !== "ACCEPTABLE"
              }
            >
              <textarea
                value={receptionNotes}
                onChange={(event) =>
                  setReceptionNotes(
                    event.target.value
                  )
                }
                placeholder={
                  sampleCondition === "ACCEPTABLE"
                    ? "Optional reception notes..."
                    : "Explain why the specimen cannot be processed..."
                }
                rows={4}
                className={textareaClass}
              />
            </FormField>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={receiveSample}
                disabled={isSubmitting}
                className={
                  sampleCondition === "ACCEPTABLE"
                    ? primaryButtonClass
                    : dangerButtonClass
                }
              >
                {sampleCondition === "ACCEPTABLE" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}

                {isSubmitting
                  ? "Saving..."
                  : sampleCondition === "ACCEPTABLE"
                    ? "Accept Sample"
                    : "Reject & Request Recollection"}
              </button>
            </div>
          </div>
        );

      case "PROCESSING":
        return (
          <div className="space-y-5">
            <SectionHeading
              icon={
                <Microscope className="h-5 w-5" />
              }
              title="Laboratory Processing"
              description="Processing has started. Enter and submit the laboratory result when analysis is complete."
            />

            <div className="grid gap-4 md:grid-cols-3">
              <InfoBox
                label="Sample ID"
                value={
                  selectedOrder.sampleId ??
                  "Not available"
                }
              />

              <InfoBox
                label="Sample Type"
                value={
                  selectedOrder.sampleType ??
                  "Not recorded"
                }
              />

              <InfoBox
                label="Sample Condition"
                value={
                  selectedOrder.sampleCondition
                    ? selectedOrder.sampleCondition.replace(
                        /_/g,
                        " "
                      )
                    : "Not recorded"
                }
              />
            </div>

            <InfoBox
              label="Processing Started"
              value={
                selectedOrder.processingAt ??
                "Processing is active"
              }
            />

            <FormField label="Processing Notes">
              <textarea
                value={processingNotes}
                onChange={(event) =>
                  setProcessingNotes(
                    event.target.value
                  )
                }
                placeholder="Processing notes..."
                rows={3}
                className={textareaClass}
              />
            </FormField>

            {resultParameters.length === 0 ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={prepareResultEntry}
                  className={primaryButtonClass}
                >
                  <FileCheck2 className="h-4 w-4" />
                  Enter Laboratory Result
                </button>
              </div>
            ) : (
              <ResultEntryForm
                parameters={resultParameters}
                comments={resultComments}
                isSubmitting={isSubmitting}
                onParameterChange={
                  updateResultParameter
                }
                onAddParameter={
                  addResultParameter
                }
                onRemoveParameter={
                  removeResultParameter
                }
                onCommentsChange={
                  setResultComments
                }
                onSave={saveResult}
              />
            )}
          </div>
        );

      case "AWAITING_VERIFICATION":
        return (
          <VerificationPanel
            order={selectedOrder}
            verificationNotes={verificationNotes}
            setVerificationNotes={
              setVerificationNotes
            }
            isSubmitting={isSubmitting}
            onVerify={verifyResult}
            onRecollection={requestRecollection}
            recollectionReason={
              recollectionReason
            }
            setRecollectionReason={
              setRecollectionReason
            }
          />
        );

      case "RECOLLECTION":
        return (
          <div className="space-y-5">
            <SectionHeading
              icon={
                <AlertTriangle className="h-5 w-5" />
              }
              title="Sample Recollection Required"
              description="The previous specimen cannot be used. Collect a replacement specimen."
            />

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>
                  <p className="font-semibold text-red-800">
                    Recollection reason
                  </p>

                  <p className="mt-1 text-sm leading-6 text-red-700">
                    {selectedOrder.recollectionReason ??
                      "A new specimen is required."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="New Sample / Specimen Type"
                required
              >
                <input
                  value={sampleType}
                  onChange={(event) =>
                    setSampleType(event.target.value)
                  }
                  placeholder="e.g. Blood"
                  className={inputClass}
                />
              </FormField>

              <FormField label="New Sample ID">
                <input
                  value="Generated automatically"
                  disabled
                  className={`${inputClass} bg-gray-50 text-gray-400`}
                />
              </FormField>
            </div>

            <FormField label="Collection Notes">
              <textarea
                value={collectionNotes}
                onChange={(event) =>
                  setCollectionNotes(event.target.value)
                }
                placeholder="Optional notes about the replacement specimen..."
                rows={4}
                className={textareaClass}
              />
            </FormField>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={
                  markRecollectionCollected
                }
                disabled={isSubmitting}
                className={primaryButtonClass}
              >
                <TestTube2 className="h-4 w-4" />
                {isSubmitting
                  ? "Collecting..."
                  : "Record Replacement Sample"}
              </button>
            </div>
          </div>
        );

      case "COMPLETED":
        return (
          <div className="space-y-5">
            <SectionHeading
              icon={
                <CheckCircle2 className="h-5 w-5" />
              }
              title="Verified Laboratory Result"
              description="This result has been verified and released."
            />

            {selectedOrder.result ? (
              <ResultTable
                result={selectedOrder.result}
              />
            ) : (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
                No result data is available for this
                completed order.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <InfoBox
                label="Verified At"
                value={
                  selectedOrder.verifiedAt ??
                  "Not recorded"
                }
              />

              <InfoBox
                label="Verified By"
                value={
                  selectedOrder.verifiedBy ??
                  "Not recorded"
                }
              />
            </div>

            {selectedOrder.verificationNotes && (
              <InfoBox
                label="Verification Notes"
                value={
                  selectedOrder.verificationNotes
                }
              />
            )}
          </div>
        );

      default:
        return null;
    }
  }

  if (selectedOrder) {
    const timeline = buildTimeline(
      selectedOrder
    );

    return (
      <div className="min-h-screen bg-[#f8fafc] text-gray-900">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-16 max-w-375 items-center justify-between px-5 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeOrder}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <Image
                src="/Logo.png"
                alt="Sparkle Eye Specialist Hospital"
                width={38}
                height={38}
                className="rounded-lg"
              />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Laboratory
                </p>

                <h1 className="text-sm font-semibold text-gray-900">
                  Investigation Details
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-375 px-5 py-6 lg:px-8">
          {actionMessage && (
            <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {actionMessage}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <section className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">
                        {selectedOrder.test}
                      </h2>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                          selectedOrder.status
                        )}`}
                      >
                        {renderStatusIcon(
                          selectedOrder.status
                        )}
                        {statusLabel(
                          selectedOrder.status
                        )}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${priorityClasses(
                          selectedOrder.priority
                        )}`}
                      >
                        {priorityLabel(
                          selectedOrder.priority
                        )}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      Order ID:{" "}
                      <span className="font-medium text-gray-700">
                        {selectedOrder.id}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <User className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedOrder.patientName}
                      </p>

                      <p className="text-sm text-gray-500">
                        {selectedOrder.patientId}
                        {selectedOrder.age
                          ? ` • ${selectedOrder.age} yrs`
                          : ""}
                        {selectedOrder.sex
                          ? ` • ${selectedOrder.sex}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                {renderActionForm()}
              </div>

              {selectedOrder.clinicalNotes && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <SectionHeading
                    icon={
                      <Activity className="h-5 w-5" />
                    }
                    title="Clinical Information"
                    description="Information supplied with the laboratory order."
                  />

                  <div className="mt-5 rounded-xl bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                    {selectedOrder.clinicalNotes}
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <SectionHeading
                  icon={
                    <Clock3 className="h-5 w-5" />
                  }
                  title="Order Timeline"
                  description="Laboratory workflow progress."
                />

                <div className="mt-6 space-y-0">
                  {timeline.map(
                    (item, index) => (
                      <div
                        key={item.label}
                        className="relative flex gap-4 pb-7 last:pb-0"
                      >
                        {index <
                          timeline.length - 1 && (
                          <div
                            className={`absolute left-2.5 top-6 h-full w-px ${
                              item.completed
                                ? "bg-emerald-200"
                                : "bg-gray-200"
                            }`}
                          />
                        )}

                        <div
                          className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            item.completed
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {item.completed && (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              item.completed
                                ? "text-gray-900"
                                : "text-gray-400"
                            }`}
                          >
                            {item.label}
                          </p>

                          {item.date && (
                            <p className="mt-1 text-xs text-gray-500">
                              {item.date}
                            </p>
                          )}

                          {item.by && (
                            <p className="mt-0.5 text-xs text-gray-400">
                              {item.by}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <SectionHeading
                  icon={
                    <FlaskConical className="h-5 w-5" />
                  }
                  title="Investigation"
                  description="Order information."
                />

                <div className="mt-5 space-y-4">
                  <InfoBox
                    label="Investigation"
                    value={selectedOrder.test}
                  />

                  <InfoBox
                    label="Ordered By"
                    value={selectedOrder.orderedBy}
                  />

                  <InfoBox
                    label="Ordered At"
                    value={selectedOrder.orderedAt}
                  />

                  <InfoBox
                    label="Priority"
                    value={priorityLabel(
                      selectedOrder.priority
                    )}
                  />
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-375 items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/Logo.png"
              alt="Sparkle Eye Specialist Hospital"
              width={38}
              height={38}
              className="rounded-lg"
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Clinical Services
              </p>

              <h1 className="text-sm font-semibold text-gray-900">
                Laboratory
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 sm:flex">
              <Microscope className="h-4 w-4 text-purple-600" />

              <span className="text-sm font-medium text-gray-700">
                Laboratory Scientist
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-375 px-5 py-7 lg:px-8">
        {actionMessage && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {actionMessage}
          </div>
        )}

        <div className="mb-7">
          <p className="text-sm font-medium text-purple-600">
            Laboratory Department
          </p>

          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Laboratory Dashboard
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Manage laboratory investigations from sample
            collection through result verification.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200">
          {[
            ["overview", "Overview"],
            ["queue", "Work Queue"],
            ["results", "Results"],
            ["history", "History"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setActiveTab(
                  value as
                    | "overview"
                    | "queue"
                    | "results"
                    | "history"
                )
              }
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === value
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex min-h-100 items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-purple-600" />
              Loading laboratory orders...
            </div>
          </div>
        ) : (
          <>
            <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <StatCard
                icon={
                  <Clock3 className="h-5 w-5" />
                }
                label="Pending"
                value={pendingCount}
                description="Awaiting collection"
              />

              <StatCard
                icon={
                  <Microscope className="h-5 w-5" />
                }
                label="Processing"
                value={processingCount}
                description="Currently processing"
              />

              <StatCard
                icon={
                  <FileCheck2 className="h-5 w-5" />
                }
                label="Verification"
                value={verificationCount}
                description="Awaiting verification"
              />

              <StatCard
                icon={
                  <CheckCircle2 className="h-5 w-5" />
                }
                label="Completed"
                value={completedCount}
                description="Released results"
              />

              <StatCard
                icon={
                  <AlertTriangle className="h-5 w-5" />
                }
                label="Recollection"
                value={recollectionCount}
                description="New sample required"
              />

              <StatCard
                icon={
                  <Activity className="h-5 w-5" />
                }
                label="Priority"
                value={urgentCount}
                description="Urgent or STAT"
              />
            </div>

            {activeTab === "overview" ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <SectionHeading
                    icon={
                      <Beaker className="h-5 w-5" />
                    }
                    title="Laboratory Workflow"
                    description="Follow each investigation through the laboratory process."
                  />

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <WorkflowCard
                      number="01"
                      title="Collect Sample"
                      description="Collect and identify the patient's specimen."
                      count={pendingCount}
                      icon={
                        <TestTube2 className="h-5 w-5" />
                      }
                    />

                    <WorkflowCard
                      number="02"
                      title="Receive Sample"
                      description="Inspect the specimen and confirm its condition."
                      count={
                        orders.filter(
                          (order) =>
                            order.status ===
                            "COLLECTED"
                        ).length
                      }
                      icon={
                        <FlaskConical className="h-5 w-5" />
                      }
                    />

                    <WorkflowCard
                      number="03"
                      title="Process Investigation"
                      description="Perform the required laboratory analysis."
                      count={processingCount}
                      icon={
                        <Microscope className="h-5 w-5" />
                      }
                    />

                    <WorkflowCard
                      number="04"
                      title="Verify Result"
                      description="Review and release the laboratory result."
                      count={verificationCount}
                      icon={
                        <FileCheck2 className="h-5 w-5" />
                      }
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <SectionHeading
                    icon={
                      <AlertTriangle className="h-5 w-5" />
                    }
                    title="Priority Queue"
                    description="Urgent and STAT investigations."
                  />

                  <div className="mt-5 space-y-3">
                    {orders
                      .filter(
                        (order) =>
                          order.priority ===
                            "URGENT" ||
                          order.priority === "STAT"
                      )
                      .slice(0, 8)
                      .map((order) => (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() =>
                            selectOrder(order)
                          }
                          className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-purple-200 hover:bg-purple-50/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {order.test}
                              </p>

                              <p className="mt-1 truncate text-xs text-gray-500">
                                {order.patientName} •{" "}
                                {order.patientId}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold ${priorityClasses(
                                order.priority
                              )}`}
                            >
                              {priorityLabel(
                                order.priority
                              )}
                            </span>
                          </div>

                          <p className="mt-3 text-xs text-gray-400">
                            {statusLabel(
                              order.status
                            )}
                          </p>
                        </button>
                      ))}

                    {orders.filter(
                      (order) =>
                        order.priority ===
                          "URGENT" ||
                        order.priority === "STAT"
                    ).length === 0 && (
                      <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
                        No urgent or STAT investigations
                        at the moment.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {activeTab === "queue"
                          ? "Laboratory Work Queue"
                          : activeTab === "results"
                            ? "Laboratory Results"
                            : "Laboratory History"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        {activeTab === "queue"
                          ? "Find and manage laboratory investigations."
                          : activeTab === "results"
                            ? "Review laboratory investigations and their results."
                            : "Review the laboratory investigation history."}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                        <input
                          value={search}
                          onChange={(event) =>
                            setSearch(
                              event.target.value
                            )
                          }
                          placeholder="Search patient, test..."
                          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100 sm:w-64"
                        />
                      </div>

                      <select
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(
                            event.target
                              .value as
                              | LabStatus
                              | "ALL"
                          )
                        }
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-purple-400"
                      >
                        <option value="ALL">
                          All Statuses
                        </option>
                        <option value="PENDING">
                          Pending
                        </option>
                        <option value="COLLECTED">
                          Collected
                        </option>
                        <option value="PROCESSING">
                          Processing
                        </option>
                        <option value="AWAITING_VERIFICATION">
                          Awaiting Verification
                        </option>
                        <option value="COMPLETED">
                          Completed
                        </option>
                        <option value="RECOLLECTION">
                          Recollection
                        </option>
                      </select>

                      <select
                        value={priorityFilter}
                        onChange={(event) =>
                          setPriorityFilter(
                            event.target
                              .value as
                              | Priority
                              | "ALL"
                          )
                        }
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-purple-400"
                      >
                        <option value="ALL">
                          All Priorities
                        </option>
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
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="p-12 text-center">
                    <FlaskConical className="mx-auto h-10 w-10 text-gray-300" />

                    <h3 className="mt-4 text-sm font-semibold text-gray-900">
                      No laboratory orders found
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Try changing your search or
                      filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-225">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/70 text-left">
                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Patient
                          </th>

                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Investigation
                          </th>

                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Priority
                          </th>

                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Status
                          </th>

                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Sample
                          </th>

                          <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Ordered
                          </th>

                          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredOrders.map(
                          (order) => (
                            <tr
                              key={order.id}
                              className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70"
                            >
                              <td className="px-5 py-4">
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {order.patientName}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-500">
                                    {order.patientId}
                                  </p>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm font-medium text-gray-900">
                                  {order.test}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {order.id}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${priorityClasses(
                                    order.priority
                                  )}`}
                                >
                                  {priorityLabel(
                                    order.priority
                                  )}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(
                                    order.status
                                  )}`}
                                >
                                  {renderStatusIcon(
                                    order.status
                                  )}
                                  {statusLabel(
                                    order.status
                                  )}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <div>
                                  <p className="text-sm text-gray-700">
                                    {order.sampleType ??
                                      "—"}
                                  </p>

                                  <p className="mt-1 text-xs text-gray-400">
                                    {order.sampleId ??
                                      "No sample"}
                                  </p>
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm text-gray-700">
                                  {order.orderedAt}
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                  {order.orderedBy}
                                </p>
                              </td>

                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    selectOrder(
                                      order
                                    )
                                  }
                                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                                >
                                  Open
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100";

const textareaClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100";

const primaryButtonClass =
  "inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50";

const dangerButtonClass =
  "inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";

function FormField({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium leading-6 text-gray-800">
        {value}
      </p>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
        {icon}
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">
          {title}
        </h3>

        {description && (
          <p className="mt-1 text-sm leading-5 text-gray-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          {icon}
        </div>

        <span className="text-2xl font-semibold text-gray-900">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-gray-900">
        {label}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {description}
      </p>
    </div>
  );
}

function WorkflowCard({
  number,
  title,
  description,
  count,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 p-5 transition hover:border-purple-200 hover:bg-purple-50/30">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          {icon}
        </div>

        <span className="text-xs font-semibold text-gray-400">
          {number}
        </span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <h4 className="font-semibold text-gray-900">
            {title}
          </h4>

          <p className="mt-1 text-sm leading-5 text-gray-500">
            {description}
          </p>
        </div>

        <span className="text-2xl font-semibold text-gray-900">
          {count}
        </span>
      </div>
    </div>
  );
}

function ResultEntryForm({
  parameters,
  comments,
  isSubmitting,
  onParameterChange,
  onAddParameter,
  onRemoveParameter,
  onCommentsChange,
  onSave,
}: {
  parameters: ResultParameter[];
  comments: string;
  isSubmitting: boolean;
  onParameterChange: (
    index: number,
    field: keyof ResultParameter,
    value: string
  ) => void;
  onAddParameter: () => void;
  onRemoveParameter: (index: number) => void;
  onCommentsChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-5">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h4 className="font-semibold text-gray-900">
            Laboratory Result
          </h4>

          <p className="mt-1 text-sm text-gray-500">
            Enter the measured values and submit for
            verification.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddParameter}
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Add Parameter
        </button>
      </div>

      <div className="space-y-3">
        {parameters.map(
          (parameter, index) => (
            <div
              key={`${parameter.name}-${index}`}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_0.8fr_1.2fr_0.8fr_auto]">
                <FormField label="Parameter">
                  <input
                    value={parameter.name}
                    onChange={(event) =>
                      onParameterChange(
                        index,
                        "name",
                        event.target.value
                      )
                    }
                    className={inputClass}
                    placeholder="e.g. Haemoglobin"
                  />
                </FormField>

                <FormField label="Result">
                  {qualitativeOptions(parameter.name) ? (
                    <select
                      value={parameter.result}
                      onChange={(event) => onParameterChange(index, "result", event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select result</option>
                      {qualitativeOptions(parameter.name)!.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={parameter.result}
                      onChange={(event) =>
                        onParameterChange(index, "result", event.target.value)
                      }
                      className={inputClass}
                      placeholder="Enter measured result"
                    />
                  )}
                </FormField>

                <FormField label="Unit">
                  <input
                    value={parameter.unit}
                    onChange={(event) =>
                      onParameterChange(
                        index,
                        "unit",
                        event.target.value
                      )
                    }
                    className={inputClass}
                    placeholder="Unit"
                  />
                </FormField>

                <FormField label="Normal Range / Reference">
                  <input
                    value={
                      parameter.referenceRange
                    }
                    onChange={(event) =>
                      onParameterChange(
                        index,
                        "referenceRange",
                        event.target.value
                      )
                    }
                    className={inputClass}
                    placeholder="Reference"
                  />
                </FormField>

                <FormField label="Flag">
                  <select
                    value={parameter.flag}
                    onChange={(event) =>
                      onParameterChange(
                        index,
                        "flag",
                        event.target.value
                      )
                    }
                    className={inputClass}
                  >
                    <option value="NORMAL">
                      Normal
                    </option>
                    <option value="LOW">
                      Low
                    </option>
                    <option value="HIGH">
                      High
                    </option>
                    <option value="CRITICAL">
                      Critical
                    </option>
                  </select>
                </FormField>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() =>
                      onRemoveParameter(index)
                    }
                    disabled={
                      parameters.length === 1
                    }
                    className="mb-0 flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Remove parameter"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-5">
        <FormField label="Laboratory Comments">
          <textarea
            value={comments}
            onChange={(event) =>
              onCommentsChange(
                event.target.value
              )
            }
            rows={4}
            placeholder="Add relevant laboratory comments..."
            className={textareaClass}
          />
        </FormField>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={isSubmitting}
          className={primaryButtonClass}
        >
          <FileCheck2 className="h-4 w-4" />
          {isSubmitting
            ? "Submitting..."
            : "Save & Submit for Verification"}
        </button>
      </div>
    </div>
  );
}

function ResultTable({
  result,
}: {
  result: LabResult;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full min-w-175">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Parameter
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Result
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Unit
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Reference
              </th>

              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Flag
              </th>
            </tr>
          </thead>

          <tbody>
            {result.parameters.map(
              (parameter, index) => (
                <tr
                  key={`${parameter.name}-${index}`}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {parameter.name}
                  </td>

                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {parameter.result}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-600">
                    {parameter.unit || "—"}
                  </td>

                  <td className="px-4 py-3 text-sm text-gray-600">
                    {parameter.referenceRange ||
                      "—"}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${flagClasses(
                        parameter.flag
                      )}`}
                    >
                      {parameter.flag}
                    </span>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {result.comments && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Laboratory Comments
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-700">
            {result.comments}
          </p>
        </div>
      )}
    </div>
  );
}

function VerificationPanel({
  order,
  verificationNotes,
  setVerificationNotes,
  isSubmitting,
  onVerify,
  onRecollection,
  recollectionReason,
  setRecollectionReason,
}: {
  order: LabOrder;
  verificationNotes: string;
  setVerificationNotes: (
    value: string
  ) => void;
  isSubmitting: boolean;
  onVerify: () => void;
  onRecollection: () => void;
  recollectionReason: string;
  setRecollectionReason: (
    value: string
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionHeading
        icon={
          <FileCheck2 className="h-5 w-5" />
        }
        title="Result Verification"
        description="Review the laboratory result before releasing it."
      />

      {order.result ? (
        <ResultTable result={order.result} />
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          No result data is currently available for
          verification.
        </div>
      )}

      <FormField label="Verification Notes">
        <textarea
          value={verificationNotes}
          onChange={(event) =>
            setVerificationNotes(
              event.target.value
            )
          }
          rows={4}
          placeholder="Add verification notes..."
          className={textareaClass}
        />
      </FormField>

      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />

          <div>
            <p className="font-semibold text-orange-800">
              Need a new specimen?
            </p>

            <p className="mt-1 text-sm leading-6 text-orange-700">
              If the result cannot be safely released
              because a new specimen is required, provide
              the reason below and request recollection.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <FormField label="Recollection Reason">
            <textarea
              value={recollectionReason}
              onChange={(event) =>
                setRecollectionReason(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Explain why recollection is required..."
              className={textareaClass}
            />
          </FormField>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onRecollection}
          disabled={
            isSubmitting ||
            !recollectionReason.trim()
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <AlertTriangle className="h-4 w-4" />
          Request Recollection
        </button>

        <button
          type="button"
          onClick={onVerify}
          disabled={
            isSubmitting || !order.result
          }
          className={primaryButtonClass}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isSubmitting
            ? "Verifying..."
            : "Verify & Release Result"}
        </button>
      </div>
    </div>
  );
}