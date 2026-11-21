import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database-generated";
import { getWorkOrderDetail } from "../queries/get-work-order-detail";
import { getWorkOrdersOverview } from "../queries/get-work-orders";
import type { CustomerAddressRow } from "../queries/work-order-mappers";

type WorkOrderRow = Database["public"]["Tables"]["work_orders"]["Row"];
type CustomerRow = Pick<
  Database["public"]["Tables"]["customers"]["Row"],
  | "id"
  | "display_name"
  | "company_name"
  | "phone"
  | "email"
  | "status"
  | "archived_at"
>;
type AddressRow = CustomerAddressRow;
type ItemRow = Database["public"]["Tables"]["work_order_items"]["Row"];
type AttachmentRow =
  Database["public"]["Tables"]["work_order_attachments"]["Row"];
type WarehouseRow = Pick<
  Database["public"]["Tables"]["warehouses"]["Row"],
  "id" | "name" | "code" | "is_active"
>;
type ProductRow = Pick<
  Database["public"]["Tables"]["products"]["Row"],
  "id" | "name" | "sku" | "unit"
>;

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const WO_1_ID = "22222222-2222-4222-8222-222222222222";
const WO_2_ID = "33333333-3333-4333-8333-333333333333";
const CUST_1_ID = "44444444-4444-4444-8444-444444444444";
const CUST_2_ID = "55555555-5555-4555-8555-555555555555";
const ADDR_1_ID = "66666666-6666-4666-8666-666666666666";
const TECH_1_ID = "77777777-7777-4777-8777-777777777777";
const WH_1_ID = "88888888-8888-4888-8888-888888888888";
const PROD_1_ID = "99999999-9999-4999-8999-999999999999";

function createTrackerClient(options: {
  workOrders?: WorkOrderRow[];
  customers?: CustomerRow[];
  addresses?: AddressRow[];
  items?: ItemRow[];
  attachments?: AttachmentRow[];
  warehouses?: WarehouseRow[];
  products?: ProductRow[];
  assignees?: Array<{ user_id: string; email: string; role: string }>;
  workOrdersError?: { message: string } | null;
}) {
  const eqCalls: Record<string, Array<[string, unknown]>> = {
    work_orders: [],
    customers: [],
    customer_addresses: [],
    work_order_items: [],
    work_order_attachments: [],
    warehouses: [],
    products: [],
  };
  const rpcSpy = vi.fn().mockResolvedValue({
    data: options.assignees ?? [],
    error: null,
  });
  const createSignedUrlsSpy = vi.fn().mockImplementation((paths: string[]) =>
    Promise.resolve({
      data: paths.map((path) => ({
        path,
        signedUrl: `https://storage.local/signed/${encodeURIComponent(path)}`,
        error: null,
      })),
      error: null,
    }),
  );

  const client = {
    rpc: rpcSpy,
    storage: {
      from: () => ({
        createSignedUrls: createSignedUrlsSpy,
      }),
    },
    from(table: string) {
      if (table === "work_orders") {
        const filters: Array<[string, unknown]> = [];
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.work_orders.push([col, val]);
            filters.push([col, val]);
            return builder;
          },
          order: () =>
            Promise.resolve({
              data: options.workOrders ?? [],
              error: options.workOrdersError ?? null,
            }),
          maybeSingle: () => {
            const idFilter = filters.find(([col]) => col === "id")?.[1];
            const found =
              (options.workOrders ?? []).find((wo) => wo.id === idFilter) ??
              null;
            return Promise.resolve({
              data: found,
              error: options.workOrdersError ?? null,
            });
          },
        };
        return builder;
      }

      if (table === "customers") {
        const filters: Array<[string, unknown]> = [];
        let activeOnly = false;
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.customers.push([col, val]);
            filters.push([col, val]);
            if (col === "status" && val === "active") {
              activeOnly = true;
            }
            return builder;
          },
          is: (col: string, val: unknown) => {
            if (col === "archived_at" && val === null) {
              activeOnly = true;
            }
            return builder;
          },
          order: () => {
            const rows = (options.customers ?? []).filter((c) =>
              activeOnly
                ? c.status === "active" && c.archived_at === null
                : true,
            );
            return Promise.resolve({ data: rows, error: null });
          },
          maybeSingle: () => {
            const idFilter = filters.find(([col]) => col === "id")?.[1];
            const found =
              (options.customers ?? []).find((c) => c.id === idFilter) ?? null;
            return Promise.resolve({ data: found, error: null });
          },
        };
        return builder;
      }

      if (table === "customer_addresses") {
        const filters: Array<[string, unknown]> = [];
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.customer_addresses.push([col, val]);
            filters.push([col, val]);
            return builder;
          },
          order: () =>
            Promise.resolve({ data: options.addresses ?? [], error: null }),
          maybeSingle: () => {
            const idFilter = filters.find(([col]) => col === "id")?.[1];
            const found =
              (options.addresses ?? []).find((a) => a.id === idFilter) ?? null;
            return Promise.resolve({ data: found, error: null });
          },
        };
        return builder;
      }

      if (table === "work_order_items") {
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.work_order_items.push([col, val]);
            return builder;
          },
          order: () =>
            Promise.resolve({ data: options.items ?? [], error: null }),
        };
        return builder;
      }

      if (table === "work_order_attachments") {
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.work_order_attachments.push([col, val]);
            return builder;
          },
          order: () =>
            Promise.resolve({ data: options.attachments ?? [], error: null }),
        };
        return builder;
      }

      if (table === "warehouses") {
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.warehouses.push([col, val]);
            return builder;
          },
          order: () =>
            Promise.resolve({ data: options.warehouses ?? [], error: null }),
        };
        return builder;
      }

      if (table === "products") {
        const builder = {
          select: () => builder,
          eq: (col: string, val: unknown) => {
            eqCalls.products.push([col, val]);
            return builder;
          },
          is: () => builder,
          order: () =>
            Promise.resolve({ data: options.products ?? [], error: null }),
        };
        return builder;
      }

      throw new Error(`Unexpected table ${table}`);
    },
  } as unknown as SupabaseClient<Database>;

  return { client, eqCalls, rpcSpy, createSignedUrlsSpy };
}

