// src/controllers/offline/SyncController/SyncController.js - VERSIÓN FINAL CORREGIDA
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

  // ✅ SINCRONIZACIÓN COMPLETA MEJORADA - SIN VENTAS
  async fullSync() {
    if (!this.isOnline) {
      return { success: false, error: "Sin conexión a internet", silent: true };
    }

    this.isSyncing = true;
    this.notifyListeners("sync_start");

    const syncResults = {
      startTime: Date.now(),
      steps: {},
      errors: [],
      idMappings: {},
      strategy: "sin_ventas",
    };

    try {
      console.log("🔄 INICIANDO SINCRONIZACIÓN COMPLETA (SIN VENTAS)");

      // ✅ PASO 1: Limpiar ventas pendientes (NO se sincronizarán)
      console.log("🧹 LIMPIANDO VENTAS PENDIENTES...");
      syncResults.steps.cleanup = await this.limpiarVentasPendientes();

      // ✅ PASO 2: Sincronizar sesiones cerradas
      console.log("📝 SINCRONIZANDO SESIONES CERRADAS...");
      syncResults.steps.sessions = await this.syncOnlyClosedSessions();

      // ✅ PASO 3: Sincronizar cierres pendientes
      console.log("💰 SINCRONIZANDO CIERRES...");
      syncResults.steps.closures = await this.syncPendingClosures();

      // ✅ PASO 4: Sincronizar productos
      console.log("📦 SINCRONIZANDO PRODUCTOS...");
      syncResults.steps.products = await this.syncPendingProducts();

      // ✅ PASO 5: Sincronizar inventario
      console.log("📊 SINCRONIZANDO INVENTARIO...");
      syncResults.steps.inventory = await this.syncPendingStock();

      syncResults.duration = Date.now() - syncResults.startTime;
      syncResults.success =
        syncResults.steps.sessions?.success > 0 ||
        syncResults.steps.closures?.success > 0 ||
        syncResults.steps.products?.success > 0 ||
        syncResults.steps.inventory?.success > 0;

      // Guardar timestamp de última sincronización exitosa
      if (syncResults.success) {
        localStorage.setItem("lastSuccessfulSync", new Date().toISOString());
      }

      console.log("✅ SINCRONIZACIÓN COMPLETADA (SIN VENTAS)");
      this.notifyListeners("sync_complete", syncResults);
      return syncResults;
    } catch (error) {
      console.error("❌ ERROR EN SINCRONIZACIÓN:", error);
      syncResults.success = false;
      syncResults.errors.push(error.message);
      this.notifyListeners("sync_error", syncResults);
      return syncResults;
    } finally {
      this.isSyncing = false;
    }
  }

  // ✅ LIMPIAR VENTAS PENDIENTES (NO SINCRONIZAR)
  async limpiarVentasPendientes() {
    try {
      const ventasPendientes = await SalesOfflineController.getPendingSales();

      if (ventasPendientes.length === 0) {
        return { eliminadas: 0, message: "No hay ventas pendientes" };
      }

      console.log(
        `🧹 Eliminando ${ventasPendientes.length} ventas pendientes...`
      );

      let eliminadas = 0;
      for (const venta of ventasPendientes) {
        try {
          await SalesOfflineController.deletePendingSale(venta.id_local);
          eliminadas++;
          console.log(`🗑️ Venta eliminada: ${venta.id_local}`);
        } catch (error) {
          console.error(`❌ Error eliminando venta ${venta.id_local}:`, error);
        }
      }

      console.log(`✅ ${eliminadas} ventas pendientes eliminadas`);
      return {
        eliminadas,
        total: ventasPendientes.length,
        message:
          "Ventas eliminadas - No se sincronizan por problemas de llaves foráneas",
      };
    } catch (error) {
      console.error("❌ Error en limpieza de ventas:", error);
      return { error: error.message };
    }
  }

  // ✅ SINCRONIZAR SOLO SESIONES CERRADAS
  async syncOnlyClosedSessions() {
    try {
      console.log("🎯 SINCRONIZANDO EXCLUSIVAMENTE SESIONES CERRADAS...");

      const pendingSessions =
        await SessionsOfflineController.getPendingSessions();

      // ✅ FILTRAR: Solo sesiones CERRADAS
      const closedSessions = pendingSessions.filter(
        (session) => session.estado === "cerrada" && !session.sincronizado
      );

      console.log(
        `📊 Sesiones cerradas pendientes: ${closedSessions.length} de ${pendingSessions.length} totales`
      );

      const resultados = {
        total: closedSessions.length,
        success: 0,
        failed: 0,
        detalles: [],
        idMappings: {},
        skipped: {
          abiertas: pendingSessions.filter((s) => s.estado === "abierta")
            .length,
          ya_sincronizadas: pendingSessions.filter((s) => s.sincronizado)
            .length,
        },
      };

      if (closedSessions.length === 0) {
        console.log("✅ No hay sesiones cerradas pendientes para sincronizar");
        return resultados;
      }

      for (const session of closedSessions) {
        try {
          console.log(`🔄 Procesando sesión CERRADA: ${session.id_local}`);

          // ✅ CREAR CIERRE EN SERVIDOR PARA ESTA SESIÓN
          const cierreResult = await this.crearCierreParaSesionCerrada(session);

          if (cierreResult.success) {
            // ✅ MARCAR SESIÓN COMO SINCRONIZADA
            await SessionsOfflineController.markAsSynced(session.id_local, {
              id: cierreResult.sesion_server_id,
              sincronizado: true,
              fecha_sincronizacion: new Date().toISOString(),
            });

            resultados.idMappings[session.id_local] =
              cierreResult.sesion_server_id;
            resultados.success++;

            console.log(
              `✅ Sesión cerrada sincronizada: ${session.id_local} -> ${cierreResult.sesion_server_id}`
            );
          } else {
            throw new Error(cierreResult.error);
          }
        } catch (error) {
          console.error(
            `❌ Error en sesión cerrada ${session.id_local}:`,
            error
          );
          resultados.failed++;
          resultados.detalles.push({
            id_local: session.id_local,
            status: "failed",
            error: error.message,
          });
        }
      }

      console.log(
        `🎯 RESULTADO SESIONES CERRADAS: ${resultados.success} exitosas, ${resultados.failed} fallidas`
      );
      return resultados;
    } catch (error) {
      console.error("❌ Error en syncOnlyClosedSessions:", error);
      return { total: 0, success: 0, failed: 0, error: error.message };
    }
  }

  // ✅ CREAR CIERRE PARA SESIÓN CERRADA
  async crearCierreParaSesionCerrada(session) {
    try {
      console.log(`💰 Creando cierre para sesión: ${session.id_local}`);

      // ✅ CALCULAR TOTALES REALES
      const totales = await this.calcularTotalesSesion(session);

      // ✅ OBTENER ID DE SERVIDOR PARA LA SESIÓN
      const sesionServerId = await this.obtenerIdServidorSesion(session);

      // ✅ PREPARAR DATOS DEL CIERRE
      const cierreData = {
        sesion_caja_id: sesionServerId,
        total_ventas: totales.total_ventas,
        total_efectivo: totales.total_efectivo,
        total_tarjeta: totales.total_tarjeta,
        total_transferencia: totales.total_transferencia,
        ganancia_bruta: totales.ganancia_bruta,
        saldo_final_teorico: totales.saldo_final_teorico,
        saldo_final_real:
          session.saldo_final_real || session.saldo_inicial || 0,
        diferencia:
          (session.saldo_final_real || 0) - totales.saldo_final_teorico,
        observaciones:
          session.observaciones ||
          `Sincronizado desde offline - ${totales.cantidad_ventas} ventas procesadas`,
        vendedor_id: session.vendedor_id,
      };

      console.log("📤 Enviando cierre al servidor:", cierreData);

      const response = await fetchConToken("cierres", cierreData, "POST");

      if (response && response.ok && response.cierre) {
        console.log(`✅ Cierre creado exitosamente: ${response.cierre.id}`);

        return {
          success: true,
          cierre_id: response.cierre.id,
          sesion_server_id: sesionServerId,
          totales: totales,
        };
      } else {
        throw new Error(
          response?.error || "Error del servidor al crear cierre"
        );
      }
    } catch (error) {
      console.error(
        `❌ Error creando cierre para sesión ${session.id_local}:`,
        error
      );
      return { success: false, error: error.message };
    }
  }

  // ✅ CALCULAR TOTALES DE SESIÓN
  async calcularTotalesSesion(session) {
    try {
      console.log(`💰 Calculando totales para sesión: ${session.id_local}`);

      // ✅ BUSCAR VENTAS REALES DE ESTA SESIÓN
      const ventasSesion = await SalesOfflineController.getSalesBySession(
        session.id_local
      );

      console.log(
        `📊 Encontradas ${ventasSesion.length} ventas para la sesión`
      );

      let totales = {
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        ganancia_bruta: 0,
        saldo_final_teorico: session.saldo_inicial || 0,
        cantidad_ventas: ventasSesion.length,
      };

      // ✅ CALCULAR TOTALES REALES DESDE VENTAS
      ventasSesion.forEach((venta) => {
        if (venta.estado !== "cancelada" && venta.total) {
          const totalVenta = Number(venta.total) || 0;

          // Sumar al total general
          totales.total_ventas += totalVenta;

          // Sumar por método de pago
          switch (venta.metodo_pago) {
            case "efectivo":
              totales.total_efectivo += totalVenta;
              break;
            case "tarjeta":
              totales.total_tarjeta += totalVenta;
              break;
            case "transferencia":
              totales.total_transferencia += totalVenta;
              break;
            default:
              totales.total_efectivo += totalVenta;
          }

          // ✅ CALCULAR GANANCIA REAL
          if (venta.productos && Array.isArray(venta.productos)) {
            venta.productos.forEach((producto) => {
              const precioVenta = Number(producto.precio_unitario) || 0;
              const precioCompra =
                Number(producto.precio_compra) || precioVenta * 0.7;
              const cantidad = Number(producto.cantidad) || 1;

              totales.ganancia_bruta += (precioVenta - precioCompra) * cantidad;
            });
          } else {
            // Estimación si no hay detalles
            totales.ganancia_bruta += totalVenta * 0.25;
          }
        }
      });

      // ✅ CALCULAR SALDO FINAL TEÓRICO
      totales.saldo_final_teorico =
        (session.saldo_inicial || 0) + totales.total_efectivo;

      console.log(
        `💰 TOTALES CALCULADOS para sesión ${session.id_local}:`,
        totales
      );
      return totales;
    } catch (error) {
      console.error("❌ Error calculando totales:", error);

      // ✅ FALLBACK: Usar datos de la sesión
      return {
        total_ventas: session.total_ventas || 0,
        total_efectivo: session.total_efectivo || 0,
        total_tarjeta: session.total_tarjeta || 0,
        total_transferencia: session.total_transferencia || 0,
        ganancia_bruta: session.ganancia_bruta || 0,
        saldo_final_teorico:
          session.saldo_final_teorico || session.saldo_inicial || 0,
        cantidad_ventas: 0,
      };
    }
  }

  // ✅ OBTENER ID DE SERVIDOR PARA SESIÓN
  async obtenerIdServidorSesion(session) {
    try {
      // Si ya tiene ID de servidor, usarlo
      if (session.id_servidor) {
        return session.id_servidor;
      }

      if (
        session.id &&
        session.id.startsWith("ses_") &&
        !session.id.includes("_local_")
      ) {
        return session.id;
      }

      // ✅ CREAR NUEVA SESIÓN EN SERVIDOR
      console.log(
        `🆘 Creando sesión en servidor para sesión cerrada local: ${session.id_local}`
      );

      const AuthOfflineController = await import(
        "../AuthOfflineController/AuthOfflineController.js"
      );
      const currentVendedorId =
        await AuthOfflineController.default.getCurrentVendedorId();

      const sessionData = {
        vendedor_id: session.vendedor_id || currentVendedorId,
        saldo_inicial: session.saldo_inicial || 0,
        observaciones: `Sesión recreada para cierre offline ${session.id_local}`,
        vendedor_nombre: session.vendedor_nombre || "Sistema Offline",
      };

      const response = await fetchConToken(
        "sesiones-caja/abrir",
        sessionData,
        "POST"
      );

      if (response?.ok && response.sesion) {
        const serverSessionId = response.sesion.id;
        console.log(`✅ Sesión recreada en servidor: ${serverSessionId}`);

        // ✅ CERRAR INMEDIATAMENTE (sesión cerrada)
        await fetchConToken(
          `sesiones-caja/cerrar/${serverSessionId}`,
          {
            saldo_final: session.saldo_final || session.saldo_inicial || 0,
            observaciones:
              "Sesión cerrada para sincronización de cierre offline",
          },
          "PUT"
        );

        return serverSessionId;
      } else {
        throw new Error("No se pudo crear sesión en servidor");
      }
    } catch (error) {
      console.error("❌ Error obteniendo ID servidor:", error);
      throw error;
    }
  }

  // ✅ SINCRONIZAR CIERRES PENDIENTES
  async syncPendingClosures() {
    try {
      const pendingClosures =
        await ClosuresOfflineController.getPendingClosures();

      if (pendingClosures.length === 0) {
        console.log("✅ No hay cierres pendientes para sincronizar");
        return { total: 0, success: 0, failed: 0, detalles: [] };
      }

      console.log(
        `🔄 Sincronizando ${pendingClosures.length} cierres pendientes...`
      );

      const resultados = {
        total: pendingClosures.length,
        success: 0,
        failed: 0,
        detalles: [],
      };

      // ✅ OBTENER MAPPING DE SESIONES
      const sessionMappings = await this.getSessionMappings();

      for (const closure of pendingClosures) {
        try {
          console.log(`🔄 Procesando cierre local: ${closure.id_local}`);

          // ✅ CONVERTIR SESIÓN LOCAL A SESIÓN DEL SERVIDOR
          let sesionServerId = await this.convertLocalSessionToServer(
            closure.sesion_caja_id,
            sessionMappings
          );

          if (!sesionServerId) {
            throw new Error(
              `No se pudo mapear sesión: ${closure.sesion_caja_id}`
            );
          }

          // Verificar si ya existe en servidor
          const existingClosure = await this.verificarCierreExistente(closure);
          if (existingClosure) {
            console.log(
              `✅ Cierre ya existe en servidor: ${existingClosure.id}`
            );
            await ClosuresOfflineController.markAsSynced(
              closure.id_local,
              existingClosure
            );
            resultados.success++;
            continue;
          }

          // Crear cierre en servidor
          const cierreData = {
            sesion_caja_id: sesionServerId,
            total_ventas: closure.total_ventas || 0,
            total_efectivo: closure.total_efectivo || 0,
            total_tarjeta: closure.total_tarjeta || 0,
            total_transferencia: closure.total_transferencia || 0,
            ganancia_bruta: closure.ganancia_bruta || 0,
            saldo_final_teorico: closure.saldo_final_teorico || 0,
            saldo_final_real: closure.saldo_final_real || 0,
            diferencia: closure.diferencia || 0,
            observaciones:
              closure.observaciones || "Sincronizado desde offline",
            vendedor_id: closure.vendedor_id,
          };

          const response = await fetchConToken("cierres", cierreData, "POST");

          if (response && response.ok && response.cierre) {
            await ClosuresOfflineController.markAsSynced(
              closure.id_local,
              response.cierre
            );
            resultados.success++;
            console.log(
              `✅ Cierre ${closure.id_local} sincronizado exitosamente`
            );
          } else {
            throw new Error(response?.error || "Error del servidor");
          }
        } catch (error) {
          console.error(
            `❌ Error sincronizando cierre ${closure.id_local}:`,
            error
          );
          resultados.failed++;
          resultados.detalles.push({
            id_local: closure.id_local,
            status: "failed",
            error: error.message,
          });
        }
      }

      console.log(
        `✅ Sincronización de cierres completada: ${resultados.success} exitosas, ${resultados.failed} fallidas`
      );
      return resultados;
    } catch (error) {
      console.error("❌ Error general en syncPendingClosures:", error);
      return { total: 0, success: 0, failed: 0, error: error.message };
    }
  }

  // ✅ SINCRONIZAR PRODUCTOS PENDIENTES
  async syncPendingProducts() {
    try {
      const resultados = await ProductsOfflineController.syncPendingProducts();
      console.log(
        `📦 Sincronización de productos: ${resultados.success || 0} exitosos`
      );
      return resultados;
    } catch (error) {
      console.error("❌ Error en syncPendingProducts:", error);
      return { total: 0, success: 0, failed: 0, error: error.message };
    }
  }

  // ✅ SINCRONIZAR INVENTARIO PENDIENTE
  async syncPendingStock() {
    try {
      const pendingUpdates =
        await InventoryOfflineController.getPendingStockUpdates();
      const resultados = {
        total: pendingUpdates.length,
        success: 0,
        failed: 0,
        detalles: [],
      };

      if (pendingUpdates.length === 0) {
        console.log("✅ No hay actualizaciones de stock pendientes");
        return resultados;
      }

      console.log(
        `📊 Sincronizando ${pendingUpdates.length} actualizaciones de stock...`
      );

      for (const update of pendingUpdates) {
        try {
          const productExists = await this.verificarProductoExistente(
            update.producto_id
          );
          if (!productExists) {
            resultados.detalles.push({
              id_local: update.id_local,
              status: "failed",
              error: `Producto no existe: ${update.producto_id}`,
            });
            resultados.failed++;
            continue;
          }

          const response = await fetchConToken(
            `inventario/stock/${update.producto_id}`,
            { stock: update.stock_nuevo },
            "PUT"
          );

          if (response && response.ok) {
            await InventoryOfflineController.markAsSynced(update.id_local);
            resultados.success++;
            console.log(
              `✅ Stock actualizado para producto: ${update.producto_id}`
            );
          } else {
            throw new Error(response?.error || "Error del servidor");
          }
        } catch (error) {
          resultados.failed++;
          resultados.detalles.push({
            id_local: update.id_local,
            status: "failed",
            error: error.message,
          });
        }
      }

      console.log(
        `✅ Sincronización de stock: ${resultados.success} exitosas, ${resultados.failed} fallidas`
      );
      return resultados;
    } catch (error) {
      console.error("❌ Error en syncPendingStock:", error);
      return { total: 0, success: 0, failed: 0, error: error.message };
    }
  }

  // ✅ MÉTODOS AUXILIARES

  // OBTENER MAPPING DE SESIONES
  async getSessionMappings() {
    try {
      const sessions = await SessionsOfflineController.getAllSessions();
      const mappings = {};

      sessions.forEach((session) => {
        if (session.sincronizado && session.id && session.id_local) {
          mappings[session.id_local] = session.id;
        }
        if (session.id && session.id_local) {
          mappings[session.id_local] = session.id;
        }
      });

      console.log(
        "🗺️ Mappings de sesiones encontrados:",
        Object.keys(mappings).length
      );
      return mappings;
    } catch (error) {
      console.error("❌ Error obteniendo mappings de sesiones:", error);
      return {};
    }
  }

  // CONVERTIR ID LOCAL A ID SERVIDOR
  async convertLocalSessionToServer(localSessionId, mappings = null) {
    try {
      console.log(`🔄 Convirtiendo sesión local: ${localSessionId}`);

      // Si ya es un ID del servidor
      if (
        localSessionId &&
        localSessionId.startsWith("ses_") &&
        !localSessionId.includes("_local_")
      ) {
        console.log(`✅ Ya es ID servidor: ${localSessionId}`);
        return localSessionId;
      }

      // Obtener mappings si no se proporcionan
      const sessionMappings = mappings || (await this.getSessionMappings());

      // Buscar en mappings
      let serverId = sessionMappings[localSessionId];

      if (!serverId) {
        // Buscar directamente en la sesión
        const session = await SessionsOfflineController.getSessionById(
          localSessionId
        );
        if (session && session.sincronizado && session.id) {
          serverId = session.id;
        }
      }

      if (!serverId) {
        console.warn(`⚠️ No se pudo mapear sesión local: ${localSessionId}`);
        // Crear sesión de emergencia
        serverId = await this.crearSesionEmergencia();
      }

      console.log(`✅ Sesión mapeada: ${localSessionId} -> ${serverId}`);
      return serverId;
    } catch (error) {
      console.error(`❌ Error convirtiendo sesión ${localSessionId}:`, error);
      return await this.crearSesionEmergencia();
    }
  }

  // CREAR SESIÓN DE EMERGENCIA
  async crearSesionEmergencia() {
    try {
      const AuthOfflineController = await import(
        "../AuthOfflineController/AuthOfflineController.js"
      );
      const currentVendedorId =
        await AuthOfflineController.default.getCurrentVendedorId();

      console.log("🆘 Creando sesión de emergencia para sincronización...");

      const response = await fetchConToken(
        "sesiones-caja/abrir",
        {
          vendedor_id: currentVendedorId,
          saldo_inicial: 0,
          observaciones: "Sesión de emergencia para sincronización offline",
          vendedor_nombre: "Sistema Offline",
        },
        "POST"
      );

      if (response.ok && response.sesion) {
        console.log("✅ Sesión de emergencia creada:", response.sesion.id);
        return response.sesion.id;
      } else {
        throw new Error("No se pudo crear sesión de emergencia");
      }
    } catch (error) {
      console.error("❌ Error creando sesión de emergencia:", error);
      return await this.obtenerCualquierSesionActiva();
    }
  }

  // OBTENER CUALQUIER SESIÓN ACTIVA
  async obtenerCualquierSesionActiva() {
    try {
      const response = await fetchConToken(
        "sesiones-caja?limite=1&estado=abierta"
      );
      if (response.ok && response.sesiones?.length > 0) {
        return response.sesiones[0].id;
      }

      // Si no hay sesiones activas, buscar la última
      const ultimasResponse = await fetchConToken("sesiones-caja?limite=1");
      if (ultimasResponse.ok && ultimasResponse.sesiones?.length > 0) {
        return ultimasResponse.sesiones[0].id;
      }

      throw new Error("No hay sesiones disponibles");
    } catch (error) {
      console.error("❌ Error obteniendo sesión fallback:", error);
      return "ses_emergencia_default";
    }
  }

  // VERIFICAR SI EXISTE CIERRE
  async verificarCierreExistente(closure) {
    try {
      const response = await fetchConToken(
        `cierres?fecha=${
          new Date(closure.fecha_cierre).toISOString().split("T")[0]
        }`
      );

      if (response && response.ok && response.cierres) {
        return response.cierres.find(
          (c) =>
            Math.abs(c.total_ventas - closure.total_ventas) /
              closure.total_ventas <
            0.1
        );
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // VERIFICAR SI EXISTE PRODUCTO
  async verificarProductoExistente(productoId) {
    try {
      const response = await fetchConToken(`productos/${productoId}`);
      return response && response.ok && response.producto;
    } catch (error) {
      return false;
    }
  }

  // ✅ ESTADO DE SINCRONIZACIÓN (EXCLUYENDO VENTAS)
  async getSyncStatus() {
    try {
      const [
        pendingSessions,
        pendingSales,
        pendingClosures,
        pendingStock,
        pendingProducts,
      ] = await Promise.all([
        SessionsOfflineController.getPendingSessions().catch(() => []),
        SalesOfflineController.getPendingSales().catch(() => []),
        ClosuresOfflineController.getPendingClosures().catch(() => []),
        InventoryOfflineController.getPendingStockUpdates().catch(() => []),
        ProductsOfflineController.getPendingProducts().catch(() => []),
      ]);

      return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        pendingSessions: pendingSessions.length,
        pendingSales: 0, // ✅ FORZAR A CERO - NO SE SINCRONIZAN
        pendingClosures: pendingClosures.length,
        pendingStock: pendingStock.length,
        pendingProducts: pendingProducts.length,
        totalPending:
          pendingSessions.length +
          pendingClosures.length +
          pendingStock.length +
          pendingProducts.length,
        _debug: {
          ventasIgnoradas: pendingSales.length,
          estrategia: "sin_ventas",
        },
        lastSync: localStorage.getItem("lastSuccessfulSync"),
      };
    } catch (error) {
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

  // ✅ SINCRONIZACIÓN DE DATOS MAESTROS
  async syncMasterData() {
    try {
      const [productosResponse, categoriasResponse] = await Promise.all([
        fetchConToken("productos"),
        fetchConToken("categorias"),
      ]);

      if (productosResponse?.ok && categoriasResponse?.ok) {
        const productos = productosResponse.productos || [];
        const categorias = categoriasResponse.categorias || [];

        // Limpiar y guardar en IndexedDB
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
      return { success: false, error: error.message };
    }
  }

  // ✅ MÉTODOS DE LISTENERS
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

  startAutoSyncListener() {
    const handleOnline = async () => {
      setTimeout(async () => {
        try {
          const status = await this.getSyncStatus();
          if (status.totalPending > 0) {
            console.log("🔁 Auto-sync iniciado por conexión restaurada");
            await this.fullSync();
          }
        } catch (error) {
          console.error("Error en auto-sync:", error);
        }
      }, 3000);
    };

    window.addEventListener("online", handleOnline);
  }

  // ✅ MÉTODO DE DIAGNÓSTICO
  async debugSyncIssues() {
    try {
      console.log("🐛 INICIANDO DEBUG DE SINCRONIZACIÓN");

      const [pendingSales, pendingSessions, pendingClosures, sessionMappings] =
        await Promise.all([
          SalesOfflineController.getPendingSales(),
          SessionsOfflineController.getPendingSessions(),
          ClosuresOfflineController.getPendingClosures(),
          this.getSessionMappings(),
        ]);

      const debugInfo = {
        pendingSales: pendingSales.length,
        pendingSessions: pendingSessions.length,
        pendingClosures: pendingClosures.length,
        sessionMappings: Object.keys(sessionMappings).length,
        isOnline: this.isOnline,
        lastSync: localStorage.getItem("lastSuccessfulSync"),
        strategy: "SIN_VENTAS",
      };

      console.log("📊 DEBUG INFO:", debugInfo);
      return debugInfo;
    } catch (error) {
      console.error("❌ Error en debugSyncIssues:", error);
      return { error: error.message };
    }
  }
}

export default new SyncController();
