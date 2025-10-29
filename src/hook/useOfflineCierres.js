// src/hooks/useOfflineCierres.js
import { useState, useEffect } from "react";
import IndexedDBService from "../services/IndexedDBService";
import SyncService from "../services/SyncService";

export const useOfflineCierres = () => {
  const [cierres, setCierres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadCierres();

    // Suscribirse a eventos de sincronización
    const unsubscribe = SyncService.addSyncListener((event) => {
      if (event === "sync_complete") {
        console.log("🔄 Sincronización completada - Recargando cierres...");
        loadCierres();
      }
    });

    return unsubscribe;
  }, []);

  const loadCierres = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📥 Cargando cierres desde IndexedDB...");

      // Cargar desde IndexedDB
      const cierresData = await IndexedDBService.getAll("cierres");

      if (cierresData && cierresData.length > 0) {
        console.log(
          `✅ ${cierresData.length} cierres cargados desde IndexedDB`
        );
        setCierres(cierresData);
        setLastUpdate(new Date());
      } else {
        console.log("📭 No hay cierres almacenados localmente");
        setCierres([]);
        setLastUpdate(null);
      }
    } catch (err) {
      console.error("❌ Error cargando cierres desde IndexedDB:", err);
      setError("No se pudieron cargar los cierres almacenados localmente");
      setCierres([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshCierres = async () => {
    if (navigator.onLine) {
      console.log("🔄 Forzando sincronización de cierres...");
      await SyncService.syncMasterData();
    }
    await loadCierres();
  };

  return {
    cierres,
    loading,
    error,
    lastUpdate,
    refreshCierres,
  };
};
