// pages/Dashboard/Dashboard.jsx
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
} from "react-icons/fi";
import { loadProducts } from "../../actions/productsActions";
import { loadOpenSesion } from "../../actions/sesionesCajaActions";
import styles from "./Dashboard.module.css";

const Dashboard = ({ onViewChange }) => {
  const dispatch = useDispatch();
  const { products, loading } = useSelector((state) => state.products);
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadProducts());
    if (user?.id) {
      dispatch(loadOpenSesion(user.id));
    }
  }, [dispatch, user]);

  // ✅ PROTEGER CONTRA DATOS INVALIDOS
  const safeProducts = Array.isArray(products) ? products : [];

  const totalProducts = safeProducts.length;
  const lowStockProducts = safeProducts.filter(
    (p) => p.stock <= (p.stock_minimo || 5)
  ).length;
  const outOfStockProducts = safeProducts.filter((p) => p.stock === 0).length;

  // ✅ CORREGIR: Función para manejar acciones rápidas
  const handleQuickAction = (view) => {
    console.log(`🔄 Navegando a: ${view}`);
    if (onViewChange) {
      onViewChange(view);
    } else {
      console.error("❌ onViewChange no está definido");
    }
  };

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

      {/* ✅ ACCIONES RÁPIDAS MEJORADAS */}
      <div className={styles.quickActions}>
        <div className={styles.actionsHeader}>
          <h2>Acciones Rápidas</h2>
          <p>Accesos directos a funciones principales</p>
        </div>

        <div className={styles.actionGrid}>
          <button
            className={`${styles.actionCard} ${styles.primary}`}
            onClick={() => handleQuickAction("sales")}
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

          <button
            className={styles.actionCard}
            onClick={() => handleQuickAction("products")}
          >
            <div className={styles.actionIcon}>
              <FiPackage />
            </div>
            <div className={styles.actionContent}>
              <span className={styles.actionTitle}>Productos</span>
              <span className={styles.actionDesc}>Gestionar inventario</span>
            </div>
          </button>

          <button
            className={styles.actionCard}
            onClick={() => handleQuickAction("inventory")}
          >
            <div className={styles.actionIcon}>
              <FiTrendingDown />
            </div>
            <div className={styles.actionContent}>
              <span className={styles.actionTitle}>Inventario</span>
              <span className={styles.actionDesc}>Control de stock</span>
            </div>
          </button>

          <button
            className={styles.actionCard}
            onClick={() => handleQuickAction("caja")}
          >
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

          <button
            className={styles.actionCard}
            onClick={() => handleQuickAction("reports")}
          >
            <div className={styles.actionIcon}>
              <FiBarChart2 />
            </div>
            <div className={styles.actionContent}>
              <span className={styles.actionTitle}>Reportes</span>
              <span className={styles.actionDesc}>Estadísticas y ventas</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
