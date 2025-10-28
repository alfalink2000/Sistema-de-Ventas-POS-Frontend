// src/services/AuthOfflineService.js - CORREGIDO
import IndexedDBService from "./IndexedDBService";

const AuthOfflineService = {
  // Guardar usuario para uso offline
  saveUserForOffline: async (user, token) => {
    try {
      // ✅ INICIALIZAR IndexedDB si no está listo
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      const offlineUser = {
        user,
        token,
        savedAt: new Date().toISOString(),
      };

      await IndexedDBService.add("offline_users", offlineUser);
      console.log("✅ Usuario guardado para uso offline");
      return true;
    } catch (error) {
      console.error("❌ Error guardando usuario offline:", error);
      return false;
    }
  },

  // Obtener usuario offline
  getOfflineUser: async () => {
    try {
      // ✅ INICIALIZAR IndexedDB si no está listo
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      const users = await IndexedDBService.getAll("offline_users");
      if (users.length > 0) {
        // Devolver el más reciente
        const latestUser = users.reduce((latest, current) => {
          return new Date(current.savedAt) > new Date(latest.savedAt)
            ? current
            : latest;
        });
        console.log("✅ Usuario offline recuperado");
        return latestUser;
      }
      return null;
    } catch (error) {
      console.error("❌ Error obteniendo usuario offline:", error);
      return null;
    }
  },

  // Limpiar usuarios offline
  clearOfflineUsers: async () => {
    try {
      // ✅ INICIALIZAR IndexedDB si no está listo
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      await IndexedDBService.clear("offline_users");
      console.log("✅ Usuarios offline eliminados");
      return true;
    } catch (error) {
      console.error("❌ Error limpiando usuarios offline:", error);
      return false;
    }
  },
};

export default AuthOfflineService;
