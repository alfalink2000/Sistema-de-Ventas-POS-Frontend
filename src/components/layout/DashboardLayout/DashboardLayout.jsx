// components/layout/DashboardLayout/DashboardLayout.jsx - VERSIÓN CORREGIDA
import React, { useState } from "react";
import { useSelector } from "react-redux";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import styles from "./DashboardLayout.module.css";

const DashboardLayout = ({ children, onViewChange, currentView }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useSelector((state) => state.auth);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // ✅ FUNCIÓN MEJORADA PARA NAVEGACIÓN - MÁS ROBUSTA
  const handleNavigation = (path) => {
    console.log(`📍 DashboardLayout: Navegando a ${path}`);
    if (onViewChange && typeof onViewChange === "function") {
      // Extraer el view name del path (ej: "/sales" -> "sales")
      const view = path.startsWith("/") ? path.substring(1) : path;
      const finalView = view || "dashboard";
      console.log(`🎯 DashboardLayout: Cambiando a vista ${finalView}`);
      onViewChange(finalView);
    } else {
      console.error("❌ DashboardLayout: onViewChange no está disponible");
    }
  };

  // ✅ ENHANCED CHILDREN - MÉTODO MÁS ROBUSTO
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // ✅ Verificar si es el componente Dashboard de múltiples formas
      const isDashboard =
        child.type?.name === "Dashboard" ||
        child.type?.displayName === "Dashboard" ||
        (child.props && child.props["data-is-dashboard"]) === true;

      if (isDashboard) {
        console.log(
          "🔧 DashboardLayout: Mejorando componente Dashboard con onViewChange"
        );
        return React.cloneElement(child, {
          onViewChange: handleNavigation,
        });
      }
    }
    return child;
  });

  return (
    <div className={styles.dashboard}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        onNavigation={handleNavigation}
        currentView={currentView}
      />
      <div
        className={`${styles.mainContent} ${
          !sidebarOpen ? styles.sidebarClosed : ""
        }`}
      >
        <Header
          user={user}
          onToggleSidebar={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
        <main className={styles.content}>{enhancedChildren || children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
