// src/controllers/offline/SyncController/SyncController.js - VERSIÓN CORREGIDA
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import AuthOfflineController from "../AuthOfflineController/AuthOfflineController";
import SalesOfflineController from "../SalesOfflineController/SalesOfflineController";
import SessionsOfflineController from "../SessionsOfflineController/SessionsOfflineController";
import ClosuresOfflineController from "../ClosuresOfflineController/ClosuresOfflineController";
import ProductsOfflineController from "../ProductsOfflineController/ProductsOfflineController";
import { fetchConToken } from "../../../helpers/fetch";
import IndexedDBService from "../../../services/IndexedDBService";

class SyncController extends BaseOfflineController {
  constructor() {
    super();
    this.syncListeners = [];
    this.isSyncing = false;
    this.startAutoSyncListener();
  }

  async fullSync() {
    if (!this.isOnline) {
      return { success: false, error: "Sin conexión a internet" };
    }
    // ✅ LIMPIAR DUPLICADOS ANTES DE SINCRONIZAR
    await this.cleanupDuplicatePendingData();

    if (this.isSyncing) {
      return { success: false, error: "Sincronización en progreso" };
    }

    this.isSyncing = true;
    this.notifyListeners("sync_start");

    const syncResults = {
      startTime: Date.now(),
      sales: null,
      sessions: null,
      closures: null,
      masterData: null,
      errors: [],
    };

    try {
      console.log("🔄 INICIANDO SINCRONIZACIÓN CON ORDEN CORRECTO...");

      // ✅ ORDEN CRÍTICO:
      // 1. Datos maestros
      syncResults.masterData = await this.syncMasterData();

      // 2. Sesiones PRIMERO (los cierres dependen de ellas)
      syncResults.sessions = await this.syncPendingSessionsDetailed();

      // 3. Ventas (dependen de sesiones)
      syncResults.sales = await this.syncPendingSalesDetailed();

      // 4. Cierres ÚLTIMO (dependen de sesiones existentes)
      syncResults.closures = await this.syncPendingClosuresDetailed();

      syncResults.duration = Date.now() - syncResults.startTime;
      syncResults.success = syncResults.errors.length === 0;

      if (syncResults.success) {
        localStorage.setItem("lastSuccessfulSync", new Date().toISOString());
      }

      console.log("✅ SINCRONIZACIÓN COMPLETADA", syncResults);
      this.notifyListeners("sync_complete", syncResults);

      return syncResults;
    } catch (error) {
      syncResults.duration = Date.now() - syncResults.startTime;
      syncResults.success = false;
      syncResults.error = error.message;
      syncResults.errors.push(error.message);

      console.error("❌ ERROR EN SINCRONIZACIÓN:", error);
      this.notifyListeners("sync_error", syncResults);

      return syncResults;
    } finally {
      this.isSyncing = false;
    }
  }
  // AGREGAR ESTE MÉTODO DE DIAGNÓSTICO AL SyncController
  async debugSessionIssue() {
    try {
      console.log("🔍 INICIANDO DIAGNÓSTICO DE SESIONES...");

      // 1. Obtener TODAS las sesiones de IndexedDB
      const allSessions = await IndexedDBService.getAll(
        "sesiones_caja_offline"
      );
      console.log("📊 TOTAL SESIONES EN INDEXEDDB:", allSessions.length);

      // 2. Mostrar información de cada sesión
      allSessions.forEach((session, index) => {
        console.log(`📋 Sesión ${index + 1}:`, {
          id_local: session.id_local,
          id: session.id,
          estado: session.estado,
          vendedor_id: session.vendedor_id,
          sincronizado: session.sincronizado,
          fecha_apertura: session.fecha_apertura,
        });
      });

      // 3. Obtener TODOS los cierres pendientes
      const pendingClosures =
        await ClosuresOfflineController.getPendingClosures();
      console.log("📊 TOTAL CIERRES PENDIENTES:", pendingClosures.length);

      // 4. Mostrar información de cada cierre
      pendingClosures.forEach((closure, index) => {
        console.log(`💰 Cierre ${index + 1}:`, {
          id_local: closure.id_local,
          sesion_caja_id: closure.sesion_caja_id,
          total_ventas: closure.total_ventas,
          saldo_final_real: closure.saldo_final_real,
        });
      });

      // 5. Verificar sesiones específicas que están fallando
      const problematicSessions = [
        "ses_1761949546349_0qmn4p2ml",
        "ses_1761949771764_wjyd0il8e",
      ];

      for (const sessionId of problematicSessions) {
        console.log(`🔍 Buscando sesión específica: ${sessionId}`);
        const session = await SessionsOfflineController.getSessionById(
          sessionId
        );
        console.log(
          `📋 Resultado para ${sessionId}:`,
          session ? "ENCONTRADA" : "NO ENCONTRADA"
        );
      }

      return {
        totalSessions: allSessions.length,
        totalClosures: pendingClosures.length,
        sessionDetails: allSessions.map((s) => ({
          id_local: s.id_local,
          estado: s.estado,
          sincronizado: s.sincronizado,
        })),
        closureDetails: pendingClosures.map((c) => ({
          id_local: c.id_local,
          sesion_caja_id: c.sesion_caja_id,
        })),
      };
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      return { error: error.message };
    }
  }
  // ✅ SINCRONIZACIÓN DETALLADA DE SESIONES
  async syncPendingSessionsDetailed() {
    try {
      const pendingSessions =
        await SessionsOfflineController.getPendingSessions();

      const results = {
        total: pendingSessions.length,
        success: 0,
        failed: 0,
        details: [],
      };

      for (const session of pendingSessions) {
        try {
          let syncResult;

          if (session.estado === "abierta") {
            syncResult = await this.syncOpenSession(session);
          } else if (session.estado === "cerrada") {
            syncResult = await this.syncClosedSession(session);
          } else {
            results.details.push({
              id: session.id_local,
              type: "sesion",
              status: "failed",
              message: `Estado desconocido: ${session.estado}`,
              data: session,
            });
            results.failed++;
            continue;
          }

          if (syncResult && syncResult.success) {
            results.details.push({
              id: session.id_local,
              type: "sesion",
              status: "success",
              message: `Sesión ${session.estado} sincronizada`,
              data: session,
            });
            results.success++;
          } else {
            results.details.push({
              id: session.id_local,
              type: "sesion",
              status: "failed",
              message: syncResult?.error || "Error desconocido",
              data: session,
            });
            results.failed++;
          }
        } catch (error) {
          results.details.push({
            id: session.id_local,
            type: "sesion",
            status: "error",
            message: error.message,
            data: session,
          });
          results.failed++;
        }
      }

      return results;
    } catch (error) {
      console.error("❌ Error en syncPendingSessionsDetailed:", error);
      return {
        total: 0,
        success: 0,
        failed: 0,
        details: [],
        error: error.message,
      };
    }
  }
  // ✅ NUEVO MÉTODO: Diagnóstico de ventas pendientes
  async debugSalesIssue() {
    try {
      console.log("🔍 DIAGNÓSTICO DE VENTAS PENDIENTES...");

      const pendingSales = await SalesOfflineController.getPendingSales();
      console.log("📊 Ventas pendientes:", pendingSales.length);

      pendingSales.forEach((sale, index) => {
        console.log(`📦 Venta ${index + 1}:`, {
          id_local: sale.id_local,
          total: sale.total,
          productos: sale.productos?.length || 0,
          sincronizado: sale.sincronizado,
          sesion_caja_id: sale.sesion_caja_id,
        });
      });

      return {
        totalVentas: pendingSales.length,
        ventas: pendingSales.map((s) => ({
          id_local: s.id_local,
          sincronizado: s.sincronizado,
          total: s.total,
        })),
      };
    } catch (error) {
      console.error("❌ Error en diagnóstico de ventas:", error);
      return { error: error.message };
    }
  }
  // ✅ SINCRONIZACIÓN DETALLADA DE VENTAS
  // ✅ MÉTODO CORREGIDO - syncPendingSalesDetailed
  async syncPendingSalesDetailed() {
    try {
      const pendingSales = await SalesOfflineController.getPendingSales();

      console.log(
        `🔄 [SYNC] Ventas pendientes encontradas: ${pendingSales.length}`
      );

      const results = {
        total: pendingSales.length,
        success: 0,
        failed: 0,
        details: [],
      };

      for (const sale of pendingSales) {
        try {
          console.log(`🔄 Procesando venta: ${sale.id_local}`);

          // ✅ PASO CRÍTICO: OBTENER EL ID REAL DE LA SESIÓN EN EL SERVIDOR
          let sesionServerId = await this.getServerSessionId(
            sale.sesion_caja_id
          );

          if (!sesionServerId) {
            console.warn(
              `⚠️ No se encontró sesión del servidor para: ${sale.sesion_caja_id}`
            );
            results.failed++;
            results.details.push({
              id: sale.id_local,
              type: "venta",
              status: "failed",
              message: `Sesión no encontrada en servidor: ${sale.sesion_caja_id}`,
            });
            continue;
          }

          console.log(`🔄 Usando sesión del servidor: ${sesionServerId}`);

          // ✅ USAR URL DIRECTA PARA EVITAR process.env
          const apiUrl = "http://localhost:3000/api";
          const saleData = {
            sesion_caja_id: sesionServerId, // ✅ USAR ID DEL SERVIDOR, NO EL LOCAL
            vendedor_id: sale.vendedor_id,
            total: sale.total,
            metodo_pago: sale.metodo_pago,
            productos: sale.productos || [],
          };

          const response = await fetch(`${apiUrl}/ventas`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-token": localStorage.getItem("token"),
            },
            body: JSON.stringify(saleData),
          });

          if (response.ok) {
            const data = await response.json();

            // ✅ MARCAR COMO SINCRONIZADO
            await this.markAsSynced("ventas_pendientes", sale.id_local, {
              id: data.venta?.id,
              sincronizado: true,
            });

            results.success++;
            results.details.push({
              id: sale.id_local,
              type: "venta",
              status: "success",
              message: `Venta sincronizada: $${sale.total}`,
            });

            console.log(`✅ Venta sincronizada: ${sale.id_local}`);
          } else {
            const errorData = await response.json();
            results.failed++;
            results.details.push({
              id: sale.id_local,
              type: "venta",
              status: "failed",
              message: errorData.error || "Error del servidor",
            });

            console.error(`❌ Error sincronizando venta: ${errorData.error}`);
          }
        } catch (error) {
          results.failed++;
          results.details.push({
            id: sale.id_local,
            type: "venta",
            status: "error",
            message: error.message,
          });

          console.error(`❌ Error en venta ${sale.id_local}:`, error);
        }
      }

