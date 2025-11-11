// src/components/ui/PWAInstallPrompt/PWAInstallPrompt.jsx - VERSIÓN SEGURA
import { useState, useEffect } from "react";
import { usePWAInstall } from "../../../hooks/usePWAInstall";
import { FiDownload, FiX } from "react-icons/fi";
import styles from "./PWAInstallPrompt.module.css";

// ✅ COMPONENTE CON MANEJO DE ERRORES
const PWAInstallPrompt = () => {
  try {
    const { isInstallable, installApp } = usePWAInstall();
    const [isVisible, setIsVisible] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
      if (error) {
        console.warn("PWAInstallPrompt error:", error);
        return;
      }

      if (isInstallable) {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 3000);

        return () => clearTimeout(timer);
      }
    }, [isInstallable, error]);

    const handleInstall = async () => {
      try {
        const installed = await installApp();
        if (installed) {
          setIsVisible(false);
        }
      } catch (err) {
        console.error("Error installing PWA:", err);
        setError(err.message);
      }
    };

    const handleDismiss = () => {
      setIsVisible(false);
      localStorage.setItem("pwaPromptDismissed", "true");
    };

    // ✅ SI HAY ERROR, NO RENDERIZAR NADA
    if (error || !isVisible) return null;

    return (
      <div className={styles.installPrompt}>
        <div className={styles.promptContent}>
          <div className={styles.promptInfo}>
            <FiDownload className={styles.installIcon} />
            <div>
              <h4>Instalar Kiosko POS</h4>
              <p>Instala la aplicación para usar offline y acceso rápido</p>
            </div>
          </div>
          <div className={styles.promptActions}>
            <button className={styles.installButton} onClick={handleInstall}>
              Instalar
            </button>
            <button className={styles.dismissButton} onClick={handleDismiss}>
              <FiX />
            </button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    // ✅ CAPTURAR ERRORES DE RENDERIZADO
    console.error("PWAInstallPrompt render error:", error);
    return null;
  }
};

export default PWAInstallPrompt;
