import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function nextSku(existingCount: number, prefix: string) {
  return `${prefix}-${String(existingCount + 1).padStart(3, "0")}`;
}

// --- GET: List inventory items, optionally filtered by domain (?domain=pharmacy|optical) ---
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    // Order by 'sku' to prevent failures if 'created_at' does not exist in schema
    let query = supabase.from("inventory_items").select("*").order("sku", { ascending: true });
    if (domain) query = query.eq("domain", domain);

    const { data, error } = await query;
    if (error) {
      console.error("Supabase GET Query Error:", error);
      throw error;
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
  } catch (error: any) {
    console.error("Inventory list error detail:", error);
    return NextResponse.json({ error: error.message || "Failed to load inventory" }, { status: 500 });
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

    const { count, error: countError } = await supabase
      .from("inventory_items")
      .select("*", { count: "exact", head: true })
      .eq("domain", itemDomain);

    if (countError) throw countError;

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
    console.error("Inventory create error detail:", error);
    if (error?.code === "23505") {
      return NextResponse.json({ error: "An item with that SKU already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Failed to add inventory item" }, { status: 500 });
  }
}