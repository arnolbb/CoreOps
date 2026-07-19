import { describe, expect, it } from "vitest";
import { getAuthenticatedUserFromClient, type ClaimsClient } from "../session";

function clientWithClaims(
  result: Awaited<ReturnType<ClaimsClient["auth"]["getClaims"]>>,
): ClaimsClient {
  return {
    auth: {
      async getClaims() {
        return result;
      },
    },
  };
}

describe("getAuthenticatedUserFromClient", () => {
  it("returns user from trusted claims", async () => {
    const user = await getAuthenticatedUserFromClient(
      clientWithClaims({
        data: { claims: { sub: "user-1", email: "user@example.com" } },
        error: null,
      }),
    );

    expect(user).toEqual({ id: "user-1", email: "user@example.com" });
  });

  it("rejects missing claims", async () => {
    await expect(
      getAuthenticatedUserFromClient(
        clientWithClaims({ data: null, error: null }),
      ),
    ).resolves.toBeNull();
  });

  it("rejects invalid claims", async () => {
    await expect(
      getAuthenticatedUserFromClient(
        clientWithClaims({ data: null, error: new Error("invalid token") }),
      ),
    ).resolves.toBeNull();
  });
});
