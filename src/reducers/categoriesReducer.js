// reducers/categoriesReducer.js - CORREGIDO
import { types } from "../types/types";

const initialState = {
  categories: [],
  loading: false,
  error: null,
  activeCategory: null,
};

export const categoriesReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.categoriesStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case types.categoriesFinishLoading:
      return {
        ...state,
        loading: false,
      };

    case types.categoriesLoad:
      return {
        ...state,
        categories: Array.isArray(action.payload) ? action.payload : [],
        loading: false,
        error: null,
      };

    case types.categoryAddNew:
      return {
        ...state,
        categories: [...state.categories, action.payload],
      };

    case types.categoryUpdated:
      return {
        ...state,
        categories: state.categories.map((category) =>
          category.id === action.payload.id ? action.payload : category
        ),
      };

    case types.categoryDeleted:
      return {
        ...state,
        categories: state.categories.filter(
          (category) => category.id !== action.payload
        ),
      };

    case types.categorySetActive:
      return {
        ...state,
        activeCategory: action.payload,
      };

    case types.categoryClearActive:
      return {
        ...state,
        activeCategory: null,
      };

    default:
      return state;
  }
};
