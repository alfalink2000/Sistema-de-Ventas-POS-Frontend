// controllers/offline/SyncController/SyncController.js
import IndexedDBService from "../../../services/IndexedDBService";
import ProductsSyncController from "../ProductsSyncController/ProductsSyncController";
import CategoriesSyncController from "../CategoriesSyncController/CategoriesSyncController";
import UsersSyncController from "../UsersSyncController/UsersSyncController";
import SalesSyncController from "../SalesSyncController/SalesSyncController";
import SessionsSyncController from "../SessionsSyncController/SessionsSyncController";
import ClosuresSyncController from "../ClosuresSyncController/ClosuresSyncController";
import SyncQueueService from "../SyncQueueService/SyncQueueService";
import StockSyncController from "../StockSyncController/StockSyncController";
import PriceSyncController from "../PriceSyncController/PriceSyncController";
import ClosuresSyncController from "../ClosuresSyncController/ClosuresSyncController";

class SyncController {
  constructor() {
    this.isSyncing = false;
    this.syncQueue = new SyncQueueService();
    this.controllers = {
      products: new ProductsSyncController(),
      categories: new CategoriesSyncController(),
      users: new UsersSyncController(),
      sales: new SalesSyncController(),
      sessions: new SessionsSyncController(),
      closures: ClosuresSyncController,
      prices: PriceSyncController,
      stock: StockSyncController,
    };
  }