const sampleWorkOrders: WorkOrderRow[] = [
  {
    id: WO_1_ID,
    organization_id: ORG_ID,
    work_order_number: "WO-2026-0001",
    customer_id: CUST_1_ID,
    customer_address_id: ADDR_1_ID,
    work_type: "service",
    priority: "high",
    status: "in_progress",
    assigned_to: TECH_1_ID,
    scheduled_start: "2026-11-22T09:00:00.000Z",
    scheduled_end: "2026-11-22T11:00:00.000Z",
    description: "Replace worn seal and test unit",
    completion_notes: null,
    cancellation_reason: null,
    started_at: "2026-11-22T09:05:00.000Z",
    completed_at: null,
    cancelled_at: null,
    created_by: TECH_1_ID,
    created_at: "2026-11-21T08:00:00.000Z",
    updated_at: "2026-11-22T09:05:00.000Z",
  },
  {
    id: WO_2_ID,
    organization_id: ORG_ID,
    work_order_number: "WO-2026-0002",
    customer_id: CUST_2_ID,
    customer_address_id: null,
    work_type: "inspection",
    priority: "normal",
    status: "scheduled",
    assigned_to: null,
    scheduled_start: "2026-11-23T09:00:00.000Z",
    scheduled_end: null,
    description: "Annual site inspection",
    completion_notes: null,
    cancellation_reason: null,
    started_at: null,
    completed_at: null,
    cancelled_at: null,
    created_by: TECH_1_ID,
    created_at: "2026-11-21T07:00:00.000Z",
    updated_at: "2026-11-21T07:00:00.000Z",
  },
];

const sampleCustomers: CustomerRow[] = [
  {
    id: CUST_1_ID,
    display_name: "Northwind Logistics",
    company_name: "Northwind Corp",
    phone: "+1-555-0100",
    email: "ops@northwind.test",
    status: "active",
    archived_at: null,
  },
  {
    id: CUST_2_ID,
    display_name: "Archived Client",
    company_name: null,
    phone: null,
    email: null,
    status: "archived",
    archived_at: "2026-11-20T00:00:00.000Z",
  },
];

const sampleAddresses: AddressRow[] = [
  {
    id: ADDR_1_ID,
    customer_id: CUST_1_ID,
    label: "Main Site",
    address_line_1: "100 Harbor Blvd",
    address_line_2: null,
    city: "Seattle",
    province: "WA",
    postal_code: "98101",
    country_code: "US",
    is_primary: true,
  },
];

