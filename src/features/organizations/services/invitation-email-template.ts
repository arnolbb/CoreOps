import type { InvitationAssignableRole } from "../types/invitation";

const roleLabels: Record<InvitationAssignableRole, string> = {
  admin: "Admin",
  staff: "Staff",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type InvitationEmailTemplateInput = {
  organizationName: string;
  role: InvitationAssignableRole;
  acceptUrl: string;
  expiresAt: Date;
};

export function buildInvitationEmailSubject() {
  return "You were invited to join CoreOps";
}

export function buildInvitationEmailText({
  organizationName,
  role,
  acceptUrl,
  expiresAt,
}: InvitationEmailTemplateInput) {
  return [
    `You were invited to join ${organizationName} as ${roleLabels[role]}.`,
    "",
    `Accept this invitation: ${acceptUrl}`,
    "",
    `This invitation expires on ${expiresAt.toUTCString()}.`,
    "",
    "If you did not expect this invitation, ignore this email.",
  ].join("\n");
}

export function buildInvitationEmailHtml({
  organizationName,
  role,
  acceptUrl,
  expiresAt,
}: InvitationEmailTemplateInput) {
  const safeOrganizationName = escapeHtml(organizationName);
  const safeRole = escapeHtml(roleLabels[role]);
  const safeAcceptUrl = escapeHtml(acceptUrl);
  const safeExpiresAt = escapeHtml(expiresAt.toUTCString());

  return `<!doctype html>
<html lang="en">
  <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #18181b;">
    <h1 style="font-size: 20px;">You were invited to join CoreOps</h1>
    <p>You were invited to join <strong>${safeOrganizationName}</strong> as <strong>${safeRole}</strong>.</p>
    <p><a href="${safeAcceptUrl}">Accept this invitation</a></p>
    <p>This invitation expires on ${safeExpiresAt}.</p>
    <p>If you did not expect this invitation, ignore this email.</p>
  </body>
</html>`;
}
