// src/controllers/offline/ProductsOfflineController/ProductsOfflineController.js - VERSIÓN COMPLETA
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class ProductsOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "productos";
    this.cacheStore = "cache_maestros";
  }

  // ✅ OBTENER TODOS LOS PRODUCTOS
  async getProducts(filters = {}) {
    try {
      let productos = await IndexedDBService.getAll(this.storeName);

      // Aplicar filtros
      if (filters.categoria_id) {
        productos = productos.filter(
          (p) => p.categoria_id === filters.categoria_id
        );
      }

      if (filters.activo !== undefined) {
        productos = productos.filter((p) => p.activo === filters.activo);
      }

      console.log(`✅ ${productos.length} productos obtenidos offline`);
      return productos;
    } catch (error) {
      console.error("❌ Error obteniendo productos offline:", error);
      return [];
    }
  }

  // ✅ OBTENER PRODUCTO POR ID
  async getProductById(productId) {
    try {
      const producto = await IndexedDBService.get(this.storeName, productId);

      if (!producto) {
        console.log(`⚠️ Producto ${productId} no encontrado en cache offline`);
        return null;
      }

      return producto;
    } catch (error) {
      console.error(`❌ Error obteniendo producto ${productId}:`, error);
      return null;
    }
  }

  // ✅ BUSCAR PRODUCTOS
  async searchProducts(searchTerm, categoriaId = null) {
    try {
      const productos = await this.getProducts();

      const term = searchTerm.toLowerCase();
      let resultados = productos.filter(
        (producto) =>
          producto.nombre.toLowerCase().includes(term) ||
          producto.descripcion?.toLowerCase().includes(term) ||
          producto.codigo_barras?.includes(searchTerm)
      );

      if (categoriaId) {
        resultados = resultados.filter((p) => p.categoria_id === categoriaId);
      }

      console.log(
        `🔍 ${resultados.length} productos encontrados para: "${searchTerm}"`
      );
      return resultados;
    } catch (error) {
      console.error("❌ Error buscando productos offline:", error);
      return [];
    }
  }

  // ✅ ACTUALIZAR STOCK OFFLINE
  async updateStock(productId, newStock, operationData = {}) {
    try {
      const producto = await this.getProductById(productId);

      if (!producto) {
        throw new Error(`Producto ${productId} no encontrado`);
      }

      const stockAnterior = producto.stock;

      // Validar stock no negativo
      if (newStock < 0) {
        throw new Error("El stock no puede ser negativo");
      }

      const productoActualizado = {
        ...producto,
        stock: newStock,
        ultima_actualizacion: new Date().toISOString(),
        operacion_stock: {
          anterior: stockAnterior,
          nuevo: newStock,
          fecha: new Date().toISOString(),
          ...operationData,
        },
      };

      await IndexedDBService.put(this.storeName, productoActualizado);

      console.log(
        `✅ Stock actualizado: ${producto.nombre} - ${stockAnterior} → ${newStock}`
      );

      return {
        success: true,
        producto: productoActualizado,
        stock_anterior: stockAnterior,
        stock_nuevo: newStock,
      };
    } catch (error) {
      console.error(`❌ Error actualizando stock de ${productId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ REDUCIR STOCK (PARA VENTAS)
  async reduceStock(productId, quantity, ventaId = null) {
    try {
      const producto = await this.getProductById(productId);

      if (!producto) {
        throw new Error(`Producto ${productId} no encontrado`);
      }

      const nuevoStock = producto.stock - quantity;

      if (nuevoStock < 0) {
        throw new Error(
          `Stock insuficiente: ${producto.nombre} (${producto.stock} disponible, ${quantity} solicitado)`
        );
      }

      return await this.updateStock(productId, nuevoStock, {
        tipo: "reduccion_venta",
        cantidad: quantity,
        venta_id: ventaId,
      });
    } catch (error) {
      console.error(`❌ Error reduciendo stock de ${productId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ AUMENTAR STOCK
  async increaseStock(productId, quantity, motivo = "ajuste") {
    try {
      const producto = await this.getProductById(productId);

      if (!producto) {
        throw new Error(`Producto ${productId} no encontrado`);
      }

      const nuevoStock = producto.stock + quantity;

      return await this.updateStock(productId, nuevoStock, {
        tipo: "incremento",
        cantidad: quantity,
        motivo: motivo,
      });
    } catch (error) {
      console.error(`❌ Error aumentando stock de ${productId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ OBTENER PRODUCTOS BAJO STOCK
  async getLowStockProducts(limite = 10) {
    try {
      const productos = await this.getProducts({ activo: true });

      const bajoStock = productos
        .filter((p) => p.stock <= p.stock_minimo)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, limite);

      console.log(`📉 ${bajoStock.length} productos con stock bajo`);
      return bajoStock;
    } catch (error) {
      console.error("❌ Error obteniendo productos bajo stock:", error);
      return [];
    }
  }

  // ✅ SINCRONIZAR PRODUCTOS DESDE SERVIDOR
  async syncProductsFromServer() {
    if (!this.isOnline) {
      return { success: false, error: "Sin conexión a internet" };
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return { success: false, error: "No hay token disponible" };
      }

      console.log("🔄 Sincronizando productos desde servidor...");

      const response = await fetch(`${process.env.VITE_API_URL}/productos`, {
        headers: {
          "Content-Type": "application/json",
          "x-token": token,
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.ok && data.productos) {
          // Limpiar cache anterior
          await IndexedDBService.clear(this.storeName);

          let savedCount = 0;
          for (const producto of data.productos) {
            await IndexedDBService.add(this.storeName, producto);
            savedCount++;
          }

          // Actualizar cache timestamp
          await this.updateProductsCacheTimestamp();

          console.log(`✅ ${savedCount} productos sincronizados offline`);

          return {
            success: true,
            count: savedCount,
            message: `${savedCount} productos actualizados offline`,
          };
        }
      }

      return {
        success: false,
        error: "Error obteniendo productos del servidor",
      };
    } catch (error) {
      console.error("❌ Error sincronizando productos:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ ACTUALIZAR TIMESTAMP DEL CACHE
  async updateProductsCacheTimestamp() {
    try {
      await IndexedDBService.put(this.cacheStore, {
        tipo: "productos",
        ultima_actualizacion: new Date().toISOString(),
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error actualizando timestamp:", error);
    }
  }

  // ✅ VERIFICAR SI EL CACHE ESTÁ ACTUALIZADO
  async isCacheUpdated(maxAgeMinutes = 30) {
    try {
      const cache = await IndexedDBService.get(this.cacheStore, "productos");

      if (!cache) {
        return false;
      }

      const age = Date.now() - cache.timestamp;
      const maxAge = maxAgeMinutes * 60 * 1000;

      return age < maxAge;
    } catch (error) {
      console.error("Error verificando cache:", error);
      return false;
    }
  }

  // ✅ OBTENER ESTADÍSTICAS DE PRODUCTOS
  async getProductsStats() {
    try {
      const productos = await this.getProducts();

      const stats = {
        total: productos.length,
        activos: productos.filter((p) => p.activo).length,
        inactivos: productos.filter((p) => !p.activo).length,
        bajo_stock: productos.filter((p) => p.stock <= p.stock_minimo).length,
        sin_stock: productos.filter((p) => p.stock === 0).length,
        por_categoria: {},
      };

      // Agrupar por categoría
      productos.forEach((producto) => {
        if (!stats.por_categoria[producto.categoria_id]) {
          stats.por_categoria[producto.categoria_id] = 0;
        }
        stats.por_categoria[producto.categoria_id]++;
      });

      return stats;
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      return null;
    }
  }

  // ✅ VALIDAR STOCK PARA VENTA
  async validateStockForSale(productosVenta) {
    try {
      const errores = [];
      const productosValidos = [];

      for (const item of productosVenta) {
        const producto = await this.getProductById(item.producto_id);

        if (!producto) {
          errores.push(`Producto no encontrado: ${item.producto_id}`);
          continue;
        }

        if (!producto.activo) {
          errores.push(`Producto inactivo: ${producto.nombre}`);
          continue;
        }

        if (producto.stock < item.cantidad) {
          errores.push(
            `Stock insuficiente: ${producto.nombre} (${producto.stock} disponible, ${item.cantidad} solicitado)`
          );
          continue;
        }

        productosValidos.push({
          ...item,
          producto,
          stock_disponible: producto.stock,
        });
      }

      return {
        valido: errores.length === 0,
        productosValidos,
        errores,
        puedeProcesar: productosValidos.length > 0,
      };
    } catch (error) {
      console.error("❌ Error validando stock:", error);
      return {
        valido: false,
        productosValidos: [],
        errores: [error.message],
        puedeProcesar: false,
      };
    }
  }

  // ✅ PROCESAR ACTUALIZACIÓN DE STOCK POR VENTA
  async processSaleStockUpdate(productosVenta, ventaId = null) {
    try {
      const resultados = {
        exitosos: [],
        fallidos: [],
      };

      for (const item of productosVenta) {
        const result = await this.reduceStock(
          item.producto_id,
          item.cantidad,
          ventaId
        );

        if (result.success) {
          resultados.exitosos.push({
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            stock_anterior: result.stock_anterior,
            stock_nuevo: result.stock_nuevo,
          });
        } else {
          resultados.fallidos.push({
            producto_id: item.producto_id,
            error: result.error,
          });
        }
      }

      console.log(
        `📊 Stock actualizado: ${resultados.exitosos.length} éxitos, ${resultados.fallidos.length} fallos`
      );

      return {
        success: resultados.fallidos.length === 0,
        resultados,
      };
    } catch (error) {
      console.error("❌ Error procesando actualización de stock:", error);
      return {
        success: false,
        error: error.message,
        resultados: { exitosos: [], fallidos: [] },
      };
    }
  }

  // ✅ NUEVO: VALIDAR STOCK PARA VENTA (VERSIÓN SIMPLIFICADA PARA SALES ACTIONS)
  async validateStockForSaleSimple(productos) {
    try {
      const errores = [];
      const resultados = [];

      for (const productoVenta of productos) {
        const producto = await IndexedDBService.get(
          this.storeName,
          productoVenta.producto_id
        );

        if (!producto) {
          errores.push(
            `Producto ID ${productoVenta.producto_id} no encontrado`
          );
          resultados.push({
            producto_id: productoVenta.producto_id,
            valido: false,
            error: "Producto no encontrado",
          });
          continue;
        }

        const stockDisponible = producto.stock || 0;
        const cantidadRequerida = productoVenta.cantidad || 0;

        if (stockDisponible < cantidadRequerida) {
          errores.push(
            `${producto.nombre}: Stock insuficiente (${stockDisponible} disponible, ${cantidadRequerida} requerido)`
          );
          resultados.push({
            producto_id: productoVenta.producto_id,
            producto_nombre: producto.nombre,
            valido: false,
            stock_disponible: stockDisponible,
            cantidad_requerida: cantidadRequerida,
            deficit: cantidadRequerida - stockDisponible,
          });
        } else {
          resultados.push({
            producto_id: productoVenta.producto_id,
            producto_nombre: producto.nombre,
            valido: true,
            stock_disponible: stockDisponible,
            cantidad_requerida: cantidadRequerida,
            stock_restante: stockDisponible - cantidadRequerida,
          });
        }
      }

      return {
        valido: errores.length === 0,
        errores: errores,
        resultados: resultados,
      };
    } catch (error) {
      console.error("❌ Error validando stock:", error);
      return {
        valido: false,
        errores: [error.message],
        resultados: [],
      };
    }
  }

  // ✅ NUEVO: ACTUALIZAR STOCK DESPUÉS DE VENTA (VERSIÓN SIMPLIFICADA)
  async updateStockAfterSale(productos) {
    try {
      const resultados = [];

      for (const productoVenta of productos) {
        const producto = await IndexedDBService.get(
          this.storeName,
          productoVenta.producto_id
        );

        if (producto) {
          const nuevoStock =
            (producto.stock || 0) - (productoVenta.cantidad || 0);

          await IndexedDBService.put(this.storeName, {
            ...producto,
            stock: nuevoStock,
            ultima_actualizacion: new Date().toISOString(),
          });

          resultados.push({
            producto_id: productoVenta.producto_id,
            producto_nombre: producto.nombre,
            exito: true,
            stock_anterior: producto.stock,
            stock_nuevo: nuevoStock,
            cantidad_vendida: productoVenta.cantidad,
          });
        } else {
          resultados.push({
            producto_id: productoVenta.producto_id,
            exito: false,
            error: "Producto no encontrado",
          });
        }
      }

      return {
        success: resultados.every((r) => r.exito),
        resultados: resultados,
      };
    } catch (error) {
      console.error("❌ Error actualizando stock:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  // ✅ VALIDACIÓN DE STOCK MEJORADA CON BLOQUEO TEMPORAL
  async validateStockWithLock(productosVenta, ventaId = null) {
    const lockKey = `stock_validation_${Date.now()}`;

    try {
      // Bloquear validación para esta venta
      sessionStorage.setItem(lockKey, "locked");

      const resultados = await this.validateStockForSale(productosVenta);

      // Si es válido, reservar stock temporalmente
      if (resultados.valido && resultados.productosValidos.length > 0) {
        await this.reserveStock(resultados.productosValidos, ventaId);
      }

      return resultados;
    } finally {
      // Liberar bloqueo
      sessionStorage.removeItem(lockKey);
    }
  }

  // ✅ RESERVAR STOCK TEMPORALMENTE
  async reserveStock(productosValidos, ventaId = null) {
    const reservation = {
      ventaId: ventaId || `temp_${Date.now()}`,
      productos: productosValidos,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutos
    };

    await IndexedDBService.add("stock_reservations", reservation);
    return reservation;
  }

  // ✅ LIBERAR RESERVA DE STOCK
  async releaseStockReservation(ventaId) {
    try {
      const reservations = await IndexedDBService.getAll("stock_reservations");
      const reservation = reservations.find((r) => r.ventaId === ventaId);

      if (reservation) {
        await IndexedDBService.delete("stock_reservations", ventaId);

        // Revertir stock reservado
        for (const item of reservation.productos) {
          await this.increaseStock(
            item.producto_id,
            item.cantidad,
            "liberacion_reserva"
          );
        }
      }
    } catch (error) {
      console.error("❌ Error liberando reserva:", error);
    }
  }

  // ✅ LIMPIAR RESERVAS EXPIRADAS
  async cleanupExpiredReservations() {
    try {
      const reservations = await IndexedDBService.getAll("stock_reservations");
      const now = new Date();

      for (const reservation of reservations) {
        if (new Date(reservation.expiresAt) < now) {
          console.log(`🧹 Limpiando reserva expirada: ${reservation.ventaId}`);
          await this.releaseStockReservation(reservation.ventaId);
        }
      }
    } catch (error) {
      console.error("❌ Error limpiando reservas:", error);
    }
  }

  // ✅ NUEVO: OBTENER PRODUCTOS CON INFORMACIÓN COMPLETA
  async getProductsWithDetails() {
    try {
      const productos = await this.getProducts();

      // Enriquecer con información de categorías si está disponible
      const categorias = await IndexedDBService.getAll("categorias");
      const categoriasMap = {};

      categorias.forEach((cat) => {
        categoriasMap[cat.id] = cat.nombre;
      });

      return productos.map((producto) => ({
        ...producto,
        categoria_nombre:
          categoriasMap[producto.categoria_id] || "Sin categoría",
      }));
    } catch (error) {
      console.error("❌ Error obteniendo productos con detalles:", error);
      return [];
    }
  }

  // ✅ NUEVO: VERIFICAR DISPONIBILIDAD DE PRODUCTOS PARA VENTA RÁPIDA
  async checkProductsAvailability(productos) {
    try {
      const disponibilidad = {
        todosDisponibles: true,
        productos: [],
        errores: [],
      };

      for (const item of productos) {
        const producto = await this.getProductById(item.producto_id);

        if (!producto) {
          disponibilidad.todosDisponibles = false;
          disponibilidad.errores.push(
            `Producto ${item.producto_id} no encontrado`
          );
          disponibilidad.productos.push({
            producto_id: item.producto_id,
            disponible: false,
            error: "No encontrado",
          });
          continue;
        }

        if (!producto.activo) {
          disponibilidad.todosDisponibles = false;
          disponibilidad.errores.push(
            `Producto ${producto.nombre} está inactivo`
          );
          disponibilidad.productos.push({
            producto_id: item.producto_id,
            nombre: producto.nombre,
            disponible: false,
            error: "Producto inactivo",
          });
          continue;
        }

        if (producto.stock < item.cantidad) {
          disponibilidad.todosDisponibles = false;
          disponibilidad.errores.push(
            `Stock insuficiente: ${producto.nombre} (${producto.stock} disponible, ${item.cantidad} requerido)`
          );
          disponibilidad.productos.push({
            producto_id: item.producto_id,
            nombre: producto.nombre,
            disponible: false,
            stock_disponible: producto.stock,
            cantidad_requerida: item.cantidad,
            error: "Stock insuficiente",
          });
          continue;
        }

        disponibilidad.productos.push({
          producto_id: item.producto_id,
          nombre: producto.nombre,
          disponible: true,
          stock_disponible: producto.stock,
          cantidad_requerida: item.cantidad,
        });
      }

      return disponibilidad;
    } catch (error) {
      console.error("❌ Error verificando disponibilidad:", error);
      return {
        todosDisponibles: false,
        productos: [],
        errores: [error.message],
      };
    }
  }
}

export default new ProductsOfflineController();
