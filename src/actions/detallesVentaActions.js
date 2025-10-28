// actions/detallesVentaActions.js
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";

export const loadDetallesByVenta = (ventaId) => {
  return async (dispatch) => {
    dispatch({ type: types.detallesVentaStartLoading });

    try {
      console.log(`🔄 Cargando detalles para venta: ${ventaId}`);
      const response = await fetchConToken(`detalles-venta/venta/${ventaId}`);

      if (response.ok && response.detalles) {
        console.log(`✅ ${response.detalles.length} detalles cargados`);

        dispatch({
          type: types.detallesVentaLoad,
          payload: response.detalles,
        });

        return response.detalles;
      } else {
        throw new Error(response.error || "Error al cargar detalles");
      }
    } catch (error) {
      console.error("❌ Error cargando detalles de venta:", error);

      dispatch({
        type: types.detallesVentaLoad,
        payload: [],
      });

      return [];
    } finally {
      dispatch({ type: types.detallesVentaFinishLoading });
    }
  };
};

export const createDetallesVenta = (detallesData) => {
  return async (dispatch) => {
    try {
      console.log("🔄 Creando detalles de venta...", detallesData);
      const response = await fetchConToken(
        "detalles-venta",
        detallesData,
        "POST"
      );

      if (response.ok && response.message) {
        console.log("✅ Detalles de venta creados exitosamente");

        dispatch({
          type: types.detallesVentaAddNew,
          payload: detallesData.detalles,
        });

        await Swal.fire({
          icon: "success",
          title: "Éxito",
          text: response.message,
          timer: 2000,
          showConfirmButton: false,
        });

        return true;
      } else {
        throw new Error(response.error || "Error al crear detalles");
      }
    } catch (error) {
      console.error("❌ Error creando detalles de venta:", error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al crear detalles de venta",
        confirmButtonText: "Entendido",
      });

      return false;
    }
  };
};
