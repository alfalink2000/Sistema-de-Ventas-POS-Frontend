// src/controllers/offline/AuthOfflineController/AuthOfflineController.js - COMPLETO
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../../services/IndexedDBService";

class AuthOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "offline_users";
  }

  // ✅ GUARDAR USUARIO PARA OFFLINE
  async saveUser(userData, token) {
    try {
      await this.validateRequiredFields(userData, [
        "id",
        "username",
        "nombre",
        "rol",
      ]);

      const offlineUser = {
        ...userData,
        token,
        lastLogin: new Date().toISOString(),
        loginCount: (userData.loginCount || 0) + 1,
        savedAt: new Date().toISOString(),
      };

      await IndexedDBService.put(this.storeName, offlineUser);

      console.log("✅ Usuario guardado para offline:", userData.username);
      return { success: true, user: offlineUser };
    } catch (error) {
      console.error("❌ Error guardando usuario offline:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ VERIFICAR CREDENCIALES OFFLINE
  async verifyCredentials(username, password) {
    try {
      const users = await IndexedDBService.getAll(this.storeName);
      const user = users.find(
        (u) => u.username === username && u.activo !== false
      );

      if (!user) {
        return {
          success: false,
          error:
            "Usuario no disponible offline. Conecta a internet para primer acceso.",
        };
      }

      // Verificar token JWT
      if (user.token) {
        try {
          const tokenPayload = JSON.parse(atob(user.token.split(".")[1]));
          const isTokenValid = tokenPayload.exp * 1000 > Date.now();

          if (!isTokenValid) {
            return {
              success: false,
              error: "Sesión expirada. Conecta a internet para renovar.",
            };
          }
        } catch (tokenError) {
          return {
            success: false,
            error: "Error de sesión. Conecta a internet.",
          };
        }
      }

      // Actualizar último login
      await this.updateLastLogin(user.id);

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
      return { success: false, error: "Error de autenticación offline" };
    }
  }

  async updateLastLogin(userId) {
    try {
      const user = await IndexedDBService.get(this.storeName, userId);
      if (user) {
        user.lastLogin = new Date().toISOString();
        user.loginCount = (user.loginCount || 0) + 1;
        await IndexedDBService.put(this.storeName, user);
      }
    } catch (error) {
      console.error("Error actualizando último login:", error);
    }
  }

  // ✅ OBTENER USUARIO POR USERNAME
  async getUserByUsername(username) {
    try {
      const users = await IndexedDBService.getAll(this.storeName);
      return users.find((u) => u.username === username && u.activo !== false);
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      return null;
    }
  }

  // ✅ SINCRONIZAR USUARIOS DESDE SERVIDOR
  async syncUsersFromServer() {
    if (!this.isOnline) {
      return { success: false, error: "Sin conexión a internet" };
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return { success: false, error: "No hay token disponible" };
      }

      const response = await fetch(`${process.env.VITE_API_URL}/users`, {
        headers: { "x-token": token },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.ok && data.usuarios) {
          let savedCount = 0;

          for (const user of data.usuarios) {
            const result = await this.saveUser(user, token);
            if (result.success) savedCount++;
          }

          return {
            success: true,
            count: savedCount,
            message: `${savedCount} usuarios sincronizados offline`,
          };
        }
      }

      return {
        success: false,
        error: "Error obteniendo usuarios del servidor",
      };
    } catch (error) {
      console.error("Error sincronizando usuarios:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ NUEVO: OBTENER TODOS LOS USUARIOS OFFLINE
  async getAllOfflineUsers() {
    try {
      const users = await IndexedDBService.getAll(this.storeName);
      return users;
    } catch (error) {
      console.error("Error obteniendo usuarios offline:", error);
      return [];
    }
  }

  // ✅ NUEVO: LIMPIAR USUARIOS DUPLICADOS
  async cleanupDuplicateUsers() {
    try {
      const users = await this.getAllOfflineUsers();
      const uniqueUsers = [];
      const seenIds = new Set();

      for (const user of users) {
        if (!seenIds.has(user.id)) {
          seenIds.add(user.id);
          uniqueUsers.push(user);
        }
      }

      // Limpiar y guardar usuarios únicos
      await IndexedDBService.clear(this.storeName);
      for (const user of uniqueUsers) {
        await IndexedDBService.add(this.storeName, user);
      }

      return {
        success: true,
        removed: users.length - uniqueUsers.length,
        remaining: uniqueUsers.length,
      };
    } catch (error) {
      console.error("Error limpiando duplicados:", error);
      return { success: false, error: error.message };
    }
  }
}

export default new AuthOfflineController();
