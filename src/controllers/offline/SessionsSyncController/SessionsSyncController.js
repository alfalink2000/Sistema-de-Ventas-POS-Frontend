// controllers/offline/SessionsSyncController/SessionsSyncController.js
import IndexedDBService from "../../../services/IndexedDBService";
import { fetchConToken } from "../../../helpers/fetch";

class SessionsSyncController {
  constructor() {
    this.storeName = "sesiones_pendientes";
    this.offlineStoreName = "sesiones_caja_offline";
  }

  // 📤 SINCRONIZAR SESIONES PENDIENTES
  // ✅ SINCRONIZAR SESIONES PENDIENTES - CORREGIDA
  async syncPendingChanges() {
    try {
      console.log("🔄 [SESSIONS SYNC] Iniciando sincronización de sesiones...");

      // ✅ CORREGIDO: Usar la variable correcta
      const pendingSessions = await this.getPendingSessions();

      console.log(
        `📦 [SESSIONS] ${pendingSessions.length} sesiones pendientes para sincronizar`
      );

      if (pendingSessions.length === 0) {
        return {
          success: true,
          synchronized: 0,
          message: "No hay sesiones pendientes",
        };
      }

      let synchronized = 0;
      let failed = 0;
      const results = [];

      for (const session of pendingSessions) {
        try {
          console.log(
            `🔄 Sincronizando sesión: ${session.id_local || session.id}`
          );

          // ✅ PREPARAR DATOS PARA EL SERVIDOR
          const sessionData = {
            fecha_apertura: session.fecha_apertura,
            fecha_cierre: session.fecha_cierre,
            vendedor_id: session.vendedor_id,
            estado: session.estado,
            monto_inicial: session.monto_inicial,
            monto_final: session.monto_final,
            observaciones: session.observaciones,
            // Incluir ID del servidor si existe
            ...(session.id && { id: session.id }),
          };

          let response;

          if (session.id) {
            // ✅ ACTUALIZAR SESIÓN EXISTENTE
            response = await fetchConToken(
              `sesiones-caja/${session.id}`,
              sessionData,
              "PUT"
            );
          } else {
            // ✅ CREAR NUEVA SESIÓN
            response = await fetchConToken(
              "sesiones-caja",
              sessionData,
              "POST"
            );
          }

          if (response && response.ok === true) {
            // ✅ MARCAR COMO SINCRONIZADO
            await IndexedDBService.put(this.storeName, {
              ...session,
              sincronizado: true,
              fecha_sincronizacion: new Date().toISOString(),
              // Guardar ID del servidor si se creó nueva sesión
              ...(response.sesion && { id: response.sesion.id }),
            });

            synchronized++;
            results.push({
              session_id: session.id_local || session.id,
              status: "success",
              message: "Sesión sincronizada",
            });

            console.log(
              `✅ Sesión sincronizada: ${session.id_local || session.id}`
            );
          } else {
            throw new Error(response?.msg || "Error del servidor");
          }
        } catch (error) {
          console.error(`❌ Error sincronizando sesión:`, error);
          failed++;
          results.push({
            session_id: session.id_local || session.id,
            status: "failed",
            error: error.message,
          });

          // ✅ INCREMENTAR INTENTOS
          await IndexedDBService.put(this.storeName, {
            ...session,
            intentos: (session.intentos || 0) + 1,
            ultimo_error: error.message,
            ultimo_intento: new Date().toISOString(),
          });
        }
      }

      return {
        success: failed === 0,
        synchronized,
        failed,
        total: pendingSessions.length,
        results,
      };
    } catch (error) {
      console.error(
        "❌ [SESSIONS SYNC] Error sincronizando sesiones pendientes:",
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ✅ OBTENER SESIONES PENDIENTES
  async getPendingSessions() {
    try {
      const pendingSessions = await IndexedDBService.safeGetByIndex(
        this.storeName,
        "sincronizado",
        false
      );
      console.log(
        `📊 [SESSIONS] ${pendingSessions.length} sesiones pendientes encontradas`
      );
      return pendingSessions;
    } catch (error) {
      console.error("❌ Error obteniendo sesiones pendientes:", error);
      return [];
    }
  }
  // ✅ MARCAR SESIÓN COMO SINCRONIZADA
  async markAsSynced(sessionId, serverData = {}) {
    try {
      const session = await IndexedDBService.get(this.storeName, sessionId);
      if (!session) {
        console.warn(`⚠️ Sesión no encontrada: ${sessionId}`);
        return false;
      }

      const updatedSession = {
        ...session,
        ...serverData,
        sincronizado: true,
        fecha_sincronizacion: new Date().toISOString(),
      };

      await IndexedDBService.put(this.storeName, updatedSession);
      console.log(`✅ Sesión marcada como sincronizada: ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error marcando sesión como sincronizada:`, error);
      return false;
    }
  }
  // ✅ CREAR SESIÓN PENDIENTE
  async createPendingSession(sessionData) {
    try {
      const sessionId = `sesion_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const pendingSession = {
        id_local: sessionId,
        ...sessionData,
        sincronizado: false,
        timestamp: new Date().toISOString(),
        intentos: 0,
        ultimo_error: null,
      };

      await IndexedDBService.put(this.storeName, pendingSession);
      console.log(`✅ Sesión pendiente creada: ${sessionId}`);

      return { success: true, id: sessionId };
    } catch (error) {
      console.error("❌ Error creando sesión pendiente:", error);
      return { success: false, error: error.message };
    }
  }
  async getPendingCount() {
    try {
      // ✅ USAR safeGetByIndex EN LUGAR DE getByIndex
      const pendientes = await IndexedDBService.safeGetByIndex(
        this.storeName,
        "sincronizado",
        false
      );
      console.log(`📊 [SESSIONS] Pendientes: ${pendientes.length}`);
      return pendientes.length;
    } catch (error) {
      console.error(
        "❌ Error obteniendo conteo de sesiones pendientes:",
        error
      );
      return 0;
    }
  }

  // 📅 OBTENER ÚLTIMA SINCRONIZACIÓN
  async getLastSync() {
    try {
      const metadata = await IndexedDBService.get(
        "sync_metadata",
        "last_sessions_sync"
      );
      return metadata || null;
    } catch (error) {
      return null;
    }
  }

  // 🧹 LIMPIAR DATOS SINCRONIZADOS
  async cleanupSynced() {
    try {
      const sesionesSincronizadas = await IndexedDBService.getByIndex(
        this.storeName,
        "sincronizado",
        true
      );

      let eliminadas = 0;

      for (const sesion of sesionesSincronizadas) {
        await IndexedDBService.delete(this.storeName, sesion.id_local);
        eliminadas++;
      }

      console.log(`🧹 [SESSIONS SYNC] ${eliminadas} sesiones eliminadas`);

      return {
        success: true,
        eliminadas,
      };
    } catch (error) {
      console.error("❌ Error limpiando sesiones sincronizadas:", error);
      return { success: false, error: error.message };
    }
  }
}

export default SessionsSyncController;
