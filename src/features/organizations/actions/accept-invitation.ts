"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { acceptInvitation } from "../services/accept-invitation";
import { INVITATION_MESSAGES } from "../services/invitation-errors";
import {
  hashInvitationToken,
  INVITATION_TOKEN_COOKIE,
  parseInvitationToken,
} from "../services/invitation-tokens";

type AcceptInvitationActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  shouldClearToken?: boolean;
};

async function clearInvitationTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(INVITATION_TOKEN_COOKIE);
}

function shouldClearToken(code: string) {
  return (
    code === "INVITATION_NOT_FOUND" ||
    code === "INVITATION_TOKEN_MISSING" ||
    code === "INVITATION_TOKEN_INVALID" ||
    code === "INVITATION_EXPIRED" ||
    code === "INVITATION_REVOKED" ||
    code === "INVITATION_ALREADY_ACCEPTED"
  );
}

export async function acceptInvitationAction(
  previousState: AcceptInvitationActionState,
): Promise<AcceptInvitationActionState> {
  void previousState;
  await requireAuthenticatedUser();
  const cookieStore = await cookies();
  const rawToken = parseInvitationToken(
    cookieStore.get(INVITATION_TOKEN_COOKIE)?.value,
  );

  if (!rawToken) {
    await clearInvitationTokenCookie();
    return {
      status: "error",
      message: INVITATION_MESSAGES.invalidLink,
      shouldClearToken: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  const result = await acceptInvitation(
    supabase,
    hashInvitationToken(rawToken),
  );

  if (!result.ok) {
    if (shouldClearToken(result.code)) {
      await clearInvitationTokenCookie();
    }

    return {
      status: "error",
      message: result.message,
      shouldClearToken: shouldClearToken(result.code),
    };
  }

  await clearInvitationTokenCookie();
  redirect("/dashboard");
}
