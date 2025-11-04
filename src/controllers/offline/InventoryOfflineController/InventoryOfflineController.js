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

      const productoNombre =
        productoData.producto_nombre || productoData.nombre || productoId;
      const stockAnterior =
        productoData.stock_actual || productoData.stock || 0;

      const stockUpdate = {
        id_local: `stock_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        producto_id: productoId,
        stock_anterior: stockAnterior,
        stock_nuevo: parseInt(nuevoStock),
        timestamp: new Date().toISOString(),
        sincronizado: false,
        producto_nombre: productoNombre,
        descripcion: `Stock actualizado: ${productoNombre} (${stockAnterior} → ${nuevoStock})`,
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

  async getPendingStockUpdates() {
    try {
      console.log(
        "🔍 [INVENTORY] Buscando actualizaciones de stock pendientes..."
      );

      // ✅ USAR EL MÉTODO UNIFICADO DE IndexedDBService
      const pendingUpdates = await IndexedDBService.getPendingRecords(
        this.storeName
      );

      console.log(
        `📦 [INVENTORY] ${pendingUpdates.length} actualizaciones pendientes encontradas`
      );

      // ✅ FILTRADO ADICIONAL PARA STOCK ESPECÍFICAMENTE
      const validStockUpdates = pendingUpdates.filter((update) => {
        // Verificar que tenga los campos mínimos requeridos
        const hasRequiredFields =
          update.producto_id &&
          update.stock_nuevo !== undefined &&
          update.stock_anterior !== undefined;

        // Verificar que no sea una actualización duplicada muy reciente
        const isNotDuplicate = !this.isDuplicateUpdate(update, pendingUpdates);

        return hasRequiredFields && isNotDuplicate;
      });

      if (validStockUpdates.length !== pendingUpdates.length) {
        console.warn(
          `⚠️ [INVENTORY] Se filtraron ${
            pendingUpdates.length - validStockUpdates.length
          } actualizaciones inválidas`
        );
      }

      return validStockUpdates;
    } catch (error) {
      console.error(
        "❌ [INVENTORY] Error obteniendo actualizaciones pendientes:",
        error
      );
      return [];
    }
  }

  // ✅ NUEVO MÉTODO PARA DETECTAR DUPLICADOS
  isDuplicateUpdate(currentUpdate, allUpdates) {
    // Buscar actualizaciones duplicadas para el mismo producto en un corto período
    const duplicates = allUpdates.filter(
      (update) =>
        update.producto_id === currentUpdate.producto_id &&
        update.id_local !== currentUpdate.id_local &&
        Math.abs(
          new Date(update.timestamp) - new Date(currentUpdate.timestamp)
        ) < 5000 // 5 segundos
    );

    return duplicates.length > 0;
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

  // En InventoryOfflineController.js - ACTUALIZAR getPendingCount
  async getPendingCount() {
    try {
      const updates = await this.getPendingStockUpdates(); // ✅ Usa el método corregido
      return updates.length;
    } catch (error) {
      console.error("❌ [OFFLINE] Error obteniendo contador:", error);
      return 0;
    }
  }
  // ✅ MÉTODO TEMPORAL DE EMERGENCIA
  async emergencyGetPendingStock() {
    try {
      console.log("🚨 [EMERGENCY] Obteniendo stock pendiente de emergencia...");

      const allData = await IndexedDBService.getAll("stock_pendientes");
      console.log(`📊 [EMERGENCY] ${allData.length} registros totales`);

      const pending = allData.filter((item) => {
        // ✅ MÚLTIPLES VERIFICACIONES
        if (item.sincronizado === false) return true;
        if (item.sincronizado === undefined) return true;
        if (item.sincronizado === null) return true;
        if (!item.hasOwnProperty("sincronizado")) return true;
        return false;
      });

      console.log(`📦 [EMERGENCY] ${pending.length} pendientes encontrados`);

      // ✅ LOG DEL REGISTRO ESPECÍFICO
      const specificRecord = allData.find(
        (item) => item.id_local === "stock_1762044568354_35ol875iu"
      );
      if (specificRecord) {
        console.log("🎯 [EMERGENCY] Registro específico:", {
          id_local: specificRecord.id_local,
          sincronizado: specificRecord.sincronizado,
          tipo: typeof specificRecord.sincronizado,
        });
      }

      return pending;
    } catch (error) {
      console.error("❌ [EMERGENCY] Error crítico:", error);
      return [];
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
