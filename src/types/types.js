// types/types.js - VERSIÓN CORREGIDA
export const types = {
  connectionStatusUpdate: "[connection] Status Update",

  // Auth Types - ✅ CORREGIDOS
  authStartLoading: "[auth] Start Loading",
  authFinishLoading: "[auth] Finish Loading",
  authLogin: "[auth] Login",
  authLogout: "[auth] Logout",
  authCheckingFinish: "[auth] Checking Finish",
  authError: "[auth] Error",
  authClearError: "[auth] Clear Error",
  authSyncComplete: "[auth] Sync Complete",
  authStatsLoaded: "[auth] Stats Loaded",

  // Users - ✅ CORREGIDOS
  usersStartLoading: "[Users] Start loading",
  usersFinishLoading: "[Users] Finish loading",
  usersLoad: "[Users] Load users",
  userAddNew: "[Users] Add new user",
  userUpdated: "[Users] Update user",
  userDeleted: "[Users] Delete user",

  // Product Types - ✅ CORREGIDOS (SIN "s")
  productStartLoading: "[products] Start Loading",
  productFinishLoading: "[products] Finish Loading",
  productsLoad: "[products] Load Products",
  productAddNew: "[products] Add New",
  productUpdated: "[products] Updated",
  productDeleted: "[products] Deleted",
  productSetActive: "[products] Set Active",
  productUpdateStock: "[products] Update Stock",

  // Category Types - ✅ CORREGIDOS (SIN "s")
  categoryStartLoading: "[categories] Start Loading",
  categoryFinishLoading: "[categories] Finish Loading",
  categoriesLoad: "[categories] Load Categories",
  categoryAddNew: "[categories] Add New",
  categoryUpdated: "[categories] Updated",
  categoryDeleted: "[categories] Deleted",
  categorySetActive: "[categories] Set Active",

  // Sales Types - ✅ CORREGIDOS
  salesStartLoading: "[sales] Start Loading",
  salesFinishLoading: "[sales] Finish Loading",
  salesLoad: "[sales] Load Sales",
  saleAddNew: "[sales] Add New",
  saleUpdated: "[sales] Updated",
  saleSetActive: "[sales] Set Active",
  salesLoadByDate: "[sales] Load By Date",

  // Inventory Types - ✅ CORREGIDOS
  inventoryStartLoading: "[inventory] Start Loading",
  inventoryFinishLoading: "[inventory] Finish Loading",
  inventoryLoad: "[inventory] Load Inventory",
  inventoryUpdateStock: "[inventory] Update Stock",
  inventoryLoadLowStock: "[inventory] Load Low Stock",

  // Cash Closures Types - ✅ CORREGIDOS
  closuresStartLoading: "[closures] Start Loading",
  closuresFinishLoading: "[closures] Finish Loading",
  closuresLoad: "[closures] Load Closures",
  closureAddNew: "[closures] Add New",
  closureSetActive: "[closures] Set Active",
  closureLoadToday: "[closures] Load Today",
  closuresLoadToday: "[Cierres] Load today closure",

  // Cart Types - ✅ CORREGIDOS
  cartAddItem: "[cart] Add Item",
  cartRemoveItem: "[cart] Remove Item",
  cartUpdateQuantity: "[cart] Update Quantity",
  cartClear: "[cart] Clear",

  // DetallesVenta Types - ✅ CORREGIDOS
  detallesVentaStartLoading: "[detallesVenta] Start Loading",
  detallesVentaFinishLoading: "[detallesVenta] Finish Loading",
  detallesVentaLoad: "[detallesVenta] Load Detalles",
  detallesVentaAddNew: "[detallesVenta] Add New",

  // SesionesCaja Types - ✅ CORREGIDOS
  sesionesCajaStartLoading: "[sesionesCaja] Start Loading",
  sesionesCajaFinishLoading: "[sesionesCaja] Finish Loading",
  sesionesCajaLoad: "[sesionesCaja] Load Sesiones",
  sesionesCajaAddNew: "[sesionesCaja] Add New",
  sesionesCajaUpdate: "[sesionesCaja] Update Sesion",
  sesionesCajaSetActive: "[sesionesCaja] Set Active",
  sesionesCajaLoadOpen: "[sesionesCaja] Load Open Sesion",

  // Sync Types - ✅ CORREGIDOS
  syncStart: "[sync] Start",
  syncFinish: "[sync] Finish",
  syncError: "[sync] Error",

  statsLoadDashboard: "[Stats] Load dashboard stats",
};
