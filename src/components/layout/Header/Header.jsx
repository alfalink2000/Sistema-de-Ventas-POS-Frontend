// // components/layout/Header/Header.jsx - VERSIÓN CORREGIDA
// import { useDispatch, useSelector } from "react-redux";
// import { startLogout } from "../../../actions/authActions";
// import {
//   FiMenu,
//   FiTrendingUp,
//   FiDollarSign,
//   FiWifi,
//   FiWifiOff,
//   FiRefreshCw,
//   FiX,
//   FiCheck,
//   FiPackage,
//   FiEdit,
//   FiTrash2,
//   FiPlus,
//   FiInfo,
// } from "react-icons/fi";
// import styles from "./Header.module.css";
// import { useState, useEffect } from "react";
// import SyncController from "../../../controllers/offline/SyncController/SyncController";
// import Swal from "sweetalert2";

// const Header = ({ user, onToggleSidebar, sidebarOpen }) => {
//   const dispatch = useDispatch();
//   const { sesionAbierta } = useSelector((state) => state.sesionesCaja);
//   const { sales } = useSelector((state) => state.sales);
//   const { products } = useSelector((state) => state.products);

//   // ✅ ESTADOS SIMPLIFICADOS
//   const [isOnline, setIsOnline] = useState(navigator.onLine);
//   const [isSyncing, setIsSyncing] = useState(false);
//   const [showSyncModal, setShowSyncModal] = useState(false);
//   const [pendingCount, setPendingCount] = useState(0);
//   const [syncStatus, setSyncStatus] = useState({
//     pendingSessions: 0,
//     pendingSales: 0,
//     pendingClosures: 0,
//     pendingStock: 0,
//     pendingProducts: 0,
//   });

//   // ✅ CARGAR DATOS PENDIENTES - VERSIÓN CORREGIDA
//   const loadPendingData = async () => {
//     try {
//       const status = await SyncController.getSyncStatus();

//       setPendingCount(status.totalPending || 0);
//       setSyncStatus({
//         pendingSessions: status.pendingSessions || 0,
//         pendingSales: status.pendingSales || 0,
//         pendingClosures: status.pendingClosures || 0,
//         pendingStock: status.pendingStock || 0,
//         pendingProducts: status.pendingProducts || 0,
//       });
//     } catch (error) {
//       console.error("Error cargando estado de sincronización:", error);
//       // Valores por defecto en caso de error
//       setPendingCount(0);
//       setSyncStatus({
//         pendingSessions: 0,
//         pendingSales: 0,
//         pendingClosures: 0,
//         pendingStock: 0,
//         pendingProducts: 0,
//       });
//     }
//   };

//   // ✅ EFFECTS CORREGIDOS
//   useEffect(() => {
//     loadPendingData();

//     // Intervalo para actualizar estado cada 30 segundos
//     const interval = setInterval(loadPendingData, 30000);

//     // Listener para cambios de conexión
//     const handleOnline = () => {
//       setIsOnline(true);
//       loadPendingData();

//       // Auto-sync si hay datos pendientes
//       if (pendingCount > 0) {
//         setTimeout(() => {
//           handleForceSync();
//         }, 5000);
//       }
//     };

//     const handleOffline = () => {
//       setIsOnline(false);
//       loadPendingData();
//     };

//     // Listener para eventos de sincronización
//     const removeListener = SyncController.addSyncListener((event, data) => {
//       if (event === "sync_start") {
//         setIsSyncing(true);
//       } else if (event === "sync_complete" || event === "sync_error") {
//         setIsSyncing(false);
//         loadPendingData();
//       }
//     });

//     // Event listeners del DOM
//     window.addEventListener("online", handleOnline);
//     window.addEventListener("offline", handleOffline);

//     return () => {
//       clearInterval(interval);
//       removeListener();
//       window.removeEventListener("online", handleOnline);
//       window.removeEventListener("offline", handleOffline);
//     };
//   }, [pendingCount]);

//   // ✅ SINCRONIZACIÓN MANUAL - VERSIÓN CORREGIDA
//   const handleForceSync = async () => {
//     if (!isOnline) {
//       Swal.fire({
//         icon: "warning",
//         title: "Sin conexión",
//         text: "No hay conexión a internet para sincronizar",
//         confirmButtonText: "Entendido",
//       });
//       return;
//     }

//     try {
//       setIsSyncing(true);

