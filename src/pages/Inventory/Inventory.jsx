// // pages/Inventory/Inventory.jsx
// import { useState, useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import DashboardLayout from "../../components/layout/DashboardLayout/DashboardLayout";
// import {
//   loadInventory,
//   updateStock,
//   getPendingStockCount,
//   syncPendingStock,
// } from "../../actions/inventoryActions";
// import {
//   FiPackage,
//   FiAlertTriangle,
//   FiCheckCircle,
//   FiRefreshCw,
//   FiEdit,
//   FiShield,
//   FiEye,
//   FiWifi,
//   FiWifiOff,
// } from "react-icons/fi";
// import Swal from "sweetalert2";
// import styles from "./Inventory.module.css";

// const Inventory = () => {
//   const dispatch = useDispatch();
//   const { inventory, loading } = useSelector((state) => state.inventory);
//   const { user: currentUser } = useSelector((state) => state.auth);
//   const [editingStock, setEditingStock] = useState(null);
//   const [newStockValue, setNewStockValue] = useState("");
//   const [refreshTrigger, setRefreshTrigger] = useState(0);
//   const [pendingUpdates, setPendingUpdates] = useState(0);
//   const [isOnline, setIsOnline] = useState(navigator.onLine);

//   // ✅ EFFECT PARA DETECTAR CONEXIÓN
//   useEffect(() => {
//     const handleOnline = () => {
//       setIsOnline(true);
//       console.log("🌐 Conexión recuperada - Inventory");
//     };

//     const handleOffline = () => {
//       setIsOnline(false);
//       console.log("📴 Sin conexión - Inventory");
//     };

//     window.addEventListener("online", handleOnline);
//     window.addEventListener("offline", handleOffline);

//     return () => {
//       window.removeEventListener("online", handleOnline);
//       window.removeEventListener("offline", handleOffline);
//     };
//   }, []);

//   // ✅ EFFECT PARA ACTUALIZAR CONTADOR DE PENDIENTES (CORREGIDO)
//   // ✅ EFFECT MEJORADO: Actualizar contador de pendientes periódicamente
//   useEffect(() => {
//     const updatePendingCount = async () => {
//       try {
//         const count = await dispatch(getPendingStockCount());
//         setPendingUpdates(count || 0);
//         console.log(`📦 Inventory: ${count} actualizaciones pendientes`);
//       } catch (error) {
//         console.error("❌ Error obteniendo pendientes:", error);
//         setPendingUpdates(0);
//       }
//     };

//     updatePendingCount();

//     // ✅ Actualizar cada 10 segundos cuando hay pendientes
//     const interval =
//       pendingUpdates > 0 ? setInterval(updatePendingCount, 10000) : null;

//     return () => {
//       if (interval) clearInterval(interval);
//     };
//   }, [dispatch, pendingUpdates]);

//   // ✅ EFFECT CORREGIDO: Cargar inventario solo cuando sea necesario
//   useEffect(() => {
//     console.log("🔄 Inventory: Cargando datos...");
//     dispatch(loadInventory());
//   }, [dispatch]);

//   // ✅ EFFECT PARA DETECTAR CAMBIOS EN PENDIENTES
//   useEffect(() => {
//     const handlePendingUpdatesChanged = () => {
//       console.log(
//         "🔄 Inventory: Evento de cambio recibido, actualizando contador..."
//       );
//       dispatch(getPendingStockCount()).then((count) => {
//         setPendingUpdates(count || 0);
//       });
//     };

//     window.addEventListener(
//       "pendingUpdatesChanged",
//       handlePendingUpdatesChanged
//     );

//     return () => {
//       window.removeEventListener(
//         "pendingUpdatesChanged",
//         handlePendingUpdatesChanged
//       );
//     };
//   }, [dispatch]);

//   // ✅ PROTEGER CONTRA DATOS INVALIDOS
//   const safeProducts = Array.isArray(inventory) ? inventory : [];

//   const lowStockProducts = safeProducts.filter(
//     (p) => p.stock_actual <= (p.stock_minimo || 5) && p.stock_actual > 0
//   );
//   const outOfStockProducts = safeProducts.filter((p) => p.stock_actual === 0);
//   const healthyStockProducts = safeProducts.filter(
//     (p) => p.stock_actual > (p.stock_minimo || 5)
//   );

