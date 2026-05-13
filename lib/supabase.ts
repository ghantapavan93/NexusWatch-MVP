import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseStatus() {
  const enabled = isSupabaseConfigured();

  return {
    enabled,
    mode: enabled ? "supabase" : "local_demo_data",
    message: enabled
      ? "Supabase is configured. The app can read persisted demo data with local fallback."
      : "Supabase is not configured. The app is using local demo data.",
  } as const;
}
