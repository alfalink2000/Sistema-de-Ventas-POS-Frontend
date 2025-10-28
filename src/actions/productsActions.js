// actions/productsActions.js - CORREGIDO IGUAL A TU EJEMPLO
import { types } from "../types/types";
import Swal from "sweetalert2";
import { fetchAPIConfig } from "../helpers/fetchAPIConfig";

// ✅ ACTION PARA CARGAR PRODUCTOS (igual a tu ejemplo)
export const loadProducts = (forceRefresh = false) => {
  return async (dispatch, getState) => {
    // ✅ SI YA TENEMOS PRODUCTOS Y NO ES FORZADO, NO RECARGAR
    if (!forceRefresh && getState().products.products.length > 0) {
      const lastUpdate = getState().products.lastUpdate;
      const now = Date.now();
      if (lastUpdate && now - lastUpdate < 10000) {
        console.log("🔄 Productos ya cargados recientemente, omitiendo...");
        return Promise.resolve();
      }
    }

    console.log("📦 Cargando productos...");
    dispatch(startLoading());

    try {
      const body = await fetchAPIConfig("productos");

      if (body.ok) {
        console.log(
          `✅ ${body.productos.length} productos cargados exitosamente`
        );
        dispatch(loadProductsAction(body.productos));
        return Promise.resolve();
      } else {
        console.error("❌ Error en respuesta de productos:", body.msg);
        return Promise.reject(
          new Error(body.msg || "Error cargando productos")
        );
      }
    } catch (error) {
      console.error("❌ Error de conexión en loadProducts:", error);
      return Promise.reject(error);
    } finally {
      dispatch(finishLoading());
    }
  };
};

