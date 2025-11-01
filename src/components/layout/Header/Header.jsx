// components/layout/Header/Header.jsx - VERSIÓN FINAL FUNCIONAL
import { useDispatch, useSelector } from "react-redux";
import { startLogout } from "../../../actions/authActions";
import {
  FiMenu,
  FiLogOut,
  FiUser,
  FiTrendingUp,
  FiDollarSign,
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiAlertCircle,
  FiX,
  FiCheck,
  FiAlertTriangle,
  FiInfo,
} from "react-icons/fi";
import styles from "./Header.module.css";
import { useState, useEffect } from "react";
import { loadSales } from "../../../actions/salesActions";
import { loadClosures } from "../../../actions/closuresActions";
import SyncController from "../../../controllers/offline/SyncController/SyncController";

const Header = ({ user, onToggleSidebar, sidebarOpen }) => {
  const dispatch = useDispatch();
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);
  const { sales } = useSelector((state) => state.sales);
  const { products } = useSelector((state) => state.products);

  // ✅ ESTADOS MEJORADOS
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncDetails, setSyncDetails] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState({
    pendingSessions: 0,
    pendingSales: 0,
    pendingClosures: 0,
  });

  // ✅ EN Header.jsx - MOVER loadPendingData FUERA DEL useEffect
  const loadPendingData = async () => {
    try {
      const status = await SyncController.getSyncStatus();
      setPendingCount(status.totalPending);
      setSyncStatus({
        pendingSessions: status.pendingSessions,
        pendingSales: status.pendingSales,
        pendingClosures: status.pendingClosures,
      });

      // Si hay datos pendientes, cargar detalles
      if (status.totalPending > 0) {
        const details = await SyncController.getPendingDetails();
        setSyncDetails(details);
      }
    } catch (error) {
      console.error("Error cargando estado de sincronización:", error);
    }
  };

  // Luego en useEffect:
  useEffect(() => {
    loadPendingData(); // ✅ AHORA ESTÁ DEFINIDA

    const interval = setInterval(loadPendingData, 20000);

    const removeListener = SyncController.addSyncListener((event, data) => {
      if (event === "sync_complete" || event === "sync_error") {
        loadPendingData(); // ✅ RECARGAR DESPUÉS DE SYNC
      }
    });

    return () => {
      clearInterval(interval);
      removeListener();
    };
  }, []);

  // ✅ MANEJO DE CONEXIÓN
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("🌐 Conexión restaurada - Header");
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("📴 Conexión perdida - Header");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ✅ SINCRONIZACIÓN MANUAL MEJORADA
  const handleForceSync = async () => {
    if (!isOnline) {
      alert("No hay conexión a internet para sincronizar");
      return;
    }

    setIsSyncing(true);
    setShowSyncModal(true);

    try {
      // ✅ EJECUTAR DIAGNÓSTICO PRIMERO
      const diagnosis = await SyncController.debugSessionIssue();
      console.log("🔍 Diagnóstico antes del sync:", diagnosis);

      // ✅ LIMPIAR DUPLICADOS
      const cleanupResult = await SyncController.cleanupDuplicatePendingData();
      console.log("🧹 Resultado limpieza:", cleanupResult);

      // ✅ SINCRONIZAR
      const result = await SyncController.fullSync();

      console.log("📊 Resultado del sync:", result);

      // ✅ RECARGAR DATOS
      setTimeout(() => {
        loadPendingData();
        dispatch(loadSales());
        dispatch(loadClosures());
        console.log("🔄 Datos recargados después del sync");
      }, 1000);
    } catch (error) {
      console.error("Error en sincronización manual:", error);
    } finally {
      setIsSyncing(false);
    }
  };
  // En Header.jsx - AGREGAR esta función para forzar verificación
  const handleForceVerification = async () => {
    try {
      console.log("🔍 Forzando verificación de sincronización...");

      // 1. Obtener estado actual
      const currentStatus = await SyncController.getSyncStatus();
      console.log("📊 Estado actual:", currentStatus);

      // 2. Verificar sesiones pendientes específicamente
      const pendingSessions =
        await SessionsOfflineController.getPendingSessions();
      console.log("📋 Sesiones realmente pendientes:", pendingSessions.length);

      pendingSessions.forEach((session) => {
        console.log("🔍 Sesión pendiente:", {
          id_local: session.id_local,
          id: session.id,
          sincronizado: session.sincronizado,
          estado: session.estado,
        });
      });

      // 3. Recargar datos
      await loadPendingData();

      alert("Verificación completada - Revisa la consola");
    } catch (error) {
      console.error("❌ Error en verificación:", error);
    }
  };
  const runDiagnosis = async () => {
    try {
      const diagnosis = await SyncController.debugSessionIssue();
      console.log("🔍 DIAGNÓSTICO COMPLETO:", diagnosis);
      alert("Diagnóstico completado - Revisa la consola");
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
    }
  };

  // ✅ ABRIR MODAL DE DETALLES
  const handleShowSyncDetails = async () => {
    try {
      const details = await SyncController.getPendingDetails();
      setSyncDetails(details);
      setShowSyncModal(true);
    } catch (error) {
      console.error("Error cargando detalles de sync:", error);
    }
  };

  const handleLogout = () => {
    dispatch(startLogout());
  };

  // ✅ CALCULAR GANANCIAS EN TIEMPO REAL (MANTENIDO)
  const calcularGananciasSesion = () => {
    if (!sesionAbierta || !sales || sales.length === 0) {
      return { gananciaBruta: 0, ventasTotales: 0, cantidadVentas: 0 };
    }

    const ventasSesionActual = sales.filter(
      (venta) =>
        venta.sesion_caja_id === sesionAbierta.id ||
        venta.sesion_caja_id_local === sesionAbierta.id_local
    );

    if (ventasSesionActual.length === 0) {
      return { gananciaBruta: 0, ventasTotales: 0, cantidadVentas: 0 };
    }

    let gananciaBruta = 0;
    let ventasTotales = 0;

    ventasSesionActual.forEach((venta) => {
      ventasTotales += venta.total || 0;

      if (venta.productos && Array.isArray(venta.productos)) {
        venta.productos.forEach((productoVenta) => {
          const producto = products.find(
            (p) => p.id === productoVenta.producto_id
          );
          if (producto && producto.precio_compra) {
            const gananciaProducto =
              (productoVenta.precio_unitario - producto.precio_compra) *
              productoVenta.cantidad;
            gananciaBruta += gananciaProducto;
          }
        });
      } else {
        // Estimación del 30% si no hay datos detallados
        gananciaBruta += (venta.total || 0) * 0.3;
      }
    });

    return {
      gananciaBruta,
      ventasTotales,
      cantidadVentas: ventasSesionActual.length,
    };
  };

  const { gananciaBruta, ventasTotales, cantidadVentas } =
    calcularGananciasSesion();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  // ✅ COMPONENTE MODAL DE SINCRONIZACIÓN
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
            {/* ESTADO ACTUAL */}
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

            {/* CONTADORES PENDIENTES */}
            <div className={styles.pendingCounters}>
              <div className={styles.counterItem}>
                <span className={styles.counterNumber}>
                  {syncStatus.pendingSessions}
                </span>
                <span className={styles.counterLabel}>Sesiones</span>
              </div>
              <div className={styles.counterItem}>
                <span className={styles.counterNumber}>
                  {syncStatus.pendingSales}
                </span>
                <span className={styles.counterLabel}>Ventas</span>
              </div>
              <div className={styles.counterItem}>
                <span className={styles.counterNumber}>
                  {syncStatus.pendingClosures}
                </span>
                <span className={styles.counterLabel}>Cierres</span>
              </div>
              <div className={styles.counterTotal}>
                <span className={styles.totalNumber}>{pendingCount}</span>
                <span className={styles.totalLabel}>Total Pendiente</span>
              </div>
            </div>

            {/* DETALLES DE DATOS PENDIENTES */}
            {syncDetails && (
              <div className={styles.pendingDetails}>
                <h4>Detalles de Datos Pendientes</h4>

                {/* SESIONES PENDIENTES */}
                {syncDetails.sessions.length > 0 && (
                  <div className={styles.detailSection}>
                    <h5>
                      <FiUser className={styles.sectionIcon} />
                      Sesiones de Caja ({syncDetails.sessions.length})
                    </h5>
                    {syncDetails.sessions.map((session) => (
                      <div key={session.id} className={styles.detailItem}>
                        <div className={styles.itemIcon}>
                          <FiInfo />
                        </div>
                        <div className={styles.itemContent}>
                          <span className={styles.itemTitle}>
                            {session.descripcion}
                          </span>
                          <span className={styles.itemDate}>
                            {new Date(session.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          className={`${styles.itemStatus} ${styles.pending}`}
                        >
                          Pendiente
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* VENTAS PENDIENTES */}
                {syncDetails.sales.length > 0 && (
                  <div className={styles.detailSection}>
                    <h5>
                      <FiDollarSign className={styles.sectionIcon} />
                      Ventas ({syncDetails.sales.length})
                    </h5>
                    {syncDetails.sales.map((sale) => (
                      <div key={sale.id} className={styles.detailItem}>
                        <div className={styles.itemIcon}>
                          <FiDollarSign />
                        </div>
                        <div className={styles.itemContent}>
                          <span className={styles.itemTitle}>
                            {sale.descripcion}
                          </span>
                          <span className={styles.itemDate}>
                            {new Date(sale.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          className={`${styles.itemStatus} ${styles.pending}`}
                        >
                          Pendiente
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* CIERRES PENDIENTES */}
                {syncDetails.closures.length > 0 && (
                  <div className={styles.detailSection}>
                    <h5>
                      <FiTrendingUp className={styles.sectionIcon} />
                      Cierres de Caja ({syncDetails.closures.length})
                    </h5>
                    {syncDetails.closures.map((closure) => (
                      <div key={closure.id} className={styles.detailItem}>
                        <div className={styles.itemIcon}>
                          <FiTrendingUp />
                        </div>
                        <div className={styles.itemContent}>
                          <span className={styles.itemTitle}>
                            {closure.descripcion}
                          </span>
                          <span className={styles.itemDate}>
                            {new Date(closure.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          className={`${styles.itemStatus} ${styles.pending}`}
                        >
                          Pendiente
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* SIN DATOS PENDIENTES */}
                {pendingCount === 0 && (
                  <div className={styles.noPendingData}>
                    <FiCheck className={styles.successIcon} />
                    <span>¡Todo sincronizado! No hay datos pendientes.</span>
                  </div>
                )}
              </div>
            )}

            {/* ERRORES */}
            {syncDetails?.error && (
              <div className={styles.errorSection}>
                <FiAlertTriangle className={styles.errorIcon} />
                <span>Error cargando detalles: {syncDetails.error}</span>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button
              className={styles.secondaryButton}
              onClick={() => setShowSyncModal(false)}
            >
              Cerrar
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
          {sidebarOpen ? (
            <button className={styles.menuButton} onClick={onToggleSidebar}>
              <FiMenu className={styles.menuIcon} />
            </button>
          ) : (
            <div className={styles.menuButtonPlaceholder} />
          )}
        </div>
        <div className={styles.breadcrumb}>
          <span className={styles.appName}>KioskoFlow</span>
          <span className={styles.welcomeText}>
            Sistema POS - Control de Ventas
            {!isOnline && (
              <span className={styles.offlineHeaderBadge}>
                <FiWifiOff />
                Modo Offline
              </span>
            )}
          </span>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div style={{ display: "flex", gap: "10px", marginLeft: "10px" }}>
          <button
            onClick={runDiagnosis}
            style={{
              padding: "5px 10px",
              background: "#f0f0f0",
              border: "1px solid #ccc",
            }}
          >
            🔍 Diagnóstico
          </button>
          <button
            onClick={handleForceVerification}
            style={{
              padding: "5px 10px",
              background: "#e0f7fa",
              border: "1px solid #00bcd4",
            }}
          >
            🔄 Verificar Sync
          </button>
        </div>

        {/* ✅ INDICADOR DE SINCRONIZACIÓN MEJORADO */}
        <div className={styles.syncIndicator} onClick={handleShowSyncDetails}>
          <div className={styles.syncIconContainer}>
            <div
              className={`${styles.syncIcon} ${
                isOnline ? styles.online : styles.offline
              } ${isSyncing ? styles.syncing : ""} ${
                pendingCount > 0 ? styles.hasPending : ""
              }`}
              title="Ver detalles de sincronización"
            >
              {isSyncing ? (
                <FiRefreshCw className={styles.syncSpinner} />
              ) : isOnline ? (
                <FiWifi className={styles.wifiIcon} />
              ) : (
                <FiWifiOff className={styles.wifiOffIcon} />
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

          {/* Botón de sincronización */}
          {pendingCount > 0 && isOnline && !isSyncing && (
            <button
              className={styles.syncButton}
              onClick={handleForceSync}
              title="Sincronizar datos pendientes"
            >
              <FiRefreshCw className={styles.syncButtonIcon} />
            </button>
          )}
        </div>

        {/* ✅ INDICADOR DE GANANCIAS EN TIEMPO REAL (MANTENIDO) */}
        {sesionAbierta ? (
          <div className={styles.earningsIndicator}>
            <div className={styles.earningsIcon}>
              <FiTrendingUp className={styles.trendingIcon} />
            </div>
            <div className={styles.earningsInfo}>
              <span className={styles.earningsLabel}>Ganancia Actual</span>
              <span className={styles.earningsAmount}>
                {formatCurrency(gananciaBruta)}
              </span>
              <div className={styles.earningsDetails}>
                <span className={styles.salesCount}>
                  {cantidadVentas} venta{cantidadVentas !== 1 ? "s" : ""}
                </span>
                {!isOnline && (
                  <span className={styles.offlineEarningBadge}>local</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.noSessionIndicator}>
            <div className={styles.noSessionIcon}>
              <FiDollarSign className={styles.dollarIcon} />
            </div>
            <div className={styles.noSessionInfo}>
              <span className={styles.noSessionLabel}>Sesión No Iniciada</span>
              <span className={styles.noSessionText}>Abre una sesión</span>
            </div>
          </div>
        )}

        {/* ✅ INFORMACIÓN DEL USUARIO VENDEDOR (MANTENIDO) */}
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            <FiUser className={styles.userIcon} />
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>
              {user?.nombre || user?.name || "Usuario"}
            </span>
            <span className={styles.userRole}>
              {user?.rol
                ? user.rol.charAt(0).toUpperCase() + user.rol.slice(1)
                : "Administrador"}
            </span>
          </div>
        </div>

        {/* Botón de salir */}
        <button className={styles.logoutButton} onClick={handleLogout}>
          <FiLogOut className={styles.logoutIcon} />
          <span>Salir</span>
        </button>
      </div>

      {/* ✅ MODAL DE SINCRONIZACIÓN */}
      <SyncModal />
    </header>
  );
};

export default Header;
