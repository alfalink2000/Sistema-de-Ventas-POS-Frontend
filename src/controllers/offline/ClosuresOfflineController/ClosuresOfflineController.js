// src/controllers/offline/ClosuresOfflineController.js
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";
import SalesOfflineController from "../SalesOfflineController/SalesOfflineController";

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
  // En ClosuresOfflineController.js - AGREGAR ESTE MÉTODO
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
        id: serverData.id, // Guardar ID del servidor
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
  // ✅ CALCULAR TOTALES DE SESIÓN
  async calculateSessionTotals(sesionId) {
    try {
      const ventas = await SalesOfflineController.getSalesBySession(sesionId);

      let totales = {
        cantidad_ventas: 0,
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        ganancia_bruta: 0,
      };

      for (const venta of ventas) {
        if (venta.estado !== "cancelada") {
          totales.cantidad_ventas++;
          totales.total_ventas += parseFloat(venta.total || 0);

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

          // Calcular ganancia estimada (40%)
          totales.ganancia_bruta += parseFloat(venta.total || 0) * 0.4;
        }
      }

      // Redondear a 2 decimales
      Object.keys(totales).forEach((key) => {
        if (typeof totales[key] === "number") {
          totales[key] = Math.round(totales[key] * 100) / 100;
        }
      });

      return totales;
    } catch (error) {
      console.error("Error calculando totales:", error);
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
}

export default new ClosuresOfflineController();
