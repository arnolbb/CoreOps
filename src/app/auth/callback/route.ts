import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/recovery-session";
import { getSafeRedirectPath } from "@/lib/auth/safe-redirect";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database-generated";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function buildRedirectResponse(
  request: NextRequest,
  path: string,
  cookiesToSet: CookieToSet[],
) {
  const response = NextResponse.redirect(new URL(path, request.url));

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const flow = request.nextUrl.searchParams.get("flow");
  const nextPath = getSafeRedirectPath(
    request.nextUrl.searchParams.get("next"),
    flow === "recovery" ? "/update-password" : "/dashboard",
  );
  const cookiesToSet: CookieToSet[] = [];

  if (!code) {
    return buildRedirectResponse(
      request,
      "/forgot-password?error=recovery-link-invalid",
      cookiesToSet,
    );
  }

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(newCookiesToSet) {
          cookiesToSet.push(...newCookiesToSet);
        },
      },
    },
  );
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return buildRedirectResponse(
      request,
      "/forgot-password?error=recovery-link-invalid",
      cookiesToSet,
    );
  }

  if (flow === "recovery") {
    const response = buildRedirectResponse(
      request,
      "/update-password",
      cookiesToSet,
    );

    response.cookies.set(PASSWORD_RECOVERY_COOKIE, "active", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS,
    });

    return response;
  }

  if (flow !== "confirmation") {
    return buildRedirectResponse(request, "/sign-in", cookiesToSet);
  }

  return buildRedirectResponse(request, nextPath, cookiesToSet);
}

export const dynamic = "force-dynamic";
