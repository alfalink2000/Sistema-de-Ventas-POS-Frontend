// components/layout/Sidebar/Sidebar.jsx - VERSIÓN CORREGIDA
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { startLogout } from "../../../actions/authActions";
import {
  FiHome,
  FiShoppingCart,
  FiPackage,
  FiTrendingUp,
  FiDollarSign,
  FiBarChart2,
  FiMenu,
  FiX,
  FiShield,
  FiUsers,
  FiLogOut,
  FiLock,
  FiAlertTriangle,
} from "react-icons/fi";
import styles from "./Sidebar.module.css";

const Sidebar = ({ isOpen, onToggle, onNavigation, currentView }) => {
  const dispatch = useDispatch();
  const [currentPath, setCurrentPath] = useState(`/${currentView || "sales"}`);

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: FiHome },
    { path: "/sales", label: "Punto de Venta", icon: FiShoppingCart },
    { path: "/products", label: "Productos", icon: FiPackage },
    {
      path: "/inventory",
      label: "Inventario",
      icon: FiTrendingUp,
      disabled: true, // ✅ SOLO INVENTORY DESHABILITADO
      badge: "Próximamente",
    },
    { path: "/caja", label: "Caja", icon: FiDollarSign },
    { path: "/reports", label: "Reportes", icon: FiBarChart2 },
    { path: "/users", label: "Usuarios", icon: FiUsers }, // ✅ USERS HABILITADO
  ];

  useEffect(() => {
    setCurrentPath(`/${currentView || "sales"}`);
  }, [currentView]);

  const isActive = (path) => currentPath === path;

  const handleNavigation = (path, disabled = false) => {
    // ✅ BLOQUEAR NAVEGACIÓN SOLO SI ESTÁ DESHABILITADO
    if (disabled) {
      console.warn("🚫 Navegación bloqueada - Módulo en desarrollo:", path);
      return;
    }

    setCurrentPath(path);
    if (onNavigation) {
      onNavigation(path);
    }
  };

  const handleLogout = () => {
    dispatch(startLogout());
  };

  if (!isOpen) {
    return (
      <div className={styles.sidebarClosed}>
        <button className={styles.menuButton} onClick={onToggle}>
          <FiMenu className={styles.menuIcon} />
        </button>
      </div>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          <FiShield className={styles.logoIcon} />
          <h2>KioskoFlow</h2>
        </div>
        <button className={styles.closeButton} onClick={onToggle}>
          <FiX className={styles.closeIcon} />
        </button>
      </div>

      <nav className={styles.sidebarNav}>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isDisabled = item.disabled || false;

          return (
            <button
              key={item.path}
              className={`${styles.navItem} ${
                isActive(item.path) ? styles.active : ""
              } ${isDisabled ? styles.disabled : ""}`}
              onClick={() => handleNavigation(item.path, isDisabled)}
              disabled={isDisabled}
              title={
                isDisabled ? "Módulo en desarrollo - Próximamente" : item.label
              }
            >
              <div className={styles.navIconWrapper}>
                <IconComponent className={styles.navIcon} />
                {isDisabled && <FiLock className={styles.lockIcon} />}
              </div>
              <span className={styles.navLabel}>{item.label}</span>

              {/* ✅ BADGE SOLO PARA MÓDULOS EN DESARROLLO */}
              {item.badge && (
                <span className={styles.developmentBadge}>{item.badge}</span>
              )}

              {isActive(item.path) && !isDisabled && (
                <div className={styles.activeIndicator} />
              )}
            </button>
          );
        })}
      </nav>

      {/* ✅ INFORMACIÓN DE MÓDULOS NO DISPONIBLES (solo si hay algún módulo deshabilitado) */}
      {menuItems.some((item) => item.disabled) && (
        <div className={styles.modulesInfo}>
          <div className={styles.infoCard}>
            <FiAlertTriangle className={styles.infoIcon} />
            <div className={styles.infoContent}>
              <strong>Módulos en Desarrollo</strong>
              <p>Algunas funciones estarán disponibles próximamente</p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ BOTÓN DE SALIR EN EL SIDEBAR */}
      <div className={styles.sidebarFooter}>
        <button className={styles.logoutButton} onClick={handleLogout}>
          <div className={styles.logoutIconWrapper}>
            <FiLogOut className={styles.logoutIcon} />
          </div>
          <span className={styles.logoutLabel}>Cerrar Sesión</span>
        </button>

        <div className={styles.systemInfo}>
          <div className={styles.versionBadge}>
            <span>v1.0</span>
          </div>
          <span className={styles.systemText}>Sistema POS</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
