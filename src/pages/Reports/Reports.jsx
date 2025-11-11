// pages/Reports/Reports.jsx - VERSIÓN MEJORADA
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ClosuresHistory from "../../components/features/caja/ClosuresHistory/ClosuresHistory";
import {
  loadClosures,
  loadOfflineClosures, // ✅ NUEVO MÉTODO
} from "../../actions/closuresActions";
import {
  FiCalendar,
  FiArchive,
  FiRefreshCw,
  FiWifi,
  FiWifiOff,
  FiDownload,
  FiBarChart2,
} from "react-icons/fi";
import styles from "./Reports.module.css";

const Reports = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [forceLoaded, setForceLoaded] = useState(false);

  const dispatch = useDispatch();
  const { closures, loading } = useSelector((state) => state.closures);
  const { user } = useSelector((state) => state.auth);
  const isOnline = navigator.onLine;

  // ✅ CORREGIDO: Carga inteligente de cierres
  useEffect(() => {
    console.log("🔄 Reports: Iniciando carga de cierres...", {
      isOnline,
      closuresCount: closures.length,
      forceLoaded,
    });

    const loadClosuresData = async () => {
      try {
        if (isOnline) {
          // ✅ ONLINE: Cargar desde API
          console.log("🌐 Reports: Cargando cierres online...");
          await dispatch(loadClosures(100));
        } else {
          // ✅ OFFLINE: Cargar específicamente cierres offline
          console.log("📱 Reports: Cargando cierres offline...");
          await dispatch(loadOfflineClosures());
        }

        setForceLoaded(true);
        console.log("✅ Reports: Carga completada");
      } catch (error) {
        console.error("❌ Reports: Error cargando cierres:", error);

        // ✅ FALLBACK: Intentar carga offline si falla la online
        if (isOnline) {
          console.log("🔄 Reports: Fallback a carga offline...");
          await dispatch(loadOfflineClosures());
        }
      }
    };

    // Solo cargar si no hay datos o si cambió el estado de conexión
    if (!forceLoaded || closures.length === 0) {
      loadClosuresData();
    }
  }, [dispatch, isOnline, forceLoaded]); // ✅ isOnline como dependencia

  // ✅ RECARGAR AL CAMBIAR CONEXIÓN
  useEffect(() => {
    if (forceLoaded) {
      console.log("🔄 Reports: Estado conexión cambiado, recargando...");
      const reloadData = async () => {
        if (isOnline) {
          await dispatch(loadClosures(100));
        } else {
          await dispatch(loadOfflineClosures());
        }
      };
      reloadData();
    }
  }, [isOnline, dispatch, forceLoaded]);

  const handleSync = async () => {
    if (!isOnline) return;

    setSyncing(true);
    try {
      await dispatch(syncPendingClosures());
      setLastSync(new Date());

      // Recargar después de sincronizar
      setTimeout(() => {
        dispatch(loadClosures(100));
      }, 2000);
    } catch (error) {
      console.error("Error en sincronización:", error);
    } finally {
      setSyncing(false);
    }
  };

  // ... resto del componente igual
  return (
    <div className={styles.reportsPage}>
      {/* Header con controles */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>
            <FiBarChart2 className={styles.headerIcon} />
            <div>
              <h1>Reportes y Cierres de Caja</h1>
              <p>
                {isOnline
                  ? "Datos en tiempo real del servidor"
                  : "Datos locales almacenados offline"}
              </p>
            </div>
          </div>

          <div className={styles.headerStats}>
            <div className={styles.statBadge}>
              <FiArchive className={styles.statIcon} />
              <span>{closures.length} cierres registrados</span>
            </div>

            {!isOnline && (
              <div className={styles.offlineBadge}>
                <FiWifiOff />
                <span>Modo offline</span>
              </div>
            )}
          </div>
        </div>

        {/* Controles */}
        <div className={styles.headerActions}>
          {isOnline && (
            <button
              className={styles.syncButton}
              onClick={handleSync}
              disabled={syncing}
            >
              <FiRefreshCw className={syncing ? styles.spinning : ""} />
              {syncing ? "Sincronizando..." : "Sincronizar"}
            </button>
          )}
        </div>
      </div>

      {/* Resto del componente igual */}
      <div className={styles.closuresSection}>
        <div className={styles.sectionHeader}>
          <h2>
            <FiCalendar className={styles.sectionIcon} />
            Historial Detallado de Cierres
          </h2>
          <div className={styles.sectionInfo}>
            <span>
              {isOnline ? "Datos en tiempo real" : "Datos locales"} •
              {closures.length} registros
            </span>
          </div>
        </div>

        <ClosuresHistory />
      </div>
    </div>
  );
};

export default Reports;