//   // ✅ FUNCIÓN PARA SOLICITAR CONTRASEÑA DE ADMIN
//   const requestAdminPassword = async (action = "realizar esta acción") => {
//     if (currentUser.rol === "admin") {
//       return true;
//     }

//     const { value: password } = await Swal.fire({
//       title: "Se requiere autorización de administrador",
//       text: `Para ${action}, ingresa la contraseña de un administrador`,
//       input: "password",
//       inputLabel: "Contraseña de Administrador",
//       inputPlaceholder: "Ingresa la contraseña...",
//       inputAttributes: {
//         maxlength: 50,
//         autocapitalize: "off",
//         autocorrect: "off",
//       },
//       showCancelButton: true,
//       confirmButtonText: "Autorizar",
//       cancelButtonText: "Cancelar",
//       confirmButtonColor: "#10b981",
//       cancelButtonColor: "#6b7280",
//       inputValidator: (value) => {
//         if (!value) {
//           return "La contraseña es requerida";
//         }
//       },
//     });

//     return password;
//   };

//   // ✅ FUNCIÓN PARA SINCRONIZAR STOCK PENDIENTE
//   const handleSyncPendingStock = async () => {
//     if (!isOnline) {
//       Swal.fire({
//         icon: "warning",
//         title: "Sin conexión",
//         text: "No hay conexión a internet para sincronizar",
//         confirmButtonText: "Entendido",
//       });
//       return;
//     }

//     Swal.fire({
//       title: "Sincronizando Stock",
//       text: "Actualizando cambios pendientes...",
//       allowOutsideClick: false,
//       didOpen: () => {
//         Swal.showLoading();
//       },
//     });

//     const result = await dispatch(syncPendingStock());

//     Swal.close();

//     if (result && result.success > 0) {
//       await Swal.fire({
//         icon: "success",
//         title: "Stock Sincronizado",
//         text: `${result.success} actualizaciones procesadas`,
//         timer: 2000,
//         showConfirmButton: false,
//       });

//       // Recargar inventario después de sincronizar
//       setTimeout(() => {
//         dispatch(loadInventory());
//         setRefreshTrigger((prev) => prev + 1);
//       }, 1000);
//     }
//   };

//   const handleUpdateStock = async (productoId) => {
//     if (!newStockValue || isNaN(newStockValue)) return;

//     // ✅ VERIFICAR PERMISOS PARA ACTUALIZAR STOCK
//     let adminPassword;
//     if (currentUser.rol !== "admin") {
//       adminPassword = await requestAdminPassword("actualizar el stock");
//       if (!adminPassword) return; // Usuario canceló
//     }

//     const stockData = {
//       stock: parseInt(newStockValue),
//       // ✅ INCLUIR CONTRASEÑA DE ADMIN SI FUE SOLICITADA
//       ...(currentUser.rol !== "admin" && { adminPassword }),
//     };

//     const success = await dispatch(updateStock(productoId, stockData));

//     if (success) {
//       setEditingStock(null);
//       setNewStockValue("");

//       // ✅ SOLO RECARGAR SI ESTÁ ONLINE
//       if (isOnline) {
//         setTimeout(() => {
//           dispatch(loadInventory());
//           setRefreshTrigger((prev) => prev + 1);
//         }, 500);
//       }
//     }
//   };

//   // ✅ FUNCIÓN MEJORADA PARA ACTUALIZAR MANUALMENTE
//   const handleRefreshInventory = () => {
//     dispatch(loadInventory());
//     setRefreshTrigger((prev) => prev + 1);
//   };

//   const startEditingStock = async (product) => {
//     // ✅ VERIFICAR PERMISOS PARA EDITAR STOCK
//     if (currentUser.rol !== "admin") {
//       const adminPassword = await requestAdminPassword("editar el stock");
//       if (!adminPassword) return; // Usuario canceló
//     }

//     setEditingStock(product.producto_id || product.id);
//     setNewStockValue((product.stock_actual || product.stock).toString());
//   };

//   const cancelEditing = () => {
//     setEditingStock(null);
//     setNewStockValue("");
//   };

