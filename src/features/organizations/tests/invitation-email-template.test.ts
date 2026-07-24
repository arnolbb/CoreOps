import { describe, expect, it } from "vitest";
import {
  buildInvitationEmailHtml,
  buildInvitationEmailText,
} from "../services/invitation-email-template";

describe("invitation email template", () => {
  it("renders invitation details without token hash or internal ids", () => {
    const input = {
      organizationName: "Acme <Ops>",
      role: "staff" as const,
      acceptUrl:
        "http://localhost:3000/invitations/accept-link?token=raw-token",
      expiresAt: new Date("2026-07-26T00:00:00.000Z"),
    };

    const text = buildInvitationEmailText(input);
    const html = buildInvitationEmailHtml(input);

    expect(text).toContain("Acme <Ops>");
    expect(text).toContain("Staff");
    expect(text).toContain(input.acceptUrl);
    expect(html).toContain("Acme &lt;Ops&gt;");
    expect(html).toContain("Accept this invitation");
    expect(html).not.toContain("organization_id");
    expect(html).not.toContain("token_hash");
  });
});
