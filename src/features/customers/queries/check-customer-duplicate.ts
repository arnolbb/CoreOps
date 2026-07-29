import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";

export type DuplicateCheckResult = {
  hasDuplicate: boolean;
  duplicateEmail: boolean;
  duplicatePhone: boolean;
};

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

  let query = supabase
    .from("customers")
    .select("id, email, phone")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (excludeCustomerId) {
    query = query.neq("id", excludeCustomerId);
  }

  const filters: string[] = [];
  if (cleanEmail) {
    filters.push(`email.ilike.${cleanEmail}`);
  }
  if (cleanPhone) {
    filters.push(`phone.eq.${cleanPhone}`);
  }

  query = query.or(filters.join(","));

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return {
      hasDuplicate: false,
      duplicateEmail: false,
      duplicatePhone: false,
    };
  }

  let duplicateEmail = false;
  let duplicatePhone = false;

  for (const row of data) {
    if (cleanEmail && row.email && row.email.toLowerCase() === cleanEmail.toLowerCase()) {
      duplicateEmail = true;
    }
    if (cleanPhone && row.phone && row.phone === cleanPhone) {
      duplicatePhone = true;
    }
  }

  return {
    hasDuplicate: duplicateEmail || duplicatePhone,
    duplicateEmail,
    duplicatePhone,
  };
}
