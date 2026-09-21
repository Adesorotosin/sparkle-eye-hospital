// app/api/inventory/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity-log";

function nextSku(existingCount: number, prefix: string) {
  return `${prefix}-${String(existingCount + 1).padStart(3, "0")}`;
}

// --- GET: List inventory items, optionally filtered by domain (?domain=pharmacy|optical) ---
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    let query = supabase.from("inventory_items").select("*").order("created_at", { ascending: true });
    if (domain) query = query.eq("domain", domain);

    const { data, error } = await query;
    if (error) throw error;

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
    console.error("Inventory list error:", error);
    return NextResponse.json({ error: "Failed to load inventory" }, { status: 500 });
  }
}

// --- POST: Add a new inventory item (optical stock or pharmacy drug stock) ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, stock, reorderLevel, price, domain } = body;

    if (!name || !category || typeof stock !== "number" || typeof price !== "number") {
      return NextResponse.json(
        { error: "'name', 'category', 'stock' (number), and 'price' (number) are required." },
        { status: 400 }
      );
    }

    const itemDomain = domain === "pharmacy" ? "pharmacy" : "optical";
    const prefix = itemDomain === "pharmacy" ? "RX" : "INV";

    const { count } = await supabase
      .from("inventory_items")
      .select("*", { count: "exact", head: true })
      .eq("domain", itemDomain);

    const sku = nextSku(count ?? 0, prefix);

    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        sku,
        name,
        category,
        domain: itemDomain,
        stock,
        reorder_level: reorderLevel ?? 5,
        price,
      })
      .select("*")
      .single();
    if (error) throw error;

    await logActivity({
      module: "Admin",
      category: "ADMIN",
      action: `${itemDomain === "pharmacy" ? "Drug" : "Inventory item"} added: ${name} (stock: ${stock})`,
      performedBy: itemDomain === "pharmacy" ? "Pharmacy" : "Inventory Staff",
      financialAmount: price * stock,
    });

    return NextResponse.json(
      {
        item: {
          id: data.sku,
          name: data.name,
          category: data.category,
          domain: data.domain,
          stock: data.stock,
          reorderLevel: data.reorder_level,
          price: data.price,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Inventory create error:", error);
    if (error?.code === "23505") {
      return NextResponse.json({ error: "An item with that SKU already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to add inventory item" }, { status: 500 });
  }
}
