"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  stockAdjustmentSchema,
  type StockAdjustmentValues,
} from "../schemas/stock-adjustment-schema";
import { canManageInventory } from "../services/inventory-permissions";

export type StockAdjustmentActionResult =
  | {
      ok: true;
      transactionId: string;
      quantityBefore: number;
      quantityAfter: number;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

const SAFE_STOCK_ADJUSTMENT_FALLBACK =
  "Unable to perform stock adjustment. Try again.";

function mapStockAdjustmentRpcError(message?: string | null): string {
  switch (message) {
    case "insufficient stock balance":
      return "Insufficient stock balance for this adjustment.";
    case "warehouse not found":
      return "Selected warehouse was not found.";
    case "cannot adjust stock for inactive warehouse":
      return "Cannot adjust stock for an inactive warehouse.";
    case "product not found in warehouse organization":
      return "Selected product was not found.";
    case "cannot adjust stock for inactive or archived product":
      return "Cannot adjust stock for an inactive or archived product.";
    case "inventory permission denied":
    case "inventory authentication required":
      return "You do not have access to perform this action.";
    case "adjustment quantity must be positive":
      return "Quantity must be greater than zero.";
    case "invalid adjustment type":
      return "Invalid adjustment type.";
    default:
      return SAFE_STOCK_ADJUSTMENT_FALLBACK;
  }
}

export async function adjustStockAction(
  values: StockAdjustmentValues,
): Promise<StockAdjustmentActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageInventory(organizationState.membership.role)) {
    return {
      ok: false,
      message: "You do not have access to perform this action.",
    };
  }

  const parsed = stockAdjustmentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid adjustment input.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  const { data: rpcData, error } = await supabase.rpc(
    "perform_stock_adjustment",
    {
      p_warehouse_id: data.warehouseId,
      p_product_id: data.productId,
      p_adjustment_type: data.adjustmentType,
      p_quantity: data.quantity,
      p_reason: data.reason ?? undefined,
      p_idempotency_key: data.idempotencyKey ?? undefined,
    },
  );

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapStockAdjustmentRpcError(error?.message),
    };
  }

  const row = rpcData[0];

  revalidatePath("/dashboard/inventory");
  revalidatePath("/dashboard/products");

  return {
    ok: true,
    transactionId: row.transaction_id,
    quantityBefore: Number(row.quantity_before),
    quantityAfter: Number(row.quantity_after),
    message: "Stock adjustment applied.",
  };
}
