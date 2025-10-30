// AppRouter.jsx - VERSIÓN OPTIMIZADA PARA OFFLINE
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
import SyncService from "../services/SyncService";
import { useOfflineData } from "../hook/useOfflineData";
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

  const { productos, categorias, loading: offlineLoading } = useOfflineData();

  const { isAuthenticated, checking, user } = useSelector(
    (state) => state.auth
  );
  const dispatch = useDispatch();
  const loadAttemptedRef = useRef(false);

  // ✅ INICIALIZACIÓN OFFLINE MEJORADA
  useEffect(() => {
    const initializeOffline = async () => {
      try {
        await SyncService.init();
        console.log("✅ Servicios offline inicializados");

        // ✅ SINCRONIZAR AUTOMÁTICAMENTE SI HAY CONEXIÓN
        if (navigator.onLine) {
          setTimeout(() => {
            SyncService.trySync();
          }, 3000);
        }
      } catch (error) {
        console.error("❌ Error inicializando servicios offline:", error);
      }
    };

    if (isAuthenticated && user) {
      initializeOffline();
    }
  }, [isAuthenticated, user]);

  // ✅ CARGA DE DATOS OPTIMIZADA CON OFFLINE
  useEffect(() => {
    if (!checking && isAuthenticated && user && !loadAttemptedRef.current) {
      console.log("🔄 AppRouter: Iniciando carga completa de datos...", user);
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
            },
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

          // ✅ CARGAS SECUNDARIAS DESPUÉS
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

          // ✅ EJECUTAR CARGAS CRÍTICAS
          for (const { key, action, label } of criticalLoads) {
            console.log(`📦 Cargando ${label}...`);
            setLoadProgress((prev) => ({ ...prev, [key]: true }));
            await action();
            setLoadProgress((prev) => ({ ...prev, [key]: false }));
            console.log(`✅ ${label} cargados correctamente`);
          }

          // ✅ EJECUTAR CARGAS SECUNDARIAS EN PARALELO
          console.log("🔄 Ejecutando cargas secundarias en paralelo...");
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

          console.log("🎉 === TODOS LOS DATOS CARGADOS EXITOSAMENTE ===");
          setInitialLoadComplete(true);
        } catch (error) {
          console.error("❌ Error en carga inicial:", error);
          // ✅ PERMITIR ACCESO A LA APP AUNQUE HAYA ERRORES
          setInitialLoadComplete(true);
        }
      };

      loadAllData();
    }
  }, [isAuthenticated, checking, user, dispatch]);

  // ✅ RESETEO MEJORADO AL CERRAR SESIÓN
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

  // ✅ LOADING STATES MEJORADOS
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

  // ✅ SPINNER DE CARGA CON INFORMACIÓN DETALLADA
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

  // ✅ RENDERIZADO OPTIMIZADO CON OFFLINE SUPPORT
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
