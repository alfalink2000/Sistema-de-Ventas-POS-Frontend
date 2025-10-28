// reducers/salesReducer.js
import { types } from "../types/types";

const initialState = {
  sales: [],
  salesByDate: {},
  loading: false,
  error: null,
  activeSale: null,
};

export const salesReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.salesStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case types.salesLoad:
      return {
        ...state,
        sales: Array.isArray(action.payload) ? action.payload : [],
        loading: false,
        error: null,
      };

    case types.salesFinishLoading:
      return {
        ...state,
        loading: false,
      };

    case types.saleAddNew:
      return {
        ...state,
        sales: [action.payload, ...state.sales],
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

    default:
      return state;
  }
};
