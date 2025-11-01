// pages/Reports/Reports.jsx - VERSIÓN COMPLETA PARA SESIONES CERRADAS
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ClosuresHistory from "../../components/features/caja/ClosuresHistory/ClosuresHistory";
import {
  loadClosures,
  syncPendingClosures,
} from "../../actions/closuresActions";
import {
  FiCalendar,
  FiArchive,
  FiRefreshCw,
  FiWifi,
  FiWifiOff,
  FiDownload,
  FiBarChart2,
  FiDollarSign,
} from "react-icons/fi";
import styles from "./Reports.module.css";

const Reports = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const dispatch = useDispatch();
  const { closures, loading } = useSelector((state) => state.closures);
  const { user } = useSelector((state) => state.auth);
  const isOnline = navigator.onLine;

  useEffect(() => {
    // Cargar cierres al montar el componente
    dispatch(loadClosures(100));
  }, [dispatch]);

  const handleSync = async () => {
    if (!isOnline) return;

    setSyncing(true);
    try {
      await dispatch(syncPendingClosures());
      setLastSync(new Date());

      // Recargar cierres después de sincronizar
      setTimeout(() => {
        dispatch(loadClosures(100));
      }, 2000);
    } catch (error) {
      console.error("Error en sincronización:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = () => {
    // Lógica de exportación (ya existe en ClosuresHistory)
    console.log("Exportar reportes...");
  };

  const calculateStats = () => {
    if (!closures || closures.length === 0) {
      return {
        totalCierres: 0,
        totalVentas: 0,
        totalGanancia: 0,
        promedioVentas: 0,
        cierresExactos: 0,
      };
    }

    const totalCierres = closures.length;
    const totalVentas = closures.reduce(
      (sum, c) => sum + (c.total_ventas || 0),
      0
    );
    const totalGanancia = closures.reduce(
      (sum, c) => sum + (c.ganancia_bruta || 0),
      0
    );
    const promedioVentas = totalVentas / totalCierres;
    const cierresExactos = closures.filter((c) => c.diferencia === 0).length;

    return {
      totalCierres,
      totalVentas,
      totalGanancia,
      promedioVentas,
      cierresExactos,
    };
  };

  const stats = calculateStats();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return "Nunca";
    return new Date(date).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={styles.reportsPage}>
      {/* ✅ HEADER MEJORADO CON ESTADÍSTICAS */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>
            <FiBarChart2 className={styles.headerIcon} />
            <div>
              <h1>Reportes y Cierres de Caja</h1>
              <p>
                Historial completo de todas las sesiones cerradas del sistema
              </p>
            </div>
          </div>

          <div className={styles.headerStats}>
            <div className={styles.statBadge}>
              <FiArchive className={styles.statIcon} />
              <span>{stats.totalCierres} cierres registrados</span>
            </div>

            {!isOnline && (
              <div className={styles.offlineBadge}>
                <FiWifiOff />
                <span>Modo offline</span>
              </div>
            )}
          </div>
        </div>

        {/* ✅ ACCIONES RÁPIDAS */}
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

          <button
            className={styles.exportButton}
            onClick={handleExport}
            disabled={!isOnline}
          >
            <FiDownload />
            Exportar
          </button>
        </div>
      </div>

      {/* ✅ PANEL DE ESTADÍSTICAS */}
      <div className={styles.statsPanel}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <FiArchive className={styles.statIcon} />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.totalCierres}</h3>
              <p>Total de Cierres</p>
            </div>
          </div>

          {/* <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <FiDollarSign className={styles.statIcon} />
            </div>
            <div className={styles.statInfo}>
              <h3>{formatCurrency(stats.totalVentas)}</h3>
              <p>Ventas Totales</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <FiBarChart2 className={styles.statIcon} />
            </div>
            <div className={styles.statInfo}>
              <h3>{formatCurrency(stats.totalGanancia)}</h3>
              <p>Ganancia Bruta</p>
            </div>
          </div> */}

          <div className={styles.statCard}>
            <div className={styles.statIconWrapper}>
              <FiCalendar className={styles.statIcon} />
            </div>
            <div className={styles.statInfo}>
              <h3>{stats.cierresExactos}</h3>
              <p>Cierres Exactos</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ INFORMACIÓN DE SINCRONIZACIÓN */}
      <div className={styles.syncInfo}>
        <div className={styles.syncStatus}>
          <div className={styles.connectionStatus}>
            {isOnline ? (
              <>
                <FiWifi className={styles.onlineIcon} />
                <span>Conectado - Sincronización automática activada</span>
              </>
            ) : (
              <>
                <FiWifiOff className={styles.offlineIcon} />
                <span>
                  Modo offline - Los datos se cargan desde almacenamiento local
                </span>
              </>
            )}
          </div>

          {lastSync && (
            <div className={styles.lastSync}>
              Última sincronización: {formatDate(lastSync)}
            </div>
          )}
        </div>

        {!isOnline && closures.length > 0 && (
          <div className={styles.offlineWarning}>
            <strong>📱 Datos Locales</strong>
            <p>
              Mostrando {closures.length} cierres almacenados localmente. Se
              sincronizarán automáticamente cuando recuperes la conexión a
              internet.
            </p>
          </div>
        )}
      </div>

      {/* ✅ HISTORIAL DE CIERRES */}
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

      {/* ✅ PIE INFORMATIVO */}
      <div className={styles.footerInfo}>
        <div className={styles.footerContent}>
          <div className={styles.footerItem}>
            <strong>ℹ️ Información:</strong>
            <span>
              Este reporte incluye todas las sesiones cerradas, tanto las
              sincronizadas con el servidor como las que se realizaron en modo
              offline.
            </span>
          </div>

          {closures.some(
            (c) => c.origen === "local_pendiente" || c.origen === "sesion_local"
          ) && (
            <div className={styles.footerItem}>
              <strong>📱 Datos Pendientes:</strong>
              <span>
                Hay {closures.filter((c) => !c.sincronizado).length} cierres
                pendientes de sincronización.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
