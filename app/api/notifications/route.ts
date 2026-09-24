// app/api/notifications/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireRole } from "@/lib/server-auth";

function timeAgo(dateStr?: string | null) {
  if (!dateStr) return "Just now";

  const time = new Date(dateStr).getTime();

  if (Number.isNaN(time)) {
    return "Just now";
  }

  const diffMs = Date.now() - time;
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "Just now";

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

// --- GET: Fetch manual notifications + live-derived system alerts ---
export async function GET() {
  try {
    await requireRole([
      "IT_ADMIN",
      "PHARMACIST",
      "RECEPTIONIST",
      "CASHIER",
      "NURSE",
      "OPHTHALMOLOGIST",
      "DOCTOR",
    ]);

    const [
      manualRes,
      stockRes,
      invoiceRes,
      loginRes,
    ] = await Promise.allSettled([
      supabaseServer
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),

      supabaseServer
        .from("inventory_items")
        .select("*"),

      supabaseServer
        .from("invoices")
        .select("*, patients:patient_id(full_name)")
        .in("status", ["draft", "pending"])
        .order("created_at", { ascending: false })
        .limit(10),

      supabaseServer
        .from("security_logs")
        .select("*")
        .in("risk_level", ["MEDIUM", "CRITICAL"])
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const manual =
      manualRes.status === "fulfilled" && !manualRes.value.error
        ? manualRes.value.data
        : [];

    const lowStock =
      stockRes.status === "fulfilled" && !stockRes.value.error
        ? stockRes.value.data
        : [];

    const unpaidInvoices =
      invoiceRes.status === "fulfilled" && !invoiceRes.value.error
        ? invoiceRes.value.data
        : [];

    const riskyLogins =
      loginRes.status === "fulfilled" && !loginRes.value.error
        ? loginRes.value.data
        : [];

    if (
      manualRes.status === "fulfilled" &&
      manualRes.value.error
    ) {
      console.warn(
        "Notifications table query warning:",
        manualRes.value.error.message
      );
    }

    if (
      stockRes.status === "fulfilled" &&
      stockRes.value.error
    ) {
      console.warn(
        "Inventory items table query warning:",
        stockRes.value.error.message
      );
    }

    if (
      invoiceRes.status === "fulfilled" &&
      invoiceRes.value.error
    ) {
      console.warn(
        "Invoices table query warning:",
        invoiceRes.value.error.message
      );
    }

    if (
      loginRes.status === "fulfilled" &&
      loginRes.value.error
    ) {
      console.warn(
        "Security logs table query warning:",
        loginRes.value.error.message
      );
    }

    const derived: any[] = [];

    // 1. Low stock items
    (lowStock ?? [])
      .filter(
        (item) =>
          Number(item.stock) <=
          Number(item.reorder_level)
      )
      .forEach((item) => {
        derived.push({
          id: `stock-${item.id}`,
          type: "Finance",
          title: `Low Stock: ${item.name}`,
          message: `Only ${item.stock} left in stock (reorder level: ${item.reorder_level}). SKU ${item.sku ?? "N/A"}.`,
          timestamp: timeAgo(
            item.updated_at ?? item.created_at
          ),
          target:
            item.domain === "pharmacy"
              ? "Pharmacy"
              : "Inventory Staff",
          category: "Security",
        });
      });

    // 2. Unpaid invoices
    (unpaidInvoices ?? []).forEach((inv) => {
      derived.push({
        id: `invoice-${inv.id}`,
        type: "Finance",
        title: `Unpaid Invoice: ${inv.invoice_no ?? inv.id}`,
        message: `₦${Number(
          inv.grand_total ?? 0
        ).toLocaleString()} outstanding for ${
          inv.patients?.full_name ?? "a patient"
        }.`,
        timestamp: timeAgo(inv.created_at),
        target: "Billing & Cashier Dept",
        category: "Security",
      });
    });

    // 3. Risky login attempts
    (riskyLogins ?? []).forEach((log) => {
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
      });
    });

    // 4. Manual notifications
    const manualMapped = (manual ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: timeAgo(n.created_at),
      triggeredBy: n.triggered_by,
      target: n.target,
      category: n.category,
      _createdAt: n.created_at,
    }));

    const allNotifications = [
      ...manualMapped,
      ...derived,
    ];

    return NextResponse.json(
      {
        notifications: allNotifications,
      },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        {
          error:
            "You do not have permission to view notifications.",
        },
        { status: 403 }
      );
    }

    console.error("Notifications error:", error);

    return NextResponse.json(
      {
        error: "Failed to load notifications",
      },
      { status: 500 }
    );
  }
}

// --- POST: Broadcast a manual notification ---
export async function POST(request: Request) {
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
          error: "Invalid JSON request body.",
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
          error: "Request body must be a JSON object.",
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
      !type.trim() ||
      typeof title !== "string" ||
      !title.trim() ||
      typeof message !== "string" ||
      !message.trim() ||
      typeof category !== "string" ||
      !category.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "'type', 'title', 'message', and 'category' are required.",
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
          error: "'target' must be a string.",
        },
        { status: 400 }
      );
    }

    const { data, error } =
      await supabaseServer
        .from("notifications")
        .insert({
          type: type.trim(),
          title: title.trim(),
          message: message.trim(),
          category: category.trim(),
          target:
            typeof target === "string" &&
            target.trim()
              ? target.trim()
              : null,
          triggered_by: staff.name,
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
            "Failed to broadcast notification.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        notification: {
          id: data.id,
          type: data.type,
          title: data.title,
          message: data.message,
          timestamp: "Just now",
          triggeredBy: data.triggered_by,
          target: data.target,
          category: data.category,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          error: "Authentication required",
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