//       const { value: confirmar } = await Swal.fire({
//         title: "Sincronizar datos pendientes",
//         text: `¿Deseas sincronizar ${pendingCount} elementos pendientes?`,
//         icon: "question",
//         showCancelButton: true,
//         confirmButtonText: "Sí, sincronizar",
//         cancelButtonText: "Cancelar",
//       });

//       if (!confirmar) {
//         setIsSyncing(false);
//         return;
//       }

//       Swal.fire({
//         title: "Sincronizando...",
//         html: "Procesando datos pendientes<br/><small>Por favor espera</small>",
//         allowOutsideClick: false,
//         didOpen: () => Swal.showLoading(),
//       });

//       const syncResult = await SyncController.fullSync();

//       Swal.close();

//       if (syncResult && syncResult.success) {
//         let successMessage = "Sincronización completada";
//         let successDetails = "";

//         // Construir mensaje detallado
//         if (syncResult.steps) {
//           const successfulSteps = [];

//           Object.entries(syncResult.steps).forEach(([name, step]) => {
//             if (step && !step.error) {
//               if (step.success !== undefined && step.success > 0) {
//                 successfulSteps.push(`${name}: ${step.success} exitosos`);
//               } else if (step.exitosas !== undefined && step.exitosas > 0) {
//                 successfulSteps.push(`${name}: ${step.exitosas} exitosos`);
//               } else if (step.total !== undefined && step.total > 0) {
//                 successfulSteps.push(`${name}: ${step.total} procesados`);
//               }
//             }
//           });

//           if (successfulSteps.length > 0) {
//             successDetails = successfulSteps.join(", ");
//           }
//         }

//         await Swal.fire({
//           icon: "success",
//           title: successMessage,
//           html: successDetails
//             ? `
//             <div style="text-align: left;">
//               <p><strong>Resultados:</strong></p>
//               <p>${successDetails}</p>
//             </div>
//           `
//             : "Todos los datos se sincronizaron correctamente",
//           confirmButtonText: "Aceptar",
//         });
//       } else {
//         throw new Error(
//           syncResult?.error || "Error desconocido en sincronización"
//         );
//       }
//     } catch (error) {
//       console.error("Error en sincronización manual:", error);

//       Swal.fire({
//         icon: "error",
//         title: "Error de sincronización",
//         text: error.message || "Ocurrió un error durante la sincronización",
//         confirmButtonText: "Entendido",
//       });
//     } finally {
//       setIsSyncing(false);
//       loadPendingData();
//     }
//   };

//   // ✅ ABRIR MODAL DE DETALLES - CORREGIDO (sin getPendingDetails)
//   const handleShowSyncDetails = () => {
//     setShowSyncModal(true);
//   };

//   // ✅ CÁLCULO DE GANANCIAS - VERSIÓN SEGURA
//   const calcularGananciasSesion = () => {
//     if (!sesionAbierta || !sales || !Array.isArray(sales)) {
//       return { gananciaBruta: 0, ventasTotales: 0, cantidadVentas: 0 };
//     }

//     try {
//       const ventasSesionActual = sales.filter(
//         (venta) =>
//           venta &&
//           (venta.sesion_caja_id === sesionAbierta.id ||
//             venta.sesion_caja_id_local === sesionAbierta.id_local)
//       );

//       if (ventasSesionActual.length === 0) {
//         return { gananciaBruta: 0, ventasTotales: 0, cantidadVentas: 0 };
//       }

//       let gananciaBruta = 0;
//       let ventasTotales = 0;

//       ventasSesionActual.forEach((venta) => {
//         if (!venta) return;

//         ventasTotales += parseFloat(venta.total) || 0;

//         // Estimación simple si no hay detalles de productos
//         gananciaBruta += (parseFloat(venta.total) || 0) * 0.25; // 25% de margen estimado
//       });

//       return {
//         gananciaBruta: Math.round(gananciaBruta * 100) / 100,
//         ventasTotales: Math.round(ventasTotales * 100) / 100,
//         cantidadVentas: ventasSesionActual.length,
//       };
//     } catch (error) {
//       console.error("Error calculando ganancias:", error);
//       return { gananciaBruta: 0, ventasTotales: 0, cantidadVentas: 0 };
//     }
//   };

//   const { gananciaBruta, ventasTotales, cantidadVentas } =
//     calcularGananciasSesion();

//   const formatCurrency = (amount) => {
//     return new Intl.NumberFormat("es-MX", {
//       style: "currency",
//       currency: "MXN",
//     }).format(amount || 0);
//   };

