// src/main.jsx - VERSIÓN COMPLETA CON SINCRONIZACIÓN AUTOMÁTICA
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store/store";
import App from "./App.jsx";
import "./index.css";
import SyncController from "./controllers/offline/SyncController/SyncController";

// ✅ REGISTRO SEGURO DEL SERVICE WORKER
const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      // Solo registrar en producción o si está explícitamente habilitado
      const shouldRegisterSW =
        import.meta.env.PROD || import.meta.env.VITE_ENABLE_SW === "true";

      if (shouldRegisterSW) {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        console.log("✅ Service Worker registrado:", registration);

        // Manejar actualizaciones
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              console.log("📱 Estado del SW:", newWorker.state);
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("🔄 Nuevo contenido disponible");
              }
            });
          }
        });

        // Manejar cambios de controlador
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("🔄 Controller cambiado - recargando página");
          window.location.reload();
        });
      } else {
        console.log("ℹ️ Service Worker deshabilitado en desarrollo");

        // Desregistrar cualquier SW existente en desarrollo
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
          console.log("🗑️ Service Worker desregistrado para desarrollo");
        }
      }
    } catch (error) {
      console.log("⚠️ Service Worker no registrado:", error.message);
      // No es crítico - la app funciona sin SW
    }
  } else {
    console.log("📱 Service Worker no soportado");
  }
};

// ✅ VERIFICACIÓN PWA MEJORADA
const checkPWAStatus = () => {
  console.log("PWA Check:");
  console.log("- HTTPS:", window.location.protocol === "https:");
  console.log("- Service Worker:", "serviceWorker" in navigator);
  console.log("- BeforeInstallPrompt:", "BeforeInstallPromptEvent" in window);
  console.log(
    "- Display Mode:",
    window.matchMedia("(display-mode: standalone)").matches
      ? "standalone"
      : "browser"
  );
};

// ✅ SINCRONIZACIÓN AUTOMÁTICA AL DETECTAR INTERNET
const setupAutoSync = () => {
  console.log("🔄 Configurando sincronización automática...");

  const handleOnline = async () => {
    console.log("🌐 EVENTO: Conexión a internet detectada - Main");

    // Pequeño delay para asegurar que la conexión sea estable
    setTimeout(async () => {
      try {
        console.log("🔄 Iniciando sincronización automática desde Main...");

        // Verificar si hay datos pendientes antes de sincronizar
        const syncStatus = await SyncController.getSyncStatus();

        if (syncStatus.totalPending === 0) {
          console.log("✅ No hay datos pendientes para sincronizar");
          return;
        }

        console.log(
          `📊 Datos pendientes encontrados: ${syncStatus.totalPending}`
        );
        console.log(`- Sesiones: ${syncStatus.pendingSessions}`);
        console.log(`- Ventas: ${syncStatus.pendingSales}`);
        console.log(`- Cierres: ${syncStatus.pendingClosures}`);

        // Ejecutar sincronización automática
        const result = await SyncController.autoSyncOnConnection();

        if (result.success) {
          console.log("✅ Sincronización automática completada:", {
            sesiones: result.sessions?.success || 0,
            ventas: result.sales?.success || 0,
            cierres: result.closures?.success || 0,
            total: result.totalProcessed || 0,
          });
        } else {
          console.error("❌ Error en sincronización automática:", result.error);
        }
      } catch (error) {
        console.error("❌ Error en auto-sync después de conexión:", error);
      }
    }, 3000); // 3 segundos de delay para conexión estable
  };

  // Verificar si ya hay conexión al cargar la aplicación
  const checkInitialConnection = async () => {
    if (navigator.onLine) {
      console.log(
        "🔍 Aplicación cargada con conexión - verificando sincronización..."
      );

      // Delay más largo para que la app termine de cargar completamente
      setTimeout(async () => {
        try {
          const syncStatus = await SyncController.getSyncStatus();
          if (syncStatus.totalPending > 0) {
            console.log(
              `🔄 Datos pendientes encontrados al cargar: ${syncStatus.totalPending}`
            );
            await SyncController.autoSyncOnConnection();
          } else {
            console.log("✅ No hay datos pendientes al cargar la aplicación");
          }
        } catch (error) {
          console.error("❌ Error en sync inicial:", error);
        }
      }, 8000); // 8 segundos después de cargar la app
    }
  };

  // Configurar event listener
  window.addEventListener("online", handleOnline);

  // Ejecutar verificación inicial
  checkInitialConnection();

  // Retornar función para limpiar el listener
  return () => {
    window.removeEventListener("online", handleOnline);
    console.log("🧹 Listeners de sincronización automática limpiados");
  };
};

// ✅ INICIALIZACIÓN SEGURA
const initializeApp = async () => {
  try {
    console.log("🚀 Iniciando aplicación KioskoFlow...");

    // Verificar estado PWA
    checkPWAStatus();

    // Registrar Service Worker (manera segura)
    await registerServiceWorker();

    // Configurar sincronización automática
    const cleanupSync = setupAutoSync();

    // Renderizar la aplicación
    createRoot(document.getElementById("root")).render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>
    );

    console.log("✅ Aplicación iniciada correctamente");

    // Manejar limpieza al desmontar (aunque en main.jsx esto es raro)
    return () => {
      cleanupSync();
    };
  } catch (error) {
    console.error("❌ Error iniciando aplicación:", error);

    // Fallback: renderizar sin sincronización automática
    createRoot(document.getElementById("root")).render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>
    );
  }
};

// Iniciar la aplicación
initializeApp();
