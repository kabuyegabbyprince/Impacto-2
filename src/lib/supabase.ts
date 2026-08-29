import { createClient } from "@supabase/supabase-js";

const getEnv = (key: string) => {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  // Vite replaces import.meta.env at build time for the client
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
  } catch (e) {
    // ignore
  }
  return undefined;
};

const getRuntimeEnv = () => {
  const win = typeof window !== "undefined" ? (window as any) : {};
  return win.__RUNTIME_ENV__ || {};
};

const runtimeEnv = getRuntimeEnv();

const supabaseUrl =
  runtimeEnv.VITE_SUPABASE_URL ||
  getEnv("VITE_SUPABASE_URL") ||
  "";
const supabaseAnonKey =
  runtimeEnv.VITE_SUPABASE_ANON_KEY ||
  getEnv("VITE_SUPABASE_ANON_KEY") ||
  "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

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
