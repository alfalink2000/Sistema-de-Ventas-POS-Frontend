// controllers/offline/CategoriesSyncController/CategoriesSyncController.js
import IndexedDBService from "../../../services/IndexedDBService";
import { fetchConToken } from "../../../helpers/fetch";

class CategoriesSyncController {
  constructor() {
    this.storeName = "categorias";
  }

  // 📥 SINCRONIZAR DESDE SERVIDOR
  async syncFromServer() {
    try {
      console.log("🔄 [CATEGORIES SYNC] Sincronizando desde servidor...");

      const response = await fetchConToken("categorias");

      if (!response.ok) {
        throw new Error(response.error || "Error del servidor");
      }

      const categorias = response.categorias || [];

      // Limpiar y guardar nuevas categorías
      await IndexedDBService.clear(this.storeName);

      for (const categoria of categorias) {
        await IndexedDBService.add(this.storeName, {
          ...categoria,
          sincronizado: true,
          last_sync: new Date().toISOString(),
        });
      }

      console.log(
        `✅ [CATEGORIES SYNC] ${categorias.length} categorías sincronizadas desde servidor`
      );

      return {
        success: true,
        count: categorias.length,
        source: "server",
      };
    } catch (error) {
      console.error(
        "❌ [CATEGORIES SYNC] Error sincronizando desde servidor:",
        error
      );
      return {
        success: false,
        error: error.message,
        source: "server",
      };
    }
  }

  // 📤 SINCRONIZAR CAMBIOS PENDIENTES
  async syncPendingChanges() {
    try {
      console.log("🔄 [CATEGORIES SYNC] Sincronizando cambios pendientes...");

      const categoriasPendientes = await IndexedDBService.getByIndex(
        this.storeName,
        "sincronizado",
        false
      );

      if (categoriasPendientes.length === 0) {
        return {
          success: true,
          count: 0,
          message: "No hay cambios pendientes",
        };
      }

      let exitosos = 0;
      let fallidos = 0;
      const resultados = [];

      for (const categoria of categoriasPendientes) {
        try {
          let result;

          if (categoria.id && categoria.id.startsWith("cat_")) {
            // Actualizar categoría existente
            result = await fetchConToken(
              `categorias/${categoria.id}`,
              categoria,
              "PUT"
            );
          } else {
            // Crear nueva categoría
            result = await fetchConToken("categorias", categoria, "POST");
          }

          if (result && result.ok) {
            // Marcar como sincronizado
            await IndexedDBService.put(this.storeName, {
              ...categoria,
              sincronizado: true,
              last_sync: new Date().toISOString(),
              id: result.categoria?.id || categoria.id,
            });

            exitosos++;
            resultados.push({ id: categoria.id, status: "success" });
          } else {
            throw new Error(result?.error || "Error del servidor");
          }
        } catch (error) {
          fallidos++;
          resultados.push({
            id: categoria.id,
            status: "failed",
            error: error.message,
          });
          console.error(
            `❌ Error sincronizando categoría ${categoria.id}:`,
            error
          );
        }
      }

      console.log(
        `✅ [CATEGORIES SYNC] Sincronización completada: ${exitosos} exitosos, ${fallidos} fallidos`
      );

      return {
        success: exitosos > 0 || fallidos === 0,
        exitosos,
        fallidos,
        total: categoriasPendientes.length,
        resultados,
      };
    } catch (error) {
      console.error(
        "❌ [CATEGORIES SYNC] Error sincronizando cambios pendientes:",
        error
      );
      return {
        success: false,
        error: error.message,
        exitosos: 0,
        fallidos: 0,
        total: 0,
      };
    }
  }

  // 🔢 OBTENER CONTEO DE PENDIENTES
  async getPendingCount() {
    try {
      const pendientes = await IndexedDBService.getByIndex(
        this.storeName,
        "sincronizado",
        false
      );

      return {
        total: pendientes.length,
        porTipo: {
          nuevos: pendientes.filter((c) => !c.id || !c.id.startsWith("cat_"))
            .length,
          actualizaciones: pendientes.filter(
            (c) => c.id && c.id.startsWith("cat_")
          ).length,
        },
      };
    } catch (error) {
      console.error(
        "❌ Error obteniendo conteo de categorías pendientes:",
        error
      );
      return { total: 0, error: error.message };
    }
  }

  // 📅 OBTENER ÚLTIMA SINCRONIZACIÓN
  async getLastSync() {
    try {
      const metadata = await IndexedDBService.get(
        "sync_metadata",
        "last_categories_sync"
      );
      return metadata || null;
    } catch (error) {
      return null;
    }
  }

  // 🧹 LIMPIAR DATOS SINCRONIZADOS
  async cleanupSynced() {
    try {
      // Las categorías sincronizadas se mantienen para uso offline
      return {
        success: true,
        message: "No se requiere limpieza para categorías",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default CategoriesSyncController;
