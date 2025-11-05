// src/controllers/offline/ProductsOfflineController/ProductsOfflineController.js
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";
import ImageDownloadManager from "../../../utils/ImageDownloadManager";
import { fetchConToken } from "../../../helpers/fetch";

class ProductsOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "productos_pendientes";
    this.cacheStore = "productos";
  }

  // En ProductsOfflineController.js - AGREGAR método de sincronización forzada
  async forceProductsSync() {
    try {
      console.log("🔄 FORZANDO SINCRONIZACIÓN DE PRODUCTOS...");

      if (!this.isOnline) {
        console.warn("⚠️ Sin conexión, no se puede sincronizar");
        return { success: false, error: "Sin conexión" };
      }

      // ✅ LIMPIAR CACHE COMPLETAMENTE
      await this.clearProducts();
      console.log("✅ Cache de productos limpiado");

      // ✅ DESCARGAR PRODUCTOS ACTUALIZADOS DEL SERVIDOR
      const response = await fetchConToken("productos?limite=1000");

      if (response && response.ok && response.productos) {
        console.log(
          `📥 Recibidos ${response.productos.length} productos del servidor`
        );

        // ✅ GUARDAR EN INDEXEDDB
        const saveResult = await this.saveProducts(response.productos);

        if (saveResult.success) {
          console.log(
            `✅ ${saveResult.saved} productos guardados en IndexedDB`
          );

          // ✅ DISPARAR EVENTO PARA ACTUALIZAR REDUX
          window.dispatchEvent(
            new CustomEvent("products_force_refresh", {
              detail: { products: response.productos },
            })
          );

          return {
            success: true,
            count: saveResult.saved,
            message: "Productos sincronizados correctamente",
          };
        } else {
          throw new Error("Error guardando productos en IndexedDB");
        }
      } else {
        throw new Error("Error obteniendo productos del servidor");
      }
    } catch (error) {
      console.error("❌ Error en forceProductsSync:", error);
      return { success: false, error: error.message };
    }
  }
  // ✅ FUNCIÓN DE EMERGENCIA PARA LIMPIAR DUPLICADOS
  async emergencyCleanDuplicates() {
    try {
      console.log(
        "🚨 EJECUTANDO LIMPIEZA DE EMERGENCIA - ELIMINANDO DUPLICADOS"
      );

      const allProducts = await IndexedDBService.getAll("productos");
      console.log(`📦 Productos antes de limpieza: ${allProducts.length}`);

      // Eliminar duplicados por ID
      const uniqueProducts = [];
      const seenIds = new Set();

      for (const product of allProducts) {
        if (!product || !product.id) continue;

        if (!seenIds.has(product.id)) {
          seenIds.add(product.id);
          uniqueProducts.push(product);
        } else {
          console.log(
            `🗑️ Eliminando duplicado: ${product.id} - ${product.nombre}`
          );
          await IndexedDBService.delete("productos", product.id);
        }
      }

      // Si hay más productos únicos de los esperados, limpiar todo y empezar de nuevo
      if (uniqueProducts.length > 6) {
        console.log("🔄 Demasiados productos únicos, limpiando todo...");
        await IndexedDBService.clear("productos");

        // Recargar solo los 6 productos correctos
        const correctProducts = uniqueProducts.slice(0, 6);
        for (const product of correctProducts) {
          await IndexedDBService.add("productos", product);
        }
      }

      console.log(
        `✅ Limpieza completada. Productos únicos: ${uniqueProducts.length}`
      );
      return uniqueProducts;
    } catch (error) {
      console.error("❌ Error en limpieza de emergencia:", error);
      return [];
    }
  }

  // ✅ VALIDAR STOCK SIMPLE (método que falta)
  async validateStockForSaleSimple(productos) {
    try {
      console.log(
        "🔄 [PRODUCTS OFFLINE] Validando stock para venta...",
        productos
      );

      const errores = [];
      const resultados = [];

      for (const producto of productos) {
        try {
          // Buscar producto en IndexedDB
          const productoDB = await IndexedDBService.get(
            this.storeName,
            producto.producto_id
          );

          if (!productoDB) {
            errores.push(`Producto ${producto.producto_id} no encontrado`);
            resultados.push({
              producto_id: producto.producto_id,
              producto_nombre: producto.nombre || "Producto desconocido",
              valido: false,
              error: "Producto no encontrado en base de datos local",
            });
            continue;
          }

          const stockDisponible = productoDB.stock || 0;
          const cantidadRequerida = producto.cantidad || 0;

          if (stockDisponible < cantidadRequerida) {
            errores.push(
              `${productoDB.nombre}: Stock insuficiente (${stockDisponible} disponible, ${cantidadRequerida} requerido)`
            );
            resultados.push({
              producto_id: producto.producto_id,
              producto_nombre: productoDB.nombre,
              valido: false,
              stock_disponible: stockDisponible,
              cantidad_requerida: cantidadRequerida,
              error: "Stock insuficiente",
            });
          } else {
            resultados.push({
              producto_id: producto.producto_id,
              producto_nombre: productoDB.nombre,
              valido: true,
              stock_disponible: stockDisponible,
              cantidad_requerida: cantidadRequerida,
              stock_restante: stockDisponible - cantidadRequerida,
            });
          }
        } catch (error) {
          console.error(
            `Error validando producto ${producto.producto_id}:`,
            error
          );
          errores.push(
            `Error validando producto ${producto.producto_id}: ${error.message}`
          );
          resultados.push({
            producto_id: producto.producto_id,
            producto_nombre: producto.nombre || "Producto desconocido",
            valido: false,
            error: error.message,
          });
        }
      }

      return {
        valido: errores.length === 0,
        errores: errores,
        resultados: resultados,
      };
    } catch (error) {
      console.error("❌ Error en validateStockForSaleSimple:", error);
      return {
        valido: false,
        errores: [error.message],
        resultados: [],
      };
    }
  }
  // ✅ ACTUALIZAR STOCK DESPUÉS DE VENTA
  async updateStockAfterSale(productos) {
    try {
      console.log(
        "🔄 [STOCK] Actualizando stock después de venta...",
        productos
      );

      const resultados = {
        exitosos: [],
        fallidos: [],
        timestamp: new Date().toISOString(),
      };

      for (const producto of productos) {
        try {
          // ✅ BUSCAR PRODUCTO ACTUAL
          const productoActual = await IndexedDBService.get(
            "productos",
            producto.producto_id
          );

          if (!productoActual) {
            throw new Error(`Producto ${producto.producto_id} no encontrado`);
          }

          // ✅ CALCULAR NUEVO STOCK
          const stockActual = parseInt(productoActual.stock) || 0;
          const cantidadVendida = parseInt(producto.cantidad) || 0;
          const nuevoStock = Math.max(0, stockActual - cantidadVendida);

          console.log(
            `📊 ${productoActual.nombre}: ${stockActual} - ${cantidadVendida} = ${nuevoStock}`
          );

          if (nuevoStock < 0) {
            throw new Error(
              `Stock no puede ser negativo: ${stockActual} - ${cantidadVendida}`
            );
          }

          // ✅ ACTUALIZAR PRODUCTO
          const productoActualizado = {
            ...productoActual,
            stock: nuevoStock,
            ultima_actualizacion: new Date().toISOString(),
            sincronizado: navigator.onLine, // Marcar como sincronizado si hay conexión
          };

          // ✅ USAR PUT PARA SOBREESCRIBIR
          await IndexedDBService.put("productos", productoActualizado);

          // ✅ VERIFICAR ACTUALIZACIÓN
          const productoVerificado = await IndexedDBService.get(
            "productos",
            producto.producto_id
          );

          if (productoVerificado && productoVerificado.stock === nuevoStock) {
            resultados.exitosos.push({
              producto_id: producto.producto_id,
              producto_nombre: productoActual.nombre,
              stock_anterior: stockActual,
              stock_nuevo: nuevoStock,
              cantidad_vendida: cantidadVendida,
            });

            console.log(
              `✅ Stock actualizado: ${productoActual.nombre} -> ${nuevoStock}`
            );
          } else {
            throw new Error("La actualización no se verificó correctamente");
          }
        } catch (error) {
          console.error(
            `❌ Error actualizando stock de ${producto.producto_id}:`,
            error
          );
          resultados.fallidos.push({
            producto_id: producto.producto_id,
            error: error.message,
          });
        }
      }

      console.log("📊 RESUMEN ACTUALIZACIÓN STOCK:", resultados);
      return resultados;
    } catch (error) {
      console.error("❌ Error general en updateStockAfterSale:", error);
      return {
        exitosos: [],
        fallidos: productos.map((p) => ({
          producto_id: p.producto_id,
          error: error.message,
        })),
        error: error.message,
      };
    }
  }
  // ✅ NUEVO: OBTENER TODOS LOS PRODUCTOS DEL CACHE
  async getProducts() {
    try {
      console.log("📦 [PRODUCTS OFFLINE] Obteniendo productos del cache...");

      const productos = await IndexedDBService.getAll(this.cacheStore);

      // Filtrar productos activos (no eliminados)
      const productosActivos = productos.filter(
        (producto) => producto.activo !== false && producto.eliminado !== true
      );

      console.log(
        `✅ [PRODUCTS OFFLINE] ${productosActivos.length} productos obtenidos`
      );
      return productosActivos;
    } catch (error) {
      console.error("❌ Error obteniendo productos del cache:", error);
      return [];
    }
  }
  // ✅ MÉTODO CORREGIDO - OBTENER TODOS LOS PRODUCTOS
  async getAllProducts() {
    try {
      console.log(
        "🔍 [PRODUCTS] Obteniendo todos los productos de IndexedDB..."
      );

      // ✅ VERIFICAR PRIMERO SI EL STORE EXISTE
      const storeExists = await IndexedDBService.storeExists("productos");
      if (!storeExists) {
        console.warn("⚠️ El store 'productos' no existe en IndexedDB");
        return [];
      }

      // ✅ OBTENER DIRECTAMENTE TODOS LOS PRODUCTOS
      const products = await IndexedDBService.getAll("productos");

      console.log(
        `📦 [PRODUCTS] ${products.length} productos obtenidos de IndexedDB`
      );

      // ✅ FILTRAR PRODUCTOS VÁLIDOS
      const validProducts = products.filter(
        (product) =>
          product && product.id && product.nombre && product.activo !== false
      );

      console.log(
        `✅ [PRODUCTS] ${validProducts.length} productos válidos después de filtro`
      );

      // ✅ DEBUG: Mostrar primeros 3 productos
      if (validProducts.length > 0) {
        console.log("🔍 Primeros 3 productos en IndexedDB:");
        validProducts.slice(0, 3).forEach((p, i) => {
          console.log(
            `   ${i + 1}. ${p.nombre} (ID: ${p.id}, Stock: ${p.stock})`
          );
        });
      }

      return validProducts;
    } catch (error) {
      console.error("❌ [PRODUCTS] Error crítico obteniendo productos:", error);

      // ✅ INTENTAR RECUPERACIÓN DE EMERGENCIA
      try {
        console.log("🔄 Intentando recuperación de emergencia...");
        const allData = await IndexedDBService.getAll("productos");
        console.log(`📊 Datos crudos obtenidos: ${allData.length} registros`);
        return allData.filter((item) => item && typeof item === "object");
      } catch (fallbackError) {
        console.error("❌ Error en recuperación de emergencia:", fallbackError);
        return [];
      }
    }
  }
  // ✅ SINCRONIZAR PRODUCTOS PENDIENTES
  async syncPendingProducts() {
    try {
      const pendingProducts = await IndexedDBService.getPendingRecords(
        "productos_pendientes"
      );

      if (pendingProducts.length === 0) {
        return { success: true, message: "No hay productos pendientes" };
      }

      console.log(
        `🔄 Sincronizando ${pendingProducts.length} productos pendientes...`
      );

      // Aquí iría la lógica para enviar al servidor
      // Por ahora solo marcamos como sincronizados
      for (const product of pendingProducts) {
        await IndexedDBService.put("productos_pendientes", {
          ...product,
          sincronizado: true,
          fecha_sincronizacion: new Date().toISOString(),
        });
      }

      return {
        success: true,
        message: `${pendingProducts.length} productos sincronizados`,
      };
    } catch (error) {
      console.error("Error sincronizando productos:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ GUARDAR PRODUCTOS EN INDEXEDDB
  // ✅ GUARDAR PRODUCTOS EN INDEXEDDB - VERSIÓN MEJORADA
  async saveProducts(products) {
    try {
      console.log(`💾 Guardando ${products.length} productos en IndexedDB...`);

      if (!products || products.length === 0) {
        console.warn("⚠️ No hay productos para guardar");
        return { success: false, error: "No hay productos para guardar" };
      }

      // ✅ PRIMERO: LIMPIAR PRODUCTOS EXISTENTES
      await this.clearProducts();
      console.log("✅ Productos anteriores limpiados");

      let savedCount = 0;
      let errorCount = 0;

      for (const product of products) {
        try {
          // Validar producto mínimo
          if (!product.id || !product.nombre) {
            console.warn("⚠️ Producto inválido, saltando:", product);
            errorCount++;
            continue;
          }

          // ✅ USAR put EN LUGAR DE add PARA EVITAR DUPLICADOS
          const productForOffline = {
            id: product.id.toString(), // ✅ MANTENER ID ORIGINAL
            nombre: product.nombre,
            precio: parseFloat(product.precio) || 0,
            precio_compra:
              parseFloat(product.precio_compra) || product.precio * 0.8,
            stock: parseInt(product.stock) || 0,
            categoria_id: product.categoria_id?.toString() || "1",
            codigo: product.codigo || product.id,
            activo: product.activo !== false,
            descripcion: product.descripcion || "",
            last_sync: new Date().toISOString(),
            imagen: product.imagen || null,
            created_at: product.created_at || new Date().toISOString(),
            updated_at: product.updated_at || new Date().toISOString(),
            sincronizado: true, // ✅ MARCAR COMO SINCRONIZADO
          };

          console.log(
            `💾 Guardando producto: ${productForOffline.nombre} (${productForOffline.id})`
          );

          // ✅ USAR put EN LUGAR DE add - SOBREESCRIBE SI EXISTE
          const success = await IndexedDBService.put(
            "productos",
            productForOffline
          );

          if (success) {
            savedCount++;
          } else {
            errorCount++;
            console.error(`❌ Error guardando producto: ${product.nombre}`);
          }
        } catch (productError) {
          errorCount++;
          console.error(
            `❌ Error procesando producto ${product.id}:`,
            productError
          );
        }
      }

      console.log(
        `✅ ${savedCount} productos guardados en IndexedDB, ${errorCount} errores`
      );
      return {
        success: savedCount > 0,
        saved: savedCount,
        errors: errorCount,
      };
    } catch (error) {
      console.error("❌ Error guardando productos en IndexedDB:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ NUEVO: OBTENER PRODUCTO POR ID
  // ✅ OBTENER PRODUCTO POR ID
  // ✅ OBTENER PRODUCTO POR ID - MÁS ROBUSTO
  async getProductById(productId) {
    try {
      if (!productId) {
        console.warn("⚠️ ID de producto vacío");
        return null;
      }

      const id = productId.toString();
      console.log(`🔍 Buscando producto en IndexedDB: ${id}`);

      const product = await IndexedDBService.get(this.storeName, id);

      if (!product) {
        console.warn(`⚠️ Producto no encontrado en IndexedDB: ${id}`);

        // Debug: listar todos los IDs disponibles
        const allProducts = await this.getAllProducts();
        const availableIds = allProducts.map((p) => p.id);
        console.log(`📋 IDs disponibles en IndexedDB:`, availableIds);

        return null;
      }

      console.log(
        `✅ Producto encontrado: ${product.nombre} (Stock: ${product.stock})`
      );
      return product;
    } catch (error) {
      console.error(`❌ Error obteniendo producto ${productId}:`, error);
      return null;
    }
  }
  // ✅ ACTUALIZAR STOCK OFFLINE
  async updateStockOffline(productId, quantity) {
    try {
      const product = await this.getProductById(productId);

      if (!product) {
        throw new Error(`Producto ${productId} no encontrado`);
      }

      const newStock = product.stock - quantity;

      if (newStock < 0) {
        throw new Error(
          `Stock insuficiente: ${product.stock} disponible, ${quantity} requerido`
        );
      }

      // Actualizar producto
      const updatedProduct = {
        ...product,
        stock: newStock,
        last_updated: new Date().toISOString(),
      };

      await IndexedDBService.put(this.storeName, updatedProduct);

      console.log(`✅ Stock actualizado: ${product.nombre} -> ${newStock}`);
      return { success: true, newStock };
    } catch (error) {
      console.error(`❌ Error actualizando stock offline:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ SINCRONIZAR PRODUCTOS CON SERVIDOR - VERSIÓN MEJORADA
  async syncProducts() {
    if (!this.isOnline) {
      return { success: false, error: "Sin conexión", silent: true };
    }

    try {
      console.log("🔄 Sincronizando productos con servidor...");

      const apiUrl = window.API_URL || "http://localhost:3000/api";
      const response = await fetch(`${apiUrl}/productos`, {
        headers: {
          "x-token": localStorage.getItem("token"),
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // ✅ VERIFICACIÓN SEGURA DE LA RESPUESTA
      if (data && data.ok && data.productos) {
        console.log(
          `📥 Recibidos ${data.productos.length} productos del servidor`
        );

        // Limpiar antes de guardar nuevos
        await this.clearProducts();

        // Guardar nuevos productos
        const saveResult = await this.saveProducts(data.productos);

        if (saveResult && saveResult.success) {
          console.log(
            `✅ Sincronización completada: ${saveResult.saved} productos guardados`
          );
          return {
            success: true,
            count: saveResult.saved,
            errors: saveResult.errors,
          };
        } else {
          throw new Error(
            `Error guardando productos: ${
              saveResult?.error || "Error desconocido"
            }`
          );
        }
      } else {
        throw new Error(data?.error || "Error en respuesta del servidor");
      }
    } catch (error) {
      console.error("❌ Error sincronizando productos:", error);
      return { success: false, error: error.message };
    }
  }
  async emergencyCleanup() {
    try {
      console.log("🚨 EJECUTANDO LIMPIEZA DE EMERGENCIA EN INDEXEDDB");

      // 1. Obtener todos los productos
      const allProducts = await IndexedDBService.getAll("productos");
      console.log(`📦 Productos antes de limpieza: ${allProducts.length}`);

      // 2. Eliminar duplicados
      const uniqueProducts = [];
      const seenIds = new Set();

      for (const product of allProducts) {
        if (!product || !product.id) continue;

        if (!seenIds.has(product.id)) {
          seenIds.add(product.id);
          uniqueProducts.push(product);
        } else {
          console.log(
            `🗑️ Eliminando duplicado: ${product.id} - ${product.nombre}`
          );
          await IndexedDBService.delete("productos", product.id);
        }
      }

      // 3. Limpiar y guardar únicos
      await IndexedDBService.clear("productos");

      for (const product of uniqueProducts) {
        await IndexedDBService.add("productos", product);
      }

      console.log(
        `✅ Limpieza completada. Productos únicos: ${uniqueProducts.length}`
      );
      return uniqueProducts;
    } catch (error) {
      console.error("❌ Error en limpieza de emergencia:", error);
      return [];
    }
  }
  // ✅ VERIFICAR SI HAY PRODUCTOS EN INDEXEDDB
  async hasProducts() {
    try {
      const products = await this.getAllProducts();
      const hasProducts = products.length > 0;
      console.log(
        `📊 Estado productos IndexedDB: ${
          hasProducts ? "CON PRODUCTOS" : "VACÍO"
        }`
      );
      return hasProducts;
    } catch (error) {
      console.error("❌ Error verificando productos:", error);
      return false;
    }
  }
  // ✅ OBTENER ESTADÍSTICAS DETALLADAS
  async getDetailedStats() {
    try {
      const products = await this.getAllProducts();
      const activeProducts = products.filter((p) => p.activo);
      const lowStockProducts = products.filter((p) => p.stock < 10);

      const stats = {
        total: products.length,
        active: activeProducts.length,
        lowStock: lowStockProducts.length,
        lastSync: products[0]?.last_sync || "Nunca",
        sampleProducts: products
          .slice(0, 3)
          .map((p) => ({ id: p.id, nombre: p.nombre })),
      };

      console.log("📊 Estadísticas detalladas productos:", stats);
      return stats;
    } catch (error) {
      return {
        total: 0,
        active: 0,
        lowStock: 0,
        lastSync: "Error",
        sampleProducts: [],
      };
    }
  }
  // ✅ LIMPIAR PRODUCTOS (para resincronización)
  async clearProducts() {
    try {
      console.log("🗑️ Limpiando productos en IndexedDB...");
      await IndexedDBService.clear(this.storeName);
      console.log("✅ Productos limpiados correctamente");
      return { success: true };
    } catch (error) {
      console.error("❌ Error limpiando productos:", error);
      return { success: false, error: error.message };
    }
  }
  // ✅ OBTENER ESTADÍSTICAS
  async getStats() {
    try {
      const products = await this.getAllProducts();
      const activeProducts = products.filter((p) => p.activo);

      return {
        total: products.length,
        active: activeProducts.length,
        lowStock: products.filter((p) => p.stock < 10).length,
        lastSync: products[0]?.last_sync || "Nunca",
      };
    } catch (error) {
      return {
        total: 0,
        active: 0,
        lowStock: 0,
        lastSync: "Error",
      };
    }
  }

  // ✅ NUEVO: OBTENER PRODUCTOS POR CATEGORÍA
  async getProductsByCategory(categoriaId) {
    try {
      const productos = await this.getProducts();
      return productos.filter(
        (producto) => producto.categoria_id === categoriaId
      );
    } catch (error) {
      console.error("❌ Error obteniendo productos por categoría:", error);
      return [];
    }
  }

  // ✅ NUEVO: OBTENER PRODUCTOS SINCRONIZADOS
  async getSyncedProducts() {
    try {
      const productos = await this.getProducts();
      return productos.filter((producto) => producto.sincronizado === true);
    } catch (error) {
      console.error("❌ Error obteniendo productos sincronizados:", error);
      return [];
    }
  }

  // ✅ NUEVO: OBTENER PRODUCTOS PENDIENTES DE SINCRONIZACIÓN
  async getUnsyncedProducts() {
    try {
      const productos = await this.getProducts();
      return productos.filter((producto) => producto.sincronizado !== true);
    } catch (error) {
      console.error("❌ Error obteniendo productos no sincronizados:", error);
      return [];
    }
  }

  // ✅ NUEVO: BUSCAR PRODUCTOS
  async searchProducts(searchTerm) {
    try {
      const productos = await this.getProducts();

      return productos.filter(
        (producto) =>
          producto.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          producto.descripcion
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          producto.codigo_barras?.includes(searchTerm)
      );
    } catch (error) {
      console.error("❌ Error buscando productos:", error);
      return [];
    }
  }

  // ✅ NUEVO: OBTENER ESTADÍSTICAS DE PRODUCTOS
  async getProductsStats() {
    try {
      const productos = await this.getProducts();
      const pendientes = await this.getPendingProducts();

      return {
        total: productos.length,
        sincronizados: productos.filter((p) => p.sincronizado === true).length,
        pendientes_sincronizacion: productos.filter(
          (p) => p.sincronizado !== true
        ).length,
        operaciones_pendientes: pendientes.length,
      };
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas de productos:", error);
      return {
        total: 0,
        sincronizados: 0,
        pendientes_sincronizacion: 0,
        operaciones_pendientes: 0,
      };
    }
  }
  // ✅ MÉTODO DE DIAGNÓSTICO
  async diagnosePendingProduct(localId) {
    try {
      const pending = await IndexedDBService.get(this.storeName, localId);

      console.log("🔍 DIAGNÓSTICO COMPLETO DEL PRODUCTO PENDIENTE:");
      console.log("📋 Estructura completa:", JSON.stringify(pending, null, 2));
      console.log("🎯 Campos disponibles:", Object.keys(pending));

      if (pending.datos) {
        console.log("📦 Campo 'datos':", pending.datos);
        console.log("📦 Tipo de 'datos':", typeof pending.datos);
        console.log("📦 Keys de 'datos':", Object.keys(pending.datos));
      }

      return pending;
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      return null;
    }
  }
  // ✅ CREAR PRODUCTO PENDIENTE
  async createProductPending(productData) {
    try {
      console.log("🔄 [PRODUCTS OFFLINE] Creando producto pendiente...");

      // ✅ USAR NUEVA VALIDACIÓN ESTANDARIZADA
      const validationSchema = {
        required: ["nombre", "precio", "categoria_id"],
      };

      // ✅ EXTRAER DATOS DE FormData SI ES NECESARIO
      let datosParaValidar = { ...productData };

      if (productData instanceof FormData) {
        console.log("🔄 Detectado FormData - extrayendo datos...");
        datosParaValidar = {};
        for (let [key, value] of productData.entries()) {
          datosParaValidar[key] = value;
        }
        console.log("📦 Datos extraídos de FormData:", datosParaValidar);
      }

      // ✅ VALIDAR DATOS CON EL NUEVO SISTEMA
      const validationResult = await this.validateOfflineData(
        datosParaValidar,
        validationSchema
      );

      if (!validationResult.isValid) {
        throw new Error(
          `Datos inválidos: ${validationResult.errors.join(", ")}`
        );
      }

      if (validationResult.warnings.length > 0) {
        console.warn(
          "⚠️ Advertencias en validación:",
          validationResult.warnings
        );
      }

      const datosValidados = validationResult.correctedData;

      // ✅ GENERAR ID CON EL SISTEMA UNIFICADO
      const idLocal = await this.generateLocalId("producto");

      // ✅ PREPARAR DATOS COMPLETOS CON VALORES POR DEFECTO SEGUROS
      const datosCompletos = {
        nombre: datosValidados.nombre.trim(),
        precio: parseFloat(datosValidados.precio),
        precio_compra:
          parseFloat(datosValidados.precio_compra) ||
          parseFloat(datosValidados.precio) * 0.7,
        categoria_id: datosValidados.categoria_id,
        descripcion:
          datosValidados.descripcion?.trim() || datosValidados.nombre.trim(),
        stock: parseInt(datosValidados.stock) || 0,
        stock_minimo: parseInt(datosValidados.stock_minimo) || 5,
        codigo_barras: datosValidados.codigo_barras || "",
        imagen_url: datosValidados.imagen_url || null,
        activo:
          datosValidados.activo !== undefined ? datosValidados.activo : true,
        id_local: idLocal,
        sincronizado: false,
        fecha_creacion: new Date().toISOString(),
      };

      console.log("📦 Datos completos preparados:", datosCompletos);

      // ✅ CREAR REGISTRO PENDIENTE
      const pendingProduct = {
        id_local: idLocal,
        operacion: "crear",
        datos: datosCompletos,
        sincronizado: false,
        timestamp: new Date().toISOString(),
        intentos: 0,
        ultimo_error: null,
      };

      // ✅ GUARDAR EN OPERACIONES PENDIENTES
      const successPending = await IndexedDBService.add(
        this.storeName,
        pendingProduct
      );

      if (!successPending) {
        throw new Error("No se pudo guardar la operación pendiente");
      }

      // ✅ GUARDAR EN CACHE PARA USO INMEDIATO
      const productForCache = {
        id: idLocal, // Usar ID local como clave primaria temporal
        ...datosCompletos,
      };

      const successCache = await IndexedDBService.add(
        this.cacheStore,
        productForCache
      );

      if (!successCache) {
        console.warn(
          "⚠️ No se pudo guardar en cache, pero la operación pendiente se guardó"
        );
      }

      // ✅ NOTIFICAR CAMBIOS
      window.dispatchEvent(new CustomEvent("productsPendingUpdatesChanged"));
      window.dispatchEvent(new CustomEvent("product_created_offline"));

      console.log("✅ Producto pendiente creado exitosamente:", {
        id_local: idLocal,
        nombre: datosCompletos.nombre,
        precio: datosCompletos.precio,
      });

      return {
        success: true,
        id_local: idLocal,
        product_data: datosCompletos,
      };
    } catch (error) {
      console.error("❌ Error creando producto pendiente:", error);
      return {
        success: false,
        error: error.message,
        step: "createProductPending",
      };
    }
  }
  // ✅ ACTUALIZAR PRODUCTO PENDIENTE
  async updateProductPending(productId, productData) {
    try {
      console.log(
        `🔄 [PRODUCTS OFFLINE] Actualizando producto pendiente: ${productId}`
      );

      const idLocal = await this.generateLocalId("producto_update");

      const pendingUpdate = {
        id_local: idLocal,
        operacion: "actualizar",
        producto_id: productId,
        datos: productData,
        sincronizado: false,
        timestamp: new Date().toISOString(),
        intentos: 0,
        ultimo_error: null,
      };

      await IndexedDBService.add(this.storeName, pendingUpdate);

      // Actualizar cache local inmediatamente
      const productoExistente = await IndexedDBService.get(
        this.cacheStore,
        productId
      );
      if (productoExistente) {
        await IndexedDBService.put(this.cacheStore, {
          ...productoExistente,
          ...productData,
          sincronizado: false,
          fecha_actualizacion: new Date().toISOString(),
        });
      }

      // ✅ EMITIR EVENTO DE CAMBIO
      window.dispatchEvent(new CustomEvent("productsPendingUpdatesChanged"));
      window.dispatchEvent(new CustomEvent("product_updated_offline"));

      console.log("✅ Actualización pendiente creada:", idLocal);
      return { success: true, id_local: idLocal };
    } catch (error) {
      console.error("❌ Error creando actualización pendiente:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ ELIMINAR PRODUCTO PENDIENTE
  async deleteProductPending(productId, isLocalId = true) {
    try {
      console.log(
        `🔄 [PRODUCTS OFFLINE] Eliminando producto: ${productId} (${
          isLocalId ? "local" : "backend"
        })`
      );

      const idLocal = await this.generateLocalId("producto_delete");

      // ✅ BUSCAR EL ID CORRESPONDIENTE EN CACHE
      let backendProductId = productId;
      let localProductId = productId;

      if (isLocalId) {
        // Si recibimos ID local, buscar el backend ID
        const productInCache = await IndexedDBService.get(
          this.cacheStore,
          productId
        );
        if (
          productInCache &&
          productInCache.id &&
          productInCache.id !== productId
        ) {
          backendProductId = productInCache.id;
          console.log(
            `🔄 Mapeo local->backend: ${productId} -> ${backendProductId}`
          );
        }
      } else {
        // Si recibimos ID backend, buscar el local ID
        const allProducts = await IndexedDBService.getAll(this.cacheStore);
        const productInCache = allProducts.find((p) => p.id === productId);
        if (productInCache && productInCache.id_local) {
          localProductId = productInCache.id_local;
          console.log(
            `🔄 Mapeo backend->local: ${productId} -> ${localProductId}`
          );
        }
      }

      const pendingDelete = {
        id_local: idLocal,
        operacion: "eliminar",
        producto_id: backendProductId, // ✅ Guardar el ID backend para sincronización
        producto_id_local: localProductId, // ✅ Guardar también el local para referencia
        sincronizado: false,
        timestamp: new Date().toISOString(),
        intentos: 0,
        ultimo_error: null,
      };

      await IndexedDBService.add(this.storeName, pendingDelete);

      // Marcar como eliminado en cache local usando el ID local
      const productoExistente = await IndexedDBService.get(
        this.cacheStore,
        localProductId
      );
      if (productoExistente) {
        await IndexedDBService.put(this.cacheStore, {
          ...productoExistente,
          activo: false,
          eliminado: true,
          sincronizado: false,
          fecha_eliminacion: new Date().toISOString(),
        });
      }

      // ✅ EMITIR EVENTO DE CAMBIO
      window.dispatchEvent(new CustomEvent("productsPendingUpdatesChanged"));
      window.dispatchEvent(new CustomEvent("product_deleted_offline"));

      console.log("✅ Eliminación pendiente creada:", {
        id_local: idLocal,
        producto_backend: backendProductId,
        producto_local: localProductId,
      });

      return {
        success: true,
        id_local: idLocal,
        backend_id: backendProductId,
        local_id: localProductId,
      };
    } catch (error) {
      console.error("❌ Error creando eliminación pendiente:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ OBTENER PRODUCTOS PENDIENTES
  async getPendingProducts() {
    try {
      const pendientes = await IndexedDBService.getPendingRecords(
        this.storeName
      );
      console.log(
        `📦 [PRODUCTS OFFLINE] ${pendientes.length} operaciones pendientes`
      );
      return pendientes;
    } catch (error) {
      console.error("❌ Error obteniendo productos pendientes:", error);
      return [];
    }
  }

  // ✅ MARCAR COMO SINCRONIZADO
  async markAsSynced(localId, serverData = {}) {
    try {
      const pendiente = await IndexedDBService.get(this.storeName, localId);
      if (!pendiente) {
        console.warn(`⚠️ Pendiente no encontrado: ${localId}`);
        return false;
      }

      const actualizado = {
        ...pendiente,
        ...serverData,
        sincronizado: true,
        fecha_sincronizacion: new Date().toISOString(),
      };

      await IndexedDBService.put(this.storeName, actualizado);

      // Si es una creación, actualizar el ID en cache
      if (pendiente.operacion === "crear" && serverData.id) {
        const productoCache = await IndexedDBService.get(
          this.cacheStore,
          pendiente.datos.id_local
        );
        if (productoCache) {
          await IndexedDBService.put(this.cacheStore, {
            ...productoCache,
            id: serverData.id,
            sincronizado: true,
          });
        }
      }

      console.log(`✅ Producto pendiente sincronizado: ${localId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error marcando como sincronizado:`, error);
      return false;
    }
  }

  // ✅ SINCRONIZAR PRODUCTOS PENDIENTES
  async syncPendingProducts() {
    if (!this.isOnline) {
      return { success: false, error: "Sin conexión a internet" };
    }

    try {
      const pendientes = await this.getPendingProducts();
      const resultados = {
        total: pendientes.length,
        exitosas: 0,
        fallidas: 0,
        detalles: [],
      };

      console.log(
        `🔄 [PRODUCTS OFFLINE] Sincronizando ${pendientes.length} operaciones...`
      );

      for (const pendiente of pendientes) {
        try {
          let resultadoSync;

          switch (pendiente.operacion) {
            case "crear":
              resultadoSync = await this.syncCreateOperation(pendiente);
              break;
            case "actualizar":
              resultadoSync = await this.syncUpdateOperation(pendiente);
              break;
            case "eliminar":
              resultadoSync = await this.syncDeleteOperation(pendiente);
              break;
            default:
              throw new Error(`Operación desconocida: ${pendiente.operacion}`);
          }

          if (resultadoSync.success) {
            await this.markAsSynced(
              pendiente.id_local,
              resultadoSync.serverData
            );
            resultados.exitosas++;
            resultados.detalles.push({
              id_local: pendiente.id_local,
              operacion: pendiente.operacion,
              status: "success",
              message: resultadoSync.message,
            });
          } else {
            resultados.fallidas++;
            resultados.detalles.push({
              id_local: pendiente.id_local,
              operacion: pendiente.operacion,
              status: "failed",
              message: resultadoSync.error,
            });
          }
        } catch (error) {
          resultados.fallidas++;
          resultados.detalles.push({
            id_local: pendiente.id_local,
            operacion: pendiente.operacion,
            status: "error",
            message: error.message,
          });
        }
      }

      return resultados;
    } catch (error) {
      console.error("❌ Error en syncPendingProducts:", error);
      return {
        total: 0,
        exitosas: 0,
        fallidas: 0,
        detalles: [],
        error: error.message,
      };
    }
  }

  // ✅ SINCRONIZAR CREACIÓN - USANDO fetchConToken
  async syncCreateOperation(pendiente) {
    try {
      console.log(`🔄 Sincronizando creación: ${pendiente.id_local}`);
      console.log("🔍 Datos disponibles:", pendiente.datos);

      // ✅ LOS DATOS ESTÁN DIRECTAMENTE EN pendiente.datos
      const datosProducto = pendiente.datos;

      if (!datosProducto || !datosProducto.nombre) {
        throw new Error("Datos del producto incompletos o nombre faltante");
      }

      // ✅ PREPARAR DATOS PARA BACKEND (excluir metadatos)
      const datosParaBackend = {
        nombre: datosProducto.nombre,
        precio: datosProducto.precio,
        precio_compra: datosProducto.precio_compra,
        categoria_id: datosProducto.categoria_id,
        descripcion: datosProducto.descripcion,
        stock: datosProducto.stock,
        stock_minimo: datosProducto.stock_minimo,
        codigo_barras: datosProducto.codigo_barras,
        imagen_url: datosProducto.imagen_url,
        activo: datosProducto.activo,
      };

      console.log("📤 Enviando al backend:", datosParaBackend);

      // ✅ ENVIAR AL BACKEND
      const response = await fetchConToken(
        "productos",
        datosParaBackend,
        "POST"
      );

      console.log("📨 Respuesta del backend:", response);

      if (response && response.ok === true) {
        const serverId = response.producto?.id || response.id;

        console.log(`✅ Producto creado en servidor: ${serverId}`);

        return {
          success: true,
          serverData: { id: serverId },
          message: "Producto creado en servidor",
        };
      } else {
        const errorMsg =
          response?.msg || response?.error || "Error del servidor";
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error(`💥 Error en syncCreateOperation:`, error);

      // ✅ INCREMENTAR INTENTOS
      try {
        const currentOp = await IndexedDBService.get(
          this.storeName,
          pendiente.id_local
        );
        if (currentOp) {
          const updated = {
            ...currentOp,
            intentos: (currentOp.intentos || 0) + 1,
            ultimo_intento: new Date().toISOString(),
            ultimo_error: error.message,
          };
          await IndexedDBService.put(this.storeName, updated);
        }
      } catch (updateError) {
        console.error("❌ Error actualizando intentos:", updateError);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }
  // ✅ MÉTODO DE LIMPIEZA - Agregar al ProductsOfflineController
  async cleanupBrokenPendingRecords() {
    try {
      const allPending = await IndexedDBService.getAll(this.storeName);
      const brokenRecords = allPending.filter(
        (p) => p.operacion === "crear" && (!p.datos?.nombre || !p.datos?.precio)
      );

      console.log(`🧹 Encontrados ${brokenRecords.length} registros rotos`);

      for (const record of brokenRecords) {
        await IndexedDBService.delete(this.storeName, record.id_local);
        console.log(`🗑️ Eliminado registro roto: ${record.id_local}`);
      }

      return { deleted: brokenRecords.length };
    } catch (error) {
      console.error("❌ Error limpiando registros rotos:", error);
      return { error: error.message };
    }
  }
  async debugProductOperation(localId, operationType = "general") {
    try {
      console.log(`🔍 [DEBUG] Operación: ${operationType} - ID: ${localId}`);

      const pending = await IndexedDBService.get(this.storeName, localId);
      if (!pending) {
        console.warn(`⚠️ No se encontró operación pendiente: ${localId}`);
        return null;
      }

      // Diagnóstico completo pero estructurado
      const diagnosis = {
        id_local: pending.id_local,
        operacion: pending.operacion,
        sincronizado: pending.sincronizado,
        timestamp: pending.timestamp,
        intentos: pending.intentos || 0,
        estructura_datos: this.analyzeDataStructure(pending.datos),
        problemas_detectados: this.detectDataIssues(pending),
      };

      console.log("📊 Diagnóstico completo:", diagnosis);
      return diagnosis;
    } catch (error) {
      console.error("❌ Error en diagnóstico unificado:", error);
      return { error: error.message };
    }
  }

  // ✅ MÉTODOS AUXILIARES PARA EL DIAGNÓSTICO
  analyzeDataStructure(data) {
    if (!data) return { error: "Sin datos" };

    return {
      tipo: typeof data,
      es_form_data: data instanceof FormData,
      campos: Object.keys(data),
      tiene_nombre: !!data.nombre,
      tiene_precio: !!data.precio,
      tiene_categoria: !!data.categoria_id,
    };
  }

  detectDataIssues(pendingOp) {
    const issues = [];

    if (!pendingOp.datos) {
      issues.push("Datos principales faltantes");
    }

    if (pendingOp.operacion === "crear" && !pendingOp.datos?.nombre) {
      issues.push("Falta nombre del producto");
    }

    if (pendingOp.intentos > 3) {
      issues.push("Demasiados intentos fallidos");
    }

    return issues;
  }
  // ✅ MÉTODO DE DEBUG - Agregar al ProductsOfflineController
  async debugPendingProduct(localId) {
    try {
      const pending = await IndexedDBService.get(this.storeName, localId);
      console.log("🔍 DEBUG Producto Pendiente:", {
        id_local: pending?.id_local,
        operacion: pending?.operacion,
        datos: pending?.datos,
        tiene_nombre: !!pending?.datos?.nombre,
        nombre: pending?.datos?.nombre,
        tiene_precio: !!pending?.datos?.precio,
        precio: pending?.datos?.precio,
        tiene_categoria: !!pending?.datos?.categoria_id,
        categoria: pending?.datos?.categoria_id,
      });
      return pending;
    } catch (error) {
      console.error("❌ Error en debug:", error);
      return null;
    }
  }
  async syncUpdateOperation(pendiente) {
    try {
      console.log(`🔄 Sincronizando actualización: ${pendiente.id_local}`, {
        producto_id: pendiente.producto_id,
        datos: pendiente.datos,
      });

      // ✅ OBTENER ID BACKEND SIMPLIFICADO
      let backendProductId = pendiente.producto_id;

      // Buscar en cache si hay un ID diferente
      const allProducts = await IndexedDBService.getAll(this.cacheStore);
      const productInCache = allProducts.find(
        (p) => p.id_local === pendiente.producto_id
      );
      if (
        productInCache &&
        productInCache.id &&
        productInCache.id !== pendiente.producto_id
      ) {
        backendProductId = productInCache.id;
        console.log(
          `🔄 ID mapeado: ${pendiente.producto_id} -> ${backendProductId}`
        );
      }

      // ✅ VERIFICAR SI EL PRODUCTO EXISTE USANDO fetchConToken
      console.log(`🔍 Verificando producto: ${backendProductId}`);
      const productoExiste = await this.verifyProductExists(backendProductId);

      if (!productoExiste) {
        throw new Error(
          `Producto no existe en servidor (ID: ${backendProductId})`
        );
      }

      // ✅ ACTUALIZAR USANDO fetchConToken
      console.log("📤 Enviando actualización...");
      const response = await fetchConToken(
        `productos/${backendProductId}`,
        pendiente.datos,
        "PUT"
      );

      if (response && response.ok === true) {
        console.log("✅ Actualización exitosa");
        return {
          success: true,
          message: "Producto actualizado en servidor",
        };
      } else {
        throw new Error(
          response?.msg || response?.error || "Error del servidor"
        );
      }
    } catch (error) {
      console.error(`💥 Error en syncUpdateOperation:`, error);
      return { success: false, error: error.message };
    }
  }
  // ✅ OBTENER EL ID DEL BACKEND A PARTIR DEL ID LOCAL
  // ✅ OBTENER EL ID DEL BACKEND - VERSIÓN MEJORADA
  async getBackendProductId(localProductId) {
    try {
      console.log(`🔍 Buscando ID backend para: ${localProductId}`);

      // 1. Buscar en cache por id_local
      const allProducts = await IndexedDBService.getAll(this.cacheStore);
      console.log("📦 Productos en cache:", allProducts.length);

      // Buscar por id_local
      const productByLocalId = allProducts.find(
        (p) => p.id_local === localProductId
      );
      if (
        productByLocalId &&
        productByLocalId.id &&
        productByLocalId.id !== localProductId
      ) {
        console.log(
          `✅ ID backend encontrado por id_local: ${productByLocalId.id}`
        );
        return productByLocalId.id;
      }

      // Buscar por id (puede que ya sea el ID backend)
      const productById = allProducts.find((p) => p.id === localProductId);
      if (productById && productById.sincronizado) {
        console.log(`✅ Ya es ID backend: ${localProductId}`);
        return localProductId;
      }

      // 2. Buscar en operaciones sincronizadas
      const allOps = await IndexedDBService.getAll(this.storeName);
      console.log("📋 Operaciones totales:", allOps.length);

      const syncedOp = allOps.find(
        (op) =>
          op.producto_id === localProductId && op.sincronizado === true && op.id
      );

      if (syncedOp) {
        console.log(`✅ ID backend en operación sincronizada: ${syncedOp.id}`);
        return syncedOp.id;
      }

      console.warn(`⚠️ No se encontró ID backend para: ${localProductId}`);
      return null;
    } catch (error) {
      console.error("❌ Error en getBackendProductId:", error);
      return null;
    }
  }
  // ✅ BUSCAR NOMBRE DEL PRODUCTO LOCALMENTE
  async findProductNameLocally(localProductId) {
    try {
      const allProducts = await IndexedDBService.getAll(this.cacheStore);
      const product = allProducts.find(
        (p) => p.id === localProductId || p.id_local === localProductId
      );
      return product?.nombre || null;
    } catch (error) {
      console.error("❌ Error buscando nombre:", error);
      return null;
    }
  }

  // ✅ BUSCAR PRODUCTO EN SERVIDOR POR NOMBRE
  async findProductIdOnServerByName(productName) {
    try {
      console.log(
        `🔍 Buscando producto en servidor por nombre: "${productName}"`
      );

      // ✅ USAR fetchConToken
      const response = await fetchConToken(
        `productos?q=${encodeURIComponent(productName)}`
      );

      if (response && response.ok === true) {
        console.log("📦 Resultados de búsqueda:", response);

        if (response.productos && response.productos.length > 0) {
          // Buscar el producto con nombre exacto
          const exactMatch = response.productos.find(
            (p) => p.nombre.toLowerCase() === productName.toLowerCase()
          );

          const foundId = exactMatch?.id || response.productos[0]?.id;
          console.log(`✅ Producto encontrado: ${foundId}`);

          return foundId;
        } else {
          console.log("❌ No se encontraron productos con ese nombre");
          return null;
        }
      } else {
        console.error("❌ Error en respuesta del servidor");
        return null;
      }
    } catch (error) {
      console.error("❌ Error buscando en servidor:", error);
      return null;
    }
  }

  // ✅ ACTUALIZAR MAPEO DE IDs
  async updateProductIdMapping(localId, backendId) {
    try {
      // Actualizar en cache
      const allProducts = await IndexedDBService.getAll(this.cacheStore);
      const productToUpdate = allProducts.find(
        (p) => p.id === localId || p.id_local === localId
      );

      if (productToUpdate) {
        await IndexedDBService.put(this.cacheStore, {
          ...productToUpdate,
          id: backendId,
          id_local: localId,
          sincronizado: true,
        });
        console.log(`✅ Cache actualizado: ${localId} -> ${backendId}`);
      }

      // Actualizar en operaciones pendientes
      const allPendingOps = await IndexedDBService.getAll(this.storeName);
      const opsToUpdate = allPendingOps.filter(
        (op) => op.producto_id === localId
      );

      for (const op of opsToUpdate) {
        await IndexedDBService.put(this.storeName, {
          ...op,
          producto_id: backendId,
          id: backendId,
        });
      }

      console.log(`✅ ${opsToUpdate.length} operaciones actualizadas`);
    } catch (error) {
      console.error("❌ Error actualizando mapeo:", error);
    }
  }
  // ✅ DIAGNÓSTICO COMPLETO DEL PRODUCTO
  async debugProductMapping(localProductId) {
    try {
      console.log("🔍 DIAGNÓSTICO COMPLETO DE MAPEO:", localProductId);

      // 1. Buscar en TODOS los productos del cache
      const allProducts = await IndexedDBService.getAll(this.cacheStore);
      console.log("📦 Total productos en cache:", allProducts.length);

      const productInCache = allProducts.find(
        (p) => p.id === localProductId || p.id_local === localProductId
      );
      console.log("💾 Producto en cache:", productInCache);

      // 2. Buscar en TODAS las operaciones pendientes
      const allPendingOps = await IndexedDBService.getAll(this.storeName);
      console.log("📋 Total operaciones pendientes:", allPendingOps.length);

      const opsForThisProduct = allPendingOps.filter(
        (op) =>
          op.producto_id === localProductId ||
          op.datos?.id_local === localProductId
      );
      console.log("🔄 Operaciones para este producto:", opsForThisProduct);

      return {
        productInCache,
        opsForThisProduct,
        totalProducts: allProducts.length,
        totalPendingOps: allPendingOps.length,
      };
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      return { error: error.message };
    }
  }
  // ✅ SINCRONIZAR OPERACIÓN DE ELIMINACIÓN
  // ✅ SINCRONIZAR OPERACIÓN DE ELIMINACIÓN - VERSIÓN CORREGIDA

  async syncDeleteOperation(pendiente) {
    try {
      console.log(`🔄 [SYNC DELETE] Procesando eliminación:`, {
        id_local: pendiente.id_local,
        producto_id: pendiente.producto_id,
        operacion: pendiente.operacion,
      });

      // ✅ OBTENER ID BACKEND DE FORMA CONFIABLE
      const backendProductId = await this.obtenerBackendIdConfiable(pendiente);

      if (!backendProductId) {
        console.warn(`⚠️ No se pudo obtener ID backend para eliminación`);
        return {
          success: true,
          message: "Producto sin ID backend válido - considerado eliminado",
        };
      }

      console.log(
        `🔍 Verificando existencia del producto: ${backendProductId}`
      );

      // ✅ VERIFICAR EXISTENCIA
      const productoExiste = await this.verifyProductExists(backendProductId);
      if (!productoExiste) {
        console.log(
          `✅ Producto ya no existe en servidor: ${backendProductId}`
        );
        return {
          success: true,
          message: "Producto ya eliminado en servidor",
        };
      }

      // ✅ EJECUTAR ELIMINACIÓN
      console.log(`🗑️ Eliminando producto en servidor: ${backendProductId}`);
      const response = await fetchConToken(
        `productos/${backendProductId}`,
        {},
        "DELETE"
      );

      if (response && response.ok === true) {
        console.log(`✅ Producto eliminado exitosamente: ${backendProductId}`);

        // ✅ ELIMINAR TAMBIÉN DEL INVENTARIO SI EXISTE
        await this.deleteProductFromInventory(backendProductId);

        return {
          success: true,
          message: "Producto eliminado correctamente",
        };
      } else {
        const errorMsg =
          response?.msg || response?.error || "Error del servidor";
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error(`💥 Error en syncDeleteOperation:`, error);

      // ✅ REGISTRAR INTENTO FALLIDO
      await this.recordSyncAttempt(pendiente);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ✅ NUEVO MÉTODO AUXILIAR PARA OBTENER ID BACKEND
  async obtenerBackendIdConfiable(pendiente) {
    // Prioridad 1: Usar producto_id si es un ID backend válido
    if (pendiente.producto_id && pendiente.producto_id.toString().length < 20) {
      return pendiente.producto_id;
    }

    // Prioridad 2: Buscar en cache por producto_id_local
    if (pendiente.producto_id_local) {
      const backendId = await this.getBackendProductId(
        pendiente.producto_id_local
      );
      if (backendId) return backendId;
    }

    // Prioridad 3: Buscar en operaciones sincronizadas
    const allOps = await IndexedDBService.getAll(this.storeName);
    const syncedOp = allOps.find(
      (op) =>
        op.sincronizado === true && op.producto_id === pendiente.producto_id
    );

    if (syncedOp && syncedOp.id) {
      return syncedOp.id;
    }

    return null;
  }
  // En ProductsOfflineController.js - AGREGAR método de debug
  async debugGetBackendProductId(localProductId) {
    try {
      console.log(`🔍 [DEBUG] getBackendProductId para: ${localProductId}`);

      // 1. Buscar en cache por id_local
      const allProducts = await IndexedDBService.getAll(this.cacheStore);
      console.log(`📦 Total productos en cache: ${allProducts.length}`);

      const productByLocalId = allProducts.find(
        (p) => p.id_local === localProductId
      );
      console.log(`🔍 Producto por id_local:`, productByLocalId);

      // 2. Buscar por id
      const productById = allProducts.find((p) => p.id === localProductId);
      console.log(`🔍 Producto por id:`, productById);

      // 3. Buscar en operaciones sincronizadas
      const allOps = await IndexedDBService.getAll(this.storeName);
      console.log(`📋 Total operaciones: ${allOps.length}`);

      const syncedOp = allOps.find(
        (op) =>
          op.producto_id === localProductId && op.sincronizado === true && op.id
      );
      console.log(`🔍 Operación sincronizada:`, syncedOp);

      // 4. Buscar cualquier operación con este ID
      const anyOp = allOps.find(
        (op) =>
          op.producto_id === localProductId ||
          op.datos?.id_local === localProductId
      );
      console.log(`🔍 Cualquier operación:`, anyOp);

      return {
        productByLocalId,
        productById,
        syncedOp,
        anyOp,
        totalProducts: allProducts.length,
        totalOps: allOps.length,
      };
    } catch (error) {
      console.error(`❌ Error en debugGetBackendProductId:`, error);
      return { error: error.message };
    }
  }
  // ✅ NUEVO MÉTODO: ELIMINAR PRODUCTO DEL INVENTARIO
  async deleteProductFromInventory(productoId) {
    try {
      console.log(`🗑️ Eliminando producto del inventario: ${productoId}`);

      // ✅ USAR fetchConToken PARA ELIMINAR INVENTARIO
      const response = await fetchConToken(
        `inventario/producto/${productoId}`,
        {},
        "DELETE"
      );

      if (response && response.ok === true) {
        console.log(`✅ Inventario eliminado para producto: ${productoId}`);
        return true;
      } else if (response?.status === 404) {
        console.log(
          `ℹ️ No se encontró inventario para producto: ${productoId}`
        );
        return true;
      } else {
        console.warn(`⚠️ No se pudo eliminar inventario: ${response?.status}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error eliminando inventario:`, error);
      return false;
    }
  }
  // ✅ REGISTRAR INTENTO DE SINCRONIZACIÓN
  async recordSyncAttempt(pendiente) {
    try {
      const currentOp = await IndexedDBService.get(
        this.storeName,
        pendiente.id_local
      );
      if (currentOp) {
        const updated = {
          ...currentOp,
          intentos: (currentOp.intentos || 0) + 1,
          ultimo_intento: new Date().toISOString(),
          ultimo_error: "Error de sincronización - reintentando",
        };
        await IndexedDBService.put(this.storeName, updated);
      }
    } catch (error) {
      console.error("❌ Error registrando intento:", error);
    }
  }
  // ✅ MÉTODO DE DIAGNÓSTICO PARA PRODUCTOS
  async debugPendingOperations() {
    try {
      const pendientes = await this.getPendingProducts();
      console.log(
        "🔍 [PRODUCTS DEBUG] Operaciones pendientes:",
        pendientes.length
      );

      pendientes.forEach((op, index) => {
        console.log(`📋 Operación ${index + 1}:`, {
          id_local: op.id_local,
          operacion: op.operacion,
          producto_id: op.producto_id,
          sincronizado: op.sincronizado,
          timestamp: op.timestamp,
          datos: op.datos ? Object.keys(op.datos) : "Sin datos",
        });
      });

      return pendientes;
    } catch (error) {
      console.error("❌ Error en debug:", error);
      return [];
    }
  }
  // En ProductsOfflineController.js - ACTUALIZAR verifyProductExists
  async verifyProductExists(productoId) {
    try {
      console.log(`🔍 [VERIFY] Verificando producto: ${productoId}`);

      const token = localStorage.getItem("token");
      console.log(`🔑 Token:`, token ? "PRESENTE" : "FALTANTE");

      if (!token) {
        console.error(`❌ No hay token disponible`);
        return false;
      }

      const API_URL = "http://localhost:3000/api";
      const url = `${API_URL}/productos/${productoId}`;
      console.log(`🌐 URL de verificación: ${url}`);

      const response = await fetchConToken(`productos/${productoId}`);

      console.log(`📡 Respuesta de verificación:`, {
        ok: response?.ok,
        status: response?.status,
        exists: response && response.ok === true,
        data: response,
      });

      const exists = response && response.ok === true;
      console.log(`📊 Producto ${productoId} existe: ${exists}`);

      return exists;
    } catch (error) {
      console.error(`❌ Error verificando producto ${productoId}:`, error);
      console.error(`📋 Stack:`, error.stack);
      return false;
    }
  }
  // En ProductsOfflineController.js - AGREGAR test de eliminación paso a paso
  async testEliminacionPasoAPaso(productId) {
    try {
      console.log("🧪 TEST ELIMINACIÓN PASO A PASO");
      console.log("=================================");

      const steps = {};

      // PASO 1: Verificar operación pendiente
      console.log("1. 📋 BUSCANDO OPERACIÓN PENDIENTE...");
      const pendingOps = await this.getPendingProducts();
      steps.pendingOperation = pendingOps.find(
        (op) => op.operacion === "eliminar" && op.producto_id === productId
      );
      console.log("✅ Operación pendiente:", steps.pendingOperation);

      // PASO 2: Obtener ID backend
      console.log("2. 🆔 OBTENIENDO ID BACKEND...");
      steps.backendId = await this.getBackendProductId(productId);
      console.log("✅ ID backend:", steps.backendId);

      // PASO 3: Verificar existencia
      console.log("3. 🔍 VERIFICANDO EXISTENCIA...");
      if (steps.backendId) {
        steps.exists = await this.verifyProductExists(steps.backendId);
        console.log("✅ Existe en servidor:", steps.exists);
      } else {
        steps.exists = false;
        console.log("⚠️ No se pudo verificar (sin ID backend)");
      }

      // PASO 4: Intentar eliminación directa
      console.log("4. 🗑️ INTENTANDO ELIMINACIÓN DIRECTA...");
      if (steps.backendId && steps.exists) {
        const API_URL = "http://localhost:3000/api";
        const url = `${API_URL}/productos/${steps.backendId}`;
        console.log("🌐 URL:", url);

        steps.deleteResult = await fetchConToken(
          `productos/${steps.backendId}`,
          {},
          "DELETE"
        );
        console.log("✅ Resultado eliminación:", steps.deleteResult);
      } else {
        steps.deleteResult = { skip: "No se pudo intentar eliminación" };
        console.log("⚠️ Saltando eliminación directa");
      }

      // PASO 5: Resumen
      console.log("5. 📊 RESUMEN:");
      steps.summary = {
        tieneOperacionPendiente: !!steps.pendingOperation,
        tieneBackendId: !!steps.backendId,
        existeEnServidor: steps.exists,
        eliminacionExitosa: steps.deleteResult?.ok === true,
        puedeEliminar: steps.backendId && steps.exists,
      };
      console.log("📈 Resumen:", steps.summary);

      return steps;
    } catch (error) {
      console.error("💥 ERROR EN TEST:", error);
      return { error: error.message };
    }
  }
  // Agregar al ProductsOfflineController.js
  async debugDeleteIssue(productId) {
    try {
      console.log("🔍 DIAGNÓSTICO COMPLETO DE ELIMINACIÓN:", productId);

      // 1. Verificar operaciones pendientes
      const pendingOps = await this.getPendingProducts();
      const deleteOps = pendingOps.filter(
        (op) => op.operacion === "eliminar" && op.producto_id === productId
      );

      console.log("📋 Operaciones de eliminación pendientes:", deleteOps);

      // 2. Verificar en cache
      const productInCache = await IndexedDBService.get(
        this.cacheStore,
        productId
      );
      console.log("💾 Producto en cache:", productInCache);

      // 3. Verificar en operaciones pendientes
      const allPendingOps = await IndexedDBService.getAll(this.storeName);
      const opsForProduct = allPendingOps.filter(
        (op) => op.producto_id === productId || op.datos?.id_local === productId
      );
      console.log(
        "🔄 Todas las operaciones para este producto:",
        opsForProduct
      );

      // 4. Verificar mapeo de IDs
      const backendId = await this.getBackendProductId(productId);
      console.log("🆔 Mapeo de IDs:", { local: productId, backend: backendId });

      // 5. Verificar existencia en servidor (si hay conexión)
      let existsOnServer = false;
      if (navigator.onLine) {
        existsOnServer = await this.verifyProductExists(backendId || productId);
        console.log("🌐 Existe en servidor:", existsOnServer);
      }

      // 6. Verificar sincronización previa
      const syncedOps = allPendingOps.filter(
        (op) => op.producto_id === productId && op.sincronizado === true
      );
      console.log("✅ Operaciones sincronizadas:", syncedOps);

      return {
        productId,
        deleteOps,
        productInCache,
        opsForProduct,
        backendId,
        existsOnServer,
        syncedOps,
        hasPendingDeletes: deleteOps.length > 0,
        isOnline: navigator.onLine,
      };
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      return { error: error.message };
    }
  }
  // Agregar al ProductsOfflineController.js
  async debugDeleteIssue(productId) {
    try {
      console.log("🔍 DIAGNÓSTICO COMPLETO DE ELIMINACIÓN:", productId);

      // 1. Verificar operaciones pendientes
      const pendingOps = await this.getPendingProducts();
      const deleteOps = pendingOps.filter(
        (op) => op.operacion === "eliminar" && op.producto_id === productId
      );

      console.log("📋 Operaciones de eliminación pendientes:", deleteOps);

      // 2. Verificar en cache
      const productInCache = await IndexedDBService.get(
        this.cacheStore,
        productId
      );
      console.log("💾 Producto en cache:", productInCache);

      // 3. Verificar en operaciones pendientes
      const allPendingOps = await IndexedDBService.getAll(this.storeName);
      const opsForProduct = allPendingOps.filter(
        (op) => op.producto_id === productId || op.datos?.id_local === productId
      );
      console.log(
        "🔄 Todas las operaciones para este producto:",
        opsForProduct
      );

      // 4. Verificar mapeo de IDs
      const backendId = await this.getBackendProductId(productId);
      console.log("🆔 Mapeo de IDs:", { local: productId, backend: backendId });

      // 5. Verificar existencia en servidor (si hay conexión)
      let existsOnServer = false;
      if (navigator.onLine) {
        existsOnServer = await this.verifyProductExists(backendId || productId);
        console.log("🌐 Existe en servidor:", existsOnServer);
      }

      // 6. Verificar sincronización previa
      const syncedOps = allPendingOps.filter(
        (op) => op.producto_id === productId && op.sincronizado === true
      );
      console.log("✅ Operaciones sincronizadas:", syncedOps);

      return {
        productId,
        deleteOps,
        productInCache,
        opsForProduct,
        backendId,
        existsOnServer,
        syncedOps,
        hasPendingDeletes: deleteOps.length > 0,
        isOnline: navigator.onLine,
      };
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      return { error: error.message };
    }
  }
  // Agregar al ProductsOfflineController.js
  async cleanupStuckDeleteOperations(productId) {
    try {
      console.log("🧹 LIMPIANDO OPERACIONES ATASCADAS:", productId);

      // 1. Obtener todas las operaciones para este producto
      const allOps = await IndexedDBService.getAll(this.storeName);
      const opsForProduct = allOps.filter(
        (op) => op.producto_id === productId || op.datos?.id_local === productId
      );

      console.log("📋 Operaciones encontradas:", opsForProduct.length);

      // 2. Verificar cuáles están atascadas
      const stuckOps = opsForProduct.filter(
        (op) =>
          op.operacion === "eliminar" &&
          op.sincronizado === false &&
          (op.intentos || 0) > 3
      );

      console.log("⚠️ Operaciones atascadas:", stuckOps.length);

      // 3. Marcar como sincronizadas si el producto ya no existe
      let cleaned = 0;
      for (const op of stuckOps) {
        const backendId = await this.getBackendProductId(productId);
        const exists = backendId
          ? await this.verifyProductExists(backendId)
          : false;

        if (!exists) {
          console.log(`✅ Marcando como sincronizada: ${op.id_local}`);
          await this.markAsSynced(op.id_local, {
            message: "Auto-marcado - producto ya no existe",
          });
          cleaned++;
        }
      }

      return {
        totalOps: opsForProduct.length,
        stuckOps: stuckOps.length,
        cleaned,
        message: `Limpieza completada: ${cleaned} operaciones limpiadas`,
      };
    } catch (error) {
      console.error("❌ Error en limpieza:", error);
      return { error: error.message };
    }
  }
  // ✅ OBTENER ESTADÍSTICAS DE PENDIENTES
  async getPendingStats() {
    try {
      const pendientes = await this.getPendingProducts();

      const stats = {
        total: pendientes.length,
        crear: pendientes.filter((p) => p.operacion === "crear").length,
        actualizar: pendientes.filter((p) => p.operacion === "actualizar")
          .length,
        eliminar: pendientes.filter((p) => p.operacion === "eliminar").length,
      };

      return stats;
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      return { total: 0, crear: 0, actualizar: 0, eliminar: 0 };
    }
  }
  // ✅ MÉTODO CORREGIDO: Sincronización forzada con imágenes
  // ✅ MÉTODO CORREGIDO: Sincronización forzada
  async forceProductsSyncWithImageDownload() {
    try {
      console.log("🚀 INICIANDO SINCRONIZACIÓN FORZADA CON IMÁGENES...");

      // 1. Obtener productos del servidor
      const productos = await this.fetchProductsFromServer();

      // 2. Validar productos obtenidos
      if (!productos || !Array.isArray(productos)) {
        throw new Error("No se recibieron productos válidos del servidor");
      }

      console.log(`📦 ${productos.length} productos recibidos para procesar`);

      // 3. Guardar productos en IndexedDB
      const saveResult = await this.saveProducts(productos);

      if (!saveResult.success) {
        throw new Error(`Error guardando productos: ${saveResult.error}`);
      }

      console.log(`💾 ${saveResult.saved} productos guardados en IndexedDB`);

      // 4. ✅ DESCARGAR IMÁGENES EN SEGUNDO PLANO (NO BLOQUEANTE)
      if (productos.length > 0) {
        setTimeout(async () => {
          try {
            console.log(
              "🖼️ Iniciando descarga de imágenes en segundo plano..."
            );

            const downloadResult =
              await ImageDownloadManager.downloadAllProductImages(productos);

            console.log("📊 Resultado descarga imágenes:", {
              exitosas: downloadResult.success,
              fallidas: downloadResult.failed,
              total: downloadResult.total,
            });

            // ✅ NOTIFICAR RESULTADO DE DESCARGAS
            if (downloadResult.failed > 0) {
              console.warn(
                `⚠️ ${downloadResult.failed} imágenes no se pudieron descargar`
              );
            }
          } catch (imageError) {
            console.warn("⚠️ Error en descarga de imágenes:", imageError);
            // No propagar este error para no afectar la sincronización principal
          }
        }, 1000);
      } else {
        console.log("⏭️ No hay productos con imágenes para descargar");
      }

      return {
        success: true,
        productsCount: productos.length,
        savedCount: saveResult.saved,
        errors: saveResult.errors || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error en sincronización con imágenes:", error);

      return {
        success: false,
        error: error.message,
        step: "forceProductsSyncWithImageDownload",
      };
    }
  }
  // ✅ MÉTODO AUXILIAR: Validar URL de imagen
  isValidImageUrl(url) {
    if (!url || typeof url !== "string") return false;

    try {
      const urlObj = new URL(url);
      const validProtocols = ["http:", "https:"];
      const validExtensions = [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".svg",
      ];

      const extension = urlObj.pathname.toLowerCase();
      const hasValidExtension = validExtensions.some((ext) =>
        extension.includes(ext)
      );

      return validProtocols.includes(urlObj.protocol) && hasValidExtension;
    } catch {
      return false;
    }
  }

  // ✅ MÉTODO AUXILIAR: Obtener nombre del archivo
  getFileName(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split("/").pop() || "imagen";
    } catch {
      return url.split("/").pop() || "imagen";
    }
  }

  // ✅ MÉTODO MEJORADO: Obtener productos con múltiples estrategias
  async fetchProductsFromServer() {
    try {
      console.log("🔄 Obteniendo productos del servidor...");

      const response = await fetchConToken("productos?limite=1000");

      // ✅ ANÁLISIS DETALLADO DE LA RESPUESTA
      this.analyzeResponseStructure(response);

      let productos = [];

      // ✅ ESTRATEGIA 1: Respuesta con estructura {ok: true, productos: [...]}
      if (
        response &&
        response.ok === true &&
        Array.isArray(response.productos)
      ) {
        productos = response.productos;
        console.log(
          `✅ ${productos.length} productos obtenidos (estructura estándar)`
        );
      }
      // ✅ ESTRATEGIA 2: Respuesta directa como array
      else if (Array.isArray(response)) {
        productos = response;
        console.log(
          `✅ ${productos.length} productos obtenidos (respuesta directa)`
        );
      }
      // ✅ ESTRATEGIA 3: Otra estructura posible
      else if (response && Array.isArray(response.data)) {
        productos = response.data;
        console.log(
          `✅ ${productos.length} productos obtenidos (estructura data)`
        );
      }
      // ✅ ESTRATEGIA 4: Buscar cualquier array en la respuesta
      else if (response && typeof response === "object") {
        // Buscar la primera propiedad que sea un array
        const arrayKey = Object.keys(response).find((key) =>
          Array.isArray(response[key])
        );
        if (arrayKey) {
          productos = response[arrayKey];
          console.log(
            `✅ ${productos.length} productos obtenidos (clave: ${arrayKey})`
          );
        } else {
          throw new Error("No se encontró array de productos en la respuesta");
        }
      } else {
        throw new Error("Estructura de respuesta desconocida");
      }

      // ✅ VALIDAR QUE HAYA PRODUCTOS
      if (!Array.isArray(productos)) {
        throw new Error("Los productos no son un array válido");
      }

      console.log(`📦 ${productos.length} productos listos para procesar`);
      return productos;
    } catch (error) {
      console.error("❌ Error obteniendo productos del servidor:", error);

      // ✅ PROPAGAR ERROR MEJOR ESTRUCTURADO
      const enhancedError = new Error(
        `Error obteniendo productos: ${error.message}`
      );
      enhancedError.originalError = error;
      enhancedError.context = "fetchProductsFromServer";
      throw enhancedError;
    }
  }
  // ✅ MÉTODO AUXILIAR: Verificar estructura de respuesta
  analyzeResponseStructure(response) {
    console.log("🔍 Analizando estructura de respuesta:", {
      tipo: typeof response,
      esArray: Array.isArray(response),
      keys: response ? Object.keys(response) : "null",
      tieneOk: response?.ok !== undefined,
      tieneProductos: response?.productos !== undefined,
      productosEsArray: Array.isArray(response?.productos),
    });
  }
  // ✅ MÉTODO PARA OBTENER IMAGEN (local o externa)
  async getProductImage(product) {
    // Priorizar imagen local
    if (product.localImage) {
      return product.localImage;
    }

    // Fallback a URL externa de i.ibb.co
    return product.image || product.imagen || product.img;
  }
}

export default new ProductsOfflineController();