  // 🔄 SINCRONIZACIÓN AUTOMÁTICA GENERAL
  async autoSync() {
    if (this.isSyncing || !navigator.onLine) {
      console.log("🔄 Sincronización ya en progreso o sin conexión");
      return { success: false, reason: "already_syncing_or_offline" };
    }

    try {
      this.isSyncing = true;
      console.log("🚀 INICIANDO SINCRONIZACIÓN AUTOMÁTICA GENERAL");

      const results = {
        timestamp: new Date().toISOString(),
        overall: { success: true, errors: [] },
        details: {},
      };

      // ✅ 1. PRIMERO: Sincronizar datos maestros (solo lectura)
      console.log("📥 Sincronizando datos maestros...");
      const masterResults = await this.syncMasterData();
      results.details.masterData = masterResults;

      // ✅ 2. SEGUNDO: Sincronizar cambios pendientes
      console.log("📤 Sincronizando cambios pendientes...");
      const pendingResults = await this.syncAllPendingChanges();
      results.details.pendingChanges = pendingResults;

      // ✅ 3. ACTUALIZAR METADATOS
      await this.updateSyncMetadata(results);

      console.log("🎉 SINCRONIZACIÓN AUTOMÁTICA COMPLETADA", results);
      return results;
    } catch (error) {
      console.error("❌ Error en sincronización automática:", error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.isSyncing = false;
    }
  }

  // 📥 SINCRONIZAR DATOS MAESTROS
  async syncMasterData() {
    const results = {};

    try {
      // Sincronizar en paralelo los datos maestros
      const syncPromises = [
        this.controllers.products
          .syncFromServer()
          .then((r) => (results.products = r)),
        this.controllers.categories
          .syncFromServer()
          .then((r) => (results.categories = r)),
        this.controllers.users
          .syncFromServer()
          .then((r) => (results.users = r)),
      ];

      await Promise.allSettled(syncPromises);
      console.log("✅ Datos maestros sincronizados:", results);
    } catch (error) {
      console.error("❌ Error sincronizando datos maestros:", error);
      results.error = error.message;
    }

    return results;
  }

  // 📤 SINCRONIZAR TODOS LOS CAMBIOS PENDIENTES
  async syncAllPendingChanges() {
    const results = {};

    try {
      // ✅ USAR safeGetByIndex EN TODOS LOS CONTROLADORES
      const syncPromises = [
        this.controllers.products
          .syncPendingChanges()
          .then((r) => (results.products = r)),
        this.controllers.categories
          .syncPendingChanges()
          .then((r) => (results.categories = r)),
        this.controllers.users
          .syncPendingChanges()
          .then((r) => (results.users = r)),
        this.controllers.sales
          .syncPendingChanges()
          .then((r) => (results.sales = r)),
        this.controllers.sessions
          .syncPendingChanges()
          .then((r) => (results.sessions = r)),
        PriceSyncController.syncPendingPriceChanges().then(
          (r) => (results.prices = r)
        ),
        ClosuresSyncController.syncPendingClosures().then(
          (r) => (results.closures = r)
        ),
        this.controllers.closures
          .syncPendingChanges()
          .then((r) => (results.closures = r)),
        StockSyncController.syncPendingStockChanges().then(
          (r) => (results.stock = r)
        ),
      ];

      const settledResults = await Promise.allSettled(syncPromises);

      // ✅ MANEJAR RESULTADOS DE FORMA SEGURA
      settledResults.forEach((result, index) => {
        const keys = Object.keys(results);
        if (result.status === "rejected") {
          console.error(
            `❌ Sincronización falló para ${keys[index]}:`,
            result.reason
          );
          results[keys[index]] = {
            success: false,
            error: result.reason.message,
          };
        }
      });

      console.log("✅ Cambios pendientes sincronizados:", results);
    } catch (error) {
      console.error("❌ Error sincronizando cambios pendientes:", error);
      results.error = error.message;
    }

    return results;
  }

  async getTotalPendingCounts() {
    const counts = {};

    // ✅ USAR Promise.allSettled PARA EVITAR ERRORES EN CASCADA
    const countPromises = Object.entries(this.controllers).map(
      async ([key, controller]) => {
        try {
          counts[key] = await controller.getPendingCount();
        } catch (error) {
          console.warn(
            `⚠️ Error obteniendo conteo para ${key}:`,
            error.message
          );
          counts[key] = 0; // Valor por defecto en caso de error
        }
      }
    );

    await Promise.allSettled(countPromises);
    return counts;
  }

  // 💾 ACTUALIZAR METADATOS DE SINCRONIZACIÓN
  async updateSyncMetadata(results) {
    try {
      const metadata = {
        key: "last_full_sync",
        timestamp: new Date().toISOString(),
        results: results,
        success: results.overall.success,
        pendingCounts: await this.getTotalPendingCounts(),
      };

      await IndexedDBService.put("sync_metadata", metadata);
      console.log("💾 Metadatos de sincronización actualizados");
    } catch (error) {
      console.error("❌ Error actualizando metadatos:", error);
    }
  }

  // 🔢 OBTENER TOTAL DE PENDIENTES
  async getTotalPendingCounts() {
    const counts = {};

    for (const [key, controller] of Object.entries(this.controllers)) {
      try {
        counts[key] = await controller.getPendingCount();
      } catch (error) {
        counts[key] = { error: error.message };
      }
    }

    return counts;
  }

  // 🧹 LIMPIAR DATOS SINCRONIZADOS
  async cleanupSyncedData() {
    console.log("🧹 Limpiando datos ya sincronizados...");

    const results = {};

    for (const [key, controller] of Object.entries(this.controllers)) {
      try {
        results[key] = await controller.cleanupSynced();
      } catch (error) {
        results[key] = { error: error.message };
      }
    }

    console.log("✅ Limpieza completada:", results);
    return results;
  }

  // ⚡ SINCRONIZACIÓN RÁPIDA (solo cambios pendientes)
  async quickSync() {
    if (!navigator.onLine) {
      return { success: false, error: "Sin conexión" };
    }

    try {
      console.log("⚡ INICIANDO SINCRONIZACIÓN RÁPIDA");
      const results = await this.syncAllPendingChanges();

      await this.updateSyncMetadata({
        timestamp: new Date().toISOString(),
        overall: { success: true },
        details: { quickSync: results },
      });

      return { success: true, results };
    } catch (error) {
      console.error("❌ Error en sincronización rápida:", error);
      return { success: false, error: error.message };
    }
  }
}

export default new SyncController();
