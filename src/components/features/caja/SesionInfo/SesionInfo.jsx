// components/features/caja/SesionInfo/SesionInfo.jsx
import { FiWifi, FiWifiOff, FiRefreshCw } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { syncPendingSessions } from "../../../../actions/sesionesCajaActions";
import styles from "./SesionInfo.module.css";

const SesionInfo = ({ sesionAbierta, onAbrirSesion, onCerrarSesion }) => {
  const dispatch = useDispatch();
  const isOnline = navigator.onLine;
  const isLocalSession =
    sesionAbierta?.id_local && !sesionAbierta?.sincronizado;

  const handleSync = async () => {
    await dispatch(syncPendingSessions());
  };

  console.log("🔍 [SESIONINFO] Estado actual:", {
    sesionAbierta,
    tieneSesion: !!sesionAbierta,
    id: sesionAbierta?.id,
    id_local: sesionAbierta?.id_local,
    estado: sesionAbierta?.estado,
    vendedor: sesionAbierta?.vendedor_nombre,
    esLocal: isLocalSession,
  });

  if (!sesionAbierta) {
    return (
      <div className={`${styles.sesionInfo} ${styles.closed}`}>
        <div className={styles.status}>🔴</div>
        <div className={styles.info}>
          <h3>No hay sesión activa</h3>
          <p>Para comenzar a operar, abre una sesión de caja</p>
          <div className={styles.connectionInfo}>
            {isOnline ? (
              <span className={styles.online}>
                <FiWifi /> Conectado
              </span>
            ) : (
              <span className={styles.offline}>
                <FiWifiOff /> Sin conexión
              </span>
            )}
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
      <div className={styles.status}>🟢</div>
      <div className={styles.info}>
        <h3>
          Sesión Activa #{sesionAbierta.id || sesionAbierta.id_local}
          {isLocalSession && <span className={styles.localBadge}>Local</span>}
        </h3>
        <p>
          Abierta el: {new Date(sesionAbierta.fecha_apertura).toLocaleString()}
        </p>
        <p>Vendedor: {sesionAbierta.vendedor_nombre || "N/A"}</p>
        <p>Saldo inicial: ${sesionAbierta.saldo_inicial?.toFixed(2)}</p>

        <div className={styles.sessionDetails}>
          {isLocalSession && (
            <div className={styles.offlineNotice}>
              <FiWifiOff />
              <span>Sesión local - Se sincronizará cuando haya conexión</span>
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
                <FiWifi /> Conectado
              </span>
            ) : (
              <span className={styles.offline}>
                <FiWifiOff /> Sin conexión
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
