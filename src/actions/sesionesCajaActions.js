// actions/sesionesCajaActions.js - VERSIÓN CORREGIDA
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

          // ✅ CORREGIDO: Solo guardar sesiones ABIERTAS para offline
          await IndexedDBService.clear("sesiones_caja_offline");
          const sesionesAbiertas = sesiones.filter(
            (s) => s.estado === "abierta"
          );
          for (const sesion of sesionesAbiertas) {
            await IndexedDBService.add("sesiones_caja_offline", {
              ...sesion,
              sincronizado: true,
              id_servidor: sesion.id,
            });
          }
          console.log(
            `💾 ${sesionesAbiertas.length} sesiones abiertas guardadas para offline`
          );
        } else {
          throw new Error(response.error || "Error al cargar sesiones");
        }
      } else {
        // ✅ CORREGIDO: En offline, cargar solo sesiones ABIERTAS
        const todasSesiones = await IndexedDBService.getAll(
          "sesiones_caja_offline"
        );
        sesiones = todasSesiones.filter((s) => s.estado === "abierta");
        console.log(
          `📱 ${sesiones.length} sesiones ABIERTAS cargadas desde almacenamiento local`
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
        const todasSesiones = await IndexedDBService.getAll(
          "sesiones_caja_offline"
        );
        const sesionesAbiertas = todasSesiones.filter(
          (s) => s.estado === "abierta"
        );

        dispatch({
          type: types.sesionesCajaLoad,
          payload: sesionesAbiertas,
        });
        return sesionesAbiertas;
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
        `🔄 [SESIONES] Buscando sesión ABIERTA para vendedor: ${vendedorId}`
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

          // ✅ CORREGIDO: Solo guardar si la sesión está ABIERTA
          if (existe && sesion && sesion.estado === "abierta") {
            await IndexedDBService.put("sesiones_caja_offline", {
              ...sesion,
              sincronizado: true,
              id_servidor: sesion.id,
            });
            console.log("✅ Sesión abierta guardada para offline");
          } else if (existe && sesion && sesion.estado !== "abierta") {
            console.warn(
              "⚠️ Sesión encontrada pero no está abierta:",
              sesion.estado
            );
            // Eliminar sesión cerrada del almacenamiento local
            await IndexedDBService.delete(
              "sesiones_caja_offline",
              sesion.id_local || sesion.id
            );
          }
        } else {
          console.error("❌ [SESIONES] Respuesta no OK:", response);
          throw new Error(response?.error || "Error al cargar sesión abierta");
        }
      } else {
        // ✅ CORREGIDO: En offline, buscar solo sesiones ABIERTAS
        const sesiones = await IndexedDBService.getAll("sesiones_caja_offline");
        const sesionAbierta = sesiones.find(
          (s) => s.estado === "abierta" && s.vendedor_id === vendedorId
        );

        existe = !!sesionAbierta;
        sesion = sesionAbierta;

        console.log("📱 [SESIONES] Buscando sesión ABIERTA local:", {
          encontrada: existe,
          sesionId: sesion?.id || sesion?.id_local,
          estado: sesion?.estado,
        });

        // ✅ LIMPIAR SESIONES CERRADAS accidentalmente guardadas
        const sesionesCerradas = sesiones.filter((s) => s.estado === "cerrada");
        if (sesionesCerradas.length > 0) {
          console.log(
            `🧹 Limpiando ${sesionesCerradas.length} sesiones cerradas del almacenamiento local`
          );
          for (const sesionCerrada of sesionesCerradas) {
            await IndexedDBService.delete(
              "sesiones_caja_offline",
              sesionCerrada.id_local || sesionCerrada.id
            );
          }
        }
      }

      const payload = {
        existe: existe,
        sesion: sesion,
      };

      console.log("✅ [SESIONES] Enviando al reducer:", {
        existe: payload.existe,
        sesionId: payload.sesion?.id || payload.sesion?.id_local,
        vendedor: payload.sesion?.vendedor_nombre,
        estado: payload.sesion?.estado,
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

          // ✅ CORREGIDO: Solo guardar sesiones ABIERTAS
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
        // ✅ CORREGIDO: En offline, generar ID local único
        const idLocal = `sesion_local_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        resultado = {
          ...sesionData,
          id: idLocal, // Para compatibilidad
          id_local: idLocal,
          fecha_apertura: new Date().toISOString(),
          estado: "abierta",
          sincronizado: false,
          vendedor_nombre: sesionData.vendedor_nombre || "Vendedor Offline",
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

      // ✅ CORREGIDO: Esperar y recargar la sesión abierta
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // ✅ FORZAR RECARGA DE LA SESIÓN ABIERTA
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

          // ✅ CORREGIDO: Eliminar sesión cerrada del almacenamiento local
          await IndexedDBService.delete("sesiones_caja_offline", sesionId);
          console.log("🗑️ Sesión eliminada del almacenamiento local");
        } else {
          throw new Error(response.error || "Error al cerrar sesión");
        }
      } else {
        // ✅ CORREGIDO: En offline, marcar como cerrada localmente
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

      // ✅ CORREGIDO: Actualizar estado global inmediatamente
      dispatch({
        type: types.sesionesCajaUpdate,
        payload: {
          id: sesionId,
          estado: "cerrada",
          ...closeData,
          ...resultado,
        },
      });

      // ✅ CORREGIDO: Forzar recarga de sesión abierta
      if (resultado?.vendedor_id) {
        setTimeout(() => {
          dispatch(loadOpenSesion(resultado.vendedor_id));
        }, 500);
      }

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

// ✅ NUEVA ACCIÓN: Sincronizar sesiones pendientes mejorada
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

      // ✅ USAR EL SYNC SERVICE MEJORADO
      await SyncService.forceSync();

      // ✅ RECARGAR DATOS DESPUÉS DE SINCRONIZAR
      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.id) {
        await dispatch(loadOpenSesion(user.id));
        await dispatch(loadSesionesByVendedor(user.id));
      }

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

// ✅ NUEVA ACCIÓN: Limpiar sesiones locales corruptas
export const cleanupLocalSessions = () => {
  return async (dispatch) => {
    try {
      const todasSesiones = await IndexedDBService.getAll(
        "sesiones_caja_offline"
      );
      const sesionesCerradas = todasSesiones.filter(
        (s) => s.estado === "cerrada"
      );

      if (sesionesCerradas.length > 0) {
        console.log(
          `🧹 Limpiando ${sesionesCerradas.length} sesiones cerradas del almacenamiento local`
        );

        for (const sesion of sesionesCerradas) {
          await IndexedDBService.delete(
            "sesiones_caja_offline",
            sesion.id_local || sesion.id
          );
        }

        console.log("✅ Sesiones cerradas limpiadas correctamente");
      }

      return { cleaned: sesionesCerradas.length };
    } catch (error) {
      console.error("❌ Error limpiando sesiones locales:", error);
      return { error: error.message };
    }
  };
};

export const setActiveSesion = (sesion) => ({
  type: types.sesionesCajaSetActive,
  payload: sesion,
});