// ✅ ACTION PARA CREAR PRODUCTO (igual a tu ejemplo)
export const createProduct = (formData) => {
  return async (dispatch) => {
    try {
      Swal.fire({
        title: "Creando producto...",
        text: "Por favor espera",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      console.log("🚀 Enviando al servidor:", {
        nombre: formData.get("nombre"),
        precio: formData.get("precio"),
        categoria_id: formData.get("categoria_id"),
      });

      const body = await fetchAPIConfig("productos", formData, "POST", true);

      Swal.close();

      console.log("📥 Respuesta del servidor:", body);

      if (body.ok) {
        dispatch(addNewProduct(body.product));

        Swal.fire({
          icon: "success",
          title: "¡Producto agregado!",
          text: "Producto registrado correctamente",
        });

        return { success: true, data: body };
      } else {
        Swal.fire("Error", body.msg, "error");
        return { success: false, error: body.msg };
      }
    } catch (error) {
      console.error("Error creando producto:", error);
      Swal.close();

      Swal.fire("Error", "Error de conexión al crear el producto", "error");
      return { success: false, error: error.message };
    }
  };
};

// ✅ ACTION PARA ACTUALIZAR PRODUCTO (igual a tu ejemplo)
export const updateProduct = (formData) => {
  return async (dispatch) => {
    try {
      console.log("🔍 VERIFICANDO formData en updateProduct:");

      if (!(formData instanceof FormData)) {
        throw new Error("formData debe ser una instancia de FormData");
      }

      // ✅ OBTENER EL ID COMO STRING (NO CONVERTIR A NÚMERO)
      const productId = formData.get("id");
      console.log(
        "🆔 ID obtenido del FormData:",
        productId,
        `(tipo: ${typeof productId})`
      );

      if (!productId) {
        throw new Error("ID del producto no encontrado en FormData");
      }

      // ✅ USAR EL ID DIRECTAMENTE COMO STRING
      console.log("✅ ID para la API:", productId);

      // ✅ CREAR UN NUEVO FORMDATA SIN EL CAMPO 'id'
      const cleanFormData = new FormData();

      console.log("🧹 Limpiando FormData...");
      for (let [key, value] of formData.entries()) {
        if (key !== "id") {
          cleanFormData.append(key, value);
          console.log(`   ✅ Manteniendo: ${key} = ${value}`);
        } else {
          console.log(`   🗑️  Eliminando: ${key} = ${value}`);
        }
      }

      Swal.fire({
        title: "Actualizando producto...",
        text: "Por favor espera",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      console.log("🚀 Enviando PUT a:", `productos/${productId}`);

      const body = await fetchAPIConfig(
        `productos/${productId}`, // ✅ Usar ID string directamente
        cleanFormData,
        "PUT",
        true
      );

      console.log("📥 Respuesta del servidor:", body);

      Swal.close();

      if (body.ok) {
        console.log("✅ Producto actualizado exitosamente");
        dispatch(updateProductAction(body.product));

        setTimeout(() => {
          dispatch(loadProducts(true));
        }, 1000);

        Swal.fire(
          "¡Actualización exitosa!",
          "Producto actualizado correctamente",
          "success"
        );

        return { success: true, data: body };
      } else {
        console.error("❌ Error del servidor:", body.msg);
        Swal.fire("Error", body.msg || "Error al actualizar producto", "error");
        return { success: false, error: body.msg };
      }
    } catch (error) {
      console.error("❌ Error actualizando producto:", error);
      Swal.close();

      Swal.fire(
        "Error",
        `Error al actualizar el producto: ${error.message}`,
        "error"
      );
      return { success: false, error: error.message };
    }
  };
};

// ✅ ACTION PARA ELIMINAR PRODUCTO (igual a tu ejemplo)
export const deleteProduct = (id) => {
  return async (dispatch, getState) => {
    try {
      const result = await Swal.fire({
        title: "¿Estás seguro?",
        text: "¡No podrás revertir esta acción!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      });

      if (!result.isConfirmed) {
        return { success: false, cancelled: true };
      }

      Swal.fire({
        title: "Eliminando producto...",
        text: "Por favor espera",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const body = await fetchAPIConfig(`productos/${id}`, {}, "DELETE");

      Swal.close();

      if (body.ok) {
        // ✅ NO ELIMINAR DEL ESTADO LOCAL - SOLO RECARGAR
        console.log("🔄 Recargando productos desde el backend...");
        await dispatch(loadProducts(true));

        Swal.fire({
          icon: "success",
          title: "¡Eliminado!",
          text: "Producto eliminado correctamente",
          timer: 2000,
          showConfirmButton: false,
        });

        return { success: true, data: body };
      } else {
        // ✅ MANEJAR ERROR - EL PRODUCTO SIGUE EN EL ESTADO
        if (body.msg && body.msg.includes("último producto")) {
          Swal.fire({
            icon: "error",
            title: "No se puede eliminar",
            text: body.msg,
            confirmButtonText: "Entendido",
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: body.msg || "Error al eliminar el producto",
            confirmButtonText: "Entendido",
          });
        }
        return { success: false, error: body.msg };
      }
    } catch (error) {
      console.error("Error eliminando producto:", error);
      Swal.close();

      Swal.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

// ✅ ACTION PARA BUSCAR PRODUCTOS
export const searchProducts = (searchTerm) => {
  return async (dispatch) => {
    dispatch({ type: types.productStartLoading });

    try {
      const body = await fetchAPIConfig(
        `productos/buscar?q=${encodeURIComponent(searchTerm)}`
      );

      if (body.ok && body.productos) {
        dispatch({
          type: types.productsLoad,
          payload: body.productos,
        });
      } else {
        dispatch({
          type: types.productsLoad,
          payload: [],
        });
      }
    } catch (error) {
      console.error("Error buscando productos:", error);
      dispatch({ type: types.productFinishLoading });
    }
  };
};

// ✅ ACTION PARA ACTUALIZAR STOCK
export const updateStock = (productId, stockData) => {
  return async (dispatch) => {
    try {
      console.log("🔄 Actualizando stock para producto:", productId);
      console.log("📤 Datos de stock:", stockData);

      const body = await fetchAPIConfig(
        `productos/${productId}/stock`,
        stockData,
        "PUT"
      );

      if (body.ok) {
        // ✅ ACTUALIZAR EL PRODUCTO COMPLETO EN EL ESTADO
        dispatch({
          type: types.productUpdated,
          payload: body.product, // Usar el producto completo devuelto por el backend
        });

        await Swal.fire({
          icon: "success",
          title: "Stock Actualizado",
          text: body.message || "Stock actualizado correctamente",
          timer: 1500,
          showConfirmButton: false,
        });

        return { success: true, data: body };
      } else {
        throw new Error(body.msg || "Error al actualizar stock");
      }
    } catch (error) {
      console.error("Error actualizando stock:", error);

      let errorMessage = "Error al actualizar stock";
      if (error.message.includes("500")) {
        errorMessage = "Error interno del servidor. Intente nuevamente.";
      } else if (error.message.includes("404")) {
        errorMessage = "Producto no encontrado.";
      } else if (error.message.includes("403")) {
        errorMessage = "No tiene permisos para realizar esta acción.";
      }

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

// ✅ ACTION PARA ACTUALIZAR STOCK RÁPIDO (desde el carrito)
export const updateStockFromCart = (productId, cantidadVendida) => {
  return async (dispatch, getState) => {
    try {
      const { products } = getState().products;
      const producto = products.find((p) => p.id === productId);

      if (!producto) {
        console.error(
          "Producto no encontrado para actualizar stock:",
          productId
        );
        return false;
      }

      const nuevoStock = producto.stock - cantidadVendida;

      if (nuevoStock < 0) {
        await Swal.fire({
          icon: "warning",
          title: "Stock Insuficiente",
          text: `No hay suficiente stock para ${producto.nombre}`,
          confirmButtonText: "Entendido",
        });
        return false;
      }

      // ✅ CORREGIR RUTA TAMBIÉN AQUÍ
      const body = await fetchAPIConfig(
        `productos/${productId}/stock`, // ✅ CORREGIDO
        { stock: nuevoStock },
        "PUT"
      );

      if (body.ok) {
        dispatch({
          type: types.productUpdated,
          payload: {
            id: productId,
            stock: nuevoStock,
            ...producto,
          },
        });

        console.log(
          `✅ Stock actualizado: ${producto.nombre} - ${cantidadVendida} unidades`
        );
        return { success: true, data: body };
      } else {
        throw new Error(body.msg || "Error al actualizar stock");
      }
    } catch (error) {
      console.error("Error actualizando stock desde carrito:", error);
      return { success: false, error: error.message };
    }
  };
};

// ✅ REFRESH PRODUCTOS SI ES NECESARIO
export const refreshProductsIfNeeded = () => {
  return async (dispatch, getState) => {
    const lastUpdate = getState().products.lastUpdate;
    const now = Date.now();

    if (!lastUpdate || now - lastUpdate > 30000) {
      dispatch(loadProducts());
    }
  };
};

// ✅ SET ACTIVE PRODUCT
export const setActiveProduct = (product) => ({
  type: types.productSetActive,
  payload: product,
});

// ✅ ACTION CREATORS SINCRÓNICOS
const startLoading = () => ({ type: types.productStartLoading });
const finishLoading = () => ({ type: types.productFinishLoading });
const loadProductsAction = (products) => ({
  type: types.productsLoad,
  payload: products,
});

const addNewProduct = (product) => ({
  type: types.productAddNew,
  payload: product,
});

const updateProductAction = (product) => ({
  type: types.productUpdated,
  payload: product,
});
