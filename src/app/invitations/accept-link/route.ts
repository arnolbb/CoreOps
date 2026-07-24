import { NextResponse, type NextRequest } from "next/server";
import {
  INVITATION_TOKEN_COOKIE,
  INVITATION_TOKEN_COOKIE_MAX_AGE_SECONDS,
  parseInvitationToken,
} from "@/features/organizations/services/invitation-tokens";

export function GET(request: NextRequest) {
  const rawToken = parseInvitationToken(
    request.nextUrl.searchParams.get("token"),
  );
  const response = NextResponse.redirect(
    new URL(
      rawToken ? "/invitations/accept" : "/invitations/accept?state=invalid",
      request.url,
    ),
  );

  if (!rawToken) {
    response.cookies.delete(INVITATION_TOKEN_COOKIE);
    return response;
  }

  response.cookies.set(INVITATION_TOKEN_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: INVITATION_TOKEN_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

export const dynamic = "force-dynamic";
