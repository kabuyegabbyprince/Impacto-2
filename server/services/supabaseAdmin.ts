import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function cleanValue(val: string | undefined): string | undefined {
  if (!val) return val;
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).trim();
  } else if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

const DEFAULT_SUPABASE_URL = "https://jyluwvwghtirdmazhhym.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bHV3dndnaHRpcmRtYXpoaHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjM5MjYsImV4cCI6MjA5NTAzOTkyNn0.KcV_8RXSnoNVObFqgeLm-9r3fBbRf7FSEM6woVjhG3Q";

export function getSupabaseUrl(): string | undefined {
  return cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAnonKey(): string | undefined {
  return cleanValue(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;
}

export function hasSupabaseCredentials(): boolean {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  const anonKey = getSupabaseAnonKey();
  return Boolean(url && (serviceKey || anonKey) && !url.startsWith("placeholder"));
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const anonKey = getSupabaseAnonKey();

  if (!url || (!serviceRoleKey && !anonKey) || url.startsWith("placeholder")) {
    return null;
  }

  // Prefer service role key for admin privileges, fallback to anon key
  const key = (serviceRoleKey && !serviceRoleKey.startsWith("placeholder")) ? serviceRoleKey : anonKey!;
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function getSupabaseAnonClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey || url.startsWith("placeholder")) {
    return null;
  }

  return createClient(url, anonKey);
}

/**
 * Merges duplicate user records with the same email in public.users to maintain referential integrity.
 */
export async function consolidateUserRecords(client: any, email: string): Promise<void> {
  if (!email || !client) return;
  try {
    const { data: userRecords } = await client
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase());

    if (userRecords && userRecords.length > 1) {
      const primary = userRecords.find((u: any) => u.auth_user_id) || userRecords[0];
      for (let i = 0; i < userRecords.length; i++) {
        const u = userRecords[i];
        if (u.id !== primary.id) {
          await client.from("org_members").update({ user_id: primary.id }).eq("user_id", u.id);
          await client.from("member_fees").update({ member_id: primary.id }).eq("member_id", u.id);
          await client.from("goals").update({ user_id: primary.id }).eq("user_id", u.id);
          await client.from("ledger_entries").update({ user_id: primary.id }).eq("user_id", u.id);
          await client.from("users").delete().eq("id", u.id);
        }
      }
    }
  } catch (err) {
    console.warn("[ConsolidateUsers] Error:", err);
  }
}
