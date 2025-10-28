// components/layout/Sidebar/Sidebar.jsx
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
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
} from "react-icons/fi";
import styles from "./Sidebar.module.css";

const Sidebar = ({ isOpen, onToggle, onNavigation, currentView }) => {
  const [currentPath, setCurrentPath] = useState(`/${currentView || "sales"}`);

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: FiHome },
    { path: "/sales", label: "Punto de Venta", icon: FiShoppingCart },
    { path: "/products", label: "Productos", icon: FiPackage },
    { path: "/inventory", label: "Inventario", icon: FiTrendingUp },
    { path: "/caja", label: "Caja", icon: FiDollarSign },
    { path: "/reports", label: "Reportes", icon: FiBarChart2 },
    { path: "/users", label: "Usuarios", icon: FiUsers },
  ];

  useEffect(() => {
    setCurrentPath(`/${currentView || "sales"}`);
  }, [currentView]);

  const isActive = (path) => currentPath === path;

  const handleNavigation = (path) => {
    setCurrentPath(path);
    if (onNavigation) {
      onNavigation(path);
    }
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
          return (
            <button
              key={item.path}
              className={`${styles.navItem} ${
                isActive(item.path) ? styles.active : ""
              }`}
              onClick={() => handleNavigation(item.path)}
            >
              <div className={styles.navIconWrapper}>
                <IconComponent className={styles.navIcon} />
              </div>
              <span className={styles.navLabel}>{item.label}</span>
              {isActive(item.path) && (
                <div className={styles.activeIndicator} />
              )}
            </button>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
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
