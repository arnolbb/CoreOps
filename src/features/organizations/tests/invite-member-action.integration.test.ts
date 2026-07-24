import { beforeEach, describe, expect, it, vi } from "vitest";
import { inviteMemberAction } from "../actions/invite-member";

const mocks = vi.hoisted(() => ({
  createInvitation: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getActiveOrganizationState: vi.fn(),
  revalidatePath: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth/session", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

vi.mock("../queries/get-active-organization-memberships", () => ({
  getActiveOrganizationState: mocks.getActiveOrganizationState,
}));

vi.mock("../services/create-invitation", () => ({
  createInvitation: mocks.createInvitation,
}));

function validFormData() {
  const formData = new FormData();
  formData.set("email", "Invitee@Example.TEST");
  formData.set("role", "staff");
  formData.set("organization_id", "malicious-org-id");
  return formData;
}

describe("inviteMemberAction", () => {
  beforeEach(() => {
    mocks.createInvitation.mockReset();
    mocks.createSupabaseServerClient.mockReset();
    mocks.getActiveOrganizationState.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.requireAuthenticatedUser.mockReset();

    mocks.requireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.createSupabaseServerClient.mockResolvedValue({ client: true });
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "single",
      membership: { organizationId: "org-1", role: "owner" },
      organization: { id: "org-1", name: "Acme", slug: "acme" },
    });
    mocks.createInvitation.mockResolvedValue({
      ok: true,
      code: "INVITATION_CREATED",
      message: "Invitation sent.",
    });
  });

  it("creates an invitation using server-resolved organization", async () => {
    const result = await inviteMemberAction(
      { status: "idle" },
      validFormData(),
    );

    expect(result).toEqual({ status: "success", message: "Invitation sent." });
    expect(mocks.createInvitation).toHaveBeenCalledWith(
      { client: true },
      { id: "org-1", name: "Acme", slug: "acme" },
      { email: "invitee@example.test", role: "staff" },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/team");
  });

  it("does not create when multiple memberships need organization selection", async () => {
    mocks.getActiveOrganizationState.mockResolvedValue({
      status: "multiple",
      memberships: [
        { organizationId: "org-1", role: "owner" },
        { organizationId: "org-2", role: "admin" },
      ],
    });

    const result = await inviteMemberAction(
      { status: "idle" },
      validFormData(),
    );

    expect(result).toEqual({
      status: "error",
      message: "Organization selection is required before inviting members.",
    });
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });

  it("validates form input before calling service", async () => {
    const formData = new FormData();
    formData.set("email", "bad");
    formData.set("role", "owner");

    const result = await inviteMemberAction({ status: "idle" }, formData);

    expect(result.status).toBe("error");
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });
});
