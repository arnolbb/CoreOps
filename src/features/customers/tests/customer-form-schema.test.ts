import { describe, expect, it } from "vitest";
import { customerFormSchema } from "../schemas/customer-form-schema";

describe("customerFormSchema", () => {
  it("parses valid individual customer values", () => {
    const input = {
      customerType: "individual",
      displayName: "John Doe",
      email: "john@example.com",
      phone: "+628123456789",
    };
    const result = customerFormSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerType).toBe("individual");
      expect(result.data.displayName).toBe("John Doe");
      expect(result.data.email).toBe("john@example.com");
      expect(result.data.countryCode).toBe("ID");
      expect(result.data.addressLabel).toBe("Primary");
    }
  });

  it("fails when displayName is blank", () => {
    const input = {
      customerType: "individual",
      displayName: "   ",
    };
    const result = customerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("fails when email is invalid", () => {
    const input = {
      customerType: "individual",
      displayName: "John Doe",
      email: "not-an-email",
    };
    const result = customerFormSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("transforms empty strings to null for optional fields", () => {
    const input = {
      customerType: "business",
      displayName: "Acme Corp",
      companyName: "   ",
      phone: "",
      email: "",
      notes: "",
    };
    const result = customerFormSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.companyName).toBeNull();
      expect(result.data.phone).toBeNull();
      expect(result.data.email).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });
});
