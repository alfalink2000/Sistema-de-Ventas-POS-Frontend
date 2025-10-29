// src/hooks/usePWAInstall.js
import { useState, useEffect } from "react";

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      console.log("🔄 PWA: beforeinstallprompt event fired");
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Verificar si ya está instalado
    const checkIfInstalled = () => {
      if (window.matchMedia("(display-mode: standalone)").matches) {
        console.log("✅ PWA: Ya está instalado");
        setIsInstallable(false);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      console.log("🎉 PWA: Aplicación instalada");
      setDeferredPrompt(null);
      setIsInstallable(false);
    });

    checkIfInstalled();

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      console.log("❌ PWA: No hay prompt de instalación disponible");
      return false;
    }

    try {
      console.log("📱 PWA: Solicitando instalación...");
      deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;
      console.log(`📱 PWA: Usuario ${outcome} la instalación`);

      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstallable(false);
        return true;
      }
    } catch (error) {
      console.error("❌ PWA: Error durante la instalación:", error);
    }

    return false;
  };

  return {
    isInstallable,
    installApp,
    deferredPrompt,
  };
};
