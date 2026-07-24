export const invitationAssignableRoles = ["admin", "staff"] as const;

export type InvitationAssignableRole =
  (typeof invitationAssignableRoles)[number];

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type TeamMember = {
  membershipId: string;
  userId: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string;
};

export type OrganizationInvitation = {
  id: string;
  email: string;
  role: InvitationAssignableRole;
  status: InvitationStatus;
  expiresAt: string;
  invitedBy: string;
  lastSentAt: string;
};

export type InvitationPreview = {
  status: InvitationStatus;
  organizationName: string;
  email: string;
  role: InvitationAssignableRole;
  expiresAt: string;
};

export type InvitationActionResult =
  | {
      ok: true;
      code:
        | "INVITATION_CREATED"
        | "INVITATION_RESENT"
        | "INVITATION_REVOKED"
        | "INVITATION_ACCEPTED";
      message: string;
    }
  | {
      ok: false;
      code:
        | "INVITATION_AUTH_REQUIRED"
        | "INVITATION_ORGANIZATION_REQUIRED"
        | "INVITATION_ORGANIZATION_SELECTION_REQUIRED"
        | "INVITATION_PERMISSION_DENIED"
        | "INVITATION_INVALID_EMAIL"
        | "INVITATION_INVALID_ROLE"
        | "INVITATION_ROLE_NOT_ALLOWED"
        | "INVITATION_ALREADY_MEMBER"
        | "INVITATION_SEND_FAILED"
        | "INVITATION_NOT_FOUND"
        | "INVITATION_TOKEN_MISSING"
        | "INVITATION_TOKEN_INVALID"
        | "INVITATION_EXPIRED"
        | "INVITATION_REVOKED"
        | "INVITATION_ALREADY_ACCEPTED"
        | "INVITATION_EMAIL_MISMATCH"
        | "INVITATION_UNKNOWN";
      message: string;
    };