//   // ✅ FUNCIONES AUXILIARES PARA DESCRIBIR OPERACIONES
//   const getOperationDescription = (type, count) => {
//     const descriptions = {
//       sessions: `${count} sesión${count !== 1 ? "es" : ""} de caja`,
//       sales: `${count} venta${count !== 1 ? "s" : ""}`,
//       closures: `${count} cierre${count !== 1 ? "s" : ""} de caja`,
//       stock: `${count} actualización${count !== 1 ? "es" : ""} de stock`,
//       products: `${count} producto${count !== 1 ? "s" : ""}`,
//     };
//     return descriptions[type] || `${count} elemento${count !== 1 ? "s" : ""}`;
//   };

//   // ✅ COMPONENTE MODAL DE SINCRONIZACIÓN - CORREGIDO (sin detalles complejos)
//   const SyncModal = () => {
//     if (!showSyncModal) return null;

//     return (
//       <div className={styles.modalOverlay}>
//         <div className={styles.modalContent}>
//           <div className={styles.modalHeader}>
//             <h3>Estado de Sincronización</h3>
//             <button
//               className={styles.closeButton}
//               onClick={() => setShowSyncModal(false)}
//             >
//               <FiX />
//             </button>
//           </div>

//           <div className={styles.modalBody}>
//             {/* ESTADO DE CONEXIÓN */}
//             <div className={styles.syncStatusSection}>
//               <div
//                 className={`${styles.statusIndicator} ${
//                   isOnline ? styles.online : styles.offline
//                 }`}
//               >
//                 <div className={styles.statusIcon}>
//                   {isOnline ? <FiWifi /> : <FiWifiOff />}
//                 </div>
//                 <div className={styles.statusText}>
//                   <span className={styles.statusTitle}>
//                     {isOnline ? "Conectado al Servidor" : "Modo Offline"}
//                   </span>
//                   <span className={styles.statusSubtitle}>
//                     {isOnline
//                       ? "Sincronización disponible"
//                       : "Datos guardados localmente"}
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* RESUMEN DE DATOS PENDIENTES */}
//             <div className={styles.pendingSummary}>
//               <h4>Datos Pendientes de Sincronización</h4>

//               {pendingCount === 0 ? (
//                 <div className={styles.noPendingData}>
//                   <FiCheck className={styles.successIcon} />
//                   <span>¡Todo sincronizado! No hay datos pendientes.</span>
//                 </div>
//               ) : (
//                 <div className={styles.pendingList}>
//                   {syncStatus.pendingSessions > 0 && (
//                     <div className={styles.pendingItem}>
//                       <FiInfo className={styles.itemIcon} />
//                       <span>
//                         {getOperationDescription(
//                           "sessions",
//                           syncStatus.pendingSessions
//                         )}
//                       </span>
//                     </div>
//                   )}

//                   {syncStatus.pendingSales > 0 && (
//                     <div className={styles.pendingItem}>
//                       <FiDollarSign className={styles.itemIcon} />
//                       <span>
//                         {getOperationDescription(
//                           "sales",
//                           syncStatus.pendingSales
//                         )}
//                       </span>
//                     </div>
//                   )}

//                   {syncStatus.pendingClosures > 0 && (
//                     <div className={styles.pendingItem}>
//                       <FiTrendingUp className={styles.itemIcon} />
//                       <span>
//                         {getOperationDescription(
//                           "closures",
//                           syncStatus.pendingClosures
//                         )}
//                       </span>
//                     </div>
//                   )}

//                   {syncStatus.pendingStock > 0 && (
//                     <div className={styles.pendingItem}>
//                       <FiPackage className={styles.itemIcon} />
//                       <span>
//                         {getOperationDescription(
//                           "stock",
//                           syncStatus.pendingStock
//                         )}
//                       </span>
//                     </div>
//                   )}

//                   {syncStatus.pendingProducts > 0 && (
//                     <div className={styles.pendingItem}>
//                       <FiPackage className={styles.itemIcon} />
//                       <span>
//                         {getOperationDescription(
//                           "products",
//                           syncStatus.pendingProducts
//                         )}
//                       </span>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* INFORMACIÓN ADICIONAL */}
//             <div className={styles.syncInfo}>
//               <div className={styles.infoItem}>
//                 <strong>Total pendiente:</strong> {pendingCount} elemento
//                 {pendingCount !== 1 ? "s" : ""}
//               </div>
//               <div className={styles.infoItem}>
//                 <strong>Estado:</strong>{" "}
//                 {isSyncing
//                   ? "Sincronizando..."
//                   : isOnline
//                   ? "Listo"
//                   : "Offline"}
//               </div>
//               {!isOnline && (
//                 <div className={styles.warningMessage}>
//                   ⚠️ Conecta a internet para sincronizar los datos pendientes
//                 </div>
//               )}
//             </div>
//           </div>

