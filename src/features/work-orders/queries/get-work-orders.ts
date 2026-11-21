import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database-generated";
import type {
  WorkOrderAddressOption,
  WorkOrderAssigneeOption,
  WorkOrderCustomerOption,
  WorkOrderFilters,
  WorkOrderListItem,
  WorkOrderOverviewData,
} from "../types/work-order";
import {
  formatAddressSummary,
  toWorkOrderAddressOption,
  toWorkOrderPriority,
  toWorkOrderStatus,
  toWorkOrderType,
  type CustomerAddressRow,
} from "./work-order-mappers";

export const WORK_ORDER_PAGE_SIZE = 10;

const SAFE_WORK_ORDERS_LOAD_ERROR = "Unable to load work orders. Try again.";

export type WorkOrdersOverviewResult =
  | {
      ok: true;
      data: WorkOrderOverviewData;
    }
  | {
      ok: false;
      message: string;
    };

type WorkOrderRow = Pick<
  Database["public"]["Tables"]["work_orders"]["Row"],
  | "id"
  | "work_order_number"
  | "customer_id"
  | "customer_address_id"
  | "work_type"
  | "priority"
  | "status"
  | "assigned_to"
  | "scheduled_start"
  | "scheduled_end"
  | "description"
  | "created_at"
  | "updated_at"
>;

type CustomerRow = Pick<
  Database["public"]["Tables"]["customers"]["Row"],
  "id" | "display_name" | "company_name" | "status" | "archived_at"
>;

type AssigneeRow =
  Database["public"]["Functions"]["get_work_order_assignees"]["Returns"][number];

