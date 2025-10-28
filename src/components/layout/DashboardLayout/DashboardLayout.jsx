// components/layout/DashboardLayout/DashboardLayout.jsx
import { useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import styles from "./DashboardLayout.module.css";

const DashboardLayout = ({ children, onViewChange, currentView }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user } = useSelector((state) => state.auth);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleNavigation = (path) => {
    if (onViewChange) {
      const view = path.replace("/", "") || "sales";
      onViewChange(view);
    }
  };

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
          sidebarOpen={sidebarOpen} // ✅ Pasar el estado del sidebar
        />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
