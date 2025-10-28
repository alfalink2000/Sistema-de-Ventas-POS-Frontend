// src/hook/useOfflineSales.js
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import SyncService from "../services/SyncService";
import IndexedDBService from "../services/IndexedDBService";

export const useOfflineSales = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({});
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Suscribirse a eventos de sincronización
    const unsubscribe = SyncService.addSyncListener((event, data) => {
      console.log("🔄 Evento de sincronización:", event, data);

      if (event === "sync_complete") {
        // Recargar datos si es necesario
        loadSyncStatus();
      }
    });

    // Cargar estado inicial
    loadSyncStatus();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, []);

  const loadSyncStatus = async () => {
    const status = await SyncService.getSyncStatus();
    setSyncStatus(status);
  };

  const createSale = async (saleData) => {
    // Generar ID local único
    const id_local = `local_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const saleWithLocalId = {
      ...saleData,
      id_local,
      sincronizado: false,
      es_local: true,
      fecha_creacion: new Date().toISOString(),
    };

    try {
      if (isOnline) {
        // Intentar enviar directamente al servidor
        const response = await fetchConToken("ventas", saleData, "POST");

        if (response.ok && response.venta) {
          console.log("✅ Venta enviada directamente al servidor");
          return { success: true, id: response.venta.id, es_local: false };
        }
      }

      // Guardar localmente (tanto si falló el envío como si está offline)
      await IndexedDBService.add("ventas_pendientes", saleWithLocalId);

      // Guardar detalles de venta
      if (saleData.productos && saleData.productos.length > 0) {
        for (const producto of saleData.productos) {
          await IndexedDBService.add("detalles_venta_pendientes", {
            venta_id_local: id_local,
            producto_id: producto.producto_id,
            cantidad: producto.cantidad,
            precio_unitario: producto.precio_unitario,
            subtotal: producto.subtotal,
            sincronizado: false,
          });
        }
      }

      console.log("💾 Venta guardada localmente:", id_local);

      // Actualizar estado de sincronización
      await loadSyncStatus();

      return { success: true, id: id_local, es_local: true };
    } catch (error) {
      console.error("❌ Error al crear venta:", error);
      return { success: false, error: error.message };
    }
  };

  const getPendingSales = async () => {
    return await IndexedDBService.getAll("ventas_pendientes");
  };

  const forceSync = async () => {
    return await SyncService.forceSync();
  };

  return {
    isOnline,
    syncStatus,
    createSale,
    getPendingSales,
    forceSync,
    loadSyncStatus,
  };
};
