// src/services/OfflineClosureService.js
import IndexedDBService from "./IndexedDBService";

class OfflineClosureService {
  // ✅ CALCULAR TOTALES OFFLINE PARA UNA SESIÓN
  async calculateClosureTotals(sesionIdLocal) {
    try {
      console.log(
        `🧮 [OFFLINE] Calculando totales para sesión local: ${sesionIdLocal}`
      );

      // Obtener todas las ventas de esta sesión
      const ventasPendientes = await IndexedDBService.getAll(
        "ventas_pendientes",
        "sesion_caja_id_local",
        sesionIdLocal
      );

      console.log(
        `📊 [OFFLINE] Ventas encontradas: ${ventasPendientes.length}`
      );

      let totales = {
        cantidad_ventas: 0,
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        ganancia_bruta: 0,
      };

      // Procesar cada venta
      for (const venta of ventasPendientes) {
        if (venta.estado !== "cancelada") {
          totales.cantidad_ventas++;
          totales.total_ventas += parseFloat(venta.total || 0);

          // Sumar por método de pago
          switch (venta.metodo_pago) {
            case "efectivo":
              totales.total_efectivo += parseFloat(venta.total || 0);
              break;
            case "tarjeta":
              totales.total_tarjeta += parseFloat(venta.total || 0);
              break;
            case "transferencia":
              totales.total_transferencia += parseFloat(venta.total || 0);
              break;
          }

          // Calcular ganancia bruta de esta venta
          const gananciaVenta = await this.calculateSaleProfit(venta.id_local);
          totales.ganancia_bruta += gananciaVenta;
        }
      }

      // Redondear a 2 decimales
      totales.total_ventas = this.roundToTwo(totales.total_ventas);
      totales.total_efectivo = this.roundToTwo(totales.total_efectivo);
      totales.total_tarjeta = this.roundToTwo(totales.total_tarjeta);
      totales.total_transferencia = this.roundToTwo(
        totales.total_transferencia
      );
      totales.ganancia_bruta = this.roundToTwo(totales.ganancia_bruta);

      console.log("✅ [OFFLINE] Totales calculados:", totales);
      return totales;
    } catch (error) {
      console.error("❌ [OFFLINE] Error calculando totales:", error);

      // Devolver totales en cero en caso de error
      return {
        cantidad_ventas: 0,
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        ganancia_bruta: 0,
      };
    }
  }

  // ✅ CALCULAR GANANCIA DE UNA VENTA ESPECÍFICA
  async calculateSaleProfit(ventaIdLocal) {
    try {
      // Obtener detalles de la venta
      const detallesVenta = await IndexedDBService.getAll(
        "detalles_venta_pendientes",
        "venta_id_local",
        ventaIdLocal
      );

      let gananciaVenta = 0;

      for (const detalle of detallesVenta) {
        // Obtener información del producto
        const producto = await IndexedDBService.get(
          "productos",
          detalle.producto_id
        );

        if (producto) {
          const costo = parseFloat(producto.precio_compra || 0);
          const precioVenta = parseFloat(detalle.precio_unitario || 0);
          const cantidad = parseInt(detalle.cantidad || 1);

          const gananciaProducto = (precioVenta - costo) * cantidad;
          gananciaVenta += gananciaProducto;
        }
      }

      return this.roundToTwo(gananciaVenta);
    } catch (error) {
      console.error(
        `❌ [OFFLINE] Error calculando ganancia venta ${ventaIdLocal}:`,
        error
      );
      return 0;
    }
  }

  // ✅ CREAR CIERRE OFFLINE
  async createOfflineClosure(closureData) {
    try {
      console.log("🔄 [OFFLINE] Creando cierre local:", closureData);

      const cierreCompleto = {
        ...closureData,
        fecha_cierre: new Date().toISOString(),
        estado: "completado",
        sincronizado: false,
        id_local: Date.now(), // ID temporal
      };

      // Guardar en IndexedDB
      const cierreId = await IndexedDBService.add(
        "cierres_pendientes",
        cierreCompleto
      );

      console.log("✅ [OFFLINE] Cierre local creado con ID:", cierreId);

      return {
        success: true,
        cierre: { ...cierreCompleto, id: cierreId },
        message:
          "Cierre guardado localmente. Se sincronizará cuando haya conexión.",
      };
    } catch (error) {
      console.error("❌ [OFFLINE] Error creando cierre local:", error);
      return {
        success: false,
        error: "Error guardando cierre localmente",
      };
    }
  }

  // ✅ OBTENER SALDO INICIAL DE LA SESIÓN
  async getSessionInitialBalance(sesionIdLocal) {
    try {
      const sesion = await IndexedDBService.get(
        "sesiones_caja_offline",
        sesionIdLocal
      );
      return parseFloat(sesion?.saldo_inicial || 0);
    } catch (error) {
      console.error("❌ [OFFLINE] Error obteniendo saldo inicial:", error);
      return 0;
    }
  }

  // ✅ CALCULAR SALDO FINAL TEÓRICO
  calculateTheoreticalFinalBalance(saldoInicial, totalEfectivo) {
    return this.roundToTwo(saldoInicial + totalEfectivo);
  }

  // ✅ CALCULAR DIFERENCIA
  calculateDifference(saldoFinalReal, saldoFinalTeorico) {
    return this.roundToTwo(saldoFinalReal - saldoFinalTeorico);
  }

  // ✅ MÉTODO AUXILIAR PARA REDONDEAR
  roundToTwo(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  // ✅ OBTENER RESUMEN COMPLETO PARA CIERRE
  async getClosureSummary(sesionIdLocal, saldoFinalReal) {
    try {
      // 1. Obtener saldo inicial
      const saldoInicial = await this.getSessionInitialBalance(sesionIdLocal);

      // 2. Calcular totales
      const totales = await this.calculateClosureTotals(sesionIdLocal);

      // 3. Calcular saldo final teórico
      const saldoFinalTeorico = this.calculateTheoreticalFinalBalance(
        saldoInicial,
        totales.total_efectivo
      );

      // 4. Calcular diferencia
      const diferencia = this.calculateDifference(
        saldoFinalReal,
        saldoFinalTeorico
      );

      return {
        saldo_inicial: saldoInicial,
        ...totales,
        saldo_final_teorico: saldoFinalTeorico,
        saldo_final_real: saldoFinalReal,
        diferencia: diferencia,
        estado_diferencia:
          diferencia === 0
            ? "exacto"
            : diferencia > 0
            ? "sobrante"
            : "faltante",
      };
    } catch (error) {
      console.error("❌ [OFFLINE] Error obteniendo resumen de cierre:", error);
      throw error;
    }
  }
}

export default new OfflineClosureService();
