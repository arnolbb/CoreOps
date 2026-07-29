"use server";

import { revalidatePath } from "next/cache";
import { getActiveOrganizationState } from "@/features/organizations/queries/get-active-organization-memberships";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  customerFormSchema,
  type CustomerFormValues,
} from "../schemas/customer-form-schema";
import { canManageCustomers } from "../services/customer-permissions";

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
    return { ok: false, message: "Permission denied. Owner, Admin, or Staff role required." };
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
      // Non-fatal if customer created, but surface error or ignore
    }
  }

  revalidatePath("/dashboard/customers");

  return {
    ok: true,
    customerId: customer.id,
    message: "Customer created successfully.",
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
    return { ok: false, message: "Permission denied. Owner, Admin, or Staff role required." };
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

  const { error: customerError } = await supabase
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
    .eq("id", customerId)
    .eq("status", "active");

  if (customerError) {
    return {
      ok: false,
      message: "Unable to update customer record.",
    };
  }

  if (data.addressLine1) {
    const { data: existingAddresses } = await supabase
      .from("customer_addresses")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("customer_id", customerId)
      .eq("is_primary", true)
      .limit(1);

    if (existingAddresses && existingAddresses.length > 0) {
      await supabase
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
        .eq("id", existingAddresses[0].id);
    } else {
      await supabase.from("customer_addresses").insert({
        organization_id: organizationId,
        customer_id: customerId,
        label: data.addressLabel || "Primary",
        address_line_1: data.addressLine1,
        address_line_2: data.addressLine2,
        city: data.city,
        province: data.province,
        postal_code: data.postalCode,
        country_code: data.countryCode,
        is_primary: true,
      });
    }
  }

  revalidatePath("/dashboard/customers");

  return {
    ok: true,
    customerId,
    message: "Customer updated successfully.",
  };
}
