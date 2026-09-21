// app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function timeAgo(dateStr?: string | null) {
  if (!dateStr) return "Just now";
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return "Just now";

  const diffMs = Date.now() - time;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// --- GET: Fetch manual notifications + live-derived system alerts ---
export async function GET() {
  try {
    const [
      manualRes,
      stockRes,
      invoiceRes,
      loginRes,
    ] = await Promise.allSettled([
      supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("inventory_items")
        .select("*"),
      supabase
        .from("invoices")
        .select("*, patients:patient_id(full_name)")
        .in("status", ["draft", "pending"])
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("security_logs")
        .select("*")
        .in("risk_level", ["MEDIUM", "CRITICAL"])
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    // Extract query results safely without breaking the whole feed if one table fails
    const manual = manualRes.status === "fulfilled" && !manualRes.value.error ? manualRes.value.data : [];
    const lowStock = stockRes.status === "fulfilled" && !stockRes.value.error ? stockRes.value.data : [];
    const unpaidInvoices = invoiceRes.status === "fulfilled" && !invoiceRes.value.error ? invoiceRes.value.data : [];
    const riskyLogins = loginRes.status === "fulfilled" && !loginRes.value.error ? loginRes.value.data : [];

    // Log individual table query errors for debugging without crashing the endpoint
    if (manualRes.status === "fulfilled" && manualRes.value.error) {
      console.warn("Notifications table query warning:", manualRes.value.error.message);
    }
    if (stockRes.status === "fulfilled" && stockRes.value.error) {
      console.warn("Inventory items table query warning:", stockRes.value.error.message);
    }
    if (invoiceRes.status === "fulfilled" && invoiceRes.value.error) {
      console.warn("Invoices table query warning:", invoiceRes.value.error.message);
    }
    if (loginRes.status === "fulfilled" && loginRes.value.error) {
      console.warn("Security logs table query warning:", loginRes.value.error.message);
    }

    const derived: any[] = [];

    // 1. Low stock items
    (lowStock ?? [])
      .filter((item) => Number(item.stock) <= Number(item.reorder_level))
      .forEach((item) => {
        derived.push({
          id: `stock-${item.id}`,
          type: "Finance",
          title: `Low Stock: ${item.name}`,
          message: `Only ${item.stock} left in stock (reorder level: ${item.reorder_level}). SKU ${item.sku ?? "N/A"}.`,
          timestamp: timeAgo(item.updated_at ?? item.created_at),
          target: item.domain === "pharmacy" ? "Pharmacy" : "Inventory Staff",
          category: "Security",
        });
      });

    // 2. Unpaid invoices
    (unpaidInvoices ?? []).forEach((inv) => {
      derived.push({
        id: `invoice-${inv.id}`,
        type: "Finance",
        title: `Unpaid Invoice: ${inv.invoice_no ?? inv.id}`,
        message: `₦${Number(inv.grand_total ?? 0).toLocaleString()} outstanding for ${
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
        message: `Attempted username "${log.username_attempted ?? "Unknown"}" from ${
          log.ip_address ?? "unknown IP"
        }.`,
        timestamp: timeAgo(log.created_at),
        target: "IT Admin",
        category: "Security",
      });
    });

    // 4. Broadcasted/Manual notifications
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

    const allNotifications = [...manualMapped, ...derived];

    return NextResponse.json({ notifications: allNotifications }, { status: 200 });
  } catch (error: any) {
    console.error("Notifications error:", error);
    return NextResponse.json(
      { error: "Failed to load notifications", details: error?.message || error },
      { status: 500 }
    );
  }
}

// --- POST: Broadcast a manual notification ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, title, message, category, target, triggeredBy } = body;

    if (!type || !title || !message || !category) {
      return NextResponse.json(
        { error: "'type', 'title', 'message', and 'category' are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        type,
        title,
        message,
        category,
        target: target || null,
        triggered_by: triggeredBy || null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Supabase notification insert error:", error);
      throw error;
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
  } catch (error: any) {
    console.error("Notification broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to broadcast notification", details: error?.message || error },
      { status: 500 }
    );
  }
}