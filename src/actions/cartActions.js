// actions/cartActions.js - CON SOPORTE OFFLINE
import { types } from "../types/types";
import { useOfflineOperations } from "../hook/useOfflineOperations";

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

// ✅ NUEVA ACTION: Validar stock antes de agregar al carrito
export const validateStockBeforeAdd = (product, quantity) => {
  return async (dispatch, getState) => {
    try {
      const { getProductByIdOffline } = useOfflineOperations();

      // Verificar stock disponible
      const producto = await getProductByIdOffline(product.id);

      if (!producto) {
        return {
          success: false,
          error: "Producto no encontrado",
        };
      }

      if (producto.stock < quantity) {
        return {
          success: false,
          error: `Stock insuficiente. Solo hay ${producto.stock} unidades disponibles`,
        };
      }

      // Calcular cantidad total en carrito + nueva cantidad
      const { cart } = getState();
      const itemInCart = cart.items.find((item) => item.id === product.id);
      const totalQuantity = (itemInCart?.quantity || 0) + quantity;

      if (producto.stock < totalQuantity) {
        return {
          success: false,
          error: `No hay suficiente stock. Máximo disponible: ${producto.stock} unidades`,
        };
      }

      return {
        success: true,
        product: producto,
      };
    } catch (error) {
      console.error("❌ Error validando stock:", error);
      return {
        success: false,
        error: "Error al verificar stock del producto",
      };
    }
  };
};

// ✅ NUEVA ACTION: Validar stock completo del carrito
export const validateCartStock = () => {
  return async (dispatch, getState) => {
    try {
      const { validateStockForSale } = useOfflineOperations();
      const { cart } = getState();

      if (!cart.items || cart.items.length === 0) {
        return {
          valido: false,
          errores: ["El carrito está vacío"],
          puedeProcesar: false,
        };
      }

      const productosVenta = cart.items.map((item) => ({
        producto_id: item.id,
        cantidad: item.quantity,
        precio_unitario: item.precio_venta,
        subtotal: item.precio_venta * item.quantity,
      }));

      const resultado = await validateStockForSale(productosVenta);

      return resultado;
    } catch (error) {
      console.error("❌ Error validando stock del carrito:", error);
      return {
        valido: false,
        errores: [error.message],
        puedeProcesar: false,
      };
    }
  };
};
