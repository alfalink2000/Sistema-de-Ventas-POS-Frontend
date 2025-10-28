import { types } from "../types/types";

const initialState = {
  items: [],
};

export const cartReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.cartAddItem:
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );

      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }

      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };

    case types.cartRemoveItem:
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };

    case types.cartUpdateQuantity:
      return {
        ...state,
        items: state.items
          .map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: action.payload.quantity }
              : item
          )
          .filter((item) => item.quantity > 0),
      };

    case types.cartClear:
      return {
        ...state,
        items: [],
      };

    default:
      return state;
  }
};
