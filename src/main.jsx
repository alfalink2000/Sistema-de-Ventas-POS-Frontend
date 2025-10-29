// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Registrar Service Worker manualmente
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Intentar registrar el service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ SW registered: ", registration);

        // Verificar actualizaciones
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("🔄 Nuevo SW encontrado:", newWorker);
        });
      })
      .catch((registrationError) => {
        console.log("❌ SW registration failed: ", registrationError);
      });

    // Escuchar cambios en el service worker
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log("🔄 Controller changed - page will reload");
      window.location.reload();
    });
  });
}

// Verificar criterios PWA
console.log("PWA Check:");
console.log("- HTTPS:", window.location.protocol === "https:");
console.log("- Service Worker:", "serviceWorker" in navigator);
console.log("- BeforeInstallPrompt:", "BeforeInstallPromptEvent" in window);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
