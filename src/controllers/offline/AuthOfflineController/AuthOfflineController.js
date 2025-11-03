// src/controllers/offline/AuthOfflineController/AuthOfflineController.js - COMPLETO
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class AuthOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "offline_users";
  }

  // ✅ GUARDAR USUARIO PARA OFFLINE
  async saveUser(userData, token) {
    try {
      console.log(
        "💾 Intentando guardar usuario para offline:",
        userData.username
      );

      // ✅ VERIFICAR QUE INDEXEDDB ESTÉ INICIALIZADO
      if (!IndexedDBService.initialized) {
        await IndexedDBService.init();
      }

      // ✅ VERIFICAR QUE EL OBJECT STORE EXISTA
      const storeExists = await IndexedDBService.storeExists(this.storeName);
      if (!storeExists) {
        console.error(`❌ Object store "${this.storeName}" no existe`);
        throw new Error(`Object store "${this.storeName}" no está disponible`);
      }

      // ✅ VALIDACIONES BÁSICAS
      if (!userData || !userData.id || !userData.username) {
        console.error("❌ Datos de usuario incompletos:", userData);
        throw new Error("Datos de usuario incompletos");
      }

      // ✅ PREPARAR DATOS PARA OFFLINE
      const offlineUser = {
        ...userData,
        token: token,
        lastLogin: new Date().toISOString(),
        loginCount: 1,
        savedAt: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        isActive: true,
      };

      console.log("📦 Datos preparados para guardar:", {
        id: offlineUser.id,
        username: offlineUser.username,
        hasToken: !!offlineUser.token,
        storeName: this.storeName,
      });

      // ✅ VERIFICAR SI EL USUARIO YA EXISTE
      const existingUser = await IndexedDBService.get(
        this.storeName,
        userData.id
      );

      if (existingUser) {
        console.log("🔄 Usuario ya existe, actualizando...", userData.username);
        // Actualizar usuario existente
        const updatedUser = {
          ...existingUser,
          ...offlineUser,
          loginCount: (existingUser.loginCount || 0) + 1,
        };

        const updateResult = await IndexedDBService.put(
          this.storeName,
          updatedUser
        );
        console.log("✅ Usuario actualizado para offline:", updateResult);

        return {
          success: true,
          user: updatedUser,
          action: "updated",
        };
      } else {
        // ✅ CREAR NUEVO USUARIO OFFLINE
        console.log("🆕 Creando nuevo usuario offline...");
        const addResult = await IndexedDBService.add(
          this.storeName,
          offlineUser
        );
        console.log("✅ Nuevo usuario guardado para offline:", addResult);

        // ✅ VERIFICAR QUE REALMENTE SE GUARDÓ
        const verifyUser = await IndexedDBService.get(
          this.storeName,
          userData.id
        );
        console.log(
          "🔍 Usuario verificado después de guardar:",
          verifyUser ? "✅" : "❌"
        );

        return {
          success: true,
          user: offlineUser,
          action: "created",
        };
      }
    } catch (error) {
      console.error("❌ Error guardando usuario offline:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  // controllers/offline/AuthOfflineController/AuthOfflineController.js - AGREGAR MÉTODO
  async getOfflineUsersCount() {
    try {
      const users = await IndexedDBService.getAll(this.storeName);
      const activeUsers = users.filter((user) => user.isActive !== false);
      return activeUsers.length;
    } catch (error) {
      console.error("Error contando usuarios offline:", error);
      return 0;
    }
  }
  // ✅ VERIFICAR CREDENCIALES OFFLINE
  // ✅ MEJORA EN verifyCredentials - AuthOfflineController.js
  async verifyCredentials(username, password) {
    try {
      console.log("🔐 Verificando credenciales offline para:", username);

      // ✅ VERIFICAR QUE INDEXEDDB ESTÉ INICIALIZADO
      if (!IndexedDBService.initialized) {
        await IndexedDBService.init();
      }

      const users = await IndexedDBService.getAll(this.storeName);
      console.log(`📊 Usuarios en BD: ${users.length}`);

      const user = users.find(
        (u) => u.username === username && u.activo !== false
      );

      if (!user) {
        console.log("❌ Usuario no encontrado en datos offline:", username);
        return {
          success: false,
          error:
            "Usuario no disponible offline. Conecta a internet para primer acceso.",
        };
      }

      console.log("✅ Usuario encontrado, verificando token...");

      // ✅ VERIFICAR TOKEN JWT
      if (user.token) {
        try {
          const tokenParts = user.token.split(".");
          if (tokenParts.length !== 3) {
            return {
              success: false,
              error: "Token inválido. Conecta a internet para renovar.",
            };
          }

          const tokenPayload = JSON.parse(atob(tokenParts[1]));
          const isTokenValid = tokenPayload.exp * 1000 > Date.now();

          if (!isTokenValid) {
            console.warn("⚠️ Token expirado para usuario:", username);
            return {
              success: false,
              error: "Sesión expirada. Conecta a internet para renovar.",
            };
          }

          console.log("✅ Token válido para usuario:", username);
        } catch (tokenError) {
          console.error("❌ Error decodificando token:", tokenError);
          return {
            success: false,
            error: "Error de sesión. Conecta a internet.",
          };
        }
      } else {
        console.warn("⚠️ Usuario sin token:", username);
        return {
          success: false,
          error: "Credenciales incompletas. Conecta a internet.",
        };
      }

      // ✅ ACTUALIZAR ÚLTIMO LOGIN
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
      return {
        success: false,
        error: "Error de autenticación offline: " + error.message,
      };
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
    // ✅ VERIFICAR CONEXIÓN AL INICIO
    if (!navigator.onLine) {
      console.log(
        "📴 syncUsersFromServer: Sin conexión, cancelando sincronización"
      );
      return {
        success: false,
        error: "Sin conexión a internet",
        silent: true,
      };
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return {
          success: false,
          error: "No hay token disponible",
          silent: true,
        };
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

      // ✅ DIFERENCIAR ENTRE ERROR DE RED Y OTROS ERRORES
      if (error.message.includes("Failed to fetch") || !navigator.onLine) {
        return {
          success: false,
          error: "Sin conexión a internet",
          silent: true,
        };
      }

      return {
        success: false,
        error: error.message,
      };
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
  // controllers/offline/AuthOfflineController/AuthOfflineController.js - AGREGAR
  async getUserByUsername(username) {
    try {
      console.log("🔍 Buscando usuario en offline_users:", username);

      if (!IndexedDBService.initialized) {
        await IndexedDBService.init();
      }

      const storeExists = await IndexedDBService.storeExists("offline_users");
      if (!storeExists) {
        console.warn("❌ Store offline_users no existe");
        return null;
      }

      const users = await IndexedDBService.getAll("offline_users");
      console.log(`📊 Total de usuarios en BD: ${users.length}`);

      const user = users.find(
        (u) => u.username === username && u.activo !== false
      );

      console.log(
        "🔍 Resultado búsqueda usuario:",
        user ? "ENCONTRADO" : "NO ENCONTRADO"
      );
      return user;
    } catch (error) {
      console.error("❌ Error en getUserByUsername:", error);
      return null;
    }
  }
}

export default new AuthOfflineController();
