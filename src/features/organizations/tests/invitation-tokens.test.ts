import { describe, expect, it } from "vitest";
import {
  generateInvitationToken,
  getInvitationExpiryDate,
  hashInvitationToken,
  parseInvitationToken,
} from "../services/invitation-tokens";

describe("invitation tokens", () => {
  it("generates URL-safe random tokens", () => {
    const token = generateInvitationToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(parseInvitationToken(token)).toBe(token);
  });

  it("hashes tokens without returning the raw token", () => {
    const token = "abcdefghijklmnopqrstuvwxyzABCDEFGH1234567890_-";
    const hash = hashInvitationToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(token);
    expect(hashInvitationToken(token)).toBe(hash);
  });

  it("calculates seven day expiry", () => {
    const now = new Date("2026-07-19T00:00:00.000Z");

    expect(getInvitationExpiryDate(now).toISOString()).toBe(
      "2026-07-26T00:00:00.000Z",
    );
  });
});
