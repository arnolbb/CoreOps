import { describe, expect, it, vi } from "vitest";
import { checkCustomerDuplicate } from "../queries/check-customer-duplicate";

describe("checkCustomerDuplicate", () => {
  it("returns no duplicate when email and phone are empty", async () => {
    const mockSupabase = {} as any;
    const result = await checkCustomerDuplicate(mockSupabase, "org-1", "", "");
    expect(result).toEqual({
      hasDuplicate: false,
      duplicateEmail: false,
      duplicatePhone: false,
    });
  });

  it("detects duplicate email correctly", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({
                data: [{ id: "c-1", email: "test@example.com", phone: null }],
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as any;

    const result = await checkCustomerDuplicate(
      mockSupabase,
      "org-1",
      "test@example.com",
      null,
    );

    expect(result.hasDuplicate).toBe(true);
    expect(result.duplicateEmail).toBe(true);
    expect(result.duplicatePhone).toBe(false);
  });
});
