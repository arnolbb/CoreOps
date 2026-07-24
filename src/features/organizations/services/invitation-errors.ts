import type { InvitationActionResult } from "../types/invitation";

export const INVITATION_MESSAGES = {
  accepted: "Invitation accepted.",
  alreadyAccepted: "This invitation has already been used.",
  alreadyMember: "This person is already a member.",
  authRequired: "Sign in to continue.",
  created: "Invitation sent.",
  emailMismatch:
    "Sign out and use the invited email to accept this invitation.",
  expired: "This invitation expired. Ask for a new invitation.",
  invalidEmail: "Enter a valid email address.",
  invalidLink: "This invitation link is invalid.",
  invalidRole: "Choose a valid role.",
  organizationRequired: "Create an organization before inviting members.",
  organizationSelectionRequired:
    "Organization selection is required before inviting members.",
  permissionDenied: "You do not have access to perform this action.",
  resent: "Invitation resent.",
  revoked: "Invitation revoked.",
  revokedLink: "This invitation is no longer valid.",
  roleNotAllowed: "You do not have access to assign that role.",
  sendFailed: "Invitation could not be sent. Try again.",
  unknown: "Something went wrong. Try again.",
} as const;

type RpcError = {
  code?: string;
  message?: string;
};

export function mapInvitationRpcError(error: RpcError): InvitationActionResult {
  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("already member")) {
    return {
      ok: false,
      code: "INVITATION_ALREADY_MEMBER",
      message: INVITATION_MESSAGES.alreadyMember,
    };
  }

  if (message.includes("already accepted")) {
    return {
      ok: false,
      code: "INVITATION_ALREADY_ACCEPTED",
      message: INVITATION_MESSAGES.alreadyAccepted,
    };
  }

  if (message.includes("email mismatch")) {
    return {
      ok: false,
      code: "INVITATION_EMAIL_MISMATCH",
      message: INVITATION_MESSAGES.emailMismatch,
    };
  }

  if (message.includes("expired")) {
    return {
      ok: false,
      code: "INVITATION_EXPIRED",
      message: INVITATION_MESSAGES.expired,
    };
  }

  if (message.includes("revoked")) {
    return {
      ok: false,
      code: "INVITATION_REVOKED",
      message: INVITATION_MESSAGES.revokedLink,
    };
  }

  if (message.includes("not found") || message.includes("not active")) {
    return {
      ok: false,
      code: "INVITATION_NOT_FOUND",
      message: INVITATION_MESSAGES.invalidLink,
    };
  }

  if (message.includes("role not allowed")) {
    return {
      ok: false,
      code: "INVITATION_ROLE_NOT_ALLOWED",
      message: INVITATION_MESSAGES.roleNotAllowed,
    };
  }

  if (error.code === "42501") {
    return {
      ok: false,
      code: "INVITATION_PERMISSION_DENIED",
      message: INVITATION_MESSAGES.permissionDenied,
    };
  }

  if (error.code === "23514" || error.code === "22001") {
    return {
      ok: false,
      code: "INVITATION_INVALID_ROLE",
      message: INVITATION_MESSAGES.invalidRole,
    };
  }

  return {
    ok: false,
    code: "INVITATION_UNKNOWN",
    message: INVITATION_MESSAGES.unknown,
  };
}
