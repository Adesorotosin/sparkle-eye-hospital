// app/api/inventory/route.ts

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

function nextSku(existingCount: number, prefix: string) {
  return `${prefix}-${String(existingCount + 1).padStart(3, "0")}`;
}

// --- GET: List inventory items ---
export async function GET(request: Request) {
  try {
    await requireRole([
      "IT_ADMIN",
      "PHARMACIST",
      "RECEPTIONIST",
      "CASHIER",
    ]);

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    if (
      domain &&
      domain !== "pharmacy" &&
      domain !== "optical" &&
      domain !== "hospital"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid inventory domain. Use 'pharmacy', 'optical' or 'hospital'.",
        },
        { status: 400 }
      );
    }

    let query = supabaseServer
      .from("inventory_items")
      .select("*")
      .order("created_at", { ascending: true });

    if (domain) {
      query = query.eq("domain", domain);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Inventory list database error:", error);

      return NextResponse.json(
        { error: "Failed to load inventory" },
        { status: 500 }
      );
    }

    const items = (data ?? []).map((row) => ({
      id: row.sku,
      name: row.name,
      category: row.category,
      domain: row.domain,
      stock: row.stock,
      reorderLevel: row.reorder_level,
      price: row.price,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        {
          error:
            "You do not have permission to view inventory.",
        },
        { status: 403 }
      );
    }

    console.error("Inventory list error:", error);

    return NextResponse.json(
      { error: "Failed to load inventory" },
      { status: 500 }
    );
  }
}

// --- POST: Add a new inventory item ---
export async function POST(request: Request) {
  try {
    const staff = await requireRole([
      "IT_ADMIN",
    ]);

    const body = await request.json();

    const {
      name,
      category,
      stock,
      reorderLevel,
      price,
      domain,
    } = body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof stock !== "number" ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return NextResponse.json(
        {
          error:
            "'name', 'category', 'stock' (number), and 'price' (number) are required. Stock and price must be non-negative.",
        },
        { status: 400 }
      );
    }

    if (
      reorderLevel !== undefined &&
      reorderLevel !== null &&
      (typeof reorderLevel !== "number" ||
        !Number.isFinite(reorderLevel) ||
        reorderLevel < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "'reorderLevel' must be a non-negative number.",
        },
        { status: 400 }
      );
    }

    if (
      domain !== undefined &&
      domain !== null &&
      domain !== "pharmacy" &&
      domain !== "optical" &&
      domain !== "hospital"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid inventory domain. Use 'pharmacy' or 'optical'.",
        },
        { status: 400 }
      );
    }

    const itemDomain =
      domain === "pharmacy" || domain === "hospital" ? domain : "optical";

    // Pharmacists may only create pharmacy inventory.
    if (
      staff.role === "PHARMACIST" &&
      itemDomain !== "pharmacy"
    ) {
      return NextResponse.json(
        {
          error:
            "Pharmacists can only add pharmacy inventory.",
        },
        { status: 403 }
      );
    }

    const prefix =
      itemDomain === "pharmacy" ? "RX" : itemDomain === "hospital" ? "HSP" : "INV";

    const { count, error: countError } = await supabaseServer
      .from("inventory_items")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("domain", itemDomain);

    if (countError) {
      console.error(
        "Inventory SKU count error:",
        countError
      );

      return NextResponse.json(
        { error: "Failed to generate inventory SKU." },
        { status: 500 }
      );
    }

    const sku = nextSku(count ?? 0, prefix);

    const { data, error } = await supabaseServer
      .from("inventory_items")
      .insert({
        sku,
        name: name.trim(),
        category: category.trim(),
        domain: itemDomain,
        stock: 0,
        reorder_level: reorderLevel ?? 5,
        price,
        unit_cost: 0,
      })
      .select("*")
      .single();

    if (error) {
      console.error(
        "Inventory create database error:",
        error
      );

      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "An item with that SKU already exists.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to add inventory item" },
        { status: 500 }
      );
    }

    // All initial quantities go through the same atomic stock ledger as later receipts.
    let resultingStock = 0;
    if (stock > 0) {
      const { data: receiptData, error: receiptError } = await supabaseServer.rpc("inventory_receive_stock", {
        p_item_id: data.id,
        p_quantity: stock,
        p_performed_by: staff.id,
        p_performed_by_name: staff.name,
        p_unit_cost: 0,
        p_supplier_id: null,
        p_reference: null,
        p_notes: "Opening quantity entered when this item was created.",
      });
      if (receiptError) {
        await supabaseServer.from("inventory_items").delete().eq("id", data.id);
        console.error("Opening inventory receipt failed:", receiptError);
        return NextResponse.json({ error: "Item could not be initialized with stock. Please retry." }, { status: 500 });
      }
      resultingStock = Number(receiptData?.new_stock ?? stock);
    }

    await logActivity({
      module: "Inventory",
      category: "ADMIN",
      action: `${
        itemDomain === "pharmacy" ? "Drug" : "Inventory item"
      } added: ${name.trim()} (opening stock: ${stock})`,
      performedBy: staff.name,
      staffId: staff.id,
      details: `SKU: ${data.sku}; Domain: ${itemDomain}; Unit price: ${price}; Reorder level: ${reorderLevel ?? 5}.`,
      financialAmount: price * stock,
    });

    return NextResponse.json(
      {
        item: {
          id: data.sku,
          name: data.name,
          category: data.category,
          domain: data.domain,
          stock: resultingStock,
          reorderLevel: data.reorder_level,
          price: data.price,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "";

    if (message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (message === "FORBIDDEN") {
      return NextResponse.json(
        {
          error:
            "Only an administrator can add new inventory stock.",
        },
        { status: 403 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    console.error("Inventory create error:", error);

    return NextResponse.json(
      { error: "Failed to add inventory item" },
      { status: 500 }
    );
  }
}