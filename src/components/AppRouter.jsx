// AppRouter.jsx - VERSIÓN SIN SINCRONIZACIÓN AUTOMÁTICA
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
import IndexedDBService from "../services/IndexedDBService";
import styles from "./AppRouter.module.css";

const AppRouter = () => {
  const [currentView, setCurrentView] = useState("dashboard");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loadProgress, setLoadProgress] = useState({
    products: false,
    categories: false,
    sales: false,
    inventory: false,
    closures: false,
    sesionCaja: false,
  });

  const { isAuthenticated, checking, user } = useSelector(
    (state) => state.auth
  );
  const dispatch = useDispatch();
  const loadAttemptedRef = useRef(false);

  // ✅ INICIALIZACIÓN OFFLINE BÁSICA
  useEffect(() => {
    const initializeOffline = async () => {
      try {
        // Inicializar IndexedDB
        await IndexedDBService.init();
        console.log("✅ IndexedDB inicializado correctamente");

        if (!navigator.onLine) {
          console.log("📱 Modo offline - Usando datos locales");
        }
      } catch (error) {
        console.error("❌ Error inicializando servicios offline:", error);
      }
    };

    if (isAuthenticated && user) {
      initializeOffline();
    }
  }, [isAuthenticated, user]);

  // ✅ CARGA DE DATOS SIMPLIFICADA
  useEffect(() => {
    if (!checking && isAuthenticated && user && !loadAttemptedRef.current) {
      console.log("🔄 AppRouter: Iniciando carga de datos...", user);
      loadAttemptedRef.current = true;

      const loadAllData = async () => {
        try {
          console.log("🚀 === INICIANDO CARGA DE DATOS ===");

          // ✅ CARGAS CRÍTICAS PRIMERO
          const criticalLoads = [
            {
              key: "sesionCaja",
              action: () => dispatch(loadOpenSesion(user.id)),
              label: "sesión de caja",
              optional: false,
            },
            {
              key: "products",
              action: () => dispatch(loadProducts()),
              label: "productos",
              optional: false,
            },
            {
              key: "categories",
              action: () => dispatch(loadCategories()),
              label: "categorías",
              optional: false,
            },
          ];

          // ✅ EJECUTAR CARGAS CRÍTICAS
          for (const { key, action, label, optional } of criticalLoads) {
            console.log(`📦 Cargando ${label}...`);
            setLoadProgress((prev) => ({ ...prev, [key]: true }));

            try {
              await action();
              console.log(`✅ ${label} cargados correctamente`);
            } catch (error) {
              console.error(`❌ Error cargando ${label}:`, error);
              if (!optional) {
                console.log(
                  `🔄 Intentando usar datos locales para ${label}...`
                );
              }
            } finally {
              setLoadProgress((prev) => ({ ...prev, [key]: false }));
            }
          }

          // ✅ CARGAS SECUNDARIAS
          const secondaryLoads = [
            {
              key: "sales",
              action: () => dispatch(loadSales(10, 1)),
              label: "ventas",
            },
            {
              key: "inventory",
              action: () => dispatch(loadInventory()),
              label: "inventario",
            },
            {
              key: "closures",
              action: () => dispatch(loadTodayClosure()),
              label: "cierres de caja",
            },
          ];

          console.log("🔄 Ejecutando cargas secundarias...");
          const secondaryPromises = secondaryLoads.map(
            ({ key, action, label }) => {
              setLoadProgress((prev) => ({ ...prev, [key]: true }));
              return action().finally(() => {
                setLoadProgress((prev) => ({ ...prev, [key]: false }));
                console.log(`✅ ${label} cargados`);
              });
            }
          );

          await Promise.allSettled(secondaryPromises);

          console.log("🎉 === CARGA DE DATOS COMPLETADA ===");
          setInitialLoadComplete(true);
        } catch (error) {
          console.error("❌ Error en carga inicial:", error);
          // Permitir acceso a la app aunque haya errores
          console.log("🔄 Continuando con funcionalidad limitada...");
          setInitialLoadComplete(true);
        }
      };

      loadAllData();
    }
  }, [isAuthenticated, checking, user, dispatch]);

  // ✅ RESETEO AL CERRAR SESIÓN
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("🔄 Usuario cerró sesión, reseteando estados...");
      loadAttemptedRef.current = false;
      setInitialLoadComplete(false);
      setCurrentView("dashboard");
      setLoadProgress({
        products: false,
        categories: false,
        sales: false,
        inventory: false,
        closures: false,
        sesionCaja: false,
      });
    }
  }, [isAuthenticated]);

  // ✅ LOADING STATES
  if (checking) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <div className={styles.loadingContent}>
          <h3>Verificando autenticación...</h3>
          <p>Estamos preparando tu sesión</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("🔐 AppRouter: Redirigiendo a Login");
    return <Login />;
  }

  // ✅ SPINNER DE CARGA
  if (!initialLoadComplete) {
    const loadingItems = Object.entries(loadProgress)
      .filter(([_, isLoading]) => isLoading)
      .map(([key]) => {
        const labels = {
          products: "📦 Productos",
          categories: "🏷️ Categorías",
          sales: "💰 Ventas",
          inventory: "📊 Inventario",
          closures: "💳 Cierres de caja",
          sesionCaja: "🏦 Sesión de caja",
        };
        return labels[key] || key;
      });

    const completedItems = Object.entries(loadProgress)
      .filter(([_, isLoading]) => !isLoading)
      .map(([key]) => {
        const labels = {
          products: "Productos",
          categories: "Categorías",
          sales: "Ventas",
          inventory: "Inventario",
          closures: "Cierres",
          sesionCaja: "Sesión",
        };
        return labels[key] || key;
      });

    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <div className={styles.loadingContent}>
          <h3>Preparando tu aplicación</h3>
          <p>Cargando todos los datos necesarios...</p>

          {loadingItems.length > 0 && (
            <div className={styles.loadingSection}>
              <p className={styles.sectionTitle}>🔄 Cargando:</p>
              <div className={styles.itemsList}>
                {loadingItems.map((item, index) => (
                  <div key={index} className={styles.loadingItem}>
                    <span className={styles.spinnerSmall}></span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedItems.length > 0 && (
            <div className={styles.loadingSection}>
              <p className={styles.sectionTitle}>✅ Completado:</p>
              <div className={styles.itemsList}>
                {completedItems.map((item, index) => (
                  <div key={index} className={styles.completedItem}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  console.log("🏠 AppRouter: Mostrando aplicación principal");

  const handleViewChange = (view) => {
    console.log("🔄 Cambiando vista a:", view);
    setCurrentView(view);
  };

  // ✅ RENDERIZADO PRINCIPAL
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
    <DashboardLayout onViewChange={handleViewChange} currentView={currentView}>
      {renderContent()}
    </DashboardLayout>
  );
};

export default AppRouter;
