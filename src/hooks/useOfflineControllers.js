// hooks/useOfflineControllers.js
import { useState, useEffect } from "react";

export const useOfflineControllers = () => {
  const [controllers, setControllers] = useState({
    ClosuresOfflineController: null,
    SessionsOfflineController: null,
    SalesOfflineController: null,
    loaded: false,
  });

  useEffect(() => {
    const loadControllers = async () => {
      try {
        console.log("🔄 Cargando controladores offline...");

        const [closuresCtrl, sessionsCtrl, salesCtrl] = await Promise.all([
          import(
            "../controllers/offline/ClosuresOfflineController/ClosuresOfflineController"
          ),
          import(
            "../controllers/offline/SessionsOfflineController/SessionsOfflineController"
          ),
          import(
            "../controllers/offline/SalesOfflineController/SalesOfflineController"
          ),
        ]);

        console.log("✅ Controladores cargados exitosamente");

        setControllers({
          ClosuresOfflineController: closuresCtrl.default,
          SessionsOfflineController: sessionsCtrl.default,
          SalesOfflineController: salesCtrl.default,
          loaded: true,
        });
      } catch (error) {
        console.warn(
          "⚠️ Algunos controladores offline no están disponibles:",
          error
        );
        setControllers((prev) => ({ ...prev, loaded: true }));
      }
    };

    loadControllers();
  }, []);

  return controllers;
};
