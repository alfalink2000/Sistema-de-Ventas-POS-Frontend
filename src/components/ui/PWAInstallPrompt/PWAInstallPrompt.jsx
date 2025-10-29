// src/components/ui/PWAInstallPrompt/PWAInstallPrompt.jsx
import { useState, useEffect } from "react";
import { usePWAInstall } from "../../../hook/usePWAInstall";
import { FiDownload, FiX } from "react-icons/fi";
import styles from "./PWAInstallPrompt.module.css";

const PWAInstallPrompt = () => {
  const { isInstallable, installApp } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isInstallable) {
      // Mostrar después de un delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    const installed = await installApp();
    if (installed) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Opcional: guardar en localStorage para no mostrar nuevamente
    localStorage.setItem("pwaPromptDismissed", "true");
  };

  if (!isVisible) return null;

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
};

export default PWAInstallPrompt;
