import { describe, expect, it } from "vitest";
import {
  cancelSalesOrderSchema,
  confirmSalesOrderSchema,
  salesOrderDraftSchema,
  salesOrderItemSchema,
  updateSalesOrderDraftSchema,
} from "../schemas/sales-order-schema";
import {
  recordSalesPaymentSchema,
  voidSalesPaymentSchema,
} from "../schemas/sales-payment-schema";
import { parseSalesSearchParams } from "../schemas/sales-search-schema";

const VALID_CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";
const VALID_WAREHOUSE_ID = "22222222-2222-4222-8222-222222222222";
const VALID_PRODUCT_ID = "33333333-3333-4333-8333-333333333333";
const VALID_ORDER_ID = "44444444-4444-4444-8444-444444444444";
const VALID_PAYMENT_ID = "55555555-5555-4555-8555-555555555555";

describe("salesSearchSchema", () => {
  it("normalizes valid filters and falls back safely on invalid values", () => {
    expect(
      parseSalesSearchParams({
        search: "  SO-2026  ",
        status: "confirmed",
        paymentStatus: "partially_paid",
        page: "3",
      }),
    ).toEqual({
      search: "SO-2026",
      status: "confirmed",
      paymentStatus: "partially_paid",
      page: 3,
    });

    expect(
      parseSalesSearchParams({
        search: "",
        status: "invalid_status",
        paymentStatus: "refunded",
        page: "-2",
      }),
    ).toEqual({
      search: "",
      status: "all",
      paymentStatus: "all",
      page: 1,
    });
  });
});

describe("salesOrderItemSchema and draft schemas", () => {
  it("parses catalog and custom order items and normalizes blank optional strings", () => {
    const parsed = salesOrderDraftSchema.safeParse({
      customerId: VALID_CUSTOMER_ID,
      warehouseId: "",
      orderNumber: "   ",
      notes: "  Rush delivery  ",
      items: [
        {
          productId: VALID_PRODUCT_ID,
          quantity: "2.5",
          unitPrice: "40.00",
          discountAmount: "5",
          taxAmount: "9.5",
        },
        {
          productId: null,
          name: "  Delivery Fee  ",
          sku: "",
          unit: "  trip ",
          quantity: 1,
          unitPrice: 25,
          discountAmount: 0,
          taxAmount: 2.5,
        },
      ],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.warehouseId).toBeNull();
      expect(parsed.data.orderNumber).toBeNull();
      expect(parsed.data.notes).toBe("Rush delivery");
      expect(parsed.data.items[0]).toMatchObject({
        productId: VALID_PRODUCT_ID,
        quantity: 2.5,
        unitPrice: 40,
        discountAmount: 5,
        taxAmount: 9.5,
      });
      expect(parsed.data.items[1]).toMatchObject({
        productId: null,
        name: "Delivery Fee",
        sku: null,
        unit: "trip",
        quantity: 1,
        unitPrice: 25,
      });
    }
  });

  it("rejects non-positive quantity and negative price/discount/tax", () => {
    expect(
      salesOrderItemSchema.safeParse({
        productId: VALID_PRODUCT_ID,
        quantity: 0,
        unitPrice: 10,
      }).success,
    ).toBe(false);

    expect(
      salesOrderItemSchema.safeParse({
        productId: VALID_PRODUCT_ID,
        quantity: 1,
        unitPrice: -1,
      }).success,
    ).toBe(false);

    expect(
      salesOrderItemSchema.safeParse({
        productId: VALID_PRODUCT_ID,
        quantity: 1,
        unitPrice: 10,
        discountAmount: -0.01,
      }).success,
    ).toBe(false);

    expect(
      salesOrderItemSchema.safeParse({
        productId: VALID_PRODUCT_ID,
        quantity: 1,
        unitPrice: 10,
        taxAmount: -0.01,
      }).success,
    ).toBe(false);
  });

  it("rejects discount exceeding line subtotal", () => {
    const res = salesOrderItemSchema.safeParse({
      productId: VALID_PRODUCT_ID,
      quantity: 2,
      unitPrice: 10,
      discountAmount: 20.01,
    });

    expect(res.success).toBe(false);
  });

  it("requires non-blank name and unit for custom items", () => {
    const missingName = salesOrderItemSchema.safeParse({
      productId: null,
      name: "   ",
      unit: "pcs",
      quantity: 1,
      unitPrice: 10,
    });
    expect(missingName.success).toBe(false);

    const missingUnit = salesOrderItemSchema.safeParse({
      productId: null,
      name: "Setup Service",
      unit: "   ",
      quantity: 1,
      unitPrice: 10,
    });
    expect(missingUnit.success).toBe(false);
  });

  it("rejects empty items list and invalid UUIDs on draft, confirm, and cancel schemas", () => {
    expect(
      updateSalesOrderDraftSchema.safeParse({
        customerId: "not-a-uuid",
        items: [],
      }).success,
    ).toBe(false);

    expect(
      confirmSalesOrderSchema.safeParse({
        salesOrderId: "not-a-uuid",
        warehouseId: VALID_WAREHOUSE_ID,
      }).success,
    ).toBe(false);

    expect(
      cancelSalesOrderSchema.safeParse({
        salesOrderId: VALID_ORDER_ID,
        reason: "   ",
      }).success,
    ).toBe(false);

    expect(
      cancelSalesOrderSchema.safeParse({
        salesOrderId: VALID_ORDER_ID,
        reason: "Customer cancelled",
      }).success,
    ).toBe(true);
  });
});

describe("sales payment schemas", () => {
  it("validates recordSalesPaymentSchema", () => {
    const valid = recordSalesPaymentSchema.safeParse({
      salesOrderId: VALID_ORDER_ID,
      amount: "125.50",
      paymentMethod: "bank_transfer",
      reference: "TX-99",
      notes: "Deposit",
    });
    expect(valid.success).toBe(true);

    expect(
      recordSalesPaymentSchema.safeParse({
        salesOrderId: VALID_ORDER_ID,
        amount: 0,
        paymentMethod: "cash",
      }).success,
    ).toBe(false);

    expect(
      recordSalesPaymentSchema.safeParse({
        salesOrderId: VALID_ORDER_ID,
        amount: 50,
        paymentMethod: "crypto",
      }).success,
    ).toBe(false);

    expect(
      recordSalesPaymentSchema.safeParse({
        salesOrderId: "bad-id",
        amount: 50,
        paymentMethod: "cash",
      }).success,
    ).toBe(false);
  });

  it("validates voidSalesPaymentSchema", () => {
    expect(
      voidSalesPaymentSchema.safeParse({
        paymentId: VALID_PAYMENT_ID,
        voidReason: "Bounced check",
      }).success,
    ).toBe(true);

    expect(
      voidSalesPaymentSchema.safeParse({
        paymentId: VALID_PAYMENT_ID,
        voidReason: "   ",
      }).success,
    ).toBe(false);

    expect(
      voidSalesPaymentSchema.safeParse({
        paymentId: "bad-id",
        voidReason: "Duplicate",
      }).success,
    ).toBe(false);
  });
});
