import { types } from "../types/types";

export const addToCart = (product) => ({
  type: types.cartAddItem,
  payload: product,
});

export const removeFromCart = (productId) => ({
  type: types.cartRemoveItem,
  payload: productId,
});

export const updateCartQuantity = (productId, quantity) => ({
  type: types.cartUpdateQuantity,
  payload: { id: productId, quantity },
});

export const clearCart = () => ({
  type: types.cartClear,
});
