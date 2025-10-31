// src/controllers/offline/SyncController.js - VERSIÓN CORREGIDA
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import AuthOfflineController from "../AuthOfflineController/AuthOfflineController";
import SalesOfflineController from "../SalesOfflineController/SalesOfflineController";
import SessionsOfflineController from "../SessionsOfflineController/SessionsOfflineController";
import ClosuresOfflineController from "../ClosuresOfflineController/ClosuresOfflineController";
import { fetchConToken, fetchSinToken } from "../../../helpers/fetch";
import IndexedDBService from "../../../services/IndexedDBService";

class SyncController extends BaseOfflineController {
  constructor() {
    super();
    this.syncListeners = [];
    this.isSyncing = false;
  }

  // ✅ SINCRONIZACIÓN COMPLETA - CORREGIDA
  async fullSync() {
    if (!this.isOnline) {
      this.notifyListeners("sync_skipped", { reason: "offline" });
      return { success: false, error: "Sin conexión a internet" };
    }

    if (this.isSyncing) {
      this.notifyListeners("sync_skipped", { reason: "already_syncing" });
      return { success: false, error: "Sincronización en progreso" };
    }

    this.isSyncing = true;
    this.notifyListeners("sync_start");

    const syncResults = {
      startTime: Date.now(),
      users: null,
      sales: null,
      sessions: null,
      closures: null,
      masterData: null,
    };

    try {
      console.log("🔄 INICIANDO SINCRONIZACIÓN COMPLETA...");

      // 1. Sincronizar usuarios
      syncResults.users = await AuthOfflineController.syncUsersFromServer();

      // 2. Sincronizar datos maestros
      syncResults.masterData = await this.syncMasterData();

      // 3. Sincronizar ventas pendientes
      syncResults.sales = await SalesOfflineController.syncPendingSales();

      // 4. Sincronizar sesiones y cierres
      const sessionResults = await this.syncSessionsAndClosures();
      syncResults.sessions = sessionResults.sessions;
      syncResults.closures = sessionResults.closures;

      syncResults.duration = Date.now() - syncResults.startTime;
      syncResults.success = true;

      console.log("✅ SINCRONIZACIÓN COMPLETADA", syncResults);
      this.notifyListeners("sync_complete", syncResults);

      return syncResults;
    } catch (error) {
      syncResults.duration = Date.now() - syncResults.startTime;
      syncResults.success = false;
      syncResults.error = error.message;

      console.error("❌ ERROR EN SINCRONIZACIÓN:", error);
      this.notifyListeners("sync_error", syncResults);

      return syncResults;
    } finally {
      this.isSyncing = false;
    }
  }