//           <div className={styles.modalFooter}>
//             <button
//               className={styles.secondaryButton}
//               onClick={() => setShowSyncModal(false)}
//             >
//               Cerrar
//             </button>

//             {isOnline && pendingCount > 0 && (
//               <button
//                 className={styles.primaryButton}
//                 onClick={handleForceSync}
//                 disabled={isSyncing}
//               >
//                 {isSyncing ? (
//                   <>
//                     <FiRefreshCw className={styles.spinner} />
//                     Sincronizando...
//                   </>
//                 ) : (
//                   <>
//                     <FiRefreshCw />
//                     Sincronizar Ahora
//                   </>
//                 )}
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     );
//   };

//   return (
//     <header className={styles.header}>
//       <div className={styles.headerLeft}>
//         <div className={styles.menuButtonContainer}>
//           <button className={styles.menuButton} onClick={onToggleSidebar}>
//             <FiMenu className={styles.menuIcon} />
//           </button>
//         </div>
//         <div className={styles.breadcrumb}>
//           <span className={styles.appName}>KioskoFlow</span>
//           <span className={styles.welcomeText}>
//             Sistema POS
//             {!isOnline && (
//               <span className={styles.offlineHeaderBadge}>
//                 <FiWifiOff />
//                 Offline
//               </span>
//             )}
//           </span>
//         </div>
//       </div>

//       <div className={styles.headerRight}>
//         {/* INDICADOR DE SINCRONIZACIÓN */}
//         <div className={styles.syncIndicator} onClick={handleShowSyncDetails}>
//           <div className={styles.syncIconContainer}>
//             <div
//               className={`${styles.syncIcon} ${
//                 isOnline ? styles.online : styles.offline
//               } ${isSyncing ? styles.syncing : ""}`}
//             >
//               {isSyncing ? (
//                 <FiRefreshCw className={styles.syncSpinner} />
//               ) : isOnline ? (
//                 <FiWifi />
//               ) : (
//                 <FiWifiOff />
//               )}
//               {pendingCount > 0 && (
//                 <span className={styles.pendingBadge}>{pendingCount}</span>
//               )}
//             </div>
//           </div>
//           <div className={styles.syncInfo}>
//             <span className={styles.syncStatus}>
//               {isSyncing
//                 ? "Sincronizando..."
//                 : isOnline
//                 ? "En línea"
//                 : "Offline"}
//             </span>
//             {pendingCount > 0 && (
//               <span className={styles.pendingCount}>
//                 {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
//               </span>
//             )}
//           </div>
//         </div>

//         {/* INDICADOR DE GANANCIAS */}
//         {sesionAbierta ? (
//           <div className={styles.earningsIndicator}>
//             <div className={styles.earningsIcon}>
//               <FiTrendingUp />
//             </div>
//             <div className={styles.earningsInfo}>
//               <span className={styles.earningsAmount}>
//                 {formatCurrency(gananciaBruta)}
//               </span>
//               <span className={styles.salesCount}>
//                 {cantidadVentas} venta{cantidadVentas !== 1 ? "s" : ""}
//               </span>
//             </div>
//           </div>
//         ) : (
//           <div className={styles.noSessionIndicator}>
//             <div className={styles.noSessionIcon}>
//               <FiDollarSign />
//             </div>
//             <div className={styles.noSessionInfo}>
//               <span className={styles.noSessionText}>Sin sesión</span>
//             </div>
//           </div>
//         )}

//         {/* USUARIO */}
//         <div className={styles.userInfo}>
//           <div className={styles.userAvatar}>
//             <span className={styles.userInitial}>
//               {user?.nombre?.charAt(0) || user?.name?.charAt(0) || "U"}
//             </span>
//           </div>
//           <div className={styles.userDetails}>
//             <span className={styles.userName}>
//               {user?.nombre || user?.name || "Usuario"}
//             </span>
//             <span className={styles.userRole}>{user?.rol || "Vendedor"}</span>
//           </div>
//         </div>
//       </div>

//       <SyncModal />
//     </header>
//   );
// };

