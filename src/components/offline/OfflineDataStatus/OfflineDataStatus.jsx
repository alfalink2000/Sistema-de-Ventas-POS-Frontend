// src/components/features/offline/OfflineDataStatus/OfflineDataStatus.jsx (VERSIÓN MEJORADA)
import { useState, useEffect } from "react";
import { useOfflineAuth } from "../../../hook/useOfflineAuth";
import { useOfflineData } from "../../../hook/useOfflineData";
import {
  FiWifi,
  FiWifiOff,
  FiUsers,
  FiPackage,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheckCircle,
} from "react-icons/fi";
import styles from "./OfflineDataStatus.module.css";

const OfflineDataStatus = () => {
  const { hasOfflineData, offlineUsers, syncUsers, isLoading } =
    useOfflineAuth();
  const { productos, categorias, lastUpdate } = useOfflineData();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSync = async () => {
    await syncUsers();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calcular estado de datos
  const getDataStatus = () => {
    const hasUsers = offlineUsers.length > 0;
    const hasProducts = productos.length > 0;
    const hasCategories = categorias.length > 0;

    if (hasUsers && hasProducts && hasCategories) {
      return "optimal";
    } else if (hasUsers && hasProducts) {
      return "good";
    } else if (hasUsers) {
      return "minimal";
    } else {
      return "critical";
    }
  };

  const dataStatus = getDataStatus();

  if (isOnline) {
    return (
      <div className={styles.container}>
        <div className={styles.statusOnline}>
          <FiWifi className={styles.onlineIcon} />
          <span>Conexión activa</span>
        </div>

        {/* Mostrar estado de datos incluso cuando hay conexión */}
        <div className={styles.dataStatus}>
          <div className={styles.dataItem}>
            <FiUsers className={styles.dataIcon} />
            <span>{offlineUsers.length} usuarios disponibles offline</span>
          </div>

          <div className={styles.dataItem}>
            <FiPackage className={styles.dataIcon} />
            <span>{productos.length} productos disponibles offline</span>
          </div>

          {dataStatus === "critical" && isOnline && (
            <div className={styles.dataWarning}>
              <div className={styles.dataWarningContent}>
                <FiAlertTriangle className={styles.warningIcon} />
                <span>
                  Datos offline insuficientes. Sincroniza para modo offline.
                </span>
              </div>
            </div>
          )}

          {dataStatus === "optimal" && (
            <div className={styles.dataSuccess}>
              <div className={styles.dataSuccessContent}>
                <FiCheckCircle className={styles.successIcon} />
                <span>Listo para trabajar sin conexión</span>
              </div>
            </div>
          )}

          {(dataStatus === "critical" || dataStatus === "minimal") &&
            isOnline && (
              <button
                className={styles.syncButton}
                onClick={handleSync}
                disabled={isLoading}
              >
                <FiRefreshCw className={isLoading ? styles.spinning : ""} />
                {isLoading ? "Sincronizando..." : "Sincronizar Datos Offline"}
              </button>
            )}
        </div>
      </div>
    );
  }

  // Modo offline
  return (
    <div className={styles.container}>
      <div className={styles.statusOffline}>
        <FiWifiOff className={styles.offlineIcon} />
        <span>Modo Offline</span>
      </div>

      <div className={styles.dataStatus}>
        <div className={styles.dataItem}>
          <FiUsers className={styles.dataIcon} />
          <span>{offlineUsers.length} usuarios disponibles</span>
        </div>

        <div className={styles.dataItem}>
          <FiPackage className={styles.dataIcon} />
          <span>{productos.length} productos cargados</span>
        </div>

        {lastUpdate && (
          <div className={styles.lastUpdate}>
            Actualizado: {formatDate(lastUpdate)}
          </div>
        )}

        {dataStatus === "optimal" && (
          <div className={styles.dataSuccess}>
            <div className={styles.dataSuccessContent}>
              <FiCheckCircle className={styles.successIcon} />
              <span>Todos los datos disponibles para trabajar offline</span>
            </div>
          </div>
        )}

        {dataStatus === "critical" && (
          <div className={styles.dataWarning}>
            <div className={styles.dataWarningContent}>
              <FiAlertTriangle className={styles.warningIcon} />
              <span>
                Datos insuficientes. Conecta a internet para sincronizar.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineDataStatus;