describe("getWorkOrdersOverview", () => {
  it("scopes queries to organization_id, computes summary, filters, and calls assignees RPC for staff", async () => {
    const { client, eqCalls, rpcSpy } = createTrackerClient({
      workOrders: sampleWorkOrders,
      customers: sampleCustomers,
      addresses: sampleAddresses,
      assignees: [
        { user_id: TECH_1_ID, email: "tech@acme.test", role: "technician" },
      ],
    });

    const result = await getWorkOrdersOverview(
      client,
      ORG_ID,
      "staff",
      {
        search: "seal",
        status: "in_progress",
        priority: "high",
        assignedTo: TECH_1_ID,
        page: 1,
      },
      { userId: "staff-1", userEmail: "staff@acme.test" },
    );

    expect(eqCalls.work_orders).toEqual([["organization_id", ORG_ID]]);
    expect(eqCalls.customers).toEqual([["organization_id", ORG_ID]]);
    expect(eqCalls.customer_addresses).toEqual([["organization_id", ORG_ID]]);
    expect(rpcSpy).toHaveBeenCalledWith("get_work_order_assignees", {
      target_organization_id: ORG_ID,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.summary).toEqual({
        totalCount: 2,
        inProgressCount: 1,
        scheduledCount: 1,
      });
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0]?.workOrderNumber).toBe("WO-2026-0001");
      expect(result.data.items[0]?.assignedToEmail).toBe("tech@acme.test");
      expect(result.data.customers.map((c) => c.id)).toEqual([CUST_1_ID]);
    }
  });

  it("skips get_work_order_assignees for technician and resolves own email + me filter", async () => {
    const { client, rpcSpy } = createTrackerClient({
      workOrders: [sampleWorkOrders[0]!],
      customers: [sampleCustomers[0]!],
      addresses: sampleAddresses,
    });

    const result = await getWorkOrdersOverview(
      client,
      ORG_ID,
      "technician",
      {
        search: "",
        status: "all",
        priority: "all",
        assignedTo: "me",
        page: 1,
      },
      { userId: TECH_1_ID, userEmail: "tech@acme.test" },
    );

    expect(rpcSpy).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0]?.assignedToEmail).toBe("tech@acme.test");
      expect(result.data.assignees).toEqual([]);
    }
  });

  it("masks database errors safely", async () => {
    const { client } = createTrackerClient({
      workOrdersError: { message: "raw postgres relation failure" },
    });

    const result = await getWorkOrdersOverview(client, ORG_ID, "staff", {
      search: "",
      status: "all",
      priority: "all",
      assignedTo: "all",
      page: 1,
    });

    expect(result).toEqual({
      ok: false,
      message: "Unable to load work orders. Try again.",
    });
  });
});

describe("getWorkOrderDetail", () => {
  it("loads detail, used items, attachments with signed URLs, and manager options", async () => {
    const { client, createSignedUrlsSpy, rpcSpy } = createTrackerClient({
      workOrders: sampleWorkOrders,
      customers: sampleCustomers,
      addresses: sampleAddresses,
      warehouses: [
        { id: WH_1_ID, name: "Main Warehouse", code: "WH-01", is_active: true },
      ],
      products: [
        { id: PROD_1_ID, name: "Seal Kit", sku: "SEAL-01", unit: "pcs" },
      ],
      items: [
        {
          id: "item-1",
          organization_id: ORG_ID,
          work_order_id: WO_1_ID,
          product_id: PROD_1_ID,
          warehouse_id: WH_1_ID,
          name_snapshot: "Seal Kit",
          unit_snapshot: "pcs",
          quantity: 2,
          inventory_transaction_id: "tx-1",
          created_by: TECH_1_ID,
          created_at: "2026-11-22T09:30:00.000Z",
        },
      ],
      attachments: [
        {
          id: "att-1",
          organization_id: ORG_ID,
          work_order_id: WO_1_ID,
          storage_path: `${ORG_ID}/${WO_1_ID}/photo.png`,
          file_name: "photo.png",
          mime_type: "image/png",
          size_bytes: 2048,
          attachment_type: "photo",
          uploaded_by: TECH_1_ID,
          created_at: "2026-11-22T09:35:00.000Z",
        },
      ],
      assignees: [
        { user_id: TECH_1_ID, email: "tech@acme.test", role: "technician" },
      ],
    });

    const result = await getWorkOrderDetail(
      client,
      ORG_ID,
      WO_1_ID,
      "staff",
      "staff@acme.test",
      "staff-1",
    );

    expect(rpcSpy).toHaveBeenCalledWith("get_work_order_assignees", {
      target_organization_id: ORG_ID,
    });
    expect(createSignedUrlsSpy).toHaveBeenCalledWith(
      [`${ORG_ID}/${WO_1_ID}/photo.png`],
      900,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.workOrder.workOrderNumber).toBe("WO-2026-0001");
      expect(result.data.workOrder.items).toHaveLength(1);
      expect(result.data.workOrder.items[0]?.warehouseName).toBe(
        "Main Warehouse",
      );
      expect(result.data.workOrder.attachments[0]?.signedUrl).toContain(
        "https://storage.local/signed/",
      );
      expect(result.data.warehouses).toHaveLength(1);
      expect(result.data.products).toHaveLength(1);
      expect(result.data.customers).toHaveLength(1);
    }
  });

  it("returns safe not found for invalid UUID or missing work order", async () => {
    const { client } = createTrackerClient({ workOrders: [] });

    expect(
      await getWorkOrderDetail(client, ORG_ID, "not-a-uuid", "staff"),
    ).toEqual({
      ok: false,
      message: "Work order not found.",
    });

    expect(await getWorkOrderDetail(client, ORG_ID, WO_1_ID, "staff")).toEqual({
      ok: false,
      message: "Work order not found.",
    });
  });
});
