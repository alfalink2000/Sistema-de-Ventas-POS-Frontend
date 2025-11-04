// actions/productsActions.js - VERSIÓN CORREGIDA (SIN HOOKS DE REACT)
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import IndexedDBService from "../services/IndexedDBService";
import ProductsOfflineController from "../controllers/offline/ProductsOfflineController/ProductsOfflineController";
import { cacheManager } from "../utils/cacheManager";
// Servicio para operaciones offline (reemplaza el hook)
class OfflineProductsService {
  static async getProductsOffline(filters = {}) {
    try {
      const productos = await IndexedDBService.getAll("productos");

      // Aplicar filtros
      let filtered = productos;

      if (filters.categoria_id) {
        filtered = filtered.filter(
          (p) => p.categoria_id === filters.categoria_id
        );
      }

      if (filters.activo !== undefined) {
        filtered = filtered.filter((p) => p.activo === filters.activo);
      }

      return filtered;
    } catch (error) {
      console.error("❌ [OFFLINE SERVICE] Error obteniendo productos:", error);
      return [];
    }
  }

  static async syncProductsOffline() {
    try {
      if (!navigator.onLine) {
        return { success: false, error: "Sin conexión" };
      }

      const productosLocales = await IndexedDBService.getAll("productos");
      const productosNoSincronizados = productosLocales.filter(
        (p) => !p.sincronizado
      );

      let sincronizados = 0;

      for (const producto of productosNoSincronizados) {
        try {
          if (producto.id_local) {
            // Crear nuevo producto en servidor
            const response = await fetchConToken("productos", producto, "POST");
            if (response && response.ok) {
              // Actualizar en IndexedDB con ID real
              await IndexedDBService.delete("productos", producto.id);
              await IndexedDBService.add("productos", {
                ...response.producto,
                sincronizado: true,
              });
              sincronizados++;
            }
          } else {
            // Actualizar producto existente
            const response = await fetchConToken(
              `productos/${producto.id}`,
              producto,
              "PUT"
            );
            if (response && response.ok) {
              await IndexedDBService.put("productos", {
                ...producto,
                sincronizado: true,
              });
              sincronizados++;
            }
          }
        } catch (error) {
          console.error(`Error sincronizando producto ${producto.id}:`, error);
        }
      }

      return {
        success: true,
        count: sincronizados,
        message: `${sincronizados} productos sincronizados`,
      };
    } catch (error) {
      console.error(
        "❌ [OFFLINE SERVICE] Error sincronizando productos:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  static async searchProductsOffline(searchTerm, categoriaId = null) {
    try {
      const productos = await IndexedDBService.getAll("productos");

      let filtered = productos.filter(
        (producto) =>
          producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          producto.codigo_barras?.includes(searchTerm) ||
          producto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (categoriaId) {
        filtered = filtered.filter((p) => p.categoria_id === categoriaId);
      }

      return filtered;
    } catch (error) {
      console.error("❌ [OFFLINE SERVICE] Error buscando productos:", error);
      return [];
    }
  }

  static async getProductByIdOffline(productId) {
    try {
      return await IndexedDBService.get("productos", productId);
    } catch (error) {
      console.error("❌ [OFFLINE SERVICE] Error obteniendo producto:", error);
      return null;
    }
  }

  static async getLowStockProductsOffline(limite = 10) {
    try {
      const productos = await IndexedDBService.getAll("productos");
      return productos
        .filter((p) => p.stock > 0 && p.stock <= p.stock_minimo)
        .slice(0, limite);
    } catch (error) {
      console.error(
        "❌ [OFFLINE SERVICE] Error obteniendo productos bajo stock:",
        error
      );
      return [];
    }
  }

  static async updateStockOffline(productoId, nuevoStock, metadata = {}) {
    try {
      const producto = await IndexedDBService.get("productos", productoId);
      if (!producto) {
        return { success: false, error: "Producto no encontrado" };
      }

      const stock_anterior = producto.stock;
      const productoActualizado = {
        ...producto,
        stock: nuevoStock,
        sincronizado: false,
        fecha_actualizacion: new Date().toISOString(),
        historial_stock: [
          ...(producto.historial_stock || []),
          {
            fecha: new Date().toISOString(),
            stock_anterior,
            stock_nuevo: nuevoStock,
            tipo: metadata.tipo || "ajuste_manual",
            motivo: metadata.motivo,
            usuario: metadata.usuario,
          },
        ],
      };

      await IndexedDBService.put("productos", productoActualizado);

      return {
        success: true,
        stock_anterior,
        stock_nuevo: nuevoStock,
        producto: productoActualizado,
      };
    } catch (error) {
      console.error("❌ [OFFLINE SERVICE] Error actualizando stock:", error);
      return { success: false, error: error.message };
    }
  }

  static async reduceStockOffline(productoId, cantidad, ventaId = null) {
    try {
      const producto = await IndexedDBService.get("productos", productoId);
      if (!producto) {
        return { success: false, error: "Producto no encontrado" };
      }

      const stock_anterior = producto.stock;
      const stock_nuevo = Math.max(0, stock_anterior - cantidad);

      const productoActualizado = {
        ...producto,
        stock: stock_nuevo,
        sincronizado: false,
        fecha_actualizacion: new Date().toISOString(),
        historial_stock: [
          ...(producto.historial_stock || []),
          {
            fecha: new Date().toISOString(),
            stock_anterior,
            stock_nuevo,
            tipo: "venta",
            venta_id: ventaId,
            cantidad_vendida: cantidad,
          },
        ],
      };

      await IndexedDBService.put("productos", productoActualizado);

      return {
        success: true,
        stock_anterior,
        stock_nuevo,
        producto: productoActualizado,
      };
    } catch (error) {
      console.error("❌ [OFFLINE SERVICE] Error reduciendo stock:", error);
      return { success: false, error: error.message };
    }
  }
}

// actions/categoriesActions.js - AGREGAR ESTA FUNCIÓN
export const loadCategoriesIfNeeded = (forceRefresh = false) => {
  return async (dispatch, getState) => {
    const state = getState();

    const shouldSkip =
      !forceRefresh &&
      state.categories.data &&
      state.categories.data.length > 0 &&
      !state.categories.loading &&
      state.categories.timestamp &&
      Date.now() - state.categories.timestamp < 5 * 60 * 1000;

    if (shouldSkip) {
      console.log("✅ Categorías recientes en estado, omitiendo carga");
      return {
        success: true,
        fromCache: true,
        data: state.categories.data,
      };
    }

    return dispatch(loadCategories(forceRefresh));
  };
};
// ✅ NUEVA ACCIÓN: Sincronizar productos para offline
export const syncProductsForOffline = () => {
  return async (dispatch) => {
    try {
      if (!navigator.onLine) {
        return { success: false, error: "Se requiere conexión a internet" };
      }

      const result = await ProductsOfflineController.syncProducts();

      if (result.success) {
        // Recargar productos en Redux
        await dispatch(loadProducts());
      }

      return result;
    } catch (error) {
      console.error("❌ Error sincronizando productos:", error);
      return { success: false, error: error.message };
    }
  };
};
// ✅ CREAR PRODUCTO CON SOPORTE OFFLINE
export const createProduct = (productData) => {
  return async (dispatch) => {
    try {
      console.log("🔄 [PRODUCTS] Creando producto...", productData);
      console.log("🌐 [PRODUCTS] Estado de conexión:", navigator.onLine);

      let resultado;

      // ✅ DECISIÓN CLARA: OFFLINE vs ONLINE
      if (!navigator.onLine) {
        // 🔴 MODO OFFLINE: Solo crear localmente
        console.log("📱 [PRODUCTS] Modo OFFLINE - creando solo localmente");

        resultado = await ProductsOfflineController.createProductPending(
          productData
        );

        if (resultado.success) {
          console.log(
            "✅ [PRODUCTS] Producto creado localmente:",
            resultado.id_local
          );

          await Swal.fire({
            icon: "info",
            title: "Modo Offline",
            text: "Producto guardado localmente. Se sincronizará cuando recuperes la conexión.",
            confirmButtonText: "Entendido",
          });

          // ✅ DISPATCH SOLO PARA ACTUALIZAR UI LOCAL
          dispatch({
            type: types.productAddNew,
            payload: {
              ...resultado.datos,
              id: resultado.id_local,
              sincronizado: false,
            },
          });

          return { success: true, producto: resultado };
        } else {
          throw new Error(resultado.error);
        }
      } else {
        // 🟢 MODO ONLINE: Crear en servidor
        console.log("🌐 [PRODUCTS] Modo ONLINE - creando en servidor");

        const response = await fetchConToken("productos", productData, "POST");
        console.log("📥 [PRODUCTS] Respuesta del backend:", response);

        if (response && response.ok === true) {
          // Buscar producto en diferentes estructuras
          if (response.producto) {
            resultado = response.producto;
          } else if (response.product) {
            resultado = response.product;
          } else {
            console.warn("⚠️ Estructura de respuesta no reconocida:", response);
            resultado = response;
          }

          console.log(
            "✅ [PRODUCTS] Producto creado en servidor:",
            resultado?.id
          );

          // ✅ GUARDAR EN CACHE LOCAL TAMBIÉN
          if (resultado) {
            await IndexedDBService.add("productos", {
              ...resultado,
              sincronizado: true,
            });
          }

          await Swal.fire({
            icon: "success",
            title: "¡Éxito!",
            text: response.msg || "Producto creado exitosamente",
            timer: 3000,
            showConfirmButton: false,
            position: "top-end",
            toast: true,
          });

          // ✅ DISPATCH PARA ACTUALIZAR UI
          dispatch({
            type: types.productAddNew,
            payload: resultado,
          });

          return { success: true, producto: resultado };
        } else {
          const errorMsg =
            response?.msg || response?.error || "Error al crear producto";
          throw new Error(errorMsg);
        }
      }
    } catch (error) {
      console.error("❌ [PRODUCTS] Error creando producto:", error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al crear producto",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};
// En productsActions.js - SIMPLIFICAR updateProduct
export const updateProduct = (productId, productData) => {
  return async (dispatch) => {
    try {
      // ✅ VERIFICAR QUE productId SEA UN STRING VÁLIDO
      if (!productId || typeof productId !== "string") {
        console.error("❌ [PRODUCTS] ID de producto inválido:", productId);
        throw new Error("ID de producto inválido");
      }

      console.log(
        `🔄 [PRODUCTS] Actualizando producto: ${productId}`,
        productData
      );

      let resultado;

      if (navigator.onLine) {
        // Online: actualizar en servidor
        console.log(`🌐 [PRODUCTS] Actualizando en servidor...`);

        // ✅ USAR fetchConToken PARA TODO - ya maneja FormData y JSON automáticamente
        const response = await fetchConToken(
          `productos/${productId}`,
          productData,
          "PUT"
        );

        console.log("📥 [PRODUCTS] Respuesta del backend:", response);

        if (response && response.ok === true) {
          // ✅ BUSCAR PRODUCTO EN DIFERENTES ESTRUCTURAS
          if (response.producto) {
            resultado = response.producto;
          } else if (response.product) {
            resultado = response.product;
          } else {
            console.warn("⚠️ Estructura de respuesta no reconocida:", response);
            resultado = response;
          }

          console.log(
            "✅ [PRODUCTS] Producto actualizado exitosamente en servidor"
          );

          // Actualizar en IndexedDB
          if (resultado) {
            await IndexedDBService.put("productos", resultado);
          }

          await Swal.fire({
            icon: "success",
            title: "¡Éxito!",
            text: response.msg || "Producto actualizado exitosamente",
            timer: 3000,
            showConfirmButton: false,
            position: "top-end",
            toast: true,
          });
        } else {
          throw new Error(
            response?.msg || response?.error || "Error al actualizar producto"
          );
        }
      } else {
        //   // Offline: actualizar localmente
        //   console.log("📱 [PRODUCTS] Actualizando producto localmente...");

        //   const productoExistente = await IndexedDBService.get(
        //     "productos",
        //     productId
        //   );
        //   if (!productoExistente) {
        //     throw new Error("Producto no encontrado localmente");
        //   }

        //   // ✅ CONVERTIR FormData A OBJETO SI ES NECESARIO
        //   let updateData = productData;
        //   if (productData instanceof FormData) {
        //     updateData = {};
        //     for (let [key, value] of productData.entries()) {
        //       // Saltar el campo 'imagen' en modo offline
        //       if (key !== "imagen") {
        //         updateData[key] = value;
        //       }
        //     }
        //   }

        //   const productoActualizado = {
        //     ...productoExistente,
        //     ...updateData,
        //     sincronizado: false,
        //     fecha_actualizacion: new Date().toISOString(),
        //   };

        //   await IndexedDBService.put("productos", productoActualizado);
        //   resultado = productoActualizado;

        //   console.log(
        //     "✅ [PRODUCTS] Producto actualizado localmente:",
        //     productId
        //   );

        //   await Swal.fire({
        //     icon: "info",
        //     title: "Modo Offline",
        //     text: "Producto actualizado localmente. Se sincronizará cuando recuperes la conexión.",
        //     confirmButtonText: "Entendido",
        //   });
        // }
        // ✅ NUEVO: Usar controller offline
        console.log(
          "📱 [PRODUCTS] Actualizando producto localmente con controller..."
        );

        resultado = await ProductsOfflineController.updateProductPending(
          productId,
          productData
        );

        if (resultado.success) {
          await Swal.fire({
            icon: "info",
            title: "Modo Offline",
            text: "Producto actualizado localmente. Se sincronizará cuando recuperes la conexión.",
            confirmButtonText: "Entendido",
          });
        } else {
          throw new Error(resultado.error);
        }
      }

      // Actualizar estado global
      dispatch({
        type: types.productUpdated,
        payload: resultado,
      });

      return { success: true, producto: resultado };
    } catch (error) {
      console.error(
        `❌ [PRODUCTS] Error actualizando producto ${productId}:`,
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al actualizar producto",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};
export const loadProducts = (forceRefresh = false) => {
  return async (dispatch, getState) => {
    const currentState = getState();

    if (
      !forceRefresh &&
      currentState.products.products &&
      currentState.products.products.length > 0 &&
      !currentState.products.loading
    ) {
      console.log("✅ Productos ya cargados, omitiendo...");
      return {
        success: true,
        fromCache: true,
        data: currentState.products.products,
      };
    }

    dispatch({ type: types.productsStartLoading });

    try {
      const cacheKey = "products_data";
      let products = [];
      let fromCache = false;
      let source = "";

      if (!forceRefresh) {
        const cachedResult = await cacheManager.getWithCache(
          cacheKey,
          async () => {
            return await fetchProductsFromSource();
          },
          forceRefresh
        );

        products = cachedResult.data;
        fromCache = cachedResult.fromCache;
        source = fromCache ? "cache" : navigator.onLine ? "api" : "indexeddb";

        console.log(`📦 Productos cargados desde: ${source}`, {
          count: products.length,
          fromCache,
        });
      } else {
        products = await fetchProductsFromSource();
        source = navigator.onLine ? "api" : "indexeddb";
        console.log(`🔄 Recarga forzada desde: ${source}`, {
          count: products.length,
        });
      }

      // ✅ CORREGIDO: Enviar solo el array de productos
      dispatch({
        type: types.productsLoad,
        payload: products, // ← ENVIAR ARRAY DIRECTO, NO OBJETO
      });

      return {
        success: true,
        fromCache,
        data: products,
        source,
      };
    } catch (error) {
      console.error("❌ Error cargando productos:", error);

      const fallbackResult = await handleProductsFallback(dispatch);
      return {
        success: false,
        error: error.message,
        fallbackUsed: true,
        ...fallbackResult,
      };
    } finally {
      dispatch({ type: types.productsFinishLoading });
    }
  };
};

// ✅ FUNCIÓN PRIVADA PARA OBTENER PRODUCTOS
async function fetchProductsFromSource() {
  if (navigator.onLine) {
    // Online: cargar desde API y guardar en IndexedDB
    const response = await fetchConToken("productos");

    if (response.ok && response.productos) {
      const products = response.productos;

      // ✅ GUARDAR EN INDEXEDDB (en segundo plano, no bloquear)
      ProductsOfflineController.saveProducts(products)
        .then((result) => {
          if (result.success) {
            console.log("✅ Productos guardados en IndexedDB para offline");
          } else {
            console.error("❌ Error guardando en IndexedDB:", result.error);
          }
        })
        .catch((error) => {
          console.error("❌ Error en guardado background:", error);
        });

      return products;
    } else {
      throw new Error("Error en respuesta de API");
    }
  } else {
    // Offline: cargar desde IndexedDB
    console.log("📱 Modo offline: cargando desde IndexedDB");
    let products = await ProductsOfflineController.getAllProducts();

    if (products.length === 0) {
      // Intentar limpieza de emergencia
      await ProductsOfflineController.emergencyCleanup();
      products = await ProductsOfflineController.getAllProducts();
    }

    if (products.length === 0) {
      throw new Error("No hay productos disponibles offline");
    }

    return products;
  }
}

async function handleProductsFallback(dispatch) {
  try {
    console.log("🔄 Intentando fallback desde IndexedDB...");
    const offlineProducts = await ProductsOfflineController.getAllProducts();

    if (offlineProducts.length > 0) {
      // ✅ CORREGIDO: Enviar array directo
      dispatch({
        type: types.productsLoad,
        payload: offlineProducts, // ← ARRAY DIRECTO
      });

      return {
        success: true,
        data: offlineProducts,
        source: "fallback",
      };
    }
  } catch (fallbackError) {
    console.error("❌ Fallback también falló:", fallbackError);
  }

  // Último recurso: array vacío
  dispatch({
    type: types.productsLoad,
    payload: [], // ← ARRAY VACÍO DIRECTO
  });

  return { success: false, data: [], source: "empty" };
}

// // ✅ CORREGIDO: Cambiar state.products.data por state.products.products
export const loadProductsIfNeeded = (forceRefresh = false) => {
  return async (dispatch, getState) => {
    const state = getState();

    const shouldSkip =
      !forceRefresh &&
      state.products.products &&
      state.products.products.length > 0 &&
      !state.products.loading &&
      state.products.timestamp &&
      Date.now() - state.products.timestamp < 5 * 60 * 1000;

    if (shouldSkip) {
      console.log("✅ Productos recientes en estado, omitiendo carga");
      return {
        success: true,
        fromCache: true,
        data: state.products.products,
        source: "state",
      };
    }

    return dispatch(loadProducts(forceRefresh));
  };
};

// ✅ ELIMINAR PRODUCTO CON SOPORTE OFFLINE
export const deleteProduct = (productId) => {
  return async (dispatch) => {
    try {
      console.log(`🔄 [PRODUCTS] Eliminando producto: ${productId}`);

      if (navigator.onLine) {
        // Online: eliminar en servidor
        const response = await fetchConToken(
          `productos/${productId}`,
          {},
          "DELETE"
        );

        if (response && response.ok === true) {
          console.log(
            "✅ [PRODUCTS] Producto eliminado exitosamente del servidor"
          );

          // Eliminar de IndexedDB
          await IndexedDBService.delete("productos", productId);
        } else {
          throw new Error(response?.error || "Error al eliminar producto");
        }
      } else {
        //   // Offline: marcar como eliminado localmente
        //   console.log(
        //     "📱 [PRODUCTS] Marcando producto como eliminado localmente..."
        //   );

        //   const productoExistente = await IndexedDBService.get(
        //     "productos",
        //     productId
        //   );
        //   if (!productoExistente) {
        //     throw new Error("Producto no encontrado localmente");
        //   }

        //   const productoEliminado = {
        //     ...productoExistente,
        //     activo: false,
        //     eliminado: true,
        //     sincronizado: false,
        //     fecha_eliminacion: new Date().toISOString(),
        //   };

        //   await IndexedDBService.put("productos", productoEliminado);

        //   console.log(
        //     "✅ [PRODUCTS] Producto marcado como eliminado localmente:",
        //     productId
        //   );

        //   await Swal.fire({
        //     icon: "info",
        //     title: "Modo Offline",
        //     text: "Producto marcado como eliminado localmente. Se sincronizará cuando recuperes la conexión.",
        //     confirmButtonText: "Entendido",
        //   });
        // }
        // ✅ NUEVO: Usar controller offline
        console.log(
          "📱 [PRODUCTS] Eliminando producto localmente con controller..."
        );

        const resultado = await ProductsOfflineController.deleteProductPending(
          productId
        );

        if (resultado.success) {
          await Swal.fire({
            icon: "info",
            title: "Modo Offline",
            text: "Producto marcado como eliminado localmente. Se sincronizará cuando recuperes la conexión.",
            confirmButtonText: "Entendido",
          });
        } else {
          throw new Error(resultado.error);
        }
      }
      // Actualizar estado global
      dispatch({
        type: types.productDeleted,
        payload: productId,
      });

      return { success: true };
    } catch (error) {
      console.error(
        `❌ [PRODUCTS] Error eliminando producto ${productId}:`,
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al eliminar producto",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

// ✅ ACTUALIZAR STOCK DESDE CARRITO (PARA PaymentModal)
export const updateStockFromCart = (productId, quantity) => {
  return async (dispatch) => {
    try {
      console.log(
        `🔄 [PRODUCTS] Actualizando stock desde carrito: ${productId} -${quantity}`
      );

      const resultado = await OfflineProductsService.reduceStockOffline(
        productId,
        quantity,
        "venta_carrito"
      );

      if (resultado.success) {
        console.log(
          `✅ [PRODUCTS] Stock actualizado desde carrito: ${productId} -${quantity}`
        );

        dispatch({
          type: types.productUpdateStock,
          payload: {
            productoId: productId,
            stock_anterior: resultado.stock_anterior,
            stock_nuevo: resultado.stock_nuevo,
            producto: resultado.producto,
          },
        });

        return true;
      } else {
        throw new Error(resultado.error);
      }
    } catch (error) {
      console.error(
        `❌ [PRODUCTS] Error actualizando stock desde carrito ${productId}:`,
        error
      );
      return false;
    }
  };
};

// ✅ BUSCAR PRODUCTOS CON SOPORTE OFFLINE
export const searchProducts = (searchTerm, categoriaId = null) => {
  return async (dispatch) => {
    try {
      console.log(`🔍 [PRODUCTS] Buscando: "${searchTerm}"`, {
        categoriaId,
        online: navigator.onLine,
      });

      let resultados = await OfflineProductsService.searchProductsOffline(
        searchTerm,
        categoriaId
      );

      // ✅ ENRIQUECER RESULTADOS
      resultados = resultados.map((producto) => ({
        ...producto,
        estado_stock:
          producto.stock <= 0
            ? "agotado"
            : producto.stock <= producto.stock_minimo
            ? "bajo"
            : "normal",
        coincide_nombre: producto.nombre
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
        coincide_codigo: producto.codigo_barras?.includes(searchTerm),
      }));

      console.log(
        `✅ [PRODUCTS] ${resultados.length} productos encontrados para: "${searchTerm}"`
      );

      dispatch({
        type: types.productsSearch,
        payload: resultados,
      });

      return resultados;
    } catch (error) {
      console.error("❌ [PRODUCTS] Error buscando productos:", error);

      dispatch({
        type: types.productsSearch,
        payload: [],
      });

      return [];
    }
  };
};

// ✅ OBTENER PRODUCTO POR ID CON SOPORTE OFFLINE
export const getProductById = (productId) => {
  return async (dispatch) => {
    try {
      console.log(`🔄 [PRODUCTS] Obteniendo producto: ${productId}`);

      const producto = await OfflineProductsService.getProductByIdOffline(
        productId
      );

      if (!producto) {
        console.warn(`⚠️ [PRODUCTS] Producto ${productId} no encontrado`);
        return null;
      }

      // ✅ ENRIQUECER DATOS
      const productoEnriquecido = {
        ...producto,
        estado_stock:
          producto.stock <= 0
            ? "agotado"
            : producto.stock <= producto.stock_minimo
            ? "bajo"
            : "normal",
        ganancia_estimada: producto.precio_venta - producto.precio_compra,
        margen_ganancia:
          producto.precio_compra > 0
            ? (
                ((producto.precio_venta - producto.precio_compra) /
                  producto.precio_compra) *
                100
              ).toFixed(1)
            : 0,
        necesita_reposicion: producto.stock <= producto.stock_minimo,
      };

      console.log(
        `✅ [PRODUCTS] Producto cargado: ${productoEnriquecido.nombre}`
      );

      dispatch({
        type: types.productSetActive,
        payload: productoEnriquecido,
      });

      return productoEnriquecido;
    } catch (error) {
      console.error(
        `❌ [PRODUCTS] Error obteniendo producto ${productId}:`,
        error
      );
      return null;
    }
  };
};

// ✅ ACTUALIZAR STOCK CON SOPORTE OFFLINE
export const updateProductStock = (productoId, stockData) => {
  return async (dispatch) => {
    try {
      console.log(`🔄 [PRODUCTS] Actualizando stock: ${productoId}`, stockData);

      const resultado = await OfflineProductsService.updateStockOffline(
        productoId,
        stockData.nuevo_stock,
        {
          tipo: "ajuste_manual",
          motivo: stockData.motivo || "Ajuste manual",
          usuario: stockData.usuario || "Sistema",
        }
      );

      if (resultado.success) {
        console.log(
          `✅ [PRODUCTS] Stock actualizado: ${productoId} -> ${stockData.nuevo_stock}`
        );

        // ✅ ACTUALIZAR ESTADO GLOBAL
        dispatch({
          type: types.productUpdateStock,
          payload: {
            productoId,
            stock_anterior: resultado.stock_anterior,
            stock_nuevo: resultado.stock_nuevo,
            producto: resultado.producto,
          },
        });

        await Swal.fire({
          icon: "success",
          title: "Stock Actualizado",
          text: `Stock actualizado correctamente: ${resultado.stock_anterior} → ${resultado.stock_nuevo}`,
          timer: 2000,
          showConfirmButton: false,
        });

        return true;
      } else {
        throw new Error(resultado.error);
      }
    } catch (error) {
      console.error(
        `❌ [PRODUCTS] Error actualizando stock ${productoId}:`,
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al actualizar stock",
        confirmButtonText: "Entendido",
      });

      return false;
    }
  };
};

// ✅ REDUCIR STOCK POR VENTA CON SOPORTE OFFLINE
export const reduceProductStock = (productoId, cantidad, ventaId = null) => {
  return async (dispatch) => {
    try {
      console.log(`🔄 [PRODUCTS] Reduciendo stock: ${productoId} -${cantidad}`);

      const resultado = await OfflineProductsService.reduceStockOffline(
        productoId,
        cantidad,
        ventaId
      );

      if (resultado.success) {
        console.log(`✅ [PRODUCTS] Stock reducido: ${productoId} -${cantidad}`);

        dispatch({
          type: types.productUpdateStock,
          payload: {
            productoId,
            stock_anterior: resultado.stock_anterior,
            stock_nuevo: resultado.stock_nuevo,
            producto: resultado.producto,
          },
        });

        return true;
      } else {
        console.error(
          `❌ [PRODUCTS] Error reduciendo stock: ${resultado.error}`
        );
        return false;
      }
    } catch (error) {
      console.error(
        `❌ [PRODUCTS] Error reduciendo stock ${productoId}:`,
        error
      );
      return false;
    }
  };
};

// ✅ CARGAR PRODUCTOS BAJO STOCK CON SOPORTE OFFLINE
export const loadLowStockProducts = (limite = 10) => {
  return async (dispatch) => {
    try {
      console.log(`🔄 [PRODUCTS] Cargando productos bajo stock...`);

      const productosBajoStock =
        await OfflineProductsService.getLowStockProductsOffline(limite);

      console.log(
        `📉 [PRODUCTS] ${productosBajoStock.length} productos con stock bajo`
      );

      dispatch({
        type: types.productsLoadLowStock,
        payload: productosBajoStock,
      });

      return productosBajoStock;
    } catch (error) {
      console.error(
        "❌ [PRODUCTS] Error cargando productos bajo stock:",
        error
      );

      dispatch({
        type: types.productsLoadLowStock,
        payload: [],
      });

      return [];
    }
  };
};

// ✅ SINCRONIZAR PRODUCTOS MANUALMENTE
export const syncProducts = () => {
  return async (dispatch) => {
    try {
      if (!navigator.onLine) {
        await Swal.fire({
          icon: "warning",
          title: "Sin conexión",
          text: "No hay conexión a internet para sincronizar",
          confirmButtonText: "Entendido",
        });
        return false;
      }

      await Swal.fire({
        title: "Sincronizando...",
        text: "Actualizando catálogo de productos",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const resultado = await OfflineProductsService.syncProductsOffline();

      Swal.close();

      if (resultado.success) {
        // Recargar productos después de sincronizar
        await dispatch(loadProducts());

        await Swal.fire({
          icon: "success",
          title: "Sincronización completada",
          text:
            resultado.message || `${resultado.count} productos actualizados`,
          timer: 2000,
          showConfirmButton: false,
        });

        return true;
      } else {
        throw new Error(resultado.error);
      }
    } catch (error) {
      console.error("❌ [PRODUCTS] Error sincronizando productos:", error);

      Swal.close();

      await Swal.fire({
        icon: "error",
        title: "Error de sincronización",
        text: error.message || "No se pudieron actualizar los productos",
        confirmButtonText: "Entendido",
      });

      return false;
    }
  };
};

// ✅ OBTENER ESTADÍSTICAS DE PRODUCTOS
export const loadProductsStats = () => {
  return async (dispatch) => {
    try {
      const productos = await OfflineProductsService.getProductsOffline();

      const stats = {
        total: productos.length,
        activos: productos.filter((p) => p.activo).length,
        inactivos: productos.filter((p) => !p.activo).length,
        agotados: productos.filter((p) => p.stock === 0).length,
        bajo_stock: productos.filter(
          (p) => p.stock > 0 && p.stock <= p.stock_minimo
        ).length,
        valor_total_inventario: productos.reduce(
          (sum, p) => sum + p.stock * p.precio_compra,
          0
        ),
        productos_por_categoria: {},
      };

      // Agrupar por categoría
      productos.forEach((producto) => {
        if (!stats.productos_por_categoria[producto.categoria_id]) {
          stats.productos_por_categoria[producto.categoria_id] = 0;
        }
        stats.productos_por_categoria[producto.categoria_id]++;
      });

      dispatch({
        type: types.productsLoadStats,
        payload: stats,
      });

      return stats;
    } catch (error) {
      console.error("❌ [PRODUCTS] Error cargando estadísticas:", error);
      return {};
    }
  };
};

export const setActiveProduct = (product) => ({
  type: types.productSetActive,
  payload: product,
});

export const clearActiveProduct = () => ({
  type: types.productClearActive,
});
