// src/controllers/offline/AuthOfflineController/AuthOfflineController.js - CORREGIDO
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class AuthOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "offline_users";
  }

  // ✅ GUARDAR USUARIO PARA OFFLINE - CORREGIDO
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

      // ✅ VERIFICAR SI EL USUARIO YA EXISTE - POR USERNAME (clave primaria)
      const existingUser = await IndexedDBService.get(
        this.storeName,
        userData.username // ✅ CORREGIDO: Buscar por username (keyPath)
      );

      if (existingUser) {
        console.log("🔄 Usuario ya existe, actualizando...", userData.username);
        // Actualizar usuario existente
        const updatedUser = {
          ...existingUser,
          ...offlineUser,
          loginCount: (existingUser.loginCount || 0) + 1,
        };

        // ✅ CORREGIDO: Usar put en lugar de add para actualizar
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

        // ✅ CORREGIDO: Usar addOrUpdate en lugar de add
        const addResult = await IndexedDBService.addOrUpdate(
          this.storeName,
          offlineUser
        );
        console.log("✅ Nuevo usuario guardado para offline:", addResult);

        // ✅ VERIFICAR QUE REALMENTE SE GUARDÓ
        const verifyUser = await IndexedDBService.get(
          this.storeName,
          userData.username // ✅ CORREGIDO: Verificar por username
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

  // ✅ OBTENER USUARIO ACTUAL DESDE LOCALSTORAGE
  async getCurrentUser() {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        console.warn("❌ No hay usuario en localStorage");
        return null;
      }

      const user = JSON.parse(userStr);
      console.log("🔍 Usuario actual desde localStorage:", user);

      // Verificar si existe en IndexedDB
      const offlineUser = await this.getUserByUsername(user.username);
      if (offlineUser) {
        return { ...user, ...offlineUser };
      }

      return user;
    } catch (error) {
      console.error("❌ Error obteniendo usuario actual:", error);
      return null;
    }
  }

  // ✅ OBTENER VENDEDOR_ID ACTUAL
  async getCurrentVendedorId() {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error("No hay usuario autenticado");
      }

      // El vendedor_id puede estar en diferentes propiedades
      const vendedorId = currentUser.vendedor_id || currentUser.id;

      if (!vendedorId) {
        throw new Error("Usuario no tiene vendedor_id");
      }

      console.log("📋 Vendedor ID actual:", vendedorId);
      return vendedorId;
    } catch (error) {
      console.error("❌ Error obteniendo vendedor_id:", error);
      throw error;
    }
  }

  // ✅ CONTAR USUARIOS OFFLINE
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
  // ✅ VERIFICACIÓN OFFLINE PURA - SIN TOKEN
  async verifyOfflineAccess(username) {
    try {
      console.log("🔐 Verificación offline pura para:", username);

      if (!IndexedDBService.initialized) {
        await IndexedDBService.init();
      }

      const user = await IndexedDBService.get(this.storeName, username);

      if (!user) {
        return {
          success: false,
          error: "Usuario no disponible offline",
        };
      }

      if (user.activo === false || user.isActive === false) {
        return {
          success: false,
          error: "Usuario inactivo",
        };
      }

      // ✅ ACTUALIZAR ÚLTIMO ACCESO OFFLINE
      await this.updateLastLogin(username);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          activo: user.activo,
          vendedor_id: user.vendedor_id,
        },
        isOffline: true,
      };
    } catch (error) {
      console.error("❌ Error en verificación offline pura:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
  // ✅ VERIFICAR CREDENCIALES OFFLINE - CORREGIDO
  async verifyCredentials(username, password) {
    try {
      console.log("🔐 Verificando credenciales offline para:", username);

      if (!IndexedDBService.initialized) {
        await IndexedDBService.init();
      }

      // ✅ CORREGIDO: Buscar por username
      const user = await IndexedDBService.get(this.storeName, username);

      if (!user) {
        console.log("❌ Usuario no encontrado en datos offline:", username);
        return {
          success: false,
          error:
            "Usuario no disponible offline. Conecta a internet para primer acceso.",
        };
      }

      // ✅ VERIFICAR SI EL USUARIO ESTÁ ACTIVO
      if (user.activo === false || user.isActive === false) {
        console.log("❌ Usuario inactivo en cache offline:", username);
        return {
          success: false,
          error: "Usuario inactivo. Conecta a internet para verificar estado.",
        };
      }

      console.log("✅ Usuario encontrado - Modo offline activado");

      // ✅ ACTUALIZAR ÚLTIMO LOGIN
      await this.updateLastLogin(username);

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          activo: user.activo,
          vendedor_id: user.vendedor_id,
        },
        token: user.token, // ✅ Mantenemos el token pero NO lo validamos offline
        isOffline: true, // ✅ Nueva bandera
      };
    } catch (error) {
      console.error("❌ Error verificando credenciales offline:", error);
      return {
        success: false,
        error: "Error de autenticación offline: " + error.message,
      };
    }
  }

  // ✅ ACTUALIZAR ÚLTIMO LOGIN - CORREGIDO
  async updateLastLogin(username) {
    try {
      // ✅ CORREGIDO: Buscar por username (clave primaria)
      const user = await IndexedDBService.get(this.storeName, username);
      if (user) {
        const updatedUser = {
          ...user,
          lastLogin: new Date().toISOString(),
          loginCount: (user.loginCount || 0) + 1,
        };

        // ✅ CORREGIDO: Usar put para actualizar
        await IndexedDBService.put(this.storeName, updatedUser);
        console.log("✅ Último login actualizado para:", username);
      }
    } catch (error) {
      console.error("Error actualizando último login:", error);
    }
  }

  // ✅ OBTENER USUARIO POR USERNAME - CORREGIDO
  async getUserByUsername(username) {
    try {
      console.log("🔍 Buscando usuario en offline_users:", username);

      if (!IndexedDBService.initialized) {
        await IndexedDBService.init();
      }

      const storeExists = await IndexedDBService.storeExists(this.storeName);
      if (!storeExists) {
        console.warn(`❌ Store ${this.storeName} no existe`);
        return null;
      }

      // ✅ CORREGIDO: Buscar directamente por clave primaria
      const user = await IndexedDBService.get(this.storeName, username);

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

  // ✅ OBTENER TODOS LOS USUARIOS OFFLINE
  async getAllOfflineUsers() {
    try {
      const users = await IndexedDBService.getAll(this.storeName);
      return users;
    } catch (error) {
      console.error("Error obteniendo usuarios offline:", error);
      return [];
    }
  }

  // ✅ LIMPIAR USUARIOS DUPLICADOS - CORREGIDO
  async cleanupDuplicateUsers() {
    try {
      const users = await this.getAllOfflineUsers();
      const uniqueUsers = [];
      const seenUsernames = new Set(); // ✅ CORREGIDO: Usar username como clave única

      for (const user of users) {
        if (!seenUsernames.has(user.username)) {
          seenUsernames.add(user.username);
          uniqueUsers.push(user);
        }
      }

      // Limpiar y guardar usuarios únicos
      await IndexedDBService.clear(this.storeName);
      for (const user of uniqueUsers) {
        // ✅ CORREGIDO: Usar addOrUpdate para evitar errores de clave duplicada
        await IndexedDBService.addOrUpdate(this.storeName, user);
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

  // ✅ NUEVO MÉTODO: ELIMINAR USUARIO OFFLINE
  async removeOfflineUser(username) {
    try {
      if (!IndexedDBService.initialized) {
        await IndexedDBService.init();
      }

      const result = await IndexedDBService.delete(this.storeName, username);

      if (result) {
        console.log(`✅ Usuario offline eliminado: ${username}`);
        return { success: true };
      } else {
        console.log(`⚠️ Usuario no encontrado para eliminar: ${username}`);
        return { success: false, error: "Usuario no encontrado" };
      }
    } catch (error) {
      console.error("❌ Error eliminando usuario offline:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ NUEVO MÉTODO: VERIFICAR SI USUARIO EXISTE OFFLINE
  async userExistsOffline(username) {
    try {
      const user = await IndexedDBService.get(this.storeName, username);
      return user !== null && user !== undefined;
    } catch (error) {
      console.error("Error verificando usuario offline:", error);
      return false;
    }
  }

  // ✅ NUEVO MÉTODO: GUARDAR USUARIO DE FORMA SEGURA
  async safeSaveUser(userData, token) {
    try {
      const exists = await this.userExistsOffline(userData.username);

      const offlineUser = {
        ...userData,
        token: token,
        lastLogin: new Date().toISOString(),
        savedAt: new Date().toISOString(),
        isActive: true,
      };

      if (exists) {
        console.log("🔄 Usuario ya existe, actualizando...");
        // ✅ Obtener usuario existente para preservar loginCount
        const existingUser = await IndexedDBService.get(
          this.storeName,
          userData.username
        );
        offlineUser.loginCount = (existingUser.loginCount || 0) + 1;

        return await IndexedDBService.put(this.storeName, offlineUser);
      } else {
        console.log("🆕 Usuario nuevo, insertando...");
        offlineUser.loginCount = 1;
        offlineUser.createdAt = new Date().toISOString();

        return await IndexedDBService.addOrUpdate(this.storeName, offlineUser);
      }
    } catch (error) {
      console.error("❌ Error en safeSaveUser:", error);
      return false;
    }
  }
}

export default new AuthOfflineController();
