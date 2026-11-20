import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";

export type DuplicateCheckResult = {
  hasDuplicate: boolean;
  duplicateEmail: boolean;
  duplicatePhone: boolean;
};

async function hasMatchingActiveCustomer(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  column: "email" | "phone",
  value: string,
  excludeCustomerId?: string,
): Promise<boolean> {
  let query = supabase
    .from("customers")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .eq(column, value);

  if (excludeCustomerId) {
    query = query.neq("id", excludeCustomerId);
  }

  const { data, error } = await query.limit(1);

  if (error || !data) {
    return false;
  }

  return data.length > 0;
}

export async function checkCustomerDuplicate(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  email: string | null | undefined,
  phone: string | null | undefined,
  excludeCustomerId?: string,
): Promise<DuplicateCheckResult> {
  const cleanEmail = email?.trim() || null;
  const cleanPhone = phone?.trim() || null;

  if (!cleanEmail && !cleanPhone) {
    return {
      hasDuplicate: false,
      duplicateEmail: false,
      duplicatePhone: false,
    };
  }

  const [duplicateEmail, duplicatePhone] = await Promise.all([
    cleanEmail
      ? hasMatchingActiveCustomer(
          supabase,
          organizationId,
          "email",
          cleanEmail,
          excludeCustomerId,
        )
      : Promise.resolve(false),
    cleanPhone
      ? hasMatchingActiveCustomer(
          supabase,
          organizationId,
          "phone",
          cleanPhone,
          excludeCustomerId,
        )
      : Promise.resolve(false),
  ]);

  return {
    hasDuplicate: duplicateEmail || duplicatePhone,
    duplicateEmail,
    duplicatePhone,
  };
}
