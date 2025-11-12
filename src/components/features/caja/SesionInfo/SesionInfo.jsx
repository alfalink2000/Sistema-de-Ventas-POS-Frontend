// components/features/caja/SesionInfo/SesionInfo.jsx - VERSIÓN MEJORADA
import { useState, useEffect } from "react";
import {
  FiDollarSign,
  FiClock,
  FiUser,
  FiCalendar,
  FiPlus,
  FiMinus,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";
import styles from "./SesionInfo.module.css";

const SesionInfo = ({ sesionAbierta, onAbrirSesion, onCerrarSesion }) => {
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState("");

  // ✅ CALCULAR TIEMPO TRANSCURRIDO
  useEffect(() => {
    if (!sesionAbierta?.fecha_apertura) {
      setTiempoTranscurrido("");
      return;
    }

    const calcularTiempo = () => {
      const inicio = new Date(sesionAbierta.fecha_apertura);
      const ahora = new Date();
      const diffMs = ahora - inicio;

      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (horas > 0) {
        setTiempoTranscurrido(`${horas}h ${minutos}m`);
      } else {
        setTiempoTranscurrido(`${minutos}m`);
      }
    };

    calcularTiempo();
    const interval = setInterval(calcularTiempo, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [sesionAbierta]);

  // ✅ FORMATEAR FECHA LEGIBLE
  const formatearFecha = (fecha) => {
    if (!fecha) return "";
    const date = new Date(fecha);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!sesionAbierta) {
    return (
      <div className={styles.sesionInfo}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FiDollarSign />
          </div>
          <div className={styles.emptyContent}>
            <h3>No hay sesión activa</h3>
            <p>Para comenzar a operar, abre una nueva sesión de caja</p>
          </div>
          <button className={styles.primaryButton} onClick={onAbrirSesion}>
            <FiPlus className={styles.buttonIcon} />
            Abrir Sesión de Caja
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.sesionInfo}>
      <div className={styles.activeSession}>
        {/* HEADER CON ESTADO */}
        <div className={styles.sessionHeader}>
          <div className={styles.statusIndicator}>
            <div className={styles.statusDot}></div>
            <span>Sesión Activa</span>
          </div>
          <div className={styles.sessionTime}>
            <FiClock className={styles.timeIcon} />
            <span>{tiempoTranscurrido}</span>
          </div>
        </div>

        {/* INFORMACIÓN PRINCIPAL */}
        <div className={styles.sessionContent}>
          <div className={styles.mainInfo}>
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <FiUser />
              </div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Vendedor</span>
                <span className={styles.infoValue}>
                  {sesionAbierta.vendedor_nombre || "Usuario Actual"}
                </span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <FiCalendar />
              </div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Iniciada el</span>
                <span className={styles.infoValue}>
                  {formatearFecha(sesionAbierta.fecha_apertura)}
                </span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <FiDollarSign />
              </div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Saldo Inicial</span>
                <span className={styles.infoValue}>
                  ${sesionAbierta.saldo_inicial?.toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div className={styles.sessionActions}>
          <button className={styles.secondaryButton} onClick={onCerrarSesion}>
            <FiMinus className={styles.buttonIcon} />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default SesionInfo;
