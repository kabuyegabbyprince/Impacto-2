// Cross-tab and Realtime Synchronization Service
import { QueryClient } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "./supabase";

const CHANNEL_NAME = "impacto_crosstab_sync_v1";

export type CrossTabEvent = {
  type: "MUTATION" | "STORAGE" | "ORG_PLAN_GRANTED";
  key?: string;
  orgId?: string;
  tier?: string;
  packageId?: string;
  packageName?: string;
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
 * Broadcasts an instant plan or package grant to hot-reload the user's dashboard in real-time.
 */
export function notifyPlanOrPackageGranted(
  orgId: string,
  details: { tier?: string; packageId?: string; packageName?: string }
) {
  const payload: CrossTabEvent = {
    type: "ORG_PLAN_GRANTED",
    orgId,
    tier: details.tier,
    packageId: details.packageId,
    packageName: details.packageName,
    timestamp: Date.now(),
  };

  // Broadcast to other tabs
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {}
  }

  // Trigger native storage event across windows
  try {
    localStorage.setItem(
      `impacto_last_org_grant_${orgId}`,
      JSON.stringify({ ...details, time: Date.now() })
    );
  } catch (e) {}

  // Dispatch local in-window event
  try {
    window.dispatchEvent(
      new CustomEvent("impacto_org_updated", {
        detail: {
          orgId,
          tier: details.tier,
          packageId: details.packageId,
          packageName: details.packageName,
        },
      })
    );
  } catch (e) {}
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
    if (!event.data) return;
    if (event.data.type === "ORG_PLAN_GRANTED") {
      try {
        window.dispatchEvent(
          new CustomEvent("impacto_org_updated", {
            detail: {
              orgId: event.data.orgId,
              tier: event.data.tier,
              packageId: event.data.packageId,
              packageName: event.data.packageName,
            },
          })
        );
        window.dispatchEvent(
          new CustomEvent("impacto_plan_granted_alert", {
            detail: event.data,
          })
        );
      } catch (e) {}
      invalidateAllData();
      return;
    }

    if (event.data.type === "MUTATION" || event.data.type === "STORAGE") {
      invalidateAllData();
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener("message", handleBcMessage);
  }

  // 2. Native Storage Event Listener (triggers in background tabs when localStorage changes)
  const handleStorageChange = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key.startsWith("impacto_last_org_grant_")) {
      const orgId = e.key.replace("impacto_last_org_grant_", "");
      try {
        const parsed = e.newValue ? JSON.parse(e.newValue) : null;
        window.dispatchEvent(
          new CustomEvent("impacto_org_updated", {
            detail: {
              orgId,
              tier: parsed?.tier,
              packageId: parsed?.packageId,
              packageName: parsed?.packageName,
            },
          })
        );
        window.dispatchEvent(
          new CustomEvent("impacto_plan_granted_alert", {
            detail: { orgId, ...parsed },
          })
        );
      } catch (err) {}
      invalidateAllData();
      return;
    }

    if (e.key.startsWith("impacto_org_packages_")) {
      const orgId = e.key.replace("impacto_org_packages_", "");
      window.dispatchEvent(
        new CustomEvent("impacto_org_updated", {
          detail: { orgId },
        })
      );
      invalidateAllData();
      return;
    }

    if (e.key.startsWith("impacto_") || e.key.startsWith("sb-")) {
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
