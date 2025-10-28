// components/features/caja/SesionInfo/SesionInfo.jsx - VERSIÓN MEJORADA
import styles from "./SesionInfo.module.css";

const SesionInfo = ({ sesionAbierta, onAbrirSesion, onCerrarSesion }) => {
  console.log("🔍 [SESIONINFO] Estado actual:", {
    sesionAbierta,
    tieneSesion: !!sesionAbierta,
    id: sesionAbierta?.id,
    estado: sesionAbierta?.estado,
    vendedor: sesionAbierta?.vendedor_nombre,
  });

  if (!sesionAbierta) {
    return (
      <div className={`${styles.sesionInfo} ${styles.closed}`}>
        <div className={styles.status}>🔴</div>
        <div className={styles.info}>
          <h3>No hay sesión activa</h3>
          <p>Para comenzar a operar, abre una sesión de caja</p>
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
        <h3>Sesión Activa #{sesionAbierta.id}</h3>
        <p>
          Abierta el: {new Date(sesionAbierta.fecha_apertura).toLocaleString()}
        </p>
        <p>Vendedor: {sesionAbierta.vendedor_nombre || "N/A"}</p>
        <p>Saldo inicial: ${sesionAbierta.saldo_inicial?.toFixed(2)}</p>
      </div>
      <button className={styles.actionButton} onClick={onCerrarSesion}>
        Cerrar Sesión
      </button>
    </div>
  );
};

export default SesionInfo;
