// components/layout/Header/Header.jsx - VERSIÓN MEJORADA
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
} from "react-icons/fi";
import styles from "./Header.module.css";
import { useSyncStatus } from "../../../hook/useSyncStatus";

const Header = ({ user, onToggleSidebar, sidebarOpen }) => {
  const dispatch = useDispatch();
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);
  const { sales } = useSelector((state) => state.sales);
  const { products } = useSelector((state) => state.products);

  // ✅ HOOK DE SINCRONIZACIÓN
  const { isOnline, isSyncing, pendingCount, forceSync, health } =
    useSyncStatus();

  const handleLogout = () => {
    dispatch(startLogout());
  };

  // ✅ CALCULAR GANANCIAS EN TIEMPO REAL
  const calcularGananciasSesion = () => {
    if (!sesionAbierta || !sales || sales.length === 0) {
      return { gananciaBruta: 0, ventasTotales: 0 };
    }

    const ventasSesionActual = sales.filter(
      (venta) => venta.sesion_caja_id === sesionAbierta.id
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
          </span>
        </div>
      </div>

      <div className={styles.headerRight}>
        {/* ✅ INDICADOR DE SINCRONIZACIÓN COMPACTO */}
        <div className={styles.syncIndicator}>
          <div
            className={`${styles.syncIcon} ${
              isOnline ? styles.online : styles.offline
            }`}
          >
            {isSyncing ? (
              <FiRefreshCw className={styles.syncSpinner} />
            ) : isOnline ? (
              <FiWifi className={styles.wifiIcon} />
            ) : (
              <FiWifiOff className={styles.wifiOffIcon} />
            )}
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
          {pendingCount > 0 && isOnline && !isSyncing && (
            <button
              className={styles.syncButton}
              onClick={forceSync}
              title="Sincronizar ahora"
            >
              <FiRefreshCw className={styles.syncButtonIcon} />
            </button>
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
                  {cantidadVentas} ventas
                </span>
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
