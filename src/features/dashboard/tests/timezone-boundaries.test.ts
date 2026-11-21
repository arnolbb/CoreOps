import { describe, expect, it } from "vitest";
import {
  getCurrentMonthBoundariesUtc,
  resolveValidTimezone,
} from "../services/timezone-boundaries";

describe("timezone-boundaries", () => {
  it("computes UTC month boundaries cleanly", () => {
    const result = getCurrentMonthBoundariesUtc(
      "UTC",
      new Date("2026-04-15T12:34:56.000Z"),
    );

    expect(result).toEqual({
      startIso: "2026-04-01T00:00:00.000Z",
      endIso: "2026-05-01T00:00:00.000Z",
      monthLabel: "April 2026",
      resolvedTimezone: "UTC",
    });
  });

  it("handles Asia/Jakarta (UTC+7) month boundary when UTC is still previous month", () => {
    // 2026-04-30T18:00:00Z is 2026-05-01T01:00:00+07:00 in Jakarta (May 2026)
    const result = getCurrentMonthBoundariesUtc(
      "Asia/Jakarta",
      new Date("2026-04-30T18:00:00.000Z"),
    );

    expect(result).toEqual({
      startIso: "2026-04-30T17:00:00.000Z",
      endIso: "2026-05-31T17:00:00.000Z",
      monthLabel: "May 2026",
      resolvedTimezone: "Asia/Jakarta",
    });
  });

  it("handles year rollover in Asia/Jakarta", () => {
    // 2026-12-31T18:00:00Z is 2027-01-01T01:00:00+07:00
    const result = getCurrentMonthBoundariesUtc(
      "Asia/Jakarta",
      new Date("2026-12-31T18:00:00.000Z"),
    );

    expect(result).toEqual({
      startIso: "2026-12-31T17:00:00.000Z",
      endIso: "2027-01-31T17:00:00.000Z",
      monthLabel: "January 2027",
      resolvedTimezone: "Asia/Jakarta",
    });
  });

  it("handles America/New_York spring-forward DST month boundaries", () => {
    // March 1 2026 is EST (-05:00 -> 05:00Z); April 1 2026 is EDT (-04:00 -> 04:00Z)
    const result = getCurrentMonthBoundariesUtc(
      "America/New_York",
      new Date("2026-03-15T12:00:00.000Z"),
    );

    expect(result).toEqual({
      startIso: "2026-03-01T05:00:00.000Z",
      endIso: "2026-04-01T04:00:00.000Z",
      monthLabel: "March 2026",
      resolvedTimezone: "America/New_York",
    });
  });

  it("handles America/New_York when UTC is March 1 before local midnight", () => {
    // 2026-03-01T04:30:00Z is 2026-02-28 23:30:00 EST (still February in New York)
    const result = getCurrentMonthBoundariesUtc(
      "America/New_York",
      new Date("2026-03-01T04:30:00.000Z"),
    );

    expect(result).toEqual({
      startIso: "2026-02-01T05:00:00.000Z",
      endIso: "2026-03-01T05:00:00.000Z",
      monthLabel: "February 2026",
      resolvedTimezone: "America/New_York",
    });
  });

  it("handles America/New_York fall-back DST month boundaries", () => {
    // Nov 1 2026 00:00 is EDT (-04:00 -> 04:00Z); Dec 1 2026 00:00 is EST (-05:00 -> 05:00Z)
    const result = getCurrentMonthBoundariesUtc(
      "America/New_York",
      new Date("2026-11-15T12:00:00.000Z"),
    );

    expect(result).toEqual({
      startIso: "2026-11-01T04:00:00.000Z",
      endIso: "2026-12-01T05:00:00.000Z",
      monthLabel: "November 2026",
      resolvedTimezone: "America/New_York",
    });
  });

  it("falls back to UTC when timezone is invalid or empty", () => {
    expect(resolveValidTimezone("Mars/Olympus_Mons")).toBe("UTC");
    expect(resolveValidTimezone("   ")).toBe("UTC");
    expect(resolveValidTimezone(null)).toBe("UTC");

    const result = getCurrentMonthBoundariesUtc(
      "Invalid/Timezone",
      new Date("2026-04-30T18:00:00.000Z"),
    );

    expect(result).toEqual({
      startIso: "2026-04-01T00:00:00.000Z",
      endIso: "2026-05-01T00:00:00.000Z",
      monthLabel: "April 2026",
      resolvedTimezone: "UTC",
    });
  });
});
