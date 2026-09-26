import { NextResponse } from "next/server";

import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

type DateRange =
  | "Last 7 Days"
  | "Last 30 Days"
  | "This Quarter"
  | "Year to Date";

type Department =
  | "All Departments"
  | "Optometry & Diagnostics"
  | "Pharmacy & Optical"
  | "Billing & Reception";

type ExportFormat = "CSV";

interface ReportRequestBody {
  reportId?: string;
  reportTitle?: string;
  dateRange?: string;
  department?: string;
  format?: string;
  preview?: boolean;
}

interface InvoiceRow {
  id: string;
  invoice_no: string;
  patient_id: string;
  status: string;
  grand_total: number | string | null;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
}

interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  category: string;
  name: string;
  quantity: number;
  unit_price: number | string;
  total_price: number | string;
}

interface PatientRow {
  id: string;
  full_name: string;
  patient_code: string;
}

interface ReportLine {
  invoice_no: string;
  patient_code: string;
  patient_name: string;
  item_name: string;
  category: string;
  quantity: number;
  unit_price: number;
  item_total: number;
  payment_method: string;
  grand_total: number;
  paid_at: string;
}

interface RevenuePreview {
  title: string;
  dateRange: string;
  department: string;
  recordCount: number;
  lineCount: number;
  totalRevenue: number;
  paymentMethodTotals: Record<string, number>;
  rows: Array<{
    invoice_no: string;
    patient_name: string;
    item_name: string;
    payment_method: string;
    grand_total: number;
  }>;
}

const LIVE_REPORT_IDS = new Set<string>(["fin-1"]);

const VALID_DATE_RANGES = new Set<DateRange>([
  "Last 7 Days",
  "Last 30 Days",
  "This Quarter",
  "Year to Date",
]);

const VALID_DEPARTMENTS = new Set<Department>([
  "All Departments",
  "Optometry & Diagnostics",
  "Pharmacy & Optical",
  "Billing & Reception",
]);

const VALID_FORMATS = new Set<ExportFormat>(["CSV"]);

function isDateRange(value: string): value is DateRange {
  return VALID_DATE_RANGES.has(value as DateRange);
}

function isDepartment(value: string): value is Department {
  return VALID_DEPARTMENTS.has(value as Department);
}

function isExportFormat(value: string): value is ExportFormat {
  return VALID_FORMATS.has(value as ExportFormat);
}

/**
 * Returns the start of the requested reporting period.
 *
 * We use the server's current date for the report period and
 * keep the end boundary exclusive by using "now".
 */
function getStartDate(dateRange: DateRange): Date {
  const now = new Date();

  switch (dateRange) {
    case "Last 7 Days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return start;
    }

    case "Last 30 Days": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return start;
    }

    case "This Quarter": {
      const month = now.getMonth();
      const quarterStartMonth = Math.floor(month / 3) * 3;

      return new Date(
        now.getFullYear(),
        quarterStartMonth,
        1,
        0,
        0,
        0,
        0
      );
    }

    case "Year to Date": {
      return new Date(
        now.getFullYear(),
        0,
        1,
        0,
        0,
        0,
        0
      );
    }
  }
}

/**
 * Determines whether an invoice item belongs to the
 * selected department.
 *
 * The database currently stores invoice item categories rather
 * than a separate department field, so this mapping keeps the
 * filter tied to real invoice data without inventing another
 * database field.
 */
function itemBelongsToDepartment(
  category: string,
  department: Department
): boolean {
  if (department === "All Departments") {
    return true;
  }

  switch (department) {
    case "Optometry & Diagnostics":
      return category === "diagnostic";

    case "Pharmacy & Optical":
      return category === "pharmacy";

    case "Billing & Reception":
      return (
        category === "consultation" ||
        category === "consumable"
      );

    default:
      return true;
  }
}

function escapeCsvValue(value: unknown): string {
  const stringValue =
    value === null || value === undefined
      ? ""
      : String(value);

  const escaped = stringValue.replace(
    /"/g,
    '""'
  );

  return `"${escaped}"`;
}

