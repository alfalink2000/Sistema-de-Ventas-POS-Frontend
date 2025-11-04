// src/controllers/offline/SessionsOfflineController/SessionsOfflineController.js
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class SessionsOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "sesiones_caja_offline";
  }

  // ✅ VERIFICAR SI UNA SESIÓN ESTÁ ACTIVA (no muy antigua)
  isSessionActive(session) {
    if (session.estado !== "abierta") return false;

    const sessionDate = new Date(session.fecha_apertura);
    const now = new Date();
    const hoursDiff = (now - sessionDate) / (1000 * 60 * 60);

    // Considerar sesión activa si tiene menos de 24 horas
    return hoursDiff < 24;
  }

  // ✅ VERIFICACIÓN MEJORADA DE SESIONES DUPLICADAS
  async checkForDuplicateSessions(vendedorId) {
    try {
      const allSessions = await this.getAllSessions();

      // Buscar sesiones abiertas para este vendedor
      const openSessions = allSessions.filter(
        (s) =>
          s.vendedor_id === vendedorId &&
          s.estado === "abierta" &&
          this.isSessionActive(s)
      );

      if (openSessions.length > 1) {
        console.warn(
          `⚠️ Múltiples sesiones abiertas encontradas: ${openSessions.length}`
        );

        // Ordenar por fecha de apertura (más reciente primero)
        openSessions.sort(
          (a, b) => new Date(b.fecha_apertura) - new Date(a.fecha_apertura)
        );

        // Mantener solo la más reciente, cerrar las demás
        const [mostRecent, ...olderSessions] = openSessions;

        for (const oldSession of olderSessions) {
          console.log(`🔒 Cerrando sesión duplicada: ${oldSession.id_local}`);
          await this.forceCloseSession(
            oldSession.id_local,
            "Sesión duplicada - cerrada automáticamente"
          );
        }

        return {
          hasDuplicates: true,
          keptSession: mostRecent,
          closedSessions: olderSessions.length,
        };
      }

      return {
        hasDuplicates: false,
        openSessions: openSessions.length,
      };
    } catch (error) {
      console.error("❌ Error verificando duplicados:", error);
      return { hasDuplicates: false, error: error.message };
    }
  }
  // ✅ CERRAR SESIÓN FORZOSAMENTE
  async forceCloseSession(sessionId, motivo = "Cierre automático") {
    try {
      const session = await this.getSessionById(sessionId);
      if (!session) return { success: false, error: "Sesión no encontrada" };

      const closeData = {
        saldo_final: session.saldo_inicial || 0,
        observaciones: motivo,
      };

      return await this.closeSession(sessionId, closeData);
    } catch (error) {
      console.error(`❌ Error forzando cierre de sesión ${sessionId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ ABRIR SESIÓN CON VERIFICACIÓN MEJORADA
  async openSessionWithValidation(sessionData) {
    try {
      // 1. Verificar duplicados primero
      const duplicateCheck = await this.checkForDuplicateSessions(
        sessionData.vendedor_id
      );

      if (duplicateCheck.hasDuplicates) {
        console.log(
          `🔄 Se encontraron duplicados, se mantiene sesión: ${duplicateCheck.keptSession.id_local}`
        );
      }

      // 2. Verificar si ya existe una sesión activa
      const existingSession = await this.getOpenSessionByVendedor(
        sessionData.vendedor_id
      );

      if (existingSession && this.isSessionActive(existingSession)) {
        return {
          success: false,
          error: "Ya existe una sesión de caja activa para este vendedor",
          existingSession: existingSession,
          duplicateCheck: duplicateCheck,
        };
      }

      // 3. Si existe una sesión pero está inactiva (muy antigua), cerrarla
      if (existingSession && !this.isSessionActive(existingSession)) {
        console.log(
          `🕒 Sesión antigua encontrada, cerrando: ${existingSession.id_local}`
        );
        await this.forceCloseSession(
          existingSession.id_local,
          "Sesión antigua - cerrada automáticamente"
        );
      }

      // 4. Abrir nueva sesión
      return await this.openSession(sessionData);
    } catch (error) {
      console.error("❌ Error en openSessionWithValidation:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ SINCRONIZACIÓN MEJORADA CON MANEJO DE CONFLICTOS
  async syncWithConflictResolution(session) {
    try {
      // Verificar si la sesión ya existe en el servidor
      const serverSession = await this.checkSessionOnServer(session);

      if (serverSession) {
        // Sesión ya existe en servidor, actualizar localmente
        await this.updateLocalSessionFromServer(
          session.id_local,
          serverSession
        );
        return {
          success: true,
          action: "updated",
          message: "Sesión actualizada desde servidor",
        };
      } else {
        // Sesión no existe en servidor, crear nueva
        return await this.syncOpenSession(session);
      }
    } catch (error) {
      console.error(`❌ Error en syncWithConflictResolution:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ VERIFICAR SESIÓN EN SERVIDOR
  async checkSessionOnServer(session) {
    try {
      if (!session.id_servidor) return null;

      const response = await fetchConToken(
        `sesiones-caja/${session.id_servidor}`
      );
      if (response?.ok && response.sesion) {
        return response.sesion;
      }
      return null;
    } catch (error) {
      console.error("❌ Error verificando sesión en servidor:", error);
      return null;
    }
  }

  // ✅ ACTUALIZAR SESIÓN LOCAL DESDE SERVIDOR
  async updateLocalSessionFromServer(localId, serverSession) {
    try {
      const localSession = await this.getSessionById(localId);
      if (!localSession) return false;

      const updatedSession = {
        ...localSession,
        ...serverSession,
        id_servidor: serverSession.id,
        sincronizado: true,
        updated_at: new Date().toISOString(),
      };

      await IndexedDBService.put(this.storeName, updatedSession);
      console.log(`✅ Sesión local actualizada desde servidor: ${localId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error actualizando sesión local:`, error);
      return false;
    }
  }

  // ✅ ABRIR SESIÓN OFFLINE - CORREGIDO

  async openSession(sessionData) {
    try {
      await this.validateRequiredFields(sessionData, [
        "vendedor_id",
        "saldo_inicial",
      ]);

      console.log("🔍 Verificando vendedor_id:", sessionData.vendedor_id);

      // ✅ VERIFICAR DUPLICADOS MEJORADO
      const duplicateCheck = await this.checkForDuplicateSessions(
        sessionData.vendedor_id
      );

      if (duplicateCheck.hasDuplicates && duplicateCheck.keptSession) {
        console.log("🔄 Sesión duplicada encontrada, retornando existente");
        return {
          success: true,
          sesion: duplicateCheck.keptSession,
          id_local: duplicateCheck.keptSession.id_local,
          wasExisting: true,
        };
      }

      // ✅ **SOLUCIÓN CRÍTICA**: Si estamos ONLINE, crear en servidor primero
      let serverSessionId = null;
      let sesionCompleta = null;

      if (navigator.onLine) {
        try {
          console.log("🌐 Creando sesión en servidor primero...");
          const response = await fetchConToken(
            "sesiones-caja/abrir",
            sessionData,
            "POST"
          );

          if (response?.ok && response.sesion) {
            serverSessionId = response.sesion.id;
            console.log("✅ Sesión creada en servidor:", serverSessionId);

            // ✅ **USAR EL ID DEL SERVIDOR COMO ID LOCAL**
            sesionCompleta = {
              ...sessionData,
              ...response.sesion, // Incluir todos los datos del servidor
              id_local: serverSessionId, // ← **CRÍTICO: Mismo ID que servidor**
              id: serverSessionId, // ← **CRÍTICO: Mismo ID que servidor**
              sincronizado: true,
              es_local: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }
        } catch (serverError) {
          console.warn(
            "⚠️ No se pudo crear en servidor, creando local:",
            serverError
          );
        }
      }

      // ✅ Si no se pudo crear en servidor o estamos offline, crear local
      if (!sesionCompleta) {
        const localId = `ses_local_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        sesionCompleta = {
          ...sessionData,
          id_local: localId,
          fecha_apertura: new Date().toISOString(),
          estado: "abierta",
          sincronizado: false,
          es_local: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      console.log("💾 Guardando sesión offline:", {
        id_local: sesionCompleta.id_local,
        id: sesionCompleta.id,
        vendedor_id: sessionData.vendedor_id,
      });

      const result = await IndexedDBService.add(this.storeName, sesionCompleta);

      if (!result) {
        throw new Error("Error guardando en IndexedDB");
      }

      return {
        success: true,
        sesion: sesionCompleta,
        id_local: sesionCompleta.id_local,
        wasExisting: false,
        createdOnServer: !!serverSessionId,
      };
    } catch (error) {
      console.error("❌ Error abriendo sesión offline:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ CERRAR SESIÓN OFFLINE - CORREGIDO
  async closeSession(sessionId, closeData) {
    try {
      await this.validateRequiredFields(closeData, ["saldo_final"]);

      console.log(`🔍 Buscando sesión para cerrar: ${sessionId}`);

      // ✅ BUSCAR SESIÓN USANDO EL MÉTODO CORRECTO
      const sesion = await this.getSessionById(sessionId);
      if (!sesion) {
        throw new Error(`Sesión no encontrada: ${sessionId}`);
      }

      console.log("📋 Sesión encontrada:", sesion);

      if (sesion.estado === "cerrada") {
        throw new Error("La sesión ya está cerrada");
      }

      const sesionActualizada = {
        ...sesion,
        // ✅ PRESERVAR id_local SI EXISTE
        id_local: sesion.id_local || sessionId,
        estado: "cerrada",
        fecha_cierre: new Date().toISOString(),
        saldo_final: closeData.saldo_final,
        observaciones: closeData.observaciones || "",
        sincronizado: false,
        updated_at: new Date().toISOString(),
      };

      console.log("💾 Actualizando sesión en IndexedDB:", sesionActualizada);

      const result = await IndexedDBService.put(
        this.storeName,
        sesionActualizada
      );

      if (!result) {
        throw new Error("No se pudo actualizar la sesión en IndexedDB");
      }

      console.log("✅ Sesión offline cerrada:", sessionId);

      return {
        success: true,
        sesion: sesionActualizada, // ← ✅ DEVOLVER CON id_local
      };
    } catch (error) {
      console.error("❌ Error cerrando sesión offline:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ OBTENER SESIÓN ABIERTA POR VENDEDOR - CORREGIDO
  async getOpenSessionByVendedor(vendedorId) {
    try {
      console.log(`🔍 Buscando sesión abierta para vendedor: ${vendedorId}`);

      // ✅ USAR safeGetAll EN LUGAR DE getAll PARA MANEJAR ERRORES
      const sesiones = await IndexedDBService.safeGetAll(this.storeName);

      const sesionAbierta = sesiones.find(
        (s) => s.vendedor_id === vendedorId && s.estado === "abierta"
      );

      console.log(`📊 Sesión abierta encontrada:`, sesionAbierta ? "Sí" : "No");
      return sesionAbierta;
    } catch (error) {
      console.error("❌ Error obteniendo sesión abierta:", error);
      return null;
    }
  }

  // ✅ OBTENER SESIÓN POR ID - CORREGIDO
  async getSessionById(sessionId) {
    try {
      console.log(`🔍 Buscando sesión por ID: ${sessionId}`);

      // ✅ PRIMERO BUSCAR POR id_local (keyPath del objectStore)
      let sesion = await IndexedDBService.get(this.storeName, sessionId);

      if (!sesion) {
        console.log(
          "🔄 No encontrada por id_local, buscando en todas las sesiones..."
        );

        // ✅ BUSCAR EN TODAS LAS SESIONES
        const todasSesiones = await IndexedDBService.safeGetAll(this.storeName);
        sesion = todasSesiones.find(
          (s) => s.id === sessionId || s.id_local === sessionId
        );
      }

      console.log(`📋 Sesión encontrada:`, sesion ? "Sí" : "No");
      return sesion;
    } catch (error) {
      console.error("❌ Error obteniendo sesión:", error);
      return null;
    }
  }

  // ✅ OBTENER TODAS LAS SESIONES
  async getAllSessions() {
    try {
      return await IndexedDBService.safeGetAll(this.storeName);
    } catch (error) {
      console.error("❌ Error obteniendo todas las sesiones:", error);
      return [];
    }
  }

  // ✅ OBTENER SESIONES PENDIENTES - CORREGIDO
  async getPendingSessions() {
    try {
      const sesiones = await IndexedDBService.getPendingRecords(this.storeName);
      console.log(`📊 Sesiones pendientes encontradas: ${sesiones.length}`);
      return sesiones;
    } catch (error) {
      console.error("❌ Error obteniendo sesiones pendientes:", error);
      return [];
    }
  }

  // ✅ VERIFICAR SI SE PUEDE CREAR NUEVA SESIÓN - NUEVO MÉTODO
  async canCreateNewSession(vendedorId) {
    try {
      const existingSession = await this.getOpenSessionByVendedor(vendedorId);

      if (existingSession) {
        return {
          canCreate: false,
          existingSession: existingSession,
          message: "Ya existe una sesión de caja abierta para este vendedor",
        };
      }

      return {
        canCreate: true,
        existingSession: null,
        message: "Puede crear nueva sesión",
      };
    } catch (error) {
      console.error("❌ Error verificando duplicados:", error);
      // En caso de error, permitir crear para no bloquear al usuario
      return {
        canCreate: true,
        existingSession: null,
        message: "Error en verificación, permitiendo creación",
      };
    }
  }

  // ✅ SINCRONIZAR SESIONES PENDIENTES - CORREGIDO
  async syncPendingSessions() {
    if (!this.isOnline) {
      return {
        success: false,
        error: "Sin conexión a internet",
        results: { total: 0, success: 0, failed: 0 },
      };
    }

    try {
      const pendingSessions = await this.getPendingSessions();
      const results = {
        total: pendingSessions.length,
        success: 0,
        failed: 0,
        details: [],
      };

      console.log(
        `🔄 Sincronizando ${pendingSessions.length} sesiones pendientes...`
      );

      for (const sesion of pendingSessions) {
        try {
          let syncResult;

          if (sesion.estado === "abierta") {
            syncResult = await this.syncOpenSession(sesion);
          } else if (sesion.estado === "cerrada") {
            syncResult = await this.syncClosedSession(sesion);
          } else {
            console.warn(`⚠️ Estado de sesión desconocido: ${sesion.estado}`);
            continue;
          }

          if (syncResult.success) {
            results.success++;
            results.details.push({
              id_local: sesion.id_local,
              type: sesion.estado,
              status: "success",
              message: "Sincronizado correctamente",
            });
          } else {
            results.failed++;
            results.details.push({
              id_local: sesion.id_local,
              type: sesion.estado,
              status: "failed",
              message: syncResult.error,
            });
          }
        } catch (error) {
          console.error(
            `❌ Error sincronizando sesión ${sesion.id_local}:`,
            error
          );
          results.failed++;
          results.details.push({
            id_local: sesion.id_local,
            type: sesion.estado,
            status: "error",
            message: error.message,
          });
        }
      }

      console.log(
        `✅ Sincronización completada: ${results.success} exitosas, ${results.failed} fallidas`
      );

      return {
        success: results.failed === 0,
        results: results,
      };
    } catch (error) {
      console.error("❌ Error en syncPendingSessions:", error);
      return {
        success: false,
        error: error.message,
        results: { total: 0, success: 0, failed: 0, details: [] },
      };
    }
  }

  // ✅ SINCRONIZAR SESIÓN ABIERTA - CORREGIDO
  async syncOpenSession(sesion) {
    try {
      console.log(`🔄 Sincronizando sesión abierta: ${sesion.id_local}`);

      const response = await fetch(
        `${
          process.env.VITE_API_URL || "http://localhost:3000/api"
        }/sesiones-caja`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-token": localStorage.getItem("token") || "",
          },
          body: JSON.stringify({
            vendedor_id: sesion.vendedor_id,
            saldo_inicial: sesion.saldo_inicial,
            vendedor_nombre: sesion.vendedor_nombre,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Error ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.ok && data.sesion) {
        // ✅ MARCAR COMO SINCRONIZADA PERO MANTENER EL REGISTRO LOCAL
        await IndexedDBService.put(this.storeName, {
          ...sesion,
          id: data.sesion.id, // Guardar el ID del servidor
          sincronizado: true,
          updated_at: new Date().toISOString(),
        });

        console.log(
          `✅ Sesión abierta sincronizada: ${sesion.id_local} -> ${data.sesion.id}`
        );
        return { success: true };
      } else {
        throw new Error(data.error || "Respuesta del servidor inválida");
      }
    } catch (error) {
      console.error(
        `❌ Error sincronizando sesión abierta ${sesion.id_local}:`,
        error
      );
      return { success: false, error: error.message };
    }
  }

  // ✅ SINCRONIZAR SESIÓN CERRADA - CORREGIDO
  async syncClosedSession(sesion) {
    try {
      console.log(`🔄 Sincronizando sesión cerrada: ${sesion.id_local}`);

      // Para sesiones cerradas, necesitamos crear un cierre en el servidor
      const response = await fetch(
        `${process.env.VITE_API_URL || "http://localhost:3000/api"}/cierres`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-token": localStorage.getItem("token") || "",
          },
          body: JSON.stringify({
            sesion_caja_id: sesion.id, // Si ya tiene ID del servidor
            sesion_caja_id_local: sesion.id_local, // Para referencia
            vendedor_id: sesion.vendedor_id,
            saldo_final_real: sesion.saldo_final,
            observaciones: sesion.observaciones,
            fecha_apertura: sesion.fecha_apertura,
            fecha_cierre: sesion.fecha_cierre,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Error ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.ok && data.cierre) {
        // ✅ MARCAR SESIÓN COMO SINCRONIZADA
        await IndexedDBService.put(this.storeName, {
          ...sesion,
          sincronizado: true,
          updated_at: new Date().toISOString(),
        });

        console.log(`✅ Sesión cerrada sincronizada: ${sesion.id_local}`);
        return { success: true };
      } else {
        throw new Error(data.error || "Respuesta del servidor inválida");
      }
    } catch (error) {
      console.error(
        `❌ Error sincronizando sesión cerrada ${sesion.id_local}:`,
        error
      );
      return { success: false, error: error.message };
    }
  }

  // ✅ ELIMINAR SESIÓN - NUEVO MÉTODO
  async deleteSession(sessionId) {
    try {
      console.log(`🗑️ Eliminando sesión: ${sessionId}`);

      const result = await IndexedDBService.delete(this.storeName, sessionId);

      if (!result) {
        throw new Error("No se pudo eliminar la sesión");
      }

      console.log(`✅ Sesión eliminada: ${sessionId}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error eliminando sesión ${sessionId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ DIAGNÓSTICO DE SESIONES - NUEVO MÉTODO
  async diagnoseSessions() {
    try {
      console.log("🔍 Ejecutando diagnóstico de sesiones...");

      const allSessions = await this.getAllSessions();
      const pendingSessions = await this.getPendingSessions();
      const openSessions = allSessions.filter((s) => s.estado === "abierta");
      const closedSessions = allSessions.filter((s) => s.estado === "cerrada");

      const diagnosis = {
        total: allSessions.length,
        abiertas: openSessions.length,
        cerradas: closedSessions.length,
        pendientes: pendingSessions.length,
        sincronizadas: allSessions.filter((s) => s.sincronizado).length,
        problemas: [],
        resumen: {
          por_vendedor: {},
          por_estado: {
            abiertas: openSessions.length,
            cerradas: closedSessions.length,
          },
        },
      };

      // Agrupar por vendedor
      allSessions.forEach((session) => {
        const vendedorId = session.vendedor_id;
        if (!diagnosis.resumen.por_vendedor[vendedorId]) {
          diagnosis.resumen.por_vendedor[vendedorId] = {
            total: 0,
            abiertas: 0,
            cerradas: 0,
          };
        }
        diagnosis.resumen.por_vendedor[vendedorId].total++;
        if (session.estado === "abierta") {
          diagnosis.resumen.por_vendedor[vendedorId].abiertas++;
        } else {
          diagnosis.resumen.por_vendedor[vendedorId].cerradas++;
        }
      });

      // Verificar problemas
      Object.entries(diagnosis.resumen.por_vendedor).forEach(
        ([vendedorId, stats]) => {
          if (stats.abiertas > 1) {
            diagnosis.problemas.push(
              `Vendedor ${vendedorId} tiene ${stats.abiertas} sesiones abiertas (debería tener 1)`
            );
          }
        }
      );

      // Verificar sesiones sin id_local
      const sessionsWithoutLocalId = allSessions.filter((s) => !s.id_local);
      if (sessionsWithoutLocalId.length > 0) {
        diagnosis.problemas.push(
          `${sessionsWithoutLocalId.length} sesiones sin id_local`
        );
      }

      console.log("📊 Diagnóstico completado:", diagnosis);
      return diagnosis;
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      return { error: error.message };
    }
  }
}

export default new SessionsOfflineController();
