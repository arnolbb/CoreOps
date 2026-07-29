import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type {
  CustomerListData,
  CustomerListFilters,
  CustomerListItem,
} from "../types/customer";

export const CUSTOMER_LIST_PAGE_SIZE = 10;

const safeCustomerListError = "Unable to load customers. Try again.";

type CustomerRow = Pick<
  Database["public"]["Tables"]["customers"]["Row"],
  | "id"
  | "display_name"
  | "customer_type"
  | "company_name"
  | "phone"
  | "email"
  | "status"
  | "created_at"
  | "updated_at"
  | "archived_at"
>;

export type CustomerListResult =
  | {
      ok: true;
      data: CustomerListData;
    }
  | {
      ok: false;
      message: string;
    };

function sanitizePostgrestSearch(value: string) {
  return value
    .replace(/[%*,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toCustomerListItem(row: CustomerRow): CustomerListItem {
  return {
    id: row.id,
    displayName: row.display_name,
    customerType: row.customer_type,
    companyName: row.company_name,
    phone: row.phone,
    email: row.email,
    status: row.status === "archived" ? "archived" : "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

export async function getCustomerList(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  filters: CustomerListFilters,
): Promise<CustomerListResult> {
  const page = Math.max(filters.page, 1);
  const from = (page - 1) * CUSTOMER_LIST_PAGE_SIZE;
  const to = from + CUSTOMER_LIST_PAGE_SIZE - 1;
  const search = sanitizePostgrestSearch(filters.search);

  let query = supabase
    .from("customers")
    .select(
      "id, display_name, customer_type, company_name, phone, email, status, created_at, updated_at, archived_at",
      { count: "exact" },
    )
    .eq("organization_id", organizationId);

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (search.length > 0) {
    const searchPattern = `*${search}*`;
    query = query.or(
      [
        `display_name.ilike.${searchPattern}`,
        `company_name.ilike.${searchPattern}`,
        `email.ilike.${searchPattern}`,
        `phone.ilike.${searchPattern}`,
      ].join(","),
    );
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return { ok: false, message: safeCustomerListError };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(
    Math.ceil(totalCount / CUSTOMER_LIST_PAGE_SIZE),
    1,
  );

  return {
    ok: true,
    data: {
      filters: { ...filters, page },
      items: (data ?? []).map((row) => toCustomerListItem(row as CustomerRow)),
      pageSize: CUSTOMER_LIST_PAGE_SIZE,
      totalCount,
      totalPages,
    },
  };
}
