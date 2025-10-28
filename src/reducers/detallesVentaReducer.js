// reducers/detallesVentaReducer.js
import { types } from "../types/types";

const initialState = {
  detalles: [],
  loading: false,
  error: null,
  activeVentaId: null,
};

export const detallesVentaReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.detallesVentaStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case types.detallesVentaFinishLoading:
      return {
        ...state,
        loading: false,
      };

    case types.detallesVentaLoad:
      return {
        ...state,
        detalles: Array.isArray(action.payload) ? action.payload : [],
        loading: false,
        error: null,
      };

    case types.detallesVentaAddNew:
      return {
        ...state,
        detalles: [...state.detalles, ...action.payload],
      };

    default:
      return state;
  }
};
