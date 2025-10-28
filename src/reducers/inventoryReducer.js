// reducers/inventoryReducer.js
import { types } from "../types/types";

const initialState = {
  inventory: [],
  lowStockProducts: [],
  loading: false,
  error: null,
};

export const inventoryReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.inventoryStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case types.inventoryLoad:
      return {
        ...state,
        inventory: Array.isArray(action.payload) ? action.payload : [],
        loading: false,
        error: null,
      };

    case types.inventoryFinishLoading:
      return {
        ...state,
        loading: false,
      };

    case types.inventoryUpdateStock:
      return {
        ...state,
        inventory: state.inventory.map((item) =>
          item.producto_id === action.payload.productoId
            ? { ...item, stock: action.payload.stock_nuevo }
            : item
        ),
      };

    case types.inventoryLoadLowStock:
      return {
        ...state,
        lowStockProducts: Array.isArray(action.payload) ? action.payload : [],
      };

    default:
      return state;
  }
};
