"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  warehouseFormSchema,
  type WarehouseFormValues,
} from "../schemas/warehouse-schema";
import { canManageInventory } from "../services/inventory-permissions";
import type { WarehouseItem } from "../types/inventory";

const warehouseIdSchema = z.string().uuid();

const PERMISSION_DENIED_MESSAGE =
  "You do not have access to perform this action.";

export type WarehouseActionResult =
  | {
      ok: true;
      warehouse: WarehouseItem;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

function mapWarehouseRow(row: {
  id: string;
  name: string;
  code: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): WarehouseItem {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    address: row.address,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createWarehouseAction(
  values: WarehouseFormValues,
): Promise<WarehouseActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageInventory(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = warehouseFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid warehouse details. Correct errors and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const { data: created, error } = await supabase
    .from("warehouses")
    .insert({
      organization_id: organizationState.organization.id,
      name: data.name,
      code: data.code,
      address: data.address,
      is_active: true,
    })
    .select("id, name, code, address, is_active, created_at, updated_at")
    .single();

  if (error || !created) {
    return {
      ok: false,
      message:
        error?.code === "23505"
          ? "A warehouse with this code already exists."
          : "Unable to create warehouse. Try again.",
    };
  }

  revalidatePath("/dashboard/inventory");

  return {
    ok: true,
    warehouse: mapWarehouseRow(created),
    message: "Warehouse created.",
  };
}

export async function updateWarehouseAction(
  warehouseId: string,
  values: WarehouseFormValues,
): Promise<WarehouseActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageInventory(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedId = warehouseIdSchema.safeParse(warehouseId);
  if (!parsedId.success) {
    return { ok: false, message: "Invalid warehouse identifier." };
  }

  const parsed = warehouseFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid warehouse details. Correct errors and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const { data: updated, error } = await supabase
    .from("warehouses")
    .update({
      name: data.name,
      code: data.code,
      address: data.address,
    })
    .eq("organization_id", organizationState.organization.id)
    .eq("id", parsedId.data)
    .select("id, name, code, address, is_active, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "A warehouse with this code already exists."
          : "Unable to update warehouse. Try again.",
    };
  }

  if (!updated) {
    return { ok: false, message: "Warehouse not found." };
  }

  revalidatePath("/dashboard/inventory");

  return {
    ok: true,
    warehouse: mapWarehouseRow(updated),
    message: "Warehouse updated.",
  };
}

export async function setWarehouseActiveAction(
  warehouseId: string,
  isActive: boolean,
): Promise<WarehouseActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageInventory(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedId = warehouseIdSchema.safeParse(warehouseId);
  if (!parsedId.success) {
    return { ok: false, message: "Invalid warehouse identifier." };
  }

  const { data: updated, error } = await supabase
    .from("warehouses")
    .update({ is_active: isActive })
    .eq("organization_id", organizationState.organization.id)
    .eq("id", parsedId.data)
    .select("id, name, code, address, is_active, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: "Unable to update warehouse status. Try again.",
    };
  }

  if (!updated) {
    return { ok: false, message: "Warehouse not found." };
  }

  revalidatePath("/dashboard/inventory");

  return {
    ok: true,
    warehouse: mapWarehouseRow(updated),
    message: isActive ? "Warehouse reactivated." : "Warehouse deactivated.",
  };
}
