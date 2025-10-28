// src/components/ui/ConnectionStatus/ConnectionStatus.jsx
import React from "react";
import { useOfflineSales } from "../../../hook/useOfflineSales";
import { FiWifi, FiWifiOff, FiRefreshCw, FiCheckCircle } from "react-icons/fi";
import styles from "./ConnectionStatus.module.css";

const ConnectionStatus = () => {
  const { isOnline, syncStatus, forceSync } = useOfflineSales();

  return (
    <div
      className={`${styles.connectionStatus} ${
        isOnline ? styles.online : styles.offline
      }`}
    >
      <div className={styles.statusIndicator}>
        {isOnline ? (
          <FiWifi className={styles.onlineIcon} />
        ) : (
          <FiWifiOff className={styles.offlineIcon} />
        )}
        <span>{isOnline ? "En línea" : "Sin conexión"}</span>
      </div>

      {!isOnline && syncStatus.pendingSales > 0 && (
        <div className={styles.pendingSync}>
          <span className={styles.pendingText}>
            {syncStatus.pendingSales} ventas pendientes
          </span>
        </div>
      )}

      {isOnline && syncStatus.pendingSales > 0 && !syncStatus.isSyncing && (
        <button
          className={styles.syncButton}
          onClick={forceSync}
          title="Sincronizar datos pendientes"
        >
          <FiRefreshCw className={styles.syncIcon} />
          Sincronizar
        </button>
      )}

      {isOnline && syncStatus.isSyncing && (
        <div className={styles.syncing}>
          <FiRefreshCw className={`${styles.syncIcon} ${styles.spinning}`} />
          <span>Sincronizando...</span>
        </div>
      )}

      {isOnline && syncStatus.pendingSales === 0 && !syncStatus.isSyncing && (
        <div className={styles.synced}>
          <FiCheckCircle className={styles.syncedIcon} />
          <span>Todo sincronizado</span>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
