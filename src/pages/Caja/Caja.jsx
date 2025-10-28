// pages/Caja/Caja.jsx
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "../../components/layout/DashboardLayout/DashboardLayout";
import SesionCajaModal from "../../components/features/caja/SesionCajaModal/SesionCajaModal";
import CierreCajaModal from "../../components/features/caja/CierreCajaModal/CierreCajaModal";
import SesionInfo from "../../components/features/caja/SesionInfo/SesionInfo";
import {
  loadOpenSesion,
  loadSesionesByVendedor,
} from "../../actions/sesionesCajaActions";
import { FiDollarSign, FiClock, FiPlus, FiMinus } from "react-icons/fi";
import styles from "./Caja.module.css";

const Caja = () => {
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { sesionAbierta, sesiones, loading } = useSelector(
    (state) => state.sesionesCaja
  );

  useEffect(() => {
    if (user) {
      dispatch(loadOpenSesion(user.id));
      dispatch(loadSesionesByVendedor(user.id));
    }
  }, [dispatch, user]);

  return (
    <div className={styles.cajaPage}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <FiDollarSign />
          </div>
          <div>
            <h1>Gestión de Caja</h1>
            <p>Control de sesiones y cierres de caja</p>
          </div>
        </div>

        {sesionAbierta && (
          <div className={styles.activeBadge}>
            <div className={styles.activeDot}></div>
            Sesión Activa
          </div>
        )}
      </div>

      <div className={styles.contentGrid}>
        {/* Panel de información de sesión */}
        <div className={styles.mainPanel}>
          <SesionInfo
            sesionAbierta={sesionAbierta}
            onAbrirSesion={() => setShowAbrirModal(true)}
            onCerrarSesion={() => setShowCerrarModal(true)}
          />
        </div>

        {/* Panel de acciones rápidas */}
        <div className={styles.sidePanel}>
          <div className={styles.actionCard}>
            <h3>
              <FiClock className={styles.actionIcon} />
              Acciones Rápidas
            </h3>

            <div className={styles.actionButtons}>
              {!sesionAbierta ? (
                <button
                  className={`${styles.actionButton} ${styles.primaryAction}`}
                  onClick={() => setShowAbrirModal(true)}
                >
                  <FiPlus className={styles.buttonIcon} />
                  <span>Abrir Nueva Sesión</span>
                </button>
              ) : (
                <button
                  className={`${styles.actionButton} ${styles.secondaryAction}`}
                  onClick={() => setShowCerrarModal(true)}
                >
                  <FiMinus className={styles.buttonIcon} />
                  <span>Cerrar Sesión Actual</span>
                </button>
              )}
            </div>

            {/* Estadísticas rápidas */}
            <div className={styles.quickStats}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Estado</span>
                <span
                  className={`${styles.statValue} ${
                    sesionAbierta ? styles.active : styles.inactive
                  }`}
                >
                  {sesionAbierta ? "Activa" : "Inactiva"}
                </span>
              </div>
              {sesionAbierta && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Duración</span>
                  <span className={styles.statValue}>
                    {Math.floor(
                      (new Date() - new Date(sesionAbierta.fecha_apertura)) /
                        (1000 * 60 * 60)
                    )}
                    h
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      <SesionCajaModal
        isOpen={showAbrirModal}
        onClose={() => setShowAbrirModal(false)}
      />

      <CierreCajaModal
        isOpen={showCerrarModal}
        onClose={() => setShowCerrarModal(false)}
        sesion={sesionAbierta}
      />
    </div>
  );
};

export default Caja;
