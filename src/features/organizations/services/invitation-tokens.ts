import { createHash, randomBytes } from "node:crypto";
import { invitationRawTokenSchema } from "../schemas/invitation-token-schema";

export const INVITATION_TOKEN_COOKIE = "coreops_invitation_token";
export const INVITATION_TOKEN_COOKIE_MAX_AGE_SECONDS = 30 * 60;
export const INVITATION_EXPIRY_DAYS = 7;

export function generateInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(rawToken: string) {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function parseInvitationToken(rawToken: string | undefined | null) {
  const parsed = invitationRawTokenSchema.safeParse(rawToken ?? "");

  return parsed.success ? parsed.data : null;
}

export function getInvitationExpiryDate(now = new Date()) {
  return new Date(now.getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}
