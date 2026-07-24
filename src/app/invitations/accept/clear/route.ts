import { NextResponse, type NextRequest } from "next/server";
import { INVITATION_TOKEN_COOKIE } from "@/features/organizations/services/invitation-tokens";

const allowedStates = new Set(["invalid", "expired", "revoked", "accepted"]);

export function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") ?? "invalid";
  const safeState = allowedStates.has(state) ? state : "invalid";
  const response = NextResponse.redirect(
    new URL(`/invitations/accept?state=${safeState}`, request.url),
  );

  response.cookies.delete(INVITATION_TOKEN_COOKIE);

  return response;
}

export const dynamic = "force-dynamic";
