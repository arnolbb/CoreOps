import { describe, expect, it } from "vitest";
import {
  canManageWorkOrders,
  canOperateWorkOrder,
  canReadWorkOrders,
  canReopenWorkOrders,
} from "../services/work-order-permissions";

describe("work-order-permissions", () => {
  describe("canReadWorkOrders", () => {
    it.each(["owner", "admin", "staff", "viewer", "technician"])(
      "allows %s to read work orders",
      (role) => {
        expect(canReadWorkOrders(role)).toBe(true);
      },
    );

    it.each(["manager", "", "unknown"])(
      "denies reading work orders for %s",
      (role) => {
        expect(canReadWorkOrders(role)).toBe(false);
      },
    );
  });

  describe("canManageWorkOrders", () => {
    it.each(["owner", "admin", "staff"])(
      "allows %s to manage work orders",
      (role) => {
        expect(canManageWorkOrders(role)).toBe(true);
      },
    );

    it.each(["viewer", "technician", "manager", "", "unknown"])(
      "denies managing work orders for %s",
      (role) => {
        expect(canManageWorkOrders(role)).toBe(false);
      },
    );
  });

  describe("canReopenWorkOrders", () => {
    it.each(["owner", "admin"])(
      "allows %s to reopen completed work orders",
      (role) => {
        expect(canReopenWorkOrders(role)).toBe(true);
      },
    );

    it.each(["staff", "viewer", "technician", "manager", "", "unknown"])(
      "denies reopening work orders for %s",
      (role) => {
        expect(canReopenWorkOrders(role)).toBe(false);
      },
    );
  });

  describe("canOperateWorkOrder", () => {
    it.each(["owner", "admin", "staff"])(
      "allows %s to operate any work order in the organization",
      (role) => {
        expect(canOperateWorkOrder(role, null, "user-1")).toBe(true);
        expect(canOperateWorkOrder(role, "user-2", "user-1")).toBe(true);
      },
    );

    it("allows technician only when assigned to that work order", () => {
      expect(canOperateWorkOrder("technician", "tech-1", "tech-1")).toBe(true);
      expect(canOperateWorkOrder("technician", "tech-2", "tech-1")).toBe(false);
      expect(canOperateWorkOrder("technician", null, "tech-1")).toBe(false);
      expect(canOperateWorkOrder("technician", "", "")).toBe(false);
    });

    it.each(["viewer", "manager", "", "unknown"])(
      "denies operating work order for %s even if assigned",
      (role) => {
        expect(canOperateWorkOrder(role, "user-1", "user-1")).toBe(false);
      },
    );
  });
});
