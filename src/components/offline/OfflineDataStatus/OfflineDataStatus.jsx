// src/components/features/offline/OfflineDataStatus/OfflineDataStatus.jsx - VERSIÓN CORREGIDA
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
  FiDatabase,
} from "react-icons/fi";
import styles from "./OfflineDataStatus.module.css";

const OfflineDataStatus = () => {
  const {
    hasOfflineData,
    offlineUsers,
    syncUsers,
    isLoading,
    usersStats,
    cleanupDuplicates,
  } = useOfflineAuth();

  const { productos, categorias, lastUpdate } = useOfflineData();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStats, setShowStats] = useState(false);

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

  const handleCleanup = async () => {
    await cleanupDuplicates();
    // Recargar usuarios después de limpiar
    window.location.reload(); // O usar tu función de recarga
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

  // ✅ MOSTRAR INFORMACIÓN DE DEBUG SI HAY DUPLICADOS
  const hasDuplicates = usersStats && usersStats.duplicates > 0;

  return (
    <div className={styles.container}>
      <div className={isOnline ? styles.statusOnline : styles.statusOffline}>
        {isOnline ? (
          <FiWifi className={styles.onlineIcon} />
        ) : (
          <FiWifiOff className={styles.offlineIcon} />
        )}
        <span>{isOnline ? "Conexión activa" : "Modo Offline"}</span>

        {/* ✅ BOTÓN DE DEBUG */}
        {hasDuplicates && (
          <button
            className={styles.debugButton}
            onClick={() => setShowStats(!showStats)}
            title="Mostrar información de depuración"
          >
            <FiDatabase />
          </button>
        )}
      </div>

      {/* ✅ INFORMACIÓN DE DEBUG */}
      {showStats && usersStats && (
        <div className={styles.debugInfo}>
          <div className={styles.debugItem}>
            <strong>Estadísticas de Usuarios:</strong>
          </div>
          <div className={styles.debugItem}>
            Registros totales: {usersStats.totalRecords}
          </div>
          <div className={styles.debugItem}>
            Usuarios únicos: {usersStats.uniqueUsers}
          </div>
          <div className={styles.debugItem}>
            Duplicados:{" "}
            <span className={styles.duplicateWarning}>
              {usersStats.duplicates}
            </span>
          </div>
          {usersStats.duplicates > 0 && (
            <button className={styles.cleanupButton} onClick={handleCleanup}>
              🧹 Limpiar Duplicados
            </button>
          )}
        </div>
      )}

      <div className={styles.dataStatus}>
        <div className={styles.dataItem}>
          <FiUsers className={styles.dataIcon} />
          <span>
            {offlineUsers.length} usuario{offlineUsers.length !== 1 ? "s" : ""}{" "}
            disponible{offlineUsers.length !== 1 ? "s" : ""} offline
            {hasDuplicates && <span className={styles.duplicateBadge}>!</span>}
          </span>
        </div>

        <div className={styles.dataItem}>
          <FiPackage className={styles.dataIcon} />
          <span>{productos.length} productos disponibles offline</span>
        </div>

        {lastUpdate && (
          <div className={styles.lastUpdate}>
            Actualizado: {formatDate(lastUpdate)}
          </div>
        )}

        {/* Mensajes de estado */}
        {dataStatus === "optimal" && (
          <div className={styles.dataSuccess}>
            <FiCheckCircle className={styles.successIcon} />
            <span>Listo para trabajar sin conexión</span>
          </div>
        )}

        {dataStatus === "critical" && (
          <div className={styles.dataWarning}>
            <FiAlertTriangle className={styles.warningIcon} />
            <span>
              {isOnline
                ? "Datos offline insuficientes. Sincroniza para modo offline."
                : "Datos insuficientes. Conecta a internet para sincronizar."}
            </span>
          </div>
        )}

        {/* Botón de sincronización */}
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
};

export default OfflineDataStatus;
