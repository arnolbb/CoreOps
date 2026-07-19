import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  email?: string;
};

type Claims = {
  sub?: string;
  email?: string;
};

type ClaimsResult =
  | {
      data: { claims: Claims };
      error: null;
    }
  | {
      data: null;
      error: unknown;
    }
  | {
      data: null;
      error: null;
    };

export type ClaimsClient = {
  auth: {
    getClaims: () => Promise<ClaimsResult>;
  };
};

export async function getAuthenticatedUserFromClient(
  client: ClaimsClient,
): Promise<AuthenticatedUser | null> {
  const { data, error } = await client.auth.getClaims();

  if (error || !data?.claims.sub) {
    return null;
  }

  return {
    id: data.claims.sub,
    email: data.claims.email,
  };
}

export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  return getAuthenticatedUserFromClient(supabase);
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}
