// reducers/sesionesCajaReducer.js - VERSIÓN CORREGIDA
import { types } from "../types/types";

const initialState = {
  sesiones: [],
  sesionAbierta: null,
  activeSesion: null,
  loading: false,
  error: null,
};

export const sesionesCajaReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.sesionesCajaStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case types.sesionesCajaFinishLoading:
      return {
        ...state,
        loading: false,
      };

    case types.sesionesCajaLoad:
      return {
        ...state,
        sesiones: Array.isArray(action.payload) ? action.payload : [],
        loading: false,
        error: null,
      };

    case types.sesionesCajaLoadOpen:
      return {
        ...state,
        sesionAbierta: action.payload.existe ? action.payload.sesion : null,
        error: action.payload.error || null,
      };

    case types.sesionesCajaAddNew:
      const nuevaSesion = action.payload;
      const sesionesActualizadas = [nuevaSesion, ...state.sesiones];

      return {
        ...state,
        sesiones: sesionesActualizadas,
        sesionAbierta:
          nuevaSesion.estado === "abierta" ? nuevaSesion : state.sesionAbierta,
      };

    case types.sesionesCajaUpdate:
      const sesionActualizada = action.payload;
      const sesionesConUpdate = state.sesiones.map((sesion) =>
        sesion.id === sesionActualizada.id ||
        sesion.id_local === sesionActualizada.id_local
          ? { ...sesion, ...sesionActualizada }
          : sesion
      );

      return {
        ...state,
        sesiones: sesionesConUpdate,
        sesionAbierta:
          state.sesionAbierta &&
          (state.sesionAbierta.id === sesionActualizada.id ||
            state.sesionAbierta.id_local === sesionActualizada.id_local) &&
          sesionActualizada.estado === "cerrada"
            ? null
            : state.sesionAbierta,
        activeSesion:
          state.activeSesion &&
          (state.activeSesion.id === sesionActualizada.id ||
            state.activeSesion.id_local === sesionActualizada.id_local)
            ? { ...state.activeSesion, ...sesionActualizada }
            : state.activeSesion,
      };

    case types.sesionesCajaSetActive:
      return {
        ...state,
        activeSesion: action.payload,
      };

    // ✅ NUEVO CASE PARA MANEJAR CIERRE OFFLINE
    case types.sesionCajaClosedOffline:
      const sesionCerrada = action.payload;

      // Actualizar la sesión en el array de sesiones
      const sesionesActualizadasOffline = state.sesiones.map((sesion) =>
        sesion.id === sesionCerrada.id ||
        sesion.id_local === sesionCerrada.id_local
          ? {
              ...sesion,
              ...sesionCerrada,
              estado: "cerrada",
              fecha_cierre:
                sesionCerrada.fecha_cierre || new Date().toISOString(),
              saldo_final: sesionCerrada.saldo_final,
              observaciones: sesionCerrada.observaciones,
              sincronizado: false, // Marcar como no sincronizado
            }
          : sesion
      );

      return {
        ...state,
        sesiones: sesionesActualizadasOffline,
        // Limpiar sesión abierta si era esta
        sesionAbierta:
          state.sesionAbierta &&
          (state.sesionAbierta.id === sesionCerrada.id ||
            state.sesionAbierta.id_local === sesionCerrada.id_local)
            ? null
            : state.sesionAbierta,
        // Limpiar sesión activa si era esta
        activeSesion:
          state.activeSesion &&
          (state.activeSesion.id === sesionCerrada.id ||
            state.activeSesion.id_local === sesionCerrada.id_local)
            ? null
            : state.activeSesion,
      };

    // ✅ NUEVO CASE PARA AGREGAR SESIÓN OFFLINE
    case types.sesionCajaAddNewOffline:
      const nuevaSesionOffline = {
        ...action.payload,
        sincronizado: false,
        es_local: true,
      };

      return {
        ...state,
        sesiones: [nuevaSesionOffline, ...state.sesiones],
        sesionAbierta:
          nuevaSesionOffline.estado === "abierta"
            ? nuevaSesionOffline
            : state.sesionAbierta,
      };

    // ✅ NUEVO CASE PARA ACTUALIZAR DESDE OFFLINE
    case types.sesionesCajaUpdateFromOffline:
      return {
        ...state,
        sesiones: action.payload,
        // Recalcular sesión abierta
        sesionAbierta:
          action.payload.find((s) => s.estado === "abierta") || null,
      };

    default:
      return state;
  }
};
