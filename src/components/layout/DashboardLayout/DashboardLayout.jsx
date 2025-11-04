// components/layout/DashboardLayout/DashboardLayout.jsx - VERSIÓN CORREGIDA
import React, { useState } from "react"; // ✅ AGREGAR IMPORT DE React
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

  // ✅ FUNCIÓN MEJORADA PARA NAVEGACIÓN
  const handleNavigation = (path) => {
    console.log(`📍 DashboardLayout: Navegando a ${path}`);
    if (onViewChange) {
      const view = path.replace("/", "") || "dashboard";
      onViewChange(view);
    }
  };

  // ✅ PASAR onViewChange AL DASHBOARD - MÉTODO SIMPLIFICADO
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // ✅ Solo pasar onViewChange si el componente es Dashboard
      if (child.type && child.type.name === "Dashboard") {
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
