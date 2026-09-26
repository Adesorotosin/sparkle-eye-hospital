// app/api/notifications/route.ts

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

type NotificationType =
  | "Emergency"
  | "Announcement"
  | "Clinical"
  | "Finance";

type NotificationCategory =
  | "Announcements"
  | "Clinical Escalations"
  | "Finance"
  | "Security";

const ALLOWED_TYPES: NotificationType[] = [
  "Emergency",
  "Announcement",
  "Clinical",
  "Finance",
];

const ALLOWED_CATEGORIES: NotificationCategory[] = [
  "Announcements",
  "Clinical Escalations",
  "Finance",
  "Security",
];

function timeAgo(dateStr?: string | null) {
  if (!dateStr) {
    return "Just now";
  }

  const time = new Date(dateStr).getTime();

  if (Number.isNaN(time)) {
    return "Just now";
  }

  const diffMs = Date.now() - time;
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) {
    return "Just now";
  }

  if (mins < 60) {
    return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(mins / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function normalizeNotification(
  notification: any
) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    timestamp: timeAgo(notification.created_at),
    triggeredBy: notification.triggered_by,
    target: notification.target,
    category: notification.category,
    createdAt: notification.created_at,
  };
}

// ------------------------------------------------------------
// GET
// Admin notification center feed.
//
// This endpoint intentionally remains IT_ADMIN-only because
// derived alerts include financial information such as unpaid
// invoice amounts and patient names.
// ------------------------------------------------------------
export async function GET() {
  try {
    await requireRole(["IT_ADMIN"]);

    const [
      manualRes,
      stockRes,
      invoiceRes,
      loginRes,
    ] = await Promise.allSettled([
      supabaseServer
        .from("notifications")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(50),

      supabaseServer
        .from("inventory_items")
        .select("*"),

      supabaseServer
        .from("invoices")
        .select(
          "id, invoice_no, grand_total, created_at, patients:patient_id(full_name)"
        )
        .in("status", ["draft", "pending"])
        .order("created_at", {
          ascending: false,
        })
        .limit(10),

      supabaseServer
        .from("security_logs")
        .select(
          "id, action, username_attempted, ip_address, created_at, risk_level"
        )
        .in("risk_level", ["MEDIUM", "CRITICAL"])
        .order("created_at", {
          ascending: false,
        })
        .limit(10),
    ]);

    const manual =
      manualRes.status === "fulfilled" &&
      !manualRes.value.error
        ? manualRes.value.data ?? []
        : [];

    const inventory =
      stockRes.status === "fulfilled" &&
      !stockRes.value.error
        ? stockRes.value.data ?? []
        : [];

    const unpaidInvoices =
      invoiceRes.status === "fulfilled" &&
      !invoiceRes.value.error
        ? invoiceRes.value.data ?? []
        : [];

    const riskyLogins =
      loginRes.status === "fulfilled" &&
      !loginRes.value.error
        ? loginRes.value.data ?? []
        : [];

    if (
      manualRes.status === "fulfilled" &&
      manualRes.value.error
    ) {
      console.warn(
        "Notifications query warning:",
        manualRes.value.error.message
      );
    }

    if (
      stockRes.status === "fulfilled" &&
      stockRes.value.error
    ) {
      console.warn(
        "Inventory query warning:",
        stockRes.value.error.message
      );
    }

    if (
      invoiceRes.status === "fulfilled" &&
      invoiceRes.value.error
    ) {
      console.warn(
        "Invoice query warning:",
        invoiceRes.value.error.message
      );
    }

    if (
      loginRes.status === "fulfilled" &&
      loginRes.value.error
    ) {
      console.warn(
        "Security log query warning:",
        loginRes.value.error.message
      );
    }

    const derived: any[] = [];

    // ----------------------------------------------------------
    // 1. LOW STOCK
    // ----------------------------------------------------------
    inventory
      .filter(
        (item: any) =>
          Number(item.stock) <=
          Number(item.reorder_level)
      )
      .forEach((item: any) => {
        derived.push({
          id: `stock-${item.id}`,
          type: "Finance",
          title: `Low Stock: ${item.name}`,
          message: `Only ${item.stock} left in stock (reorder level: ${item.reorder_level}). SKU ${
            item.sku ?? "N/A"
          }.`,
          timestamp: timeAgo(
            item.updated_at ?? item.created_at
          ),
          target:
            item.domain === "pharmacy"
              ? "Pharmacy"
              : "Inventory Staff",
          category: "Finance",
          createdAt:
            item.updated_at ??
            item.created_at ??
            null,
        });
      });

    // ----------------------------------------------------------
    // 2. UNPAID INVOICES
    // ----------------------------------------------------------
    unpaidInvoices.forEach((invoice: any) => {
      const patientName =
        invoice.patients?.full_name ??
        "a patient";

      derived.push({
        id: `invoice-${invoice.id}`,
        type: "Finance",
        title: `Unpaid Invoice: ${
          invoice.invoice_no ?? invoice.id
        }`,
        message: `₦${Number(
          invoice.grand_total ?? 0
        ).toLocaleString()} outstanding for ${patientName}.`,
        timestamp: timeAgo(invoice.created_at),
        target: "Billing & Cashier Department",
        category: "Finance",
        createdAt: invoice.created_at,
      });
    });

    // ----------------------------------------------------------
    // 3. RISKY SECURITY EVENTS
    // ----------------------------------------------------------
    riskyLogins.forEach((log: any) => {
      derived.push({
        id: `login-${log.id}`,
        type: "Emergency",
        title: log.action ?? "Security Event",
        message: `Attempted username "${
          log.username_attempted ?? "Unknown"
        }" from ${
          log.ip_address ?? "unknown IP"
        }.`,
        timestamp: timeAgo(log.created_at),
        target: "IT Admin",
        category: "Security",
        createdAt: log.created_at,
      });
    });

    // ----------------------------------------------------------
    // 4. MANUAL NOTIFICATIONS
    // ----------------------------------------------------------
    const manualMapped = manual.map(
      (notification: any) =>
        normalizeNotification(notification)
    );

    const allNotifications = [
      ...manualMapped,
      ...derived,
    ].sort((a, b) => {
      const aTime = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;

      const bTime = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return bTime - aTime;
    });

    return NextResponse.json(
      {
        notifications: allNotifications,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        {
          error:
            "Only IT administrators can access the notification center.",
        },
        { status: 403 }
      );
    }

    console.error(
      "Notifications GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load notifications.",
      },
      { status: 500 }
    );
  }
}

