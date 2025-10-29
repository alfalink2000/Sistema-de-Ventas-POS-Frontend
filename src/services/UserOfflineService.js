// src/services/UserOfflineService.js - ACTUALIZADO PARA TU MODELO
import IndexedDBService from "./IndexedDBService";

class UserOfflineService {
  constructor() {
    this.storeName = "offline_users";
  }

  // Guardar usuario para autenticación offline - CORREGIDO
  async saveUserForOffline(user, token) {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      // ✅ ESTRUCTURA CORRECTA según tu modelo de base de datos
      const offlineUser = {
        id: user.id, // UUID de PostgreSQL
        username: user.username,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol, // 'admin', 'vendedor', 'cajero'
        activo: user.activo !== undefined ? user.activo : true,
        password_hash: user.password_hash || "offline", // No tenemos el hash real
        ultimo_login: user.ultimo_login || new Date().toISOString(),
        token: token, // Token JWT para autenticación
        savedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      console.log("💾 Guardando usuario para offline:", {
        id: offlineUser.id,
        username: offlineUser.username,
        rol: offlineUser.rol,
        activo: offlineUser.activo,
      });

      // Verificar si ya existe
      const existingUsers = await IndexedDBService.getAll(this.storeName);
      const existingUser = existingUsers.find((u) => u.id === user.id);

      if (existingUser) {
        await IndexedDBService.put(this.storeName, offlineUser);
        console.log("✅ Usuario actualizado en IndexedDB");
      } else {
        await IndexedDBService.add(this.storeName, offlineUser);
        console.log("✅ Nuevo usuario guardado en IndexedDB");
      }

      return true;
    } catch (error) {
      console.error("❌ Error guardando usuario offline:", error);
      return false;
    }
  }

  // Obtener usuario offline por username - CORREGIDO
  async getOfflineUserByUsername(username) {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      const users = await IndexedDBService.getAll(this.storeName);
      const user = users.find(
        (u) => u.username === username && u.activo === true // Solo usuarios activos
      );

      if (user) {
        console.log("✅ Usuario encontrado en IndexedDB:", user.username);
      } else {
        console.log("❌ Usuario NO encontrado en IndexedDB:", username);
        console.log(
          "📋 Usuarios disponibles:",
          users.map((u) => ({
            username: u.username,
            activo: u.activo,
          }))
        );
      }

      return user || null;
    } catch (error) {
      console.error("❌ Error obteniendo usuario offline:", error);
      return null;
    }
  }

  // Verificar credenciales offline - MEJORADO
  async verifyOfflineCredentials(username, password) {
    try {
      console.log("🔍 Verificando credenciales offline para:", username);

      const user = await this.getOfflineUserByUsername(username);

      if (!user) {
        return {
          success: false,
          error: "Usuario no encontrado. Necesita conexión para primer acceso.",
        };
      }

      // ✅ VERIFICAR TOKEN JWT (en lugar de contraseña)
      if (!user.token) {
        return {
          success: false,
          error: "Token no disponible. Conecta a internet para renovar sesión.",
        };
      }

      // Verificar que el token no esté expirado
      try {
        const tokenPayload = JSON.parse(atob(user.token.split(".")[1]));
        const isTokenValid = tokenPayload.exp * 1000 > Date.now();

        if (!isTokenValid) {
          console.log("⚠️ Token expirado para usuario:", username);
          return {
            success: false,
            error: "Sesión expirada. Conecta a internet para renovar.",
          };
        }
      } catch (tokenError) {
        console.error("Error verificando token:", tokenError);
        return {
          success: false,
          error: "Error verificando sesión. Conecta a internet.",
        };
      }

      console.log("✅ Credenciales offline válidas para:", username);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          activo: user.activo,
          ultimo_login: user.ultimo_login,
        },
        token: user.token,
      };
    } catch (error) {
      console.error("❌ Error verificando credenciales offline:", error);
      return { success: false, error: "Error de verificación offline" };
    }
  }

  // Sincronizar usuarios desde el servidor - ACTUALIZADO
  async syncUsersFromServer() {
    try {
      if (!navigator.onLine) {
        console.log(
          "📴 No hay conexión - omitiendo sincronización de usuarios"
        );
        return { success: false, error: "Sin conexión" };
      }

      const token = localStorage.getItem("token");
      if (!token) {
        return { success: false, error: "No hay token disponible" };
      }

      console.log("🔄 Sincronizando usuarios desde servidor...");

      const response = await fetch(`${process.env.VITE_API_URL}/users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-token": token,
        },
      });

      console.log("📥 Respuesta de usuarios:", response.status);

      if (response.ok) {
        const data = await response.json();

        if (data.ok && data.users) {
          console.log(
            `📥 Recibidos ${data.users.length} usuarios del servidor`
          );

          // Guardar todos los usuarios en IndexedDB
          let savedCount = 0;
          for (const user of data.users) {
            const saved = await this.saveUserForOffline(
              user,
              "offline-sync-token"
            );
            if (saved) savedCount++;
          }

          console.log(`✅ ${savedCount} usuarios sincronizados offline`);
          return { success: true, count: savedCount };
        } else {
          console.error("❌ Respuesta inválida del servidor:", data);
          return { success: false, error: "Respuesta inválida del servidor" };
        }
      } else {
        const errorText = await response.text();
        console.error("❌ Error del servidor:", response.status, errorText);
        return {
          success: false,
          error: `Error ${response.status}: ${errorText}`,
        };
      }
    } catch (error) {
      console.error("❌ Error sincronizando usuarios:", error);
      return { success: false, error: error.message };
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

  // Verificar si hay usuarios disponibles offline
  async hasOfflineUsers() {
    try {
      const users = await this.getAllOfflineUsers();
      const hasUsers = users.length > 0;
      console.log(
        "📊 Usuarios offline disponibles:",
        hasUsers ? users.length : 0
      );
      return hasUsers;
    } catch (error) {
      console.error("❌ Error verificando usuarios offline:", error);
      return false;
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
}

export default new UserOfflineService();
