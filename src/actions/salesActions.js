// actions/salesActions.js - VERSIÓN COMPLETA OFFLINE FIRST
import IndexedDBService from "../services/IndexedDBService";
import { fetchConToken } from "../helpers/fetch";
import { types } from "../types/types";
import { actualizarStock } from "./productsActions";

// ✅ ACCIÓN PRINCIPAL PARA CREAR VENTAS
export const createSale = (saleData) => {
  return async (dispatch, getState) => {
    try {
      const isOnline = navigator.onLine;
      const state = getState();
      const { user } = state.auth;

      console.log(
        `🔄 [VENTA] Procesando venta - Modo: ${isOnline ? "ONLINE" : "OFFLINE"}`
      );

      // ✅ PREPARAR DATOS DE LA VENTA
      const productosVenta = saleData.productos.map((item) => ({
        producto_id: item.producto_id,
        cantidad: parseInt(item.cantidad),
        precio_unitario: parseFloat(item.precio_unitario),
        subtotal: parseFloat(item.subtotal),
        nombre: item.nombre || item.producto_nombre,
      }));

      const ventaCompleta = {
        ...saleData,
        productos: productosVenta,
        vendedor_id: user.id,
        vendedor_nombre: user.nombre,
        fecha_venta: new Date().toISOString(),
        es_offline: !isOnline,
        sincronizado: isOnline,
      };

      if (isOnline) {
        // ✅ MODO ONLINE - ENVIAR AL SERVIDOR DIRECTAMENTE
        console.log("🌐 [VENTA ONLINE] Enviando al servidor...");

        const response = await fetchConToken("ventas", ventaCompleta, "POST");

        if (response && response.ok === true) {
          // ✅ ACTUALIZAR STOCK DE PRODUCTOS VENDIDOS
          await actualizarStockVenta(productosVenta, dispatch, user, isOnline);

          // ✅ DESPACHAR CON TYPE CORRECTO
          dispatch({
            type: types.saleCreate, // ✅ USAR EL TYPE CORRECTO
            payload: response.venta || response.data,
          });

          return {
            success: true,
            venta: response.venta || response.data,
            online: true,
            message: "Venta procesada correctamente",
          };
        } else {
          throw new Error(
            response?.msg || "Error del servidor al procesar venta"
          );
        }
      } else {
        // ✅ MODO OFFLINE - GUARDAR LOCALMENTE
        console.log("📱 [VENTA OFFLINE] Guardando localmente...");

        // 1. GUARDAR VENTA EN INDEXEDDB
        const ventaOffline = {
          ...ventaCompleta,
          id: `venta_offline_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          id_local: `venta_offline_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          sincronizado: false,
          pending_sync: true,
          created_at: new Date().toISOString(),
        };

        await IndexedDBService.put("ventas_pendientes", ventaOffline);
        console.log("✅ Venta guardada localmente:", ventaOffline.id);

        // 2. ACTUALIZAR STOCK DE PRODUCTOS VENDIDOS (OFFLINE)
        await actualizarStockVenta(productosVenta, dispatch, user, isOnline);

        // 3. ACTUALIZAR REDUX CON TYPE CORRECTO
        dispatch({
          type: types.saleAddNewOffline, // ✅ USAR TYPE PARA OFFLINE
          payload: ventaOffline,
        });

        return {
          success: true,
          venta: ventaOffline,
          offline: true,
          message:
            "Venta guardada localmente. Se sincronizará cuando recuperes la conexión.",
        };
      }
    } catch (error) {
      console.error("❌ Error en createSale:", error);

      // ✅ DESPACHAR ERROR
      dispatch({
        type: types.productsError,
        payload: error.message,
      });

      return {
        success: false,
        error: error.message || "Error al procesar la venta",
      };
    }
  };
};
// ✅ FUNCIÓN AUXILIAR PARA ACTUALIZAR STOCK DE VENTA
// ✅ FUNCIÓN AUXILIAR MEJORADA
const actualizarStockVenta = async (
  productosVenta,
  dispatch,
  user,
  isOnline
) => {
  try {
    console.log("🔄 Actualizando stock de productos vendidos...");

    for (const item of productosVenta) {
      const productoId = item.producto_id;
      const cantidadVendida = item.cantidad;

      // OBTENER PRODUCTO ACTUAL
      const productoActual = await IndexedDBService.get(
        "productos",
        productoId
      );

      if (productoActual) {
        const stockAnterior = productoActual.stock || 0;
        const stockNuevo = Math.max(0, stockAnterior - cantidadVendida);

        console.log(
          `📦 Producto ${productoId}: ${stockAnterior} -> ${stockNuevo}`
        );

        if (isOnline) {
          // ✅ MODO ONLINE - ACTUALIZAR DIRECTAMENTE EN SERVIDOR
          const stockData = {
            stock: stockNuevo,
            motivo: `Venta - ${cantidadVendida} unidades`,
            usuario: user?.nombre || "Sistema",
          };

          const response = await fetchConToken(
            `productos/${productoId}/stock`,
            stockData,
            "PUT"
          );

          if (response && response.ok === true) {
            // ACTUALIZAR LOCALMENTE
            const productoActualizado = response.producto ||
              response.data || {
                ...productoActual,
                stock: stockNuevo,
              };

            await IndexedDBService.put("productos", {
              ...productoActualizado,
              last_sync: new Date().toISOString(),
              sincronizado: true,
            });

            // ACTUALIZAR REDUX
            dispatch({
              type: types.productUpdateStock,
              payload: {
                productoId: productoId,
                stock_nuevo: stockNuevo,
                producto: productoActualizado,
              },
            });
          }
        } else {
          // ✅ MODO OFFLINE - ACTUALIZAR LOCALMENTE Y REGISTRAR PARA SYNC
          const productoActualizado = {
            ...productoActual,
            stock: stockNuevo,
            updated_at: new Date().toISOString(),
            sincronizado: false,
            pending_sync: true,
          };

          await IndexedDBService.put("productos", productoActualizado);

          // REGISTRAR CAMBIO PARA SINCRONIZACIÓN
          const cambioStock = {
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            tipo: "venta",
            motivo: `Venta offline - ${cantidadVendida} unidades`,
            usuario: user?.nombre || "Sistema",
          };

          // IMPORTAR DINÁMICAMENTE
          const StockSyncController = await import(
            "../controllers/offline/StockSyncController/StockSyncController"
          ).then((module) => module.default);

          if (StockSyncController) {
            await StockSyncController.registerStockChange(
              productoId,
              cambioStock
            );
          }

          // ACTUALIZAR REDUX
          dispatch({
            type: types.productUpdateStock,
            payload: {
              productoId: productoId,
              stock_nuevo: stockNuevo,
              producto: productoActualizado,
            },
          });
        }
      } else {
        console.warn(`⚠️ Producto no encontrado: ${productoId}`);
      }
    }

    console.log("✅ Stock actualizado para todos los productos de la venta");
  } catch (error) {
    console.error("❌ Error actualizando stock de venta:", error);
    throw error;
  }
};

