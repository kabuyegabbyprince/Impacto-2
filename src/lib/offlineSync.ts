import { supabase } from "./supabase";

export interface QueuedMutation {
  id: string;
  type: 'supabase' | 'api';
  tableOrEndpoint: string;
  action: 'insert' | 'update' | 'delete' | 'post';
  payload: any;
  createdAt: number;
}

const QUEUE_KEY = 'impacto_offline_mutation_queue';

export function getOfflineQueue(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineMutation(mutation: Omit<QueuedMutation, 'id' | 'createdAt'>): QueuedMutation {
  const queue = getOfflineQueue();
  const newItem: QueuedMutation = {
    ...mutation,
    id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    createdAt: Date.now(),
  };
  queue.push(newItem);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn("[OfflineSync] Failed to save to offline queue storage:", err);
  }
  
  // Dispatch custom event to update UI indicators
  window.dispatchEvent(new CustomEvent('impacto-offline-queue-updated', { detail: { count: queue.length } }));
  return newItem;
}

export function removeOfflineMutation(id: string) {
  const queue = getOfflineQueue();
  const filtered = queue.filter(item => item.id !== id);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn("[OfflineSync] Failed to update offline queue storage:", err);
  }
  window.dispatchEvent(new CustomEvent('impacto-offline-queue-updated', { detail: { count: filtered.length } }));
}

export async function processOfflineQueue(queryClient?: any): Promise<number> {
  if (!navigator.onLine) return getOfflineQueue().length;
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  console.log(`[OfflineSync] Processing ${queue.length} offline mutations against online backend...`);
  let syncedCount = 0;

  for (const item of queue) {
    try {
      let success = false;
      if (item.type === 'supabase') {
        const { tableOrEndpoint, action, payload } = item;
        let res;
        if (action === 'insert') {
          res = await supabase.from(tableOrEndpoint).insert(payload);
        } else if (action === 'update') {
          res = await supabase.from(tableOrEndpoint).update(payload.data).match(payload.match);
        } else if (action === 'delete') {
          res = await supabase.from(tableOrEndpoint).delete().match(payload.match);
        }
        if (!res || !res.error) {
          success = true;
        } else {
          console.warn("[OfflineSync] Supabase sync item error:", res.error);
        }
      } else if (item.type === 'api') {
        const response = await fetch(item.tableOrEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });
        if (response.ok) {
          success = true;
        }
      }

      if (success) {
        removeOfflineMutation(item.id);
        syncedCount++;
      }
    } catch (err) {
      console.warn('[OfflineSync] Error syncing item, will retry later:', err);
    }
  }

  if (syncedCount > 0 && queryClient) {
    queryClient.invalidateQueries();
  }

  return getOfflineQueue().length;
}
