// src/controllers/offline/CategoriesOfflineController/CategoriesOfflineController.js
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class CategoriesOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "categorias";
  }

  // ✅ OBTENER TODAS LAS CATEGORÍAS
  async getCategories() {
    try {
      console.log("📁 [CATEGORIES OFFLINE] Obteniendo categorías...");

      if (!IndexedDBService.initialized) {
        await IndexedDBService.init();
      }

      const categories = await IndexedDBService.getAll(this.storeName);
      const activeCategories = categories.filter((cat) => cat.activo !== false);

      console.log(
        `✅ [CATEGORIES OFFLINE] ${activeCategories.length} categorías obtenidas`
      );
      return activeCategories;
    } catch (error) {
      console.error(
        "❌ [CATEGORIES OFFLINE] Error obteniendo categorías:",
        error
      );
      return [];
    }
  }

  // ✅ OBTENER CATEGORÍA POR ID
  async getCategoryById(categoryId) {
    try {
      const category = await IndexedDBService.get(this.storeName, categoryId);
      return category && category.activo !== false ? category : null;
    } catch (error) {
      console.error("❌ Error obteniendo categoría por ID:", error);
      return null;
    }
  }

  // ✅ GUARDAR CATEGORÍAS
  async saveCategories(categories) {
    try {
      if (!IndexedDBService.initialized) {
        await IndexedDBService.init();
      }

      let savedCount = 0;
      for (const category of categories) {
        const result = await IndexedDBService.put(this.storeName, category);
        if (result) savedCount++;
      }

      console.log(`✅ ${savedCount} categorías guardadas offline`);
      return { success: true, count: savedCount };
    } catch (error) {
      console.error("❌ Error guardando categorías:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ SINCRONIZAR DESDE SERVIDOR
  async syncCategoriesFromServer() {
    if (!navigator.onLine) {
      return { success: false, error: "Sin conexión a internet" };
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return { success: false, error: "No hay token disponible" };
      }

      const response = await fetch(`${process.env.VITE_API_URL}/categorias`, {
        headers: { "x-token": token },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.ok && data.categorias) {
          const saveResult = await this.saveCategories(data.categorias);
          return {
            success: saveResult.success,
            count: saveResult.count,
            message: `${saveResult.count} categorías sincronizadas`,
          };
        }
      }

      return {
        success: false,
        error: "Error obteniendo categorías del servidor",
      };
    } catch (error) {
      console.error("❌ Error sincronizando categorías:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ OBTENER ESTADÍSTICAS
  async getStats() {
    try {
      const categories = await this.getCategories();
      return {
        total: categories.length,
        active: categories.filter((cat) => cat.activo === true).length,
        inactive: categories.filter((cat) => cat.activo === false).length,
      };
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      return { total: 0, active: 0, inactive: 0 };
    }
  }
}

export default new CategoriesOfflineController();