// export default Header;
// components/layout/Header/Header.jsx - VERSIÓN CON BOTÓN DEBUG
// components/layout/Header/Header.jsx - VERSIÓN CORREGIDA SIN FiBug
import { useDispatch, useSelector } from "react-redux";
import { startLogout } from "../../../actions/authActions";
import {
  FiMenu,
  FiTrendingUp,
  FiDollarSign,
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiX,
  FiCheck,
  FiPackage,
  FiInfo,
  FiAlertTriangle, // ✅ USAR ESTE ICONO EN LUGAR DE FiBug
  FiSettings, // ✅ ALTERNATIVA 2
  FiTool, // ✅ ALTERNATIVA 3
} from "react-icons/fi";
import styles from "./Header.module.css";
import { useState, useEffect } from "react";
import SyncController from "../../../controllers/offline/SyncController/SyncController";
import Swal from "sweetalert2";

const Header = ({ user, onToggleSidebar, sidebarOpen }) => {
  const dispatch = useDispatch();
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);
  const { sales } = useSelector((state) => state.sales);
  const { products } = useSelector((state) => state.products);

  // ✅ ESTADOS SIMPLIFICADOS
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState({
    pendingSessions: 0,
    pendingSales: 0,
    pendingClosures: 0,
    pendingStock: 0,
    pendingProducts: 0,
  });

  // ✅ CARGAR DATOS PENDIENTES - VERSIÓN CORREGIDA
  const loadPendingData = async () => {
    try {
      const status = await SyncController.getSyncStatus();

      // ✅ IGNORAR VENTAS PENDIENTES - NO SE MUESTRAN NI SINCRONIZAN
      setPendingCount(status.totalPending || 0);
      setSyncStatus({
        pendingSessions: status.pendingSessions || 0,
        pendingSales: 0, // ✅ FORZAR A CERO EN UI
        pendingClosures: status.pendingClosures || 0,
        pendingStock: status.pendingStock || 0,
        pendingProducts: status.pendingProducts || 0,
      });

      // ✅ LOG PARA DEBUG
      if (status._debug && status._debug.ventasIgnoradas > 0) {
        console.log(
          `⏭️  Ignorando ${status._debug.ventasIgnoradas} ventas pendientes`
        );
      }
    } catch (error) {
      console.error("Error cargando estado de sincronización:", error);
      // Valores por defecto - ventas siempre en 0
      setPendingCount(0);
      setSyncStatus({
        pendingSessions: 0,
        pendingSales: 0,
        pendingClosures: 0,
        pendingStock: 0,
        pendingProducts: 0,
      });
    }
  };
  // ✅ EFFECTS CORREGIDOS
  useEffect(() => {
    loadPendingData();

    // Intervalo para actualizar estado cada 30 segundos
    const interval = setInterval(loadPendingData, 30000);

    // Listener para cambios de conexión
    const handleOnline = () => {
      setIsOnline(true);
      loadPendingData();

      // Auto-sync si hay datos pendientes
      if (pendingCount > 0) {
        setTimeout(() => {
          handleForceSync();
        }, 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      loadPendingData();
    };

    // Listener para eventos de sincronización
    const removeListener = SyncController.addSyncListener((event, data) => {
      if (event === "sync_start") {
        setIsSyncing(true);
      } else if (event === "sync_complete" || event === "sync_error") {
        setIsSyncing(false);
        loadPendingData();
      }
    });

    // Event listeners del DOM
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      removeListener();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pendingCount]);

  // ✅ SINCRONIZACIÓN MANUAL - VERSIÓN CORREGIDA
  const handleForceSync = async () => {
    if (!isOnline) {
      Swal.fire({
        icon: "warning",
        title: "Sin conexión",
        text: "No hay conexión a internet para sincronizar",
        confirmButtonText: "Entendido",
      });
      return;
    }

    try {
      setIsSyncing(true);

      const { value: confirmar } = await Swal.fire({
        title: "Sincronizar datos pendientes",
        text: `¿Deseas sincronizar ${pendingCount} elementos pendientes?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, sincronizar",
        cancelButtonText: "Cancelar",
      });

      if (!confirmar) {
        setIsSyncing(false);
        return;
      }

      Swal.fire({
        title: "Sincronizando...",
        html: "Procesando datos pendientes<br/><small>Por favor espera</small>",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const syncResult = await SyncController.fullSync();

      Swal.close();

      if (syncResult && syncResult.success) {
        let successMessage = "Sincronización completada";
        let successDetails = "";

        // Construir mensaje detallado
        if (syncResult.steps) {
          const successfulSteps = [];

          Object.entries(syncResult.steps).forEach(([name, step]) => {
            if (step && !step.error) {
              if (step.success !== undefined && step.success > 0) {
                successfulSteps.push(`${name}: ${step.success} exitosos`);
              } else if (step.exitosas !== undefined && step.exitosas > 0) {
                successfulSteps.push(`${name}: ${step.exitosas} exitosos`);
              } else if (step.total !== undefined && step.total > 0) {
                successfulSteps.push(`${name}: ${step.total} procesados`);
              }
            }
          });

          if (successfulSteps.length > 0) {
            successDetails = successfulSteps.join(", ");
          }
        }

        await Swal.fire({
          icon: "success",
          title: successMessage,
          html: successDetails
            ? `
            <div style="text-align: left;">
              <p><strong>Resultados:</strong></p>
              <p>${successDetails}</p>
            </div>
          `
            : "Todos los datos se sincronizaron correctamente",
          confirmButtonText: "Aceptar",
        });
      } else {
        throw new Error(
          syncResult?.error || "Error desconocido en sincronización"
        );
      }
    } catch (error) {
      console.error("Error en sincronización manual:", error);

      Swal.fire({
        icon: "error",
        title: "Error de sincronización",
        text: error.message || "Ocurrió un error durante la sincronización",
        confirmButtonText: "Entendido",
      });
    } finally {
      setIsSyncing(false);
      loadPendingData();
    }
  };

  // ✅ BOTÓN DEBUG - NUEVA FUNCIÓN
  const handleDebugSync = async () => {
    try {
      console.log("🐛 EJECUTANDO DEBUG DE SINCRONIZACIÓN...");

      Swal.fire({
        title: "Ejecutando Debug...",
        html: "Analizando problemas de sincronización<br/><small>Revisa la consola del navegador</small>",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // Ejecutar debug
      const debugInfo = await SyncController.debugSyncIssues();

      Swal.close();

      // Mostrar resultados en un modal detallado
      await Swal.fire({
        title: "🔍 Debug de Sincronización",
        html: `
          <div style="text-align: left; max-height: 400px; overflow-y: auto;">
            <h4>📊 Resumen General</h4>
            <ul>
              <li><strong>Online:</strong> ${
                debugInfo.isOnline ? "✅ Sí" : "❌ No"
              }</li>
              <li><strong>Ventas pendientes:</strong> ${
                debugInfo.pendingSales || 0
              }</li>
              <li><strong>Sesiones pendientes:</strong> ${
                debugInfo.pendingSessions || 0
              }</li>
              <li><strong>Cierres pendientes:</strong> ${
                debugInfo.pendingClosures || 0
              }</li>
              <li><strong>Mappings de sesiones:</strong> ${
                debugInfo.sessionMappings || 0
              }</li>
            </ul>
            
            ${
              debugInfo.lastSync
                ? `
            <h4>🕐 Última Sincronización</h4>
            <p>${new Date(debugInfo.lastSync).toLocaleString()}</p>
            `
                : ""
            }
            
            ${
              debugInfo.error
                ? `
            <h4>❌ Errores</h4>
            <p style="color: red;">${debugInfo.error}</p>
            `
                : ""
            }
            
            ${
              debugInfo.sessionMappingDetails
                ? `
            <h4>🗺️ Detalles de Mappings</h4>
            <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px; font-size: 12px;">${JSON.stringify(
              debugInfo.sessionMappingDetails,
              null,
              2
            )}</pre>
            `
                : ""
            }
          </div>
        `,
        width: "800px",
        confirmButtonText: "Cerrar",
        showCancelButton: true,
        cancelButtonText: "Ejecutar Sync",
      }).then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel) {
          // Si presiona "Ejecutar Sync", iniciar sincronización
          handleForceSync();
        }
      });
    } catch (error) {
      console.error("❌ Error en debug:", error);
      Swal.fire({
        icon: "error",
        title: "Error en Debug",
        text: error.message || "No se pudo ejecutar el diagnóstico",
        confirmButtonText: "Cerrar",
      });
    }
  };

  // ✅ ABRIR MODAL DE DETALLES - CORREGIDO
  const handleShowSyncDetails = () => {
    setShowSyncModal(true);
  };

  // ✅ CÁLCULO DE GANANCIAS - VERSIÓN SEGURA
  const calcularGananciasSesion = () => {
    if (!sesionAbierta || !sales || !Array.isArray(sales)) {
      return { gananciaBruta: 0, ventasTotales: 0, cantidadVentas: 0 };
    }

    try {
      const ventasSesionActual = sales.filter(
        (venta) =>
          venta &&
          (venta.sesion_caja_id === sesionAbierta.id ||
            venta.sesion_caja_id_local === sesionAbierta.id_local)
      );

      if (ventasSesionActual.length === 0) {
        return { gananciaBruta: 0, ventasTotales: 0, cantidadVentas: 0 };
      }

      let gananciaBruta = 0;
      let ventasTotales = 0;

      ventasSesionActual.forEach((venta) => {
        if (!venta) return;

        ventasTotales += parseFloat(venta.total) || 0;

        // Estimación simple si no hay detalles de productos
        gananciaBruta += (parseFloat(venta.total) || 0) * 0.25; // 25% de margen estimado
      });

      return {
        gananciaBruta: Math.round(gananciaBruta * 100) / 100,
        ventasTotales: Math.round(ventasTotales * 100) / 100,
        cantidadVentas: ventasSesionActual.length,
      };
    } catch (error) {
      console.error("Error calculando ganancias:", error);
      return { gananciaBruta: 0, ventasTotales: 0, cantidadVentas: 0 };
    }
  };

  const { gananciaBruta, ventasTotales, cantidadVentas } =
    calcularGananciasSesion();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  // ✅ FUNCIONES AUXILIARES PARA DESCRIBIR OPERACIONES
  const getOperationDescription = (type, count) => {
    const descriptions = {
      sessions: `${count} sesión${count !== 1 ? "es" : ""} de caja`,
      sales: `${count} venta${count !== 1 ? "s" : ""}`,
      closures: `${count} cierre${count !== 1 ? "s" : ""} de caja`,
      stock: `${count} actualización${count !== 1 ? "es" : ""} de stock`,
      products: `${count} producto${count !== 1 ? "s" : ""}`,
    };
    return descriptions[type] || `${count} elemento${count !== 1 ? "s" : ""}`;
  };

  // ✅ COMPONENTE MODAL DE SINCRONIZACIÓN - CORREGIDO
  const SyncModal = () => {
    if (!showSyncModal) return null;

    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Estado de Sincronización</h3>
            <button
              className={styles.closeButton}
              onClick={() => setShowSyncModal(false)}
            >
              <FiX />
            </button>
          </div>

          <div className={styles.modalBody}>
            {/* ESTADO DE CONEXIÓN */}
            <div className={styles.syncStatusSection}>
              <div
                className={`${styles.statusIndicator} ${
                  isOnline ? styles.online : styles.offline
                }`}
              >
                <div className={styles.statusIcon}>
                  {isOnline ? <FiWifi /> : <FiWifiOff />}
                </div>
                <div className={styles.statusText}>
                  <span className={styles.statusTitle}>
                    {isOnline ? "Conectado al Servidor" : "Modo Offline"}
                  </span>
                  <span className={styles.statusSubtitle}>
                    {isOnline
                      ? "Sincronización disponible"
                      : "Datos guardados localmente"}
                  </span>
                </div>
              </div>
            </div>

            {/* RESUMEN DE DATOS PENDIENTES */}
            <div className={styles.pendingSummary}>
              <h4>Datos Pendientes de Sincronización</h4>

              {pendingCount === 0 ? (
                <div className={styles.noPendingData}>
                  <FiCheck className={styles.successIcon} />
                  <span>¡Todo sincronizado! No hay datos pendientes.</span>
                </div>
              ) : (
                <div className={styles.pendingList}>
                  {syncStatus.pendingSessions > 0 && (
                    <div className={styles.pendingItem}>
                      <FiInfo className={styles.itemIcon} />
                      <span>
                        {getOperationDescription(
                          "sessions",
                          syncStatus.pendingSessions
                        )}
                      </span>
                    </div>
                  )}

                  {syncStatus.pendingSales > 0 && (
                    <div className={styles.pendingItem}>
                      <FiDollarSign className={styles.itemIcon} />
                      <span>
                        {getOperationDescription(
                          "sales",
                          syncStatus.pendingSales
                        )}
                      </span>
                    </div>
                  )}

                  {syncStatus.pendingClosures > 0 && (
                    <div className={styles.pendingItem}>
                      <FiTrendingUp className={styles.itemIcon} />
                      <span>
                        {getOperationDescription(
                          "closures",
                          syncStatus.pendingClosures
                        )}
                      </span>
                    </div>
                  )}

                  {syncStatus.pendingStock > 0 && (
                    <div className={styles.pendingItem}>
                      <FiPackage className={styles.itemIcon} />
                      <span>
                        {getOperationDescription(
                          "stock",
                          syncStatus.pendingStock
                        )}
                      </span>
                    </div>
                  )}

                  {syncStatus.pendingProducts > 0 && (
                    <div className={styles.pendingItem}>
                      <FiPackage className={styles.itemIcon} />
                      <span>
                        {getOperationDescription(
                          "products",
                          syncStatus.pendingProducts
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* INFORMACIÓN ADICIONAL */}
            <div className={styles.syncInfo}>
              <div className={styles.infoItem}>
                <strong>Total pendiente:</strong> {pendingCount} elemento
                {pendingCount !== 1 ? "s" : ""}
              </div>
              <div className={styles.infoItem}>
                <strong>Estado:</strong>{" "}
                {isSyncing
                  ? "Sincronizando..."
                  : isOnline
                  ? "Listo"
                  : "Offline"}
              </div>
              {!isOnline && (
                <div className={styles.warningMessage}>
                  ⚠️ Conecta a internet para sincronizar los datos pendientes
                </div>
              )}
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              className={styles.secondaryButton}
              onClick={() => setShowSyncModal(false)}
            >
              Cerrar
            </button>

            {/* ✅ BOTÓN DEBUG EN EL MODAL - CON ICONO ALTERNATIVO */}
            <button
              className={styles.debugButton}
              onClick={handleDebugSync}
              title="Diagnosticar problemas de sincronización"
            >
              <FiAlertTriangle /> {/* ✅ ICONO ALTERNATIVO */}
              Debug
            </button>

            {isOnline && pendingCount > 0 && (
              <button
                className={styles.primaryButton}
                onClick={handleForceSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <FiRefreshCw className={styles.spinner} />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <FiRefreshCw />
                    Sincronizar Ahora
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.menuButtonContainer}>
          <button className={styles.menuButton} onClick={onToggleSidebar}>
            <FiMenu className={styles.menuIcon} />
          </button>
        </div>
        <div className={styles.breadcrumb}>
          <span className={styles.appName}>KioskoFlow</span>
          <span className={styles.welcomeText}>
            Sistema POS
            {!isOnline && (
              <span className={styles.offlineHeaderBadge}>
                <FiWifiOff />
                Offline
              </span>
            )}
          </span>
        </div>
      </div>

      <div className={styles.headerRight}>
        {/* ✅ BOTÓN DEBUG EN EL HEADER - CON ICONO ALTERNATIVO */}
        <button
          className={styles.debugHeaderButton}
          onClick={handleDebugSync}
          title="Diagnosticar problemas de sincronización"
        >
          <FiAlertTriangle /> {/* ✅ ICONO ALTERNATIVO */}
          <span>Debug</span>
        </button>

        {/* INDICADOR DE SINCRONIZACIÓN */}
        <div className={styles.syncIndicator} onClick={handleShowSyncDetails}>
          <div className={styles.syncIconContainer}>
            <div
              className={`${styles.syncIcon} ${
                isOnline ? styles.online : styles.offline
              } ${isSyncing ? styles.syncing : ""}`}
            >
              {isSyncing ? (
                <FiRefreshCw className={styles.syncSpinner} />
              ) : isOnline ? (
                <FiWifi />
              ) : (
                <FiWifiOff />
              )}
              {pendingCount > 0 && (
                <span className={styles.pendingBadge}>{pendingCount}</span>
              )}
            </div>
          </div>
          <div className={styles.syncInfo}>
            <span className={styles.syncStatus}>
              {isSyncing
                ? "Sincronizando..."
                : isOnline
                ? "En línea"
                : "Offline"}
            </span>
            {pendingCount > 0 && (
              <span className={styles.pendingCount}>
                {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* INDICADOR DE GANANCIAS */}
        {sesionAbierta ? (
          <div className={styles.earningsIndicator}>
            <div className={styles.earningsIcon}>
              <FiTrendingUp />
            </div>
            <div className={styles.earningsInfo}>
              <span className={styles.earningsAmount}>
                {formatCurrency(gananciaBruta)}
              </span>
              <span className={styles.salesCount}>
                {cantidadVentas} venta{cantidadVentas !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.noSessionIndicator}>
            <div className={styles.noSessionIcon}>
              <FiDollarSign />
            </div>
            <div className={styles.noSessionInfo}>
              <span className={styles.noSessionText}>Sin sesión</span>
            </div>
          </div>
        )}

        {/* USUARIO */}
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            <span className={styles.userInitial}>
              {user?.nombre?.charAt(0) || user?.name?.charAt(0) || "U"}
            </span>
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>
              {user?.nombre || user?.name || "Usuario"}
            </span>
            <span className={styles.userRole}>{user?.rol || "Vendedor"}</span>
          </div>
        </div>
      </div>

      <SyncModal />
    </header>
  );
};

export default Header;
