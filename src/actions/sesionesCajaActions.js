// actions/sesionesCajaActions.js - VERSIÓN CORREGIDA CON NUEVOS CONTROLADORES
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import IndexedDBService from "../services/IndexedDBService";
import SessionsOfflineController from "../controllers/offline/SessionsOfflineController/SessionsOfflineController";
import SyncController from "../controllers/offline//SyncController/SyncController";

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

          // ✅ **CORREGIDO**: Convertir sesiones del servidor al formato offline
          await IndexedDBService.clear("sesiones_caja_offline");

          for (const sesion of sesiones) {
            // Solo guardar sesiones ABIERTAS y convertirlas al formato offline
            if (sesion.estado === "abierta") {
              const sesionOffline = {
                ...sesion,
                id_local: `ses_${sesion.id}_${Date.now()}`, // ← CREAR id_local ÚNICO
                sincronizado: true,
                id_servidor: sesion.id,
                es_local: false,
              };

              await IndexedDBService.add(
                "sesiones_caja_offline",
                sesionOffline
              );
            }
          }
          console.log(
            `💾 ${sesiones.length} sesiones convertidas para offline`
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
        // ✅ PRIMERO: Buscar en servidor
        const response = await fetchConToken(
          `sesiones-caja/abierta?vendedor_id=${vendedorId}`
        );

        if (response && response.ok === true) {
          existe = response.existe;
          sesion = response.sesion;

          // ✅ LIMPIAR SESIONES LOCALES SI EL SERVIDOR NO TIENE SESIÓN ABIERTA
          if (!existe) {
            await limpiarSesionesLocalesAbiertas(vendedorId);
          } else if (existe && sesion && sesion.estado === "abierta") {
            // ✅ **CORREGIDO**: Crear id_local para sesión del servidor
            const sesionParaOffline = {
              ...sesion,
              id_local: `ses_${sesion.id}_${Date.now()}`, // ← CREAR id_local
              sincronizado: true,
              id_servidor: sesion.id,
              es_local: false,
            };

            await IndexedDBService.add(
              "sesiones_caja_offline",
              sesionParaOffline
            );
          }
        }
      }

      // ✅ SEGUNDO: Buscar localmente SOLO si el servidor no tiene sesión
      if (!existe) {
        // ✅ CORREGIDO: Usar SessionsOfflineController para buscar sesión abierta
        const sesionAbiertaLocal =
          await SessionsOfflineController.getOpenSessionByVendedor(vendedorId);

        if (sesionAbiertaLocal) {
          // ✅ VERIFICAR QUE NO SEA UNA SESIÓN MUY ANTIGUA (más de 24 horas)
          const fechaApertura = new Date(sesionAbiertaLocal.fecha_apertura);
          const ahora = new Date();
          const horasAbierta = (ahora - fechaApertura) / (1000 * 60 * 60);

          if (horasAbierta > 24) {
            console.warn(
              `⚠️ Sesión local muy antigua (${horasAbierta.toFixed(
                1
              )}h), forzando cierre:`,
              sesionAbiertaLocal.id_local
            );

            // ✅ CERRAR SESIÓN ANTIGUA AUTOMÁTICAMENTE
            await cerrarSesionAntigua(sesionAbiertaLocal);
            existe = false;
            sesion = null;
          } else {
            existe = true;
            sesion = sesionAbiertaLocal;
            console.log("📱 Usando sesión local activa:", sesion.id_local);
          }
        }
      }

      const payload = {
        existe: existe,
        sesion: sesion,
      };

      console.log("✅ [SESIONES] Resultado final:", {
        existe: payload.existe,
        sesionId: payload.sesion?.id || payload.sesion?.id_local,
        estado: payload.sesion?.estado,
      });

      dispatch({
        type: types.sesionesCajaLoadOpen,
        payload: payload,
      });

      return payload;
    } catch (error) {
      console.error("❌ [SESIONES] Error cargando sesión abierta:", error);

      // En caso de error, no mostrar sesiones antiguas
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

// ✅ LIMPIAR SESIONES LOCALES ABIERTAS
async function limpiarSesionesLocalesAbiertas(vendedorId) {
  try {
    const sesionesLocales = await IndexedDBService.safeGetAll(
      "sesiones_caja_offline"
    );
    const sesionesAbiertas = sesionesLocales.filter(
      (s) => s.estado === "abierta" && s.vendedor_id === vendedorId
    );

    for (const sesion of sesionesAbiertas) {
      console.log(
        `🗑️ Eliminando sesión local abierta obsoleta: ${sesion.id_local}`
      );
      await IndexedDBService.delete("sesiones_caja_offline", sesion.id_local);
    }

    if (sesionesAbiertas.length > 0) {
      console.log(
        `✅ ${sesionesAbiertas.length} sesiones locales obsoletas eliminadas`
      );
    }
  } catch (error) {
    console.error("Error limpiando sesiones locales:", error);
  }
}

// ✅ CERRAR SESIÓN ANTIGUA AUTOMÁTICAMENTE
async function cerrarSesionAntigua(sesion) {
  try {
    // ✅ CORREGIDO: Usar SessionsOfflineController para cerrar sesión
    const result = await SessionsOfflineController.closeSession(
      sesion.id_local,
      {
        saldo_final: sesion.saldo_inicial || 0,
        observaciones: "Sesión cerrada automáticamente por antigüedad",
      }
    );

    if (result.success) {
      console.log(`✅ Sesión antigua cerrada: ${sesion.id_local}`);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Error cerrando sesión antigua:", error);
  }
}

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

          // ✅ **CORREGIDO**: Crear id_local para sesiones del servidor
          const sesionParaOffline = {
            ...resultado,
            id_local: `ses_${resultado.id}_${Date.now()}`, // ← CREAR id_local
            sincronizado: true,
            id_servidor: resultado.id,
            es_local: false,
          };

          console.log("💾 Guardando sesión para offline:", sesionParaOffline);

          await IndexedDBService.add(
            "sesiones_caja_offline",
            sesionParaOffline
          );

          console.log("✅ [SESIONES] Sesión abierta exitosamente en servidor");
        } else {
          throw new Error(response.error || "Error al abrir sesión");
        }
      } else {
        // ✅ CORREGIDO: Usar SessionsOfflineController para abrir sesión offline
        const openResult = await SessionsOfflineController.openSession(
          sesionData
        );

        if (openResult.success) {
          resultado = openResult.sesion;
          console.log(
            "✅ [SESIONES] Sesión abierta localmente:",
            resultado.id_local
          );

          await Swal.fire({
            icon: "info",
            title: "Modo Offline",
            text: "Sesión abierta localmente. Se sincronizará cuando recuperes la conexión.",
            confirmButtonText: "Entendido",
          });
        } else {
          throw new Error(openResult.error);
        }
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

// En sesionesCajaActions.js - CORREGIR la acción closeSesionCaja
// En sesionesCajaActions.js - CORREGIR DEFINITIVAMENTE
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

          // Eliminar sesión cerrada del almacenamiento local
          await IndexedDBService.delete("sesiones_caja_offline", sesionId);
          console.log("🗑️ Sesión eliminada del almacenamiento local");
        } else {
          throw new Error(response.error || "Error al cerrar sesión");
        }
      } else {
        // Usar SessionsOfflineController para cerrar sesión offline
        const closeResult = await SessionsOfflineController.closeSession(
          sesionId,
          closeData
        );

        if (closeResult.success) {
          resultado = closeResult.sesion;
          console.log("✅ Sesión de caja cerrada localmente");

          await Swal.fire({
            icon: "info",
            title: "Modo Offline",
            text: "Sesión cerrada localmente. Se sincronizará cuando recuperes la conexión.",
            confirmButtonText: "Entendido",
          });
        } else {
          throw new Error(closeResult.error);
        }
      }

      // ✅ **SOLUCIÓN DEFINITIVA**: Solo UN dispatch con type que SÍ existe
      dispatch({
        type: types.sesionesCajaUpdated, // ✅ ESTE TYPE SÍ EXISTE
        payload: {
          id: sesionId,
          estado: "cerrada",
          ...closeData,
          ...resultado,
        },
      });

      // Forzar recarga de sesión abierta
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

      // ✅ Usar type que SÍ existe
      dispatch({
        type: types.sesionesCajaError, // ✅ ESTE TYPE SÍ EXISTE
        payload: error.message,
      });

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

// ✅ CORREGIDO: Sincronizar sesiones pendientes mejorada
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

      // ✅ CORREGIDO: Usar SyncController en lugar de SyncService
      const syncResult = await SyncController.fullSync();

      // ✅ RECARGAR DATOS DESPUÉS DE SINCRONIZAR
      const user = JSON.parse(localStorage.getItem("user"));
      if (user?.id) {
        await dispatch(loadOpenSesion(user.id));
        await dispatch(loadSesionesByVendedor(user.id));
      }

      Swal.close();

      if (syncResult.success) {
        await Swal.fire({
          icon: "success",
          title: "Sincronización completada",
          text: "Todas las sesiones pendientes se han sincronizado",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(syncResult.error || "Error en sincronización");
      }

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
