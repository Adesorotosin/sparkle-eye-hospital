import { NextResponse } from "next/server";
import { requireRole } from "@/lib/server-auth";
import { supabaseServer } from "@/lib/supabase-server";

type InventoryItem = {
  id: string;
  name: string;
  sku: string;
  domain: string;
  stock: number;
  reorder_level: number;
  unit_cost: number | null;
  unit_of_measure: string;
  is_active: boolean;
  updated_at: string;
};

export async function GET() {
  try {
    await requireRole(["IT_ADMIN"]);

    const [itemsResult, movementsResult] = await Promise.all([
      supabaseServer
        .from("inventory_items")
        .select("id, name, sku, domain, stock, reorder_level, unit_cost, unit_of_measure, is_active, updated_at")
        .order("name", { ascending: true }),
      supabaseServer
        .from("inventory_movements")
        .select("id, movement_type, quantity, previous_stock, new_stock, created_at, performed_by_name, department, item:inventory_items(name, domain, unit_of_measure)")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    if (itemsResult.error) throw itemsResult.error;
    if (movementsResult.error) throw movementsResult.error;

    const allItems = (itemsResult.data ?? []) as InventoryItem[];
    const activeItems = allItems.filter((item) => item.is_active);
    const lowStockItems = activeItems
      .filter((item) => Number(item.stock) <= Number(item.reorder_level))
      .sort((a, b) => Number(a.stock) - Number(b.stock))
      .slice(0, 6);

    const movements = (movementsResult.data ?? []).map((row: any) => ({
      ...row,
      item: Array.isArray(row.item) ? row.item[0] ?? null : row.item ?? null,
    }));

    return NextResponse.json({
      summary: {
        activeItemTypes: activeItems.length,
        unitsInStock: activeItems.reduce((sum, item) => sum + Number(item.stock || 0), 0),
        lowStockCount: activeItems.filter((item) => Number(item.stock) <= Number(item.reorder_level)).length,
        outOfStockCount: activeItems.filter((item) => Number(item.stock) <= 0).length,
        stockValue: activeItems.reduce((sum, item) => sum + Number(item.stock || 0) * Number(item.unit_cost || 0), 0),
      },
      lowStockItems,
      recentMovements: movements,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "You do not have permission to view inventory management data." }, { status: 403 });
    }
    console.error("Admin inventory overview error:", error);
    return NextResponse.json({ error: "Unable to load the inventory overview." }, { status: 500 });
  }
}
