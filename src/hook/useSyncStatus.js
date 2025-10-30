// src/hooks/useSyncStatus.js
import { useState, useEffect } from "react";
import SyncService from "../services/SyncService";

export const useSyncStatus = () => {
  const [status, setStatus] = useState({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const updateStatus = async () => {
      const syncStatus = await SyncService.getSyncSummary();
      setStatus(syncStatus);
    };

    // Suscribirse a eventos de sincronización
    const unsubscribe = SyncService.addSyncListener((event, data) => {
      if (event === "sync_start") {
        setIsSyncing(true);
      } else if (event === "sync_complete" || event === "sync_error") {
        setIsSyncing(false);
        updateStatus();
      } else if (event === "online" || event === "offline") {
        setIsOnline(event === "online");
        updateStatus();
      }
    });

    // Actualizar estado inicial
    updateStatus();

    // Actualizar periódicamente
    const interval = setInterval(updateStatus, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const forceSync = async () => {
    await SyncService.forceSync();
  };

  return {
    status,
    isOnline,
    isSyncing,
    pendingCount: status.pending?.total || 0,
    lastSync: status.lastSync,
    forceSync,
    health: status.health,
  };
};
