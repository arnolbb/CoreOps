import { describe, expect, it } from "vitest";
import { inviteMemberSchema } from "../schemas/invite-member-schema";

describe("inviteMemberSchema", () => {
  it("normalizes email and accepts admin/staff roles", () => {
    expect(
      inviteMemberSchema.parse({ email: "USER@Example.TEST", role: "admin" }),
    ).toEqual({ email: "user@example.test", role: "admin" });

    expect(
      inviteMemberSchema.parse({ email: "staff@example.test", role: "staff" }),
    ).toEqual({ email: "staff@example.test", role: "staff" });
  });

  it("rejects invalid email and unsupported roles", () => {
    expect(
      inviteMemberSchema.safeParse({ email: "bad", role: "staff" }).success,
    ).toBe(false);
    expect(
      inviteMemberSchema.safeParse({
        email: "owner@example.test",
        role: "owner",
      }).success,
    ).toBe(false);
  });
});
