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
              await IndexedDBService.put("productos", {
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
            await IndexedDBService.put("productos", {
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
// actions/productsActions.js - VERSIÓN CORREGIDA
export const updateProduct = (productId, productData) => {
  return async (dispatch, getState) => {
    try {
      console.log(
        `🔄 [PRODUCTS] Actualizando producto: ${productId}`,
        productData
      );

      let resultado;
      const isOnline = navigator.onLine;
      const state = getState();
      const { user } = state.auth;

      // ✅ OBTENER PRODUCTO ACTUAL PRIMERO
      const productoActual = await IndexedDBService.get("productos", productId);
      if (!productoActual) {
        throw new Error("Producto no encontrado en base de datos local");
      }

      // ✅ USAR SIEMPRE EL ID CORRECTO (evitar cambiar IDs)
      const idToUse = productoActual.id || productoActual.id_local || productId;

      // ✅ DETECTAR CAMBIO DE PRECIO
      const precioAnterior = productoActual.precio;
      const precioNuevo = productData.precio;
      const hayCambioPrecio =
        precioNuevo !== undefined && precioNuevo !== precioAnterior;

      if (isOnline) {
        // Online: actualizar en servidor
        console.log(`🌐 [PRODUCTS] Actualizando en servidor...`);

        const response = await fetchConToken(
          `productos/${idToUse}`,
          productData,
          "PUT"
        );

        if (response && response.ok === true) {
          resultado = response.producto || response.product || response;

          // ✅ ACTUALIZAR EN INDEXEDDB MANTENIENDO EL ID ORIGINAL
          const productoActualizado = {
            ...resultado,
            // MANTENER ID LOCAL SI EXISTE
            id_local: productoActual.id_local,
            last_sync: new Date().toISOString(),
            sincronizado: true,
          };

          await IndexedDBService.put("productos", productoActualizado);

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
        // ✅ OFFLINE: Actualizar localmente
        console.log("📱 [PRODUCTS] Actualizando producto localmente...");

        // ✅ MANTENER ESTRUCTURA ORIGINAL DEL PRODUCTO
        const productoActualizado = {
          ...productoActual, // Mantener todos los campos originales
          ...productData, // Aplicar solo los cambios
          sincronizado: false,
          fecha_actualizacion: new Date().toISOString(),
          pending_sync: true,
        };

        // ✅ NO CAMBIAR EL ID BAJO NINGUNA CIRCUNSTANCIA
        await IndexedDBService.put("productos", productoActualizado);
        resultado = productoActualizado;

        // ✅ REGISTRAR CAMBIO DE PRECIO SI ES NECESARIO
        if (hayCambioPrecio) {
          console.log(
            `💰 Registrando cambio de precio: ${precioAnterior} → ${precioNuevo}`
          );

          try {
            const PriceSyncController = await import(
              "../controllers/offline/PriceSyncController/PriceSyncController"
            ).then((module) => module.default);

            if (PriceSyncController) {
              const cambioPrecio = {
                precio_anterior: precioAnterior,
                precio_nuevo: precioNuevo,
                tipo: "ajuste_manual",
                usuario: user?.nombre || "Sistema",
              };

              await PriceSyncController.registerPriceChange(
                idToUse,
                cambioPrecio
              );

              console.log(
                `✅ Cambio de precio registrado para producto: ${idToUse}`
              );
            }
          } catch (importError) {
            console.error(
              "❌ Error cargando PriceSyncController:",
              importError
            );
          }
        }

        await Swal.fire({
          icon: "info",
          title: "Modo Offline",
          text: "Producto actualizado localmente. Se sincronizará cuando recuperes la conexión.",
          confirmButtonText: "Entendido",
        });
      }

      // ✅ ACTUALIZAR ESTADO GLOBAL
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
// export const loadProducts = (forceRefresh = false) => {
//   return async (dispatch, getState) => {
//     dispatch({ type: types.productsStartLoading });

//     try {
//       let products = [];
//       let source = "";

//       if (navigator.onLine) {
//         // Carga desde API
//         console.log("🌐 [PRODUCTS] Cargando productos desde servidor...");
//         const response = await fetchConToken("productos");

//         if (response && response.ok === true && response.productos) {
//           products = response.productos;
//           source = "server";

//           // ✅ CORREGIDO: Verificar que el método existe antes de llamarlo
//           console.log("💾 [PRODUCTS] Guardando productos en IndexedDB...");
//           if (typeof ProductsOfflineController.saveProducts === "function") {
//             await ProductsOfflineController.saveProducts(products);
//             console.log("✅ [PRODUCTS] Productos guardados en IndexedDB");
//           } else {
//             console.warn(
//               "⚠️ [PRODUCTS] ProductsOfflineController.saveProducts no disponible"
//             );
//             // Fallback: guardar productos uno por uno
//             for (const product of products) {
//               await IndexedDBService.put("productos", {
//                 ...product,
//                 last_sync: new Date().toISOString(),
//                 sincronizado: true,
//               });
//             }
//           }
//         } else {
//           throw new Error(response?.error || "Error en respuesta de API");
//         }
//       } else {
//         // Carga desde IndexedDB
//         console.log("📱 [PRODUCTS] Cargando productos desde IndexedDB...");
//         products = await IndexedDBService.getAll("productos");
//         source = "offline";

//         if (products.length === 0) {
//           console.warn("⚠️ [PRODUCTS] No hay productos en IndexedDB");
//         }
//       }

//       console.log(
//         `✅ [PRODUCTS] ${products.length} productos cargados desde ${source}`
//       );

//       // ✅ SOLO UN DISPATCH
//       dispatch({
//         type: types.productsLoad,
//         payload: products,
//       });

//       return {
//         success: true,
//         data: products,
//         source: source,
//       };
//     } catch (error) {
//       console.error("❌ [PRODUCTS] Error cargando productos:", error);

//       // ✅ FALLBACK CONTROLADO - solo un dispatch
//       try {
//         console.log("🔄 [PRODUCTS] Intentando fallback desde IndexedDB...");
//         const fallbackProducts = await IndexedDBService.getAll("productos");

//         dispatch({
//           type: types.productsLoad,
//           payload: fallbackProducts || [],
//         });

//         console.log(
//           `🔄 [PRODUCTS] ${
//             fallbackProducts?.length || 0
//           } productos cargados desde fallback`
//         );

//         return {
//           success: true,
//           data: fallbackProducts || [],
//           source: "fallback",
//         };
//       } catch (fallbackError) {
//         console.error("❌ [PRODUCTS] Fallback también falló:", fallbackError);

//         dispatch({
//           type: types.productsLoad,
//           payload: [],
//         });

//         return {
//           success: false,
//           data: [],
//           source: "error",
//           error: error.message,
//         };
//       }
//     } finally {
//       dispatch({ type: types.productsFinishLoading });
//     }
//   };
// };
// actions/productsActions.js - VERSIÓN CORREGIDA

export const loadProducts = (forceRefresh = false) => {
  return async (dispatch, getState) => {
    dispatch({ type: types.productsStartLoading });

    try {
      let products = [];
      let source = "";

      if (navigator.onLine) {
        // ✅ CARGA DESDE SERVIDOR CON MANTENIMIENTO DE STOCK Y PRECIOS LOCALES
        console.log(
          "🌐 [PRODUCTS] Cargando desde servidor manteniendo stock y precios locales..."
        );
        const response = await fetchConToken("productos");

        if (response && response.ok) {
          // ✅ EXTRAER PRODUCTOS DE FORMA SEGURA
          let serverProducts = [];
          if (Array.isArray(response.productos)) {
            serverProducts = response.productos;
          } else if (Array.isArray(response.data)) {
            serverProducts = response.data;
          } else if (Array.isArray(response)) {
            serverProducts = response;
          }

          if (serverProducts.length > 0) {
            source = "server";
            console.log(
              `✅ ${serverProducts.length} productos recibidos del servidor`
            );

            // ✅ OBTENER PRODUCTOS LOCALES ACTUALES
            const localProducts = await IndexedDBService.getAll("productos");
            console.log(
              `📱 ${localProducts.length} productos en datos locales`
            );

            // ✅ COMBINAR: MANTENER STOCK Y PRECIOS LOCALES PARA PRODUCTOS EXISTENTES
            const mergedProducts = await mergeProductsWithLocalData(
              serverProducts,
              localProducts
            );
            products = mergedProducts;

            console.log(
              `🔄 Productos combinados: ${products.length} (Manteniendo stock y precios locales)`
            );

            // ✅ GUARDAR PRODUCTOS COMBINADOS EN INDEXEDDB
            await IndexedDBService.clear("productos");
            for (const product of products) {
              await IndexedDBService.put("productos", {
                ...product,
                last_sync: new Date().toISOString(),
                sincronizado: true,
              });
            }
          }
        } else {
          throw new Error(response?.msg || "Error en respuesta del servidor");
        }
      }

      // ✅ SI ESTAMOS OFFLINE O FALLÓ LA CARGA ONLINE, USAR INDEXEDDB
      if (!navigator.onLine || products.length === 0) {
        console.log("📱 Cargando desde IndexedDB...");
        try {
          products = await IndexedDBService.getAll("productos");
          source = "offline";
          console.log(`✅ ${products.length} productos cargados de IndexedDB`);
        } catch (offlineError) {
          console.error("❌ Error cargando de IndexedDB:", offlineError);
          products = [];
        }
      }

      // ✅ ELIMINAR DUPLICADOS
      const uniqueProducts = removeDuplicateProducts(products);

      dispatch({
        type: types.productsLoad,
        payload: uniqueProducts,
      });

      return {
        success: true,
        data: uniqueProducts,
        source: source,
      };
    } catch (error) {
      console.error("❌ Error crítico cargando productos:", error);

      // ✅ FALLBACK MEJORADO
      try {
        const fallbackProducts = await IndexedDBService.getAll("productos");
        const uniqueFallback = removeDuplicateProducts(fallbackProducts);

        dispatch({
          type: types.productsLoad,
          payload: uniqueFallback || [],
        });

        return {
          success: true,
          data: uniqueFallback || [],
          source: "fallback",
        };
      } catch (finalError) {
        console.error("❌ Fallback final falló:", finalError);
        dispatch({
          type: types.productsLoad,
          payload: [],
        });
        return {
          success: false,
          data: [],
          source: "error",
          error: error.message,
        };
      }
    } finally {
      dispatch({ type: types.productsFinishLoading });
    }
  };
};

// ✅ NUEVA FUNCIÓN PARA COMBINAR PRODUCTOS MANTENIENDO STOCK LOCAL
async function mergeProductsWithLocalStock(serverProducts, localProducts) {
  try {
    console.log("🔄 Combinando productos del servidor con stock local...");

    const localProductsMap = new Map();

    // ✅ CREAR MAPA DE PRODUCTOS LOCALES POR NOMBRE (para búsqueda rápida)
    localProducts.forEach((product) => {
      if (product.nombre) {
        const key = product.nombre.toLowerCase().trim();
        localProductsMap.set(key, product);
      }

      // ✅ TAMBIÉN POR ID POR SI ACASO
      if (product.id) {
        localProductsMap.set(`id_${product.id}`, product);
      }
      if (product.id_local) {
        localProductsMap.set(`local_${product.id_local}`, product);
      }
    });

    const mergedProducts = serverProducts.map((serverProduct) => {
      // ✅ BUSCAR SI EL PRODUCTO EXISTE LOCALMENTE POR NOMBRE
      const localKey = serverProduct.nombre
        ? serverProduct.nombre.toLowerCase().trim()
        : null;
      const existingLocalProduct = localKey
        ? localProductsMap.get(localKey)
        : null;

      if (existingLocalProduct) {
        console.log(
          `📦 Producto existente: "${serverProduct.nombre}" - Manteniendo stock local: ${existingLocalProduct.stock} (Servidor: ${serverProduct.stock})`
        );

        // ✅ PRODUCTO EXISTENTE: MANTENER STOCK LOCAL, ACTUALIZAR OTROS DATOS
        return {
          ...serverProduct, // Datos actualizados del servidor
          stock: existingLocalProduct.stock, // ← MANTENER STOCK LOCAL
          stock_anterior: existingLocalProduct.stock_anterior,
          historial_stock: existingLocalProduct.historial_stock || [],
          fecha_actualizacion: new Date().toISOString(),
          // ✅ PRESERVAR METADATOS LOCALES IMPORTANTES
          id_local: existingLocalProduct.id_local,
          sincronizado: true,
          last_sync: new Date().toISOString(),
        };
      } else {
        // ✅ PRODUCTO NUEVO: USAR STOCK DEL SERVIDOR
        console.log(
          `🆕 Producto nuevo: "${serverProduct.nombre}" - Usando stock del servidor: ${serverProduct.stock}`
        );
        return {
          ...serverProduct,
          sincronizado: true,
          last_sync: new Date().toISOString(),
        };
      }
    });

    // ✅ IDENTIFICAR PRODUCTOS LOCALES QUE NO ESTÁN EN EL SERVIDOR (ELIMINADOS)
    const serverProductNames = new Set(
      serverProducts.map((p) => p.nombre?.toLowerCase().trim()).filter(Boolean)
    );

    const localOnlyProducts = localProducts.filter(
      (localProduct) =>
        !serverProductNames.has(localProduct.nombre?.toLowerCase().trim())
    );

    console.log(`📊 Resumen combinación: 
      - Servidor: ${serverProducts.length}
      - Locales preservados: ${localOnlyProducts.length}
      - Total final: ${mergedProducts.length + localOnlyProducts.length}`);

    // ✅ COMBINAR PRODUCTOS ACTUALIZADOS + PRODUCTOS LOCALES NO EN SERVIDOR
    return [...mergedProducts, ...localOnlyProducts];
  } catch (error) {
    console.error("❌ Error combinando productos:", error);
    return serverProducts; // Fallback: usar productos del servidor
  }
}

// ✅ FUNCIÓN AUXILIAR PARA ELIMINAR DUPLICADOS
const removeDuplicates = (products) => {
  if (!Array.isArray(products)) return [];

  const seen = new Set();
  const uniqueProducts = [];

  products.forEach((product) => {
    if (!product || (!product.id && !product.id_local)) return;

    // Preferir ID del servidor sobre ID local
    const identifier = product.id || product.id_local;

    if (!seen.has(identifier)) {
      seen.add(identifier);
      uniqueProducts.push(product);
    } else {
      console.warn(`⚠️ Producto duplicado eliminado: ${identifier}`);
    }
  });

  return uniqueProducts;
};
// actions/productsActions.js - AGREGAR ESTA ACCIÓN
export const emergencyLoadProducts = () => {
  return async (dispatch) => {
    try {
      console.log("🚨 Carga de emergencia de productos...");

      dispatch({ type: types.productsStartLoading });

      // ✅ INTENTAR MÚLTIPLES FUENTES
      let products = [];

      // 1. Intentar IndexedDB primero
      try {
        products = await IndexedDBService.getAll("productos");
        console.log(
          `📦 ${products.length} productos de IndexedDB (emergencia)`
        );
      } catch (error) {
        console.error("❌ IndexedDB falló:", error);
      }

      // 2. Si no hay productos, intentar API
      if (products.length === 0 && navigator.onLine) {
        try {
          const response = await fetchConToken("productos");
          if (response && response.ok) {
            // Extraer productos de cualquier estructura
            if (response.productos) products = response.productos;
            else if (response.data) products = response.data;
            console.log(`🌐 ${products.length} productos de API (emergencia)`);
          }
        } catch (apiError) {
          console.error("❌ API falló:", apiError);
        }
      }

      // 3. Si sigue vacío, crear array de ejemplo temporal
      if (products.length === 0) {
        console.warn("⚠️ No se pudieron cargar productos, usando array vacío");
        products = [];
      }

      dispatch({
        type: types.productsLoad,
        payload: products,
      });

      return { success: true, data: products };
    } catch (error) {
      console.error("❌ Error en carga de emergencia:", error);
      dispatch({
        type: types.productsLoad,
        payload: [],
      });
      return { success: false, error: error.message };
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
// ✅ FUNCIÓN AUXILIAR MEJORADA PARA ELIMINAR DUPLICADOS
// actions/productsActions.js - REEMPLAZAR LA FUNCIÓN ACTUAL
// ✅ FUNCIÓN MEJORADA PARA ELIMINAR DUPLICADOS
export const removeDuplicateProducts = (products) => {
  if (!Array.isArray(products)) return [];

  const seen = new Map();
  const uniqueProducts = [];
  let duplicatesRemoved = 0;

  // Ordenar por timestamp para mantener el más reciente
  const sortedProducts = products.sort((a, b) => {
    const timeA = new Date(
      a.last_sync || a.fecha_actualizacion || a.created_at || 0
    );
    const timeB = new Date(
      b.last_sync || b.fecha_actualizacion || b.created_at || 0
    );
    return timeB - timeA;
  });

  sortedProducts.forEach((product, index) => {
    if (!product) {
      console.warn(`⚠️ Producto nulo en índice ${index}`);
      return;
    }

    // ✅ ESTRATEGIA DE CLAVES MÚLTIPLES
    const keysToCheck = [];

    // 1. ID del servidor (máxima prioridad)
    if (product.id && product.id.toString().length < 20) {
      // IDs largos son probablemente locales
      keysToCheck.push(`server_${product.id}`);
    }

    // 2. ID local
    if (product.id_local) {
      keysToCheck.push(`local_${product.id_local}`);
    }

    // 3. Combinación nombre + categoría (último recurso)
    if (product.nombre && product.categoria_id) {
      keysToCheck.push(`combo_${product.nombre}_${product.categoria_id}`);
    }

    let isDuplicate = false;
    let duplicateKey = "";

    // Verificar contra todas las claves posibles
    for (const key of keysToCheck) {
      if (seen.has(key)) {
        isDuplicate = true;
        duplicateKey = key;
        break;
      }
    }

    if (!isDuplicate) {
      // Registrar todas las claves para este producto
      keysToCheck.forEach((key) => seen.set(key, true));
      uniqueProducts.push(product);
    } else {
      duplicatesRemoved++;
      console.warn(`🗑️ Eliminando duplicado: ${product.nombre}`, {
        clave: duplicateKey,
        id: product.id,
        id_local: product.id_local,
        motivo: "Duplicado detectado",
      });
    }
  });

  if (duplicatesRemoved > 0) {
    console.log(
      `🔄 Eliminados ${duplicatesRemoved} duplicados. Únicos: ${uniqueProducts.length}`
    );
  }

  return uniqueProducts;
};
export const cleanDuplicateProducts = () => {
  return async (dispatch) => {
    try {
      console.log("🧹 INICIANDO LIMPIEZA PROFUNDA DE DUPLICADOS...");

      const allProducts = await IndexedDBService.getAll("productos");
      console.log(
        `📊 Productos en BD antes de limpieza: ${allProducts.length}`
      );

      // ✅ DEBUG: Mostrar todos los productos con sus IDs
      console.log("🔍 LISTA COMPLETA DE PRODUCTOS (ANTES):");
      allProducts.forEach((product, index) => {
        console.log(
          `${index + 1}. ${product.nombre} - ID: ${product.id} - Local: ${
            product.id_local
          } - Temp: ${product.temp_id}`
        );
      });

      const uniqueProducts = removeDuplicateProducts(allProducts);

      console.log(
        `📊 Productos únicos después de limpieza: ${uniqueProducts.length}`
      );

      if (uniqueProducts.length < allProducts.length) {
        const duplicatesRemoved = allProducts.length - uniqueProducts.length;
        console.log(`🗑️ Eliminando ${duplicatesRemoved} duplicados...`);

        // ✅ LIMPIAR Y REINSERTAR
        await IndexedDBService.clear("productos");

        for (const product of uniqueProducts) {
          await IndexedDBService.add("productos", product);
        }

        console.log("✅ Limpieza completada exitosamente");

        // ✅ DEBUG: Verificar que se guardaron correctamente
        const verifyProducts = await IndexedDBService.getAll("productos");
        console.log(
          `✅ Verificación: ${verifyProducts.length} productos en BD después de limpieza`
        );

        // Recargar en Redux
        dispatch({
          type: types.productsLoad,
          payload: uniqueProducts,
        });

        return {
          success: true,
          removed: duplicatesRemoved,
          remaining: uniqueProducts.length,
        };
      } else {
        console.log("✅ No se encontraron duplicados según la función");

        // ✅ PERO SI HAY ERROR EN REACT, BUSCAR MANUALMENTE
        const duplicateKeys = findDuplicateKeys(allProducts);
        if (duplicateKeys.length > 0) {
          console.log(
            "⚠️ Se encontraron claves duplicadas manualmente:",
            duplicateKeys
          );
          return {
            success: false,
            error: `Se encontraron ${duplicateKeys.length} claves duplicadas manualmente`,
            duplicateKeys,
          };
        }

        return {
          success: true,
          removed: 0,
          remaining: allProducts.length,
        };
      }
    } catch (error) {
      console.error("❌ Error en limpieza de duplicados:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };
};

// ✅ FUNCIÓN AUXILIAR PARA ENCONTRAR CLAVES DUPLICADAS MANUALMENTE
const findDuplicateKeys = (products) => {
  const keyCounts = {};
  const duplicates = [];

  products.forEach((product) => {
    const key = product.id || product.id_local || product.temp_id;
    if (key) {
      keyCounts[key] = (keyCounts[key] || 0) + 1;
    }
  });

  Object.entries(keyCounts).forEach(([key, count]) => {
    if (count > 1) {
      duplicates.push({ key, count });
    }
  });

  return duplicates;
};

// actions/productsActions.js - AGREGAR ESTA ACCIÓN DE EMERGENCIA
export const emergencyCleanDuplicates = (specificKey = null) => {
  return async (dispatch) => {
    try {
      console.log("🚨 EJECUTANDO LIMPIEZA DE EMERGENCIA...");

      const allProducts = await IndexedDBService.getAll("productos");
      console.log(`📊 Productos antes: ${allProducts.length}`);

      // ✅ ENCONTRAR DUPLICADOS ESPECÍFICOS
      const keyCounts = {};
      allProducts.forEach((product) => {
        const key = product.id || product.id_local;
        if (key) {
          if (!keyCounts[key]) keyCounts[key] = [];
          keyCounts[key].push(product);
        }
      });

      // ✅ IDENTIFICAR CLAVES DUPLICADAS
      const duplicateKeys = Object.keys(keyCounts).filter(
        (key) => keyCounts[key].length > 1
      );
      console.log(
        `🔍 Claves duplicadas encontradas: ${duplicateKeys.length}`,
        duplicateKeys
      );

      if (duplicateKeys.length === 0) {
        console.log("✅ No hay claves duplicadas identificadas");
        return { success: true, removed: 0 };
      }

      // ✅ ELIMINAR DUPLICADOS - MANTENER EL MÁS RECIENTE
      const productsToKeep = [];
      let removedCount = 0;

      duplicateKeys.forEach((key) => {
        const duplicates = keyCounts[key];
        // Ordenar por fecha de actualización (más reciente primero)
        duplicates.sort((a, b) => {
          const dateA = new Date(a.fecha_actualizacion || a.created_at || 0);
          const dateB = new Date(b.fecha_actualizacion || b.created_at || 0);
          return dateB - dateA;
        });

        // Mantener el primero (más reciente) y eliminar los demás
        productsToKeep.push(duplicates[0]);
        removedCount += duplicates.length - 1;

        console.log(
          `🗑️ Eliminando ${duplicates.length - 1} duplicados de clave: ${key}`
        );
        console.log(
          `✅ Manteniendo: ${duplicates[0].nombre} (${duplicates[0].fecha_actualizacion})`
        );
      });

      // ✅ AGREGAR PRODUCTOS NO DUPLICADOS
      const nonDuplicateProducts = allProducts.filter((product) => {
        const key = product.id || product.id_local;
        return !duplicateKeys.includes(key);
      });

      const finalProducts = [...nonDuplicateProducts, ...productsToKeep];

      console.log(`📊 Productos finales: ${finalProducts.length}`);
      console.log(`🗑️ Total eliminados: ${removedCount}`);

      // ✅ GUARDAR EN BD
      await IndexedDBService.clear("productos");
      for (const product of finalProducts) {
        await IndexedDBService.add("productos", product);
      }

      // ✅ VERIFICAR
      const verifyProducts = await IndexedDBService.getAll("productos");
      console.log(`✅ Verificación final: ${verifyProducts.length} productos`);

      // ✅ ACTUALIZAR REDUX
      dispatch({
        type: types.productsLoad,
        payload: finalProducts,
      });

      return {
        success: true,
        removed: removedCount,
        remaining: finalProducts.length,
        duplicateKeys,
      };
    } catch (error) {
      console.error("❌ Error en limpieza de emergencia:", error);
      return { success: false, error: error.message };
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

// ✅ FUNCIÓN MEJORADA PARA COMBINAR PRODUCTOS MANTENIENDO STOCK Y PRECIOS LOCALES
async function mergeProductsWithLocalData(serverProducts, localProducts) {
  try {
    console.log(
      "🔄 Combinando productos del servidor con stock y precios locales..."
    );

    const localProductsMap = new Map();

    // ✅ CREAR MAPA DE PRODUCTOS LOCALES POR NOMBRE (para búsqueda rápida)
    localProducts.forEach((product) => {
      if (product.nombre) {
        const key = product.nombre.toLowerCase().trim();
        localProductsMap.set(key, product);
      }

      // ✅ TAMBIÉN POR ID POR SI ACASO
      if (product.id) {
        localProductsMap.set(`id_${product.id}`, product);
      }
      if (product.id_local) {
        localProductsMap.set(`local_${product.id_local}`, product);
      }
    });

    const mergedProducts = serverProducts.map((serverProduct) => {
      // ✅ BUSCAR SI EL PRODUCTO EXISTE LOCALMENTE POR NOMBRE
      const localKey = serverProduct.nombre
        ? serverProduct.nombre.toLowerCase().trim()
        : null;
      const existingLocalProduct = localKey
        ? localProductsMap.get(localKey)
        : null;

      if (existingLocalProduct) {
        console.log(`📦 Producto existente: "${serverProduct.nombre}"`, {
          stock: `Local: ${existingLocalProduct.stock} | Servidor: ${serverProduct.stock}`,
          precio: `Local: ${existingLocalProduct.precio} | Servidor: ${serverProduct.precio}`,
          precio_compra: `Local: ${existingLocalProduct.precio_compra} | Servidor: ${serverProduct.precio_compra}`,
        });

        // ✅ PRODUCTO EXISTENTE: MANTENER STOCK Y PRECIOS LOCALES, ACTUALIZAR OTROS DATOS
        return {
          ...serverProduct, // Datos actualizados del servidor

          // ✅ MANTENER STOCK LOCAL
          stock: existingLocalProduct.stock,
          stock_anterior: existingLocalProduct.stock_anterior,
          historial_stock: existingLocalProduct.historial_stock || [],

          // ✅ MANTENER PRECIOS LOCALES
          precio: existingLocalProduct.precio,
          precio_compra: existingLocalProduct.precio_compra,
          precio_anterior: existingLocalProduct.precio_anterior,
          historial_precios: existingLocalProduct.historial_precios || [],
          margen_ganancia: existingLocalProduct.margen_ganancia,

          // ✅ METADATOS DE ACTUALIZACIÓN
          fecha_actualizacion: new Date().toISOString(),
          ultima_actualizacion_precio:
            existingLocalProduct.ultima_actualizacion_precio ||
            new Date().toISOString(),

          // ✅ PRESERVAR METADATOS LOCALES IMPORTANTES
          id_local: existingLocalProduct.id_local,
          sincronizado: true,
          last_sync: new Date().toISOString(),
          precio_modificado_localmente:
            existingLocalProduct.precio_modificado_localmente || false,
        };
      } else {
        // ✅ PRODUCTO NUEVO: USAR STOCK Y PRECIOS DEL SERVIDOR
        console.log(
          `🆕 Producto nuevo: "${serverProduct.nombre}" - Usando stock y precios del servidor`
        );
        return {
          ...serverProduct,
          sincronizado: true,
          last_sync: new Date().toISOString(),
          precio_modificado_localmente: false,
        };
      }
    });

    // ✅ IDENTIFICAR PRODUCTOS LOCALES QUE NO ESTÁN EN EL SERVIDOR (ELIMINADOS)
    const serverProductNames = new Set(
      serverProducts.map((p) => p.nombre?.toLowerCase().trim()).filter(Boolean)
    );

    const localOnlyProducts = localProducts.filter(
      (localProduct) =>
        !serverProductNames.has(localProduct.nombre?.toLowerCase().trim())
    );

    console.log(`📊 Resumen combinación: 
      - Servidor: ${serverProducts.length}
      - Locales preservados: ${localOnlyProducts.length}
      - Total final: ${mergedProducts.length + localOnlyProducts.length}
      - Precios locales mantenidos: ${
        mergedProducts.filter((p) => p.precio_modificado_localmente).length
      }`);

    // ✅ COMBINAR PRODUCTOS ACTUALIZADOS + PRODUCTOS LOCALES NO EN SERVIDOR
    return [...mergedProducts, ...localOnlyProducts];
  } catch (error) {
    console.error("❌ Error combinando productos:", error);
    return serverProducts; // Fallback: usar productos del servidor
  }
}
// actions/productsActions.js - AGREGAR
export const reloadProductsAfterSale = () => {
  return async (dispatch) => {
    try {
      console.log("🔄 Recargando productos después de venta...");

      if (navigator.onLine) {
        // Recargar desde API
        const response = await fetchConToken("productos?limite=1000");
        if (response.ok) {
          dispatch({
            type: types.productsLoad,
            payload: response.productos,
          });
        }
      } else {
        // Recargar desde IndexedDB
        const productos = await IndexedDBService.getAll("productos");
        dispatch({
          type: types.productsLoad,
          payload: productos,
        });
      }
    } catch (error) {
      console.error("❌ Error recargando productos:", error);
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
// actions/productsActions.js - AGREGAR ESTA FUNCIÓN
export const updateProductStockInStore = (productoId, nuevoStock) => ({
  type: types.productUpdateStock,
  payload: { productoId, nuevoStock },
});

// ✅ FUNCIÓN PARA ACTUALIZAR MÚLTIPLES STOCKS
export const updateMultipleProductsStock = (stockUpdates) => ({
  type: types.productsUpdateMultipleStocks,
  payload: stockUpdates,
});

export const actualizarStock = (productoId, stockData) => {
  return async (dispatch, getState) => {
    try {
      console.log(
        `🔄 [STOCK] Iniciando actualización de stock para producto ${productoId}:`,
        stockData
      );

      const isOnline = navigator.onLine;
      const state = getState();
      const { user } = state.auth;

      // ✅ OBTENER PRODUCTO ACTUAL
      const productoExistente = await IndexedDBService.get(
        "productos",
        productoId
      );
      if (!productoExistente) {
        throw new Error("Producto no encontrado en base de datos local");
      }

      const stock_anterior = productoExistente.stock || 0;
      const stock_nuevo = parseInt(stockData.stock);

      // ✅ VALIDAR STOCK
      if (isNaN(stock_nuevo) || stock_nuevo < 0) {
        throw new Error("El stock debe ser un número válido mayor o igual a 0");
      }

      console.log(`📊 Stock cambio: ${stock_anterior} → ${stock_nuevo}`);

      // ✅ PREPARAR DATOS PARA REGISTRO DE CAMBIO
      const cambioStock = {
        stock_anterior: stock_anterior,
        stock_nuevo: stock_nuevo,
        tipo: "ajuste_manual",
        motivo: stockData.motivo || "Ajuste manual",
        usuario: user?.nombre || "Sistema",
      };

      if (isOnline) {
        // ✅ MODO ONLINE - ENVIAR AL SERVIDOR INMEDIATAMENTE
        console.log(`🌐 [STOCK ONLINE] Enviando al servidor...`);

        const requestData = {
          stock: stock_nuevo,
          ...(stockData.adminPassword && {
            adminPassword: stockData.adminPassword,
          }),
        };

        const response = await fetchConToken(
          `productos/${productoId}/stock`,
          requestData,
          "PUT"
        );

        console.log(`📥 Respuesta del servidor:`, response);

        if (response && response.ok === true) {
          // ✅ ACTUALIZAR INDEXEDDB CON DATOS DEL SERVIDOR
          const productoActualizado = response.producto ||
            response.data || {
              ...productoExistente,
              stock: stock_nuevo,
            };

          await IndexedDBService.put("productos", {
            ...productoActualizado,
            last_sync: new Date().toISOString(),
            sincronizado: true,
          });

          // ✅ ACTUALIZAR REDUX
          dispatch({
            type: types.productUpdateStock,
            payload: {
              productoId: productoId,
              stock_nuevo: stock_nuevo,
              producto: productoActualizado,
            },
          });

          console.log(
            `✅ Stock actualizado en servidor: ${productoId} -> ${stock_nuevo}`
          );

          return {
            success: true,
            data: response,
            online: true,
            message: "Stock actualizado correctamente",
          };
        } else {
          throw new Error(response?.msg || "Error del servidor");
        }
      } else {
        // ✅ MODO OFFLINE - ACTUALIZAR LOCALMENTE Y REGISTRAR PARA SYNC
        console.log(`📱 [STOCK OFFLINE] Actualizando localmente...`);

        // ✅ 1. ACTUALIZAR STOCK EN INDEXEDDB LOCALMENTE (PRODUCTOS)
        const productoActualizado = {
          ...productoExistente,
          stock: stock_nuevo,
          updated_at: new Date().toISOString(),
          sincronizado: false,
          pending_sync: true,
        };

        await IndexedDBService.put("productos", productoActualizado);
        console.log(
          `✅ Stock actualizado localmente en productos: ${productoId}`
        );

        // ✅ 2. REGISTRAR CAMBIO PARA SINCRONIZACIÓN (CAMBIOS_STOCK_PENDIENTES)
        console.log(`📝 Registrando cambio para sincronización...`);

        // ✅ IMPORTAR DINÁMICAMENTE PARA EVITAR CIRCULAR DEPENDENCIES
        const StockSyncController = await import(
          "../controllers/offline/StockSyncController/StockSyncController"
        ).then((module) => module.default);

        if (!StockSyncController) {
          console.error("❌ No se pudo cargar StockSyncController");
          throw new Error("Error cargando controlador de sincronización");
        }

        const stockSyncResult = await StockSyncController.registerStockChange(
          productoId,
          cambioStock
        );

        console.log(`📊 Resultado registro sync:`, stockSyncResult);

        if (!stockSyncResult.success) {
          console.error(
            `❌ No se pudo registrar cambio para sync:`,
            stockSyncResult.error
          );
          // No throw, porque el stock ya se actualizó localmente
        } else {
          console.log(`✅ Cambio registrado para sync: ${stockSyncResult.id}`);

          // ✅ VERIFICAR QUE REALMENTE SE GUARDÓ
          setTimeout(async () => {
            try {
              const cambios = await StockSyncController.debugGetAllChanges();
              console.log(
                `🔍 [VERIFICACIÓN] Cambios en store después de guardar: ${cambios.length}`
              );
            } catch (error) {
              console.error("❌ Error en verificación:", error);
            }
          }, 1000);
        }

        // ✅ 3. ACTUALIZAR REDUX INMEDIATAMENTE
        dispatch({
          type: types.productUpdateStock,
          payload: {
            productoId: productoId,
            stock_nuevo: stock_nuevo,
            producto: productoActualizado,
          },
        });

        console.log(
          `🎉 Stock actualizado completamente en modo offline: ${productoExistente.nombre} -> ${stock_nuevo}`
        );

        return {
          success: true,
          offline: true,
          message:
            "Stock actualizado localmente. Se sincronizará cuando recuperes la conexión.",
          syncRegistered: stockSyncResult.success,
        };
      }
    } catch (error) {
      console.error(
        `❌ [STOCK] Error actualizando stock ${productoId}:`,
        error
      );

      // Mostrar error al usuario
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudo actualizar el stock",
        confirmButtonText: "Entendido",
      });

      dispatch({
        type: types.productsError,
        payload: error.message,
      });

      return {
        success: false,
        error: error.message || "No se pudo actualizar el stock",
      };
    }
  };
};
export const loadProductsFromIndexedDB = () => {
  return async (dispatch) => {
    try {
      dispatch({ type: types.productsStartLoading });

      console.log("📦 Cargando productos desde IndexedDB...");

      const productos = await IndexedDBService.getAll("productos");

      console.log(`✅ ${productos.length} productos cargados desde IndexedDB`);

      dispatch({
        type: types.productsLoad,
        payload: productos,
      });

      return productos;
    } catch (error) {
      console.error("❌ Error cargando productos desde IndexedDB:", error);
      dispatch({
        type: types.productsError,
        payload: "Error cargando productos",
      });
      return [];
    }
  };
};
// actions/productsActions.js - CORREGIR syncProductsFromServer
// export const syncProductsFromServer = () => {
//   return async (dispatch) => {
//     try {
//       console.log("🔄 Sincronizando productos desde servidor...");

//       if (!navigator.onLine) {
//         console.log("📱 Modo offline, usando productos locales");
//         const productos = await IndexedDBService.getAll("productos");
//         dispatch({
//           type: types.productsLoad,
//           payload: productos,
//         });
//         return { success: true, source: "offline" };
//       }

//       // ✅ OBTENER PRODUCTOS ACTUALIZADOS DEL SERVIDOR
//       const response = await fetchConToken("productos?limite=1000");

//       if (response && response.ok && response.productos) {
//         console.log(
//           `📦 ${response.productos.length} productos recibidos del servidor`
//         );

//         // ✅ CORREGIDO: USAR PUT EN LUGAR DE ADD
//         for (const producto of response.productos) {
//           await IndexedDBService.put("productos", {
//             ...producto,
//             last_sync: new Date().toISOString(),
//             sincronizado: true,
//           });
//         }

//         // ✅ ACTUALIZAR REDUX STORE
//         dispatch({
//           type: types.productsLoad,
//           payload: response.productos,
//         });

//         console.log("✅ Productos sincronizados y store actualizado");
//         return {
//           success: true,
//           source: "server",
//           count: response.productos.length,
//         };
//       } else {
//         throw new Error(response?.error || "Error del servidor");
//       }
//     } catch (error) {
//       console.error("❌ Error sincronizando productos:", error);

//       // ✅ FALLBACK: Usar productos locales
//       const productos = await IndexedDBService.getAll("productos");
//       dispatch({
//         type: types.productsLoad,
//         payload: productos,
//       });

//       return { success: false, error: error.message, source: "fallback" };
//     }
//   };
// };
export const syncProductsFromServer = () => {
  return async (dispatch) => {
    try {
      console.log(
        "🔄 Sincronizando productos desde servidor (manteniendo stock y precios locales)..."
      );

      if (!navigator.onLine) {
        console.log("📱 Modo offline, usando productos locales");
        const productos = await IndexedDBService.getAll("productos");
        dispatch({
          type: types.productsLoad,
          payload: productos,
        });
        return { success: true, source: "offline" };
      }

      // ✅ OBTENER PRODUCTOS ACTUALIZADOS DEL SERVIDOR
      const response = await fetchConToken("productos?limite=1000");

      if (response && response.ok && response.productos) {
        console.log(
          `📦 ${response.productos.length} productos recibidos del servidor`
        );

        // ✅ OBTENER PRODUCTOS LOCALES ACTUALES
        const localProducts = await IndexedDBService.getAll("productos");

        // ✅ COMBINAR MANTENIENDO STOCK Y PRECIOS LOCALES
        const mergedProducts = await mergeProductsWithLocalData(
          response.productos,
          localProducts
        );

        console.log(
          `💾 Guardando ${mergedProducts.length} productos combinados en IndexedDB`
        );

        // ✅ GUARDAR PRODUCTOS COMBINADOS
        await IndexedDBService.clear("productos");
        for (const producto of mergedProducts) {
          await IndexedDBService.put("productos", {
            ...producto,
            last_sync: new Date().toISOString(),
            sincronizado: true,
          });
        }

        // ✅ ACTUALIZAR REDUX STORE
        dispatch({
          type: types.productsLoad,
          payload: mergedProducts,
        });

        console.log(
          "✅ Productos sincronizados manteniendo stock y precios locales"
        );
        return {
          success: true,
          source: "server",
          count: mergedProducts.length,
          maintainedLocalStock: true,
          maintainedLocalPrices: true,
        };
      } else {
        throw new Error(response?.error || "Error del servidor");
      }
    } catch (error) {
      console.error("❌ Error sincronizando productos:", error);

      // ✅ FALLBACK: Usar productos locales
      const productos = await IndexedDBService.getAll("productos");
      dispatch({
        type: types.productsLoad,
        payload: productos,
      });

      return { success: false, error: error.message, source: "fallback" };
    }
  };
};
// ✅ FUNCIÓN PARA MARCAR PRECIO MODIFICADO LOCALMENTE
export const markPriceAsModifiedLocally = (productId, newPrice) => {
  return async (dispatch, getState) => {
    try {
      console.log(
        `💰 Marcando precio como modificado localmente: ${productId} -> ${newPrice}`
      );

      const producto = await IndexedDBService.get("productos", productId);
      if (!producto) {
        console.warn(`⚠️ Producto no encontrado: ${productId}`);
        return false;
      }

      const productoActualizado = {
        ...producto,
        precio: newPrice,
        precio_modificado_localmente: true,
        ultima_actualizacion_precio: new Date().toISOString(),
        historial_precios: [
          ...(producto.historial_precios || []),
          {
            fecha: new Date().toISOString(),
            precio_anterior: producto.precio,
            precio_nuevo: newPrice,
            tipo: "modificacion_local",
            usuario: getState().auth.user?.nombre || "Sistema",
          },
        ],
        sincronizado: false,
      };

      await IndexedDBService.put("productos", productoActualizado);

      // ✅ ACTUALIZAR REDUX
      dispatch({
        type: types.productUpdated,
        payload: productoActualizado,
      });

      console.log(`✅ Precio marcado como modificado localmente: ${productId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error marcando precio como modificado:`, error);
      return false;
    }
  };
};

// ✅ FUNCIÓN ESPECÍFICA PARA ACTUALIZAR PRECIO CON MARCACIÓN LOCAL
// ✅ FUNCIÓN ESPECÍFICA PARA ACTUALIZAR PRECIO CON MARCACIÓN LOCAL
export const updateProductPrice = (productId, priceData) => {
  return async (dispatch, getState) => {
    try {
      console.log(`💰 Actualizando precio: ${productId}`, priceData);

      const { precio, precio_compra, motivo = "Ajuste manual" } = priceData;
      const state = getState();
      const { user } = state.auth;

      // ✅ OBTENER PRODUCTO ACTUAL
      const productoExistente = await IndexedDBService.get(
        "productos",
        productId
      );
      if (!productoExistente) {
        throw new Error("Producto no encontrado");
      }

      const precioAnterior = productoExistente.precio;
      const precioCompraAnterior = productoExistente.precio_compra;

      // ✅ PREPARAR ACTUALIZACIÓN
      const updates = {
        precio: precio !== undefined ? precio : productoExistente.precio,
        precio_compra:
          precio_compra !== undefined
            ? precio_compra
            : productoExistente.precio_compra,
        precio_modificado_localmente: true,
        ultima_actualizacion_precio: new Date().toISOString(),
        sincronizado: false,
        historial_precios: [
          ...(productoExistente.historial_precios || []),
          {
            fecha: new Date().toISOString(),
            precio_anterior: precioAnterior,
            precio_nuevo: precio,
            precio_compra_anterior: precioCompraAnterior,
            precio_compra_nuevo: precio_compra,
            tipo: "ajuste_manual",
            motivo: motivo,
            usuario: user?.nombre || "Sistema",
          },
        ],
      };

      // ✅ CALCULAR NUEVO MARGEN SI ES POSIBLE
      if (precio !== undefined && precio_compra !== undefined) {
        updates.margen_ganancia =
          precio_compra > 0
            ? (((precio - precio_compra) / precio_compra) * 100).toFixed(2)
            : 0;
      }

      const productoActualizado = { ...productoExistente, ...updates };

      if (navigator.onLine) {
        // Online: intentar actualizar en servidor también
        console.log("🌐 Enviando actualización de precio al servidor...");
        const response = await fetchConToken(
          `productos/${productId}/precio`,
          { precio, precio_compra, motivo },
          "PUT"
        );

        if (response && response.ok) {
          productoActualizado.sincronizado = true;
          productoActualizado.last_sync = new Date().toISOString();
        }
      }

      // ✅ GUARDAR EN INDEXEDDB
      await IndexedDBService.put("productos", productoActualizado);

      // ✅ ACTUALIZAR REDUX
      dispatch({
        type: types.productUpdated,
        payload: productoActualizado,
      });

      console.log(`✅ Precio actualizado y marcado como local: ${productId}`);

      return {
        success: true,
        producto: productoActualizado,
        cambios: {
          precio: { anterior: precioAnterior, nuevo: precio },
          precio_compra: {
            anterior: precioCompraAnterior,
            nuevo: precio_compra,
          },
        },
      };
    } catch (error) {
      console.error(`❌ Error actualizando precio ${productId}:`, error);
      return { success: false, error: error.message };
    }
  };
};

// ✅ LISTENER PARA ACTUALIZACIONES AUTOMÁTICAS
export const setupProductsSyncListener = () => {
  return (dispatch) => {
    const handleProductsUpdate = async (event) => {
      console.log("🔄 Evento de actualización de productos recibido");
      await dispatch(syncProductsFromServer());
    };

    const handleForceReload = async (event) => {
      console.log("🔄 Forzando recarga de productos");
      await dispatch(syncProductsFromServer());
    };

    // Escuchar eventos de sincronización
    window.addEventListener("products_updated", handleProductsUpdate);
    window.addEventListener("force_reload_products", handleForceReload);

    // Escuchar cambios de conexión
    window.addEventListener("online", () => {
      setTimeout(() => dispatch(syncProductsFromServer()), 2000);
    });

    return () => {
      window.removeEventListener("products_updated", handleProductsUpdate);
      window.removeEventListener("force_reload_products", handleForceReload);
    };
  };
};