// ✅ CREAR VENTA OFFLINE

const createSaleOffline = async (saleData, dispatch) => {
  console.log("📱 [SALES] Guardando venta offline...");

  const ventaIdLocal = `venta_local_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  const ventaOffline = {
    ...saleData,
    id_local: ventaIdLocal, // ✅ CLAVE PRIMARIA para store offline
    id: null, // ✅ No usar en store offline
    fecha_venta: new Date().toISOString(),
    estado: "completada",
    sincronizado: false,
    es_offline: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    // ✅ USAR MÉTODO ESPECÍFICO PARA VENTAS OFFLINE
    const resultado = await IndexedDBService.putSaleOffline(ventaOffline);

    if (!resultado) {
      throw new Error("No se pudo guardar la venta en IndexedDB");
    }

    dispatch({
      type: types.offlineSaleCreated,
      payload: ventaOffline,
    });

    return {
      success: true,
      venta: ventaOffline,
      message: "Venta guardada localmente.",
    };
  } catch (error) {
    console.error("❌ Error guardando venta offline:", error);
    throw new Error(`Error al guardar venta offline: ${error.message}`);
  }
};

// ✅ ACTUALIZAR STOCK DESPUÉS DE VENTA
const updateStockAfterSale = async (productosVendidos) => {
  console.log("🔄 [STOCK] Actualizando stock después de venta...");

  for (const producto of productosVendidos) {
    const productId = producto.producto_id;
    const cantidadVendida = producto.cantidad;

    const productoActual = await IndexedDBService.get("productos", productId);

    if (!productoActual) {
      console.error(`❌ [STOCK] Producto no encontrado: ${productId}`);
      continue;
    }

    const nuevoStock = productoActual.stock - cantidadVendida;

    if (nuevoStock < 0) {
      console.warn(
        `⚠️ [STOCK] Stock negativo prevenido: ${productoActual.nombre}`
      );
      continue;
    }

    const productoActualizado = {
      ...productoActual,
      stock: nuevoStock,
      updated_at: new Date().toISOString(),
    };

    await IndexedDBService.put("productos", productoActualizado);
    console.log(
      `✅ [STOCK] Stock actualizado: ${productoActual.nombre} (${productoActual.stock} → ${nuevoStock})`
    );
  }

  console.log("✅ [STOCK] Todos los stocks actualizados exitosamente");
  return true;
};

// ✅ CARGAR PRODUCTOS DESDE INDEXEDDB
export const loadProductsFromIndexedDB = () => {
  return async (dispatch) => {
    try {
      dispatch({ type: types.productsStartLoading });

      const productos = await IndexedDBService.getAll("productos");

      dispatch({
        type: types.productsLoad,
        payload: productos || [],
      });

      console.log(
        `✅ [PRODUCTS] ${productos.length} productos cargados desde IndexedDB`
      );
    } catch (error) {
      console.error("❌ [PRODUCTS] Error cargando productos:", error);
      dispatch({
        type: types.productsLoad,
        payload: [],
      });
    } finally {
      dispatch({ type: types.productsFinishLoading });
    }
  };
};

// ✅ SINCRONIZAR VENTAS PENDIENTES
export const syncPendingSales = () => {
  return async (dispatch) => {
    try {
      console.log("🔄 [SYNC] Iniciando sincronización de ventas pendientes...");
      dispatch({ type: types.syncStart });

      const ventasPendientes = await IndexedDBService.getAll(
        "ventas_pendientes"
      );
      const ventasParaSincronizar = ventasPendientes.filter(
        (v) => !v.sincronizado
      );

      console.log(
        `📦 [SYNC] ${ventasParaSincronizar.length} ventas pendientes de sincronizar`
      );

      let exitosas = 0;
      let fallidas = 0;

      for (const venta of ventasParaSincronizar) {
        try {
          const resultado = await fetchConToken("/api/ventas", venta, "POST");

          if (resultado.ok) {
            // ✅ MARCAR COMO SINCRONIZADA
            await IndexedDBService.put("ventas_pendientes", {
              ...venta,
              sincronizado: true,
              id: resultado.venta?.id,
              updated_at: new Date().toISOString(),
            });

            exitosas++;
            dispatch({
              type: types.saleMarkSynced,
              payload: venta.id_local,
            });
          } else {
            fallidas++;
          }
        } catch (error) {
          fallidas++;
        }
      }

      console.log(
        `🎉 [SYNC] Sincronización completada: ${exitosas} exitosas, ${fallidas} fallidas`
      );

      dispatch({
        type: types.syncFinish,
        payload: { exitosas, fallidas, total: ventasParaSincronizar.length },
      });

      // ✅ RECARGAR DATOS ACTUALIZADOS
      dispatch(loadProductsFromIndexedDB());

      return { exitosas, fallidas, total: ventasParaSincronizar.length };
    } catch (error) {
      console.error("❌ [SYNC] Error en sincronización:", error);
      dispatch({
        type: types.syncError,
        payload: error.message,
      });
      return { exitosas: 0, fallidas: 0, total: 0, error: error.message };
    }
  };
};
// ✅ FUNCIÓN PARA RECARGAR PRODUCTOS DESPUÉS DE VENTA
export const reloadProductsAfterSale = () => {
  return async (dispatch) => {
    try {
      console.log("🔄 Recargando productos después de venta...");

      // Recargar productos desde IndexedDB
      const productos = await IndexedDBService.getAll("productos");

      dispatch({
        type: "productsLoad",
        payload: productos || [],
      });

      console.log(
        `✅ ${productos.length} productos recargados después de venta`
      );
    } catch (error) {
      console.error("❌ Error recargando productos:", error);
    }
  };
};
// ✅ CARGAR VENTAS PENDIENTES
export const loadPendingSales = () => {
  return async (dispatch) => {
    try {
      const ventasPendientes = await IndexedDBService.getAll(
        "ventas_pendientes"
      );
      const ventasNoSincronizadas = ventasPendientes.filter(
        (v) => !v.sincronizado
      );

      dispatch({
        type: types.salesLoadPending,
        payload: ventasNoSincronizadas,
      });

      return ventasNoSincronizadas;
    } catch (error) {
      console.error("❌ Error cargando ventas pendientes:", error);
      return [];
    }
  };
};
