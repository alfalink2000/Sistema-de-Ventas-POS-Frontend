// actions/sesionesCajaActions.js
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";

export const loadSesionesByVendedor = (vendedorId, limite = 30) => {
  return async (dispatch) => {
    dispatch({ type: types.sesionesCajaStartLoading });

    try {
      console.log(`🔄 Cargando sesiones para vendedor: ${vendedorId}`);
      const response = await fetchConToken(
        `sesiones-caja/vendedor/${vendedorId}?limite=${limite}`
      );

      if (response.ok && response.sesiones) {
        console.log(`✅ ${response.sesiones.length} sesiones cargadas`);

        dispatch({
          type: types.sesionesCajaLoad,
          payload: response.sesiones,
        });

        return response.sesiones;
      } else {
        throw new Error(response.error || "Error al cargar sesiones");
      }
    } catch (error) {
      console.error("❌ Error cargando sesiones de caja:", error);

      dispatch({
        type: types.sesionesCajaLoad,
        payload: [],
      });

      return [];
    } finally {
      dispatch({ type: types.sesionesCajaFinishLoading });
    }
  };
};

export const loadOpenSesion = (vendedorId) => {
  return async (dispatch) => {
    try {
      console.log(
        `🔄 [SESIONES] Buscando sesión abierta para vendedor: ${vendedorId}`
      );

      const response = await fetchConToken(
        `sesiones-caja/abierta?vendedor_id=${vendedorId}`
      );

      console.log("📦 [SESIONES] Respuesta del backend:", {
        ok: response.ok,
        existe: response.existe,
        sesion: response.sesion ? "PRESENTE" : "AUSENTE",
      });

      if (response && response.ok === true) {
        const payload = {
          existe: response.existe,
          sesion: response.sesion,
        };

        console.log("✅ [SESIONES] Enviando al reducer:", {
          existe: payload.existe,
          sesionId: payload.sesion?.id,
          vendedor: payload.sesion?.vendedor_nombre,
        });

        dispatch({
          type: types.sesionesCajaLoadOpen,
          payload: payload,
        });

        return payload;
      } else {
        console.error("❌ [SESIONES] Respuesta no OK:", response);
        throw new Error(response?.error || "Error al cargar sesión abierta");
      }
    } catch (error) {
      console.error("❌ [SESIONES] Error cargando sesión abierta:", error);

      const errorPayload = {
        existe: false,
        sesion: null,
        error: error.message,
      };

      dispatch({
        type: types.sesionesCajaLoadOpen,
        payload: errorPayload,
      });

      return errorPayload;
    }
  };
};

export const openSesionCaja = (sesionData) => {
  return async (dispatch) => {
    try {
      console.log("🔄 [SESIONES] Abriendo sesión de caja...", sesionData);

      const response = await fetchConToken(
        "sesiones-caja/abrir",
        sesionData,
        "POST"
      );

      console.log("📦 [SESIONES] Respuesta al abrir:", {
        ok: response.ok,
        message: response.message,
        sesion: response.sesion ? "PRESENTE" : "AUSENTE",
      });

      if (response.ok && response.message) {
        console.log("✅ [SESIONES] Sesión abierta exitosamente");

        // ✅ ESPERAR UN MOMENTO Y LUEGO RECARGAR
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // ✅ RECARGAR LA SESIÓN ABIERTA
        const resultado = await dispatch(
          loadOpenSesion(sesionData.vendedor_id)
        );

        console.log("🔄 [SESIONES] Estado después de recargar:", resultado);

        if (resultado.existe) {
          await Swal.fire({
            icon: "success",
            title: "Sesión Abierta",
            text: `Sesión #${resultado.sesion.id} abierta correctamente`,
            timer: 2000,
            showConfirmButton: false,
          });
        }

        return true;
      } else {
        throw new Error(response.error || "Error al abrir sesión");
      }
    } catch (error) {
      console.error("❌ [SESIONES] Error abriendo sesión:", error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al abrir sesión de caja",
        confirmButtonText: "Entendido",
      });

      return false;
    }
  };
};

export const closeSesionCaja = (sesionId, closeData) => {
  return async (dispatch) => {
    try {
      console.log(`🔄 Cerrando sesión: ${sesionId}`, closeData);
      const response = await fetchConToken(
        `sesiones-caja/cerrar/${sesionId}`,
        closeData,
        "PUT"
      );

      if (response.ok && response.message) {
        console.log("✅ Sesión de caja cerrada exitosamente");

        dispatch({
          type: types.sesionesCajaUpdate,
          payload: { id: sesionId, estado: "cerrada", ...closeData },
        });

        await Swal.fire({
          icon: "success",
          title: "Sesión Cerrada",
          text: response.message,
          timer: 2000,
          showConfirmButton: false,
        });

        return true;
      } else {
        throw new Error(response.error || "Error al cerrar sesión");
      }
    } catch (error) {
      console.error("❌ Error cerrando sesión de caja:", error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al cerrar sesión de caja",
        confirmButtonText: "Entendido",
      });

      return false;
    }
  };
};

export const setActiveSesion = (sesion) => ({
  type: types.sesionesCajaSetActive,
  payload: sesion,
});
