import { z } from "zod";

export const invitationRawTokenSchema = z
  .string()
  .trim()
  .min(32, "This invitation link is invalid.")
  .max(256, "This invitation link is invalid.")
  .regex(/^[A-Za-z0-9_-]+$/, "This invitation link is invalid.");

export const invitationTokenHashSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/, "This invitation link is invalid.");

export type InvitationRawToken = z.infer<typeof invitationRawTokenSchema>;
export type InvitationTokenHash = z.infer<typeof invitationTokenHashSchema>;