function formatCsvDate(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildCsv(
  rows: ReportLine[],
  dateRange: DateRange,
  department: Department
): string {
  const header = [
    "Invoice No",
    "Patient Code",
    "Patient Name",
    "Item",
    "Category",
    "Quantity",
    "Unit Price",
    "Item Total",
    "Payment Method",
    "Invoice Total",
    "Paid At",
  ];

  const csvRows = rows.map((row) => [
    row.invoice_no,
    row.patient_code,
    row.patient_name,
    row.item_name,
    row.category,
    row.quantity,
    row.unit_price.toFixed(2),
    row.item_total.toFixed(2),
    row.payment_method,
    row.grand_total.toFixed(2),
    formatCsvDate(row.paid_at),
  ]);

  const lines = [
    `Sparkle Eye Specialist Hospital`,
    `Daily Revenue & POS Cash Register Ledger`,
    `Date Range: ${dateRange}`,
    `Department: ${department}`,
    `Generated At: ${formatCsvDate(
      new Date().toISOString()
    )}`,
    "",
    header.map(escapeCsvValue).join(","),
    ...csvRows.map((row) =>
      row.map(escapeCsvValue).join(",")
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}

async function buildRevenueReport(
  dateRange: DateRange,
  department: Department
): Promise<{
  rows: ReportLine[];
  preview: RevenuePreview;
}> {
  const startDate = getStartDate(dateRange);
  const endDate = new Date();

  /*
   * Only paid invoices belong in this revenue report.
   *
   * paid_at is preferred for the reporting period because it
   * represents when the payment actually happened.
   */
  const {
    data: invoices,
    error: invoicesError,
  } = await supabaseServer
    .from("invoices")
    .select(
      `
        id,
        invoice_no,
        patient_id,
        status,
        grand_total,
        payment_method,
        paid_at,
        created_at
      `
    )
    .eq("status", "paid")
    .gte(
      "paid_at",
      startDate.toISOString()
    )
    .lt(
      "paid_at",
      endDate.toISOString()
    )
    .order("paid_at", {
      ascending: false,
    });

  if (invoicesError) {
    throw invoicesError;
  }

  const invoiceRows =
    (invoices ?? []) as InvoiceRow[];

  if (invoiceRows.length === 0) {
    return {
      rows: [],
      preview: {
        title:
          "Daily Revenue & POS Cash Register Ledger",
        dateRange,
        department,
        recordCount: 0,
        lineCount: 0,
        totalRevenue: 0,
        paymentMethodTotals: {},
        rows: [],
      },
    };
  }

  const invoiceIds = invoiceRows.map(
    (invoice) => invoice.id
  );

  const patientIds = Array.from(
    new Set(
      invoiceRows.map(
        (invoice) => invoice.patient_id
      )
    )
  );

  const [
    { data: invoiceItems, error: itemsError },
    { data: patients, error: patientsError },
  ] = await Promise.all([
    supabaseServer
      .from("invoice_items")
      .select(
        `
          id,
          invoice_id,
          category,
          name,
          quantity,
          unit_price,
          total_price
        `
      )
      .in("invoice_id", invoiceIds)
      .order("id", {
        ascending: true,
      }),

    supabaseServer
      .from("patients")
      .select(
        `
          id,
          full_name,
          patient_code
        `
      )
      .in("id", patientIds),
  ]);

  if (itemsError) {
    throw itemsError;
  }

  if (patientsError) {
    throw patientsError;
  }

  const itemRows =
    (invoiceItems ?? []) as InvoiceItemRow[];

  const patientRows =
    (patients ?? []) as PatientRow[];

  const patientMap = new Map<
    string,
    PatientRow
  >();

  for (const patient of patientRows) {
    patientMap.set(patient.id, patient);
  }

  const invoiceMap = new Map<
    string,
    InvoiceRow
  >();

  for (const invoice of invoiceRows) {
    invoiceMap.set(invoice.id, invoice);
  }

  const reportRows: ReportLine[] = [];

  for (const item of itemRows) {
    if (
      !itemBelongsToDepartment(
        item.category,
        department
      )
    ) {
      continue;
    }

    const invoice = invoiceMap.get(
      item.invoice_id
    );

    if (!invoice) {
      continue;
    }

    const patient = patientMap.get(
      invoice.patient_id
    );

    reportRows.push({
      invoice_no: invoice.invoice_no,

      patient_code:
        patient?.patient_code || "—",

      patient_name:
        patient?.full_name || "Unknown Patient",

      item_name: item.name,

      category: item.category,

      quantity:
        Number(item.quantity) || 0,

      unit_price:
        Number(item.unit_price) || 0,

      item_total:
        Number(item.total_price) || 0,

      payment_method:
        invoice.payment_method || "unknown",

      grand_total:
        Number(invoice.grand_total) || 0,

      // FIX:
      // invoice.paid_at is string | null,
      // while ReportLine.paid_at requires string.
      paid_at:
        invoice.paid_at ?? "",
    });
  }

  const reportInvoiceIds = new Set(
    reportRows.map((row) => row.invoice_no)
  );

  const relevantInvoices = invoiceRows.filter(
    (invoice) =>
      reportInvoiceIds.has(invoice.invoice_no)
  );

  const totalRevenue =
    relevantInvoices.reduce(
      (sum, invoice) =>
        sum +
        (Number(invoice.grand_total) || 0),
      0
    );

  const paymentMethodTotals: Record<
    string,
    number
  > = {};

  for (const invoice of relevantInvoices) {
    const method =
      invoice.payment_method ||
      "unknown";

    paymentMethodTotals[method] =
      (paymentMethodTotals[method] || 0) +
      (Number(invoice.grand_total) || 0);
  }

  const previewRows = reportRows
    .slice(0, 20)
    .map((row) => ({
      invoice_no: row.invoice_no,
      patient_name: row.patient_name,
      item_name: row.item_name,
      payment_method:
        row.payment_method,
      grand_total:
        row.grand_total,
    }));

  return {
    rows: reportRows,

    preview: {
      title:
        "Daily Revenue & POS Cash Register Ledger",

      dateRange,

      department,

      recordCount:
        relevantInvoices.length,

      lineCount:
        reportRows.length,

      totalRevenue,

      paymentMethodTotals,

      rows: previewRows,
    },
  };
}

export async function POST(
  request: Request
) {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
    ]);

    let body: ReportRequestBody;

    try {
      body =
        (await request.json()) as ReportRequestBody;
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const reportId =
      typeof body.reportId === "string"
        ? body.reportId.trim()
        : "";

    const reportTitle =
      typeof body.reportTitle === "string"
        ? body.reportTitle.trim()
        : "";

    const dateRangeValue =
      typeof body.dateRange === "string"
        ? body.dateRange
        : "Last 30 Days";

    const departmentValue =
      typeof body.department === "string"
        ? body.department
        : "All Departments";

    const formatValue =
      typeof body.format === "string"
        ? body.format.toUpperCase()
        : "CSV";

    const preview =
      body.preview === true;

    if (!reportId) {
      return NextResponse.json(
        {
          error:
            "Report ID is required.",
        },
        { status: 400 }
      );
    }

    if (!LIVE_REPORT_IDS.has(reportId)) {
      return NextResponse.json(
        {
          error:
            "This report has not been connected to the live reporting engine yet.",
        },
        { status: 400 }
      );
    }

    if (
      reportId === "fin-1" &&
      reportTitle !==
        "Daily Revenue & POS Cash Register Ledger"
    ) {
      return NextResponse.json(
        {
          error:
            "The report title does not match the selected report.",
        },
        { status: 400 }
      );
    }

    if (!isDateRange(dateRangeValue)) {
      return NextResponse.json(
        {
          error:
            "Invalid report date range.",
        },
        { status: 400 }
      );
    }

    if (!isDepartment(departmentValue)) {
      return NextResponse.json(
        {
          error:
            "Invalid report department.",
        },
        { status: 400 }
      );
    }

    if (!isExportFormat(formatValue)) {
      return NextResponse.json(
        {
          error:
            "Only CSV export is currently supported.",
        },
        { status: 400 }
      );
    }

    const {
      rows,
      preview: reportPreview,
    } = await buildRevenueReport(
      dateRangeValue,
      departmentValue
    );

    if (preview) {
      return NextResponse.json({
        report: reportPreview,
      });
    }

    const csv = buildCsv(
      rows,
      dateRangeValue,
      departmentValue
    );

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const safeDepartment =
      departmentValue
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const filename =
      `Sparkle_Eye_Revenue_Ledger_${today}` +
      `${
        safeDepartment
          ? `_${safeDepartment}`
          : ""
      }.csv`;

    /*
     * Record the export in the hospital activity log.
     *
     * This is deliberately written after the report has been
     * generated successfully. A failed export should not appear
     * as a successful report export in the audit trail.
     */
    const { error: auditError } =
      await supabaseServer
        .from("activity_logs")
        .insert({
          staff_id: staff.id,
          module: "ADMIN_REPORTS",
          category: "ADMIN",
          action:
            "GENERATED_REVENUE_REPORT",
          details:
            `Generated Daily Revenue & POS Cash Register Ledger. Date range: ${dateRangeValue}. Department: ${departmentValue}. Format: CSV. Records: ${rows.length}.`,
          financial_amount:
            reportPreview.totalRevenue,
          performed_by:
            staff.name ||
            staff.staffId ||
            "IT Admin",
        });

    if (auditError) {
      /*
       * Do not fail the report download because audit logging
       * failed. The report itself was successfully generated.
       *
       * The error is still logged server-side for investigation.
       */
      console.error(
        "Failed to write report export activity log:",
        auditError
      );
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",

        "Content-Disposition":
          `attachment; filename="${filename}"`,

        "Cache-Control":
          "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error(
      "Admin reports error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "UNAUTHENTICATED"
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to generate admin reports.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to generate the requested report.",
      },
      { status: 500 }
    );
  }
}