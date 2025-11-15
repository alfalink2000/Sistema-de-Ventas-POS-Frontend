// pages/Dashboard/Dashboard.jsx - VERSIÓN CORREGIDA Y SIMPLIFICADA
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiPackage,
  FiTrendingDown,
  FiAlertTriangle,
  FiDollarSign,
  FiShoppingCart,
  FiPlus,
  FiBarChart2,
  FiCreditCard,
  FiUsers,
  FiArchive,
} from "react-icons/fi";
import { loadProductsIfNeeded } from "../../actions/productsActions";
import { loadOpenSesion } from "../../actions/sesionesCajaActions";
import styles from "./Dashboard.module.css";

const Dashboard = ({ onViewChange }) => {
  const dispatch = useDispatch();
  const { products, loading } = useSelector((state) => state.products);
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadProductsIfNeeded());
    if (user?.id) {
      dispatch(loadOpenSesion(user.id));
    }
  }, [dispatch, user]);

  // ✅ PROTEGER CONTRA DATOS INVALIDOS
  const safeProducts = Array.isArray(products) ? products : [];

  const totalProducts = safeProducts.length;
  const lowStockProducts = safeProducts.filter(
    (p) => p.stock <= (p.stock_minimo || 5) && p.stock > 0
  ).length;
  const outOfStockProducts = safeProducts.filter((p) => p.stock === 0).length;

  // ✅ FUNCIÓN CORREGIDA - MÁS SIMPLE Y DIRECTA
  const handleQuickAction = (action) => {
    console.log(`🎯 Dashboard: Acción rápida - ${action}`);

    // ✅ VERIFICAR SI onViewChange ESTÁ DISPONIBLE
    if (!onViewChange || typeof onViewChange !== "function") {
      console.error("❌ Dashboard: onViewChange no está disponible");
      return;
    }

    // ✅ MAPEO DIRECTO DE ACCIONES A RUTAS
    const viewMap = {
      sales: "sales",
      products: "products",
      inventory: "inventory",
      caja: "caja",
      reports: "reports",
      users: "users",
    };

    const targetView = viewMap[action];

    if (targetView) {
      console.log(`🔄 Dashboard: Navegando a ${targetView}`);
      onViewChange(`/${targetView}`);
    } else {
      console.error(`❌ Dashboard: Vista no encontrada para acción: ${action}`);
    }
  };

  // ✅ MANEJADORES DIRECTOS PARA CADA ACCIÓN
  const handleNuevaVenta = () => handleQuickAction("sales");
  const handleProductos = () => handleQuickAction("products");
  const handleInventario = () => handleQuickAction("inventory");
  const handleCaja = () => handleQuickAction("caja");
  const handleReportes = () => handleQuickAction("reports");
  const handleUsuarios = () => handleQuickAction("users");

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardPage}>
      {/* ✅ HEADER COMPACTO */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <h1>Panel de Control</h1>
          <p>Resumen general del sistema POS</p>
          {/* ✅ DEBUG INFO - SOLO EN DESARROLLO */}
          {process.env.NODE_ENV === "development" && (
            <div className={styles.debugInfo}>
              <small>
                onViewChange:{" "}
                {onViewChange ? "✅ Disponible" : "❌ No disponible"}
              </small>
            </div>
          )}
        </div>
        <div className={styles.headerStats}>
          <div className={styles.miniStat}>
            <span className={styles.miniStatNumber}>{totalProducts}</span>
            <span className={styles.miniStatLabel}>Productos</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniStatNumber}>{lowStockProducts}</span>
            <span className={styles.miniStatLabel}>Stock Bajo</span>
          </div>
        </div>
      </div>

      {/* ✅ STATS GRID COMPACTO */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <div className={`${styles.statIcon} ${styles.products}`}>
              <FiPackage />
            </div>
            <div className={styles.statInfo}>
              <h3>{totalProducts}</h3>
              <p>Total Productos</p>
            </div>
          </div>
          <div className={styles.statTrend}>
            <span>📈 +12%</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <div className={`${styles.statIcon} ${styles.warning}`}>
              <FiTrendingDown />
            </div>
            <div className={styles.statInfo}>
              <h3>{lowStockProducts}</h3>
              <p>Stock Bajo</p>
            </div>
          </div>
          <div className={styles.statTrend}>
            <span className={styles.trendWarning}>⚠️ Reabastecer</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <div className={`${styles.statIcon} ${styles.danger}`}>
              <FiAlertTriangle />
            </div>
            <div className={styles.statInfo}>
              <h3>{outOfStockProducts}</h3>
              <p>Agotados</p>
            </div>
          </div>
          <div className={styles.statTrend}>
            <span className={styles.trendDanger}>🚫 Urgente</span>
          </div>
        </div>

        {/* ✅ ESTADO DE CAJA MEJORADO */}
        <div
          className={`${styles.statCard} ${
            sesionAbierta ? styles.cajaAbierta : styles.cajaCerrada
          }`}
        >
          <div className={styles.statContent}>
            <div
              className={`${styles.statIcon} ${
                sesionAbierta ? styles.success : styles.warning
              }`}
            >
              <FiDollarSign />
            </div>
            <div className={styles.statInfo}>
              <h3>{sesionAbierta ? "Abierta" : "Cerrada"}</h3>
              <p>Sesión de Caja</p>
            </div>
          </div>
          <div className={styles.statTrend}>
            <span
              className={
                sesionAbierta ? styles.trendSuccess : styles.trendWarning
              }
            >
              {sesionAbierta ? "🟢 Activa" : "🔴 Inactiva"}
            </span>
          </div>
        </div>
      </div>

      {/* ✅ ACCIONES RÁPIDAS MEJORADAS - CON MANEJADORES DIRECTOS */}
      <div className={styles.quickActions}>
        <div className={styles.actionsHeader}>
          <h2>Acciones Rápidas</h2>
          <p>Accesos directos a funciones principales</p>
        </div>

        <div className={styles.actionGrid}>
          {/* ✅ NUEVA VENTA */}
          <button
            className={`${styles.actionCard} ${styles.primary}`}
            onClick={handleNuevaVenta}
          >
            <div className={styles.actionIcon}>
              <FiShoppingCart />
            </div>
            <div className={styles.actionContent}>
              <span className={styles.actionTitle}>Nueva Venta</span>
              <span className={styles.actionDesc}>Iniciar transacción</span>
            </div>
            <div className={styles.actionBadge}>
              <FiPlus />
            </div>
          </button>

          {/* ✅ PRODUCTOS */}
          <button className={styles.actionCard} onClick={handleProductos}>
            <div className={styles.actionIcon}>
              <FiPackage />
            </div>
            <div className={styles.actionContent}>
              <span className={styles.actionTitle}>Productos</span>
              <span className={styles.actionDesc}>Gestionar inventario</span>
            </div>
          </button>

          {/* ✅ INVENTARIO */}
          <button className={styles.actionCard} onClick={handleInventario}>
            <div className={styles.actionIcon}>
              <FiArchive />
            </div>
            <div className={styles.actionContent}>
              <span className={styles.actionTitle}>Inventario</span>
              <span className={styles.actionDesc}>Control de stock</span>
            </div>
          </button>

          {/* ✅ CAJA */}
          <button className={styles.actionCard} onClick={handleCaja}>
            <div className={styles.actionIcon}>
              <FiCreditCard />
            </div>
            <div className={styles.actionContent}>
              <span className={styles.actionTitle}>Caja</span>
              <span className={styles.actionDesc}>
                {sesionAbierta ? "Gestionar sesión" : "Abrir caja"}
              </span>
            </div>
          </button>

          {/* ✅ REPORTES */}
          <button className={styles.actionCard} onClick={handleReportes}>
            <div className={styles.actionIcon}>
              <FiBarChart2 />
            </div>
            <div className={styles.actionContent}>
              <span className={styles.actionTitle}>Reportes</span>
              <span className={styles.actionDesc}>Estadísticas y ventas</span>
            </div>
          </button>

          {/* ✅ USUARIOS (Solo para administradores) */}
          {user?.rol === "admin" && (
            <button className={styles.actionCard} onClick={handleUsuarios}>
              <div className={styles.actionIcon}>
                <FiUsers />
              </div>
              <div className={styles.actionContent}>
                <span className={styles.actionTitle}>Usuarios</span>
                <span className={styles.actionDesc}>Gestionar usuarios</span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ✅ INFORMACIÓN DE DEBUG (SOLO EN DESARROLLO) */}
      {process.env.NODE_ENV === "development" && (
        <div className={styles.debugPanel}>
          <h4>Información de Debug</h4>
          <div className={styles.debugInfo}>
            <p>
              <strong>Usuario:</strong> {user?.nombre} ({user?.rol})
            </p>
            <p>
              <strong>Sesión de Caja:</strong>{" "}
              {sesionAbierta ? "Abierta" : "Cerrada"}
            </p>
            <p>
              <strong>Productos cargados:</strong> {totalProducts}
            </p>
            <p>
              <strong>onViewChange disponible:</strong>{" "}
              {onViewChange ? "Sí" : "No"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ AGREGAR DISPLAY NAME PARA MEJOR IDENTIFICACIÓN
Dashboard.displayName = "Dashboard";

export default Dashboard;
