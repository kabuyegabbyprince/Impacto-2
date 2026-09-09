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
  supabaseAnonKey || "placeholder-anon-key-placeholder-anon-key-placeholder-anon-key"
);

