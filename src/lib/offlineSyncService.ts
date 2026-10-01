import { MockDB } from "./mockData";
import { supabase, isSupabaseConfigured } from "./supabase";
import { OfflineSyncQueueItem } from "../types";

const QUEUE_KEY = "impacto_offline_sync_queue";
const SYNC_EVENT = "impacto_sync_status_changed";

export class OfflineSyncService {
  private static isSyncing = false;
  private static listeners: Array<(isOnline: boolean, pendingCount: number) => void> = [];

  static init() {
    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      this.notifyListeners();
      this.processQueue();
    });

    window.addEventListener("offline", () => {
      this.notifyListeners();
    });

    // Check for pending items on initial load
    if (navigator.onLine) {
      setTimeout(() => this.processQueue(), 2000);
    }
  }

  static isOnline(): boolean {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }

  static getQueue(): OfflineSyncQueueItem[] {
    try {
      const data = localStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveQueue(queue: OfflineSyncQueueItem[]): void {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      MockDB.saveOfflineSyncQueue(queue);
      this.notifyListeners();
    } catch (e) {
      console.error("Failed to save offline queue", e);
    }
  }

  static enqueue(operation: "CREATE" | "UPDATE" | "DELETE", entity: OfflineSyncQueueItem["entity"], payload: any): OfflineSyncQueueItem {
    const now = new Date().toISOString();
    const item: OfflineSyncQueueItem = {
      id: "sync-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      timestamp: now,
      updated_at: now,
      operation,
      entity,
      payload: {
        ...payload,
        updated_at: payload.updated_at || now
      },
      status: "pending",
      retry_count: 0
    };

    const current = this.getQueue();
    current.push(item);
    this.saveQueue(current);

    // If online, attempt instant sync in background
    if (this.isOnline()) {
      this.processQueue();
    }

    return item;
  }

  static async processQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing || !this.isOnline()) {
      return { synced: 0, failed: 0 };
    }

    const queue = this.getQueue();
    const pending = queue.filter(item => item.status === "pending" || item.status === "failed");
    if (pending.length === 0) return { synced: 0, failed: 0 };

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      item.status = "syncing";
      this.saveQueue(queue);

      try {
        await this.syncItemToServer(item);
        item.status = "synced";
        synced++;
      } catch (err: any) {
        console.warn(`Sync failed for item ${item.id}:`, err);
        item.status = "failed";
        item.retry_count = (item.retry_count || 0) + 1;
        item.error_message = err?.message || "Sync network error";
        failed++;
      }
    }

    // Retain only un-synced or recently failed items, pruning completed ones after a moment
    const remaining = queue.filter(item => item.status !== "synced");
    this.saveQueue(remaining);

    this.isSyncing = false;
    this.notifyListeners();
    return { synced, failed };
  }

  private static async syncItemToServer(item: OfflineSyncQueueItem): Promise<void> {
    const { operation, entity, payload } = item;

    if (!isSupabaseConfigured) {
      // In mock mode, the data is already stored locally via MockDB
      return;
    }

    // Map entity to table name
    const tableMap: Record<string, string> = {
      event_attendance: "event_attendance",
      assets: "assets",
      ledger_entries: "ledger_entries",
      documents: "documents",
      signatures: "document_signatures",
      member_fees: "member_fees",
      audit_logs: "audit_logs"
    };

    const tableName = tableMap[entity] || entity;

    if (operation === "CREATE") {
      const { error } = await supabase.from(tableName).upsert(payload);
      if (error) throw error;
    } else if (operation === "UPDATE") {
      const { id, ...updates } = payload;
      const { error } = await supabase.from(tableName).update(updates).eq("id", id);
      if (error) throw error;
    } else if (operation === "DELETE") {
      const { error } = await supabase.from(tableName).delete().eq("id", payload.id);
      if (error) throw error;
    }
  }

  static clearQueue(): void {
    localStorage.removeItem(QUEUE_KEY);
    MockDB.saveOfflineSyncQueue([]);
    this.notifyListeners();
  }

  static subscribe(listener: (isOnline: boolean, pendingCount: number) => void): () => void {
    this.listeners.push(listener);
    listener(this.isOnline(), this.getQueue().filter(i => i.status !== "synced").length);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notifyListeners(): void {
    const isOnline = this.isOnline();
    const pendingCount = this.getQueue().filter(i => i.status !== "synced").length;
    this.listeners.forEach(l => l(isOnline, pendingCount));

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, {
        detail: { isOnline, pendingCount }
      }));
    }
  }
}

// Global initialization
if (typeof window !== "undefined") {
  OfflineSyncService.init();
}
