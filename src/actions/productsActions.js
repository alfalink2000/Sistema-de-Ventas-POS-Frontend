// actions/productsActions.js - CON SOPORTE OFFLINE COMPLETO
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import { useOfflineOperations } from "../hooks/useOfflineOperations";

export const loadProducts = (filters = {}) => {
  return async (dispatch) => {
    console.log("🔄 [PRODUCTS] Iniciando carga de productos...", {
      online: navigator.onLine,
      filters,
    });

    dispatch({ type: types.productsStartLoading });

    try {
      const { getProductsOffline, syncProductsOffline, isCacheUpdated } =
        useOfflineOperations();

      let productos = [];
      let fromCache = false;

      if (navigator.onLine) {
        // ✅ CON CONEXIÓN: Sincronizar y cargar desde servidor
        console.log("🌐 [PRODUCTS] Cargando desde servidor...");

        const response = await fetchConToken("productos");
        console.log("📦 [PRODUCTS] Respuesta del backend:", response);

        if (response && response.ok === true) {
          // Determinar estructura de respuesta
          if (response.productos && Array.isArray(response.productos)) {
            productos = response.productos;
          } else if (Array.isArray(response)) {
            productos = response;
          } else if (response.rows && Array.isArray(response.rows)) {
            productos = response.rows;
          }

          console.log(
            `✅ [PRODUCTS] ${productos.length} productos cargados desde servidor`
          );

          // ✅ SINCRONIZAR CON OFFLINE
          const syncResult = await syncProductsOffline();
          if (syncResult.success) {
            console.log(
              `💾 [PRODUCTS] ${syncResult.count} productos sincronizados offline`
            );
          }
        } else {
          console.warn(
            "⚠️ [PRODUCTS] Respuesta no exitosa desde API, usando cache offline"
          );
          fromCache = true;
          productos = await getProductsOffline(filters);
        }
      } else {
        // ✅ SIN CONEXIÓN: Cargar desde cache offline
        console.log("📱 [PRODUCTS] Modo offline - cargando desde cache local");
        fromCache = true;
        productos = await getProductsOffline(filters);
      }

      // ✅ APLICAR FILTROS ADICIONALES SI ES NECESARIO
      if (filters.categoria_id && !fromCache) {
        productos = productos.filter(
          (p) => p.categoria_id === filters.categoria_id
        );
      }

      if (filters.activo !== undefined && !fromCache) {
        productos = productos.filter((p) => p.activo === filters.activo);
      }

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
        ganancia_estimada: producto.precio_venta - producto.precio_compra,
        margen_ganancia:
          producto.precio_compra > 0
            ? (
                ((producto.precio_venta - producto.precio_compra) /
                  producto.precio_compra) *
                100
              ).toFixed(1)
            : 0,
      }));

      console.log(
        `✅ [PRODUCTS] ${productosEnriquecidos.length} productos procesados (${
          fromCache ? "CACHE" : "SERVER"
        })`
      );

      dispatch({
        type: types.productsLoad,
        payload: productosEnriquecidos,
      });

      return productosEnriquecidos;
    } catch (error) {
      console.error("❌ [PRODUCTS] Error cargando productos:", error);

      // ✅ FALLBACK: Intentar cargar desde cache offline
      try {
        const { getProductsOffline } = useOfflineOperations();
        const productosOffline = await getProductsOffline(filters);

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

// ✅ BUSCAR PRODUCTOS CON SOPORTE OFFLINE
export const searchProducts = (searchTerm, categoriaId = null) => {
  return async (dispatch) => {
    try {
      console.log(`🔍 [PRODUCTS] Buscando: "${searchTerm}"`, {
        categoriaId,
        online: navigator.onLine,
      });

      const { searchProductsOffline } = useOfflineOperations();

      let resultados = await searchProductsOffline(searchTerm, categoriaId);

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

      const { getProductByIdOffline } = useOfflineOperations();

      const producto = await getProductByIdOffline(productId);

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

      const { updateStockOffline } = useOfflineOperations();

      const resultado = await updateStockOffline(
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

      const { reduceStockOffline } = useOfflineOperations();

      const resultado = await reduceStockOffline(productoId, cantidad, ventaId);

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

      const { getLowStockProductsOffline } = useOfflineOperations();

      const productosBajoStock = await getLowStockProductsOffline(limite);

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

      const { syncProductsOffline } = useOfflineOperations();
      const resultado = await syncProductsOffline();

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
      const { getProductsOffline } = useOfflineOperations();

      const productos = await getProductsOffline();

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
