// actions/categoriesActions.js - COMPLETO Y CORREGIDO
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import CategoriesOfflineController from "../controllers/offline/CategoriesOfflineController/CategoriesOfflineController";

export const loadCategoriesIfNeeded = (forceRefresh = false) => {
  return async (dispatch, getState) => {
    const state = getState();

    // ✅ CORREGIDO: Usar state.categories.categories en lugar de state.categories.data
    const shouldSkip =
      !forceRefresh &&
      state.categories.categories && // ✅ Cambiado de .data a .categories
      state.categories.categories.length > 0 &&
      !state.categories.loading &&
      state.categories.timestamp &&
      Date.now() - state.categories.timestamp < 5 * 60 * 1000;

    if (shouldSkip) {
      console.log("✅ Categorías recientes en estado, omitiendo carga");
      return {
        success: true,
        fromCache: true,
        data: state.categories.categories, // ✅ Cambiado aquí también
      };
    }

    return dispatch(loadCategories(forceRefresh));
  };
};

export const loadCategories = () => {
  return async (dispatch) => {
    console.log("🔄 [CATEGORIES] Iniciando carga de categorías...");

    // ✅ MODO OFFLINE
    if (!navigator.onLine) {
      console.log("📱 [CATEGORIES] Modo offline - cargando desde cache local");
      try {
        const categories = await CategoriesOfflineController.getCategories();

        console.log(
          `✅ [CATEGORIES] ${categories.length} categorías cargadas desde cache`
        );

        dispatch({
          type: types.categoriesLoad,
          payload: categories,
        });

        return;
      } catch (error) {
        console.error(
          "❌ [CATEGORIES] Error cargando categorías offline:",
          error
        );

        dispatch({
          type: types.categoriesLoad,
          payload: [],
        });

        return;
      }
    }

    // ✅ MODO ONLINE
    try {
      console.log("🌐 [CATEGORIES] Modo online - cargando desde servidor");

      const response = await fetchConToken("categorias");

      console.log("📥 [CATEGORIES] Respuesta del servidor:", response);

      // ✅ CORRECCIÓN: fetchConToken ya parsea la respuesta, no usar response.json()
      if (response.ok === true) {
        const categories = response.categorias || [];

        console.log(
          `✅ [CATEGORIES] ${categories.length} categorías cargadas desde servidor`
        );

        // Guardar en IndexedDB para uso offline
        try {
          await CategoriesOfflineController.saveCategories(categories);
          console.log("💾 [CATEGORIES] Categorías guardadas en cache local");
        } catch (saveError) {
          console.error("❌ [CATEGORIES] Error guardando en cache:", saveError);
        }

        dispatch({
          type: types.categoriesLoad,
          payload: categories,
        });
      } else {
        throw new Error(response.msg || "Error al cargar categorías");
      }
    } catch (error) {
      console.error("❌ [CATEGORIES] Error cargando categorías:", error);

      // ✅ FALLBACK: Intentar cargar desde cache local
      try {
        console.log(
          "🔄 [CATEGORIES] Intentando cargar desde cache como fallback..."
        );
        const categories = await CategoriesOfflineController.getCategories();

        dispatch({
          type: types.categoriesLoad,
          payload: categories,
        });

        console.log(
          `✅ [CATEGORIES] Fallback exitoso: ${categories.length} categorías desde cache`
        );
      } catch (fallbackError) {
        console.error("❌ [CATEGORIES] Fallback también falló:", fallbackError);

        // Último recurso: array vacío
        dispatch({
          type: types.categoriesLoad,
          payload: [],
        });
      }
    }
  };
};
// ✅ ACTION PARA SINCRONIZAR CATEGORÍAS
export const syncCategories = () => {
  return async (dispatch) => {
    if (!navigator.onLine) {
      console.log("📴 [CATEGORIES] Sin conexión - no se puede sincronizar");
      return { success: false, error: "Sin conexión a internet" };
    }

    try {
      console.log("🔄 [CATEGORIES] Sincronizando categorías...");

      dispatch({ type: types.categoriesStartLoading });

      const result =
        await CategoriesOfflineController.syncCategoriesFromServer();

      if (result.success) {
        // Recargar las categorías después de sincronizar
        await dispatch(loadCategories());

        console.log(
          `✅ [CATEGORIES] Sincronización completada: ${result.count} categorías`
        );

        dispatch({ type: types.categoriesFinishLoading });
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ [CATEGORIES] Error en sincronización:", error);

      dispatch({
        type: types.categoriesError,
        payload: error.message,
      });

      return { success: false, error: error.message };
    }
  };
};

// ✅ ACTION PARA OBTENER ESTADÍSTICAS
export const getCategoriesStats = () => {
  return async () => {
    try {
      const stats = await CategoriesOfflineController.getStats();
      return stats;
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      return { total: 0, active: 0, inactive: 0 };
    }
  };
};

// ✅ ACTION PARA SETEAR ERROR
export const setCategoriesError = (error) => ({
  type: types.categoriesError,
  payload: error,
});

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
