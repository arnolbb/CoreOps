"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  checkCustomerDuplicate,
  type DuplicateCheckResult,
} from "../queries/check-customer-duplicate";
import { getCustomerDetail } from "../queries/get-customer-detail";
import {
  customerFormSchema,
  type CustomerFormValues,
} from "../schemas/customer-form-schema";
import {
  canManageCustomers,
  canReadCustomers,
} from "../services/customer-permissions";
import type { CustomerDetail } from "../types/customer";

const customerIdSchema = z.string().uuid();

const PERMISSION_DENIED_MESSAGE =
  "You do not have access to perform this action.";

export type CustomerActionResult =
  | {
      ok: true;
      customerId: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export type CustomerDetailActionResult =
  | {
      ok: true;
      data: CustomerDetail;
    }
  | {
      ok: false;
      message: string;
    };

export async function createCustomerAction(
  values: CustomerFormValues,
): Promise<CustomerActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageCustomers(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsed = customerFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid customer data. Correct errors and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const organizationId = organizationState.organization.id;

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      organization_id: organizationId,
      created_by: user.id,
      customer_type: data.customerType,
      display_name: data.displayName,
      company_name: data.companyName,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      status: "active",
    })
    .select("id")
    .single();

  if (customerError || !customer) {
    return {
      ok: false,
      message: "Unable to create customer record.",
    };
  }

  if (data.addressLine1) {
    const { error: addressError } = await supabase
      .from("customer_addresses")
      .insert({
        organization_id: organizationId,
        customer_id: customer.id,
        label: data.addressLabel || "Primary",
        address_line_1: data.addressLine1,
        address_line_2: data.addressLine2,
        city: data.city,
        province: data.province,
        postal_code: data.postalCode,
        country_code: data.countryCode,
        is_primary: true,
      });

    if (addressError) {
      revalidatePath("/dashboard/customers");
      return {
        ok: false,
        message:
          "Customer was created, but the primary address could not be saved. Edit the customer to try again.",
      };
    }
  }

  revalidatePath("/dashboard/customers");

  return {
    ok: true,
    customerId: customer.id,
    message: "Customer created.",
  };
}

export async function updateCustomerAction(
  customerId: string,
  values: CustomerFormValues,
): Promise<CustomerActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageCustomers(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedCustomerId = customerIdSchema.safeParse(customerId);
  if (!parsedCustomerId.success) {
    return { ok: false, message: "Invalid customer identifier." };
  }

  const parsed = customerFormSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid customer data. Correct errors and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const organizationId = organizationState.organization.id;
  const validCustomerId = parsedCustomerId.data;

  const { data: updatedCustomer, error: customerError } = await supabase
    .from("customers")
    .update({
      customer_type: data.customerType,
      display_name: data.displayName,
      company_name: data.companyName,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
    })
    .eq("organization_id", organizationId)
    .eq("id", validCustomerId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (customerError) {
    return {
      ok: false,
      message: "Unable to update customer record.",
    };
  }

  if (!updatedCustomer) {
    return {
      ok: false,
      message: "Customer not found or cannot be edited.",
    };
  }

  if (data.addressLine1) {
    const { data: existingAddresses, error: lookupError } = await supabase
      .from("customer_addresses")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("customer_id", validCustomerId)
      .eq("is_primary", true)
      .limit(1);

    if (lookupError) {
      revalidatePath("/dashboard/customers");
      return {
        ok: false,
        message:
          "Customer details were saved, but the primary address could not be updated.",
      };
    }

    if (existingAddresses && existingAddresses.length > 0) {
      const { error: addressUpdateError } = await supabase
        .from("customer_addresses")
        .update({
          label: data.addressLabel || "Primary",
          address_line_1: data.addressLine1,
          address_line_2: data.addressLine2,
          city: data.city,
          province: data.province,
          postal_code: data.postalCode,
          country_code: data.countryCode,
        })
        .eq("organization_id", organizationId)
        .eq("id", existingAddresses[0].id);

      if (addressUpdateError) {
        revalidatePath("/dashboard/customers");
        return {
          ok: false,
          message:
            "Customer details were saved, but the primary address could not be updated.",
        };
      }
    } else {
      const { error: addressInsertError } = await supabase
        .from("customer_addresses")
        .insert({
          organization_id: organizationId,
          customer_id: validCustomerId,
          label: data.addressLabel || "Primary",
          address_line_1: data.addressLine1,
          address_line_2: data.addressLine2,
          city: data.city,
          province: data.province,
          postal_code: data.postalCode,
          country_code: data.countryCode,
          is_primary: true,
        });

      if (addressInsertError) {
        revalidatePath("/dashboard/customers");
        return {
          ok: false,
          message:
            "Customer details were saved, but the primary address could not be updated.",
        };
      }
    }
  }

  revalidatePath("/dashboard/customers");

  return {
    ok: true,
    customerId: validCustomerId,
    message: "Customer updated.",
  };
}

export async function getCustomerForEditAction(
  customerId: string,
): Promise<CustomerDetailActionResult> {
  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return { ok: false, message: "Active organization required." };
  }

  if (!canManageCustomers(organizationState.membership.role)) {
    return { ok: false, message: PERMISSION_DENIED_MESSAGE };
  }

  const parsedCustomerId = customerIdSchema.safeParse(customerId);
  if (!parsedCustomerId.success) {
    return { ok: false, message: "Invalid customer identifier." };
  }

  return getCustomerDetail(
    supabase,
    organizationState.organization.id,
    parsedCustomerId.data,
  );
}

export async function checkCustomerDuplicateAction(
  email: string | null | undefined,
  phone: string | null | undefined,
  excludeCustomerId?: string,
): Promise<DuplicateCheckResult> {
  const emptyResult: DuplicateCheckResult = {
    hasDuplicate: false,
    duplicateEmail: false,
    duplicatePhone: false,
  };

  const user = await requireAuthenticatedUser();
  const supabase = await createSupabaseServerClient();
  const organizationState = await getActiveOrganizationState(supabase, user.id);

  if (organizationState.status !== "single") {
    return emptyResult;
  }

  if (!canReadCustomers(organizationState.membership.role)) {
    return emptyResult;
  }

  const safeExcludeId =
    excludeCustomerId && customerIdSchema.safeParse(excludeCustomerId).success
      ? excludeCustomerId
      : undefined;

  return checkCustomerDuplicate(
    supabase,
    organizationState.organization.id,
    email,
    phone,
    safeExcludeId,
  );
}
