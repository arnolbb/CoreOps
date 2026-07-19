import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database-generated";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