  // ✅ SINCRONIZAR DATOS MAESTROS - CORREGIDO
  async syncMasterData() {
    try {
      console.log("📦 Sincronizando datos maestros...");

      // ✅ USAR fetchConToken EN LUGAR DE fetch DIRECTAMENTE
      const [productosResponse, categoriasResponse] = await Promise.all([
        fetchConToken("productos"),
        fetchConToken("categorias"),
      ]);

      console.log("📥 Respuesta productos:", productosResponse);
      console.log("📥 Respuesta categorías:", categoriasResponse);

      if (
        productosResponse &&
        productosResponse.ok &&
        categoriasResponse &&
        categoriasResponse.ok
      ) {
        const productos = productosResponse.productos || [];
        const categorias = categoriasResponse.categorias || [];

        // Guardar en IndexedDB
        await IndexedDBService.clear("productos");
        await IndexedDBService.clear("categorias");

        for (const producto of productos) {
          await IndexedDBService.add("productos", producto);
        }

        for (const categoria of categorias) {
          await IndexedDBService.add("categorias", categoria);
        }

        console.log(
          `✅ Datos maestros sincronizados: ${productos.length} productos, ${categorias.length} categorías`
        );

        return {
          success: true,
          productos: productos.length,
          categorias: categorias.length,
        };
      } else {
        const errorMsg = "Error obteniendo datos maestros del servidor";
        console.error(errorMsg, { productosResponse, categoriasResponse });
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error("❌ Error sincronizando datos maestros:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ SINCRONIZAR SESIONES Y CIERRES - CORREGIDO
  async syncSessionsAndClosures() {
    const results = {
      sessions: { success: 0, failed: 0, total: 0 },
      closures: { success: 0, failed: 0, total: 0 },
    };

    try {
      // Obtener sesiones pendientes
      const pendingSessions =
        await SessionsOfflineController.getPendingSessions();
      results.sessions.total = pendingSessions.length;

      console.log(
        `🔄 Sincronizando ${pendingSessions.length} sesiones pendientes...`
      );

      for (const session of pendingSessions) {
        try {
          if (session.estado === "abierta") {
            await this.syncOpenSession(session);
          } else if (session.estado === "cerrada") {
            await this.syncClosedSession(session);
          }
          results.sessions.success++;
        } catch (error) {
          console.error(
            `❌ Error sincronizando sesión ${session.id_local}:`,
            error
          );
          results.sessions.failed++;
        }
      }

      // Sincronizar cierres pendientes
      const pendingClosures =
        await ClosuresOfflineController.getPendingClosures();
      results.closures.total = pendingClosures.length;

      console.log(
        `🔄 Sincronizando ${pendingClosures.length} cierres pendientes...`
      );

      for (const closure of pendingClosures) {
        try {
          await this.syncClosure(closure);
          results.closures.success++;
        } catch (error) {
          console.error(
            `❌ Error sincronizando cierre ${closure.id_local}:`,
            error
          );
          results.closures.failed++;
        }
      }

      return results;
    } catch (error) {
      console.error("❌ Error en syncSessionsAndClosures:", error);
      throw error;
    }
  }

  // ✅ SINCRONIZAR SESIÓN ABIERTA - CORREGIDO
  async syncOpenSession(session) {
    try {
      console.log(`🔄 Sincronizando sesión abierta: ${session.id_local}`);

      // ✅ USAR fetchConToken CON LA RUTA CORRECTA
      const response = await fetchConToken(
        "sesiones-caja/abrir",
        {
          vendedor_id: session.vendedor_id,
          saldo_inicial: session.saldo_inicial,
        },
        "POST"
      );

      if (response && response.ok) {
        await SessionsOfflineController.markAsSynced(
          session.id_local,
          response.sesion
        );
        console.log(`✅ Sesión abierta sincronizada: ${session.id_local}`);
      } else {
        throw new Error(response?.error || "Error del servidor");
      }
    } catch (error) {
      console.error(
        `❌ Error sincronizando sesión abierta ${session.id_local}:`,
        error
      );
      throw error;
    }
  }

  // ✅ SINCRONIZAR SESIÓN CERRADA - CORREGIDO
  async syncClosedSession(session) {
    try {
      console.log(`🔄 Sincronizando sesión cerrada: ${session.id_local}`);

      // ✅ USAR fetchConToken CON LA RUTA CORRECTA
      const response = await fetchConToken(
        `sesiones-caja/cerrar/${session.id_local}`,
        {
          saldo_final: session.saldo_final,
          observaciones: session.observaciones,
        },
        "PUT"
      );

      if (response && response.ok) {
        await SessionsOfflineController.markAsSynced(
          session.id_local,
          response.sesion
        );
        console.log(`✅ Sesión cerrada sincronizada: ${session.id_local}`);
      } else {
        throw new Error(response?.error || "Error del servidor");
      }
    } catch (error) {
      console.error(
        `❌ Error sincronizando sesión cerrada ${session.id_local}:`,
        error
      );
      throw error;
    }
  }

  // ✅ SINCRONIZAR CIERRE - CORREGIDO
  async syncClosure(closure) {
    try {
      console.log(`🔄 Sincronizando cierre: ${closure.id_local}`);

      // ✅ USAR fetchConToken CON LA RUTA CORRECTA
      const response = await fetchConToken("cierres", closure, "POST");

      if (response && response.ok) {
        await ClosuresOfflineController.markAsSynced(
          closure.id_local,
          response.cierre
        );
        console.log(`✅ Cierre sincronizado: ${closure.id_local}`);
      } else {
        throw new Error(response?.error || "Error del servidor");
      }
    } catch (error) {
      console.error(
        `❌ Error sincronizando cierre ${closure.id_local}:`,
        error
      );
      throw error;
    }
  }

  // ✅ SINCRONIZACIÓN MANUAL DESDE UI
  async manualSync() {
    try {
      console.log("👤 Sincronización manual iniciada...");

      const status = await this.getSyncStatus();

      if (status.totalPending === 0) {
        return {
          success: true,
          message: "No hay datos pendientes por sincronizar",
        };
      }

      const result = await this.fullSync();

      if (result.success) {
        return {
          success: true,
          message: `Sincronización completada: ${
            result.sales?.success || 0
          } ventas, ${result.sessions?.success || 0} sesiones, ${
            result.closures?.success || 0
          } cierres`,
        };
      } else {
        throw new Error(result.error || "Error en sincronización");
      }
    } catch (error) {
      console.error("❌ Error en sincronización manual:", error);
      return { success: false, error: error.message };
    }
  }

  addSyncListener(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter((cb) => cb !== callback);
    };
  }

  notifyListeners(event, data = null) {
    this.syncListeners.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        console.error("Error en sync listener:", error);
      }
    });
  }

  // ✅ OBTENER ESTADO DE SINCRONIZACIÓN - CORREGIDO
  async getSyncStatus() {
    try {
      const [pendingSessions, pendingSales, pendingClosures] =
        await Promise.all([
          SessionsOfflineController.getPendingSessions().catch(() => []),
          SalesOfflineController.getPendingSales().catch(() => []),
          ClosuresOfflineController.getPendingClosures().catch(() => []),
        ]);

      return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        pendingSessions: pendingSessions.length,
        pendingSales: pendingSales.length,
        pendingClosures: pendingClosures.length,
        totalPending:
          pendingSessions.length + pendingSales.length + pendingClosures.length,
        lastSync: localStorage.getItem("lastSync") || null,
      };
    } catch (error) {
      console.error("❌ Error obteniendo estado de sincronización:", error);
      return {
        isOnline: this.isOnline,
        isSyncing: false,
        pendingSessions: 0,
        pendingSales: 0,
        pendingClosures: 0,
        totalPending: 0,
        error: error.message,
      };
    }
  }

  // ✅ NUEVO: SINCRONIZACIÓN RÁPIDA (SOLO DATOS MAESTROS)
  async quickSync() {
    if (!this.isOnline) {
      return { success: false, error: "Sin conexión" };
    }

    try {
      console.log("⚡ Sincronización rápida iniciada...");

      const masterData = await this.syncMasterData();

      if (masterData.success) {
        localStorage.setItem("lastSync", new Date().toISOString());
        return {
          success: true,
          message: `Datos actualizados: ${masterData.productos} productos, ${masterData.categorias} categorías`,
        };
      } else {
        throw new Error(masterData.error);
      }
    } catch (error) {
      console.error("❌ Error en sincronización rápida:", error);
      return { success: false, error: error.message };
    }
  }
}

export default new SyncController();
