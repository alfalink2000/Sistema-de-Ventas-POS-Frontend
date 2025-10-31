// reducers/productsReducer.js - CORREGIDO
import { types } from "../types/types";

const initialState = {
  products: [],
  loading: false,
  error: null,
  activeProduct: null,
};

export const productsReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.productsStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case types.productsLoad:
      return {
        ...state,
        products: Array.isArray(action.payload) ? action.payload : [],
        loading: false,
        error: null,
      };

    case types.productFinishLoading:
      return {
        ...state,
        loading: false,
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
            ? { ...product, ...action.payload } // ✅ CORREGIDO: Merge de propiedades
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

    default:
      return state;
  }
};
