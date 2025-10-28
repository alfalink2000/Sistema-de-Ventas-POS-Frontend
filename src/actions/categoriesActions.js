// actions/categoriesActions.js - COMPLETO Y CORREGIDO
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";

export const loadCategories = () => {
  return async (dispatch) => {
    console.log("🔄 [CATEGORIES] Iniciando carga de categorías...");
    dispatch({ type: types.categoriesStartLoading });

    try {
      const response = await fetchConToken("categorias");
      console.log("📦 [CATEGORIES] Respuesta del backend:", response);

      let categorias = [];

      if (response && response.categorias) {
        if (
          response.categorias.rows &&
          Array.isArray(response.categorias.rows)
        ) {
          categorias = response.categorias.rows;
        } else if (Array.isArray(response.categorias)) {
          categorias = response.categorias;
        }
      } else if (Array.isArray(response)) {
        categorias = response;
      }

      console.log(`✅ [CATEGORIES] ${categorias.length} categorías procesadas`);

      dispatch({
        type: types.categoriesLoad,
        payload: categorias,
      });

      return categorias;
    } catch (error) {
      console.error("❌ [CATEGORIES] Error cargando categorías:", error);

      dispatch({
        type: types.categoriesLoad,
        payload: [],
      });

      return [];
    }
  };
};

// ✅ CORREGIDO: Manejo de respuestas
export const createCategory = (categoryData) => {
  return async (dispatch) => {
    try {
      console.log("🔄 Creando categoría:", categoryData);
      const response = await fetchConToken("categorias", categoryData, "POST");

      console.log("📦 Respuesta creación categoría:", response);

      // ✅ CORREGIDO: Verificar response.ok === true
      if (response && response.ok === true) {
        dispatch(loadCategories()); // Recargar categorías

        await Swal.fire({
          icon: "success",
          title: "¡Éxito!",
          text: response.message || "Categoría creada exitosamente",
          timer: 2000,
          showConfirmButton: false,
        });

        return { success: true, data: response };
      } else {
        throw new Error(response.error || "Error al crear categoría");
      }
    } catch (error) {
      console.error("Error creando categoría:", error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al crear la categoría",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

// ✅ CORREGIDO: Manejo de respuestas
export const updateCategory = (id, categoryData) => {
  return async (dispatch) => {
    try {
      console.log("🔄 Actualizando categoría:", id, categoryData);
      const response = await fetchConToken(
        `categorias/${id}`,
        categoryData,
        "PUT"
      );

      console.log("📦 Respuesta actualización categoría:", response);

      // ✅ CORREGIDO: Verificar response.ok === true
      if (response && response.ok === true) {
        dispatch(loadCategories()); // Recargar categorías

        await Swal.fire({
          icon: "success",
          title: "¡Éxito!",
          text: response.message || "Categoría actualizada exitosamente",
          timer: 2000,
          showConfirmButton: false,
        });

        return { success: true, data: response };
      } else {
        throw new Error(response.error || "Error al actualizar categoría");
      }
    } catch (error) {
      console.error("Error actualizando categoría:", error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al actualizar la categoría",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

// ✅ CORREGIDO: Manejo de respuestas
export const deleteCategory = (id) => {
  return async (dispatch) => {
    try {
      const result = await Swal.fire({
        title: "¿Estás seguro?",
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        console.log("🗑️ Eliminando categoría:", id);
        const response = await fetchConToken(`categorias/${id}`, {}, "DELETE");

        console.log("📦 Respuesta eliminación categoría:", response);

        // ✅ CORREGIDO: Verificar response.ok === true
        if (response && response.ok === true) {
          dispatch(loadCategories()); // Recargar categorías

          await Swal.fire({
            icon: "success",
            title: "¡Eliminada!",
            text: response.message || "Categoría eliminada exitosamente",
            timer: 2000,
            showConfirmButton: false,
          });

          return { success: true, data: response };
        } else {
          throw new Error(response.error || "Error al eliminar categoría");
        }
      }

      return { success: false, cancelled: true };
    } catch (error) {
      console.error("Error eliminando categoría:", error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al eliminar la categoría",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

export const setActiveCategory = (category) => ({
  type: types.categorySetActive,
  payload: category,
});
