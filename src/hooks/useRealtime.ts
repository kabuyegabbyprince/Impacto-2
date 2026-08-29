import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useRealtimeSubscription<T>(
  table: string,
  filter: string,
  initialData: T[]
): T[] {
  const [data, setData] = useState<T[]>(initialData);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      const channelName = `realtime_${table}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: table, filter: filter },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setData((prev) => [...prev, payload.new as T]);
            } else if (payload.eventType === "UPDATE") {
              setData((prev) =>
                prev.map((item: any) =>
                  item.id === payload.new.id ? { ...item, ...payload.new } : item
                )
              );
            } else if (payload.eventType === "DELETE") {
              setData((prev) =>
                prev.filter((item: any) => item.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("[Realtime] useRealtimeSubscription notice:", err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, filter]);

  return data;
}
