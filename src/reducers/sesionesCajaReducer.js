// reducers/sesionesCajaReducer.js
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

    default:
      return state;
  }
};
