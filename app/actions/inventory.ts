"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { logActivity } from "@/lib/activity-log";
import { requireRole } from "@/lib/server-auth";

const INVENTORY_READ_ROLES = [
  "IT_ADMIN",
  "PHARMACIST",
  "OPTICIAN",
  "LAB_SCIENTIST",
  "NURSE",
  "INVENTORY_MANAGER",
] as const;

const INVENTORY_MANAGER_ROLES = ["IT_ADMIN", "INVENTORY_MANAGER"] as const;
const INVENTORY_STOCK_ROLES = [
  "IT_ADMIN",
  "OPTICIAN",
  "LAB_SCIENTIST",
  "NURSE",
  "INVENTORY_MANAGER",
] as const;

export type InventoryDomain = "optical" | "pharmacy" | "hospital";

export interface InventoryItemRecord {
  id: string;
  sku: string;
  name: string;
  category: string;
  domain: InventoryDomain;
  stock: number;
  reorder_level: number;
  price: number;
  unit_cost: number;
  unit_of_measure: string;
  is_active: boolean;
  updated_at: string;
}

export interface InventorySupplierRecord {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export interface InventoryMovementRecord {
  id: string;
  item_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  department: string | null;
  reference: string | null;
  notes: string | null;
  performed_by_name: string;
  created_at: string;
  item: { name: string; sku: string; domain: InventoryDomain; unit_of_measure: string } | null;
  supplier: { name: string } | null;
}

function failureMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message === "UNAUTHENTICATED") return "Your session has expired. Please sign in again.";
  if (message === "FORBIDDEN") return "You do not have permission to perform this inventory action.";
  return message || fallback;
}

function refreshInventoryPaths() {
  revalidatePath("/inventory");
  revalidatePath("/pharmacy");
  revalidatePath("/optician");
  revalidatePath("/laboratory");
}

