import { z } from "zod";
import { invitationAssignableRoles } from "../types/invitation";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(320, "Email address is too long.")
  .transform((value) => value.toLowerCase());

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(invitationAssignableRoles, {
    error: "Choose a valid role.",
  }),
});

export const revokeInvitationSchema = z.object({
  invitationId: z.string().uuid("Choose a valid invitation."),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type RevokeInvitationInput = z.infer<typeof revokeInvitationSchema>;
