// AppRouter.jsx - VERSIÓN CORREGIDA
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import Login from "../pages/Login/Login";
import Caja from "../pages/Caja/Caja";
import DashboardLayout from "../components/layout/DashboardLayout/DashboardLayout";
import Dashboard from "../pages/Dashboard/Dashboard";
import Sales from "../pages/Sales/Sales";
import Products from "../pages/Products/Products";
import Inventory from "../pages/Inventory/Inventory";
import Reports from "../pages/Reports/Reports";
import Users from "../pages/Users/Users";
import DataLoader from "../components/DataLoader/DataLoader";
import LoadingSpinner from "../components/ui/LoadingSpinner/LoadingSpinner";
import { startChecking, startOfflineChecking } from "../actions/authActions";
import styles from "./AppRouter.module.css";

const AppRouter = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentView, setCurrentView] = useState("dashboard"); // ✅ Por defecto "dashboard"

  const { isAuthenticated, checking, user } = useSelector(
    (state) => state.auth
  );

  const dispatch = useDispatch();

  // ✅ DETECTAR CAMBIOS DE CONEXIÓN
  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 Conexión restaurada");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("📴 Conexión perdida - Modo offline");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ✅ VERIFICACIÓN DE AUTENTICACIÓN
  useEffect(() => {
    if (!checking) {
      const checkAuth = async () => {
        if (isOnline) {
          console.log("🌐 Modo online - Verificación completa");
          await dispatch(startChecking());
        } else {
          console.log("📱 Modo offline - Verificación local");
          await dispatch(startOfflineChecking());
        }
      };

      checkAuth();
    }
  }, [dispatch, isOnline, checking]);

  // ✅ MANEJADOR DE CAMBIO DE VISTA MEJORADO
  const handleViewChange = (view) => {
    console.log(`🔄 AppRouter: Cambiando a vista ${view}`);
    setCurrentView(view);
  };

  // ✅ RENDERIZADO DE CONTENIDO MEJORADO
  const renderContent = () => {
    console.log(`🎯 AppRouter: Renderizando vista ${currentView}`);

    const views = {
      dashboard: <Dashboard onViewChange={handleViewChange} />,
      sales: <Sales />,
      products: <Products />,
      inventory: <Inventory />,
      reports: <Reports />,
      caja: <Caja />,
      users: <Users />,
    };

    return views[currentView] || <Dashboard onViewChange={handleViewChange} />;
  };

  // ✅ RENDERIZADO
  if (checking) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <div className={styles.loadingContent}>
          <h3>Verificando sesión...</h3>
          <p>
            {isOnline ? "Conectando con servidor" : "Verificando datos locales"}
          </p>
        </div>
      </div>
    );
  }

  // ✅ REDIRIGIR A LOGIN SI NO ESTÁ AUTENTICADO
  if (!isAuthenticated) {
    console.log("🔐 Redirigiendo a Login - usuario no autenticado");
    return <Login />;
  }

  // ✅ APLICACIÓN PRINCIPAL CON DATALOADER
  console.log("🏠 App lista -", isOnline ? "ONLINE" : "OFFLINE");

  return (
    <DataLoader
      isOnline={isOnline}
      isAuthenticated={isAuthenticated}
      checking={checking}
      user={user}
    >
      <DashboardLayout
        onViewChange={handleViewChange}
        currentView={currentView}
        isOnline={isOnline}
      >
        {renderContent()}
      </DashboardLayout>
    </DataLoader>
  );
};

export default AppRouter;
