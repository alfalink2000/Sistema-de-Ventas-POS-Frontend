// src/services/OfflineClosureService.js - COMPLETO Y CORREGIDO
import IndexedDBService from "./IndexedDBService";

class OfflineClosureService {
  // ✅ CALCULAR TOTALES OFFLINE MEJORADO PARA UNA SESIÓN
  async calculateClosureTotals(sesionIdLocal) {
    try {
      console.log(
        `🧮 [OFFLINE] Calculando totales para sesión: ${sesionIdLocal}`
      );

      // Obtener todas las ventas (tanto pendientes como sincronizadas)
      const allVentas = await IndexedDBService.getAll("ventas_pendientes");

      // Filtrar ventas de esta sesión (compatibilidad con id_local y id)
      const ventasSesion = allVentas.filter((venta) => {
        const matchesLocal = venta.sesion_caja_id_local === sesionIdLocal;
        const matchesId = venta.sesion_caja_id === sesionIdLocal;
        const matchesSession = venta.sesion_caja_id === sesionIdLocal;

        return matchesLocal || matchesId || matchesSession;
      });

      console.log(
        `📊 [OFFLINE] Ventas encontradas para sesión: ${ventasSesion.length}`
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
      for (const venta of ventasSesion) {
        if (venta.estado !== "cancelada" && venta.estado !== "rechazada") {
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
            default:
              // Por defecto, considerar como efectivo
              totales.total_efectivo += parseFloat(venta.total || 0);
          }

          // Calcular ganancia bruta de esta venta
          const ventaId = venta.id_local || venta.id;
          const gananciaVenta = await this.calculateSaleProfit(ventaId);
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
      return this.getDefaultTotales();
    }
  }

  // ✅ CALCULAR GANANCIA DE UNA VENTA ESPECÍFICA - MEJORADO
  async calculateSaleProfit(ventaId) {
    try {
      // Obtener detalles de la venta
      const detallesVenta = await IndexedDBService.getAll(
        "detalles_venta_pendientes"
      );

      // Filtrar detalles por venta_id_local o venta_id
      const detallesFiltrados = detallesVenta.filter(
        (detalle) =>
          detalle.venta_id_local === ventaId || detalle.venta_id === ventaId
      );

      let gananciaVenta = 0;

      for (const detalle of detallesFiltrados) {
        try {
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
        } catch (productError) {
          console.warn(
            `⚠️ [OFFLINE] Producto no encontrado: ${detalle.producto_id}`
          );
          // Continuar con el siguiente producto
        }
      }

      return this.roundToTwo(gananciaVenta);
    } catch (error) {
      console.error(
        `❌ [OFFLINE] Error calculando ganancia venta ${ventaId}:`,
        error
      );
      return 0;
    }
  }

  // ✅ CREAR CIERRE OFFLINE - COMPLETAMENTE ACTUALIZADO
  async createOfflineClosure(closureData) {
    try {
      console.log("🔄 [OFFLINE] Creando cierre local completo:", closureData);

      const cierreCompleto = {
        ...closureData,
        fecha_cierre: new Date().toISOString(),
        fecha_apertura: closureData.fecha_apertura || new Date().toISOString(),
        estado: "completado",
        sincronizado: false,
        id_local: `cierre_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        vendedor_nombre: closureData.vendedor_nombre || "Vendedor Offline",
        // Asegurar que todos los campos numéricos estén presentes y sean válidos
        total_ventas: parseFloat(closureData.total_ventas || 0),
        total_efectivo: parseFloat(closureData.total_efectivo || 0),
        total_tarjeta: parseFloat(closureData.total_tarjeta || 0),
        total_transferencia: parseFloat(closureData.total_transferencia || 0),
        ganancia_bruta: parseFloat(closureData.ganancia_bruta || 0),
        saldo_inicial: parseFloat(closureData.saldo_inicial || 0),
        saldo_final_teorico: parseFloat(closureData.saldo_final_teorico || 0),
        saldo_final_real: parseFloat(closureData.saldo_final_real || 0),
        diferencia: parseFloat(closureData.diferencia || 0),
        observaciones:
          closureData.observaciones || "Cierre realizado en modo offline",
        es_local: true,
        creado_en_offline: true,
        fecha_creacion: new Date().toISOString(),
      };

      console.log("💾 [OFFLINE] Guardando cierre en IndexedDB...");

      // Guardar en cierres_pendientes para sincronización futura
      await IndexedDBService.add("cierres_pendientes", cierreCompleto);

      // También guardar en cierres para el historial local inmediato
      await IndexedDBService.add("cierres", {
        ...cierreCompleto,
        id: cierreCompleto.id_local, // Usar id_local como ID para el historial
      });

      console.log(
        "✅ [OFFLINE] Cierre local creado exitosamente:",
        cierreCompleto.id_local
      );

      return {
        success: true,
        cierre: cierreCompleto,
        message:
          "Cierre guardado localmente. Se sincronizará cuando haya conexión a internet.",
      };
    } catch (error) {
      console.error("❌ [OFFLINE] Error creando cierre local:", error);
      return {
        success: false,
        error: "Error guardando cierre localmente: " + error.message,
      };
    }
  }

  // ✅ OBTENER SALDO INICIAL DE LA SESIÓN - MEJORADO
  async getSessionInitialBalance(sesionIdLocal) {
    try {
      // Buscar en sesiones offline primero
      let sesion = await IndexedDBService.get(
        "sesiones_caja_offline",
        sesionIdLocal
      );

      if (!sesion) {
        // Si no encuentra por key, buscar en todas las sesiones
        const todasSesiones = await IndexedDBService.getAll(
          "sesiones_caja_offline"
        );
        sesion = todasSesiones.find(
          (s) =>
            s.id_local === sesionIdLocal ||
            s.id === sesionIdLocal ||
            s.id_local?.toString() === sesionIdLocal?.toString()
        );
      }

      if (sesion) {
        return parseFloat(sesion.saldo_inicial || 0);
      }

      console.warn(`⚠️ [OFFLINE] Sesión no encontrada: ${sesionIdLocal}`);
      return 0;
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

  // ✅ OBTENER RESUMEN COMPLETO PARA CIERRE
  async getClosureSummary(sesionIdLocal, saldoFinalReal) {
    try {
      console.log(
        `📋 [OFFLINE] Generando resumen para sesión: ${sesionIdLocal}`
      );

      // 1. Obtener saldo inicial
      const saldoInicial = await this.getSessionInitialBalance(sesionIdLocal);
      console.log(`💰 [OFFLINE] Saldo inicial: ${saldoInicial}`);

      // 2. Calcular totales
      const totales = await this.calculateClosureTotals(sesionIdLocal);
      console.log(`📊 [OFFLINE] Totales calculados:`, totales);

      // 3. Calcular saldo final teórico
      const saldoFinalTeorico = this.calculateTheoreticalFinalBalance(
        saldoInicial,
        totales.total_efectivo
      );

      // 4. Calcular diferencia
      const diferencia = this.calculateDifference(
        parseFloat(saldoFinalReal),
        saldoFinalTeorico
      );

      const resumen = {
        saldo_inicial: saldoInicial,
        ...totales,
        saldo_final_teorico: saldoFinalTeorico,
        saldo_final_real: parseFloat(saldoFinalReal),
        diferencia: diferencia,
        estado_diferencia:
          diferencia === 0
            ? "exacto"
            : diferencia > 0
            ? "sobrante"
            : "faltante",
      };

      console.log("✅ [OFFLINE] Resumen generado:", resumen);
      return resumen;
    } catch (error) {
      console.error("❌ [OFFLINE] Error obteniendo resumen de cierre:", error);
      throw error;
    }
  }

  // ✅ OBTENER SESIÓN POR ID (compatibilidad)
  async getSessionById(sesionId) {
    try {
      // Buscar en sesiones offline
      const sesiones = await IndexedDBService.getAll("sesiones_caja_offline");
      const sesion = sesiones.find(
        (s) =>
          s.id_local === sesionId ||
          s.id === sesionId ||
          s.id_local?.toString() === sesionId?.toString()
      );

      return sesion || null;
    } catch (error) {
      console.error("❌ [OFFLINE] Error obteniendo sesión:", error);
      return null;
    }
  }

  // ✅ MÉTODO AUXILIAR PARA REDONDEAR
  roundToTwo(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  // ✅ TOTALES POR DEFECTO
  getDefaultTotales() {
    return {
      cantidad_ventas: 0,
      total_ventas: 0,
      total_efectivo: 0,
      total_tarjeta: 0,
      total_transferencia: 0,
      ganancia_bruta: 0,
    };
  }

  // ✅ VERIFICAR SI EXISTEN VENTAS PARA UNA SESIÓN
  async hasSalesForSession(sesionIdLocal) {
    try {
      const allVentas = await IndexedDBService.getAll("ventas_pendientes");
      const ventasSesion = allVentas.filter(
        (venta) =>
          venta.sesion_caja_id_local === sesionIdLocal ||
          venta.sesion_caja_id === sesionIdLocal
      );

      return ventasSesion.length > 0;
    } catch (error) {
      console.error("❌ [OFFLINE] Error verificando ventas:", error);
      return false;
    }
  }
}

export default new OfflineClosureService();
