import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Wifi, WifiOff, RefreshCw, Layers, CheckCircle2, AlertCircle, Trash2, ArrowUpRight } from "lucide-react";
import { OfflineSyncService } from "../lib/offlineSyncService";
import { OfflineSyncQueueItem } from "../types";

export const OfflineSyncIndicator: React.FC = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(OfflineSyncService.isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [queueItems, setQueueItems] = useState<OfflineSyncQueueItem[]>([]);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  useEffect(() => {
    const unsubscribe = OfflineSyncService.subscribe((online, count) => {
      setIsOnline(online);
      setPendingCount(count);
      setQueueItems(OfflineSyncService.getQueue());
    });
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await OfflineSyncService.processQueue();
      setSyncResult(res);
    } finally {
      setIsSyncing(false);
      setQueueItems(OfflineSyncService.getQueue());
    }
  };

  const handleClearQueue = () => {
    if (window.confirm("Are you sure you want to clear the local offline queue? Unsynced changes will be lost.")) {
      OfflineSyncService.clearQueue();
      setQueueItems([]);
      setSyncResult(null);
    }
  };

  return (
    <>
      {/* Top / Nav Bar Indicator */}
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
          !isOnline
            ? "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 animate-pulse"
            : pendingCount > 0
            ? "bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700"
            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
        }`}
        title={!isOnline ? "Working Offline" : `${pendingCount} offline items queued`}
      >
        {!isOnline ? (
          <>
            <WifiOff className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300 shrink-0" />
            <span>{t("offline.offline_banner")} {pendingCount > 0 && `(${pendingCount})`}</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
            <span>{t("offline.syncing", { count: pendingCount })}</span>
          </>
        ) : (
          <>
            <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{t("offline.synced")}</span>
          </>
        )}
      </button>

      {/* Queue Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-200 dark:border-gray-800 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${!isOnline ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700" : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700"}`}>
                  {!isOnline ? <WifiOff className="h-5 w-5" /> : <Wifi className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">PWA Field Offline Sync Queue</h3>
                  <p className="text-xs text-gray-500">
                    {!isOnline ? "No internet connection. Actions are safely stored locally." : "Connected. Offline field data auto-synchronizes."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="py-4 flex-1 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                <div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">Queue Storage Status</span>
                  <span className="text-xs text-gray-500">
                    {queueItems.length} record{queueItems.length === 1 ? "" : "s"} in local buffer
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {queueItems.length > 0 && (
                    <button
                      onClick={handleClearQueue}
                      className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg flex items-center gap-1 font-medium transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Clear
                    </button>
                  )}
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing || !isOnline || queueItems.length === 0}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    {t("offline.retry_sync")}
                  </button>
                </div>
              </div>

              {syncResult && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span>{t("offline.synced")} ({syncResult.synced})</span>
                  {syncResult.failed > 0 && <span className="text-rose-600 font-semibold">{syncResult.failed}</span>}
                </div>
              )}

              {queueItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500 opacity-80" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("offline.synced")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {queueItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 uppercase">
                            {item.operation}
                          </span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {item.entity.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-500 text-[11px] truncate font-mono">
                          {JSON.stringify(item.payload).substring(0, 75)}...
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          item.status === "synced"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === "syncing"
                            ? "bg-blue-100 text-blue-800"
                            : item.status === "failed"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl transition"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
