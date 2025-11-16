// import { StrictMode } from "react";
// import { createRoot } from "react-dom/client";
// import { Provider } from "react-redux";
// import { store } from "./store/store";
// import App from "./App.jsx";
// import "./index.css";

// // ✅ REGISTRO SIMPLIFICADO - Vite PWA se encarga del registro automático
// const initializeApp = async () => {
//   try {
//     console.log("🚀 Iniciando aplicación KioskoFlow...");

//     // Verificar capacidades PWA
//     console.log("PWA Check:");
//     console.log("- HTTPS:", window.location.protocol === "https:");
//     console.log("- Service Worker:", "serviceWorker" in navigator);
//     console.log(
//       "- Display Mode:",
//       window.matchMedia("(display-mode: standalone)").matches
//         ? "standalone"
//         : "browser"
//     );

//     // Vite PWA se registra automáticamente gracias a injectRegister: "auto"
//     // Solo verificar si está registrado
//     if ("serviceWorker" in navigator) {
//       const registration = await navigator.serviceWorker.ready;
//       console.log("✅ Service Worker registrado:", registration);

//       // Escuchar actualizaciones
//       registration.addEventListener("updatefound", () => {
//         const newWorker = registration.installing;
//         if (newWorker) {
//           newWorker.addEventListener("statechange", () => {
//             if (
//               newWorker.state === "installed" &&
//               navigator.serviceWorker.controller
//             ) {
//               console.log("🔄 Nuevo contenido disponible");
//               // Puedes mostrar un banner de actualización aquí
//               window.dispatchEvent(new CustomEvent("swUpdateAvailable"));
//             }
//           });
//         }
//       });
//     }

//     // Renderizar la aplicación
//     createRoot(document.getElementById("root")).render(
//       <StrictMode>
//         <Provider store={store}>
//           <App />
//         </Provider>
//       </StrictMode>
//     );

//     console.log("✅ Aplicación iniciada correctamente");
//   } catch (error) {
//     console.error("❌ Error crítico iniciando aplicación:", error);

//     // ✅ FALLBACK: Renderizar de todos modos
//     createRoot(document.getElementById("root")).render(
//       <StrictMode>
//         <Provider store={store}>
//           <App />
//         </Provider>
//       </StrictMode>
//     );
//   }
// };

// // Iniciar la aplicación
// initializeApp();

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store/store";
import App from "./App.jsx";
import "./index.css";

// ✅ FUNCIÓN SIMPLIFICADA SIN IMPORTS DINÁMICOS
const initializeApp = async () => {
  try {
    console.log("🚀 Iniciando aplicación KioskoFlow...");

    // ✅ VERIFICAR COMPATIBILIDAD BÁSICA
    if (typeof Promise === "undefined") {
      throw new Error("Este navegador no es compatible con la aplicación");
    }

    // ✅ REGISTRO DE SERVICE WORKER (OPCIONAL)
    if ("serviceWorker" in navigator) {
      try {
        // Vite PWA se encarga del registro automático
        console.log("✅ Service Worker gestionado por Vite PWA");
      } catch (swError) {
        console.warn("⚠️ Service Worker no disponible:", swError);
      }
    }

    // ✅ RENDERIZAR APLICACIÓN DIRECTAMENTE
    const root = createRoot(document.getElementById("root"));

    root.render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>
    );

    // ✅ MARCAR COMO CARGADO
    if (window.markReactLoaded) {
      window.markReactLoaded();
    } else {
      // Fallback seguro
      setTimeout(() => {
        document.body.classList.add("react-loaded");
      }, 500);
    }

    console.log("✅ Aplicación iniciada correctamente");
  } catch (error) {
    console.error("❌ Error crítico iniciando aplicación:", error);

    // ✅ FALLBACK URGENTE
    const initialLoading = document.getElementById("initial-loading");
    if (initialLoading) {
      initialLoading.innerHTML = `
        <div style="text-align: center; color: white; padding: 20px;">
          <h2 style="margin-bottom: 15px;">⚠️ Error de Carga</h2>
          <p style="margin-bottom: 20px; opacity: 0.9;">${error.message}</p>
          <button onclick="window.location.reload()" 
                  style="padding: 12px 24px; background: white; color: #667eea; 
                         border: none; border-radius: 8px; cursor: pointer; 
                         font-weight: 600; font-size: 16px;">
            🔄 Reintentar
          </button>
        </div>
      `;
    }
  }
};

// ✅ INICIAR INMEDIATAMENTE
initializeApp();
