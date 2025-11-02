// actions/inventoryActions.js - VERSIÓN COMPLETA CON SINCRONIZACIÓN BIDIRECCIONAL
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import InventoryOfflineController from "../controllers/offline/InventoryOfflineController/InventoryOfflineController";
import SyncController from "../controllers/offline/SyncController/SyncController";

export const loadInventory = () => {
  return async (dispatch) => {
    console.log("🔄 [INVENTORY] Iniciando carga de inventario...");
    dispatch({ type: types.inventoryStartLoading });

    try {
      // ✅ INTENTAR CARGAR DESDE BACKEND PRIMERO
      const response = await fetchConToken("inventario");

      if (!response.ok) {
        throw new Error(response.error || "Error al cargar inventario");
      }

      const inventario = response.inventario || [];

      console.log(`✅ [INVENTORY] ${inventario.length} items cargados`);

      dispatch({
        type: types.inventoryLoad,
        payload: inventario,
      });

      return inventario;
    } catch (error) {
      console.error("❌ [INVENTORY] Error cargando inventario online:", error);

      // ✅ EN MODO OFFLINE, CARGAR DESDE INDEXEDDB
      if (!navigator.onLine) {
        console.log("📴 [INVENTORY] Modo offline, cargando desde cache...");
        try {
          const cachedProducts =
            await InventoryOfflineController.getCachedInventory();
          dispatch({
            type: types.inventoryLoad,
            payload: cachedProducts,
          });
          return cachedProducts;
        } catch (cacheError) {
          console.error("❌ [INVENTORY] Error cargando cache:", cacheError);
        }
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al cargar inventario",
        confirmButtonText: "Entendido",
      });

      dispatch({
        type: types.inventoryLoad,
        payload: [],
      });

      return [];
    }
  };
};

export const updateStock = (productoId, stockData) => {
  return async (dispatch, getState) => {
    try {
      console.log(
        `🔄 [INVENTORY] Actualizando stock: ${productoId}`,
        stockData
      );

      // ✅ OBTENER DATOS ACTUALES DEL PRODUCTO
      const state = getState();
      const producto = state.inventory.inventory.find(
        (p) => (p.producto_id || p.id) === productoId
      );

      if (!producto) {
        throw new Error("Producto no encontrado");
      }

      // ✅ VERIFICAR CONEXIÓN
      if (navigator.onLine) {
        // ✅ MODO ONLINE - ACTUALIZAR DIRECTAMENTE
        const response = await fetchConToken(
          `inventario/stock/${productoId}`,
          stockData,
          "PUT"
        );

        console.log("📦 [INVENTORY] Respuesta update:", response);

        if (!response.ok) {
          throw new Error(
            response.error || "Error en la respuesta del servidor"
          );
        }

        // ✅ ACTUALIZAR EL STATE
        dispatch({
          type: types.inventoryUpdateStock,
          payload: {
            productoId,
            stock_nuevo: response.stock_nuevo,
          },
        });

        await Swal.fire({
          icon: "success",
          title: "Stock Actualizado",
          text: response.message,
          timer: 1500,
          showConfirmButton: false,
        });

        return true;
      } else {
        // ✅ MODO OFFLINE - GUARDAR COMO PENDIENTE
        const updateId = await InventoryOfflineController.addPendingStockUpdate(
          productoId,
          stockData.stock,
          producto
        );

        // ✅ ACTUALIZAR UI LOCALMENTE (optimista)
        dispatch({
          type: types.inventoryUpdateStock,
          payload: {
            productoId,
            stock_nuevo: parseInt(stockData.stock),
          },
        });

        await Swal.fire({
          icon: "info",
          title: "Stock Actualizado (Offline)",
          text: `El stock se actualizará cuando recuperes la conexión. ID: ${updateId}`,
          timer: 2000,
          showConfirmButton: false,
        });

        // ✅ NOTIFICAR AL HEADER SOBRE PENDIENTES
        window.dispatchEvent(new CustomEvent("pendingUpdatesChanged"));

        return true;
      }
    } catch (error) {
      console.error("❌ [INVENTORY] Error actualizando stock:", error);

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

// ✅ NUEVA ACTION: SINCRONIZAR STOCK PENDIENTE
export const syncPendingStock = () => {
  return async (dispatch) => {
    try {
      if (!navigator.onLine) {
        Swal.fire({
          icon: "warning",
          title: "Sin conexión",
          text: "No hay conexión a internet para sincronizar",
          confirmButtonText: "Entendido",
        });
        return false;
      }

      Swal.fire({
        title: "Sincronizando Stock",
        text: "Actualizando cambios pendientes...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const result = await SyncController.syncPendingStockUpdates();

      Swal.close();

      if (result.success > 0) {
        await Swal.fire({
          icon: "success",
          title: "Stock Sincronizado",
          text: `${result.success} actualizaciones procesadas`,
          timer: 2000,
          showConfirmButton: false,
        });

        // ✅ RECARGAR INVENTARIO PARA REFLEJAR CAMBIOS
        dispatch(loadInventory());
      } else if (result.failed > 0) {
        await Swal.fire({
          icon: "error",
          title: "Error en Sincronización",
          text: `${result.failed} actualizaciones fallaron`,
          confirmButtonText: "Entendido",
        });
      } else {
        await Swal.fire({
          icon: "info",
          title: "Sin Cambios",
          text: "No hay actualizaciones pendientes",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      return result;
    } catch (error) {
      console.error("❌ [INVENTORY] Error sincronizando stock:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al sincronizar stock",
        confirmButtonText: "Entendido",
      });
      return false;
    }
  };
};

// ✅ NUEVA ACTION: OBTENER CONTADOR DE PENDIENTES
export const getPendingStockCount = () => {
  return async () => {
    try {
      return await InventoryOfflineController.getPendingCount();
    } catch (error) {
      console.error("❌ [INVENTORY] Error obteniendo contador:", error);
      return 0;
    }
  };
};

// ✅ NUEVA ACTION: SINCRONIZAR PRODUCTOS CON INVENTARIO
export const syncProductsWithInventory = () => {
  return async () => {
    try {
      if (!navigator.onLine) {
        Swal.fire({
          icon: "warning",
          title: "Sin conexión",
          text: "No hay conexión a internet para sincronizar",
          confirmButtonText: "Entendido",
        });
        return false;
      }

      Swal.fire({
        title: "Sincronizando Productos",
        text: "Unificando datos de productos e inventario...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const response = await fetchConToken(
        "inventario/sincronizar-productos",
        {},
        "POST"
      );

      Swal.close();

      if (response.ok) {
        await Swal.fire({
          icon: "success",
          title: "Sincronización Completada",
          text:
            response.message ||
            "Productos e inventario sincronizados exitosamente",
          timer: 3000,
          showConfirmButton: false,
        });
        return true;
      } else {
        throw new Error(response.error || "Error en la sincronización");
      }
    } catch (error) {
      console.error("❌ [INVENTORY] Error sincronizando productos:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al sincronizar productos con inventario",
        confirmButtonText: "Entendido",
      });
      return false;
    }
  };
};

// ✅ NUEVA ACTION: VERIFICAR INCONSISTENCIAS
export const checkInventoryInconsistencies = () => {
  return async () => {
    try {
      const response = await fetchConToken(
        "inventario/verificar-inconsistencias"
      );

      if (response.ok) {
        return response;
      } else {
        throw new Error(response.error || "Error verificando inconsistencias");
      }
    } catch (error) {
      console.error("❌ [INVENTORY] Error verificando inconsistencias:", error);
      return { ok: false, error: error.message };
    }
  };
};
