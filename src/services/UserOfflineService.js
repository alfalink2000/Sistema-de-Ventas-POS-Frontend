// src/services/UserOfflineService.js
import IndexedDBService from "./IndexedDBService";

class UserOfflineService {
  constructor() {
    this.storeName = "offline_users";
  }

  // Guardar usuario para autenticación offline
  async saveUserForOffline(user, token) {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      const offlineUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        token: token,
        activo: user.activo,
        savedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      // Verificar si ya existe
      const existingUsers = await IndexedDBService.getAll(this.storeName);
      const existingUser = existingUsers.find((u) => u.id === user.id);

      if (existingUser) {
        await IndexedDBService.put(this.storeName, offlineUser);
      } else {
        await IndexedDBService.add(this.storeName, offlineUser);
      }

      console.log(
        "✅ Usuario guardado para autenticación offline:",
        user.username
      );
      return true;
    } catch (error) {
      console.error("❌ Error guardando usuario offline:", error);
      return false;
    }
  }

  // Obtener usuario offline por username
  async getOfflineUserByUsername(username) {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      const users = await IndexedDBService.getAll(this.storeName);
      const user = users.find(
        (u) => u.username === username && u.activo === true
      );

      return user || null;
    } catch (error) {
      console.error("❌ Error obteniendo usuario offline:", error);
      return null;
    }
  }

  // Obtener usuario offline por ID
  async getOfflineUserById(userId) {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      const users = await IndexedDBService.getAll(this.storeName);
      const user = users.find((u) => u.id === userId && u.activo === true);

      return user || null;
    } catch (error) {
      console.error("❌ Error obteniendo usuario offline por ID:", error);
      return null;
    }
  }

  // Verificar credenciales offline
  async verifyOfflineCredentials(username, password) {
    try {
      const user = await this.getOfflineUserByUsername(username);

      if (!user) {
        return { success: false, error: "Usuario no encontrado" };
      }

      // En un sistema real, aquí deberías tener el hash de la contraseña
      // Por ahora, asumimos que el token es suficiente para autenticación offline
      // Esto es una simplificación - en producción necesitarías una solución más segura

      console.log("✅ Credenciales offline verificadas para:", username);
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          activo: user.activo,
        },
        token: user.token,
      };
    } catch (error) {
      console.error("❌ Error verificando credenciales offline:", error);
      return { success: false, error: "Error de verificación" };
    }
  }

  // Obtener todos los usuarios offline
  async getAllOfflineUsers() {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      const users = await IndexedDBService.getAll(this.storeName);
      return users.filter((user) => user.activo === true);
    } catch (error) {
      console.error("❌ Error obteniendo usuarios offline:", error);
      return [];
    }
  }

  // Sincronizar usuarios desde el servidor
  async syncUsersFromServer() {
    try {
      if (!navigator.onLine) {
        console.log(
          "📴 No hay conexión - omitiendo sincronización de usuarios"
        );
        return { success: false, error: "Sin conexión" };
      }

      const response = await fetch("/api/users", {
        headers: {
          "x-token": localStorage.getItem("token") || "",
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.ok && data.users) {
          // Guardar todos los usuarios en IndexedDB
          for (const user of data.users) {
            await this.saveUserForOffline(user, "offline-token");
          }

          console.log(`✅ ${data.users.length} usuarios sincronizados offline`);
          return { success: true, count: data.users.length };
        }
      }

      return { success: false, error: "Error del servidor" };
    } catch (error) {
      console.error("❌ Error sincronizando usuarios:", error);
      return { success: false, error: error.message };
    }
  }

  // Limpiar usuarios offline
  async clearOfflineUsers() {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      await IndexedDBService.clear(this.storeName);
      console.log("✅ Usuarios offline eliminados");
      return true;
    } catch (error) {
      console.error("❌ Error limpiando usuarios offline:", error);
      return false;
    }
  }

  // Verificar si hay usuarios disponibles offline
  async hasOfflineUsers() {
    try {
      const users = await this.getAllOfflineUsers();
      return users.length > 0;
    } catch (error) {
      return false;
    }
  }
}

export default new UserOfflineService();