// ------------------------------------------------------------
// POST
// Create a manual notification/broadcast.
//
// The browser does NOT provide triggered_by.
// The authenticated staff member is used instead.
// ------------------------------------------------------------
export async function POST(
  request: Request
) {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
    ]);

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null
    ) {
      return NextResponse.json(
        {
          error:
            "Request body must be a JSON object.",
        },
        { status: 400 }
      );
    }

    const {
      type,
      title,
      message,
      category,
      target,
    } = body as {
      type?: unknown;
      title?: unknown;
      message?: unknown;
      category?: unknown;
      target?: unknown;
    };

    if (
      typeof type !== "string" ||
      typeof title !== "string" ||
      typeof message !== "string" ||
      typeof category !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Type, title, message, and category are required.",
        },
        { status: 400 }
      );
    }

    const cleanType =
      type.trim() as NotificationType;

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    const cleanCategory =
      category.trim() as NotificationCategory;

    if (
      !ALLOWED_TYPES.includes(
        cleanType
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid notification type.",
        },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_CATEGORIES.includes(
        cleanCategory
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid notification category.",
        },
        { status: 400 }
      );
    }

    if (!cleanTitle) {
      return NextResponse.json(
        {
          error:
            "Notification title cannot be empty.",
        },
        { status: 400 }
      );
    }

    if (!cleanMessage) {
      return NextResponse.json(
        {
          error:
            "Notification message cannot be empty.",
        },
        { status: 400 }
      );
    }

    if (cleanTitle.length > 200) {
      return NextResponse.json(
        {
          error:
            "Notification title is too long.",
        },
        { status: 400 }
      );
    }

    if (cleanMessage.length > 5000) {
      return NextResponse.json(
        {
          error:
            "Notification message is too long.",
        },
        { status: 400 }
      );
    }

    if (
      target !== undefined &&
      target !== null &&
      typeof target !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Target must be a string.",
        },
        { status: 400 }
      );
    }

    const cleanTarget =
      typeof target === "string" &&
      target.trim()
        ? target.trim()
        : null;

    // ----------------------------------------------------------
    // Create notification
    // ----------------------------------------------------------
    const {
      data,
      error,
    } = await supabaseServer
      .from("notifications")
      .insert({
        type: cleanType,
        title: cleanTitle,
        message: cleanMessage,
        category: cleanCategory,
        target: cleanTarget,
        triggered_by:
          staff.name ||
          staff.staffId ||
          "IT Administrator",
      })
      .select("*")
      .single();

    if (error) {
      console.error(
        "Supabase notification insert error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Failed to save notification.",
        },
        { status: 500 }
      );
    }

    // ----------------------------------------------------------
    // Create audit record
    //
    // A notification broadcast is an administrative action,
    // not a financial transaction, so financial_amount is
    // intentionally omitted.
    // ----------------------------------------------------------
    const auditDetails =
      cleanType === "Emergency"
        ? `Emergency notification broadcast: "${cleanTitle}". Target: ${
            cleanTarget ?? "Unspecified"
          }.`
        : `Hospital notification published: "${cleanTitle}". Target: ${
            cleanTarget ?? "Unspecified"
          }.`;

    const {
      error: auditError,
    } = await supabaseServer
      .from("activity_logs")
      .insert({
        staff_id: staff.id,
        module: "NOTIFICATIONS",
        category: "ADMIN",
        action:
          cleanType === "Emergency"
            ? "BROADCAST_EMERGENCY_ALERT"
            : "PUBLISH_ANNOUNCEMENT",
        details: auditDetails,
        performed_by:
          staff.name ||
          staff.staffId ||
          "IT Administrator",
      });

    if (auditError) {
      // The notification was already created successfully.
      // Do not roll it back just because the audit insert failed.
      console.error(
        "Notification audit log error:",
        auditError
      );
    }

    return NextResponse.json(
      {
        notification:
          normalizeNotification(data),
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        { status: 401 }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        {
          error:
            "Only IT administrators can broadcast notifications.",
        },
        { status: 403 }
      );
    }

    console.error(
      "Notification broadcast error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to broadcast notification.",
      },
      { status: 500 }
    );
  }
}