      console.log(
        `📊 RESULTADO VENTAS: ${results.success}/${results.total} exitosas`
      );
      return results;
    } catch (error) {
      console.error("❌ Error en syncPendingSalesDetailed:", error);
      return {
        total: 0,
        success: 0,
        failed: 0,
        details: [],
        error: error.message,
      };
    }
  }

  // ✅ AGREGAR ESTE MÉTODO PARA OBTENER EL ID DE SESIÓN DEL SERVIDOR
  async getServerSessionId(localSessionId) {
    try {
      console.log(`🔍 Buscando sesión del servidor para: ${localSessionId}`);

      // 1. Buscar en IndexedDB si ya tenemos el mapeo
      const session = await SessionsOfflineController.getSessionById(
        localSessionId
      );

      if (session && session.id) {
        console.log(`✅ Sesión ya tiene ID de servidor: ${session.id}`);
        return session.id;
      }

      // 2. Si no tiene ID, buscar en las sesiones sincronizadas
      const allSessions = await IndexedDBService.getAll(
        "sesiones_caja_offline"
      );
      const syncedSession = allSessions.find(
        (s) => s.id_local === localSessionId && s.sincronizado && s.id
      );

      if (syncedSession) {
        console.log(`✅ Sesión sincronizada encontrada: ${syncedSession.id}`);
        return syncedSession.id;
      }

      // 3. Si no existe, crear una sesión automáticamente
      console.log(`🔄 Creando sesión automática para venta...`);
      const newSessionResult = await this.createAutomaticSessionForSale(
        localSessionId
      );

      if (newSessionResult.success) {
        console.log(
          `✅ Sesión automática creada: ${newSessionResult.serverId}`
        );
        return newSessionResult.serverId;
      }

      return null;
    } catch (error) {
      console.error(`❌ Error obteniendo ID de sesión:`, error);
      return null;
    }
  }

  // ✅ MÉTODO PARA CREAR SESIÓN AUTOMÁTICA PARA VENTAS
  async createAutomaticSessionForSale(localSessionId) {
    try {
      // Obtener información básica de la sesión local
      const localSession = await SessionsOfflineController.getSessionById(
        localSessionId
      );

      const sessionData = {
        vendedor_id: localSession?.vendedor_id || "admin-1761319875580",
        saldo_inicial: 0,
        vendedor_nombre: localSession?.vendedor_nombre || "Vendedor Offline",
      };

      // Crear sesión en el servidor
      const response = await fetch(
        "http://localhost:3000/api/sesiones-caja/abrir",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-token": localStorage.getItem("token"),
          },
          body: JSON.stringify(sessionData),
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.sesion) {
          // Actualizar la sesión local con el ID del servidor
          await SessionsOfflineController.markAsSynced(localSessionId, {
            ...localSession,
            id: data.sesion.id,
            sincronizado: true,
          });

          return {
            success: true,
            serverId: data.sesion.id,
            message: "Sesión automática creada para venta",
          };
        }
      }

      throw new Error("No se pudo crear sesión automática");
    } catch (error) {
      console.error(`❌ Error creando sesión automática:`, error);
      return { success: false, error: error.message };
    }
  }
  // ✅ NUEVO MÉTODO: Sincronizar una sesión individual
  async syncSingleSession(sessionLocalId) {
    try {
      console.log(`🔄 Sincronizando sesión individual: ${sessionLocalId}`);

      const session = await SessionsOfflineController.getSessionById(
        sessionLocalId
      );
      if (!session) {
        throw new Error(`Sesión no encontrada: ${sessionLocalId}`);
      }

      // ✅ VERIFICAR PRIMERO SI LA SESIÓN YA ESTÁ SINCRONIZADA
      if (session.sincronizado && session.id) {
        console.log(`✅ Sesión YA sincronizada: ${session.id}`);
        return { success: true, serverId: session.id, alreadySynced: true };
      }

      // ✅ BUSCAR SESIÓN EXISTENTE EN SERVIDOR POR FECHA Y VENDEDOR
      const existingServerSession = await this.findExistingSessionOnServer(
        session
      );
      if (existingServerSession) {
        console.log(
          `✅ Sesión EXISTE en servidor: ${existingServerSession.id}`
        );

        // ✅ MARCAR COMO SINCRONIZADA EN LOCAL
        await SessionsOfflineController.markAsSynced(sessionLocalId, {
          ...session,
          id: existingServerSession.id,
          sincronizado: true,
          fecha_sincronizacion: new Date().toISOString(),
        });

        return {
          success: true,
          serverId: existingServerSession.id,
          existing: true,
        };
      }

      let syncResult;

      // ✅ CREAR NUEVA SESIÓN SOLO SI NO EXISTE
      if (session.estado === "abierta") {
        syncResult = await this.syncOpenSession(session);
      } else if (session.estado === "cerrada") {
        syncResult = await this.createClosedSession(session);
      } else {
        throw new Error(`Estado de sesión desconocido: ${session.estado}`);
      }

      if (syncResult.success) {
        // ✅ MARCAR COMO SINCRONIZADA INMEDIATAMENTE
        await SessionsOfflineController.markAsSynced(sessionLocalId, {
          ...session,
          id: syncResult.serverId,
          sincronizado: true,
          fecha_sincronizacion: new Date().toISOString(),
        });
      }

      return syncResult;
    } catch (error) {
      console.error(`❌ Error sincronizando sesión ${sessionLocalId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ NUEVO MÉTODO: Buscar sesión existente en servidor
  async findExistingSessionOnServer(localSession) {
    try {
      // Buscar por vendedor y fecha similar
      const fechaApertura = new Date(localSession.fecha_apertura)
        .toISOString()
        .split("T")[0];

      const response = await fetchConToken(
        `sesiones-caja/vendedor/${localSession.vendedor_id}?limite=50`
      );

      if (response && response.ok && response.sesiones) {
        const sesionesVendedor = response.sesiones;

        // Buscar sesión con misma fecha y estado
        const sessionFound = sesionesVendedor.find((s) => {
          const serverFecha = new Date(s.fecha_apertura)
            .toISOString()
            .split("T")[0];
          const mismaFecha = serverFecha === fechaApertura;
          const mismoEstado = s.estado === localSession.estado;
          const mismoSaldoInicial =
            Math.abs(s.saldo_inicial - localSession.saldo_inicial) < 0.01;

          return mismaFecha && mismoEstado && mismoSaldoInicial;
        });

        return sessionFound || null;
      }
      return null;
    } catch (error) {
      console.error("❌ Error buscando sesión existente:", error);
      return null;
    }
  }

  // ✅ NUEVO MÉTODO: Crear sesión para cierre
  async createSessionForClosure(session) {
    try {
      console.log(`🔄 Creando sesión para cierre: ${session.id_local}`);

      // Crear la sesión en el servidor
      const response = await fetchConToken(
        "sesiones-caja/abrir",
        {
          vendedor_id: session.vendedor_id,
          saldo_inicial: session.saldo_inicial || 0,
          vendedor_nombre: session.vendedor_nombre || "Vendedor Offline",
        },
        "POST"
      );

      if (response.ok && response.sesion) {
        const serverSessionId = response.sesion.id;

        // ✅ Cerrar la sesión inmediatamente (ya que viene de un cierre offline)
        const closeResponse = await fetchConToken(
          `sesiones-caja/cerrar/${serverSessionId}`,
          {
            saldo_final: session.saldo_final,
            observaciones:
              session.observaciones || "Sincronizado desde offline",
          },
          "PUT"
        );

        if (closeResponse.ok) {
          console.log(`✅ Sesión creada y cerrada: ${serverSessionId}`);

          return {
            success: true,
            serverId: serverSessionId,
            message: "Sesión creada y cerrada para cierre",
          };
        } else {
          throw new Error("Error cerrando sesión sincronizada");
        }
      } else {
        throw new Error(response?.error || "Error creando sesión");
      }
    } catch (error) {
      console.error(`❌ Error creando sesión para cierre:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ MÉTODO DE DEBUG PARA VERIFICAR SESIONES
  async debugSession(sessionLocalId) {
    try {
      const session = await SessionsOfflineController.getSessionById(
        sessionLocalId
      );
      console.log("🔍 DEBUG SESIÓN:", {
        id_local: session?.id_local,
        id: session?.id,
        estado: session?.estado,
        sincronizado: session?.sincronizado,
        vendedor_id: session?.vendedor_id,
      });
      return session;
    } catch (error) {
      console.error("❌ Error en debug:", error);
      return null;
    }
  }
  async syncPendingClosuresDetailed() {
    try {
      const pendingClosures =
        await ClosuresOfflineController.getPendingClosures();

      const results = {
        total: pendingClosures.length,
        success: 0,
        failed: 0,
        details: [],
      };

      console.log(
        `🔄 [SYNC] Procesando ${pendingClosures.length} cierres pendientes...`
      );

      for (const closure of pendingClosures) {
        try {
          console.log(`🔄 Procesando cierre: ${closure.id_local}`);

          // ✅ VERIFICAR PRIMERO SI EL CIERRE YA EXISTE EN EL SERVIDOR
          const existingClosure = await this.checkExistingClosure(closure);
          if (existingClosure) {
            console.log(
              `✅ Cierre ya existe en servidor, marcando como sincronizado: ${closure.id_local}`
            );
            await ClosuresOfflineController.markAsSynced(
              closure.id_local,
              existingClosure
            );
            results.success++;
            results.details.push({
              id: closure.id_local,
              type: "cierre",
              status: "success",
              message:
                "Cierre ya existía en servidor - marcado como sincronizado",
            });
            continue;
          }

          let sesionServerId = closure.sesion_caja_id;
          let sessionData = null;

          // ✅ ESTRATEGIA MEJORADA: Buscar sesión existente primero
          if (sesionServerId) {
            sessionData = await SessionsOfflineController.getSessionById(
              sesionServerId
            );

            if (sessionData) {
              console.log(`✅ Sesión local encontrada: ${sesionServerId}`);

              // Si la sesión ya está sincronizada, usar el ID del servidor
              if (sessionData.sincronizado && sessionData.id) {
                sesionServerId = sessionData.id;
                console.log(
                  `🔄 Usando ID de servidor existente: ${sesionServerId}`
                );
              } else {
                // ✅ SINCRONIZAR LA SESIÓN PRIMERO
                console.log(
                  `🔄 Sincronizando sesión primero: ${sesionServerId}`
                );
                const sessionSyncResult = await this.syncSingleSession(
                  sesionServerId
                );

                if (sessionSyncResult.success && sessionSyncResult.serverId) {
                  sesionServerId = sessionSyncResult.serverId;
                  console.log(`✅ Sesión sincronizada: ${sesionServerId}`);
                } else {
                  throw new Error(
                    `No se pudo sincronizar sesión: ${sessionSyncResult.error}`
                  );
                }
              }
            } else {
              console.log(`❌ Sesión local NO encontrada: ${sesionServerId}`);

              // ✅ BUSCAR SESIÓN ABIERTA EN EL SERVIDOR
              const serverOpenSession = await this.findOpenSessionOnServer(
                closure.vendedor_id
              );
              if (serverOpenSession) {
                sesionServerId = serverOpenSession.id;
                console.log(
                  `✅ Usando sesión abierta del servidor: ${sesionServerId}`
                );
              } else {
                throw new Error(`No se encontró sesión válida para el cierre`);
              }
            }
          }

          // ✅ VERIFICAR QUE TENEMOS UN ID VÁLIDO
          if (!sesionServerId) {
            throw new Error("No se pudo obtener ID de sesión válido");
          }

          console.log(
            `📤 Enviando cierre con sesion_caja_id: ${sesionServerId}`
          );

          // ✅ CREAR EL CIERRE EN EL SERVIDOR
          const response = await fetchConToken(
            "cierres",
            {
              sesion_caja_id: sesionServerId,
              total_ventas: closure.total_ventas || 0,
              total_efectivo: closure.total_efectivo || 0,
              total_tarjeta: closure.total_tarjeta || 0,
              total_transferencia: closure.total_transferencia || 0,
              ganancia_bruta: closure.ganancia_bruta || 0,
              saldo_final_teorico: closure.saldo_final_teorico || 0,
              saldo_final_real: closure.saldo_final_real,
              diferencia: closure.diferencia || 0,
              observaciones:
                closure.observaciones || "Sincronizado desde offline",
              vendedor_id: closure.vendedor_id,
            },
            "POST"
          );

          if (response && response.ok && response.cierre) {
            await ClosuresOfflineController.markAsSynced(
              closure.id_local,
              response.cierre
            );
            results.details.push({
              id: closure.id_local,
              type: "cierre",
              status: "success",
              message: `Cierre sincronizado exitosamente`,
            });
            results.success++;
            console.log(`✅ Cierre sincronizado: ${closure.id_local}`);
          } else {
            throw new Error(response?.error || "Error del servidor en cierre");
          }
        } catch (error) {
          console.error(
            `❌ Error sincronizando cierre ${closure.id_local}:`,
            error
          );
          results.details.push({
            id: closure.id_local,
            type: "cierre",
            status: "failed",
            message: error.message,
          });
          results.failed++;
        }
      }

      console.log(
        `📊 RESULTADO CIERRES: ${results.success}/${results.total} exitosos`
      );
      return results;
    } catch (error) {
      console.error("❌ Error en syncPendingClosuresDetailed:", error);
      return {
        total: 0,
        success: 0,
        failed: 0,
        details: [],
        error: error.message,
      };
    }
  }
  // ✅ NUEVO MÉTODO: Verificar si el cierre ya existe en el servidor
  async checkExistingClosure(closure) {
    try {
      // Buscar por fecha y monto similar
      const fechaCierre = new Date(closure.fecha_cierre)
        .toISOString()
        .split("T")[0];
      const response = await fetchConToken(`cierres?fecha=${fechaCierre}`);

      if (response && response.ok && response.cierres) {
        const cierresDelDia = response.cierres;

        // Buscar cierre con monto similar (±10%)
        const closureFound = cierresDelDia.find((c) => {
          const montoSimilar =
            Math.abs(c.total_ventas - closure.total_ventas) /
              closure.total_ventas <
            0.1;
          const mismaSesion = c.sesion_caja_id === closure.sesion_caja_id;
          return montoSimilar || mismaSesion;
        });

        return closureFound || null;
      }
      return null;
    } catch (error) {
      console.error("❌ Error verificando cierre existente:", error);
      return null;
    }
  }

  // ✅ NUEVO MÉTODO: Buscar sesión abierta en el servidor
  async findOpenSessionOnServer(vendedorId) {
    try {
      const response = await fetchConToken(
        `sesiones-caja/abierta?vendedor_id=${vendedorId}`
      );

      if (response && response.ok && response.sesion) {
        return response.sesion;
      }
      return null;
    } catch (error) {
      console.error("❌ Error buscando sesión abierta:", error);
      return null;
    }
  }

  // ✅ NUEVO MÉTODO: Sincronizar sesión individual mejorado
  async syncSingleSession(sessionLocalId) {
    try {
      console.log(`🔄 Sincronizando sesión individual: ${sessionLocalId}`);

      const session = await SessionsOfflineController.getSessionById(
        sessionLocalId
      );
      if (!session) {
        throw new Error(`Sesión no encontrada: ${sessionLocalId}`);
      }

      // ✅ VERIFICAR PRIMERO SI LA SESIÓN YA EXISTE EN EL SERVIDOR
      if (session.id) {
        console.log(`✅ Sesión ya tiene ID de servidor: ${session.id}`);
        return { success: true, serverId: session.id };
      }

      // ✅ VERIFICAR SI HAY SESIÓN ABIERTA EN EL SERVIDOR
      const serverOpenSession = await this.findOpenSessionOnServer(
        session.vendedor_id
      );
      if (serverOpenSession) {
        console.log(
          `✅ Usando sesión abierta existente: ${serverOpenSession.id}`
        );

        // Actualizar la sesión local con el ID del servidor
        await SessionsOfflineController.markAsSynced(sessionLocalId, {
          ...session,
          id: serverOpenSession.id,
          sincronizado: true,
        });

        return { success: true, serverId: serverOpenSession.id };
      }

      // ✅ SOLO CREAR NUEVA SESIÓN SI NO HAY UNA ABIERTA
      let syncResult;
      if (session.estado === "abierta") {
        syncResult = await this.syncOpenSession(session);
      } else if (session.estado === "cerrada") {
        // Para sesiones cerradas offline, usar la sesión abierta existente o crear una nueva
        if (serverOpenSession) {
          // Cerrar la sesión abierta existente
          const closeResponse = await fetchConToken(
            `sesiones-caja/cerrar/${serverOpenSession.id}`,
            {
              saldo_final: session.saldo_final,
              observaciones:
                session.observaciones || "Cerrada desde sincronización offline",
            },
            "PUT"
          );

          if (closeResponse?.ok) {
            syncResult = { success: true, serverId: serverOpenSession.id };
          } else {
            throw new Error("Error cerrando sesión existente");
          }
        } else {
          // Crear sesión ya cerrada
          syncResult = await this.createClosedSession(session);
        }
      }

      return syncResult;
    } catch (error) {
      console.error(
        `❌ Error sincronizando sesión individual ${sessionLocalId}:`,
        error
      );
      return { success: false, error: error.message };
    }
  }

  // ✅ NUEVO MÉTODO: Crear sesión ya cerrada
  async createClosedSession(session) {
    try {
      console.log(`🔄 Creando sesión cerrada: ${session.id_local}`);

      // 1. Crear sesión
      const createResponse = await fetchConToken(
        "sesiones-caja/abrir",
        {
          vendedor_id: session.vendedor_id,
          saldo_inicial: session.saldo_inicial || 0,
          vendedor_nombre: session.vendedor_nombre || "Vendedor Offline",
        },
        "POST"
      );

      if (createResponse.ok && createResponse.sesion) {
        const serverSessionId = createResponse.sesion.id;

        // 2. Cerrar inmediatamente
        const closeResponse = await fetchConToken(
          `sesiones-caja/cerrar/${serverSessionId}`,
          {
            saldo_final: session.saldo_final,
            observaciones:
              session.observaciones ||
              "Sincronizada desde offline - Sesión cerrada",
          },
          "PUT"
        );

        if (closeResponse?.ok) {
          console.log(`✅ Sesión cerrada creada: ${serverSessionId}`);
          return { success: true, serverId: serverSessionId };
        } else {
          throw new Error("Error cerrando sesión recién creada");
        }
      } else {
        throw new Error(createResponse?.error || "Error creando sesión");
      }
    } catch (error) {
      console.error(`❌ Error creando sesión cerrada:`, error);
      return { success: false, error: error.message };
    }
  }

  // En SyncController.js - AGREGAR MÉTODO DE LIMPIEZA
  async cleanupDuplicatePendingData() {
    try {
      console.log("🧹 Iniciando limpieza de datos duplicados pendientes...");

      const pendingClosures =
        await ClosuresOfflineController.getPendingClosures();
      const uniqueClosures = [];
      const seenClosures = new Set();

      // Eliminar cierres duplicados
      for (const closure of pendingClosures) {
        const closureKey = `${closure.sesion_caja_id}_${closure.total_ventas}_${closure.fecha_cierre}`;

        if (!seenClosures.has(closureKey)) {
          seenClosures.add(closureKey);
          uniqueClosures.push(closure);
        } else {
          // Eliminar duplicado
          await IndexedDBService.delete("cierres_pendientes", closure.id_local);
          console.log(`🗑️ Eliminado cierre duplicado: ${closure.id_local}`);
        }
      }

      console.log(
        `✅ Limpieza completada: ${
          pendingClosures.length - uniqueClosures.length
        } duplicados eliminados`
      );
      return {
        original: pendingClosures.length,
        final: uniqueClosures.length,
        removed: pendingClosures.length - uniqueClosures.length,
      };
    } catch (error) {
      console.error("❌ Error en limpieza de duplicados:", error);
      return { error: error.message };
    }
  }

  // ✅ NUEVO MÉTODO: Crear sesión automática para cierre
  async createAutomaticSessionForClosure(closure) {
    try {
      console.log(
        `🔄 Creando sesión automática para cierre: ${closure.id_local}`
      );

      // Crear datos básicos de sesión
      const sessionData = {
        vendedor_id: closure.vendedor_id,
        saldo_inicial: closure.saldo_final_real - (closure.total_ventas || 0), // Estimación
        vendedor_nombre: "Vendedor Offline", // Valor por defecto
        estado: "cerrada", // La creamos ya cerrada
        fecha_apertura: closure.fecha_cierre
          ? new Date(closure.fecha_cierre)
          : new Date(),
        fecha_cierre: closure.fecha_cierre || new Date().toISOString(),
        saldo_final: closure.saldo_final_real,
        observaciones: "Sesión automática creada para cierre offline",
      };

      // Crear sesión en el servidor
      const response = await fetchConToken(
        "sesiones-caja/abrir",
        {
          vendedor_id: sessionData.vendedor_id,
          saldo_inicial: sessionData.saldo_inicial,
          vendedor_nombre: sessionData.vendedor_nombre,
        },
        "POST"
      );

      if (response.ok && response.sesion) {
        const serverSessionId = response.sesion.id;

        // Cerrar la sesión inmediatamente
        const closeResponse = await fetchConToken(
          `sesiones-caja/cerrar/${serverSessionId}`,
          {
            saldo_final: sessionData.saldo_final,
            observaciones: sessionData.observaciones,
          },
          "PUT"
        );

        if (closeResponse.ok) {
          console.log(
            `✅ Sesión automática creada y cerrada: ${serverSessionId}`
          );
          return {
            success: true,
            serverId: serverSessionId,
            message: "Sesión automática creada exitosamente",
          };
        } else {
          throw new Error("Error cerrando sesión automática");
        }
      } else {
        throw new Error(response?.error || "Error creando sesión automática");
      }
    } catch (error) {
      console.error(`❌ Error creando sesión automática:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ OBTENER DETALLES COMPLETOS DE DATOS PENDIENTES
  async getPendingDetails() {
    try {
      const [pendingSessions, pendingSales, pendingClosures] =
        await Promise.all([
          SessionsOfflineController.getPendingSessions(),
          SalesOfflineController.getPendingSales(),
          ClosuresOfflineController.getPendingClosures(),
        ]);

      return {
        sessions: pendingSessions.map((session) => ({
          id: session.id_local,
          type: "sesion",
          estado: session.estado,
          descripcion: `Sesión ${session.estado} - ${
            session.vendedor_nombre || "Vendedor"
          }`,
          fecha: session.fecha_apertura || session.fecha_cierre,
          data: session,
        })),
        sales: pendingSales.map((sale) => ({
          id: sale.id_local,
          type: "venta",
          descripcion: `Venta - $${sale.total} - ${
            sale.productos?.length || 0
          } productos`,
          fecha: sale.fecha_venta,
          data: sale,
        })),
        closures: pendingClosures.map((closure) => ({
          id: closure.id_local,
          type: "cierre",
          descripcion: `Cierre - $${closure.total_ventas} - Sesión ${closure.sesion_caja_id}`,
          fecha: closure.fecha_cierre,
          data: closure,
        })),
      };
    } catch (error) {
      console.error("❌ Error obteniendo detalles pendientes:", error);
      return {
        sessions: [],
        sales: [],
        closures: [],
        error: error.message,
      };
    }
  }

  // ✅ MÉTODOS EXISTENTES MEJORADOS (mantener los que ya tienes)
  async syncMasterData() {
    try {
      const [productosResponse, categoriasResponse] = await Promise.all([
        fetchConToken("productos"),
        fetchConToken("categorias"),
      ]);

      if (productosResponse?.ok && categoriasResponse?.ok) {
        const productos = productosResponse.productos || [];
        const categorias = categoriasResponse.categorias || [];

        await IndexedDBService.clear("productos");
        await IndexedDBService.clear("categorias");

        for (const producto of productos) {
          await IndexedDBService.add("productos", producto);
        }

        for (const categoria of categorias) {
          await IndexedDBService.add("categorias", categoria);
        }

        return {
          success: true,
          productos: productos.length,
          categorias: categorias.length,
        };
      } else {
        return {
          success: false,
          error: "Error obteniendo datos maestros",
        };
      }
    } catch (error) {
      console.error("❌ Error sincronizando datos maestros:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ CORREGIR syncOpenSession
  async syncOpenSession(sesion) {
    try {
      console.log(`🔄 Sincronizando sesión abierta: ${sesion.id_local}`);

      const response = await fetchConToken(
        "sesiones-caja/abrir", // ✅ ENDPOINT CORRECTO
        {
          vendedor_id: sesion.vendedor_id,
          saldo_inicial: sesion.saldo_inicial,
          vendedor_nombre: sesion.vendedor_nombre,
        },
        "POST"
      );

      if (response.ok && response.sesion) {
        await this.markAsSynced("sesiones_caja_offline", sesion.id_local, {
          id: response.sesion.id,
          sincronizado: true,
        });

        console.log(
          `✅ Sesión sincronizada: ${sesion.id_local} -> ${response.sesion.id}`
        );
        return { success: true };
      } else {
        throw new Error(response.error || "Error del servidor");
      }
    } catch (error) {
      console.error(`❌ Error sincronizando sesión:`, error);
      return { success: false, error: error.message };
    }
  }
  // ✅ CORREGIR markAsSynced en SyncController
  async markAsSynced(storeName, localId, serverData = {}) {
    try {
      console.log(`🔄 Marcando como sincronizado: ${storeName} - ${localId}`);

      const record = await IndexedDBService.get(storeName, localId);
      if (!record) {
        console.warn(`⚠️ Registro no encontrado: ${storeName} - ${localId}`);
        return false;
      }

      const updatedRecord = {
        ...record,
        ...serverData,
        sincronizado: true,
        fecha_sincronizacion: new Date().toISOString(),
      };

      const result = await IndexedDBService.put(storeName, updatedRecord);

      if (result) {
        console.log(
          `✅ Registro marcado como sincronizado: ${storeName} - ${localId}`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error marcando como sincronizado:`, error);
      return false;
    }
  }
  // ✅ MÉTODO CORREGIDO: syncClosedSession
  async syncClosedSession(session) {
    try {
      console.log(`🔄 Sincronizando sesión cerrada: ${session.id_local}`);

      let serverSessionId = session.id;

      // ✅ ESTRATEGIA: Si no tiene ID de servidor, crear la sesión primero
      if (!serverSessionId) {
        console.log(`📝 Sesión offline sin ID de servidor, creando primero...`);

        const createResult = await this.createSessionForClosure(session);

        if (createResult.success) {
          serverSessionId = createResult.serverId;
          console.log(`✅ Sesión creada en servidor: ${serverSessionId}`);
        } else {
          throw new Error(`No se pudo crear sesión: ${createResult.error}`);
        }
      }

      // ✅ AHORA sí podemos cerrar la sesión con el ID correcto
      const response = await fetchConToken(
        `sesiones-caja/cerrar/${serverSessionId}`,
        {
          saldo_final: session.saldo_final,
          observaciones: session.observaciones || "Sincronizado desde offline",
        },
        "PUT"
      );

      if (response?.ok) {
        // ✅ Actualizar la sesión local con el ID del servidor
        await SessionsOfflineController.markAsSynced(session.id_local, {
          ...session,
          id: serverSessionId,
          sincronizado: true,
        });

        console.log(
          `✅ Sesión cerrada sincronizada: ${session.id_local} -> ${serverSessionId}`
        );
        return { success: true };
      } else {
        throw new Error(
          response?.error || "Error del servidor al cerrar sesión"
        );
      }
    } catch (error) {
      console.error(
        `❌ Error sincronizando sesión cerrada ${session.id_local}:`,
        error
      );
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
        lastSync: localStorage.getItem("lastSuccessfulSync") || null,
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

  startAutoSyncListener() {
    const handleOnline = async () => {
      console.log(
        "🌐 Conexión detectada - Iniciando auto-sync en 5 segundos..."
      );

      // Esperar 5 segundos para que la conexión sea estable
      setTimeout(async () => {
        try {
          const status = await this.getSyncStatus();
          if (status.totalPending > 0) {
            console.log(
              `🔄 Auto-sync iniciado con ${status.totalPending} pendientes`
            );
            await this.fullSync();
          }
        } catch (error) {
          console.error("❌ Error en auto-sync:", error);
        }
      }, 5000);
    };

    window.addEventListener("online", handleOnline);
  }
}

export default new SyncController();
