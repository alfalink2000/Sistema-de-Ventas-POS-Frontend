// src/controllers/offline/SalesOfflineController/SalesOfflineController.js
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class SalesOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.salesStore = "ventas_pendientes";
    this.detailsStore = "detalles_venta_pendientes";
  }

  async deletePendingSale(localId) {
    try {
      console.log(`🗑️ Eliminando venta pendiente: ${localId}`);

      // ✅ PRIMERO: Eliminar detalles de la venta
      const detalles = await this.getSaleDetails(localId);
      console.log(`📋 Eliminando ${detalles.length} detalles...`);

      for (const detalle of detalles) {
        await IndexedDBService.delete(this.detailsStore, detalle.id_local);
        console.log(`✅ Detalle eliminado: ${detalle.id_local}`);
      }

      // ✅ LUEGO: Eliminar venta principal
      const result = await IndexedDBService.delete(this.salesStore, localId);

      if (!result) {
        console.warn(`⚠️ No se pudo eliminar venta principal: ${localId}`);
        return false;
      }

      console.log(`✅ Venta ${localId} y sus detalles eliminados`);
      return true;
    } catch (error) {
      console.error(`❌ Error eliminando venta ${localId}:`, error);
      return false;
    }
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

      // ✅ **CRÍTICO**: Verificar si la sesión es local o del servidor
      let sesionIdParaVenta = saleData.sesion_caja_id;
      let esSesionLocal = false;

      // Si la sesión empieza con "ses_local_", es una sesión local pura
      if (sesionIdParaVenta && sesionIdParaVenta.startsWith("ses_local_")) {
        esSesionLocal = true;
        console.log("📱 Usando sesión LOCAL para venta offline");
      } else {
        console.log("🌐 Sesión parece ser del servidor:", sesionIdParaVenta);
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
        es_sesion_local: esSesionLocal,
        estado: "completada",
        fecha_creacion: new Date().toISOString(),
        sesion_caja_id: sesionIdParaVenta.toString(),
        vendedor_id: saleData.vendedor_id.toString(),
      };

      console.log("💾 Guardando venta offline:", {
        id_local: localId,
        sesion_caja_id: sesionIdParaVenta,
        es_sesion_local: esSesionLocal,
      });

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
        es_sesion_local: esSesionLocal,
      };
    } catch (error) {
      console.error("❌ Error creando venta offline:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ✅ MÉTODO ALIAS para compatibilidad
  async createSale(saleData) {
    return await this.createSaleOffline(saleData);
  }

  // ✅ CREAR DETALLES DE VENTA MEJORADO
  async createSaleDetails(ventaIdLocal, productos) {
    try {
      console.log(
        `📦 Creando detalles para venta ${ventaIdLocal}...`,
        productos
      );

      for (const [index, producto] of productos.entries()) {
        const detalleId = await this.generateLocalId("detalle");

        // ✅ OBTENER INFORMACIÓN COMPLETA DEL PRODUCTO
        let productInfo;
        try {
          productInfo = await IndexedDBService.get(
            "productos",
            producto.producto_id
          );
          console.log(
            `🔍 Información del producto ${producto.producto_id}:`,
            productInfo
          );
        } catch (error) {
          console.warn(
            `⚠️ No se pudo obtener información del producto ${producto.producto_id}:`,
            error
          );
          productInfo = null;
        }

        // ✅ USAR LOS DATOS CORRECTOS - FIX CRÍTICO
        const precioCompraReal =
          productInfo?.precio_compra || producto.precio_compra || 0;
        const nombreProducto =
          producto.nombre ||
          productInfo?.nombre ||
          `Producto ${producto.producto_id}`;

        const detalle = {
          id_local: detalleId,
          venta_id_local: ventaIdLocal,
          producto_id: producto.producto_id.toString(),
          cantidad: parseInt(producto.cantidad),
          precio_unitario: parseFloat(producto.precio_unitario),
          precio_compra: parseFloat(precioCompraReal),
          subtotal: parseFloat(producto.subtotal),
          ganancia: parseFloat(
            (parseFloat(producto.precio_unitario) -
              parseFloat(precioCompraReal)) *
              parseInt(producto.cantidad)
          ),
          sincronizado: false,
          fecha_creacion: new Date().toISOString(),
          producto_nombre: nombreProducto,
          // ✅ AGREGAR MÁS INFORMACIÓN PARA DIAGNÓSTICO
          producto_data: {
            id: producto.producto_id,
            nombre: nombreProducto,
            precio_venta: producto.precio_unitario,
            precio_compra: precioCompraReal,
          },
        };

        console.log(`💾 Guardando detalle ${detalleId}:`, {
          producto: detalle.producto_nombre,
          cantidad: detalle.cantidad,
          precio: detalle.precio_unitario,
          venta_id_local: detalle.venta_id_local,
        });

        const detalleGuardado = await IndexedDBService.add(
          this.detailsStore,
          detalle
        );

        if (!detalleGuardado) {
          console.error(`❌ No se pudo guardar detalle ${detalleId}`);
          throw new Error(
            `Error guardando detalle del producto ${producto.producto_id}`
          );
        } else {
          console.log(`✅ Detalle ${detalleId} guardado exitosamente`);
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

  // ✅ OBTENER VENTAS POR SESIÓN - CORREGIDO
  async getSalesBySession(sesionId) {
    try {
      console.log(
        `🔍 [SALES OFFLINE] Buscando ventas para sesión: ${sesionId}`
      );

      const ventas = await IndexedDBService.getAll(this.salesStore);
      console.log(`📊 [SALES OFFLINE] Total ventas en BD: ${ventas.length}`);

      // ✅ BUSCAR POR DIFERENTES FORMATOS DE ID
      const ventasFiltradas = ventas.filter((venta) => {
        const matches =
          venta.sesion_caja_id === sesionId ||
          venta.sesion_caja_id_local === sesionId ||
          (venta.sesion_caja_id &&
            venta.sesion_caja_id.toString() === sesionId.toString()) ||
          (venta.sesion_caja_id_local &&
            venta.sesion_caja_id_local.toString() === sesionId.toString());

        if (matches) {
          console.log(`✅ Venta encontrada para sesión ${sesionId}:`, {
            venta_id: venta.id_local,
            sesion_caja_id: venta.sesion_caja_id,
            sesion_caja_id_local: venta.sesion_caja_id_local,
            total: venta.total,
          });
        }

        return matches;
      });

      console.log(
        `📊 [SALES OFFLINE] ${ventasFiltradas.length} ventas para sesión ${sesionId}`
      );

      // ✅ DEBUG DETALLADO
      if (ventasFiltradas.length === 0) {
        console.warn(`⚠️ No se encontraron ventas para sesión: ${sesionId}`);
        console.log(
          "🔍 Todas las ventas disponibles:",
          ventas.map((v) => ({
            id: v.id_local,
            sesion_caja_id: v.sesion_caja_id,
            sesion_caja_id_local: v.sesion_caja_id_local,
            total: v.total,
          }))
        );
      }

      return ventasFiltradas;
    } catch (error) {
      console.error("❌ Error obteniendo ventas por sesión:", error);
      return [];
    }
  }

  // ✅ OBTENER DETALLES DE VENTA
  async getSaleDetails(ventaIdLocal) {
    try {
      console.log(`🔍 Obteniendo detalles para venta: ${ventaIdLocal}`);

      const detalles = await IndexedDBService.getAll(this.detailsStore);
      const detallesFiltrados = detalles.filter(
        (detalle) => detalle.venta_id_local === ventaIdLocal
      );

      console.log(
        `📊 ${detallesFiltrados.length} detalles encontrados para venta ${ventaIdLocal}`
      );
      return detallesFiltrados;
    } catch (error) {
      console.error(
        `❌ Error obteniendo detalles de venta ${ventaIdLocal}:`,
        error
      );
      return [];
    }
  }

  // ✅ NUEVO MÉTODO PARA OBTENER PRODUCTOS AGRUPADOS POR SESIÓN
  async getGroupedProductsBySession(sesionId) {
    try {
      console.log(`📊 Agrupando productos para sesión: ${sesionId}`);

      // Obtener ventas de la sesión
      const ventas = await this.getSalesBySession(sesionId);
      console.log(`🛒 ${ventas.length} ventas encontradas para agrupar`);

      const productosAgrupados = {};
      let totalDetalles = 0;

      for (const venta of ventas) {
        console.log(`🔍 Procesando venta: ${venta.id_local}`);

        // Obtener detalles de cada venta
        const detalles = await this.getSaleDetails(venta.id_local);
        console.log(
          `📦 Venta ${venta.id_local} tiene ${detalles.length} detalles`
        );

        totalDetalles += detalles.length;

        for (const detalle of detalles) {
          const productoId = detalle.producto_id;

          console.log(`🔍 Procesando detalle:`, {
            producto_id: productoId,
            nombre: detalle.producto_nombre,
            cantidad: detalle.cantidad,
            precio: detalle.precio_unitario,
          });

          if (!productosAgrupados[productoId]) {
            // Obtener información completa del producto
            let productoInfo;
            try {
              productoInfo = await IndexedDBService.get(
                "productos",
                productoId
              );
            } catch (error) {
              console.warn(
                `⚠️ No se pudo obtener producto ${productoId}:`,
                error
              );
              productoInfo = null;
            }

            productosAgrupados[productoId] = {
              producto_id: productoId,
              nombre:
                detalle.producto_nombre ||
                productoInfo?.nombre ||
                `Producto ${productoId}`,
              cantidad_total: 0,
              precio_venta_unitario: detalle.precio_unitario,
              precio_compra_unitario:
                detalle.precio_compra || productoInfo?.precio_compra || 0,
              subtotal_total: 0,
              ganancia_total: 0,
              producto_info: productoInfo,
            };
          }

          // Acumular cantidades y totales
          productosAgrupados[productoId].cantidad_total += detalle.cantidad;
          productosAgrupados[productoId].subtotal_total += detalle.subtotal;
          productosAgrupados[productoId].ganancia_total +=
            detalle.ganancia ||
            (detalle.precio_unitario - (detalle.precio_compra || 0)) *
              detalle.cantidad;
        }
      }

      const resultado = Object.values(productosAgrupados);
      console.log(
        `📦 ${resultado.length} productos únicos vendidos en la sesión (de ${totalDetalles} detalles totales)`
      );

      // DEBUG: Mostrar los productos encontrados
      resultado.forEach((producto, index) => {
        console.log(
          `   ${index + 1}. ${producto.nombre}: x${producto.cantidad_total}`
        );
      });

      return resultado;
    } catch (error) {
      console.error("❌ Error agrupando productos por sesión:", error);
      return [];
    }
  }

  async getVentasBySesion(sesionId) {
    return await this.getSalesBySession(sesionId);
  }
  // ✅ MÉTODO MEJORADO PARA OBTENER VENTAS CON PRODUCTOS
  async getVentasConProductosBySesion(sesionId) {
    try {
      console.log(
        `🔍 [SALES] Buscando ventas con productos para sesión: ${sesionId}`
      );

      // Obtener ventas de la sesión
      const ventas = await this.getSalesBySession(sesionId);
      console.log(`📊 [SALES] ${ventas.length} ventas encontradas`);

      // Para cada venta, obtener sus productos/detalles
      const ventasConProductos = [];

      for (const venta of ventas) {
        let productosVenta = [];

        // ✅ INTENTAR DIFERENTES ESTRUCTURAS
        if (venta.productos && Array.isArray(venta.productos)) {
          // Caso 1: Productos directamente en la venta
          productosVenta = venta.productos;
          console.log(
            `🛒 Venta ${venta.id_local} tiene productos directos: ${productosVenta.length}`
          );
        } else {
          // Caso 2: Buscar en detalles
          const detalles = await this.getSaleDetails(venta.id_local);
          console.log(
            `📋 Venta ${venta.id_local} tiene detalles: ${detalles.length}`
          );

          // Convertir detalles a formato de productos
          productosVenta = detalles.map((detalle) => ({
            producto_id: detalle.producto_id,
            cantidad: detalle.cantidad,
            precio_unitario: detalle.precio_unitario,
            subtotal: detalle.subtotal,
            nombre: detalle.producto_nombre,
            producto_nombre: detalle.producto_nombre,
          }));
        }

        ventasConProductos.push({
          ...venta,
          productos: productosVenta,
        });
      }

      console.log(
        `✅ [SALES] ${ventasConProductos.length} ventas con productos procesadas`
      );

      // DEBUG: Mostrar resumen de productos
      const totalProductos = ventasConProductos.reduce(
        (sum, v) => sum + (v.productos?.length || 0),
        0
      );
      console.log(
        `📦 Total de productos en todas las ventas: ${totalProductos}`
      );

      return ventasConProductos;
    } catch (error) {
      console.error("❌ Error obteniendo ventas con productos:", error);
      return [];
    }
  }
  // ✅ MÉTODO PARA DEBUG DETALLADO DE VENTAS
  async debugVentasSesion(sesionId) {
    try {
      console.log(`🐛 [DEBUG] Iniciando debug para sesión: ${sesionId}`);

      const ventas = await this.getSalesBySession(sesionId);
      console.log(`📊 [DEBUG] ${ventas.length} ventas encontradas`);

      for (const [index, venta] of ventas.entries()) {
        console.log(`\n--- Venta ${index + 1} ---`);
        console.log(`ID: ${venta.id_local || venta.id}`);
        console.log(`Total: $${venta.total}`);
        console.log(`Método Pago: ${venta.metodo_pago}`);
        console.log(`Fecha: ${venta.fecha_venta || venta.created_at}`);

        // Verificar productos directos
        if (venta.productos && Array.isArray(venta.productos)) {
          console.log(`🛒 Productos directos: ${venta.productos.length}`);
          venta.productos.forEach((p, i) => {
            console.log(
              `   ${i + 1}. ${p.nombre || p.producto_nombre} - x${
                p.cantidad
              } - $${p.precio_unitario}`
            );
          });
        } else {
          console.log(`❌ No tiene productos directos`);
        }

        // Verificar detalles
        const detalles = await this.getSaleDetails(venta.id_local);
        console.log(`📋 Detalles: ${detalles.length}`);
        detalles.forEach((d, i) => {
          console.log(
            `   ${i + 1}. ${d.producto_nombre} - x${d.cantidad} - $${
              d.precio_unitario
            }`
          );
        });
      }

      return ventas;
    } catch (error) {
      console.error("❌ Error en debug:", error);
      return [];
    }
  }

  // ✅ MÉTODO PARA OBTENER RESUMEN COMPLETO DE VENTAS
  async getSalesSummaryBySession(sesionId) {
    try {
      const [ventas, productosAgrupados] = await Promise.all([
        this.getSalesBySession(sesionId),
        this.getGroupedProductsBySession(sesionId),
      ]);

      // Calcular totales generales
      const totales = {
        total_ventas: ventas.reduce(
          (sum, venta) => sum + (venta.total || 0),
          0
        ),
        total_efectivo: ventas
          .filter((v) => v.metodo_pago === "efectivo")
          .reduce((sum, venta) => sum + (venta.total || 0), 0),
        total_tarjeta: ventas
          .filter((v) => v.metodo_pago === "tarjeta")
          .reduce((sum, venta) => sum + (venta.total || 0), 0),
        total_transferencia: ventas
          .filter((v) => v.metodo_pago === "transferencia")
          .reduce((sum, venta) => sum + (venta.total || 0), 0),
        cantidad_ventas: ventas.length,
        ganancia_bruta: productosAgrupados.reduce(
          (sum, producto) => sum + producto.ganancia_total,
          0
        ),
        productos_vendidos: productosAgrupados.reduce(
          (sum, producto) => sum + producto.cantidad_total,
          0
        ),
      };

      return {
        ventas,
        productosAgrupados,
        totales,
      };
    } catch (error) {
      console.error("❌ Error obteniendo resumen de ventas:", error);
      throw error;
    }
  }

  // ✅ SINCRONIZAR VENTAS PENDIENTES
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
          id_servidor: serverData.id,
          fecha_sincronizacion: new Date().toISOString(),
        });
      }

      // Marcar detalles también
      const detalles = await this.getSaleDetails(localId);
      for (const detalle of detalles) {
        await IndexedDBService.put(this.detailsStore, {
          ...detalle,
          sincronizado: true,
          venta_id: serverData.id,
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

  // ✅ SINCRONIZACIÓN COMPLETA
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
