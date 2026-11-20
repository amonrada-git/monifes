import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if ((!url || !key) && typeof window !== "undefined") {
  console.warn(
    "[monifes] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing — accounts are off, guest mode only",
  );
}

/**
 * The one browser client, or null when the keys aren't set — guest mode never
 * needs the backend, so a missing config must not take the whole app down.
 * The publishable key is safe to ship: Row Level Security in the database is
 * what keeps each person's data private. The session lives in localStorage.
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;
