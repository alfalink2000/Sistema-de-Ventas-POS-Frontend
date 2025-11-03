// src/controllers/offline/ProductsOfflineController/ProductsOfflineController.js
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";
import { fetchConToken } from "../../../helpers/fetch";

class ProductsOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "productos_pendientes";
    this.cacheStore = "productos";
  }
  // ✅ MÉTODO DE DEBUG DETALLADO - Agregar al ProductsOfflineController
  async debugCreateProductFlow(productData) {
    try {
      console.log("🔍 DEBUG CREATE PRODUCT FLOW - INICIO");
      console.log("📥 Datos recibidos en createProductPending:", productData);
      console.log("📋 Tipo de datos:", typeof productData);
      console.log(
        "🎯 Estructura completa:",
        JSON.stringify(productData, null, 2)
      );

      // Verificar campos críticos
      console.log("✅ Verificación de campos:");
      console.log(
        "   - nombre:",
        productData.nombre,
        "(exists:",
        !!productData.nombre,
        ")"
      );
      console.log(
        "   - precio:",
        productData.precio,
        "(exists:",
        !!productData.precio,
        ")"
      );
      console.log(
        "   - categoria_id:",
        productData.categoria_id,
        "(exists:",
        !!productData.categoria_id,
        ")"
      );
      console.log(
        "   - descripcion:",
        productData.descripcion,
        "(exists:",
        !!productData.descripcion,
        ")"
      );

      // Verificar si es FormData
      if (productData instanceof FormData) {
        console.log("📦 Es FormData - mostrando entries:");
        for (let [key, value] of productData.entries()) {
          console.log(`   ${key}:`, value);
        }
      }

      console.log("🔍 DEBUG CREATE PRODUCT FLOW - FIN");

      return {
        nombre: productData.nombre,
        precio: productData.precio,
        categoria_id: productData.categoria_id,
        descripcion: productData.descripcion,
        esFormData: productData instanceof FormData,
      };
    } catch (error) {
      console.error("❌ Error en debug:", error);
      return { error: error.message };
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
        "🔄 [PRODUCTS OFFLINE] Actualizando stock después de venta...",
        productos
      );

      const resultados = {
        exitosos: [],
        fallidos: [],
      };

      for (const producto of productos) {
        try {
          // Buscar producto actual
          const productoActual = await IndexedDBService.get(
            this.storeName,
            producto.producto_id
          );

          if (!productoActual) {
            throw new Error(`Producto ${producto.producto_id} no encontrado`);
          }

          // Calcular nuevo stock
          const nuevoStock = productoActual.stock - producto.cantidad;

          if (nuevoStock < 0) {
            throw new Error(
              `Stock no puede ser negativo: ${productoActual.stock} - ${producto.cantidad} = ${nuevoStock}`
            );
          }

          // Actualizar producto
          const productoActualizado = {
            ...productoActual,
            stock: nuevoStock,
            fecha_actualizacion: new Date().toISOString(),
          };

          await IndexedDBService.put(this.storeName, productoActualizado);

          resultados.exitosos.push({
            producto_id: producto.producto_id,
            producto_nombre: productoActual.nombre,
            stock_anterior: productoActual.stock,
            stock_nuevo: nuevoStock,
            cantidad_vendida: producto.cantidad,
          });

          console.log(
            `✅ Stock actualizado: ${productoActual.nombre} (${productoActual.stock} → ${nuevoStock})`
          );
        } catch (error) {
          console.error(
            `❌ Error actualizando stock de ${producto.producto_id}:`,
            error
          );
          resultados.fallidos.push({
            producto_id: producto.producto_id,
            producto_nombre: producto.nombre || "Producto desconocido",
            error: error.message,
          });
        }
      }

      return {
        success: resultados.fallidos.length === 0,
        resultados: resultados,
      };
    } catch (error) {
      console.error("❌ Error en updateStockAfterSale:", error);
      return {
        success: false,
        resultados: {
          exitosos: [],
          fallidos: productos.map((p) => ({
            producto_id: p.producto_id,
            error: error.message,
          })),
        },
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
  // ✅ OBTENER TODOS LOS PRODUCTOS
  async getAllProducts() {
    try {
      return await IndexedDBService.getAll(this.storeName);
    } catch (error) {
      console.error("Error obteniendo productos:", error);
      return [];
    }
  } // ✅ SINCRONIZAR PRODUCTOS PENDIENTES
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

  // ✅ NUEVO: OBTENER PRODUCTO POR ID
  async getProductById(productId) {
    try {
      console.log(`📦 [PRODUCTS OFFLINE] Obteniendo producto: ${productId}`);

      const producto = await IndexedDBService.get(this.cacheStore, productId);

      if (
        !producto ||
        producto.activo === false ||
        producto.eliminado === true
      ) {
        return null;
      }

      return producto;
    } catch (error) {
      console.error(`❌ Error obteniendo producto ${productId}:`, error);
      return null;
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

      // ✅ PRIMERO: DEBUG DETALLADO
      const debugResult = await this.debugCreateProductFlow(productData);
      console.log("📊 Resultado del debug:", debugResult);

      // ✅ VERIFICAR SI LOS DATOS SON VÁLIDOS
      if (!productData || typeof productData !== "object") {
        throw new Error("Datos del producto inválidos o vacíos");
      }

      // ✅ EXTRAER DATOS DE FormData SI ES NECESARIO
      let datosExtraidos = { ...productData };

      if (productData instanceof FormData) {
        console.log("🔄 Detectado FormData - extrayendo datos...");
        datosExtraidos = {};
        for (let [key, value] of productData.entries()) {
          datosExtraidos[key] = value;
        }
        console.log("📦 Datos extraídos de FormData:", datosExtraidos);
      }

      const idLocal = await this.generateLocalId("producto");

      // ✅ VERIFICAR CAMPOS CRÍTICOS CON DATOS EXTRAÍDOS
      if (!datosExtraidos.nombre || datosExtraidos.nombre.trim() === "") {
        console.error("❌ Nombre vacío en datosExtraidos:", datosExtraidos);
        throw new Error("El nombre del producto es requerido");
      }

      if (!datosExtraidos.precio || parseFloat(datosExtraidos.precio) <= 0) {
        console.error("❌ Precio inválido en datosExtraidos:", datosExtraidos);
        throw new Error("El precio debe ser mayor a 0");
      }

      if (!datosExtraidos.categoria_id) {
        console.error("❌ Categoría vacía en datosExtraidos:", datosExtraidos);
        throw new Error("La categoría es requerida");
      }

      // ✅ CONTINUAR CON EL PROCESO NORMAL...
      const datosCompletos = {
        nombre: datosExtraidos.nombre.trim(),
        precio: parseFloat(datosExtraidos.precio),
        precio_compra:
          parseFloat(datosExtraidos.precio_compra) ||
          parseFloat(datosExtraidos.precio) * 0.7,
        categoria_id: datosExtraidos.categoria_id,
        descripcion:
          datosExtraidos.descripcion?.trim() || datosExtraidos.nombre.trim(),
        stock: parseInt(datosExtraidos.stock) || 0,
        stock_minimo: parseInt(datosExtraidos.stock_minimo) || 5,
        codigo_barras: datosExtraidos.codigo_barras || "",
        imagen_url: datosExtraidos.imagen_url || null,
        activo:
          datosExtraidos.activo !== undefined ? datosExtraidos.activo : true,
        id_local: idLocal,
        sincronizado: false,
        fecha_creacion: new Date().toISOString(),
      };

      console.log("📦 Datos completos preparados:", datosCompletos);

      const pendingProduct = {
        id_local: idLocal,
        operacion: "crear",
        datos: datosCompletos,
        sincronizado: false,
        timestamp: new Date().toISOString(),
        intentos: 0,
        ultimo_error: null,
      };

      await IndexedDBService.add(this.storeName, pendingProduct);

      // Guardar en cache
      await IndexedDBService.add(this.cacheStore, {
        id: idLocal,
        ...datosCompletos,
      });

      window.dispatchEvent(new CustomEvent("productsPendingUpdatesChanged"));
      window.dispatchEvent(new CustomEvent("product_created_offline"));

      console.log("✅ Producto pendiente creado exitosamente");
      return { success: true, id_local: idLocal };
    } catch (error) {
      console.error("❌ Error creando producto pendiente:", error);
      return { success: false, error: error.message };
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
  async debugPendingProductStructure(localId) {
    try {
      const pending = await IndexedDBService.get(this.storeName, localId);

      console.log("🔍 DIAGNÓSTICO DETALLADO DEL PRODUCTO PENDIENTE:");
      console.log("📋 ID:", localId);
      console.log("🎯 Operación:", pending.operacion);
      console.log("📦 Estructura COMPLETA:");
      console.log(JSON.stringify(pending, null, 2));

      console.log("🔎 Nivel 1 - pendiente.datos:", pending.datos);
      if (pending.datos) {
        console.log("🔎 Nivel 2 - pendiente.datos.datos:", pending.datos.datos);
        console.log("🔎 Tipo de pendiente.datos:", typeof pending.datos);
        console.log(
          "🔎 Tipo de pendiente.datos.datos:",
          typeof pending.datos.datos
        );

        if (pending.datos.datos) {
          console.log(
            "🔎 Campos en pendiente.datos.datos:",
            Object.keys(pending.datos.datos)
          );
          console.log(
            "🔎 pendiente.datos.datos.nombre:",
            pending.datos.datos.nombre
          );
          console.log(
            "🔎 pendiente.datos.datos.precio:",
            pending.datos.datos.precio
          );
          console.log(
            "🔎 pendiente.datos.datos.categoria_id:",
            pending.datos.datos.categoria_id
          );
        }
      }

      // Mostrar TODOS los campos disponibles
      console.log("📝 TODOS los campos disponibles en el pendiente:");
      for (let key in pending) {
        console.log(`   ${key}:`, pending[key]);
      }

      return pending;
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      return null;
    }
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
  // En ProductsOfflineController.js - REEMPLAZAR el método syncDeleteOperation
  async syncDeleteOperation(pendiente) {
    try {
      console.log(`🔄 [SYNC DELETE] Procesando eliminación:`, {
        id_local: pendiente.id_local,
        producto_id: pendiente.producto_id,
        producto_id_local: pendiente.producto_id_local,
      });

      // ✅ USAR DIRECTAMENTE EL producto_id (que ahora es el backend ID)
      const backendProductId = pendiente.producto_id;

      if (!backendProductId) {
        console.warn(`⚠️ No hay backend ID para eliminar`);
        return {
          success: true,
          message: "Producto sin ID backend - considerado eliminado",
        };
      }

      // ✅ VERIFICAR EXISTENCIA
      const productoExiste = await this.verifyProductExists(backendProductId);
      if (!productoExiste) {
        console.log(`✅ Producto ya no existe: ${backendProductId}`);
        return {
          success: true,
          message: "Producto ya eliminado en servidor",
        };
      }

      // ✅ ELIMINAR
      const response = await fetchConToken(
        `productos/${backendProductId}`,
        {},
        "DELETE"
      );

      if (response && response.ok === true) {
        console.log(`✅ Producto eliminado: ${backendProductId}`);
        return {
          success: true,
          message: "Producto eliminado correctamente",
        };
      } else {
        throw new Error(response?.msg || "Error del servidor");
      }
    } catch (error) {
      console.error(`💥 Error en syncDeleteOperation:`, error);
      return { success: false, error: error.message };
    }
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
}

export default new ProductsOfflineController();
