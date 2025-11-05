// types/types.js - VERSIÓN CORREGIDA Y LIMPIA
export const types = {
  // Connection Types
  connectionStatusUpdate: "[connection] Status Update",

  // Auth Types
  authStartLoading: "[auth] Start Loading",
  authFinishLoading: "[auth] Finish Loading",
  authLogin: "[auth] Login",
  authLogout: "[auth] Logout",
  authCheckingFinish: "[auth] Checking Finish",
  authError: "[auth] Error",
  authClearError: "[auth] Clear Error",
  authSyncComplete: "[auth] Sync Complete",
  authStatsLoaded: "[auth] Stats Loaded",

  // Users Types
  usersStartLoading: "[users] Start Loading",
  usersFinishLoading: "[users] Finish Loading",
  usersLoad: "[users] Load Users",
  userAddNew: "[users] Add New",
  userUpdated: "[users] Update User",
  userDeleted: "[users] Delete User",
  userSetActive: "[users] Set Active",
  userClearActive: "[users] Clear Active",

  // Product Types
  productsStartLoading: "[products] Start Loading",
  productsFinishLoading: "[products] Finish Loading",
  productsLoad: "[products] Load Products",
  productAddNew: "[products] Add New",
  productUpdated: "[products] Update Product",
  productDeleted: "[products] Delete Product",
  productSetActive: "[products] Set Active",
  productClearActive: "[products] Clear Active",
  productUpdateStock: "[products] Update Stock",
  productsSearch: "[products] Search Products",
  productsLoadLowStock: "[products] Load Low Stock",
  productsLoadStats: "[products] Load Stats",

  // Category Types
  categoriesStartLoading: "[categories] Start Loading",
  categoriesFinishLoading: "[categories] Finish Loading",
  categoriesLoad: "[categories] Load Categories",
  categoryAddNew: "[categories] Add New",
  categoryUpdated: "[categories] Update Category",
  categoryDeleted: "[categories] Delete Category",
  categorySetActive: "[categories] Set Active",
  categoryClearActive: "[categories] Clear Active",

  // Sales Types
  salesStartLoading: "[sales] Start Loading",
  salesFinishLoading: "[sales] Finish Loading",
  salesLoad: "[sales] Load Sales",
  saleAddNew: "[sales] Add New",
  saleUpdated: "[sales] Update Sale",
  saleDeleted: "[sales] Delete Sale",
  saleSetActive: "[sales] Set Active",
  saleClearActive: "[sales] Clear Active",
  salesLoadByDate: "[sales] Load By Date",

  // Inventory Types
  inventoryStartLoading: "[inventory] Start Loading",
  inventoryFinishLoading: "[inventory] Finish Loading",
  inventoryLoad: "[inventory] Load Inventory",
  inventoryUpdateStock: "[inventory] Update Stock",
  inventoryLoadLowStock: "[inventory] Load Low Stock",

  // Cash Closures Types
  closuresStartLoading: "[closures] Start Loading",
  closuresFinishLoading: "[closures] Finish Loading",
  closuresLoad: "[closures] Load Closures",
  closureAddNew: "[closures] Add New",
  closureUpdated: "[closures] Update Closure",
  closureDeleted: "[closures] Delete Closure",
  closureSetActive: "[closures] Set Active",
  closureClearActive: "[closures] Clear Active",
  closureLoadToday: "[closures] Load Today",

  // Cart Types
  cartAddItem: "[cart] Add Item",
  cartRemoveItem: "[cart] Remove Item",
  cartUpdateQuantity: "[cart] Update Quantity",
  cartClear: "[cart] Clear",
  cartSetActive: "[cart] Set Active",

  // DetallesVenta Types
  detallesVentaStartLoading: "[detallesVenta] Start Loading",
  detallesVentaFinishLoading: "[detallesVenta] Finish Loading",
  detallesVentaLoad: "[detallesVenta] Load Detalles",
  detallesVentaAddNew: "[detallesVenta] Add New",

  // SesionesCaja Types
  sesionesCajaStartLoading: "[sesionesCaja] Start Loading",
  sesionesCajaFinishLoading: "[sesionesCaja] Finish Loading",
  sesionesCajaLoad: "[sesionesCaja] Load Sesiones",
  sesionesCajaAddNew: "[sesionesCaja] Add New",
  sesionesCajaUpdated: "[sesionesCaja] Update Sesion",
  sesionesCajaDeleted: "[sesionesCaja] Delete Sesion",
  sesionesCajaSetActive: "[sesionesCaja] Set Active",
  sesionesCajaClearActive: "[sesionesCaja] Clear Active",
  sesionesCajaLoadOpen: "[sesionesCaja] Load Open Sesion",

  // Sync Types
  syncStart: "[sync] Start",
  syncFinish: "[sync] Finish",
  syncError: "[sync] Error",
  syncProgress: "[sync] Progress",

  // Stats Types
  statsStartLoading: "[stats] Start Loading",
  statsFinishLoading: "[stats] Finish Loading",
  statsLoadDashboard: "[stats] Load Dashboard Stats",
  statsLoadSales: "[stats] Load Sales Stats",
  statsLoadProducts: "[stats] Load Products Stats",

  // ✅ TYPES PARA OPERACIONES OFFLINE (NUEVOS)
  sesionCajaClosedOffline: "[SESION_CAJA] Sesión cerrada offline",
  sesionCajaAddNewOffline: "[SESION_CAJA] Sesión agregada offline",
  closureAddNewOffline: "[CLOSURE] Cierre agregado offline",
  sesionesCajaUpdateFromOffline: "[SESIONES_CAJA] Actualizar desde offline",
  closuresUpdateFromOffline: "[CLOSURES] Actualizar desde offline",

  // ✅ PARA ACTUALIZAR CONTADORES DE PENDIENTES
  updatePendingCounts: "[sync] Update Pending Counts",
  // ✅ NUEVO TYPE PARA ACTUALIZAR MÚLTIPLES STOCKS
  productsUpdateMultipleStocks: "[products] Update Multiple Stocks",
};
