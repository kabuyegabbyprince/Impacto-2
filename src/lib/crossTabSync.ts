// Cross-tab and Realtime Synchronization Service
import { QueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "./supabase";

const CHANNEL_NAME = "impacto_crosstab_sync_v1";

export type CrossTabEvent = {
  type: "MUTATION" | "STORAGE";
  key?: string;
  orgId?: string;
  timestamp: number;
};

let broadcastChannel: BroadcastChannel | null = null;
if (typeof BroadcastChannel !== "undefined") {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch (e) {
    console.warn("BroadcastChannel not supported in this browser environment:", e);
  }
}

/**
 * Broadcasts a change signal to all other open tabs on the same origin.
 */
export function notifyCrossTabChange(key?: string, orgId?: string) {
  const payload: CrossTabEvent = {
    type: "MUTATION",
    key,
    orgId,
    timestamp: Date.now(),
  };

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {
      // Ignore broadcast channel post errors
    }
  }
}

/**
 * Initializes cross-tab event listeners and optional Supabase Realtime subscriptions.
 * Whenever another tab updates data or Supabase pushes a change, React Query invalidates queries.
 */
export function initCrossTabSync(queryClient: QueryClient) {
  const invalidateAllData = () => {
    queryClient.invalidateQueries();
  };

  // 1. BroadcastChannel Listener (Instant messaging between tabs)
  const handleBcMessage = (event: MessageEvent<CrossTabEvent>) => {
    if (event.data && (event.data.type === "MUTATION" || event.data.type === "STORAGE")) {
      invalidateAllData();
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener("message", handleBcMessage);
  }

  // 2. Native Storage Event Listener (triggers in background tabs when localStorage changes)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key && (e.key.startsWith("impacto_") || e.key.startsWith("sb-"))) {
      invalidateAllData();
    }
  };

  window.addEventListener("storage", handleStorageChange);

  // 3. Supabase Realtime Subscriptions (if Supabase is configured)
  let supabaseChannel: ReturnType<typeof supabase.channel> | null = null;
  if (isSupabaseConfigured && supabase) {
    try {
      const channelName = `db_changes_sync_${Math.random().toString(36).substring(2, 9)}`;
      supabaseChannel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public" },
          () => {
            invalidateAllData();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase Realtime subscription error:", err);
    }
  }

  // Return cleanup function
  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener("message", handleBcMessage);
    }
    window.removeEventListener("storage", handleStorageChange);
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}
