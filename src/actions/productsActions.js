// actions/productsActions.js - VERSIÓN CORREGIDA (SIN HOOKS DE REACT)
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import IndexedDBService from "../services/IndexedDBService";

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

export const loadProducts = (filters = {}) => {
  return async (dispatch) => {
    console.log("🔄 [PRODUCTS] Iniciando carga de productos...", {
      online: navigator.onLine,
      filters,
    });

    dispatch({ type: types.productsStartLoading });

    try {
      let productos = [];
      let fromCache = false;

      if (navigator.onLine) {
        // ✅ CON CONEXIÓN: Sincronizar y cargar desde servidor
        console.log("🌐 [PRODUCTS] Cargando desde servidor...");

        const response = await fetchConToken("productos");
        console.log("📦 [PRODUCTS] Respuesta completa del backend:", response);

        if (response && response.ok === true) {
          // 🔍 DEBUG DETALLADO
          console.log(
            "🔍 [PRODUCTS] Estructura de respuesta:",
            Object.keys(response)
          );

          // ✅ BUSCAR PRODUCTOS EN DIFERENTES ESTRUCTURAS
          if (response.productos && Array.isArray(response.productos)) {
            productos = response.productos;
            console.log("✅ [PRODUCTS] Usando response.productos");
          } else if (Array.isArray(response)) {
            productos = response;
            console.log("✅ [PRODUCTS] Usando response directo (array)");
          } else if (response.data && Array.isArray(response.data)) {
            productos = response.data;
            console.log("✅ [PRODUCTS] Usando response.data");
          } else {
            console.warn("⚠️ [PRODUCTS] Estructura de respuesta no reconocida");

            // 🔍 BUSCAR CUALQUIER ARRAY EN LA RESPUESTA
            for (const key in response) {
              if (Array.isArray(response[key])) {
                productos = response[key];
                console.log(`✅ [PRODUCTS] Usando response.${key}`);
                break;
              }
            }
          }

          console.log(
            `✅ [PRODUCTS] ${productos.length} productos cargados desde servidor`
          );

          if (productos.length === 0) {
            console.warn("⚠️ [PRODUCTS] Array de productos está vacío");
          }
        } else {
          console.error("❌ [PRODUCTS] Respuesta no exitosa:", response);
          fromCache = true;
          productos = await OfflineProductsService.getProductsOffline(filters);
        }
      } else {
        // ✅ SIN CONEXIÓN: Cargar desde cache offline
        console.log("📱 [PRODUCTS] Modo offline - cargando desde cache local");
        fromCache = true;
        productos = await OfflineProductsService.getProductsOffline(filters);
      }

      console.log(
        `🔍 [PRODUCTS] Productos finales a mostrar: ${productos.length}`
      );

      // ✅ ENRIQUECER DATOS PARA EL FRONTEND
      const productosEnriquecidos = productos.map((producto) => ({
        ...producto,
        estado_stock:
          producto.stock <= 0
            ? "agotado"
            : producto.stock <= producto.stock_minimo
            ? "bajo"
            : "normal",
        necesita_reposicion: producto.stock <= producto.stock_minimo,
        ganancia_estimada: producto.precio - producto.precio_compra,
        margen_ganancia:
          producto.precio_compra > 0
            ? (
                ((producto.precio - producto.precio_compra) /
                  producto.precio_compra) *
                100
              ).toFixed(1)
            : 0,
      }));

      console.log(
        "📊 [PRODUCTS] Enviando productos al reducer:",
        productosEnriquecidos.length
      );

      dispatch({
        type: types.productsLoad,
        payload: productosEnriquecidos,
      });

      console.log("🎉 [PRODUCTS] Carga completada exitosamente");
      return productosEnriquecidos;
    } catch (error) {
      console.error("❌ [PRODUCTS] Error cargando productos:", error);

      // ✅ FALLBACK: Intentar cargar desde cache offline
      try {
        console.log("🔄 [PRODUCTS] Intentando fallback a cache offline...");
        const productosOffline =
          await OfflineProductsService.getProductsOffline(filters);

        console.log(
          `📱 [PRODUCTS] Fallback: ${productosOffline.length} productos desde cache offline`
        );

        dispatch({
          type: types.productsLoad,
          payload: productosOffline,
        });

        return productosOffline;
      } catch (offlineError) {
        console.error(
          "❌ [PRODUCTS] Error incluso en modo offline:",
          offlineError
        );

        dispatch({
          type: types.productsLoad,
          payload: [],
        });

        return [];
      }
    } finally {
      dispatch({ type: types.productsFinishLoading });
    }
  };
};

// ✅ CREAR PRODUCTO CON SOPORTE OFFLINE
export const createProduct = (productData) => {
  return async (dispatch) => {
    try {
      console.log("🔄 [PRODUCTS] Creando producto...", productData);

      let resultado;

      if (navigator.onLine) {
        // Online: crear en servidor
        const response = await fetchConToken("productos", productData, "POST");
        console.log("📥 [PRODUCTS] Respuesta del backend:", response);

        // ✅ VERIFICAR RESPUESTA CORRECTAMENTE
        if (response && response.ok === true) {
          // Probar diferentes estructuras posibles
          if (response.producto) {
            resultado = response.producto;
            console.log(
              "✅ [PRODUCTS] Producto creado exitosamente:",
              resultado.id
            );

            // ✅ MOSTRAR SWEETALERT INMEDIATAMENTE
            await Swal.fire({
              icon: "success",
              title: "¡Éxito!",
              text: response.msg || "Producto creado exitosamente",
              timer: 3000,
              showConfirmButton: false,
              position: "top-end",
              toast: true,
            });
          } else if (response.product) {
            resultado = response.product;
            console.log(
              "✅ [PRODUCTS] Producto creado exitosamente (product):",
              resultado.id
            );

            await Swal.fire({
              icon: "success",
              title: "¡Éxito!",
              text: "Producto creado exitosamente",
              timer: 3000,
              showConfirmButton: false,
              position: "top-end",
              toast: true,
            });
          } else {
            console.warn(
              "⚠️ [PRODUCTS] Estructura de respuesta no reconocida:",
              response
            );
            throw new Error("Estructura de respuesta inesperada del servidor");
          }

          // Guardar en IndexedDB para offline
          if (resultado) {
            await IndexedDBService.add("productos", resultado);
          }
        } else {
          // ✅ MEJOR MANEJO DE ERRORES
          const errorMsg =
            response?.msg || response?.error || "Error al crear producto";
          console.error("❌ [PRODUCTS] Error del servidor:", errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        // ✅ NUEVO: Usar controller offline
        console.log(
          "📱 [PRODUCTS] Creando producto localmente con controller..."
        );

        resultado = await ProductsOfflineController.createProductPending(
          productData
        );

        if (resultado.success) {
          await Swal.fire({
            icon: "info",
            title: "Modo Offline",
            text: "Producto guardado localmente. Se sincronizará cuando recuperes la conexión.",
            confirmButtonText: "Entendido",
          });
        } else {
          throw new Error(resultado.error);
        }
      }
      // ✅ VERIFICAR QUE TENEMOS RESULTADO ANTES DE DISPATCH
      if (resultado) {
        dispatch({
          type: types.productAddNew,
          payload: resultado,
        });

        return { success: true, producto: resultado };
      } else {
        throw new Error("No se recibió datos del producto creado");
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