//   const getStockStatus = (product) => {
//     const stock = product.stock_actual || product.stock;
//     const stockMinimo = product.stock_minimo || 5;

//     if (stock === 0) return "out-of-stock";
//     if (stock <= stockMinimo) return "low-stock";
//     return "healthy";
//   };

//   const getStatusColor = (status) => {
//     switch (status) {
//       case "out-of-stock":
//         return "#dc2626";
//       case "low-stock":
//         return "#d97706";
//       case "healthy":
//         return "#059669";
//       default:
//         return "#6b7280";
//     }
//   };

//   const getStatusIcon = (status) => {
//     switch (status) {
//       case "out-of-stock":
//         return <FiAlertTriangle className={styles.statusIcon} />;
//       case "low-stock":
//         return <FiAlertTriangle className={styles.statusIcon} />;
//       case "healthy":
//         return <FiCheckCircle className={styles.statusIcon} />;
//       default:
//         return <FiPackage className={styles.statusIcon} />;
//     }
//   };

//   // ✅ FUNCIÓN PARA OBTENER TEXTO DE PERMISOS
//   const getPermissionText = () => {
//     if (currentUser.rol === "admin") {
//       return "Tienes permisos completos para gestionar el inventario";
//     } else {
//       return "Algunas acciones requieren autorización de administrador";
//     }
//   };

//   // ✅ FUNCIÓN PARA OBTENER TEXTO DE ESTADO DE CONEXIÓN
//   const getConnectionText = () => {
//     if (isOnline) {
//       return pendingUpdates > 0
//         ? `${pendingUpdates} actualización(es) pendiente(s)`
//         : "Todo sincronizado";
//     } else {
//       return `${pendingUpdates} cambio(s) guardado(s) localmente`;
//     }
//   };

//   if (loading) {
//     return (
//       <div className={styles.loadingContainer}>
//         <div className={styles.spinner}></div>
//         <p>Cargando inventario...</p>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.inventoryPage}>
//       <div className={styles.pageHeader}>
//         <div className={styles.headerContent}>
//           <h1>Gestión de Inventario</h1>
//           <p>Control de stock y alertas del sistema</p>
//           <div className={styles.permissionInfo}>
//             <FiShield className={styles.permissionIcon} />
//             <span>{getPermissionText()}</span>

//             {/* ✅ INDICADOR DE CONEXIÓN Y PENDIENTES */}
//             <div
//               className={`${styles.connectionStatus} ${
//                 isOnline ? styles.online : styles.offline
//               }`}
//             >
//               <div className={styles.connectionIcon}>
//                 {isOnline ? <FiWifi /> : <FiWifiOff />}
//               </div>
//               <div className={styles.connectionText}>
//                 <span className={styles.connectionState}>
//                   {isOnline ? "En línea" : "Modo offline"}
//                 </span>
//                 <span className={styles.pendingText}>
//                   {getConnectionText()}
//                 </span>
//               </div>
//               {pendingUpdates > 0 && isOnline && (
//                 <button
//                   className={styles.syncButton}
//                   onClick={handleSyncPendingStock}
//                   title="Sincronizar cambios pendientes"
//                 >
//                   <FiRefreshCw className={styles.syncIcon} />
//                   Sincronizar
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//         <div className={styles.headerStats}>
//           <div className={styles.stat}>
//             <span className={styles.statNumber}>{safeProducts.length}</span>
//             <span className={styles.statLabel}>Total</span>
//           </div>
//           <div className={`${styles.stat} ${styles.healthy}`}>
//             <span className={styles.statNumber}>
//               {healthyStockProducts.length}
//             </span>
//             <span className={styles.statLabel}>Óptimo</span>
//           </div>
//           <div className={`${styles.stat} ${styles.warning}`}>
//             <span className={styles.statNumber}>{lowStockProducts.length}</span>
//             <span className={styles.statLabel}>Bajo Stock</span>
//           </div>
//           <div className={`${styles.stat} ${styles.danger}`}>
//             <span className={styles.statNumber}>
//               {outOfStockProducts.length}
//             </span>
//             <span className={styles.statLabel}>Agotados</span>
//           </div>
//         </div>
//       </div>

