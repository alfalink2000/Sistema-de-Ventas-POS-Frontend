// controllers/offline/UsersSyncController/UsersSyncController.js
import IndexedDBService from "../../../services/IndexedDBService";
import { fetchConToken } from "../../../helpers/fetch";

class UsersSyncController {
  constructor() {
    this.storeName = "users";
    this.offlineStoreName = "offline_users";
  }

  // 📥 SINCRONIZAR DESDE SERVIDOR
  async syncFromServer() {
    try {
      console.log("🔄 [USERS SYNC] Sincronizando desde servidor...");

      const response = await fetchConToken("users");

      if (!response.ok) {
        throw new Error(response.error || "Error del servidor");
      }

      const usuarios = response.usuarios || [];

      // Limpiar y guardar nuevos usuarios
      await IndexedDBService.clear(this.storeName);
      await IndexedDBService.clear(this.offlineStoreName);

      for (const usuario of usuarios) {
        await IndexedDBService.add(this.storeName, {
          ...usuario,
          sincronizado: true,
          last_sync: new Date().toISOString(),
        });

        // Guardar también en offline_users para autenticación offline
        await IndexedDBService.add(this.offlineStoreName, {
          ...usuario,
          savedAt: new Date().toISOString(),
        });
      }

      console.log(
        `✅ [USERS SYNC] ${usuarios.length} usuarios sincronizados desde servidor`
      );

      return {
        success: true,
        count: usuarios.length,
        source: "server",
      };
    } catch (error) {
      console.error(
        "❌ [USERS SYNC] Error sincronizando desde servidor:",
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
      console.log("🔄 [USERS SYNC] Sincronizando cambios pendientes...");

      const usuariosPendientes = await IndexedDBService.getByIndex(
        this.storeName,
        "sincronizado",
        false
      );

      if (usuariosPendientes.length === 0) {
        return {
          success: true,
          count: 0,
          message: "No hay cambios pendientes",
        };
      }

      let exitosos = 0;
      let fallidos = 0;
      const resultados = [];

      for (const usuario of usuariosPendientes) {
        try {
          let result;

          if (usuario.id && usuario.id.startsWith("user_")) {
            // Actualizar usuario existente
            result = await fetchConToken(`users/${usuario.id}`, usuario, "PUT");
          } else {
            // Crear nuevo usuario
            result = await fetchConToken("users", usuario, "POST");
          }

          if (result && result.ok) {
            // Marcar como sincronizado
            await IndexedDBService.put(this.storeName, {
              ...usuario,
              sincronizado: true,
              last_sync: new Date().toISOString(),
              id: result.usuario?.id || usuario.id,
            });

            exitosos++;
            resultados.push({ id: usuario.id, status: "success" });
          } else {
            throw new Error(result?.error || "Error del servidor");
          }
        } catch (error) {
          fallidos++;
          resultados.push({
            id: usuario.id,
            status: "failed",
            error: error.message,
          });
          console.error(`❌ Error sincronizando usuario ${usuario.id}:`, error);
        }
      }

      console.log(
        `✅ [USERS SYNC] Sincronización completada: ${exitosos} exitosos, ${fallidos} fallidos`
      );

      return {
        success: exitosos > 0 || fallidos === 0,
        exitosos,
        fallidos,
        total: usuariosPendientes.length,
        resultados,
      };
    } catch (error) {
      console.error(
        "❌ [USERS SYNC] Error sincronizando cambios pendientes:",
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
          nuevos: pendientes.filter((u) => !u.id || !u.id.startsWith("user_"))
            .length,
          actualizaciones: pendientes.filter(
            (u) => u.id && u.id.startsWith("user_")
          ).length,
        },
      };
    } catch (error) {
      console.error(
        "❌ Error obteniendo conteo de usuarios pendientes:",
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
        "last_users_sync"
      );
      return metadata || null;
    } catch (error) {
      return null;
    }
  }

  // 🧹 LIMPIAR DATOS SINCRONIZADOS
  async cleanupSynced() {
    try {
      // Los usuarios sincronizados se mantienen para uso offline
      return {
        success: true,
        message: "No se requiere limpieza para usuarios",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default UsersSyncController;
