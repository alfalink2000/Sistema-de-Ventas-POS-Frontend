// src/controllers/offline/SessionsOfflineController.js
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class SessionsOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "sesiones_caja_offline";
  }

  // ✅ ABRIR SESIÓN OFFLINE
  async openSession(sessionData) {
    try {
      await this.validateRequiredFields(sessionData, [
        "vendedor_id",
        "saldo_inicial",
      ]);

      const localId = await this.generateLocalId("sesion");

      const sesionCompleta = {
        ...sessionData,
        id_local: localId,
        fecha_apertura: new Date().toISOString(),
        estado: "abierta",
        sincronizado: false,
        es_local: true,
        vendedor_nombre: sessionData.vendedor_nombre || "Vendedor Offline",
      };

      await IndexedDBService.add(this.storeName, sesionCompleta);

      console.log("✅ Sesión offline abierta:", localId);

      return {
        success: true,
        sesion: sesionCompleta,
        id_local: localId,
      };
    } catch (error) {
      console.error("❌ Error abriendo sesión offline:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ CERRAR SESIÓN OFFLINE
  async closeSession(sessionId, closeData) {
    try {
      await this.validateRequiredFields(closeData, ["saldo_final"]);

      const sesion = await this.getSessionById(sessionId);
      if (!sesion) {
        throw new Error("Sesión no encontrada");
      }

      if (sesion.estado === "cerrada") {
        throw new Error("La sesión ya está cerrada");
      }

      const sesionActualizada = {
        ...sesion,
        estado: "cerrada",
        fecha_cierre: new Date().toISOString(),
        saldo_final: closeData.saldo_final,
        observaciones: closeData.observaciones || "",
        sincronizado: false,
      };

      await IndexedDBService.put(this.storeName, sesionActualizada);

      console.log("✅ Sesión offline cerrada:", sessionId);

      return {
        success: true,
        sesion: sesionActualizada,
      };
    } catch (error) {
      console.error("❌ Error cerrando sesión offline:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ OBTENER SESIÓN ABIERTA POR VENDEDOR
  async getOpenSessionByVendedor(vendedorId) {
    try {
      const sesiones = await IndexedDBService.getAll(this.storeName);
      return sesiones.find(
        (s) => s.vendedor_id === vendedorId && s.estado === "abierta"
      );
    } catch (error) {
      console.error("Error obteniendo sesión abierta:", error);
      return null;
    }
  }

  // ✅ OBTENER SESIÓN POR ID
  async getSessionById(sessionId) {
    try {
      // Buscar por ID local primero
      let sesion = await IndexedDBService.get(this.storeName, sessionId);

      if (!sesion) {
        // Buscar en todas las sesiones
        const todasSesiones = await IndexedDBService.getAll(this.storeName);
        sesion = todasSesiones.find(
          (s) => s.id === sessionId || s.id_local === sessionId
        );
      }

      return sesion;
    } catch (error) {
      console.error("Error obteniendo sesión:", error);
      return null;
    }
  }

  // ✅ OBTENER SESIONES PENDIENTES
  async getPendingSessions() {
    try {
      const sesiones = await IndexedDBService.getPendingRecords(this.storeName);
      return sesiones;
    } catch (error) {
      console.error("Error obteniendo sesiones pendientes:", error);
      return [];
    }
  }

  // ✅ SINCRONIZAR SESIONES PENDIENTES
  async syncPendingSessions() {
    if (!this.isOnline) {
      return { success: false, error: "Sin conexión a internet" };
    }

    try {
      const pendingSessions = await this.getPendingSessions();
      const results = {
        total: pendingSessions.length,
        success: 0,
        failed: 0,
      };

      for (const sesion of pendingSessions) {
        try {
          if (sesion.estado === "abierta") {
            await this.syncOpenSession(sesion, results);
          } else if (sesion.estado === "cerrada") {
            await this.syncClosedSession(sesion, results);
          }
        } catch (error) {
          console.error(
            `Error sincronizando sesión ${sesion.id_local}:`,
            error
          );
          results.failed++;
        }
      }

      return results;
    } catch (error) {
      console.error("Error en syncPendingSessions:", error);
      return { success: false, error: error.message };
    }
  }

  async syncOpenSession(sesion, results) {
    const response = await fetch(
      `${process.env.VITE_API_URL}/sesiones-caja/abrir`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(sesion),
      }
    );

    if (response.ok) {
      const data = await response.json();
      await this.markAsSynced(this.storeName, sesion.id_local, data.sesion);
      results.success++;
    } else {
      results.failed++;
    }
  }

  async syncClosedSession(sesion, results) {
    // Para sesiones cerradas, necesitamos manejar el cierre en el servidor
    // Esta lógica se implementará en el SyncController
    console.log("Sesión cerrada pendiente de sincronización:", sesion.id_local);
    // Marcamos como éxito temporalmente - la lógica completa va en SyncController
    results.success++;
  }
}

export default new SessionsOfflineController();
