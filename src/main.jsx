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
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// ✅ 1. CARGAR CSS PRIMERO - ANTES DE REACT
import "./index.css";

// ✅ 2. CONFIGURACIÓN PWA MEJORADA
const initializeApp = async () => {
  try {
    console.log("🚀 Iniciando aplicación KioskoFlow...");

    // ✅ 3. VERIFICAR COMPATIBILIDAD DEL NAVEGADOR
    if (typeof Promise.allSettled === "undefined") {
      throw new Error(
        "Navegador no compatible. Actualice a una versión más reciente."
      );
    }

    // ✅ 4. REGISTRAR SERVICE WORKER
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log("✅ Service Worker registrado:", registration);
      } catch (swError) {
        console.warn("⚠️ Service Worker no disponible:", swError);
      }
    }

    // ✅ 5. IMPORTAR Y RENDERIZAR APP CON FALLBACK SEGURO
    let App, store, Provider;

    try {
      App = (await import("./App.jsx")).default;
      store = (await import("./store/store")).store;
      Provider = (await import("react-redux")).Provider;
    } catch (importError) {
      console.error("❌ Error importando módulos:", importError);
      throw new Error(
        "Error crítico: No se pudieron cargar los componentes de la aplicación"
      );
    }

    // ✅ 6. RENDERIZAR APLICACIÓN
    const root = createRoot(document.getElementById("root"));

    root.render(
      <StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </StrictMode>
    );

    // ✅ 7. MARCAR COMO CARGADO PARA OCULTAR LOADING INICIAL
    if (window.markReactLoaded) {
      window.markReactLoaded();
    } else {
      // Fallback si la función no está disponible
      setTimeout(() => {
        document.body.classList.add("react-loaded");
      }, 1000);
    }

    console.log("✅ Aplicación iniciada correctamente");
  } catch (error) {
    console.error("❌ Error crítico iniciando aplicación:", error);

    // ✅ FALLBACK ELEGANTE: Mostrar error al usuario
    const initialLoading = document.getElementById("initial-loading");
    if (initialLoading) {
      initialLoading.innerHTML = `
        <div style="text-align: center; color: white; padding: 20px; max-width: 400px;">
          <h2 style="margin-bottom: 15px;">Error al cargar la aplicación</h2>
          <p style="margin-bottom: 20px; opacity: 0.9;">${error.message}</p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button onclick="window.location.reload()" 
                    style="padding: 10px 20px; background: white; color: #667eea; 
                           border: none; border-radius: 5px; cursor: pointer; font-weight: 500;">
              🔄 Reintentar
            </button>
            <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload()" 
                    style="padding: 10px 20px; background: transparent; color: white; 
                           border: 1px solid white; border-radius: 5px; cursor: pointer;">
              🧹 Limpiar Cache
            </button>
          </div>
        </div>
      `;
    }
  }
};

// ✅ INICIAR APLICACIÓN CON MANEJO DE ERRORES GLOBAL
initializeApp().catch((finalError) => {
  console.error("💥 Error fatal en initializeApp:", finalError);
});
