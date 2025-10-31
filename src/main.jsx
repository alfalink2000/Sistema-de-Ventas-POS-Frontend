// src/main.jsx - VERSIÓN CORREGIDA Y SEGURA
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store/store";
import App from "./App.jsx";
import "./index.css";

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

// ✅ INICIALIZACIÓN SEGURA
const initializeApp = async () => {
  try {
    // Verificar estado PWA
    checkPWAStatus();

    // Registrar Service Worker (manera segura)
    await registerServiceWorker();

    // Renderizar la aplicación
    createRoot(document.getElementById("root")).render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>
    );

    console.log("✅ Aplicación iniciada correctamente");
  } catch (error) {
    console.error("❌ Error iniciando aplicación:", error);
  }
};

// Iniciar la aplicación
initializeApp();