//       {/* ✅ RESUMEN DE ALERTAS */}
//       <div className={styles.alertsSummary}>
//         {outOfStockProducts.length > 0 && (
//           <div className={styles.alertCard}>
//             <div className={styles.alertHeader}>
//               <div className={styles.alertTitle}>
//                 <FiAlertTriangle className={styles.alertIcon} />
//                 <h3>Productos Agotados</h3>
//               </div>
//               <span className={styles.alertCount}>
//                 {outOfStockProducts.length}
//               </span>
//             </div>
//             <p>Productos que necesitan reabastecimiento urgente</p>
//           </div>
//         )}

//         {lowStockProducts.length > 0 && (
//           <div className={`${styles.alertCard} ${styles.warning}`}>
//             <div className={styles.alertHeader}>
//               <div className={styles.alertTitle}>
//                 <FiAlertTriangle className={styles.alertIcon} />
//                 <h3>Stock Bajo</h3>
//               </div>
//               <span className={styles.alertCount}>
//                 {lowStockProducts.length}
//               </span>
//             </div>
//             <p>Productos cerca del nivel mínimo de stock</p>
//           </div>
//         )}

//         {safeProducts.length === 0 && (
//           <div className={`${styles.alertCard} ${styles.info}`}>
//             <div className={styles.alertHeader}>
//               <div className={styles.alertTitle}>
//                 <FiPackage className={styles.alertIcon} />
//                 <h3>Sin Productos</h3>
//               </div>
//             </div>
//             <p>No hay productos cargados en el sistema</p>
//           </div>
//         )}
//       </div>

//       {/* ✅ LISTA DETALLADA DE INVENTARIO */}
//       {safeProducts.length > 0 && (
//         <div className={styles.inventorySection}>
//           <div className={styles.sectionHeader}>
//             <h2>
//               <FiPackage className={styles.sectionIcon} />
//               Inventario Completo
//             </h2>
//             <div className={styles.sectionActions}>
//               <span className={styles.userRoleBadge}>
//                 <FiShield className={styles.roleIcon} />
//                 {currentUser.rol === "admin" ? "Administrador" : "Vendedor"}
//               </span>
//               <button
//                 className={styles.refreshButton}
//                 onClick={handleRefreshInventory}
//               >
//                 <FiRefreshCw className={styles.refreshIcon} />
//                 Actualizar
//               </button>
//             </div>
//           </div>

//           <div className={styles.inventoryTable}>
//             <div className={styles.tableHeader}>
//               <span>Producto</span>
//               <span>Stock Actual</span>
//               <span>Stock Mínimo</span>
//               <span>Estado</span>
//               <span>Acciones</span>
//             </div>

//             <div className={styles.tableBody}>
//               {safeProducts.map((product) => {
//                 const status = getStockStatus(product);
//                 const canEditStock = currentUser.rol === "admin";
//                 const productId = product.producto_id || product.id;
//                 const stockActual = product.stock_actual || product.stock;
//                 const stockMinimo = product.stock_minimo || 5;
//                 const productName = product.producto_nombre || product.nombre;

//                 return (
//                   <div key={productId} className={styles.productRow}>
//                     <div className={styles.productInfo}>
//                       <span className={styles.productName}>{productName}</span>
//                       {product.categoria_nombre && (
//                         <span className={styles.productCategory}>
//                           {product.categoria_nombre}
//                         </span>
//                       )}
//                     </div>

//                     <div className={styles.stockInfo}>
//                       {editingStock === productId ? (
//                         <input
//                           type="number"
//                           value={newStockValue}
//                           onChange={(e) => setNewStockValue(e.target.value)}
//                           className={styles.stockInput}
//                           min="0"
//                           onKeyPress={(e) => {
//                             if (e.key === "Enter") {
//                               handleUpdateStock(productId);
//                             }
//                           }}
//                         />
//                       ) : (
//                         <span className={styles.stockValue}>{stockActual}</span>
//                       )}
//                     </div>

//                     <div className={styles.minStock}>
//                       <span>{stockMinimo}</span>
//                     </div>

//                     <div className={styles.status}>
//                       <div
//                         className={styles.statusBadge}
//                         style={{ backgroundColor: getStatusColor(status) }}
//                       >
//                         {getStatusIcon(status)}
//                         <span>
//                           {status === "out-of-stock" && "Agotado"}
//                           {status === "low-stock" && "Bajo Stock"}
//                           {status === "healthy" && "Óptimo"}
//                         </span>
//                       </div>
//                     </div>

