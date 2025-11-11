// reducers/productsReducer.js - VERSIÓN MEJORADA
import { types } from "../types/types";

const initialState = {
  products: [], // ✅ PRODUCTOS CON CAMPOS: stock, stock_minimo, etc.
  loading: false,
  error: null,
  activeProduct: null,
  searchResults: [],
  lowStockProducts: [], // ✅ CALCULADO AUTOMÁTICAMENTE desde products
  stats: null,
  lastUpdated: null,
  pendingOperations: 0, // ✅ NUEVO: Contador de operaciones pendientes
  syncStatus: "idle", // ✅ NUEVO: 'idle' | 'syncing' | 'success' | 'error'
};

export const productsReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.productsStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
        syncStatus: "syncing",
      };

    case types.productsFinishLoading:
      return {
        ...state,
        loading: false,
        syncStatus: "idle",
      };

    case types.productsLoad:
      const productsPayload = Array.isArray(action.payload)
        ? action.payload
        : action.payload?.data || action.payload?.products || [];

      console.log(`📦 Reducer: Recibidos ${productsPayload.length} productos`);

      // ✅ ELIMINAR DUPLICADOS ANTES DE GUARDAR EN EL ESTADO
      const uniqueProductsPayload = removeDuplicateProducts(productsPayload);

      console.log(
        `🎯 Reducer: ${uniqueProductsPayload.length} productos únicos después de limpieza`
      );

      // ✅ CALCULAR PRODUCTOS BAJO STOCK AUTOMÁTICAMENTE
      const lowStockProducts = uniqueProductsPayload.filter(
        (product) =>
          product.stock > 0 && product.stock <= (product.stock_minimo || 5)
      );

      // ✅ CALCULAR OPERACIONES PENDIENTES
      const pendingOperations = uniqueProductsPayload.filter(
        (product) =>
          product.sincronizado === false || product.pending_sync === true
      ).length;
      return {
        ...state,
        products: uniqueProductsPayload, // ✅ USAR ARRAY SIN DUPLICADOS
        lowStockProducts: lowStockProducts,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
        pendingOperations,
        syncStatus: "success",
      };

    case types.productAddNew:
      const newProduct = action.payload;
      const exists = state.products.find(
        (p) => p.id === newProduct.id || p.id_local === newProduct.id_local
      );

      const updatedProducts = exists
        ? state.products.map((p) => (p.id === newProduct.id ? newProduct : p))
        : [newProduct, ...state.products];

      // ✅ RECALCULAR LOW STOCK
      const newLowStock = updatedProducts.filter(
        (product) =>
          product.stock > 0 && product.stock <= (product.stock_minimo || 5)
      );

      // ✅ RECALCULAR PENDING OPERATIONS
      const newPendingOps = updatedProducts.filter(
        (product) =>
          product.sincronizado === false || product.pending_sync === true
      ).length;

      return {
        ...state,
        products: updatedProducts,
        lowStockProducts: newLowStock,
        pendingOperations: newPendingOps,
      };

    case types.productUpdated:
      const updatedProduct = action.payload;

      // ✅ ACTUALIZAR EN EL ARRAY DE PRODUCTOS
      const updatedProductsAfterEdit = state.products.map((product) =>
        product.id === updatedProduct.id ||
        product.id_local === updatedProduct.id_local
          ? { ...product, ...updatedProduct }
          : product
      );

      // ✅ ACTUALIZAR EN RESULTADOS DE BÚSQUEDA SI ESTÁ PRESENTE
      const updatedSearchResults = state.searchResults.map((product) =>
        product.id === updatedProduct.id ||
        product.id_local === updatedProduct.id_local
          ? { ...product, ...updatedProduct }
          : product
      );

      // ✅ ACTUALIZAR PRODUCTO ACTIVO SI ES EL ACTUAL
      const updatedActiveProduct =
        state.activeProduct &&
        (state.activeProduct.id === updatedProduct.id ||
          state.activeProduct.id_local === updatedProduct.id_local)
          ? { ...state.activeProduct, ...updatedProduct }
          : state.activeProduct;

      // ✅ RECALCULAR LOW STOCK
      const lowStockAfterEdit = updatedProductsAfterEdit.filter(
        (product) =>
          product.stock > 0 && product.stock <= (product.stock_minimo || 5)
      );

      // ✅ RECALCULAR PENDING OPERATIONS
      const pendingOpsAfterEdit = updatedProductsAfterEdit.filter(
        (product) =>
          product.sincronizado === false || product.pending_sync === true
      ).length;

      return {
        ...state,
        products: updatedProductsAfterEdit,
        searchResults: updatedSearchResults,
        activeProduct: updatedActiveProduct,
        lowStockProducts: lowStockAfterEdit,
        pendingOperations: pendingOpsAfterEdit,
      };

    case types.productDeleted:
      const productIdToDelete = action.payload;

      // ✅ FILTRAR EN PRODUCTOS PRINCIPALES
      const filteredProducts = state.products.filter(
        (product) =>
          product.id !== productIdToDelete &&
          product.id_local !== productIdToDelete
      );

      // ✅ FILTRAR EN RESULTADOS DE BÚSQUEDA
      const filteredSearchResults = state.searchResults.filter(
        (product) =>
          product.id !== productIdToDelete &&
          product.id_local !== productIdToDelete
      );

      // ✅ LIMPIAR PRODUCTO ACTIVO SI ES EL ELIMINADO
      const filteredActiveProduct =
        state.activeProduct &&
        (state.activeProduct.id === productIdToDelete ||
          state.activeProduct.id_local === productIdToDelete)
          ? null
          : state.activeProduct;

      // ✅ RECALCULAR LOW STOCK
      const lowStockAfterDelete = filteredProducts.filter(
        (product) =>
          product.stock > 0 && product.stock <= (product.stock_minimo || 5)
      );

      // ✅ RECALCULAR PENDING OPERATIONS
      const pendingOpsAfterDelete = filteredProducts.filter(
        (product) =>
          product.sincronizado === false || product.pending_sync === true
      ).length;

      return {
        ...state,
        products: filteredProducts,
        searchResults: filteredSearchResults,
        activeProduct: filteredActiveProduct,
        lowStockProducts: lowStockAfterDelete,
        pendingOperations: pendingOpsAfterDelete,
      };

    case types.productUpdateStock:
      const { productoId, stock_nuevo, producto } = action.payload;

      const productsWithUpdatedStock = state.products.map((product) =>
        product.id === productoId
          ? {
              ...product,
              stock: stock_nuevo,
              stock_anterior: product.stock, // ✅ GUARDAR HISTORIAL
              ...(producto && { ...producto }), // ✅ INCLUIR PRODUCTO COMPLETO SI SE PROVEE
            }
          : product
      );

      // ✅ ACTUALIZAR EN RESULTADOS DE BÚSQUEDA
      const searchResultsWithUpdatedStock = state.searchResults.map((product) =>
        product.id === productoId
          ? {
              ...product,
              stock: stock_nuevo,
              stock_anterior: product.stock,
              ...(producto && { ...producto }),
            }
          : product
      );

      // ✅ ACTUALIZAR PRODUCTO ACTIVO
      const activeProductWithUpdatedStock =
        state.activeProduct && state.activeProduct.id === productoId
          ? {
              ...state.activeProduct,
              stock: stock_nuevo,
              stock_anterior: state.activeProduct.stock,
              ...(producto && { ...producto }),
            }
          : state.activeProduct;

      // ✅ RECALCULAR LOW STOCK
      const lowStockAfterStockUpdate = productsWithUpdatedStock.filter(
        (product) =>
          product.stock > 0 && product.stock <= (product.stock_minimo || 5)
      );

      // ✅ RECALCULAR PENDING OPERATIONS
      const pendingOpsAfterStockUpdate = productsWithUpdatedStock.filter(
        (product) =>
          product.sincronizado === false || product.pending_sync === true
      ).length;

      return {
        ...state,
        products: productsWithUpdatedStock,
        searchResults: searchResultsWithUpdatedStock,
        activeProduct: activeProductWithUpdatedStock,
        lowStockProducts: lowStockAfterStockUpdate,
        pendingOperations: pendingOpsAfterStockUpdate,
      };

    case types.productsUpdateMultipleStocks:
      const stockUpdatesMap = {};
      action.payload.forEach((update) => {
        stockUpdatesMap[update.productoId] = update.nuevoStock;
      });

      const productsWithMultipleUpdates = state.products.map((product) =>
        stockUpdatesMap[product.id] !== undefined
          ? { ...product, stock: stockUpdatesMap[product.id] }
          : product
      );

      // ✅ ACTUALIZAR RESULTADOS DE BÚSQUEDA
      const searchResultsWithMultipleUpdates = state.searchResults.map(
        (product) =>
          stockUpdatesMap[product.id] !== undefined
            ? { ...product, stock: stockUpdatesMap[product.id] }
            : product
      );

      // ✅ ACTUALIZAR PRODUCTO ACTIVO
      const activeProductWithMultipleUpdates =
        state.activeProduct &&
        stockUpdatesMap[state.activeProduct.id] !== undefined
          ? {
              ...state.activeProduct,
              stock: stockUpdatesMap[state.activeProduct.id],
            }
          : state.activeProduct;

      // ✅ RECALCULAR LOW STOCK
      const lowStockAfterMultiple = productsWithMultipleUpdates.filter(
        (product) =>
          product.stock > 0 && product.stock <= (product.stock_minimo || 5)
      );

      // ✅ RECALCULAR PENDING OPERATIONS
      const pendingOpsAfterMultiple = productsWithMultipleUpdates.filter(
        (product) =>
          product.sincronizado === false || product.pending_sync === true
      ).length;

      return {
        ...state,
        products: productsWithMultipleUpdates,
        searchResults: searchResultsWithMultipleUpdates,
        activeProduct: activeProductWithMultipleUpdates,
        lowStockProducts: lowStockAfterMultiple,
        pendingOperations: pendingOpsAfterMultiple,
      };

    case types.productsSearch:
      return {
        ...state,
        searchResults: Array.isArray(action.payload) ? action.payload : [],
      };

    case types.productsLoadLowStock:
      // ✅ MANTENER POR COMPATIBILIDAD, PERO USAR EL CÁLCULO AUTOMÁTICO
      return {
        ...state,
        lowStockProducts: Array.isArray(action.payload)
          ? action.payload
          : state.lowStockProducts,
      };

    case types.productsLoadStats:
      return {
        ...state,
        stats: action.payload,
      };

    case types.productsError:
      return {
        ...state,
        loading: false,
        error: action.payload,
        syncStatus: "error",
      };

    case types.productsReloadFromIndexedDB:
      // ✅ ESTA ACTION DISPARA UNA RECARGA MANUAL
      return {
        ...state,
        loading: true,
        syncStatus: "syncing",
      };

    case types.productsLoadOffline:
      // ✅ CARGA ESPECÍFICA PARA DATOS OFFLINE
      const offlineProducts = Array.isArray(action.payload)
        ? action.payload
        : [];

      const offlineLowStock = offlineProducts.filter(
        (product) =>
          product.stock > 0 && product.stock <= (product.stock_minimo || 5)
      );

      const offlinePendingOps = offlineProducts.filter(
        (product) =>
          product.sincronizado === false || product.pending_sync === true
      ).length;

      return {
        ...state,
        products: offlineProducts,
        lowStockProducts: offlineLowStock,
        pendingOperations: offlinePendingOps,
        loading: false,
        syncStatus: "success",
        lastUpdated: new Date().toISOString(),
      };

    default:
      return state;
  }
};
