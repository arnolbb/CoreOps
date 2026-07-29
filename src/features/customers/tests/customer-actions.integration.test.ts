import { describe, expect, it } from "vitest";
import { createCustomerAction, updateCustomerAction } from "../actions/customer-actions";

describe("Customer Actions Integration", () => {
  it("exports customer server actions", () => {
    expect(createCustomerAction).toBeDefined();
    expect(updateCustomerAction).toBeDefined();
  });
});
