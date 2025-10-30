// src/services/UserOfflineService.js - VERSIÓN COMPLETAMENTE CORREGIDA
import IndexedDBService from "./IndexedDBService";

class UserOfflineService {
  constructor() {
    this.storeName = "offline_users";
  }

  // ✅ CORREGIDO: Guardar usuario para autenticación offline
  async saveUserForOffline(user, token) {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      // ✅ ESTRUCTURA CORRECTA según tu modelo de base de datos
      const offlineUser = {
        id: user.id, // UUID de PostgreSQL como clave primaria
        username: user.username,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol, // 'admin', 'vendedor', 'cajero'
        activo: user.activo !== undefined ? user.activo : true,
        password_hash: user.password_hash || "offline",
        ultimo_login: user.ultimo_login || new Date().toISOString(),
        token: token, // Token JWT para autenticación
        savedAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        loginCount: 1, // ✅ NUEVO: Contador de logins
      };

      console.log("💾 Guardando/actualizando usuario para offline:", {
        id: offlineUser.id,
        username: offlineUser.username,
        rol: offlineUser.rol,
        activo: offlineUser.activo,
      });

      // ✅ CORREGIDO: Usar PUT en lugar de ADD para actualizar existentes
      // IndexedDB.put() actualiza si existe, crea si no existe
      await IndexedDBService.put(this.storeName, offlineUser);

      console.log(
        "✅ Usuario guardado/actualizado en IndexedDB:",
        user.username
      );
      return true;
    } catch (error) {
      console.error("❌ Error guardando usuario offline:", error);
      return false;
    }
  }

  // ✅ CORREGIDO: Obtener usuario offline por username
  async getOfflineUserByUsername(username) {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      const users = await IndexedDBService.getAll(this.storeName);

      // ✅ FILTRAR solo usuarios activos con este username
      const activeUsers = users.filter(
        (u) => u.username === username && u.activo === true
      );

      if (activeUsers.length > 0) {
        // ✅ Devolver el MÁS RECIENTE por si hay duplicados
        const latestUser = activeUsers.reduce((latest, current) => {
          return new Date(current.lastLogin) > new Date(latest.lastLogin)
            ? current
            : latest;
        });

        console.log("✅ Usuario encontrado en IndexedDB:", latestUser.username);
        return latestUser;
      }

      console.log("❌ Usuario NO encontrado en IndexedDB:", username);
      console.log(
        "📋 Usuarios disponibles:",
        users.map((u) => ({
          id: u.id,
          username: u.username,
          activo: u.activo,
          lastLogin: u.lastLogin,
        }))
      );
      return null;
    } catch (error) {
      console.error("❌ Error obteniendo usuario offline:", error);
      return null;
    }
  }

  // ✅ CORREGIDO: Verificar credenciales offline
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

  // ✅ CORREGIDO: Sincronizar usuarios desde el servidor
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

          // ✅ CORREGIDO: Guardar todos los usuarios en IndexedDB
          let savedCount = 0;
          for (const user of data.users) {
            // Usar el token actual para todos los usuarios sincronizados
            const saved = await this.saveUserForOffline(user, token);
            if (saved) savedCount++;
          }

          console.log(`✅ ${savedCount} usuarios sincronizados offline`);

          // ✅ LIMPIAR DUPLICADOS después de sincronizar
          await this.cleanupDuplicateUsers();

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

  // ✅ NUEVO: Obtener todos los usuarios offline SIN DUPLICADOS
  async getAllOfflineUsers() {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      const allUsers = await IndexedDBService.getAll(this.storeName);
      const activeUsers = allUsers.filter((user) => user.activo === true);

      // ✅ ELIMINAR DUPLICADOS - mantener solo el más reciente por username
      const uniqueUsersMap = new Map();

      activeUsers.forEach((user) => {
        const existingUser = uniqueUsersMap.get(user.username);
        if (
          !existingUser ||
          new Date(user.lastLogin) > new Date(existingUser.lastLogin)
        ) {
          uniqueUsersMap.set(user.username, user);
        }
      });

      const uniqueUsers = Array.from(uniqueUsersMap.values());

      console.log(
        `📊 Usuarios offline: ${uniqueUsers.length} únicos de ${allUsers.length} totales`
      );

      return uniqueUsers;
    } catch (error) {
      console.error("❌ Error obteniendo usuarios offline:", error);
      return [];
    }
  }

  // ✅ NUEVO: Limpiar duplicados de la base de datos
  async cleanupDuplicateUsers() {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      const allUsers = await IndexedDBService.getAll(this.storeName);
      console.log(`🧹 Limpiando duplicados de ${allUsers.length} usuarios...`);

      // Agrupar por username y mantener solo el más reciente
      const usersByUsername = new Map();

      allUsers.forEach((user) => {
        const existingUser = usersByUsername.get(user.username);
        if (
          !existingUser ||
          new Date(user.lastLogin) > new Date(existingUser.lastLogin)
        ) {
          usersByUsername.set(user.username, user);
        }
      });

      const uniqueUsers = Array.from(usersByUsername.values());

      // Limpiar toda la store y guardar solo los únicos
      await IndexedDBService.clear(this.storeName);

      for (const user of uniqueUsers) {
        await IndexedDBService.add(this.storeName, user);
      }

      console.log(
        `✅ Limpieza completada: ${uniqueUsers.length} usuarios únicos guardados`
      );
      return uniqueUsers;
    } catch (error) {
      console.error("❌ Error limpiando duplicados:", error);
      return [];
    }
  }

  // ✅ NUEVO: Obtener estadísticas de usuarios
  async getOfflineUsersStats() {
    try {
      const allUsers = await IndexedDBService.getAll(this.storeName);
      const uniqueUsers = await this.getAllOfflineUsers();

      const stats = {
        totalRecords: allUsers.length,
        uniqueUsers: uniqueUsers.length,
        duplicates: allUsers.length - uniqueUsers.length,
        usersByRole: {},
        lastSync: null,
      };

      // Estadísticas por rol
      uniqueUsers.forEach((user) => {
        stats.usersByRole[user.rol] = (stats.usersByRole[user.rol] || 0) + 1;
      });

      // Última actualización
      if (uniqueUsers.length > 0) {
        const latestUser = uniqueUsers.reduce((latest, current) =>
          new Date(current.lastLogin) > new Date(latest.lastLogin)
            ? current
            : latest
        );
        stats.lastSync = latestUser.lastLogin;
      }

      console.log("📈 Estadísticas de usuarios:", stats);
      return stats;
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      return null;
    }
  }

  // ✅ NUEVO: Obtener usuario por ID (para verificación)
  async getOfflineUserById(userId) {
    try {
      if (!IndexedDBService.db) {
        await IndexedDBService.init();
      }

      const user = await IndexedDBService.get(this.storeName, userId);
      return user && user.activo === true ? user : null;
    } catch (error) {
      console.error("❌ Error obteniendo usuario por ID:", error);
      return null;
    }
  }

  // ✅ NUEVO: Actualizar último login
  async updateLastLogin(username) {
    try {
      const user = await this.getOfflineUserByUsername(username);
      if (user) {
        user.lastLogin = new Date().toISOString();
        user.loginCount = (user.loginCount || 0) + 1;
        await IndexedDBService.put(this.storeName, user);
        console.log(`✅ Último login actualizado para: ${username}`);
      }
    } catch (error) {
      console.error("❌ Error actualizando último login:", error);
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

  // ✅ NUEVO: Método para debugging - listar todos los usuarios
  async debugListAllUsers() {
    try {
      const allUsers = await IndexedDBService.getAll(this.storeName);
      console.log("🐛 DEBUG - Todos los usuarios en IndexedDB:");
      allUsers.forEach((user, index) => {
        console.log(
          `  ${index + 1}. ${user.username} (${user.id}) - Last: ${
            user.lastLogin
          } - Active: ${user.activo}`
        );
      });
      return allUsers;
    } catch (error) {
      console.error("❌ Error en debug:", error);
      return [];
    }
  }
}

export default new UserOfflineService();
