// reducers/productsReducer.js - CORREGIDO
import { types } from "../types/types";

const initialState = {
  products: [],
  loading: false,
  error: null,
  activeProduct: null,
  searchResults: [],
  lowStockProducts: [],
  stats: null,
};

export const productsReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.productsStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case types.productsFinishLoading:
      return {
        ...state,
        loading: false,
      };

    case types.productsLoad:
      return {
        ...state,
        products: Array.isArray(action.payload) ? action.payload : [],
        loading: false,
        error: null,
      };

    case types.productAddNew:
      return {
        ...state,
        products: [...state.products, action.payload],
      };

    case types.productUpdated:
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.payload.id
            ? { ...product, ...action.payload }
            : product
        ),
      };

    case types.productDeleted:
      return {
        ...state,
        products: state.products.filter(
          (product) => product.id !== action.payload
        ),
      };

    case types.productSetActive:
      return {
        ...state,
        activeProduct: action.payload,
      };

    case types.productClearActive:
      return {
        ...state,
        activeProduct: null,
      };

    // case types.productUpdateStock:
    //   return {
    //     ...state,
    //     products: state.products.map((product) =>
    //       product.id === action.payload.productoId
    //         ? {
    //             ...product,
    //             stock: action.payload.stock_nuevo,
    //             ...action.payload.producto,
    //           }
    //         : product
    //     ),
    //   };
    case types.productUpdateStock:
      return {
        ...state,
        products: state.products.map((product) =>
          product.id === action.payload.productoId
            ? { ...product, stock: action.payload.nuevoStock }
            : product
        ),
        // ✅ ACTUALIZAR TAMBIÉN lowStockProducts
        lowStockProducts: state.lowStockProducts.map((product) =>
          product.id === action.payload.productoId
            ? { ...product, stock: action.payload.nuevoStock }
            : product
        ),
      };

    // ✅ NUEVO CASE PARA ACTUALIZAR MÚLTIPLES PRODUCTOS
    case types.productsUpdateMultipleStocks:
      const stockUpdatesMap = {};
      action.payload.forEach((update) => {
        stockUpdatesMap[update.productoId] = update.nuevoStock;
      });

      return {
        ...state,
        products: state.products.map((product) =>
          stockUpdatesMap[product.id] !== undefined
            ? { ...product, stock: stockUpdatesMap[product.id] }
            : product
        ),
        lowStockProducts: state.lowStockProducts.map((product) =>
          stockUpdatesMap[product.id] !== undefined
            ? { ...product, stock: stockUpdatesMap[product.id] }
            : product
        ),
      };

    case types.productsSearch:
      return {
        ...state,
        searchResults: Array.isArray(action.payload) ? action.payload : [],
      };

    case types.productsLoadLowStock:
      return {
        ...state,
        lowStockProducts: Array.isArray(action.payload) ? action.payload : [],
      };

    case types.productsLoadStats:
      return {
        ...state,
        stats: action.payload,
      };

    default:
      return state;
  }
};
