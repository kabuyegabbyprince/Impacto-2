import { createClient } from "@supabase/supabase-js";
import { APP_CONFIG } from "../config";

const supabaseUrl = APP_CONFIG.supabase.url;
const supabaseAnonKey = APP_CONFIG.supabase.anonKey;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("placeholder"));

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase credentials are not configured in your environment variables. " +
    "The application will run in interactive local offline/demo mode."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder-project-id.supabase.co",
  supabaseAnonKey || "placeholder-anon-key-placeholder-anon-key-placeholder-anon-key",
  {
    auth: {
      persistSession: false, // Prevents persistent session tokens across reloads
      autoRefreshToken: false, // Prevents uncaught background network rejections on invalid/mock tokens
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (url, options) => {
        try {
          return await fetch(url, options);
        } catch (err: any) {
          console.warn("[Supabase Client] Network fetch error:", err?.message || err);
          return new Response(
            JSON.stringify({ error: err?.message || "Failed to fetch", data: null }),
            {
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  }
);

