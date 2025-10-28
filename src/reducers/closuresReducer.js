// reducers/closuresReducer.js - VERSIÓN ACTUALIZADA
import { types } from "../types/types";

const initialState = {
  closures: [],
  todayClosure: {
    existe: false,
    cierre: null,
    fecha: null,
    error: null,
  },
  loading: false,
  error: null,
  activeClosure: null,
  stats: {}, // ✅ NUEVO: Para estadísticas
};

export const closuresReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.closuresStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case types.closuresFinishLoading:
      return {
        ...state,
        loading: false,
      };

    case types.closuresLoad:
      return {
        ...state,
        closures: Array.isArray(action.payload) ? action.payload : [],
        loading: false,
        error: null,
      };

    case types.closureAddNew:
      // ✅ ENRIQUECER EL NUEVO CIERRE CON DATOS CALCULADOS
      const nuevoCierre = action.payload.cierre
        ? {
            ...action.payload.cierre,
            estado_diferencia:
              action.payload.cierre.diferencia === 0
                ? "exacto"
                : action.payload.cierre.diferencia > 0
                ? "sobrante"
                : "faltante",
            diferencia_absoluta: Math.abs(
              action.payload.cierre.diferencia || 0
            ),
          }
        : action.payload;

      return {
        ...state,
        closures: [nuevoCierre, ...state.closures],
      };

    case types.closureLoadToday:
      // ✅ MANTENER COMPATIBILIDAD CON TU STRUCTURA ACTUAL
      return {
        ...state,
        todayClosure: {
          existe: action.payload.existe || false,
          cierre: action.payload.cierre
            ? {
                ...action.payload.cierre,
                estado_diferencia:
                  action.payload.cierre.diferencia === 0
                    ? "exacto"
                    : action.payload.cierre.diferencia > 0
                    ? "sobrante"
                    : "faltante",
                diferencia_absoluta: Math.abs(
                  action.payload.cierre.diferencia || 0
                ),
              }
            : null,
          fecha: action.payload.fecha || null,
          error: action.payload.error || null,
        },
      };

    case types.closureSetActive:
      return {
        ...state,
        activeClosure: action.payload
          ? {
              ...action.payload,
              estado_diferencia:
                action.payload.diferencia === 0
                  ? "exacto"
                  : action.payload.diferencia > 0
                  ? "sobrante"
                  : "faltante",
              diferencia_absoluta: Math.abs(action.payload.diferencia || 0),
            }
          : null,
      };

    // ✅ NUEVO: Para manejar estadísticas (si decides implementarlo)
    case types.statsLoadDashboard:
      return {
        ...state,
        stats: action.payload.cierres || {},
      };

    default:
      return state;
  }
};
