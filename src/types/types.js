// types/types.js - VERSIÓN COMPLETA CON TODOS LOS TYPES OFFLINE
export const types = {
  // =============================================
  // 🔗 CONNECTION TYPES
  // =============================================
  connectionStatusUpdate: "[connection] Status Update",
  connectionSetOnline: "[connection] Set Online",
  connectionSetOffline: "[connection] Set Offline",

  // =============================================
  // 🔐 AUTH TYPES
  // =============================================
  authStartLoading: "[auth] Start Loading",
  authFinishLoading: "[auth] Finish Loading",
  authLogin: "[auth] Login",
  authLogout: "[auth] Logout",
  authCheckingFinish: "[auth] Checking Finish",
  authError: "[auth] Error",
  authClearError: "[auth] Clear Error",
  authSyncComplete: "[auth] Sync Complete",
  authStatsLoaded: "[auth] Stats Loaded",

  // =============================================
  // 👥 USERS TYPES
  // =============================================
  usersStartLoading: "[users] Start Loading",
  usersFinishLoading: "[users] Finish Loading",
  usersLoad: "[users] Load Users",
  userAddNew: "[users] Add New",
  userUpdated: "[users] Update User",
  userDeleted: "[users] Delete User",
  userSetActive: "[users] Set Active",
  userClearActive: "[users] Clear Active",

  // =============================================
  // 📦 PRODUCT TYPES
  // =============================================
  productsStartLoading: "[products] Start Loading",
  productsFinishLoading: "[products] Finish Loading",
  productsLoad: "[products] Load Products",
  productsLoadOffline: "[products] Load Products Offline", // ✅ NUEVO
  productAddNew: "[products] Add New",
  productAddNewOffline: "[products] Add New Offline", // ✅ NUEVO
  productUpdated: "[products] Update Product",
  productUpdatedOffline: "[products] Update Product Offline", // ✅ NUEVO
  productDeleted: "[products] Delete Product",
  productSetActive: "[products] Set Active",
  productClearActive: "[products] Clear Active",
  productUpdateStock: "[products] Update Stock",
  productUpdateStockOffline: "[products] Update Stock Offline", // ✅ NUEVO
  productsSearch: "[products] Search Products",
  productsLoadLowStock: "[products] Load Low Stock",
  productsLoadStats: "[products] Load Stats",
  productsUpdateMultipleStocks: "[products] Update Multiple Stocks",
  productsError: "[products] Error", // ✅ AGREGAR PARA MANEJAR ERRORES
  productsReloadFromIndexedDB: "[products] Reload From IndexedDB", // ✅ NUEVO

  // =============================================
  // 📂 CATEGORY TYPES
  // =============================================
  categoriesStartLoading: "[categories] Start Loading",
  categoriesFinishLoading: "[categories] Finish Loading",
  categoriesLoad: "[categories] Load Categories",
  categoriesLoadOffline: "[categories] Load Categories Offline", // ✅ NUEVO
  categoryAddNew: "[categories] Add New",
  categoryUpdated: "[categories] Update Category",
  categoryDeleted: "[categories] Delete Category",
  categorySetActive: "[categories] Set Active",
  categoryClearActive: "[categories] Clear Active",

  // =============================================
  // 💰 SALES TYPES - EXPANDIDOS PARA OFFLINE
  // =============================================
  salesStartLoading: "[sales] Start Loading",
  salesFinishLoading: "[sales] Finish Loading",
  salesLoad: "[sales] Load Sales",
  salesLoadOffline: "[sales] Load Sales Offline", // ✅ NUEVO
  saleAddNew: "[sales] Add New",
  saleAddNewOffline: "[sales] Add New Offline", // ✅ NUEVO
  saleCreate: "[sales] Create Sale", // ✅ FALTABA ESTE
  saleCreateOffline: "[SALE] Create Offline", // ✅ NUEVO
  saleUpdated: "[sales] Update Sale",
  saleDeleted: "[sales] Delete Sale",
  saleSetActive: "[sales] Set Active",
  saleClearActive: "[sales] Clear Active",
  salesLoadByDate: "[sales] Load By Date",
  salesLoadPending: "[SALES] Load Pending", // ✅ NUEVO
  saleMarkSynced: "[SALE] Mark Synced", // ✅ NUEVO
  saleSyncPending: "[SALE] Sync Pending", // ✅ NUEVO

  // =============================================
  // 📊 INVENTORY TYPES
  // =============================================
  inventoryStartLoading: "[inventory] Start Loading",
  inventoryFinishLoading: "[inventory] Finish Loading",
  inventoryLoad: "[inventory] Load Inventory",
  inventoryUpdateStock: "[inventory] Update Stock",
  inventoryLoadLowStock: "[inventory] Load Low Stock",

  // =============================================
  // 🏦 CASH CLOSURES TYPES
  // =============================================
  closuresStartLoading: "[closures] Start Loading",
  closuresFinishLoading: "[closures] Finish Loading",
  closuresLoad: "[closures] Load Closures",
  closuresLoadOffline: "[closures] Load Closures Offline", // ✅ NUEVO
  closureAddNew: "[closures] Add New",
  closureAddNewOffline: "[closures] Add New Offline", // ✅ NUEVO
  closureUpdated: "[closures] Update Closure",
  closureDeleted: "[closures] Delete Closure",
  closureSetActive: "[closures] Set Active",
  closureClearActive: "[closures] Clear Active",
  closureLoadToday: "[closures] Load Today",
  closuresUpdateFromOffline: "[CLOSURES] Actualizar desde offline",

  // =============================================
  // 🛒 CART TYPES
  // =============================================
  cartAddItem: "[cart] Add Item",
  cartRemoveItem: "[cart] Remove Item",
  cartUpdateQuantity: "[cart] Update Quantity",
  cartClear: "[cart] Clear",
  cartSetActive: "[cart] Set Active",

  // =============================================
  // 📋 DETALLES VENTA TYPES
  // =============================================
  detallesVentaStartLoading: "[detallesVenta] Start Loading",
  detallesVentaFinishLoading: "[detallesVenta] Finish Loading",
  detallesVentaLoad: "[detallesVenta] Load Detalles",
  detallesVentaAddNew: "[detallesVenta] Add New",

  // =============================================
  // 💵 SESIONES CAJA TYPES - EXPANDIDOS
  // =============================================
  sesionesCajaStartLoading: "[sesionesCaja] Start Loading",
  sesionesCajaFinishLoading: "[sesionesCaja] Finish Loading",
  sesionesCajaLoad: "[sesionesCaja] Load Sesiones",
  sesionesCajaLoadOffline: "[sesionesCaja] Load Sesiones Offline", // ✅ NUEVO
  sesionesCajaAddNew: "[sesionesCaja] Add New",
  sesionesCajaAddNewOffline: "[sesionesCaja] Add New Offline", // ✅ NUEVO
  sesionesCajaUpdated: "[sesionesCaja] Update Sesion",
  sesionesCajaDeleted: "[sesionesCaja] Delete Sesion",
  sesionesCajaSetActive: "[sesionesCaja] Set Active",
  sesionesCajaClearActive: "[sesionesCaja] Clear Active",
  sesionesCajaLoadOpen: "[sesionesCaja] Load Open Sesion",
  sesionCajaClosedOffline: "[SESION_CAJA] Sesión cerrada offline",
  sesionCajaAddNewOffline: "[SESION_CAJA] Sesión agregada offline",
  sesionesCajaUpdateFromOffline: "[SESIONES_CAJA] Actualizar desde offline",

  // =============================================
  // 🔄 SYNC TYPES - COMPLETOS
  // =============================================
  syncStart: "[sync] Start",
  syncFinish: "[sync] Finish",
  syncError: "[sync] Error",
  syncProgress: "[sync] Progress",
  syncSalesStart: "[sync] Sales Start", // ✅ NUEVO
  syncSalesFinish: "[sync] Sales Finish", // ✅ NUEVO
  syncSalesError: "[sync] Sales Error", // ✅ NUEVO
  syncProductsStart: "[sync] Products Start", // ✅ NUEVO
  syncProductsFinish: "[sync] Products Finish", // ✅ NUEVO
  syncSessionsStart: "[sync] Sessions Start", // ✅ NUEVO
  syncSessionsFinish: "[sync] Sessions Finish", // ✅ NUEVO
  updatePendingCounts: "[sync] Update Pending Counts",

  // =============================================
  // 📈 STATS TYPES
  // =============================================
  statsStartLoading: "[stats] Start Loading",
  statsFinishLoading: "[stats] Finish Loading",
  statsLoadDashboard: "[stats] Load Dashboard Stats",
  statsLoadSales: "[stats] Load Sales Stats",
  statsLoadProducts: "[stats] Load Products Stats",

  // =============================================
  // 🗃️ INDEXEDDB TYPES
  // =============================================
  indexedDBInitStart: "[indexedDB] Init Start", // ✅ NUEVO
  indexedDBInitSuccess: "[indexedDB] Init Success", // ✅ NUEVO
  indexedDBInitError: "[indexedDB] Init Error", // ✅ NUEVO
  indexedDBClear: "[indexedDB] Clear", // ✅ NUEVO
  indexedDBBackup: "[indexedDB] Backup", // ✅ NUEVO

  // =============================================
  // 🏪 STORE MANAGEMENT TYPES
  // =============================================
  storeReset: "[store] Reset", // ✅ NUEVO
  storeClearAll: "[store] Clear All", // ✅ NUEVO
  storeExportData: "[store] Export Data", // ✅ NUEVO
  storeImportData: "[store] Import Data", // ✅ NUEVO

  // =============================================
  // 🔔 NOTIFICATION TYPES
  // =============================================
  notificationShow: "[notification] Show", // ✅ NUEVO
  notificationHide: "[notification] Hide", // ✅ NUEVO
  notificationClearAll: "[notification] Clear All", // ✅ NUEVO

  // =============================================
  // ⚠️ ERROR HANDLING TYPES
  // =============================================
  errorSet: "[error] Set", // ✅ NUEVO
  errorClear: "[error] Clear", // ✅ NUEVO
  errorShowModal: "[error] Show Modal", // ✅ NUEVO
  errorHideModal: "[error] Hide Modal", // ✅ NUEVO

  // =============================================
  // 📱 OFFLINE QUEUE TYPES
  // =============================================
  queueAddOperation: "[queue] Add Operation", // ✅ NUEVO
  queueRemoveOperation: "[queue] Remove Operation", // ✅ NUEVO
  queueProcessStart: "[queue] Process Start", // ✅ NUEVO
  queueProcessFinish: "[queue] Process Finish", // ✅ NUEVO
  queueClear: "[queue] Clear", // ✅ NUEVO
  queueSetRetryCount: "[queue] Set Retry Count", // ✅ NUEVO

  // =============================================
  // 🎯 SPECIFIC OFFLINE OPERATIONS
  // =============================================
  offlineSaleCreated: "[offline] Sale Created", // ✅ NUEVO
  offlineSaleSynced: "[offline] Sale Synced", // ✅ NUEVO
  offlineStockUpdated: "[offline] Stock Updated", // ✅ NUEVO
  offlineSessionCreated: "[offline] Session Created", // ✅ NUEVO
  offlineClosureCreated: "[offline] Closure Created", // ✅ NUEVO
  offlineDataLoaded: "[offline] Data Loaded", // ✅ NUEVO

  // =============================================
  // 🔍 DEBUG TYPES
  // =============================================
  debugSetEnabled: "[debug] Set Enabled", // ✅ NUEVO
  debugAddLog: "[debug] Add Log", // ✅ NUEVO
  debugClearLogs: "[debug] Clear Logs", // ✅ NUEVO
  debugShowPanel: "[debug] Show Panel", // ✅ NUEVO
  debugHidePanel: "[debug] Hide Panel", // ✅ NUEVO

  // ✅ NUEVOS TYPES PARA ELIMINACIÓN
  closureDeleteLocal: "[Closures] Delete Local Closure",
  closuresClearAllLocal: "[Closures] Clear All Local Closures",
};
