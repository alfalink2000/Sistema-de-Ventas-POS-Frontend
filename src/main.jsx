// src/main.jsx - VERSIÓN SIN SINCRONIZACIÓN AUTOMÁTICA
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store/store";
import App from "./App.jsx";
import "./index.css";

// ✅ REGISTRO SIMPLIFICADO DEL SERVICE WORKER
const registerServiceWorker = async () => {
  if ("serviceWorker" in navigator) {
    try {
      // Solo registrar en producción
      const shouldRegisterSW = import.meta.env.PROD;

      if (shouldRegisterSW) {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        console.log("✅ Service Worker registrado:", registration);

        // Manejar actualizaciones simples
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("🔄 Nuevo contenido disponible");
              }
            });
          }
        });
      } else {
        console.log("ℹ️ Service Worker deshabilitado en desarrollo");
      }
    } catch (error) {
      console.log("⚠️ Service Worker no registrado:", error.message);
    }
  } else {
    console.log("📱 Service Worker no soportado");
  }
};

// ✅ VERIFICACIÓN PWA BÁSICA
const checkPWAStatus = () => {
  console.log("PWA Check:");
  console.log("- HTTPS:", window.location.protocol === "https:");
  console.log("- Service Worker:", "serviceWorker" in navigator);
  console.log(
    "- Display Mode:",
    window.matchMedia("(display-mode: standalone)").matches
      ? "standalone"
      : "browser"
  );
};

// ✅ INICIALIZACIÓN SIMPLIFICADA
const initializeApp = async () => {
  try {
    console.log("🚀 Iniciando aplicación KioskoFlow...");

    // Verificar estado PWA
    checkPWAStatus();

    // Registrar Service Worker
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

    // Fallback: renderizar sin Service Worker
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
