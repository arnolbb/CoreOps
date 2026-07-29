import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type { CustomerAddress, CustomerDetail } from "../types/customer";

export async function getCustomerDetail(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  customerId: string,
): Promise<{ ok: true; data: CustomerDetail } | { ok: false; message: string }> {
  const { data: customer, error } = await supabase
    .from("customers")
    .select(
      "id, display_name, customer_type, company_name, phone, email, notes, status, created_at, updated_at, archived_at",
    )
    .eq("organization_id", organizationId)
    .eq("id", customerId)
    .maybeSingle();

  if (error || !customer) {
    return { ok: false, message: "Customer not found." };
  }

  const { data: addresses } = await supabase
    .from("customer_addresses")
    .select(
      "id, label, address_line_1, address_line_2, city, province, postal_code, country_code, is_primary",
    )
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId)
    .order("is_primary", { ascending: false });

  const primaryAddressRow = addresses?.find((a) => a.is_primary) ?? addresses?.[0];

  const primaryAddress: CustomerAddress | null = primaryAddressRow
    ? {
        id: primaryAddressRow.id,
        label: primaryAddressRow.label,
        addressLine1: primaryAddressRow.address_line_1,
        addressLine2: primaryAddressRow.address_line_2,
        city: primaryAddressRow.city,
        province: primaryAddressRow.province,
        postalCode: primaryAddressRow.postal_code,
        countryCode: primaryAddressRow.country_code,
        isPrimary: primaryAddressRow.is_primary,
      }
    : null;

  return {
    ok: true,
    data: {
      id: customer.id,
      displayName: customer.display_name,
      customerType: customer.customer_type as "individual" | "business",
      companyName: customer.company_name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      status: customer.status === "archived" ? "archived" : "active",
      createdAt: customer.created_at,
      updatedAt: customer.updated_at,
      archivedAt: customer.archived_at,
      primaryAddress,
    },
  };
}
