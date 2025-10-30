// src/hooks/useOfflineOperations.js - VERSIÓN COMPLETA
import { useCallback } from "react";
import AuthOfflineController from "../controllers/offline/AuthOfflineController/AuthOfflineController";
import SalesOfflineController from "../controllers/offline/SalesOfflineController/SalesOfflineController";
import SessionsOfflineController from "../controllers/offline/SessionsOfflineController/SessionsOfflineController";
import ClosuresOfflineController from "../controllers/offline/ClosuresOfflineController/ClosuresOfflineController";
import ProductsOfflineController from "../controllers/offline/ProductsOfflineController/ProductsOfflineController"; // ✅ NUEVO
import SyncController from "../controllers/offline/SyncController/SyncController";

export const useOfflineOperations = () => {
  // 🔐 AUTH
  const loginOffline = useCallback(async (username, password) => {
    return await AuthOfflineController.verifyCredentials(username, password);
  }, []);

  const syncUsers = useCallback(async () => {
    return await AuthOfflineController.syncUsersFromServer();
  }, []);

  // 💰 VENTAS
  const createSaleOffline = useCallback(async (saleData) => {
    return await SalesOfflineController.createSale(saleData);
  }, []);

  const getPendingSales = useCallback(async () => {
    return await SalesOfflineController.getPendingSales();
  }, []);

  // 🏪 SESIONES
  const openSessionOffline = useCallback(async (sessionData) => {
    return await SessionsOfflineController.openSession(sessionData);
  }, []);

  const closeSessionOffline = useCallback(async (sessionId, closeData) => {
    return await SessionsOfflineController.closeSession(sessionId, closeData);
  }, []);

  const getOpenSession = useCallback(async (vendedorId) => {
    return await SessionsOfflineController.getOpenSessionByVendedor(vendedorId);
  }, []);

  // 📊 CIERRES
  const createClosureOffline = useCallback(async (closureData) => {
    return await ClosuresOfflineController.createClosure(closureData);
  }, []);

  // 🛍️ PRODUCTOS ✅ NUEVAS FUNCIONES
  const getProductsOffline = useCallback(async (filters = {}) => {
    return await ProductsOfflineController.getProducts(filters);
  }, []);

  const getProductByIdOffline = useCallback(async (productId) => {
    return await ProductsOfflineController.getProductById(productId);
  }, []);

  const searchProductsOffline = useCallback(
    async (searchTerm, categoriaId = null) => {
      return await ProductsOfflineController.searchProducts(
        searchTerm,
        categoriaId
      );
    },
    []
  );

  const updateStockOffline = useCallback(
    async (productId, newStock, operationData = {}) => {
      return await ProductsOfflineController.updateStock(
        productId,
        newStock,
        operationData
      );
    },
    []
  );

  const reduceStockOffline = useCallback(
    async (productId, quantity, ventaId = null) => {
      return await ProductsOfflineController.reduceStock(
        productId,
        quantity,
        ventaId
      );
    },
    []
  );

  const getLowStockProductsOffline = useCallback(async (limite = 10) => {
    return await ProductsOfflineController.getLowStockProducts(limite);
  }, []);

  const syncProductsOffline = useCallback(async () => {
    return await ProductsOfflineController.syncProductsFromServer();
  }, []);

  const validateStockForSale = useCallback(async (productosVenta) => {
    return await ProductsOfflineController.validateStockForSale(productosVenta);
  }, []);

  const processSaleStockUpdate = useCallback(
    async (productosVenta, ventaId = null) => {
      return await ProductsOfflineController.processSaleStockUpdate(
        productosVenta,
        ventaId
      );
    },
    []
  );

  // 🔄 SINCRONIZACIÓN
  const fullSync = useCallback(async () => {
    return await SyncController.fullSync();
  }, []);

  const getSyncStatus = useCallback(async () => {
    return await SyncController.getSyncStatus();
  }, []);

  const addSyncListener = useCallback((callback) => {
    return SyncController.addSyncListener(callback);
  }, []);

  return {
    // Auth
    loginOffline,
    syncUsers,

    // Sales
    createSaleOffline,
    getPendingSales,

    // Sessions
    openSessionOffline,
    closeSessionOffline,
    getOpenSession,

    // Closures
    createClosureOffline,

    // Products ✅ NUEVO
    getProductsOffline,
    getProductByIdOffline,
    searchProductsOffline,
    updateStockOffline,
    reduceStockOffline,
    getLowStockProductsOffline,
    syncProductsOffline,
    validateStockForSale,
    processSaleStockUpdate,

    // Sync
    fullSync,
    getSyncStatus,
    addSyncListener,
  };
};
