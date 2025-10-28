// actions/inventoryActions.js
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";

export const loadInventory = () => {
  return async (dispatch) => {
    console.log("🔄 [INVENTORY] Iniciando carga de inventario...");
    dispatch({ type: types.inventoryStartLoading });

    try {
      const response = await fetchConToken("inventario");
      console.log("📦 [INVENTORY] Respuesta del backend:", response);

      let inventario = [];

      if (response && response.inventario) {
        inventario = response.inventario;
      }

      console.log(
        `✅ [INVENTORY] ${inventario.length} items de inventario cargados`
      );

      dispatch({
        type: types.inventoryLoad,
        payload: inventario,
      });

      return inventario;
    } catch (error) {
      console.error("❌ [INVENTORY] Error cargando inventario:", error);

      dispatch({
        type: types.inventoryLoad,
        payload: [],
      });

      return [];
    }
  };
};

export const updateStock = (productoId, stockData) => {
  return async (dispatch) => {
    try {
      const response = await fetchConToken(
        `inventario/stock/${productoId}`,
        stockData,
        "PUT"
      );

      if (response.message) {
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
      }
    } catch (error) {
      console.error("Error actualizando stock:", error);

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

export const loadLowStockProducts = () => {
  return async (dispatch) => {
    try {
      const response = await fetchConToken("inventario/bajo-stock");

      if (response.productos) {
        dispatch({
          type: types.inventoryLoadLowStock,
          payload: response.productos,
        });
      }

      return response.productos || [];
    } catch (error) {
      console.error("Error cargando productos bajo stock:", error);
      return [];
    }
  };
};
