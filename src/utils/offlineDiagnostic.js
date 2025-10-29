// src/utils/offlineDiagnostic.js
import UserOfflineService from "../services/UserOfflineService";
import SyncService from "../services/SyncService";
import IndexedDBService from "../services/IndexedDBService";

export const checkOfflineData = async () => {
  console.group("🔍 DIAGNÓSTICO DATOS OFFLINE");

  try {
    // Verificar IndexedDB
    const dbInfo = await IndexedDBService.getDBInfo();
    console.log("📊 Base de datos:", dbInfo);

    // Verificar usuarios
    const offlineUsers = await UserOfflineService.getAllOfflineUsers();
    console.log("👥 Usuarios offline:", offlineUsers);

    // Verificar datos maestros
    const masterData = await SyncService.loadMasterDataFromCache();
    console.log("📦 Productos en cache:", masterData.productos?.length || 0);
    console.log("📁 Categorías en cache:", masterData.categorias?.length || 0);

    // Verificar ventas pendientes
    const pendingSales = await IndexedDBService.getAll("ventas_pendientes");
    console.log("💰 Ventas pendientes:", pendingSales.length);

    console.groupEnd();

    return {
      dbInfo,
      offlineUsers: offlineUsers.length,
      productos: masterData.productos?.length || 0,
      categorias: masterData.categorias?.length || 0,
      ventasPendientes: pendingSales.length,
    };
  } catch (error) {
    console.error("Error en diagnóstico:", error);
    console.groupEnd();
    return null;
  }
};

// Ejecutar en la consola del navegador para verificar
// window.checkOfflineData = checkOfflineData;
