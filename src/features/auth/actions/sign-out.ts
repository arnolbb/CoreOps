"use server";

import { redirect } from "next/navigation";
import { clearPasswordRecoveryCookie } from "@/lib/auth/recovery-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  await clearPasswordRecoveryCookie();

  redirect("/sign-in");
}
