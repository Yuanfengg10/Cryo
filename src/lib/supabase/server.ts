import { createClient } from "@supabase/supabase-js";

import { getSupabaseKey } from "@/lib/env";

export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseKey();

  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
