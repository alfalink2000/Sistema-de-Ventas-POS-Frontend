// reducers/salesReducer.js - VERSIÓN CORREGIDA
import { types } from "../types/types";

const initialState = {
  sales: [],
  salesByDate: {},
  loading: false,
  error: null,
  activeSale: null,
  pendingSales: [], // ✅ PARA VENTAS OFFLINE PENDIENTES
};

export const salesReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.salesStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case types.salesFinishLoading:
      return {
        ...state,
        loading: false,
      };

    case types.salesLoad:
      return {
        ...state,
        sales: Array.isArray(action.payload) ? action.payload : [],
        loading: false,
        error: null,
      };

    case types.saleAddNew:
    case types.saleCreate: // ✅ MANEJAR AMBOS TYPES
      const newSale = action.payload;
      // EVITAR DUPLICADOS
      const exists = state.sales.find(
        (sale) => sale.id === newSale.id || sale.id_local === newSale.id_local
      );

      if (exists) {
        return {
          ...state,
          sales: state.sales.map((sale) =>
            sale.id === newSale.id || sale.id_local === newSale.id_local
              ? newSale
              : sale
          ),
        };
      }

      return {
        ...state,
        sales: [newSale, ...state.sales],
      };

    case types.saleAddNewOffline:
      const offlineSale = action.payload;
      return {
        ...state,
        pendingSales: [offlineSale, ...state.pendingSales],
        sales: [offlineSale, ...state.sales], // ✅ AGREGAR TAMBIÉN A SALES REGULARES
      };

    case types.salesLoadByDate:
      return {
        ...state,
        salesByDate: {
          ...state.salesByDate,
          [action.payload.fecha]: action.payload.ventas,
        },
      };

    case types.saleSetActive:
      return {
        ...state,
        activeSale: action.payload,
      };

    case types.saleMarkSynced:
      const syncedSale = action.payload;
      return {
        ...state,
        sales: state.sales.map((sale) =>
          sale.id_local === syncedSale.id_local
            ? { ...sale, ...syncedSale, sincronizado: true }
            : sale
        ),
        pendingSales: state.pendingSales.filter(
          (sale) => sale.id_local !== syncedSale.id_local
        ),
      };

    case types.salesLoadPending:
      return {
        ...state,
        pendingSales: Array.isArray(action.payload) ? action.payload : [],
      };

    default:
      return state;
  }
};
