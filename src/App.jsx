// App.jsx - VERSIÓN CORREGIDA
import { useEffect } from "react";
import { Provider, useDispatch, useSelector } from "react-redux";
import { store } from "./store/store";
import { startChecking } from "./actions/authActions";
import AppRouter from "./components/AppRouter";
import PWAInstallPrompt from "./components/ui/PWAInstallPrompt/PWAInstallPrompt";
import { cleanupCorruptedData } from "./utils/databaseCleanup";
import IndexedDBService from "./services/IndexedDBService";

// ✅ IMPORTAR LAS INSTANCIAS DIRECTAMENTE (NO CLASES)
import SessionsSyncController from "./controllers/offline/SessionsSyncController/SessionsSyncController";
import ClosuresSyncController from "./controllers/offline/ClosuresSyncController/ClosuresSyncController";
import StockSyncController from "./controllers/offline/StockSyncController/StockSyncController";

import "./index.css";

function AppContent() {
  const dispatch = useDispatch();
  const { checking, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    console.log("🚀 App iniciando...");
    dispatch(startChecking());
  }, [dispatch]);

  useEffect(() => {
    const initializeAppSafely = async () => {
      try {
        console.log("🚀 INICIANDO APLICACIÓN CON VERIFICACIONES...");

        // 1. Inicializar IndexedDB
        await IndexedDBService.init();

        // 2. Limpiar datos corruptos si es necesario
        await cleanupCorruptedData();

        // 3. ✅ USAR LAS INSTANCIAS DIRECTAMENTE (NO new)
        const criticalControllers = [
          {
            name: "SessionsSyncController",
            instance: SessionsSyncController, // Ya es instancia
          },
          {
            name: "ClosuresSyncController",
            instance: ClosuresSyncController, // Ya es instancia - NO usar new
          },
          {
            name: "StockSyncController",
            instance: StockSyncController, // Ya es instancia
          },
        ];

        for (const controller of criticalControllers) {
          try {
            console.log(`🔍 Verificando ${controller.name}...`);

            // Verificar que el controlador tenga métodos esenciales
            if (typeof controller.instance.syncPendingChanges === "function") {
              console.log(
                `✅ ${controller.name} - syncPendingChanges disponible`
              );

              // ✅ OPCIONAL: Ejecutar sincronización inicial si hay conexión
              if (navigator.onLine) {
                console.log(
                  `🔄 ${controller.name} - Sincronizando pendientes...`
                );
                const result = await controller.instance.syncPendingChanges();
                console.log(`📊 ${controller.name} - Resultado:`, result);
              }
            } else {
              console.warn(
                `⚠️ ${controller.name} - syncPendingChanges NO disponible`
              );
            }

            if (typeof controller.instance.getPendingCount === "function") {
              console.log(`✅ ${controller.name} - getPendingCount disponible`);
              const count = await controller.instance.getPendingCount();
              console.log(`📊 ${controller.name} - Pendientes: ${count}`);
            } else {
              console.warn(
                `⚠️ ${controller.name} - getPendingCount NO disponible`
              );
            }
          } catch (error) {
            console.error(`❌ Error verificando ${controller.name}:`, error);
          }
        }

        console.log("🎯 APLICACIÓN INICIALIZADA CORRECTAMENTE");
      } catch (error) {
        console.error("💥 ERROR CRÍTICO INICIALIZANDO APLICACIÓN:", error);
      }
    };

    initializeAppSafely();
  }, []);

  return (
    <>
      <PWAInstallPrompt />
      <AppRouter />
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
