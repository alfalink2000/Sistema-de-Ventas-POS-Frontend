// src/controllers/offline/ProductsOfflineController.js
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
}

export default new ProductsOfflineController();
