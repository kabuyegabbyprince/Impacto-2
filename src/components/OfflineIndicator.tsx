import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw, CloudCheck } from "lucide-react";
import { getOfflineQueue, processOfflineQueue } from "../lib/offlineSync";
import { useQueryClient } from "@tanstack/react-query";

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [queueCount, setQueueCount] = useState<number>(getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      try {
        await processOfflineQueue(queryClient);
      } finally {
        setIsSyncing(false);
        setQueueCount(getOfflineQueue().length);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueUpdate = (e: any) => {
      if (e?.detail?.count !== undefined) {
        setQueueCount(e.detail.count);
      } else {
        setQueueCount(getOfflineQueue().length);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("impacto-offline-queue-updated", handleQueueUpdate);

    // Initial check on mount
    if (navigator.onLine && queueCount > 0) {
      handleOnline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("impacto-offline-queue-updated", handleQueueUpdate);
    };
  }, [queryClient, queueCount]);

  const handleManualSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await processOfflineQueue(queryClient);
      setQueueCount(getOfflineQueue().length);
    } finally {
      setIsSyncing(false);
    }
  };

  // If online and no queued items, we can hide or show a subtle badge, or only show when offline / syncing / pending items
  if (isOnline && queueCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-xl text-xs font-semibold backdrop-blur-md transition-all animate-bounce-once border bg-slate-900/90 text-white border-slate-700">
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Offline Mode</span>
          {queueCount > 0 && (
            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
              {queueCount} pending change{queueCount > 1 ? "s" : ""}
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
          <span>Syncing offline changes...</span>
        </>
      ) : queueCount > 0 ? (
        <>
          <CloudCheck className="w-4 h-4 text-emerald-400" />
          <span>{queueCount} change{queueCount > 1 ? "s" : ""} waiting to sync</span>
          <button
            onClick={handleManualSync}
            className="ml-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-[10px] transition-colors"
          >
            Sync Now
          </button>
        </>
      ) : null}
    </div>
  );
};
