"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  stockAdjustmentSchema,
  type StockAdjustmentValues,
} from "../schemas/stock-adjustment-schema";

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

export async function adjustStockAction(
  values: StockAdjustmentValues,
): Promise<StockAdjustmentActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
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

  const { data: rpcData, error } = await supabase.rpc("perform_stock_adjustment", {
    p_warehouse_id: data.warehouseId,
    p_product_id: data.productId,
    p_adjustment_type: data.adjustmentType,
    p_quantity: data.quantity,
    p_reason: data.reason ?? undefined,
    p_idempotency_key: data.idempotencyKey ?? undefined,
  });

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: error?.message ?? "Unable to perform stock adjustment.",
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
    message: "Stock adjustment applied successfully.",
  };
}
