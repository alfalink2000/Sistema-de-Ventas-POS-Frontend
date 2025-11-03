// src/controllers/offline/SalesOfflineController/SalesOfflineController.js - VERSIÓN COMPLETA

import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class SalesOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.salesStore = "ventas_pendientes";
    this.detailsStore = "detalles_venta_pendientes";
  }

  // ✅ CREAR VENTA OFFLINE (MÉTODO PRINCIPAL)
  async createSaleOffline(saleData) {
    try {
      console.log("🔄 [SALES OFFLINE] Creando venta offline...", saleData);

      // Validar campos requeridos
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

      // Generar ID local único
      const localId = await this.generateLocalId("venta");

      // Preparar datos de la venta
      const ventaCompleta = {
        ...saleData,
        id_local: localId,
        fecha_venta: new Date().toISOString(),
        sincronizado: false,
        es_local: true,
        estado: "completada",
        fecha_creacion: new Date().toISOString(),
        // Asegurar que los IDs sean strings
        sesion_caja_id: saleData.sesion_caja_id.toString(),
        vendedor_id: saleData.vendedor_id.toString(),
      };

      console.log("💾 Guardando venta principal...", ventaCompleta);

      // Guardar venta principal
      const ventaGuardada = await IndexedDBService.add(
        this.salesStore,
        ventaCompleta
      );

      if (!ventaGuardada) {
        throw new Error("No se pudo guardar la venta en IndexedDB");
      }

      // Guardar detalles de venta
      await this.createSaleDetails(localId, saleData.productos);

      console.log("✅ Venta offline creada exitosamente:", localId);

      return {
        success: true,
        venta: ventaCompleta,
        id_local: localId,
      };
    } catch (error) {
      console.error("❌ Error creando venta offline:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ✅ MÉTODO ALIAS para compatibilidad (usa createSaleOffline internamente)
  async createSale(saleData) {
    return await this.createSaleOffline(saleData);
  }

  // ✅ CREAR DETALLES DE VENTA
  async createSaleDetails(ventaIdLocal, productos) {
    try {
      console.log(`📦 Creando detalles para venta ${ventaIdLocal}...`);

      for (const [index, producto] of productos.entries()) {
        const detalleId = await this.generateLocalId("detalle");

        const detalle = {
          id_local: detalleId,
          venta_id_local: ventaIdLocal,
          producto_id: producto.producto_id.toString(),
          cantidad: parseInt(producto.cantidad),
          precio_unitario: parseFloat(producto.precio_unitario),
          precio_compra: parseFloat(producto.precio_compra || 0), // ✅ GUARDAR PRECIO COMPRA
          subtotal: parseFloat(producto.subtotal),
          ganancia:
            (parseFloat(producto.precio_unitario) -
              parseFloat(producto.precio_compra || 0)) *
            parseInt(producto.cantidad),
          sincronizado: false,
          fecha_creacion: new Date().toISOString(),
          producto_nombre: producto.nombre || `Producto ${index + 1}`,
        };

        console.log(`💾 Guardando detalle ${detalleId}...`, detalle);

        const detalleGuardado = await IndexedDBService.add(
          this.detailsStore,
          detalle
        );

        if (!detalleGuardado) {
          console.error(`❌ No se pudo guardar detalle ${detalleId}`);
          throw new Error(
            `Error guardando detalle del producto ${producto.producto_id}`
          );
        }
      }

      console.log(
        `✅ ${productos.length} detalles de venta guardados para venta ${ventaIdLocal}`
      );
    } catch (error) {
      console.error("❌ Error creando detalles de venta:", error);
      throw error;
    }
  }

  // ✅ OBTENER VENTAS PENDIENTES
  async getPendingSales() {
    try {
      const ventas = await IndexedDBService.getPendingRecords(this.salesStore);
      console.log(
        `📊 [SALES OFFLINE] ${ventas.length} ventas pendientes encontradas`
      );
      return ventas;
    } catch (error) {
      console.error("❌ Error obteniendo ventas pendientes:", error);
      return [];
    }
  }

  // ✅ OBTENER VENTAS POR SESIÓN
  async getSalesBySession(sesionId) {
    try {
      const ventas = await IndexedDBService.getAll(this.salesStore);
      const ventasFiltradas = ventas.filter(
        (venta) =>
          venta.sesion_caja_id === sesionId ||
          venta.sesion_caja_id_local === sesionId
      );
      console.log(
        `📊 [SALES OFFLINE] ${ventasFiltradas.length} ventas para sesión ${sesionId}`
      );
      return ventasFiltradas;
    } catch (error) {
      console.error("❌ Error obteniendo ventas por sesión:", error);
      return [];
    }
  }

  // ✅ OBTENER DETALLES DE VENTA
  async getSaleDetails(ventaIdLocal) {
    try {
      const detalles = await IndexedDBService.getAll(this.detailsStore);
      const detallesFiltrados = detalles.filter(
        (detalle) => detalle.venta_id_local === ventaIdLocal
      );
      console.log(
        `📊 [SALES OFFLINE] ${detallesFiltrados.length} detalles para venta ${ventaIdLocal}`
      );
      return detallesFiltrados;
    } catch (error) {
      console.error("❌ Error obteniendo detalles de venta:", error);
      return [];
    }
  }

  // ✅ SINCRONIZAR VENTAS PENDIENTES - VERSIÓN CORREGIDA
  async syncPendingSales() {
    if (!this.isOnline) {
      return {
        success: false,
        error: "Sin conexión a internet",
        silent: true,
      };
    }

    try {
      const pendingSales = await this.getPendingSales();

      if (pendingSales.length === 0) {
        return {
          success: true,
          total: 0,
          success: 0,
          failed: 0,
          message: "No hay ventas pendientes para sincronizar",
        };
      }

      console.log(
        `🔄 [SALES OFFLINE] Sincronizando ${pendingSales.length} ventas pendientes...`
      );

      const results = {
        total: pendingSales.length,
        success: 0,
        failed: 0,
        errors: [],
      };

      for (const venta of pendingSales) {
        try {
          // ✅ CORREGIR: Usar URL directa en lugar de process.env
          const apiUrl = window.API_URL || "http://localhost:3000/api";

          // Preparar datos para el servidor
          const ventaParaServidor = {
            sesion_caja_id: venta.sesion_caja_id,
            vendedor_id: venta.vendedor_id,
            total: venta.total,
            metodo_pago: venta.metodo_pago || "efectivo",
            productos: venta.productos || [],
          };

          // Agregar campos opcionales si existen
          if (venta.efectivo_recibido !== undefined) {
            ventaParaServidor.efectivo_recibido = venta.efectivo_recibido;
          }
          if (venta.cambio !== undefined) {
            ventaParaServidor.cambio = venta.cambio;
          }

          console.log("🌐 Enviando venta al servidor:", ventaParaServidor);

          const response = await fetch(`${apiUrl}/ventas`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-token": localStorage.getItem("token"),
            },
            body: JSON.stringify(ventaParaServidor),
          });

          let responseData;

          if (response.ok) {
            responseData = await response.json();

            // ✅ MARCAR COMO SINCRONIZADO
            await this.markSaleAsSynced(venta.id_local, responseData.venta);
            results.success++;
            console.log(`✅ Venta ${venta.id_local} sincronizada exitosamente`);
          } else {
            responseData = await response.json().catch(() => ({}));
            throw new Error(
              responseData.error ||
                `Error ${response.status}: ${response.statusText}`
            );
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            venta_id: venta.id_local,
            error: error.message,
          });
          console.error(
            `❌ Error sincronizando venta ${venta.id_local}:`,
            error.message
          );
        }
      }

      console.log(`✅ [SALES OFFLINE] Sincronización completada:`, {
        total: results.total,
        success: results.success,
        failed: results.failed,
      });

      return {
        success: results.failed === 0,
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      };
    } catch (error) {
      console.error("❌ Error en syncPendingSales:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ✅ ENVIAR VENTA AL SERVIDOR
  async sendSaleToServer(ventaLocal) {
    try {
      // Obtener detalles de la venta
      const detalles = await this.getSaleDetails(ventaLocal.id_local);

      // Preparar datos para el servidor
      const ventaParaServidor = {
        sesion_caja_id: ventaLocal.sesion_caja_id,
        vendedor_id: ventaLocal.vendedor_id,
        total: ventaLocal.total,
        metodo_pago: ventaLocal.metodo_pago,
        productos: detalles.map((detalle) => ({
          producto_id: detalle.producto_id,
          cantidad: detalle.cantidad,
          precio_unitario: detalle.precio_unitario,
          subtotal: detalle.subtotal,
        })),
      };

      // Agregar campos opcionales si existen
      if (ventaLocal.efectivo_recibido !== undefined) {
        ventaParaServidor.efectivo_recibido = ventaLocal.efectivo_recibido;
      }
      if (ventaLocal.cambio !== undefined) {
        ventaParaServidor.cambio = ventaLocal.cambio;
      }

      console.log("🌐 Enviando venta al servidor:", ventaParaServidor);

      const response = await fetch(`${process.env.VITE_API_URL}/ventas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(ventaParaServidor),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data: data.venta,
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.message || "Error del servidor",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ✅ MARCAR VENTA COMO SINCRONIZADA
  async markSaleAsSynced(localId, serverData) {
    try {
      // Actualizar venta principal
      const ventaActual = await IndexedDBService.get(this.salesStore, localId);
      if (ventaActual) {
        await IndexedDBService.put(this.salesStore, {
          ...ventaActual,
          sincronizado: true,
          id_servidor: serverData.id, // Guardar ID del servidor
          fecha_sincronizacion: new Date().toISOString(),
        });
      }

      // Marcar detalles también
      const detalles = await this.getSaleDetails(localId);
      for (const detalle of detalles) {
        await IndexedDBService.put(this.detailsStore, {
          ...detalle,
          sincronizado: true,
          venta_id: serverData.id, // ID del servidor
          fecha_sincronizacion: new Date().toISOString(),
        });
      }

      console.log(`✅ Venta ${localId} marcada como sincronizada`);
    } catch (error) {
      console.error(
        `❌ Error marcando venta ${localId} como sincronizada:`,
        error
      );
      throw error;
    }
  }

  // ✅ SINCRONIZACIÓN COMPLETA (para usar desde actions)
  async fullSync() {
    return await this.syncPendingSales();
  }

  // ✅ OBTENER ESTADÍSTICAS
  async getStats() {
    try {
      const ventasPendientes = await this.getPendingSales();
      const todasLasVentas = await IndexedDBService.getAll(this.salesStore);

      return {
        total: todasLasVentas.length,
        pendientes: ventasPendientes.length,
        sincronizadas: todasLasVentas.length - ventasPendientes.length,
      };
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas de ventas:", error);
      return {
        total: 0,
        pendientes: 0,
        sincronizadas: 0,
      };
    }
  }
}

export default new SalesOfflineController();
