import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "../safe-redirect";

describe("getSafeRedirectPath", () => {
  it("allows local relative paths", () => {
    expect(getSafeRedirectPath("/dashboard?tab=home#top")).toBe(
      "/dashboard?tab=home#top",
    );
  });

  it("rejects external URLs", () => {
    expect(getSafeRedirectPath("https://evil.example/steal")).toBe(
      "/dashboard",
    );
  });

  it("rejects protocol-relative URLs", () => {
    expect(getSafeRedirectPath("//evil.example/steal")).toBe("/dashboard");
  });

  it("uses custom fallback for missing input", () => {
    expect(getSafeRedirectPath(null, "/sign-in")).toBe("/sign-in");
  });
});
