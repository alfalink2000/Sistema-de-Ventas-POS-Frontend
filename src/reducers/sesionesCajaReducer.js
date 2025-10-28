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
        error: null,
      };

    case types.sesionesCajaAddNew:
      return {
        ...state,
        sesiones: [action.payload, ...state.sesiones],
        sesionAbierta: action.payload,
      };

    case types.sesionesCajaUpdate:
      return {
        ...state,
        sesiones: state.sesiones.map((sesion) =>
          sesion.id === action.payload.id
            ? { ...sesion, ...action.payload }
            : sesion
        ),
        sesionAbierta:
          state.sesionAbierta?.id === action.payload.id
            ? null
            : state.sesionAbierta,
        activeSesion:
          state.activeSesion?.id === action.payload.id
            ? { ...state.activeSesion, ...action.payload }
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
