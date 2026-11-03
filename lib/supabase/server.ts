// The Supabase client for server code. Module 2 only ever reads, and has no
// login, so one plain client is all it needs. Returns null when Supabase isn't
// set up, so callers can say "I can't check that right now" instead of crashing.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/lib/supabase/config";

export { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * A Supabase client for server code that runs outside a request (a tool, a
 * Server Action). Returns null if Supabase isn't set up.
 * Example: const supabase = createStatelessClient(); if (!supabase) return null;
 */
export function createStatelessClient() {
  const config = supabaseConfig();
  return config
    ? createSupabaseClient(config.url, config.key, {
        auth: { persistSession: false },
      })
    : null;
}
