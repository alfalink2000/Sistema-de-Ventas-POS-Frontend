// src/hooks/useSyncStatus.js - VERSIÓN COMPLETA CORREGIDA
import { useState, useEffect, useCallback } from "react";
import SyncService from "../services/SyncService";

export const useSyncStatus = () => {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingSessions: 0,
    pendingSales: 0,
    pendingClosures: 0,
    health: { healthy: false },
    lastSync: null,
    initialized: false,
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  // ✅ Función optimizada para actualizar estado
  const updateStatus = useCallback(async () => {
    try {
      const syncStatus = await SyncService.getSyncStatus();
      setStatus(syncStatus);
      setInitialized(syncStatus.initialized || false);
      setError(null);
    } catch (err) {
      console.error("❌ Error actualizando estado de sync:", err);
      setError(err.message);
      setStatus((prev) => ({
        ...prev,
        health: { healthy: false, issues: ["Error obteniendo estado"] },
        initialized: false,
      }));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // ✅ Función de inicialización segura
    const initialize = async () => {
      try {
        // Esperar un poco para que IndexedDB se inicialice
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (isMounted) {
          await updateStatus();
          console.log("✅ useSyncStatus inicializado correctamente");
        }
      } catch (err) {
        console.error("❌ Error inicializando useSyncStatus:", err);
        if (isMounted) {
          setError(err.message);
        }
      }
    };

    initialize();

    // ✅ Suscribirse a eventos de sincronización
    const unsubscribe = SyncService.addSyncListener((event, data) => {
      if (!isMounted) return;

      console.log(`🔄 useSyncStatus - Evento: ${event}`, data);

      switch (event) {
        case "sync_start":
          setIsSyncing(true);
          setStatus((prev) => ({ ...prev, isSyncing: true }));
          break;

        case "sync_complete":
        case "sync_error":
          setIsSyncing(false);
          setStatus((prev) => ({ ...prev, isSyncing: false }));
          // Actualizar estado después de sync
          setTimeout(updateStatus, 500);
          break;

        case "online":
          setIsOnline(true);
          setStatus((prev) => ({ ...prev, isOnline: true }));
          break;

        case "offline":
          setIsOnline(false);
          setStatus((prev) => ({ ...prev, isOnline: false }));
          break;

        case "initialized":
          setInitialized(true);
          setStatus((prev) => ({ ...prev, initialized: true }));
          break;

        case "sync_skipped":
          console.log("⏭️  Sincronización omitida:", data?.reason);
          break;

        default:
          break;
      }
    });

    // ✅ Event listeners para cambios de conexión
    const handleOnline = () => {
      setIsOnline(true);
      setStatus((prev) => ({ ...prev, isOnline: true }));
      console.log("🌐 useSyncStatus - Conexión restaurada");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus((prev) => ({ ...prev, isOnline: false }));
      console.log("📴 useSyncStatus - Sin conexión");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // ✅ Actualización periódica (cada 30 segundos)
    const interval = setInterval(() => {
      if (isMounted && initialized) {
        updateStatus();
      }
    }, 30000);

    // ✅ Cleanup
    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [updateStatus, initialized]);

  // ✅ Función para forzar sincronización
  const forceSync = useCallback(async () => {
    if (!initialized) {
      console.warn("⚠️ SyncService no inicializado, no se puede forzar sync");
      setError("SyncService no inicializado");
      return false;
    }

    if (isSyncing) {
      console.warn("⚠️ Sincronización ya en progreso");
      return false;
    }

    try {
      console.log("🔄 Forzando sincronización manual...");
      await SyncService.forceSync();
      return true;
    } catch (err) {
      console.error("❌ Error forzando sincronización:", err);
      setError(err.message);
      return false;
    }
  }, [initialized, isSyncing]);

  // ✅ Función para recargar estado
  const refreshStatus = useCallback(async () => {
    await updateStatus();
  }, [updateStatus]);

  // ✅ Calcular total pendiente
  const pendingCount =
    status.pendingSessions + status.pendingSales + status.pendingClosures;

  // ✅ Estado de salud simplificado
  const healthStatus = status.health?.healthy
    ? "healthy"
    : error
    ? "error"
    : "degraded";

  return {
    // Estado completo
    status,

    // Estados individuales
    isOnline,
    isSyncing,
    initialized,
    error,

    // Totales
    pendingCount,
    pendingSessions: status.pendingSessions,
    pendingSales: status.pendingSales,
    pendingClosures: status.pendingClosures,

    // Información adicional
    lastSync: status.lastSync,
    health: healthStatus,
    healthDetails: status.health,

    // Acciones
    forceSync,
    refreshStatus,

    // Utilidades
    hasPendingData: pendingCount > 0,
    canSync: initialized && isOnline && !isSyncing,
    isHealthy: healthStatus === "healthy",
  };
};

// ✅ Hook simplificado para componentes que solo necesitan estado básico
export const useSyncStatusBasic = () => {
  const { isOnline, isSyncing, pendingCount, initialized, forceSync } =
    useSyncStatus();

  return {
    isOnline,
    isSyncing,
    pendingCount,
    initialized,
    forceSync,
    showSyncButton: initialized && isOnline && !isSyncing && pendingCount > 0,
  };
};
