// AppRouter.jsx - VERSIÓN SIMPLIFICADA Y CORREGIDA
import { useState, useEffect, useRef } from "react";
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
import { loadProducts } from "../actions/productsActions";
import { loadCategories } from "../actions/categoriesActions";
import { loadSales } from "../actions/salesActions";
import { loadInventory } from "../actions/inventoryActions";
import { loadTodayClosure } from "../actions/closuresActions";
import { loadOpenSesion } from "../actions/sesionesCajaActions";
import LoadingSpinner from "../components/ui/LoadingSpinner/LoadingSpinner";
import { startChecking, startOfflineChecking } from "../actions/authActions";
import styles from "./AppRouter.module.css";

const AppRouter = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const { isAuthenticated, checking, user } = useSelector(
    (state) => state.auth
  );
  const dispatch = useDispatch();
  const loadAttemptedRef = useRef(false);
  const authCheckedRef = useRef(false);

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

  // ✅ VERIFICACIÓN DE AUTENTICACIÓN - UNA SOLA VEZ
  useEffect(() => {
    if (!authCheckedRef.current) {
      authCheckedRef.current = true;

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
  }, [dispatch, isOnline]);

  // ✅ CARGA DE DATOS SOLO CUANDO ESTÉ AUTENTICADO
  useEffect(() => {
    if (!checking && isAuthenticated && user && !loadAttemptedRef.current) {
      console.log("🔄 AppRouter: Usuario autenticado, iniciando carga...", {
        user: user.username,
        online: isOnline,
      });
      loadAttemptedRef.current = true;

      const loadEssentialData = async () => {
        try {
          console.log("🚀 Cargando datos esenciales...");

          // ✅ CARGAS CRÍTICAS CON MANEJO DE ERRORES
          const essentialLoads = [
            {
              key: "products",
              action: () => dispatch(loadProducts()),
              label: "productos",
            },
            {
              key: "categories",
              action: () => dispatch(loadCategories()),
              label: "categorías",
            },
          ];

          for (const { key, action, label } of essentialLoads) {
            try {
              console.log(`📦 Cargando ${label}...`);
              await action();
              console.log(`✅ ${label} listos`);
            } catch (error) {
              console.error(`⚠️ Error con ${label}:`, error.message);
              // Continuar aunque falle
            }
          }

          // ✅ CARGAS OPCIONALES (SOLO ONLINE)
          if (isOnline) {
            const optionalLoads = [
              {
                action: () => dispatch(loadOpenSesion(user.id)),
                label: "sesión",
              },
              { action: () => dispatch(loadSales(10, 1)), label: "ventas" },
              { action: () => dispatch(loadInventory()), label: "inventario" },
              { action: () => dispatch(loadTodayClosure()), label: "cierres" },
            ];

            console.log("🔄 Cargando datos opcionales...");
            await Promise.allSettled(
              optionalLoads.map(({ action, label }) =>
                action().catch((error) =>
                  console.log(`⚠️ ${label} no disponibles:`, error.message)
                )
              )
            );
          }

          console.log("🎉 Carga completada");
          setInitialLoadComplete(true);
        } catch (error) {
          console.error("❌ Error en carga:", error);
          // ✅ PERMITIR ACCESO AUNQUE HAYA ERRORES
          setInitialLoadComplete(true);
        }
      };

      // ✅ TIMEOUT DE SEGURIDAD
      const timeout = setTimeout(() => {
        if (!initialLoadComplete) {
          console.log("⏰ Timeout - Continuando con app...");
          setInitialLoadComplete(true);
        }
      }, 5000);

      loadEssentialData().finally(() => {
        clearTimeout(timeout);
      });
    }
  }, [
    isAuthenticated,
    checking,
    user,
    dispatch,
    isOnline,
    initialLoadComplete,
  ]);

  // ✅ RESETEO AL CERRAR SESIÓN
  useEffect(() => {
    if (!isAuthenticated && loadAttemptedRef.current) {
      console.log("🔄 Sesión cerrada, reseteando...");
      loadAttemptedRef.current = false;
      authCheckedRef.current = false;
      setInitialLoadComplete(false);
      setCurrentView("dashboard");
    }
  }, [isAuthenticated]);

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

  // ✅ MOSTRAR LOADING MIENTRAS CARGA DATOS
  if (!initialLoadComplete) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <div className={styles.loadingContent}>
          <h3>Preparando aplicación</h3>
          <p>{isOnline ? "Cargando datos..." : "Cargando datos locales..."}</p>
          {!isOnline && (
            <div className={styles.offlineNotice}>
              <span>📱 Modo Offline</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ✅ APLICACIÓN PRINCIPAL
  console.log("🏠 App lista -", isOnline ? "ONLINE" : "OFFLINE");

  const handleViewChange = (view) => {
    setCurrentView(view);
  };

  const renderContent = () => {
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

  return (
    <DashboardLayout
      onViewChange={handleViewChange}
      currentView={currentView}
      isOnline={isOnline}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default AppRouter;
