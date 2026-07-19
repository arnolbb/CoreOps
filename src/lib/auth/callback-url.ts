import { getAppUrl } from "@/lib/supabase/env";
import { getSafeRedirectPath } from "./safe-redirect";

export type AuthCallbackFlow = "confirmation" | "recovery";

export function buildAuthCallbackUrl(flow: AuthCallbackFlow, nextPath: string) {
  const url = new URL("/auth/callback", getAppUrl());
  url.searchParams.set("flow", flow);
  url.searchParams.set("next", getSafeRedirectPath(nextPath));

  return url.toString();
}