async function resolveCurrentUserId(
  supabase: SupabaseClient<Database>,
  providedUserId?: string,
): Promise<string | undefined> {
  if (providedUserId) {
    return providedUserId;
  }

  const authClient = (
    supabase as unknown as {
      auth?: {
        getClaims?: () => Promise<{
          data: { claims?: { sub?: string } } | null;
        }>;
      };
    }
  ).auth;

  if (typeof authClient?.getClaims === "function") {
    try {
      const { data } = await authClient.getClaims();
      return data?.claims?.sub;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export async function getWorkOrdersOverview(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  role: string,
  filters: WorkOrderFilters,
  options?: { userId?: string; userEmail?: string },
): Promise<WorkOrdersOverviewResult> {
  const isTechnician = role === "technician";
  const needsUserId = isTechnician || filters.assignedTo === "me";
  const effectiveUserId = needsUserId
    ? await resolveCurrentUserId(supabase, options?.userId)
    : options?.userId;

  const [workOrdersResult, customersResult, addressesResult, assigneesResult] =
    await Promise.all([
      supabase
        .from("work_orders")
        .select(
          "id, work_order_number, customer_id, customer_address_id, work_type, priority, status, assigned_to, scheduled_start, scheduled_end, description, created_at, updated_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("customers")
        .select("id, display_name, company_name, status, archived_at")
        .eq("organization_id", organizationId)
        .order("display_name", { ascending: true }),
      supabase
        .from("customer_addresses")
        .select(
          "id, customer_id, label, address_line_1, address_line_2, city, province, postal_code, country_code, is_primary",
        )
        .eq("organization_id", organizationId)
        .order("is_primary", { ascending: false }),
      isTechnician
        ? Promise.resolve({ data: [] as AssigneeRow[], error: null })
        : supabase.rpc("get_work_order_assignees", {
            target_organization_id: organizationId,
          }),
    ]);

  if (
    workOrdersResult.error ||
    customersResult.error ||
    addressesResult.error ||
    assigneesResult.error
  ) {
    return {
      ok: false,
      message: SAFE_WORK_ORDERS_LOAD_ERROR,
    };
  }

  const customerRows = (customersResult.data ?? []) as CustomerRow[];
  const customerMap = new Map(customerRows.map((c) => [c.id, c]));

  const activeCustomers: WorkOrderCustomerOption[] = customerRows
    .filter((c) => c.status === "active" && c.archived_at === null)
    .map((c) => ({
      id: c.id,
      displayName: c.display_name,
      companyName: c.company_name,
    }));

  const activeCustomerIds = new Set(activeCustomers.map((c) => c.id));

  const addressRows = (addressesResult.data ?? []) as CustomerAddressRow[];
  const addressMap = new Map(
    addressRows.map((row) => [row.id, toWorkOrderAddressOption(row)]),
  );

  const activeAddresses: WorkOrderAddressOption[] = addressRows
    .filter((row) => activeCustomerIds.has(row.customer_id))
    .map(toWorkOrderAddressOption);

  const assignees: WorkOrderAssigneeOption[] = (
    (assigneesResult.data ?? []) as AssigneeRow[]
  ).map((row) => ({
    userId: row.user_id,
    email: row.email,
    role: row.role,
  }));

  const assigneeEmailMap = new Map(assignees.map((a) => [a.userId, a.email]));
  if (isTechnician && effectiveUserId && options?.userEmail) {
    assigneeEmailMap.set(effectiveUserId, options.userEmail);
  }

  const allItems: WorkOrderListItem[] = (
    (workOrdersResult.data ?? []) as WorkOrderRow[]
  ).map((row) => {
    const customer = customerMap.get(row.customer_id);
    const address = row.customer_address_id
      ? addressMap.get(row.customer_address_id)
      : null;

    let assignedToEmail: string | null = null;
    if (row.assigned_to) {
      assignedToEmail = assigneeEmailMap.get(row.assigned_to) ?? null;
      if (!assignedToEmail && isTechnician && options?.userEmail) {
        if (!effectiveUserId || row.assigned_to === effectiveUserId) {
          assignedToEmail = options.userEmail;
        }
      }
    }

    return {
      id: row.id,
      workOrderNumber: row.work_order_number,
      customerId: row.customer_id,
      customerName: customer?.display_name ?? "Customer",
      customerAddressId: row.customer_address_id,
      addressSummary: formatAddressSummary(address),
      workType: toWorkOrderType(row.work_type),
      priority: toWorkOrderPriority(row.priority),
      status: toWorkOrderStatus(row.status),
      assignedTo: row.assigned_to,
      assignedToEmail,
      scheduledStart: row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  const summary = {
    totalCount: allItems.length,
    inProgressCount: allItems.filter((item) => item.status === "in_progress")
      .length,
    scheduledCount: allItems.filter((item) => item.status === "scheduled")
      .length,
  };

  const searchTerm = filters.search.trim().toLowerCase();

  const filteredItems = allItems.filter((item) => {
    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }

    if (filters.priority !== "all" && item.priority !== filters.priority) {
      return false;
    }

    if (filters.assignedTo === "unassigned") {
      if (item.assignedTo !== null) {
        return false;
      }
    } else if (filters.assignedTo === "me") {
      if (!effectiveUserId || item.assignedTo !== effectiveUserId) {
        return false;
      }
    } else if (filters.assignedTo !== "all") {
      if (item.assignedTo !== filters.assignedTo) {
        return false;
      }
    }

    if (searchTerm.length > 0) {
      const matchesNumber = item.workOrderNumber
        .toLowerCase()
        .includes(searchTerm);
      const matchesDescription = item.description
        .toLowerCase()
        .includes(searchTerm);

      if (!matchesNumber && !matchesDescription) {
        return false;
      }
    }

    return true;
  });

  const totalCount = filteredItems.length;
  const totalPages = Math.max(Math.ceil(totalCount / WORK_ORDER_PAGE_SIZE), 1);
  const page = Math.min(Math.max(filters.page, 1), totalPages);
  const start = (page - 1) * WORK_ORDER_PAGE_SIZE;
  const paginatedItems = filteredItems.slice(
    start,
    start + WORK_ORDER_PAGE_SIZE,
  );

  return {
    ok: true,
    data: {
      filters: { ...filters, page },
      items: paginatedItems,
      summary,
      customers: activeCustomers,
      addresses: activeAddresses,
      assignees,
      pageSize: WORK_ORDER_PAGE_SIZE,
      totalCount,
      totalPages,
    },
  };
}
