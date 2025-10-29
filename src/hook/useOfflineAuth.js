// src/hooks/useOfflineAuth.js
import { useState, useEffect } from "react";
import UserOfflineService from "../services/UserOfflineService";
import SyncService from "../services/SyncService";

export const useOfflineAuth = () => {
  const [offlineUsers, setOfflineUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasOfflineData, setHasOfflineData] = useState(false);

  useEffect(() => {
    loadOfflineUsers();
    checkOfflineData();
  }, []);

  const loadOfflineUsers = async () => {
    try {
      setIsLoading(true);
      const users = await UserOfflineService.getAllOfflineUsers();
      setOfflineUsers(users);
    } catch (error) {
      console.error("Error cargando usuarios offline:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkOfflineData = async () => {
    try {
      const hasUsers = await UserOfflineService.hasOfflineUsers();

      // Verificar también si hay datos maestros
      const masterData = await SyncService.loadMasterDataFromCache();
      const hasProducts =
        masterData.productos && masterData.productos.length > 0;

      setHasOfflineData(hasUsers && hasProducts);
    } catch (error) {
      console.error("Error verificando datos offline:", error);
      setHasOfflineData(false);
    }
  };

  const loginOffline = async (username, password) => {
    try {
      setIsLoading(true);

      const result = await UserOfflineService.verifyOfflineCredentials(
        username,
        password
      );

      if (result.success) {
        // Guardar en localStorage para persistencia
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));

        console.log("✅ Login offline exitoso:", username);
        return { success: true, user: result.user };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Error en login offline:", error);
      return { success: false, error: "Error de autenticación offline" };
    } finally {
      setIsLoading(false);
    }
  };

  const syncUsers = async () => {
    try {
      setIsLoading(true);
      const result = await UserOfflineService.syncUsersFromServer();

      if (result.success) {
        await loadOfflineUsers();
        await checkOfflineData();
      }

      return result;
    } catch (error) {
      console.error("Error sincronizando usuarios:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const getOfflineUserByUsername = async (username) => {
    return await UserOfflineService.getOfflineUserByUsername(username);
  };

  return {
    offlineUsers,
    isLoading,
    hasOfflineData,
    loginOffline,
    syncUsers,
    getOfflineUserByUsername,
    loadOfflineUsers,
    checkOfflineData,
  };
};
