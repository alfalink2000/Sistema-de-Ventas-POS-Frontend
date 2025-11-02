// src/controllers/offline/InventoryOfflineController/InventoryOfflineController.js
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class InventoryOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "stock_pendientes";
  }

  // ✅ AGREGAR ACTUALIZACIÓN DE STOCK PENDIENTE
  async addPendingStockUpdate(productoId, nuevoStock, productoData = {}) {
    try {
      console.log(
        `📦 [OFFLINE] Agregando actualización pendiente: ${productoId} -> ${nuevoStock}`
      );

      const stockUpdate = {
        id_local: `stock_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        producto_id: productoId,
        stock_anterior: productoData.stock_actual || productoData.stock,
        stock_nuevo: parseInt(nuevoStock),
        timestamp: new Date().toISOString(),
        sincronizado: false,
        producto_nombre: productoData.producto_nombre || productoData.nombre,
        usuario_id: this.getCurrentUserId(),
        intentos: 0,
        ultimo_intento: null,
      };

      const success = await IndexedDBService.add(this.storeName, stockUpdate);

      if (success) {
        console.log(
          `✅ [OFFLINE] Actualización pendiente guardada: ${stockUpdate.id_local}`
        );
        this.notifyStockPendingUpdate();
        return stockUpdate.id_local;
      } else {
        throw new Error("No se pudo guardar la actualización pendiente");
      }
    } catch (error) {
      console.error(
        "❌ [OFFLINE] Error agregando actualización pendiente:",
        error
      );
      throw error;
    }
  }

  // ✅ OBTENER TODAS LAS ACTUALIZACIONES PENDIENTES
  async getPendingStockUpdates() {
    try {
      const updates = await IndexedDBService.safeGetAll(
        this.storeName,
        "sincronizado",
        false
      );

      console.log(
        `📦 [OFFLINE] ${updates.length} actualizaciones pendientes encontradas`
      );
      return updates;
    } catch (error) {
      console.error(
        "❌ [OFFLINE] Error obteniendo actualizaciones pendientes:",
        error
      );
      return [];
    }
  }

  // ✅ MARCAR ACTUALIZACIÓN COMO SINCRONIZADA
  async markAsSynced(updateId, serverData = {}) {
    try {
      const update = await IndexedDBService.get(this.storeName, updateId);
      if (!update) {
        console.warn(`⚠️ [OFFLINE] Actualización no encontrada: ${updateId}`);
        return false;
      }

      const updatedRecord = {
        ...update,
        ...serverData,
        sincronizado: true,
        fecha_sincronizacion: new Date().toISOString(),
        intentos: (update.intentos || 0) + 1,
      };

      const success = await IndexedDBService.put(this.storeName, updatedRecord);

      if (success) {
        console.log(
          `✅ [OFFLINE] Actualización marcada como sincronizada: ${updateId}`
        );
        this.notifyStockPendingUpdate();
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ [OFFLINE] Error marcando como sincronizada:`, error);
      return false;
    }
  }

  // ✅ NOTIFICAR CAMBIOS EN ACTUALIZACIONES PENDIENTES
  notifyStockPendingUpdate() {
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent("stockPendingUpdatesChanged"));
    }
  }

  // ✅ OBTENER USUARIO ACTUAL
  getCurrentUserId() {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || user.uid || "unknown";
      }
      return "unknown";
    } catch (error) {
      return "unknown";
    }
  }

  // ✅ OBTENER CONTADOR DE PENDIENTES
  async getPendingCount() {
    try {
      const updates = await this.getPendingStockUpdates();
      return updates.length;
    } catch (error) {
      console.error("❌ [OFFLINE] Error obteniendo contador:", error);
      return 0;
    }
  }

  // ✅ OBTENER INVENTARIO EN CACHE (PARA MODO OFFLINE)
  async getCachedInventory() {
    try {
      const productos = await IndexedDBService.getAll("productos");
      console.log(`📦 [OFFLINE] ${productos.length} productos en cache`);
      return productos;
    } catch (error) {
      console.error("❌ [OFFLINE] Error obteniendo inventario cache:", error);
      return [];
    }
  }
}

export default new InventoryOfflineController();
