// ClosuresOfflineController.js - VERSIÓN CORREGIDA
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";
import SalesOfflineController from "../SalesOfflineController/SalesOfflineController";
import SessionsOfflineController from "../SessionsOfflineController/SessionsOfflineController";

class ClosuresOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "cierres_pendientes";
  }

  // ✅ CREAR CIERRE OFFLINE
  async createClosure(closureData) {
    try {
      await this.validateRequiredFields(closureData, [
        "sesion_caja_id",
        "saldo_final_real",
        "vendedor_id",
      ]);

      // Calcular totales de la sesión
      const totales = await this.calculateSessionTotals(
        closureData.sesion_caja_id
      );

      const localId = await this.generateLocalId("cierre");

      const cierreCompleto = {
        ...closureData,
        ...totales,
        id_local: localId,
        fecha_cierre: new Date().toISOString(),
        sincronizado: false,
        es_local: true,
        estado: "completado",
      };

      await IndexedDBService.add(this.storeName, cierreCompleto);

      console.log("✅ Cierre offline creado:", localId);

      return {
        success: true,
        cierre: cierreCompleto,
        id_local: localId,
      };
    } catch (error) {
      console.error("❌ Error creando cierre offline:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ CALCULAR TOTALES - VERSIÓN CORREGIDA (SIN CONSTRUCTOR)
  async calculateSessionTotals(sesionId) {
    try {
      console.log(`🧮 [CLOSURES] Iniciando cálculo para sesión: ${sesionId}`);

      // ✅ OBTENER SESIÓN DIRECTAMENTE DESDE INDEXEDDB (sin usar SessionsOfflineController)
      let sesion = null;
      let saldoInicial = 0;

      try {
        // Buscar sesión directamente en IndexedDB
        sesion = await IndexedDBService.get("sesiones_caja_offline", sesionId);

        // Si no se encuentra por id_local, buscar en todas las sesiones
        if (!sesion) {
          const todasSesiones = await IndexedDBService.getAll(
            "sesiones_caja_offline"
          );
          sesion = todasSesiones.find(
            (s) =>
              s.id === sesionId ||
              s.id_local === sesionId ||
              s.id_servidor === sesionId
          );
        }

        saldoInicial = sesion?.saldo_inicial || 0;
        console.log("📋 Sesión encontrada, saldo inicial:", saldoInicial);
      } catch (sessionError) {
        console.warn("⚠️ No se pudo obtener sesión, usando saldo inicial 0");
        saldoInicial = 0;
      }

      // ✅ OBTENER VENTAS
      const ventas = await SalesOfflineController.getSalesBySession(sesionId);
      console.log(`🛒 Ventas encontradas: ${ventas.length}`);

      let totales = {
        cantidad_ventas: 0,
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        ganancia_bruta: 0,
        costo_total: 0,
        saldo_inicial: saldoInicial,
      };

      // ✅ PROCESAR CADA VENTA
      for (const venta of ventas) {
        if (venta.estado !== "cancelada") {
          totales.cantidad_ventas++;
          const ventaTotal = parseFloat(venta.total || 0);
          totales.total_ventas += ventaTotal;

          // Método de pago
          switch (venta.metodo_pago) {
            case "efectivo":
              totales.total_efectivo += ventaTotal;
              break;
            case "tarjeta":
              totales.total_tarjeta += ventaTotal;
              break;
            case "transferencia":
              totales.total_transferencia += ventaTotal;
              break;
          }

          // ✅ CALCULAR GANANCIAS
          if (venta.productos && Array.isArray(venta.productos)) {
            for (const producto of venta.productos) {
              try {
                const productInfo = await IndexedDBService.get(
                  "productos",
                  producto.producto_id
                );
                const precioCompraReal =
                  productInfo?.precio_compra || producto.precio_compra || 0;

                const gananciaProducto =
                  (producto.precio_unitario - precioCompraReal) *
                  producto.cantidad;
                const costoProducto = precioCompraReal * producto.cantidad;

                totales.ganancia_bruta += gananciaProducto;
                totales.costo_total += costoProducto;
              } catch (productError) {
                console.error(
                  `❌ Error procesando producto ${producto.producto_id}:`,
                  productError
                );
              }
            }
          }
        }
      }

      // ✅ CALCULAR SALDO FINAL TEÓRICO
      totales.saldo_final_teorico =
        totales.saldo_inicial + totales.total_efectivo;

      // Redondear a 2 decimales
      Object.keys(totales).forEach((key) => {
        if (typeof totales[key] === "number") {
          totales[key] = Math.round(totales[key] * 100) / 100;
        }
      });

      console.log("💰 TOTALES CALCULADOS:", totales);
      return totales;
    } catch (error) {
      console.error("❌ Error calculando totales:", error);
      return {
        cantidad_ventas: 0,
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        ganancia_bruta: 0,
        costo_total: 0,
        saldo_inicial: 0,
        saldo_final_teorico: 0,
      };
    }
  }

  // ✅ MÉTODO ALTERNATIVO: Obtener sesión usando SessionsOfflineController (si existe)
  async getSessionInfo(sesionId) {
    try {
      // Intentar usar SessionsOfflineController si está disponible y funciona
      if (
        SessionsOfflineController &&
        typeof SessionsOfflineController.getSessionById === "function"
      ) {
        return await SessionsOfflineController.getSessionById(sesionId);
      } else {
        // Fallback: buscar directamente en IndexedDB
        let sesion = await IndexedDBService.get(
          "sesiones_caja_offline",
          sesionId
        );
        if (!sesion) {
          const todasSesiones = await IndexedDBService.getAll(
            "sesiones_caja_offline"
          );
          sesion = todasSesiones.find(
            (s) =>
              s.id === sesionId ||
              s.id_local === sesionId ||
              s.id_servidor === sesionId
          );
        }
        return sesion;
      }
    } catch (error) {
      console.warn("⚠️ Error obteniendo sesión, usando fallback:", error);
      // Fallback final
      const todasSesiones = await IndexedDBService.getAll(
        "sesiones_caja_offline"
      );
      return todasSesiones.find(
        (s) =>
          s.id === sesionId ||
          s.id_local === sesionId ||
          s.id_servidor === sesionId
      );
    }
  }

  // ✅ MARCAR COMO SINCRONIZADO
  async markAsSynced(localId, serverData) {
    try {
      const closure = await IndexedDBService.get(this.storeName, localId);
      if (!closure) {
        console.warn(`⚠️ Cierre no encontrado: ${localId}`);
        return false;
      }

      const updatedClosure = {
        ...closure,
        ...serverData,
        id: serverData.id,
        sincronizado: true,
        fecha_sincronizacion: new Date().toISOString(),
      };

      await IndexedDBService.put(this.storeName, updatedClosure);

      console.log(
        `✅ Cierre marcado como sincronizado: ${localId} -> ${serverData.id}`
      );
      return true;
    } catch (error) {
      console.error(`❌ Error marcando cierre como sincronizado:`, error);
      return false;
    }
  }

  // ✅ OBTENER CIERRES PENDIENTES
  async getPendingClosures() {
    try {
      const cierres = await IndexedDBService.getPendingRecords(this.storeName);
      return cierres;
    } catch (error) {
      console.error("Error obteniendo cierres pendientes:", error);
      return [];
    }
  }

  // ✅ OBTENER CIERRE POR SESIÓN
  async getClosureBySession(sesionId) {
    try {
      const cierres = await IndexedDBService.getAll(this.storeName);
      return cierres.find(
        (c) =>
          c.sesion_caja_id === sesionId || c.sesion_caja_id_local === sesionId
      );
    } catch (error) {
      console.error("Error obteniendo cierre por sesión:", error);
      return null;
    }
  }

  // ✅ DIAGNÓSTICO EN TIEMPO REAL
  async realTimeDiagnosis(sesionId) {
    try {
      console.log("🔍 DIAGNÓSTICO EN TIEMPO REAL DEL CIERRE");

      // 1. Verificar sesión
      const sesion = await this.getSessionInfo(sesionId);

      // 2. Verificar ventas
      const ventas = await SalesOfflineController.getSalesBySession(sesionId);

      // 3. Calcular manualmente
      let calculoManual = {
        total_ventas: 0,
        total_efectivo: 0,
        cantidad_ventas: 0,
      };

      ventas.forEach((venta) => {
        calculoManual.total_ventas += parseFloat(venta.total || 0);
        calculoManual.cantidad_ventas++;

        if (venta.metodo_pago === "efectivo") {
          calculoManual.total_efectivo += parseFloat(venta.total || 0);
        }
      });

      return {
        sesionEncontrada: !!sesion,
        saldoInicial: sesion?.saldo_inicial || 0,
        ventasParaSesion: ventas.length,
        calculoManual: calculoManual,
        detallesVentas: ventas.map((v) => ({
          id: v.id_local,
          total: v.total,
          metodo_pago: v.metodo_pago,
          productos: v.productos?.length || 0,
        })),
      };
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      return { error: error.message };
    }
  }
}

export default new ClosuresOfflineController();