//                     <div className={styles.actions}>
//                       {editingStock === productId ? (
//                         <div className={styles.editActions}>
//                           <button
//                             className={styles.saveButton}
//                             onClick={() => handleUpdateStock(productId)}
//                             disabled={!newStockValue || isNaN(newStockValue)}
//                           >
//                             Guardar
//                           </button>
//                           <button
//                             className={styles.cancelButton}
//                             onClick={cancelEditing}
//                           >
//                             Cancelar
//                           </button>
//                         </div>
//                       ) : (
//                         <button
//                           className={`${styles.editButton} ${
//                             !canEditStock ? styles.viewOnly : ""
//                           }`}
//                           onClick={() => startEditingStock(product)}
//                           title={
//                             canEditStock
//                               ? "Editar stock del producto"
//                               : "Solo visualización - Requiere autorización de administrador"
//                           }
//                         >
//                           {canEditStock ? (
//                             <>
//                               <FiEdit className={styles.editIcon} />
//                               Editar Stock
//                             </>
//                           ) : (
//                             <>
//                               <FiEye className={styles.viewIcon} />
//                               Ver Stock
//                               <FiShield className={styles.shieldIcon} />
//                             </>
//                           )}
//                         </button>
//                       )}
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           </div>

//           {/* ✅ INFORMACIÓN DE PERMISOS AL FINAL */}
//           <div className={styles.permissionsFooter}>
//             <div className={styles.permissionNote}>
//               <FiShield className={styles.noteIcon} />
//               <div>
//                 <strong>Información de permisos:</strong>
//                 <ul>
//                   <li>
//                     <strong>Administradores:</strong> Pueden editar stock
//                     directamente
//                   </li>
//                   <li>
//                     <strong>Vendedores:</strong> Solo visualización. Para editar
//                     stock requieren autorización de administrador
//                   </li>
//                   <li>
//                     <strong>Modo Offline:</strong> Los cambios se guardan
//                     localmente y se sincronizan al recuperar conexión
//                   </li>
//                 </ul>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Inventory;
// pages/Inventory/Inventory.jsx - VERSIÓN BLOQUEADA
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  FiPackage,
  FiClock,
  FiAlertTriangle,
  FiWifi,
  FiCode,
} from "react-icons/fi";
import styles from "./Inventory.module.css";

const Inventory = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    console.log("🚫 Inventory: Acceso bloqueado - Módulo en desarrollo");
  }, [dispatch]);

  return (
    <div className={styles.comingSoonPage}>
      <div className={styles.comingSoonContainer}>
        <div className={styles.comingSoonIcon}>
          <FiPackage className={styles.mainIcon} />
          <div className={styles.badge}>
            <FiClock className={styles.badgeIcon} />
          </div>
        </div>

        <h1 className={styles.comingSoonTitle}>Módulo en Desarrollo</h1>

        <p className={styles.comingSoonDescription}>
          El módulo de Gestión de Inventario estará disponible próximamente.
          Estamos trabajando para ofrecerte la mejor experiencia.
        </p>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <FiPackage className={styles.featureIcon} />
            <h3>Control de Stock</h3>
            <p>Gestión completa de inventario en tiempo real</p>
          </div>

          <div className={styles.featureCard}>
            <FiAlertTriangle className={styles.featureIcon} />
            <h3>Alertas Inteligentes</h3>
            <p>Notificaciones automáticas de stock bajo</p>
          </div>

          <div className={styles.featureCard}>
            <FiWifi className={styles.featureIcon} />
            <h3>Sincronización</h3>
            <p>Funcionamiento online y offline</p>
          </div>
        </div>

        <div className={styles.estimatedTime}>
          <div className={styles.timeBadge}>
            <FiCode className={styles.timeIcon} />
            <span>Disponible en: Próxima Actualización</span>
          </div>
        </div>

        <div className={styles.contactInfo}>
          <p>
            ¿Necesitas gestión de inventario urgentemente?
            <br />
            <strong>Contacta al equipo de desarrollo</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
