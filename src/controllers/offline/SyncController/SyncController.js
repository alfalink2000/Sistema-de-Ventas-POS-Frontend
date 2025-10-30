// src/controllers/offline/SyncController.js
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import AuthOfflineController from "../AuthOfflineController/AuthOfflineController";
import SalesOfflineController from "../SalesOfflineController/SalesOfflineController";
import SessionsOfflineController from "../SessionsOfflineController/SessionsOfflineController";
import ClosuresOfflineController from "../ClosuresOfflineController/ClosuresOfflineController";

class SyncController extends BaseOfflineController {
  constructor() {
    super();
    this.syncListeners = [];
    this.isSyncing = false;
  }

  // ✅ SINCRONIZACIÓN COMPLETA
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

      // 4. Sincronizar sesiones y cierres (en orden correcto)
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

  // ✅ SINCRONIZAR SESIONES Y CIERRES (ORDEN CRÍTICO)
  async syncSessionsAndClosures() {
    const results = {
      sessions: { success: 0, failed: 0, total: 0 },
      closures: { success: 0, failed: 0, total: 0 },
    };

    try {
      // 1. Primero sincronizar sesiones ABIERTAS
      const pendingSessions =
        await SessionsOfflineController.getPendingSessions();
      const openSessions = pendingSessions.filter(
        (s) => s.estado === "abierta"
      );

      for (const session of openSessions) {
        try {
          // Sincronizar sesión abierta
          await this.syncOpenSession(session);
          results.sessions.success++;
        } catch (error) {
          console.error(
            `Error sincronizando sesión abierta ${session.id_local}:`,
            error
          );
          results.sessions.failed++;
        }
      }

      // 2. Luego sincronizar sesiones CERRADAS con sus cierres
      const closedSessions = pendingSessions.filter(
        (s) => s.estado === "cerrada"
      );

      for (const session of closedSessions) {
        try {
          await this.syncClosedSessionWithClosure(session);
          results.sessions.success++;
          results.closures.success++;
        } catch (error) {
          console.error(
            `Error sincronizando sesión cerrada ${session.id_local}:`,
            error
          );
          results.sessions.failed++;
          results.closures.failed++;
        }
      }

      results.sessions.total = pendingSessions.length;
      results.closures.total = closedSessions.length;
    } catch (error) {
      console.error("Error en syncSessionsAndClosures:", error);
      throw error;
    }

    return results;
  }

  async syncOpenSession(session) {
    // Lógica para sincronizar sesión abierta
    const response = await fetch(
      `${process.env.VITE_API_URL}/sesiones-caja/abrir`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(session),
      }
    );

    if (response.ok) {
      const data = await response.json();
      await SessionsOfflineController.markAsSynced(
        "sesiones_caja_offline",
        session.id_local,
        data.sesion
      );
    } else {
      throw new Error("Error sincronizando sesión abierta");
    }
  }

  async syncClosedSessionWithClosure(session) {
    // 1. Buscar cierre asociado
    const closure = await ClosuresOfflineController.getClosureBySession(
      session.id_local
    );

    if (!closure) {
      throw new Error(
        `No se encontró cierre para la sesión ${session.id_local}`
      );
    }

    // 2. Sincronizar sesión y cierre juntos
    // Esta es una operación atómica que debe manejarse en el backend
    const syncData = {
      sesion: session,
      cierre: closure,
    };

    const response = await fetch(
      `${process.env.VITE_API_URL}/sync/sesion-cierre`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(syncData),
      }
    );

    if (response.ok) {
      const data = await response.json();

      // Marcar ambos como sincronizados
      await SessionsOfflineController.markAsSynced(
        "sesiones_caja_offline",
        session.id_local,
        data.sesion
      );

      await ClosuresOfflineController.markAsSynced(
        "cierres_pendientes",
        closure.id_local,
        data.cierre
      );
    } else {
      throw new Error("Error sincronizando sesión cerrada con cierre");
    }
  }

  async syncMasterData() {
    try {
      const [productosResponse, categoriasResponse] = await Promise.all([
        fetch(`${process.env.VITE_API_URL}/productos`),
        fetch(`${process.env.VITE_API_URL}/categorias`),
      ]);

      if (productosResponse.ok && categoriasResponse.ok) {
        const productosData = await productosResponse.json();
        const categoriasData = await categoriasResponse.json();

        // Guardar en IndexedDB
        await IndexedDBService.clear("productos");
        await IndexedDBService.clear("categorias");

        for (const producto of productosData.productos || []) {
          await IndexedDBService.add("productos", producto);
        }

        for (const categoria of categoriasData.categorias || []) {
          await IndexedDBService.add("categorias", categoria);
        }

        return {
          success: true,
          productos: productosData.productos?.length || 0,
          categorias: categoriasData.categorias?.length || 0,
        };
      }

      return { success: false, error: "Error obteniendo datos maestros" };
    } catch (error) {
      console.error("Error sincronizando datos maestros:", error);
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

  // ✅ OBTENER ESTADO DE SINCRONIZACIÓN
  async getSyncStatus() {
    const [pendingSessions, pendingSales, pendingClosures] = await Promise.all([
      SessionsOfflineController.getPendingSessions(),
      SalesOfflineController.getPendingSales(),
      ClosuresOfflineController.getPendingClosures(),
    ]);

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingSessions: pendingSessions.length,
      pendingSales: pendingSales.length,
      pendingClosures: pendingClosures.length,
      totalPending:
        pendingSessions.length + pendingSales.length + pendingClosures.length,
    };
  }
}

export default new SyncController();
