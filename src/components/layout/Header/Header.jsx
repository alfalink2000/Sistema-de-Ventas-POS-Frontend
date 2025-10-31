// components/layout/Header/Header.jsx - VERSIÓN CORREGIDA CON TUS ESTILOS
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
} from "react-icons/fi";
import styles from "./Header.module.css";
import { useState, useEffect } from "react";
import SyncController from "../../../controllers/offline/SyncController/SyncController";

const Header = ({ user, onToggleSidebar, sidebarOpen }) => {
  const dispatch = useDispatch();
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);
  const { sales } = useSelector((state) => state.sales);
  const { products } = useSelector((state) => state.products);

  // ✅ ESTADO DE SINCRONIZACIÓN MEJORADO
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState({
    pendingSessions: 0,
    pendingSales: 0,
    pendingClosures: 0,
  });

  // ✅ CARGA DE DATOS PENDIENTES
  useEffect(() => {
    const loadPendingData = async () => {
      try {
        const syncStatus = await SyncController.getSyncStatus();
        setPendingCount(syncStatus.totalPending);
        setSyncStatus({
          pendingSessions: syncStatus.pendingSessions,
          pendingSales: syncStatus.pendingSales,
          pendingClosures: syncStatus.pendingClosures,
        });
      } catch (error) {
        console.error("Error cargando estado de sincronización:", error);
      }
    };

    loadPendingData();

    // Actualizar cada 30 segundos
    const interval = setInterval(loadPendingData, 30000);
    return () => clearInterval(interval);
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

  // ✅ SINCRONIZACIÓN MANUAL
  const handleForceSync = async () => {
    if (!isOnline) {
      alert("No hay conexión a internet para sincronizar");
      return;
    }

    setIsSyncing(true);
    try {
      await SyncController.fullSync();

      // Actualizar contador después de sincronizar
      const newStatus = await SyncController.getSyncStatus();
      setPendingCount(newStatus.totalPending);
      setSyncStatus({
        pendingSessions: newStatus.pendingSessions,
        pendingSales: newStatus.pendingSales,
        pendingClosures: newStatus.pendingClosures,
      });
    } catch (error) {
      console.error("Error en sincronización manual:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    dispatch(startLogout());
  };

  // ✅ CALCULAR GANANCIAS EN TIEMPO REAL
  const calcularGananciasSesion = () => {
    if (!sesionAbierta || !sales || sales.length === 0) {
      return { gananciaBruta: 0, ventasTotales: 0 };
    }

    const ventasSesionActual = sales.filter(
      (venta) =>
        venta.sesion_caja_id === sesionAbierta.id ||
        venta.sesion_caja_id_local === sesionAbierta.id_local
    );

    if (ventasSesionActual.length === 0) {
      return { gananciaBruta: 0, ventasTotales: 0 };
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
        {/* ✅ INDICADOR DE SINCRONIZACIÓN MEJORADO */}
        <div className={styles.syncIndicator}>
          <div className={styles.syncIconContainer}>
            <div
              className={`${styles.syncIcon} ${
                isOnline ? styles.online : styles.offline
              } ${isSyncing ? styles.syncing : ""}`}
              title={
                isSyncing
                  ? "Sincronizando datos..."
                  : isOnline
                  ? "Conectado al servidor"
                  : "Modo offline - Datos locales"
              }
            >
              {isSyncing ? (
                <FiRefreshCw className={styles.syncSpinner} />
              ) : isOnline ? (
                <FiWifi className={styles.wifiIcon} />
              ) : (
                <FiWifiOff className={styles.wifiOffIcon} />
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

          {/* Indicador de advertencia si hay muchos pendientes */}
          {pendingCount > 10 && (
            <div
              className={styles.syncWarning}
              title="Muchos datos pendientes de sincronización"
            >
              <FiAlertCircle />
            </div>
          )}
        </div>

        {/* ✅ INDICADOR DE GANANCIAS EN TIEMPO REAL */}
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

        {/* Información del usuario */}
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
    </header>
  );
};

export default Header;
