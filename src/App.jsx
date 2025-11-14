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
  const { checking, isAuthenticated, user } = useSelector(
    (state) => state.auth
  );

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
            instance: SessionsSyncController,
          },
          {
            name: "ClosuresSyncController",
            instance: ClosuresSyncController,
          },
          {
            name: "StockSyncController",
            instance: StockSyncController,
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

              // ✅ NO EJECUTAR SINCRONIZACIÓN INMEDIATA - SOLO VERIFICAR DISPONIBILIDAD
              console.log(
                `⏸️ ${controller.name} - Sincronización pausada hasta autenticación`
              );
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

  // ✅ NUEVO EFFECT: Sincronizar solo cuando el usuario esté autenticado
  useEffect(() => {
    const syncWhenAuthenticated = async () => {
      // Solo sincronizar si el usuario está autenticado y hay conexión
      if (isAuthenticated && user && navigator.onLine) {
        console.log(
          `🔐 Usuario autenticado: ${user.nombre} - Iniciando sincronización segura...`
        );

        try {
          // Pequeño delay para asegurar que todo esté listo
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // ✅ VERIFICAR TOKEN ANTES DE SINCRONIZAR
          const token = localStorage.getItem("token");
          if (!token) {
            console.log("⏸️ No hay token disponible, omitiendo sincronización");
            return;
          }

          console.log("🔄 Iniciando sincronización de cambios pendientes...");

          // Sincronizar en orden específico
          const syncResults = [];

          // 1. Stock primero
          try {
            console.log("📦 Sincronizando cambios de stock...");
            const stockResult = await StockSyncController.syncPendingChanges();
            syncResults.push({ type: "stock", result: stockResult });
          } catch (stockError) {
            console.error("❌ Error sincronizando stock:", stockError);
            syncResults.push({ type: "stock", error: stockError.message });
          }

          // 2. Sesiones después
          try {
            console.log("🏦 Sincronizando sesiones...");
            const sessionsResult =
              await SessionsSyncController.syncPendingChanges();
            syncResults.push({ type: "sessions", result: sessionsResult });
          } catch (sessionsError) {
            console.error("❌ Error sincronizando sesiones:", sessionsError);
            syncResults.push({
              type: "sessions",
              error: sessionsError.message,
            });
          }

          // 3. Cierres al final
          try {
            console.log("💰 Sincronizando cierres...");
            const closuresResult =
              await ClosuresSyncController.syncPendingChanges();
            syncResults.push({ type: "closures", result: closuresResult });
          } catch (closuresError) {
            console.error("❌ Error sincronizando cierres:", closuresError);
            syncResults.push({
              type: "closures",
              error: closuresError.message,
            });
          }

          console.log("📊 Resumen de sincronización:", syncResults);
        } catch (error) {
          console.error("❌ Error en sincronización autenticada:", error);
        }
      } else {
        console.log(
          `⏸️ Sincronización pausada - Autenticado: ${isAuthenticated}, Online: ${navigator.onLine}`
        );
      }
    };

    syncWhenAuthenticated();
  }, [isAuthenticated, user]); // Solo se ejecuta cuando cambia la autenticación

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
