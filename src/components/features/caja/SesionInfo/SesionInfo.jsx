// components/features/caja/SesionInfo/SesionInfo.jsx - VERSIÓN COMPLETA
import {
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiAlertTriangle,
  FiClock,
  FiUser,
  FiDollarSign,
} from "react-icons/fi";
import { useDispatch } from "react-redux";
import {
  syncPendingSessions,
  loadOpenSesion,
} from "../../../../actions/sesionesCajaActions";
import styles from "./SesionInfo.module.css";

const SesionInfo = ({ sesionAbierta, onAbrirSesion, onCerrarSesion }) => {
  const dispatch = useDispatch();
  const isOnline = navigator.onLine;
  const isLocalSession =
    sesionAbierta?.id_local && !sesionAbierta?.sincronizado;

  const handleSync = async () => {
    try {
      await dispatch(syncPendingSessions());
      // Recargar sesión después de sincronizar
      if (sesionAbierta?.vendedor_id) {
        setTimeout(() => {
          dispatch(loadOpenSesion(sesionAbierta.vendedor_id));
        }, 1000);
      }
    } catch (error) {
      console.error("Error en sincronización:", error);
    }
  };

  const handleRefresh = () => {
    if (sesionAbierta?.vendedor_id) {
      dispatch(loadOpenSesion(sesionAbierta.vendedor_id));
    }
  };

  const calcularDuracion = () => {
    if (!sesionAbierta?.fecha_apertura) return "0h 0m";

    const inicio = new Date(sesionAbierta.fecha_apertura);
    const ahora = new Date();
    const diffMs = ahora - inicio;

    const horas = Math.floor(diffMs / (1000 * 60 * 60));
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${horas}h ${minutos}m`;
  };

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!sesionAbierta) {
    return (
      <div className={`${styles.sesionInfo} ${styles.closed}`}>
        <div className={styles.statusIndicator}>
          <div className={styles.statusDot}></div>
        </div>

        <div className={styles.info}>
          <h3>No hay sesión activa</h3>
          <p>Para comenzar a operar, abre una sesión de caja</p>

          <div className={styles.details}>
            <div className={styles.detailItem}>
              <FiUser className={styles.detailIcon} />
              <span>Estado: Inactivo</span>
            </div>
            <div className={styles.connectionInfo}>
              {isOnline ? (
                <span className={styles.online}>
                  <FiWifi /> Conectado al servidor
                </span>
              ) : (
                <span className={styles.offline}>
                  <FiWifiOff /> Modo offline
                </span>
              )}
            </div>
          </div>
        </div>

        <button className={styles.actionButton} onClick={onAbrirSesion}>
          Abrir Sesión
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.sesionInfo} ${styles.open}`}>
      <div className={styles.statusIndicator}>
        <div className={styles.statusDot}></div>
      </div>

      <div className={styles.info}>
        <div className={styles.header}>
          <h3>
            Sesión Activa #{sesionAbierta.id || sesionAbierta.id_local}
            {isLocalSession && <span className={styles.localBadge}>Local</span>}
          </h3>

          <div className={styles.headerActions}>
            <button
              className={styles.refreshButton}
              onClick={handleRefresh}
              title="Actualizar estado"
            >
              <FiRefreshCw />
            </button>
          </div>
        </div>

        <div className={styles.details}>
          <div className={styles.detailRow}>
            <div className={styles.detailItem}>
              <FiClock className={styles.detailIcon} />
              <span>Apertura: {formatFecha(sesionAbierta.fecha_apertura)}</span>
            </div>

            <div className={styles.detailItem}>
              <FiUser className={styles.detailIcon} />
              <span>Vendedor: {sesionAbierta.vendedor_nombre || "N/A"}</span>
            </div>
          </div>

          <div className={styles.detailRow}>
            <div className={styles.detailItem}>
              <FiDollarSign className={styles.detailIcon} />
              <span>
                Saldo inicial: ${sesionAbierta.saldo_inicial?.toFixed(2)}
              </span>
            </div>

            <div className={styles.detailItem}>
              <FiClock className={styles.detailIcon} />
              <span>Duración: {calcularDuracion()}</span>
            </div>
          </div>
        </div>

        <div className={styles.sessionDetails}>
          {isLocalSession && (
            <div className={styles.offlineNotice}>
              <div className={styles.offlineHeader}>
                <FiAlertTriangle className={styles.offlineIcon} />
                <span>Sesión local - Pendiente de sincronización</span>
              </div>

              {isOnline && (
                <button
                  className={styles.syncButton}
                  onClick={handleSync}
                  title="Sincronizar ahora"
                >
                  <FiRefreshCw />
                  Sincronizar
                </button>
              )}
            </div>
          )}

          <div className={styles.connectionInfo}>
            {isOnline ? (
              <span className={styles.online}>
                <FiWifi /> Conectado al servidor
              </span>
            ) : (
              <span className={styles.offline}>
                <FiWifiOff /> Modo offline - Datos locales
              </span>
            )}
          </div>
        </div>
      </div>

      <button className={styles.actionButton} onClick={onCerrarSesion}>
        Cerrar Sesión
      </button>
    </div>
  );
};

export default SesionInfo;
