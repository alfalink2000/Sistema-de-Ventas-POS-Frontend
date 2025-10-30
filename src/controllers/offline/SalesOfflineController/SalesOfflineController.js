// src/controllers/offline/SalesOfflineController.js
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class SalesOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.salesStore = "ventas_pendientes";
    this.detailsStore = "detalles_venta_pendientes";
  }

  // ✅ CREAR VENTA OFFLINE
  async createSale(saleData) {
    try {
      await this.validateRequiredFields(saleData, [
        "productos",
        "total",
        "vendedor_id",
        "sesion_caja_id",
      ]);

      // Validar productos
      if (!saleData.productos || saleData.productos.length === 0) {
        throw new Error("La venta debe contener al menos un producto");
      }

      // Generar ID local
      const localId = await this.generateLocalId("venta");

      const ventaCompleta = {
        ...saleData,
        id_local: localId,
        fecha_venta: new Date().toISOString(),
        sincronizado: false,
        es_local: true,
        estado: "completada",
        fecha_creacion: new Date().toISOString(),
      };

      // Guardar venta principal
      await IndexedDBService.add(this.salesStore, ventaCompleta);

      // Guardar detalles de venta
      await this.createSaleDetails(localId, saleData.productos);

      console.log("✅ Venta offline creada:", localId);

      return {
        success: true,
        venta: ventaCompleta,
        id_local: localId,
      };
    } catch (error) {
      console.error("❌ Error creando venta offline:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ CREAR DETALLES DE VENTA
  async createSaleDetails(ventaIdLocal, productos) {
    try {
      for (const producto of productos) {
        const detalleId = await this.generateLocalId("detalle");

        const detalle = {
          id_local: detalleId,
          venta_id_local: ventaIdLocal,
          producto_id: producto.producto_id,
          cantidad: producto.cantidad,
          precio_unitario: producto.precio_unitario,
          subtotal: producto.subtotal,
          sincronizado: false,
          fecha_creacion: new Date().toISOString(),
        };

        await IndexedDBService.add(this.detailsStore, detalle);
      }

      console.log(`✅ ${productos.length} detalles de venta guardados`);
    } catch (error) {
      console.error("Error creando detalles de venta:", error);
      throw error;
    }
  }

  // ✅ OBTENER VENTAS PENDIENTES
  async getPendingSales() {
    try {
      const ventas = await IndexedDBService.getPendingRecords(this.salesStore);
      return ventas;
    } catch (error) {
      console.error("Error obteniendo ventas pendientes:", error);
      return [];
    }
  }

  // ✅ OBTENER VENTAS POR SESIÓN
  async getSalesBySession(sesionId) {
    try {
      const ventas = await IndexedDBService.getAll(this.salesStore);
      return ventas.filter(
        (venta) =>
          venta.sesion_caja_id === sesionId ||
          venta.sesion_caja_id_local === sesionId
      );
    } catch (error) {
      console.error("Error obteniendo ventas por sesión:", error);
      return [];
    }
  }

  // ✅ OBTENER DETALLES DE VENTA
  async getSaleDetails(ventaIdLocal) {
    try {
      const detalles = await IndexedDBService.getAll(this.detailsStore);
      return detalles.filter(
        (detalle) => detalle.venta_id_local === ventaIdLocal
      );
    } catch (error) {
      console.error("Error obteniendo detalles de venta:", error);
      return [];
    }
  }

  // ✅ SINCRONIZAR VENTAS PENDIENTES
  async syncPendingSales() {
    if (!this.isOnline) {
      return { success: false, error: "Sin conexión a internet" };
    }

    try {
      const pendingSales = await this.getPendingSales();
      const results = {
        total: pendingSales.length,
        success: 0,
        failed: 0,
      };

      for (const venta of pendingSales) {
        try {
          const response = await this.sendSaleToServer(venta);

          if (response.success) {
            await this.markSaleAsSynced(venta.id_local, response.data);
            results.success++;
          } else {
            results.failed++;
          }
        } catch (error) {
          console.error(`Error sincronizando venta ${venta.id_local}:`, error);
          results.failed++;
        }
      }

      return results;
    } catch (error) {
      console.error("Error en syncPendingSales:", error);
      return { success: false, error: error.message };
    }
  }

  async sendSaleToServer(ventaLocal) {
    try {
      const { id_local, ...ventaData } = ventaLocal;

      const response = await fetch(`${process.env.VITE_API_URL}/ventas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(ventaData),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data: data.venta };
      } else {
        const error = await response.json();
        return { success: false, error: error.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async markSaleAsSynced(localId, serverData) {
    await this.markAsSynced(this.salesStore, localId, serverData);

    // Marcar detalles también
    const detalles = await this.getSaleDetails(localId);
    for (const detalle of detalles) {
      await IndexedDBService.put(this.detailsStore, {
        ...detalle,
        sincronizado: true,
        venta_id: serverData.id,
      });
    }
  }
}

export default new SalesOfflineController();
