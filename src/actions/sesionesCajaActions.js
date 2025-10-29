// actions/sesionesCajaActions.js
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import IndexedDBService from "../services/IndexedDBService";
import SyncService from "../services/SyncService";

export const loadSesionesByVendedor = (vendedorId, limite = 30) => {
  return async (dispatch) => {
    dispatch({ type: types.sesionesCajaStartLoading });

    try {
      console.log(`🔄 Cargando sesiones para vendedor: ${vendedorId}`);

      let sesiones = [];

      if (navigator.onLine) {
        // Si hay conexión, cargar desde API
        const response = await fetchConToken(
          `sesiones-caja/vendedor/${vendedorId}?limite=${limite}`
        );

        if (response.ok && response.sesiones) {
          sesiones = response.sesiones;
          console.log(`✅ ${sesiones.length} sesiones cargadas desde API`);

          // Guardar en IndexedDB para offline
          await IndexedDBService.clear("sesiones_caja_offline");
          for (const sesion of sesiones) {
            await IndexedDBService.add("sesiones_caja_offline", {
              ...sesion,
              sincronizado: true,
              id_servidor: sesion.id,
            });
          }
        } else {
          throw new Error(response.error || "Error al cargar sesiones");
        }
      } else {
        // Si no hay conexión, cargar desde IndexedDB
        sesiones = await IndexedDBService.getAll("sesiones_caja_offline");
        console.log(
          `📱 ${sesiones.length} sesiones cargadas desde almacenamiento local`
        );
      }

      dispatch({
        type: types.sesionesCajaLoad,
        payload: sesiones,
      });

      return sesiones;
    } catch (error) {
      console.error("❌ Error cargando sesiones de caja:", error);

      // En caso de error, intentar cargar desde local
      try {
        const sesionesLocal = await IndexedDBService.getAll(
          "sesiones_caja_offline"
        );
        dispatch({
          type: types.sesionesCajaLoad,
          payload: sesionesLocal,
        });
        return sesionesLocal;
      } catch (localError) {
        dispatch({
          type: types.sesionesCajaLoad,
          payload: [],
        });
        return [];
      }
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

      let existe = false;
      let sesion = null;

      if (navigator.onLine) {
        // Si hay conexión, buscar en API
        const response = await fetchConToken(
          `sesiones-caja/abierta?vendedor_id=${vendedorId}`
        );

        console.log("📦 [SESIONES] Respuesta del backend:", {
          ok: response.ok,
          existe: response.existe,
          sesion: response.sesion ? "PRESENTE" : "AUSENTE",
        });

        if (response && response.ok === true) {
          existe = response.existe;
          sesion = response.sesion;

          // Si hay sesión abierta, guardar en IndexedDB
          if (existe && sesion) {
            await IndexedDBService.put("sesiones_caja_offline", {
              ...sesion,
              sincronizado: true,
              id_servidor: sesion.id,
            });
          }
        } else {
          console.error("❌ [SESIONES] Respuesta no OK:", response);
          throw new Error(response?.error || "Error al cargar sesión abierta");
        }
      } else {
        // Si no hay conexión, buscar en IndexedDB
        const sesiones = await IndexedDBService.getAll("sesiones_caja_offline");
        const sesionAbierta = sesiones.find(
          (s) => s.estado === "abierta" && s.vendedor_id === vendedorId
        );

        existe = !!sesionAbierta;
        sesion = sesionAbierta;

        console.log("📱 [SESIONES] Buscando sesión local:", {
          encontrada: existe,
          sesionId: sesion?.id || sesion?.id_local,
        });
      }

      const payload = {
        existe: existe,
        sesion: sesion,
      };

      console.log("✅ [SESIONES] Enviando al reducer:", {
        existe: payload.existe,
        sesionId: payload.sesion?.id || payload.sesion?.id_local,
        vendedor: payload.sesion?.vendedor_nombre,
      });

      dispatch({
        type: types.sesionesCajaLoadOpen,
        payload: payload,
      });

      return payload;
    } catch (error) {
      console.error("❌ [SESIONES] Error cargando sesión abierta:", error);

      // En caso de error, intentar cargar desde local
      try {
        const sesiones = await IndexedDBService.getAll("sesiones_caja_offline");
        const sesionAbierta = sesiones.find((s) => s.estado === "abierta");

        const errorPayload = {
          existe: !!sesionAbierta,
          sesion: sesionAbierta,
          error: error.message,
        };

        dispatch({
          type: types.sesionesCajaLoadOpen,
          payload: errorPayload,
        });

        return errorPayload;
      } catch (localError) {
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
    }
  };
};

export const openSesionCaja = (sesionData) => {
  return async (dispatch) => {
    try {
      console.log("🔄 [SESIONES] Abriendo sesión de caja...", sesionData);

      let resultado;
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Si hay conexión, abrir en servidor
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
          resultado = response.sesion;

          // Guardar en IndexedDB
          await IndexedDBService.add("sesiones_caja_offline", {
            ...resultado,
            sincronizado: true,
            id_servidor: resultado.id,
          });

          console.log("✅ [SESIONES] Sesión abierta exitosamente en servidor");
        } else {
          throw new Error(response.error || "Error al abrir sesión");
        }
      } else {
        // Si no hay conexión, guardar localmente
        const idLocal = Date.now();
        resultado = {
          ...sesionData,
          id: idLocal,
          id_local: idLocal,
          fecha_apertura: new Date().toISOString(),
          estado: "abierta",
          sincronizado: false,
        };

        await IndexedDBService.add("sesiones_caja_offline", resultado);

        console.log("✅ [SESIONES] Sesión abierta localmente:", idLocal);

        await Swal.fire({
          icon: "info",
          title: "Modo Offline",
          text: "Sesión abierta localmente. Se sincronizará cuando recuperes la conexión.",
          confirmButtonText: "Entendido",
        });
      }

      // ✅ ESPERAR UN MOMENTO Y LUEGO RECARGAR
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // ✅ RECARGAR LA SESIÓN ABIERTA
      const reloadResult = await dispatch(
        loadOpenSesion(sesionData.vendedor_id)
      );

      console.log("🔄 [SESIONES] Estado después de recargar:", reloadResult);

      if (reloadResult.existe) {
        const sesionId =
          reloadResult.sesion?.id || reloadResult.sesion?.id_local;
        await Swal.fire({
          icon: "success",
          title: "Sesión Abierta",
          text: `Sesión #${sesionId} abierta correctamente${
            !isOnline ? " (Local)" : ""
          }`,
          timer: 2000,
          showConfirmButton: false,
        });
      }

      return true;
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

      const isOnline = navigator.onLine;
      let resultado;

      if (isOnline) {
        // Si hay conexión, cerrar en servidor
        const response = await fetchConToken(
          `sesiones-caja/cerrar/${sesionId}`,
          closeData,
          "PUT"
        );

        if (response.ok && response.message) {
          resultado = response.sesion;
          console.log("✅ Sesión de caja cerrada exitosamente en servidor");

          // Actualizar en IndexedDB
          const sesiones = await IndexedDBService.getAll(
            "sesiones_caja_offline"
          );
          const sesionLocal = sesiones.find(
            (s) => s.id === sesionId || s.id_servidor === sesionId
          );

          if (sesionLocal) {
            await IndexedDBService.put("sesiones_caja_offline", {
              ...sesionLocal,
              ...resultado,
              sincronizado: true,
            });
          }
        } else {
          throw new Error(response.error || "Error al cerrar sesión");
        }
      } else {
        // Si no hay conexión, cerrar localmente
        const sesiones = await IndexedDBService.getAll("sesiones_caja_offline");
        const sesionLocal = sesiones.find(
          (s) => s.id === sesionId || s.id_local === sesionId
        );

        if (sesionLocal) {
          resultado = {
            ...sesionLocal,
            estado: "cerrada",
            fecha_cierre: new Date().toISOString(),
            saldo_final: closeData.saldo_final,
            observaciones: closeData.observaciones,
            sincronizado: false,
          };

          await IndexedDBService.put("sesiones_caja_offline", resultado);

          console.log("✅ Sesión de caja cerrada localmente");

          await Swal.fire({
            icon: "info",
            title: "Modo Offline",
            text: "Sesión cerrada localmente. Se sincronizará cuando recuperes la conexión.",
            confirmButtonText: "Entendido",
          });
        } else {
          throw new Error("Sesión no encontrada localmente");
        }
      }

      dispatch({
        type: types.sesionesCajaUpdate,
        payload: {
          id: sesionId,
          estado: "cerrada",
          ...closeData,
          ...resultado,
        },
      });

      if (isOnline) {
        await Swal.fire({
          icon: "success",
          title: "Sesión Cerrada",
          text: "Sesión cerrada exitosamente",
          timer: 2000,
          showConfirmButton: false,
        });
      }

      return true;
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

// ✅ NUEVA ACCIÓN: Sincronizar sesiones pendientes manualmente
export const syncPendingSessions = () => {
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
        text: "Sincronizando sesiones pendientes con el servidor",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await SyncService.forceSync();

      Swal.close();

      await Swal.fire({
        icon: "success",
        title: "Sincronización completada",
        text: "Todas las sesiones pendientes se han sincronizado",
        timer: 2000,
        showConfirmButton: false,
      });

      return true;
    } catch (error) {
      console.error("❌ Error sincronizando sesiones:", error);

      Swal.close();

      await Swal.fire({
        icon: "error",
        title: "Error de sincronización",
        text: "No se pudieron sincronizar las sesiones pendientes",
        confirmButtonText: "Entendido",
      });

      return false;
    }
  };
};
