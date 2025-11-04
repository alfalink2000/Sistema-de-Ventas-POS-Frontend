// src/controllers/offline/SyncController/SyncController.js - VERSIÓN CORREGIDA
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import SalesOfflineController from "../SalesOfflineController/SalesOfflineController";
import SessionsOfflineController from "../SessionsOfflineController/SessionsOfflineController";
import ClosuresOfflineController from "../ClosuresOfflineController/ClosuresOfflineController";
import InventoryOfflineController from "../InventoryOfflineController/InventoryOfflineController";
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

  // ✅ REEMPLAZAR CON ESTE MÉTODO MEJORADO:
  async fullSync() {
    if (!this.isOnline) {
      return {
        success: false,
        error: "Sin conexión a internet",
        silent: true,
      };
    }

    // ✅ LIMPIAR DUPLICADOS ANTES DE SINCRONIZAR
    await this.cleanupDuplicatePendingData();

    if (this.isSyncing) {
      return {
        success: false,
        error: "Sincronización en progreso",
        silent: true,
      };
    }

    this.isSyncing = true;
    this.notifyListeners("sync_start");

    const syncResults = {
      startTime: Date.now(),
      steps: {},
      errors: [],
      warnings: [],
    };

    try {
      console.log("🔄 INICIANDO SINCRONIZACIÓN RESILIENTE...");

      // ✅ SINCRONIZAR EN ORDEN PERO CON MANEJO DE ERRORES INDEPENDIENTE
      const syncSteps = [
        { name: "masterData", method: () => this.syncMasterData() },
        { name: "products", method: () => this.syncPendingProductsDetailed() },
        { name: "sessions", method: () => this.syncPendingSessionsDetailed() },
        { name: "sales", method: () => this.syncPendingSalesDetailed() },
        { name: "stock", method: () => this.syncPendingStockUpdates() },
        { name: "closures", method: () => this.syncPendingClosuresDetailed() },
      ];

      for (const step of syncSteps) {
        try {
          console.log(`🔄 Ejecutando paso: ${step.name}`);
          syncResults.steps[step.name] = await step.method();

          if (syncResults.steps[step.name]?.error) {
            syncResults.warnings.push(
              `Paso ${step.name} completado con errores: ${
                syncResults.steps[step.name].error
              }`
            );
          }
        } catch (stepError) {
          console.error(`❌ Error en paso ${step.name}:`, stepError);
          syncResults.steps[step.name] = { error: stepError.message };
          syncResults.warnings.push(
            `Error en ${step.name}: ${stepError.message}`
          );
          // ✅ CONTINUAR CON EL SIGUIENTE PASO EN LUGAR DE DETENERSE
        }
      }

      // ✅ VERIFICAR SI HAY VENTAS HUÉRFANAS Y CREAR SESIONES DE EMERGENCIA
      await this.handleOrphanSales();

      syncResults.duration = Date.now() - syncResults.startTime;

      // ✅ CONSIDERAR ÉXITO SI AL MENOS ALGO SE SINCRONIZÓ
      const successfulSteps = Object.values(syncResults.steps).filter(
        (step) => step && !step.error && step.success !== false
      ).length;

      syncResults.success = successfulSteps > 0;
      syncResults.successfulSteps = successfulSteps;
      syncResults.totalSteps = syncSteps.length;

      if (syncResults.success) {
        localStorage.setItem("lastSuccessfulSync", new Date().toISOString());
        console.log(
          `🎉 SINCRONIZACIÓN PARCIALMENTE EXITOSA: ${successfulSteps}/${syncSteps.length} pasos`
        );
      } else {
        console.warn("⚠️ SINCRONIZACIÓN CON ERRORES MAYORITARIOS");
      }

      this.notifyListeners("sync_complete", syncResults);
      return syncResults;
    } catch (error) {
      syncResults.duration = Date.now() - syncResults.startTime;
      syncResults.success = false;
      syncResults.error = error.message;
      syncResults.errors.push(error.message);

      console.error("❌ ERROR CRÍTICO EN SINCRONIZACIÓN:", error);
      this.notifyListeners("sync_error", syncResults);

      return syncResults;
    } finally {
      this.isSyncing = false;
    }
  }

  async syncPendingSalesDetailed() {
    try {
      console.log("🔄 [SYNC] Iniciando sincronización de ventas pendientes...");

      const ventasPendientes = await SalesOfflineController.getPendingSales();

      if (ventasPendientes.length === 0) {
        console.log("✅ No hay ventas pendientes para sincronizar");
        return {
          total: 0,
          exitosas: 0,
          fallidas: 0,
          resultados: [],
        };
      }

      console.log(
        `📦 [SYNC] ${ventasPendientes.length} ventas pendientes encontradas`
      );

      // ✅ PREPARAR SESIÓN ÚNICA PARA TODAS LAS VENTAS
      const sesionActivaId = await this.obtenerSesionActivaParaSincronizacion();

      if (!sesionActivaId) {
        console.warn(
          "⚠️ No se pudo obtener sesión activa, algunas ventas podrían fallar"
        );
      }

      const resultados = await this.procesarVentasEnLote(
        ventasPendientes,
        sesionActivaId
      );

      console.log(
        `📊 [SYNC] Resultado: ${resultados.exitosas}/${resultados.total} exitosas`
      );
      return resultados;
    } catch (error) {
      console.error("❌ [SYNC] Error en syncPendingSalesDetailed:", error);
      return {
        total: 0,
        exitosas: 0,
        fallidas: 0,
        resultados: [],
        error: error.message,
      };
    }
  }

  // ✅ NUEVO MÉTODO AUXILIAR PARA PROCESAMIENTO POR LOTES
  async procesarVentasEnLote(ventasPendientes, sesionActivaId) {
    const resultados = {
      total: ventasPendientes.length,
      exitosas: 0,
      fallidas: 0,
      detalles: [],
    };

    for (const venta of ventasPendientes) {
      try {
        const resultado = await this.procesarVentaIndividual(
          venta,
          sesionActivaId
        );

        if (resultado.success) {
          resultados.exitosas++;
        } else {
          resultados.fallidas++;
        }

        resultados.detalles.push(resultado);
      } catch (error) {
        resultados.fallidas++;
        resultados.detalles.push({
          id_local: venta.id_local,
          success: false,
          error: error.message,
        });
      }
    }

    return resultados;
  }

  // ✅ NUEVO MÉTODO PARA PROCESAR VENTA INDIVIDUAL
  async procesarVentaIndividual(venta, sesionActivaId) {
    console.log(`🔄 Procesando venta: ${venta.id_local}`);

    // ✅ PREPARAR DATOS DE FORMA SEGURA
    const ventaData = this.prepararDatosVenta(venta, sesionActivaId);

    if (!ventaData) {
      return {
        id_local: venta.id_local,
        success: false,
        error: "No se pudieron preparar los datos de la venta",
      };
    }

    // ✅ VALIDAR DATOS ANTES DE ENVIAR
    const validacion = this.validarDatosVenta(ventaData);
    if (!validacion.esValida) {
      return {
        id_local: venta.id_local,
        success: false,
        error: `Datos inválidos: ${validacion.errores.join(", ")}`,
      };
    }

    // ✅ ENVIAR AL SERVIDOR
    const response = await fetchConToken("ventas", ventaData, "POST");

    if (response && response.ok === true) {
      // ✅ ELIMINAR VENTA LOCAL SOLO SI SE CREÓ EN SERVIDOR
      await SalesOfflineController.deletePendingSale(venta.id_local);

      console.log(
        `✅ Venta sincronizada: ${venta.id_local} -> ${response.venta?.id}`
      );

      return {
        id_local: venta.id_local,
        id_servidor: response.venta?.id,
        success: true,
      };
    } else {
      const errorMsg = response?.error || response?.msg || "Error del servidor";
      console.error(
        `❌ Error sincronizando venta ${venta.id_local}:`,
        errorMsg
      );

      return {
        id_local: venta.id_local,
        success: false,
        error: errorMsg,
      };
    }
  }

  // ✅ MÉTODO PARA PREPARAR DATOS DE VENTA
  prepararDatosVenta(venta, sesionActivaId) {
    try {
      const ventaData = { ...venta };

      // ✅ USAR SESIÓN ACTIVA O LA ORIGINAL
      ventaData.sesion_id = sesionActivaId || venta.sesion_id;

      // ✅ ELIMINAR CAMPOS LOCALES
      const camposLocales = [
        "id_local",
        "sincronizado",
        "timestamp",
        "es_local",
        "id_servidor",
      ];
      camposLocales.forEach((campo) => delete ventaData[campo]);

      // ✅ VALIDAR PRODUCTOS
      if (
        !ventaData.productos ||
        !Array.isArray(ventaData.productos) ||
        ventaData.productos.length === 0
      ) {
        console.warn(`⚠️ Venta ${venta.id_local} no tiene productos válidos`);
        return null;
      }

      // ✅ ASEGURAR FECHA VÁLIDA
      if (
        !ventaData.fecha_venta ||
        !this.esFechaValida(ventaData.fecha_venta)
      ) {
        ventaData.fecha_venta = new Date().toISOString();
      }

      return ventaData;
    } catch (error) {
      console.error(
        `❌ Error preparando datos de venta ${venta.id_local}:`,
        error
      );
      return null;
    }
  }

  // ✅ MÉTODO PARA VALIDAR DATOS
  validarDatosVenta(ventaData) {
    const errores = [];

    if (!ventaData.sesion_id) {
      errores.push("Sesión ID requerida");
    }

    if (!ventaData.total || ventaData.total <= 0) {
      errores.push("Total debe ser mayor a 0");
    }

    if (!ventaData.vendedor_id) {
      errores.push("Vendedor ID requerido");
    }

    if (!ventaData.productos || ventaData.productos.length === 0) {
      errores.push("Debe tener al menos un producto");
    }

    return {
      esValida: errores.length === 0,
      errores: errores,
    };
  }

  // ✅ MÉTODO AUXILIAR PARA VALIDAR FECHAS
  esFechaValida(fechaString) {
    if (!fechaString) return false;
    const fecha = new Date(fechaString);
    return fecha instanceof Date && !isNaN(fecha);
  }

  // ✅ AGREGAR ESTE MÉTODO PARA MANEJAR VENTAS HUÉRFANAS
  async handleOrphanSales() {
    try {
      console.log("🔍 Buscando ventas huérfanas...");

      const pendingSales = await SalesOfflineController.getPendingSales();
      const orphanSales = pendingSales.filter((sale) => {
        // Ventas sin sesión válida o con sesión que no existe en servidor
        return !sale.sesion_caja_id || sale.sesion_caja_id.includes("_");
      });

      if (orphanSales.length > 0) {
        console.log(`🆘 Encontradas ${orphanSales.length} ventas huérfanas`);

        for (const sale of orphanSales) {
          await this.createEmergencySessionForSale(sale);
        }
      }

      return { processed: orphanSales.length };
    } catch (error) {
      console.error("❌ Error manejando ventas huérfanas:", error);
      return { error: error.message };
    }
  }

  // ✅ AGREGAR ESTE MÉTODO PARA SESIONES DE EMERGENCIA
  async createEmergencySessionForSale(sale) {
    try {
      console.log(
        `🆘 Creando sesión de emergencia para venta: ${sale.id_local}`
      );

      const emergencySession = {
        vendedor_id: sale.vendedor_id || "emergency_user",
        saldo_inicial: 0,
        vendedor_nombre: "Sistema de Emergencia",
        estado: "cerrada",
        es_emergencia: true,
      };

      // Usar el controller de sesiones para crear la sesión
      const sessionResult = await SessionsOfflineController.openSession(
        emergencySession
      );

      if (sessionResult.success) {
        // Cerrar inmediatamente la sesión de emergencia
        await SessionsOfflineController.closeSession(sessionResult.id_local, {
          saldo_final: sale.total || 0,
          observaciones: "Sesión automática para venta huérfana",
        });

        // Actualizar la venta con la nueva sesión
        sale.sesion_caja_id = sessionResult.id_local;
        await SalesOfflineController.updateSaleSession(
          sale.id_local,
          sessionResult.id_local
        );

        console.log(
          `✅ Sesión de emergencia creada: ${sessionResult.id_local}`
        );
        return { success: true, sessionId: sessionResult.id_local };
      }

      return { success: false, error: "No se pudo crear sesión de emergencia" };
    } catch (error) {
      console.error(`❌ Error creando sesión de emergencia:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ AGREGAR ESTE MÉTODO PARA ACTUALIZAR SESIÓN DE VENTA
  async updateSaleSession(saleLocalId, newSessionId) {
    try {
      const sale = await SalesOfflineController.getSaleById(saleLocalId);
      if (sale) {
        sale.sesion_caja_id = newSessionId;
        await IndexedDBService.put("ventas_pendientes", sale);
        console.log(
          `✅ Ventas ${saleLocalId} actualizada con sesión ${newSessionId}`
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error actualizando sesión de venta:`, error);
      return false;
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
  // SyncController.js - AGREGAR ESTAS FUNCIONES NUEVAS

  // ✅ FUNCIÓN DE DIAGNÓSTICO DE SESIONES
  async diagnosticarSesionesVentas() {
    try {
      console.group("🔍 DIAGNÓSTICO SESIONES DE VENTAS PENDIENTES");

      const ventasPendientes = await SalesOfflineController.getPendingSales();
      console.log(`📦 Total ventas pendientes: ${ventasPendientes.length}`);

      const sesionesUnicas = new Set();

      for (const venta of ventasPendientes) {
        if (venta.sesion_id) {
          sesionesUnicas.add(venta.sesion_id);
          console.log(
            `📋 Venta ${venta.id_local} - Sesión: ${venta.sesion_id}`
          );
        } else {
          console.log(`📋 Venta ${venta.id_local} - SIN SESIÓN`);
        }
      }

      console.log(
        `💰 Sesiones únicas encontradas: ${Array.from(sesionesUnicas)}`
      );

      // Verificar estado de cada sesión en el servidor
      for (const sesionId of sesionesUnicas) {
        try {
          const sesionResponse = await fetchConToken(
            `sesiones-caja/${sesionId}`
          );
          console.log(
            `🔍 Sesión ${sesionId}:`,
            sesionResponse.ok
              ? `✅ EXISTE (Estado: ${sesionResponse.sesion?.estado})`
              : "❌ NO EXISTE"
          );
        } catch (error) {
          console.log(`🔍 Sesión ${sesionId}: ❌ ERROR - ${error.message}`);
        }
      }

      console.groupEnd();
      return Array.from(sesionesUnicas);
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      return [];
    }
  }

  // ✅ FUNCIÓN PARA OBTENER SESIÓN ACTIVA
  async obtenerSesionActivaParaSincronizacion() {
    try {
      console.log("🔍 Buscando sesión activa para sincronización...");

      // 1. INTENTAR OBTENER SESIÓN ABIERTA EXISTENTE
      try {
        const sesionAbiertaResponse = await fetchConToken(
          "sesiones-caja/abierta"
        );
        if (sesionAbiertaResponse.ok && sesionAbiertaResponse.sesion) {
          console.log(
            "✅ Usando sesión abierta existente:",
            sesionAbiertaResponse.sesion.id
          );
          return sesionAbiertaResponse.sesion.id;
        }
      } catch (error) {
        console.log("ℹ️ No hay sesión abierta existente:", error.message);
      }

      // 2. CREAR NUEVA SESIÓN PARA SINCRONIZACIÓN
      console.log("🆕 Creando nueva sesión para sincronización...");
      const sessionData = {
        fecha_apertura: new Date().toISOString(),
        monto_inicial: 0,
        observaciones:
          "Sesión automática para sincronizar ventas pendientes offline",
        vendedor_id: "default",
      };

      const response = await fetchConToken(
        "sesiones-caja/abrir",
        sessionData,
        "POST"
      );

      if (response.ok && response.sesion) {
        console.log(
          "✅ Nueva sesión creada para sincronización:",
          response.sesion.id
        );
        return response.sesion.id;
      } else {
        throw new Error(response?.error || "Error creando sesión");
      }
    } catch (error) {
      console.error("❌ Error obteniendo sesión activa:", error);
      throw error;
    }
  }

  // ✅ FUNCIÓN PARA PREPARAR VENTA CON SESIÓN ACTUAL
  async prepararVentaConSesionActual(venta, sesionActivaId) {
    try {
      console.log(`🔧 Preparando venta ${venta.id_local} con sesión actual...`);

      // CREAR COPIA SEGURA DE LA VENTA
      const ventaData = { ...venta };

      // ELIMINAR CAMPOS LOCALES
      delete ventaData.id_local;
      delete ventaData.sincronizado;
      delete ventaData.timestamp;
      delete ventaData.es_local;

      // REASIGNAR A SESIÓN ACTIVA ACTUAL
      ventaData.sesion_id = sesionActivaId;
      console.log(
        `🔄 Reasignando sesión: ${
          venta.sesion_id || "Ninguna"
        } -> ${sesionActivaId}`
      );

      // VERIFICAR QUE HAY PRODUCTOS VÁLIDOS
      if (!ventaData.productos || ventaData.productos.length === 0) {
        console.error(`❌ Venta ${venta.id_local} no tiene productos`);
        return null;
      }

      console.log(`📦 Venta tiene ${ventaData.productos.length} productos`);

      // ASEGURAR FECHA VÁLIDA
      if (!ventaData.fecha_venta || ventaData.fecha_venta.includes("Invalid")) {
        ventaData.fecha_venta = new Date().toISOString();
      }

      return ventaData;
    } catch (error) {
      console.error(`❌ Error preparando venta ${venta.id_local}:`, error);
      return null;
    }
  }

  // ✅ NUEVA FUNCIÓN: OBTENER SESIÓN ACTIVA ACTUAL
  async obtenerSesionActivaParaSincronizacion() {
    try {
      console.log("🔍 Buscando sesión activa para sincronización...");

      // 1. INTENTAR OBTENER SESIÓN ABIERTA EXISTENTE
      try {
        const sesionAbiertaResponse = await fetchConToken(
          "sesiones-caja/abierta"
        );
        if (sesionAbiertaResponse.ok && sesionAbiertaResponse.sesion) {
          console.log(
            "✅ Usando sesión abierta existente:",
            sesionAbiertaResponse.sesion.id
          );
          return sesionAbiertaResponse.sesion.id;
        }
      } catch (error) {
        console.log("ℹ️ No hay sesión abierta existente:", error.message);
      }

      // 2. CREAR NUEVA SESIÓN PARA SINCRONIZACIÓN
      console.log("🆕 Creando nueva sesión para sincronización...");
      const sessionData = {
        fecha_apertura: new Date().toISOString(),
        monto_inicial: 0,
        observaciones:
          "Sesión automática para sincronizar ventas pendientes offline",
        vendedor_id: "default", // O obtener del usuario actual
      };

      const response = await fetchConToken(
        "sesiones-caja/abrir",
        sessionData,
        "POST"
      );

      if (response.ok && response.sesion) {
        console.log(
          "✅ Nueva sesión creada para sincronización:",
          response.sesion.id
        );
        return response.sesion.id;
      } else {
        throw new Error(response?.error || "Error creando sesión");
      }
    } catch (error) {
      console.error("❌ Error obteniendo sesión activa:", error);
      throw error;
    }
  }
  // Función para sincronizar ventas individuales con diagnóstico detallado
  async sincronizarVentaIndividual(ventaIdLocal) {
    try {
      console.group(`🔍 SINCRONIZACIÓN INDIVIDUAL: ${ventaIdLocal}`);

      const ventasPendientes = await SalesOfflineController.getPendingSales();
      const venta = ventasPendientes.find((v) => v.id_local === ventaIdLocal);

      if (!venta) {
        console.error("❌ Venta no encontrada");
        return { success: false, error: "Venta no encontrada" };
      }

      console.log("📋 Datos de la venta:", {
        id_local: venta.id_local,
        sesion_original: venta.sesion_id,
        productos: venta.productos,
        fecha: venta.fecha_venta,
      });

      // Obtener sesión activa
      const sesionActivaId = await obtenerSesionActivaParaSincronizacion();

      // Preparar venta
      const ventaData = await prepararVentaConSesionActual(
        venta,
        sesionActivaId
      );

      if (!ventaData) {
        return { success: false, error: "No se pudo preparar la venta" };
      }

      console.log("📤 Enviando venta individual...");
      const response = await fetchConToken("ventas", ventaData, "POST");

      if (response && response.ok === true) {
        await SalesOfflineController.deletePendingSale(venta.id_local);
        console.log("✅ Venta sincronizada exitosamente");
        return { success: true, venta: response.venta };
      } else {
        console.error("❌ Error del servidor:", response?.error);
        return { success: false, error: response?.error };
      }
    } catch (error) {
      console.error("❌ Error en sincronización individual:", error);
      return { success: false, error: error.message };
    } finally {
      console.groupEnd();
    }
  }
  // ✅ NUEVA FUNCIÓN: PREPARAR VENTA CON SESIÓN ACTUAL
  async prepararVentaConSesionActual(venta, sesionActivaId) {
    try {
      console.log(`🔧 Preparando venta ${venta.id_local} con sesión actual...`);

      // ✅ CREAR COPIA SEGURA DE LA VENTA
      const ventaData = { ...venta };

      // ✅ ELIMINAR CAMPOS LOCALES
      delete ventaData.id_local;
      delete ventaData.sincronizado;
      delete ventaData.timestamp;
      delete ventaData.es_local;

      // ✅ REASIGNAR A SESIÓN ACTIVA ACTUAL
      ventaData.sesion_id = sesionActivaId;
      console.log(
        `🔄 Reasignando sesión: ${
          venta.sesion_id || "Ninguna"
        } -> ${sesionActivaId}`
      );

      // ✅ VERIFICAR QUE HAY PRODUCTOS VÁLIDOS
      if (!ventaData.productos || ventaData.productos.length === 0) {
        console.error(`❌ Venta ${venta.id_local} no tiene productos`);
        return null;
      }

      // ✅ VALIDAR PRODUCTOS (OPCIONAL - EL SERVIDOR DEBE MANEJARLO)
      console.log(`📦 Venta tiene ${ventaData.productos.length} productos`);

      // ✅ ASEGURAR FECHA VÁLIDA
      if (!ventaData.fecha_venta || ventaData.fecha_venta.includes("Invalid")) {
        ventaData.fecha_venta = new Date().toISOString();
      }

      return ventaData;
    } catch (error) {
      console.error(`❌ Error preparando venta ${venta.id_local}:`, error);
      return null;
    }
  }

  // Agregar esta función en SyncController.js
  async diagnosticarSesionesVentas() {
    try {
      console.group("🔍 DIAGNÓSTICO SESIONES DE VENTAS PENDIENTES");

      const ventasPendientes = await SalesOfflineController.getPendingSales();
      console.log(`📦 Total ventas pendientes: ${ventasPendientes.length}`);

      const sesionesUnicas = new Set();

      for (const venta of ventasPendientes) {
        if (venta.sesion_id) {
          sesionesUnicas.add(venta.sesion_id);
          console.log(
            `📋 Venta ${venta.id_local} - Sesión: ${venta.sesion_id}`
          );
        } else {
          console.log(`📋 Venta ${venta.id_local} - SIN SESIÓN`);
        }
      }

      console.log(
        `💰 Sesiones únicas encontradas: ${Array.from(sesionesUnicas)}`
      );

      // Verificar estado de cada sesión en el servidor
      for (const sesionId of sesionesUnicas) {
        try {
          const sesionResponse = await fetchConToken(
            `sesiones-caja/${sesionId}`
          );
          console.log(
            `🔍 Sesión ${sesionId}:`,
            sesionResponse.ok
              ? `✅ EXISTE (Estado: ${sesionResponse.sesion?.estado})`
              : "❌ NO EXISTE"
          );
        } catch (error) {
          console.log(`🔍 Sesión ${sesionId}: ❌ ERROR - ${error.message}`);
        }
      }

      console.groupEnd();
      return Array.from(sesionesUnicas);
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      return [];
    }
  }
  // SyncController.js - VERSIÓN CORREGIDA CON RUTAS EXACTAS
  async createAutomaticSessionForSale(venta) {
    try {
      console.log("🔄 [SYNC] Creando sesión automática para venta...", venta);

      // ✅ VERIFICAR SESIÓN ABIERTA CON RUTA CORRECTA: /abierta (no /abiertas)
      let sesionAbierta = null;

      try {
        console.log("🔍 Buscando sesión abierta en /api/sesiones-caja/abierta");
        const response = await fetchConToken("sesiones-caja/abierta");

        if (response.ok && response.sesion) {
          sesionAbierta = response.sesion;
          console.log("✅ [SYNC] Sesión abierta encontrada:", sesionAbierta.id);
          return sesionAbierta.id;
        }
      } catch (error) {
        console.log(
          "⚠️ No hay sesión abierta o error al obtenerla:",
          error.message
        );
      }

      // ✅ SI NO HAY SESIÓN ABIERTA, CREAR UNA NUEVA
      try {
        console.log("🆕 Creando nueva sesión automática...");
        const sessionData = {
          fecha_apertura: new Date().toISOString(),
          monto_inicial: 0,
          observaciones:
            "Sesión automática creada para sincronizar ventas pendientes",
          vendedor_id: venta.vendedor_id || "default", // Usar vendedor de la venta o uno por defecto
        };

        const response = await fetchConToken(
          "sesiones-caja/abrir",
          sessionData,
          "POST"
        );

        if (response.ok && response.sesion) {
          console.log(
            "✅ [SYNC] Sesión automática creada:",
            response.sesion.id
          );
          return response.sesion.id;
        } else {
          throw new Error(response?.error || "Error creando sesión");
        }
      } catch (sessionError) {
        console.error(
          "❌ No se pudo crear sesión automática:",
          sessionError.message
        );

        // ✅ FALLBACK CRÍTICO: Permitir ventas sin sesión si el backend lo permite
        console.log("🔄 [SYNC] Continuando sin sesión - Modo emergencia");
        return null;
      }
    } catch (error) {
      console.error("❌ [SYNC] Error en createAutomaticSessionForSale:", error);
      return null; // Fallback: permitir sin sesión
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

  async createAutomaticSessionForSale(venta) {
    try {
      console.log("🔄 [SYNC] Creando sesión automática para venta...", venta);

      // ✅ VERIFICAR SI YA EXISTE UNA SESIÓN ABIERTA EN EL SERVIDOR
      const sesionesResponse = await fetchConToken("sesiones-caja/abiertas");

      if (
        sesionesResponse.ok &&
        sesionesResponse.sesiones &&
        sesionesResponse.sesiones.length > 0
      ) {
        // ✅ USAR SESIÓN EXISTENTE
        const sesionExistente = sesionesResponse.sesiones[0];
        console.log("✅ [SYNC] Usando sesión existente:", sesionExistente.id);
        return sesionExistente.id;
      }

      // ✅ CREAR NUEVA SESIÓN SI NO HAY EXISTENTE
      const sessionData = {
        fecha_apertura: new Date().toISOString(),
        monto_inicial: 0,
        observaciones:
          "Sesión automática creada para sincronizar ventas pendientes",
      };

      const response = await fetchConToken(
        "sesiones-caja/abrir",
        sessionData,
        "POST"
      );

      if (response.ok && response.sesion) {
        console.log("✅ [SYNC] Sesión automática creada:", response.sesion.id);
        return response.sesion.id;
      } else {
        throw new Error(response?.error || "Error creando sesión automática");
      }
    } catch (error) {
      console.error("❌ [SYNC] Error creando sesión automática:", error);

      // ✅ FALLBACK: Usar una sesión por defecto o permitir ventas sin sesión
      console.log("⚠️ [SYNC] Usando fallback para sesión...");
      return null; // O un ID de sesión por defecto si tu backend lo permite
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

  // En SyncController.js - ACTUALIZAR getPendingDetails
  async getPendingDetails() {
    try {
      console.log("🔍 Obteniendo detalles de datos pendientes...");

      const [
        pendingSessions,
        pendingSales,
        pendingClosures,
        pendingStock,
        pendingProducts,
      ] = await Promise.all([
        SessionsOfflineController.getPendingSessions().catch((error) => {
          console.error("❌ Error obteniendo sesiones pendientes:", error);
          return [];
        }),
        SalesOfflineController.getPendingSales().catch((error) => {
          console.error("❌ Error obteniendo ventas pendientes:", error);
          return [];
        }),
        ClosuresOfflineController.getPendingClosures().catch((error) => {
          console.error("❌ Error obteniendo cierres pendientes:", error);
          return [];
        }),
        // ✅ USAR MÉTODO CORREGIDO
        InventoryOfflineController.getPendingStockUpdates().catch((error) => {
          console.error("❌ Error obteniendo stock pendiente:", error);
          return [];
        }),
        ProductsOfflineController.getPendingProducts().catch((error) => {
          console.error("❌ Error obteniendo productos pendientes:", error);
          return [];
        }),
      ]);

      console.log(`📊 Detalles obtenidos CORREGIDOS:
    Sesiones: ${pendingSessions.length}
    Ventas: ${pendingSales.length}
    Cierres: ${pendingClosures.length}
    Stock: ${pendingStock.length}
    Productos: ${pendingProducts.length}`);

      const result = {
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
        // ✅ STOCK CORREGIDO
        stock: pendingStock.map((stockUpdate) => ({
          id: stockUpdate.id_local,
          type: "stock",
          descripcion:
            stockUpdate.descripcion ||
            `Stock - ${
              stockUpdate.producto_nombre || stockUpdate.producto_id
            } (${stockUpdate.stock_anterior} → ${stockUpdate.stock_nuevo})`,
          fecha: stockUpdate.timestamp,
          data: stockUpdate,
        })),
        // ✅ NUEVA SECCIÓN: Productos
        products: pendingProducts.map((productOp) => ({
          id: productOp.id_local,
          type: "producto",
          operacion: productOp.operacion,
          descripcion: this.getProductOperationDescription(productOp),
          fecha: productOp.timestamp,
          data: productOp,
        })),
      };

      console.log("✅ Detalles de pendientes PROCESADOS CORRECTAMENTE");
      return result;
    } catch (error) {
      console.error("❌ Error crítico obteniendo detalles pendientes:", error);
      return {
        sessions: [],
        sales: [],
        closures: [],
        stock: [],
        products: [],
        error: error.message,
      };
    }
  }
  // ✅ NUEVO: Helper para descripciones de operaciones de productos
  getProductOperationDescription(productOp) {
    switch (productOp.operacion) {
      case "crear":
        return `Crear producto: ${productOp.datos?.nombre || "Nuevo producto"}`;
      case "actualizar":
        return `Actualizar producto: ${productOp.producto_id}`;
      case "eliminar":
        return `Eliminar producto: ${productOp.producto_id}`;
      default:
        return `Operación en producto: ${productOp.operacion}`;
    }
  }
  // En SyncController.js - AGREGAR método de diagnóstico
  async debugStockIssue() {
    try {
      console.log("🔍 DIAGNÓSTICO DE STOCK PENDIENTE...");

      // 1. Obtener stock pendiente directamente
      const pendingStock =
        await InventoryOfflineController.getPendingStockUpdates();
      console.log("📦 Stock pendiente encontrado:", pendingStock.length);

      // 2. Mostrar detalles de cada actualización
      pendingStock.forEach((stock, index) => {
        console.log(`📋 Stock ${index + 1}:`, {
          id_local: stock.id_local,
          producto_id: stock.producto_id,
          producto_nombre: stock.producto_nombre,
          stock_anterior: stock.stock_anterior,
          stock_nuevo: stock.stock_nuevo,
          timestamp: stock.timestamp,
          sincronizado: stock.sincronizado,
          descripcion: stock.descripcion,
        });
      });

      // 3. Verificar en IndexedDB directamente
      const allStock = await IndexedDBService.getAll("stock_pendientes");
      console.log(
        "🗄️ Todos los registros en stock_pendientes:",
        allStock.length
      );

      const pendingInDB = allStock.filter(
        (item) => item.sincronizado === false
      );
      console.log("📊 Pendientes en DB (filtrado):", pendingInDB.length);

      return {
        totalInDB: allStock.length,
        pendingInDB: pendingInDB.length,
        pendingFromController: pendingStock.length,
        details: pendingStock.map((s) => ({
          id_local: s.id_local,
          producto_id: s.producto_id,
          descripcion: s.descripcion,
          sincronizado: s.sincronizado,
        })),
      };
    } catch (error) {
      console.error("❌ Error en diagnóstico de stock:", error);
      return { error: error.message };
    }
  }

  // ✅ AGREGAR MÉTODO PARA DESCRIPCIÓN DE OPERACIONES DE PRODUCTOS
  getProductOperationDescription(product) {
    const base = `Producto: ${
      product.datos?.nombre || product.producto_id || "N/A"
    }`;

    switch (product.operacion) {
      case "crear":
        return `${base} - CREAR`;
      case "actualizar":
        return `${base} - ACTUALIZAR`;
      case "eliminar":
        return `${base} - ELIMINAR`;
      default:
        return `${base} - ${product.operacion?.toUpperCase()}`;
    }
  }
  // Agregar al SyncController.js
  async debugProductsDeleteIssue() {
    try {
      console.log("🔍 DIAGNÓSTICO GLOBAL DE ELIMINACIÓN DE PRODUCTOS");

      // 1. Obtener todas las operaciones pendientes
      const pendingProducts =
        await ProductsOfflineController.getPendingProducts();
      const deleteOps = pendingProducts.filter(
        (op) => op.operacion === "eliminar"
      );

      console.log(
        "📦 Operaciones de eliminación pendientes:",
        deleteOps.length
      );

      // 2. Diagnóstico detallado para cada eliminación pendiente
      const diagnostics = [];
      for (const op of deleteOps) {
        console.log(`🔍 Diagnóstico para: ${op.producto_id}`);
        const diagnosis = await ProductsOfflineController.debugDeleteIssue(
          op.producto_id
        );
        diagnostics.push(diagnosis);
      }

      // 3. Verificar sincronización
      console.log("🔄 Intentando sincronizar productos...");
      const syncResult = await this.syncPendingProductsDetailed();

      return {
        totalDeleteOps: deleteOps.length,
        diagnostics,
        syncResult,
        summary: {
          conProblemas: diagnostics.filter((d) => !d.hasPendingDeletes).length,
          pendientes: diagnostics.filter((d) => d.hasPendingDeletes).length,
          online: navigator.onLine,
        },
      };
    } catch (error) {
      console.error("❌ Error en diagnóstico global:", error);
      return { error: error.message };
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

  // ✅ AGREGAR MÉTODO PARA OBTENER ESTADO DE PRODUCTOS
  async getProductsSyncStatus() {
    try {
      const pendingProducts =
        await ProductsOfflineController.getPendingProducts();
      const productsStats = await ProductsOfflineController.getPendingStats();

      return {
        pendingProducts: pendingProducts.length,
        pendingCreate: productsStats.crear,
        pendingUpdate: productsStats.actualizar,
        pendingDelete: productsStats.eliminar,
        totalPending: pendingProducts.length,
      };
    } catch (error) {
      console.error("❌ Error obteniendo estado de productos:", error);
      return {
        pendingProducts: 0,
        pendingCreate: 0,
        pendingUpdate: 0,
        pendingDelete: 0,
        totalPending: 0,
      };
    }
  }
  // ✅ AGREGAR MÉTODO PARA OBTENER DETALLES DE PRODUCTOS
  async getProductsPendingDetails() {
    try {
      const pendingProducts =
        await ProductsOfflineController.getPendingProducts();

      return pendingProducts.map((product) => ({
        id: product.id_local,
        tipo: "producto",
        operacion: product.operacion,
        descripcion: this.getProductOperationDescription(product),
        fecha: product.timestamp,
        datos: product.datos,
        producto_id: product.producto_id,
      }));
    } catch (error) {
      console.error("❌ Error obteniendo detalles de productos:", error);
      return [];
    }
  }
  // ✅ ACTUALIZAR getSyncStatus para incluir productos
  async getSyncStatus() {
    try {
      console.log("🔄 Obteniendo estado de sincronización...");

      let pendingSessions = [],
        pendingSales = [],
        pendingClosures = [],
        pendingStock = [],
        pendingProducts = [];

      try {
        pendingSessions = await SessionsOfflineController.getPendingSessions();
        pendingSales = await SalesOfflineController.getPendingSales();
        pendingClosures = await ClosuresOfflineController.getPendingClosures();
        pendingStock =
          await InventoryOfflineController.emergencyGetPendingStock();
        pendingProducts = await ProductsOfflineController.getPendingProducts(); // ✅ NUEVO
      } catch (error) {
        console.error("❌ Error obteniendo pendientes:", error);
      }

      const status = {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        pendingSessions: pendingSessions.length,
        pendingSales: pendingSales.length,
        pendingClosures: pendingClosures.length,
        pendingStock: pendingStock.length,
        pendingProducts: pendingProducts.length, // ✅ NUEVO
        totalPending:
          pendingSessions.length +
          pendingSales.length +
          pendingClosures.length +
          pendingStock.length +
          pendingProducts.length, // ✅ ACTUALIZADO
        lastSync: localStorage.getItem("lastSuccessfulSync") || null,
      };

      console.log("📊 Estado de sincronización ACTUALIZADO:", status);
      return status;
    } catch (error) {
      console.error(
        "❌ Error crítico obteniendo estado de sincronización:",
        error
      );
      return {
        isOnline: this.isOnline,
        isSyncing: false,
        pendingSessions: 0,
        pendingSales: 0,
        pendingClosures: 0,
        pendingStock: 0,
        pendingProducts: 0,
        totalPending: 0,
        error: error.message,
      };
    }
  }

  startAutoSyncListener() {
    const handleOnline = async () => {
      console.log(
        "🌐 Conexión detectada - Iniciando auto-sync en 3 segundos..."
      );

      // Esperar 3 segundos para que la conexión sea estable
      setTimeout(async () => {
        try {
          const status = await this.getSyncStatus();
          console.log("📊 Estado para auto-sync:", status);

          // ✅ VERIFICAR ESPECÍFICAMENTE PRODUCTOS PENDIENTES
          if (status.pendingProducts > 0) {
            console.log(
              `🔄 Auto-sync iniciado con ${status.pendingProducts} productos pendientes`
            );
            await this.syncPendingProductsDetailed();
          }

          // ✅ LUEGO VERIFICAR EL RESTO Y HACER SYNC COMPLETO
          if (status.totalPending > 0) {
            console.log(
              `🔄 Auto-sync completo con ${status.totalPending} pendientes totales`
            );
            await this.fullSync();
          } else {
            console.log("✅ No hay datos pendientes para sincronizar");
          }
        } catch (error) {
          console.error("❌ Error en auto-sync:", error);
        }
      }, 3000);
    };

    window.addEventListener("online", handleOnline);
  }
  // ✅ DIAGNÓSTICO COMPLETO DEL PRODUCTO
  async debugProductMapping(localProductId) {
    try {
      console.log("🔍 DIAGNÓSTICO COMPLETO DE MAPEO:", localProductId);

      // 1. Buscar en TODOS los productos del cache
      const allProducts = await IndexedDBService.getAll(this.cacheStore);
      console.log("📦 Total productos en cache:", allProducts.length);

      const productInCache = allProducts.find(
        (p) => p.id === localProductId || p.id_local === localProductId
      );
      console.log("💾 Producto en cache:", productInCache);

      // 2. Buscar en TODAS las operaciones pendientes
      const allPendingOps = await IndexedDBService.getAll(this.storeName);
      console.log("📋 Total operaciones pendientes:", allPendingOps.length);

      const opsForThisProduct = allPendingOps.filter(
        (op) =>
          op.producto_id === localProductId ||
          op.datos?.id_local === localProductId
      );
      console.log("🔄 Operaciones para este producto:", opsForThisProduct);

      // 3. Buscar operaciones de CREACIÓN sincronizadas
      const syncedCreations = allPendingOps.filter(
        (op) => op.operacion === "crear" && op.sincronizado === true
      );
      console.log("✅ Creaciones sincronizadas:", syncedCreations);

      // 4. Buscar cualquier operación que tenga este ID local
      const anyOpWithThisId = allPendingOps.find(
        (op) =>
          op.datos?.id_local === localProductId ||
          (op.operacion === "crear" && op.datos?.id === localProductId)
      );
      console.log("🎯 Cualquier operación con este ID:", anyOpWithThisId);

      return {
        productInCache,
        opsForThisProduct,
        syncedCreations: syncedCreations.length,
        anyOpWithThisId,
      };
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      return { error: error.message };
    }
  }
  /// ✅ AGREGAR ESTE MÉTODO AL SyncController
  async syncPendingStockUpdates() {
    try {
      const pendingUpdates =
        await InventoryOfflineController.getPendingStockUpdates();

      const results = {
        total: pendingUpdates.length,
        success: 0,
        failed: 0,
        details: [],
      };

      console.log(
        `🔄 [SYNC] Sincronizando ${pendingUpdates.length} actualizaciones de stock...`
      );

      // ✅ ORDENAR POR TIMESTAMP (MÁS ANTIGUAS PRIMERO)
      const sortedUpdates = pendingUpdates.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      for (const update of sortedUpdates) {
        try {
          console.log(
            `🔄 Procesando actualización de stock: ${update.id_local}`
          );

          // ✅ VERIFICAR QUE EL PRODUCTO EXISTA EN EL SERVIDOR
          const productExists = await this.verifyProductExists(
            update.producto_id
          );
          if (!productExists) {
            results.details.push({
              id: update.id_local,
              type: "stock",
              status: "failed",
              message: `Producto no existe: ${update.producto_id}`,
              data: update,
            });
            results.failed++;
            continue;
          }

          // ✅ ACTUALIZAR STOCK EN EL SERVIDOR
          const response = await fetchConToken(
            `inventario/stock/${update.producto_id}`,
            {
              stock: update.stock_nuevo,
            },
            "PUT"
          );

          if (response && response.ok) {
            // ✅ MARCAR COMO SINCRONIZADO
            await InventoryOfflineController.markAsSynced(update.id_local, {
              server_response: response,
            });

            results.details.push({
              id: update.id_local,
              type: "stock",
              status: "success",
              message: `Stock actualizado: ${update.producto_id} -> ${update.stock_nuevo}`,
              data: update,
            });
            results.success++;

            console.log(`✅ Stock sincronizado: ${update.id_local}`);
          } else {
            throw new Error(response?.error || "Error del servidor");
          }
        } catch (error) {
          // ✅ INCREMENTAR CONTADOR DE INTENTOS
          await this.recordSyncAttempt(update);

          results.details.push({
            id: update.id_local,
            type: "stock",
            status: "failed",
            message: error.message,
            data: update,
          });
          results.failed++;

          console.error(
            `❌ Error sincronizando stock ${update.id_local}:`,
            error
          );
        }
      }

      console.log(
        `📊 RESULTADO STOCK: ${results.success}/${results.total} exitosas`
      );
      return results;
    } catch (error) {
      console.error("❌ Error en syncPendingStockUpdates:", error);
      return {
        total: 0,
        success: 0,
        failed: 0,
        details: [],
        error: error.message,
      };
    }
  }

  // ✅ VERIFICAR QUE EL PRODUCTO EXISTA
  async verifyProductExists(productoId) {
    try {
      const response = await fetchConToken(`productos/${productoId}`);
      return response && response.ok && response.producto;
    } catch (error) {
      console.error(`❌ Error verificando producto ${productoId}:`, error);
      return false;
    }
  }

  // ✅ REGISTRAR INTENTO DE SINCRONIZACIÓN FALLIDO
  async recordSyncAttempt(update) {
    try {
      const currentUpdate = await IndexedDBService.get(
        "stock_pendientes",
        update.id_local
      );
      if (currentUpdate) {
        const updated = {
          ...currentUpdate,
          intentos: (currentUpdate.intentos || 0) + 1,
          ultimo_intento: new Date().toISOString(),
          ultimo_error: "Error de sincronización",
        };
        await IndexedDBService.put("stock_pendientes", updated);
      }
    } catch (error) {
      console.error("❌ Error registrando intento:", error);
    }
  }

  // En SyncController.js - AGREGAR MÉTODO DE DIAGNÓSTICO PARA PRODUCTOS
  async debugProductsIssue() {
    try {
      console.log("🔍 DIAGNÓSTICO DE PRODUCTOS PENDIENTES...");

      const pendingProducts =
        await ProductsOfflineController.getPendingProducts();
      console.log(
        "📦 Productos pendientes encontrados:",
        pendingProducts.length
      );

      // Mostrar detalles de cada producto pendiente
      pendingProducts.forEach((product, index) => {
        console.log(`📋 Producto ${index + 1}:`, {
          id_local: product.id_local,
          operacion: product.operacion,
          producto_id: product.producto_id,
          sincronizado: product.sincronizado,
          timestamp: product.timestamp,
          datos: product.datos
            ? {
                nombre: product.datos.nombre,
                precio: product.datos.precio,
                stock: product.datos.stock,
              }
            : "Sin datos",
        });
      });

      // Verificar conexión y token
      console.log("🌐 Estado conexión:", navigator.onLine);
      console.log("🔑 Token existe:", !!localStorage.getItem("token"));

      return {
        totalProducts: pendingProducts.length,
        products: pendingProducts.map((p) => ({
          id_local: p.id_local,
          operacion: p.operacion,
          producto_id: p.producto_id,
          sincronizado: p.sincronizado,
        })),
      };
    } catch (error) {
      console.error("❌ Error en diagnóstico de productos:", error);
      return { error: error.message };
    }
  }
  // ✅ NUEVO MÉTODO: Sincronización detallada de productos
  async syncPendingProductsDetailed() {
    try {
      console.log("🔄 [SYNC] Iniciando sincronización de productos...");

      const resultados = await ProductsOfflineController.syncPendingProducts();

      console.log(
        `📊 [SYNC] RESULTADO PRODUCTOS: ${resultados.exitosas}/${resultados.total} exitosas`
      );

      // ✅ NOTIFICAR A LOS LISTENERS
      this.notifyListeners("products_sync_complete", resultados);

      // ✅ EMITIR EVENTO GLOBAL
      window.dispatchEvent(
        new CustomEvent("products_sync_completed", {
          detail: resultados,
        })
      );

      return resultados;
    } catch (error) {
      console.error("❌ [SYNC] Error en syncPendingProductsDetailed:", error);
      return {
        total: 0,
        exitosas: 0,
        fallidas: 0,
        detalles: [],
        error: error.message,
      };
    }
  }
}

export default new SyncController();
