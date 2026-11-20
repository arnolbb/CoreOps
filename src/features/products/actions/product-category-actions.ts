"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  productCategoryFormSchema,
  type ProductCategoryFormValues,
} from "../schemas/product-category-schema";
import { canManageProducts } from "../services/product-permissions";
import type { ProductCategory } from "../types/product";

const categoryIdSchema = z.string().uuid();

const PERMISSION_DENIED_MESSAGE =
  "You do not have access to perform this action.";

export type CreateProductCategoryResult =
  | {
      ok: true;
      category: ProductCategory;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type DeleteProductCategoryResult =
  | {
      ok: true;
      categoryId: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export async function createProductCategoryAction(
  values: ProductCategoryFormValues,
): Promise<CreateProductCategoryResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageProducts(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = productCategoryFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid category name.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data, error } = await supabase
    .from("product_categories")
    .insert({
      organization_id: organizationState.organization.id,
      name: parsed.data.name,
    })
    .select("id, name, parent_id, created_at, updated_at")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message:
        error?.code === "23505"
          ? "A category with this name already exists."
          : "Unable to create category. Try again.",
    };
  }

  revalidatePath("/dashboard/products");

  return {
    ok: true,
    category: {
      id: data.id,
      name: data.name,
      parentId: data.parent_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
    message: "Category created.",
  };
}

export async function deleteProductCategoryAction(
  categoryId: string,
): Promise<DeleteProductCategoryResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageProducts(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedCategoryId = categoryIdSchema.safeParse(categoryId);
  if (!parsedCategoryId.success) {
    return { ok: false, message: "Invalid category identifier." };
  }

  const validCategoryId = parsedCategoryId.data;
  const { data, error } = await supabase
    .from("product_categories")
    .delete()
    .eq("organization_id", organizationState.organization.id)
    .eq("id", validCategoryId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message:
        error.code === "23503"
          ? "This category is used by one or more products and cannot be deleted."
          : "Unable to delete category. Try again.",
    };
  }

  if (!data) {
    return { ok: false, message: "Category not found." };
  }

  revalidatePath("/dashboard/products");

  return {
    ok: true,
    categoryId: validCategoryId,
    message: "Category deleted.",
  };
}
