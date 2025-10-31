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

  // En src/controllers/offline/SyncController/SyncController.js - AGREGAR ESTOS MÉTODOS

  // ✅ NUEVO: SINCRONIZACIÓN AUTOMÁTICA AL DETECTAR INTERNET
  async autoSyncOnConnection() {
    if (!this.isOnline) {
      console.log("📴 Sin conexión - Auto sync cancelado");
      return { success: false, error: "Sin conexión" };
    }

    if (this.isSyncing) {
      console.log("⏳ Ya hay una sincronización en progreso");
      return { success: false, error: "Sincronización en progreso" };
    }

    this.isSyncing = true;
    this.notifyListeners("auto_sync_start");

    try {
      console.log(
        "🌐 CONEXIÓN DETECTADA - Iniciando sincronización automática..."
      );

      // 1. Obtener estado actual de sincronización
      const syncStatus = await this.getSyncStatus();

      if (syncStatus.totalPending === 0) {
        console.log("✅ No hay datos pendientes para sincronizar");
        this.notifyListeners("auto_sync_complete", {
          message: "No hay datos pendientes",
          totalPending: 0,
        });
        return { success: true, message: "No hay datos pendientes" };
      }

      console.log(`📊 Datos pendientes encontrados:`, {
        sesiones: syncStatus.pendingSessions,
        ventas: syncStatus.pendingSales,
        cierres: syncStatus.pendingClosures,
      });

      // 2. Sincronizar sesiones primero (más críticas)
      const sessionResults = await this.autoSyncSessions();

      // 3. Sincronizar ventas después
      const salesResults = await this.autoSyncSales();

      // 4. Sincronizar cierres al final
      const closureResults = await this.autoSyncClosures();

      const totalResults = {
        sessions: sessionResults,
        sales: salesResults,
        closures: closureResults,
        totalProcessed:
          sessionResults.success +
          salesResults.success +
          closureResults.success,
        totalFailed:
          sessionResults.failed + salesResults.failed + closureResults.failed,
      };

      console.log("✅ SINCRONIZACIÓN AUTOMÁTICA COMPLETADA", totalResults);

      this.notifyListeners("auto_sync_complete", totalResults);

      return {
        success: totalResults.totalFailed === 0,
        ...totalResults,
      };
    } catch (error) {
      console.error("❌ ERROR en sincronización automática:", error);
      this.notifyListeners("auto_sync_error", { error: error.message });
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  // ✅ NUEVO: SINCRONIZACIÓN AUTOMÁTICA DE SESIONES CON DELAY
  async autoSyncSessions() {
    try {
      const pendingSessions =
        await SessionsOfflineController.getPendingSessions();

      if (pendingSessions.length === 0) {
        return { success: 0, failed: 0, total: 0, details: [] };
      }

      console.log(
        `🔄 Sincronizando ${pendingSessions.length} sesiones pendientes...`
      );

      const results = {
        success: 0,
        failed: 0,
        total: pendingSessions.length,
        details: [],
      };

      // Procesar una por una con delay
      for (let i = 0; i < pendingSessions.length; i++) {
        const session = pendingSessions[i];

        try {
          console.log(
            `📤 [${i + 1}/${pendingSessions.length}] Sincronizando sesión: ${
              session.id_local
            }`
          );

          let syncResult;

          if (session.estado === "abierta") {
            syncResult = await this.syncOpenSession(session);
          } else if (session.estado === "cerrada") {
            syncResult = await this.syncClosedSession(session);
          } else {
            console.warn(`⚠️ Estado de sesión desconocido: ${session.estado}`);
            continue;
          }

          if (syncResult) {
            results.success++;
            results.details.push({
              id_local: session.id_local,
              type: session.estado,
              status: "success",
              message: "Sincronizada correctamente",
            });
            console.log(`✅ Sesión ${session.id_local} sincronizada`);
          } else {
            results.failed++;
            results.details.push({
              id_local: session.id_local,
              type: session.estado,
              status: "failed",
              message: "Error en sincronización",
            });
            console.error(`❌ Error sincronizando sesión ${session.id_local}`);
          }

          // ✅ DELAY ENTRE SINCRONIZACIONES (1 segundo)
          if (i < pendingSessions.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          results.failed++;
          results.details.push({
            id_local: session.id_local,
            type: session.estado,
            status: "error",
            message: error.message,
          });
          console.error(
            `❌ Error procesando sesión ${session.id_local}:`,
            error
          );
        }
      }

      console.log(
        `✅ Sesiones sincronizadas: ${results.success} exitosas, ${results.failed} fallidas`
      );
      return results;
    } catch (error) {
      console.error("❌ Error en autoSyncSessions:", error);
      throw error;
    }
  }

  // ✅ NUEVO: SINCRONIZACIÓN AUTOMÁTICA DE VENTAS
  async autoSyncSales() {
    try {
      const pendingSales = await SalesOfflineController.getPendingSales();

      if (pendingSales.length === 0) {
        return { success: 0, failed: 0, total: 0, details: [] };
      }

      console.log(
        `🔄 Sincronizando ${pendingSales.length} ventas pendientes...`
      );

      const results = {
        success: 0,
        failed: 0,
        total: pendingSales.length,
        details: [],
      };

      // Procesar en lotes más pequeños para ventas (pueden ser muchas)
      const batchSize = 5;

      for (let i = 0; i < pendingSales.length; i += batchSize) {
        const batch = pendingSales.slice(i, i + batchSize);

        console.log(
          `📦 Procesando lote de ventas ${i + 1}-${i + batch.length}`
        );

        const batchPromises = batch.map(async (sale, index) => {
          try {
            console.log(
              `📤 [${i + index + 1}/${
                pendingSales.length
              }] Sincronizando venta: ${sale.id_local}`
            );

            const syncResult = await this.sendSaleToServer(sale);

            if (syncResult.success) {
              await this.markSaleAsSynced(sale.id_local, syncResult.data);
              results.success++;
              results.details.push({
                id_local: sale.id_local,
                status: "success",
                message: "Venta sincronizada",
              });
              console.log(`✅ Venta ${sale.id_local} sincronizada`);
            } else {
              results.failed++;
              results.details.push({
                id_local: sale.id_local,
                status: "failed",
                message: syncResult.error,
              });
              console.error(
                `❌ Error sincronizando venta ${sale.id_local}:`,
                syncResult.error
              );
            }
          } catch (error) {
            results.failed++;
            results.details.push({
              id_local: sale.id_local,
              status: "error",
              message: error.message,
            });
            console.error(`❌ Error procesando venta ${sale.id_local}:`, error);
          }
        });

        await Promise.all(batchPromises);

        // ✅ DELAY ENTRE LOTES (2 segundos)
        if (i + batchSize < pendingSales.length) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      console.log(
        `✅ Ventas sincronizadas: ${results.success} exitosas, ${results.failed} fallidas`
      );
      return results;
    } catch (error) {
      console.error("❌ Error en autoSyncSales:", error);
      throw error;
    }
  }

  // ✅ NUEVO: SINCRONIZACIÓN AUTOMÁTICA DE CIERRES
  async autoSyncClosures() {
    try {
      const pendingClosures =
        await ClosuresOfflineController.getPendingClosures();

      if (pendingClosures.length === 0) {
        return { success: 0, failed: 0, total: 0, details: [] };
      }

      console.log(
        `🔄 Sincronizando ${pendingClosures.length} cierres pendientes...`
      );

      const results = {
        success: 0,
        failed: 0,
        total: pendingClosures.length,
        details: [],
      };

      // Procesar una por una con delay
      for (let i = 0; i < pendingClosures.length; i++) {
        const closure = pendingClosures[i];

        try {
          console.log(
            `📤 [${i + 1}/${pendingClosures.length}] Sincronizando cierre: ${
              closure.id_local
            }`
          );

          const syncResult = await this.syncClosure(closure);

          if (syncResult) {
            results.success++;
            results.details.push({
              id_local: closure.id_local,
              status: "success",
              message: "Cierre sincronizado",
            });
            console.log(`✅ Cierre ${closure.id_local} sincronizado`);
          } else {
            results.failed++;
            results.details.push({
              id_local: closure.id_local,
              status: "failed",
              message: "Error en sincronización",
            });
            console.error(`❌ Error sincronizando cierre ${closure.id_local}`);
          }

          // ✅ DELAY ENTRE SINCRONIZACIONES (1.5 segundos)
          if (i < pendingClosures.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        } catch (error) {
          results.failed++;
          results.details.push({
            id_local: closure.id_local,
            status: "error",
            message: error.message,
          });
          console.error(
            `❌ Error procesando cierre ${closure.id_local}:`,
            error
          );
        }
      }

      console.log(
        `✅ Cierres sincronizados: ${results.success} exitosas, ${results.failed} fallidas`
      );
      return results;
    } catch (error) {
      console.error("❌ Error en autoSyncClosures:", error);
      throw error;
    }
  }

  // ✅ NUEVO: INICIAR DETECCIÓN AUTOMÁTICA DE CONEXIÓN
  startAutoSyncListener() {
    const handleOnline = async () => {
      console.log("🌐 EVENTO: Conexión a internet detectada");

      // Pequeño delay para asegurar que la conexión sea estable
      setTimeout(async () => {
        try {
          await this.autoSyncOnConnection();
        } catch (error) {
          console.error("❌ Error en auto-sync después de conexión:", error);
        }
      }, 3000); // 3 segundos de delay
    };

    window.addEventListener("online", handleOnline);

    // Retornar función para limpiar el listener
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }
}

export default new SyncController();