export async function getInventoryData() {
  try {
    const staff = await requireRole([...INVENTORY_READ_ROLES]);
    const [itemsResult, suppliersResult, movementsResult] = await Promise.all([
      supabaseServer
        .from("inventory_items")
        .select("id, sku, name, category, domain, stock, reorder_level, price, unit_cost, unit_of_measure, is_active, updated_at")
        .order("name", { ascending: true }),
      supabaseServer
        .from("inventory_suppliers")
        .select("id, name, contact_person, phone, email, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabaseServer
        .from("inventory_movements")
        .select("id, item_id, movement_type, quantity, previous_stock, new_stock, department, reference, notes, performed_by_name, created_at, item:inventory_items(name, sku, domain, unit_of_measure), supplier:inventory_suppliers(name)")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const error = itemsResult.error || suppliersResult.error || movementsResult.error;
    if (error) {
      console.error("Inventory data load failed:", error);
      return { success: false as const, message: "Unable to load inventory. Confirm the shared inventory migration has been applied.", role: null, items: [] as InventoryItemRecord[], suppliers: [] as InventorySupplierRecord[], movements: [] as InventoryMovementRecord[] };
    }

    const movements = (movementsResult.data ?? []).map((row: any) => ({
      ...row,
      item: Array.isArray(row.item) ? row.item[0] ?? null : row.item ?? null,
      supplier: Array.isArray(row.supplier) ? row.supplier[0] ?? null : row.supplier ?? null,
    }));

    return {
      success: true as const,
      message: "Inventory loaded.",
      role: staff.role,
      items: (itemsResult.data ?? []) as InventoryItemRecord[],
      suppliers: (suppliersResult.data ?? []) as InventorySupplierRecord[],
      movements: movements as InventoryMovementRecord[],
    };
  } catch (error) {
    return { success: false as const, message: failureMessage(error, "Unable to load inventory."), role: null, items: [] as InventoryItemRecord[], suppliers: [] as InventorySupplierRecord[], movements: [] as InventoryMovementRecord[] };
  }
}

export async function createInventoryItem(input: {
  sku: string;
  name: string;
  category: string;
  domain: InventoryDomain;
  unitOfMeasure: string;
  reorderLevel: number;
  price: number;
  unitCost: number;
}) {
  try {
    const staff = await requireRole([...INVENTORY_MANAGER_ROLES]);
    const sku = input.sku?.trim().toUpperCase();
    const name = input.name?.trim();
    const category = input.category?.trim();
    const unitOfMeasure = input.unitOfMeasure?.trim() || "unit";
    const validDomains: InventoryDomain[] = ["optical", "pharmacy", "hospital"];

    if (!sku || !name || !category) return { success: false, message: "SKU, item name and category are required." };
    if (!validDomains.includes(input.domain)) return { success: false, message: "Choose a valid inventory category." };
    if (input.domain === "pharmacy" && staff.role !== "IT_ADMIN") {
      return { success: false, message: "Only an IT administrator can create pharmacy inventory items." };
    }
    if (!Number.isInteger(input.reorderLevel) || input.reorderLevel < 0) return { success: false, message: "Reorder level must be zero or greater." };
    if (!Number.isFinite(input.price) || input.price < 0 || !Number.isFinite(input.unitCost) || input.unitCost < 0) return { success: false, message: "Prices and costs must be zero or greater." };

    const { data, error } = await supabaseServer
      .from("inventory_items")
      .insert({
        sku, name, category, domain: input.domain, unit_of_measure: unitOfMeasure,
        stock: 0, reorder_level: input.reorderLevel, price: input.price,
        unit_cost: input.unitCost, is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") return { success: false, message: "That SKU is already in use. Enter a unique item code." };
      throw error;
    }

    await logActivity({
      module: "Inventory", category: "ADMIN", action: `Inventory item created: ${name}`,
      performedBy: staff.name, staffId: staff.id,
      details: JSON.stringify({ itemId: data.id, sku, category, domain: input.domain }),
    });
    refreshInventoryPaths();
    return { success: true, message: "Inventory item created. Receive stock to add its opening quantity.", id: data.id };
  } catch (error) {
    return { success: false, message: failureMessage(error, "Unable to create inventory item.") };
  }
}

export async function receiveInventoryStock(input: {
  itemId: string;
  quantity: number;
  unitCost?: number | null;
  supplierId?: string;
  reference?: string;
  notes?: string;
}) {
  try {
    const staff = await requireRole([...INVENTORY_MANAGER_ROLES]);
    if (!input.itemId || !Number.isInteger(input.quantity) || input.quantity <= 0) {
      return { success: false, message: "Select an item and enter a whole-number quantity greater than zero." };
    }
    const { data: itemForReceipt, error: itemForReceiptError } = await supabaseServer
      .from("inventory_items")
      .select("id, domain, is_active")
      .eq("id", input.itemId)
      .maybeSingle();
    if (itemForReceiptError || !itemForReceipt || !itemForReceipt.is_active) {
      return { success: false, message: "The selected inventory item is unavailable. Refresh inventory and try again." };
    }
    if (itemForReceipt.domain === "pharmacy" && staff.role !== "IT_ADMIN") {
      return { success: false, message: "Only an IT administrator can receive pharmacy stock. Pharmacy stock must be replenished through the authorized stock-receiving process." };
    }
    if (input.unitCost !== null && input.unitCost !== undefined && (!Number.isFinite(input.unitCost) || input.unitCost < 0)) {
      return { success: false, message: "Unit cost must be zero or greater." };
    }

    const { data, error } = await supabaseServer.rpc("inventory_receive_stock", {
      p_item_id: input.itemId,
      p_quantity: input.quantity,
      p_performed_by: staff.id,
      p_performed_by_name: staff.name,
      p_unit_cost: input.unitCost ?? null,
      p_supplier_id: input.supplierId || null,
      p_reference: input.reference?.trim() || null,
      p_notes: input.notes?.trim() || null,
    });
    if (error) throw new Error(error.message);
    await logActivity({
      module: "Inventory", category: "ADMIN", action: "Inventory stock received",
      performedBy: staff.name, staffId: staff.id,
      details: JSON.stringify({ itemId: input.itemId, quantity: input.quantity, supplierId: input.supplierId || null, reference: input.reference || null }),
    });
    refreshInventoryPaths();
    return { success: true, message: `Stock received successfully. New stock level: ${data?.new_stock ?? "updated"}.` };
  } catch (error) {
    return { success: false, message: failureMessage(error, "Unable to receive stock.") };
  }
}

export async function issueInventoryStock(input: {
  itemId: string;
  quantity: number;
  department: string;
  reference?: string;
  notes?: string;
}) {
  try {
    const staff = await requireRole([...INVENTORY_STOCK_ROLES]);
    if (!input.itemId || !Number.isInteger(input.quantity) || input.quantity <= 0) {
      return { success: false, message: "Select an item and enter a whole-number quantity greater than zero." };
    }
    const department = input.department?.trim();
    if (!department) return { success: false, message: "Choose the department receiving the stock." };

    const { data: itemForIssue, error: itemForIssueError } = await supabaseServer
      .from("inventory_items")
      .select("id, domain, is_active")
      .eq("id", input.itemId)
      .maybeSingle();
    if (itemForIssueError || !itemForIssue || !itemForIssue.is_active) {
      return { success: false, message: "The selected inventory item is unavailable. Refresh inventory and try again." };
    }
    if (itemForIssue.domain === "pharmacy") {
      if (staff.role !== "IT_ADMIN" && staff.role !== "INVENTORY_MANAGER") {
        return { success: false, message: "Pharmacy medicines must be dispensed through the Pharmacy workflow. Contact an administrator for an authorized stock adjustment." };
      }
      if (!input.reference?.trim() || !input.notes?.trim()) {
        return { success: false, message: "A reference and reason are required when issuing pharmacy stock outside the dispensing workflow." };
      }
    }

    const permittedDepartment: Record<string, string> = {
      OPTICIAN: "Optician",
      LAB_SCIENTIST: "Laboratory",
      NURSE: "Nursing",
    };
    if (staff.role !== "IT_ADMIN" && staff.role !== "PHARMACIST" && staff.role !== "INVENTORY_MANAGER" && permittedDepartment[staff.role] !== department) {
      return { success: false, message: "You may only issue stock to your own department. Ask the inventory manager for other departments." };
    }

    const { data, error } = await supabaseServer.rpc("inventory_issue_stock", {
      p_item_id: input.itemId,
      p_quantity: input.quantity,
      p_department: department,
      p_performed_by: staff.id,
      p_performed_by_name: staff.name,
      p_reference: input.reference?.trim() || null,
      p_notes: input.notes?.trim() || null,
    });
    if (error) throw new Error(error.message);
    await logActivity({
      module: "Inventory", category: "ADMIN", action: `Stock issued to ${department}`,
      performedBy: staff.name, staffId: staff.id,
      details: JSON.stringify({ itemId: input.itemId, quantity: input.quantity, department, reference: input.reference || null }),
    });
    refreshInventoryPaths();
    return { success: true, message: `Stock issued to ${department}. Remaining stock: ${data?.new_stock ?? "updated"}.` };
  } catch (error) {
    return { success: false, message: failureMessage(error, "Unable to issue stock.") };
  }
}

export async function createInventorySupplier(input: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
}) {
  try {
    const staff = await requireRole([...INVENTORY_MANAGER_ROLES]);
    const name = input.name?.trim();
    if (!name) return { success: false, message: "Supplier name is required." };
    const { error } = await supabaseServer.from("inventory_suppliers").insert({
      name,
      contact_person: input.contactPerson?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
    });
    if (error) throw error;
    await logActivity({
      module: "Inventory", category: "ADMIN", action: `Inventory supplier created: ${name}`,
      performedBy: staff.name, staffId: staff.id,
    });
    refreshInventoryPaths();
    return { success: true, message: "Supplier added successfully." };
  } catch (error) {
    return { success: false, message: failureMessage(error, "Unable to add supplier.") };
  }
}
