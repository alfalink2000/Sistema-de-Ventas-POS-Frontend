// AppRouter.jsx - VERSIÓN COMPLETA MEJORADA
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
import LoadingSpinner from "../components/ui/LoadingSpinner/LoadingSpinner";
import SyncService from "../services/SyncService";
import { useOfflineData } from "../hook/useOfflineData";

const AppRouter = () => {
  const [currentView, setCurrentView] = useState("sales");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loadProgress, setLoadProgress] = useState({
    products: false,
    categories: false,
    sales: false,
    inventory: false,
    closures: false,
  });

  const { productos, categorias, loading: offlineLoading } = useOfflineData();

  const { isAuthenticated, checking, user } = useSelector(
    (state) => state.auth
  );
  const dispatch = useDispatch();
  const loadAttemptedRef = useRef(false);

  // ✅ CARGA DE DATOS OPTIMIZADA
  useEffect(() => {
    console.log("🔍 AppRouter State:", {
      checking,
      isAuthenticated,
      user: !!user,
      initialLoadComplete,
      loadAttempted: loadAttemptedRef.current,
    });
    // Inicializar servicio de sincronización
    const initializeOffline = async () => {
      try {
        await SyncService.init();
        console.log("✅ Servicios offline inicializados");
      } catch (error) {
        console.error("❌ Error inicializando servicios offline:", error);
      }
    };

    if (isAuthenticated && user) {
      initializeOffline();
    }
    if (!checking && isAuthenticated && user && !loadAttemptedRef.current) {
      console.log("🔄 AppRouter: Iniciando carga completa de datos...", user);
      loadAttemptedRef.current = true;

      const loadAllData = async () => {
        try {
          console.log("🚀 === INICIANDO CARGA DE DATOS ===");

          // ✅ ARRAY DE CARGAS PARA EJECUCIÓN ORDENADA
          const loadPromises = [
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

          // ✅ EJECUTAR CARGAS EN SECUENCIA CON FEEDBACK
          for (const { key, action, label } of loadPromises) {
            console.log(`📦 Cargando ${label}...`);
            setLoadProgress((prev) => ({ ...prev, [key]: true }));
            await action();
            setLoadProgress((prev) => ({ ...prev, [key]: false }));
            console.log(`✅ ${label} cargados correctamente`);
          }

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
      setCurrentView("sales"); // ✅ RESETEAR VISTA POR DEFECTO
      setLoadProgress({
        products: false,
        categories: false,
        sales: false,
        inventory: false,
        closures: false,
      });
    }
  }, [isAuthenticated]);

  // ✅ LOADING STATES MEJORADOS
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
        <span className="ml-3 text-gray-600">Verificando autenticación...</span>
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
          products: "Productos",
          categories: "Categorías",
          sales: "Ventas",
          inventory: "Inventario",
          closures: "Cierres de caja",
          sesionCaja: "Sesión de caja",
        };
        return labels[key] || key;
      });

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <LoadingSpinner size="large" />
        <div className="mt-6 text-center max-w-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            Preparando tu aplicación
          </h3>
          <p className="text-gray-600 mb-4">
            Estamos cargando todos los datos necesarios para que puedas
            comenzar...
          </p>
          {loadingItems.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Cargando:
              </p>
              <ul className="text-sm text-blue-700 list-disc list-inside">
                {loadingItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
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

  // ✅ RENDERIZADO OPTIMIZADO CON OBJETO DE VISTAS
  const renderContent = () => {
    const views = {
      dashboard: <Dashboard />,
      sales: <Sales />,
      products: <Products />,
      inventory: <Inventory />,
      reports: <Reports />,
      caja: <Caja />,
      users: <Users />,
    };

    return views[currentView] || <Sales />;
  };

  return (
    <DashboardLayout onViewChange={handleViewChange} currentView={currentView}>
      {renderContent()}
    </DashboardLayout>
  );
};

export default AppRouter;
