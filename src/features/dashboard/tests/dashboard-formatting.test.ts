import { describe, expect, it } from "vitest";
import {
  formatAuditActionSummary,
  formatCurrencyAmount,
  formatDashboardDateTime,
} from "../services/dashboard-formatting";

describe("dashboard-formatting", () => {
  it("formats currency amounts using Intl.NumberFormat with safe fallback", () => {
    expect(formatCurrencyAmount(1250.5, "USD")).toBe("$1,250.50");
    expect(formatCurrencyAmount(42, "usd")).toBe("$42.00");
    expect(formatCurrencyAmount(99, "INVALID")).toBe("$99.00");
  });

  it("maps known audit action codes to human-readable summaries", () => {
    expect(formatAuditActionSummary("inventory.stock_adjusted")).toBe(
      "Adjusted inventory stock",
    );
    expect(formatAuditActionSummary("sales_order.confirmed")).toBe(
      "Confirmed a sales order",
    );
    expect(formatAuditActionSummary("payment.recorded")).toBe(
      "Recorded a sales payment",
    );
    expect(formatAuditActionSummary("work_order.created")).toBe(
      "Created a work order",
    );
    expect(
      formatAuditActionSummary("custom.action_triggered", "work_order"),
    ).toBe("Custom action triggered (Work order)");
  });

  it("formats timestamps in the organization timezone", () => {
    const utcFormatted = formatDashboardDateTime(
      "2026-04-30T18:00:00.000Z",
      "UTC",
    );
    const jakartaFormatted = formatDashboardDateTime(
      "2026-04-30T18:00:00.000Z",
      "Asia/Jakarta",
    );

    expect(utcFormatted).toContain("Apr 30, 2026");
    expect(jakartaFormatted).toContain("May 1, 2026");
    expect(formatDashboardDateTime("not-a-date", "UTC")).toBe("—");
  });
});
