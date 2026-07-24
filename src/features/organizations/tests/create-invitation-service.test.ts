import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database-generated";
import { createInvitation } from "../services/create-invitation";

const mocks = vi.hoisted(() => ({
  sendInvitationEmail: vi.fn(),
}));

vi.mock("../services/send-invitation-email", () => ({
  sendInvitationEmail: mocks.sendInvitationEmail,
}));

function createClient(response: unknown) {
  return {
    rpc(_name: string, args: unknown) {
      return Promise.resolve(
        typeof response === "function" ? response(args) : response,
      );
    },
  } as unknown as SupabaseClient<Database>;
}

describe("createInvitation", () => {
  beforeEach(() => {
    mocks.sendInvitationEmail.mockReset();
  });

  it("stores only token hash through RPC and sends raw token by email", async () => {
    let rpcArgs: Record<string, string> | undefined;
    const result = await createInvitation(
      createClient((args: Record<string, string>) => {
        rpcArgs = args;
        return {
          data: [
            {
              email: "new@example.test",
              was_resent: false,
            },
          ],
          error: null,
        };
      }),
      { id: "org-1", name: "Acme" },
      { email: "new@example.test", role: "staff" },
    );

    expect(result).toEqual({
      ok: true,
      code: "INVITATION_CREATED",
      message: "Invitation sent.",
    });
    expect(rpcArgs?.invitation_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(rpcArgs?.invitation_token_hash).not.toContain("raw");
    expect(mocks.sendInvitationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ rawToken: expect.any(String) }),
    );
  });

  it("maps duplicate pending invite to resent success", async () => {
    const result = await createInvitation(
      createClient({
        data: [{ email: "new@example.test", was_resent: true }],
        error: null,
      }),
      { id: "org-1", name: "Acme" },
      { email: "new@example.test", role: "staff" },
    );

    expect(result.message).toBe("Invitation resent.");
  });

  it("maps email send failure safely", async () => {
    mocks.sendInvitationEmail.mockRejectedValue(new Error("smtp failed"));

    const result = await createInvitation(
      createClient({
        data: [{ email: "new@example.test", was_resent: false }],
        error: null,
      }),
      { id: "org-1", name: "Acme" },
      { email: "new@example.test", role: "staff" },
    );

    expect(result).toEqual({
      ok: false,
      code: "INVITATION_SEND_FAILED",
      message: "Invitation could not be sent. Try again.",
    });
  });
});
