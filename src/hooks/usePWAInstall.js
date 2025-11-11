// src/hooks/usePWAInstall.js - VERSIÓN MEJORADA
import { useState, useEffect } from "react";

export const usePWAInstall = () => {
  // ✅ VERIFICAR QUE ESTAMOS EN EL CLIENTE
  if (typeof window === "undefined") {
    return {
      isInstallable: false,
      installApp: async () => false,
      deferredPrompt: null,
    };
  }

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // ✅ VERIFICAR QUE window EXISTE
    if (typeof window === "undefined") return;

    const handler = (e) => {
      e.preventDefault();
      console.log("🔄 PWA: beforeinstallprompt event fired");
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const checkIfInstalled = () => {
      if (
        window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches
      ) {
        console.log("✅ PWA: Ya está instalado");
        setIsInstallable(false);
      }
    };

    // ✅ VERIFICAR QUE LOS EVENTOS EXISTEN
    if (window.addEventListener) {
      window.addEventListener("beforeinstallprompt", handler);
      window.addEventListener("appinstalled", () => {
        console.log("🎉 PWA: Aplicación instalada");
        setDeferredPrompt(null);
        setIsInstallable(false);
      });
    }

    checkIfInstalled();

    return () => {
      if (window.removeEventListener) {
        window.removeEventListener("beforeinstallprompt", handler);
      }
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
