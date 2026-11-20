"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProductDetail } from "../queries/get-product-detail";
import {
  productFormSchema,
  type ProductFormValues,
} from "../schemas/product-form-schema";
import {
  canArchiveProducts,
  canManageProducts,
  canViewProductCost,
} from "../services/product-permissions";
import type { ProductDetail } from "../types/product";

const productIdSchema = z.string().uuid();

const PERMISSION_DENIED_MESSAGE =
  "You do not have access to perform this action.";

export type ProductActionResult =
  | {
      ok: true;
      productId: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type ProductDetailActionResult =
  | {
      ok: true;
      data: ProductDetail;
    }
  | {
      ok: false;
      message: string;
    };

function mapProductWriteError(
  error: { code?: string; message?: string } | null,
  fallback: string,
): string {
  if (!error) return fallback;
  if (error.code === "23505") {
    return "A product with this SKU already exists.";
  }
  if (error.code === "23503") {
    return "Selected category was not found.";
  }
  return fallback;
}

function mapArchiveProductError(message?: string | null): string {
  switch (message) {
    case "product not found":
      return "Product not found.";
    case "product already archived":
      return "Product is already archived.";
    case "product permission denied":
    case "product authentication required":
      return PERMISSION_DENIED_MESSAGE;
    default:
      return "Unable to archive product. Try again.";
  }
}

export async function createProductAction(
  values: ProductFormValues,
): Promise<ProductActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  const role = organizationState.membership.role;
  if (!canManageProducts(role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid product data. Correct errors and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const organizationId = organizationState.organization.id;
  const costPrice = canViewProductCost(role) ? data.costPrice : 0;

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      created_by: user.id,
      product_type: data.productType,
      name: data.name,
      sku: data.sku,
      category_id: data.categoryId,
      unit: data.unit,
      description: data.description,
      cost_price: costPrice,
      selling_price: data.sellingPrice,
      track_inventory: data.trackInventory,
      minimum_stock: data.minimumStock,
      is_active: true,
    })
    .select("id")
    .single();

  if (error || !product) {
    return {
      ok: false,
      message: mapProductWriteError(
        error,
        "Unable to create product. Try again.",
      ),
    };
  }

  revalidatePath("/dashboard/products");

  return {
    ok: true,
    productId: product.id,
    message: "Product created.",
  };
}

export async function updateProductAction(
  productId: string,
  values: ProductFormValues,
): Promise<ProductActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  const role = organizationState.membership.role;
  if (!canManageProducts(role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedProductId = productIdSchema.safeParse(productId);
  if (!parsedProductId.success) {
    return { ok: false, message: "Invalid product identifier." };
  }

  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid product data. Correct errors and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const organizationId = organizationState.organization.id;
  const validProductId = parsedProductId.data;

  const updatePayload = {
    product_type: data.productType,
    name: data.name,
    sku: data.sku,
    category_id: data.categoryId,
    unit: data.unit,
    description: data.description,
    selling_price: data.sellingPrice,
    track_inventory: data.trackInventory,
    minimum_stock: data.minimumStock,
    ...(canViewProductCost(role) ? { cost_price: data.costPrice } : {}),
  };

  const { data: updatedProduct, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("organization_id", organizationId)
    .eq("id", validProductId)
    .eq("is_active", true)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: mapProductWriteError(
        error,
        "Unable to update product. Try again.",
      ),
    };
  }

  if (!updatedProduct) {
    return {
      ok: false,
      message: "Product not found or cannot be edited.",
    };
  }

  revalidatePath("/dashboard/products");

  return {
    ok: true,
    productId: validProductId,
    message: "Product updated.",
  };
}

export async function archiveProductAction(
  productId: string,
): Promise<ProductActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canArchiveProducts(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedProductId = productIdSchema.safeParse(productId);
  if (!parsedProductId.success) {
    return { ok: false, message: "Invalid product identifier." };
  }

  const validProductId = parsedProductId.data;
  const { data: rpcData, error } = await supabase.rpc("archive_product", {
    target_product_id: validProductId,
  });

  if (error || !rpcData || rpcData.length === 0) {
    return {
      ok: false,
      message: mapArchiveProductError(error?.message),
    };
  }

  revalidatePath("/dashboard/products");

  return {
    ok: true,
    productId: validProductId,
    message: "Product archived.",
  };
}

export async function getProductForEditAction(
  productId: string,
): Promise<ProductDetailActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  const role = organizationState.membership.role;
  if (!canManageProducts(role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedProductId = productIdSchema.safeParse(productId);
  if (!parsedProductId.success) {
    return { ok: false, message: "Invalid product identifier." };
  }

  return getProductDetail(
    supabase,
    organizationState.organization.id,
    parsedProductId.data,
    { canViewCost: canViewProductCost(role) },
  );
}
