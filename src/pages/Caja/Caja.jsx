// pages/Caja/Caja.jsx - VERSIÓN COMPLETAMENTE CORREGIDA
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "../../components/layout/DashboardLayout/DashboardLayout";
import SesionCajaModal from "../../components/features/caja/SesionCajaModal/SesionCajaModal";
import CierreCajaModal from "../../components/features/caja/CierreCajaModal/CierreCajaModal";
import SesionInfo from "../../components/features/caja/SesionInfo/SesionInfo";
import {
  loadOpenSesion,
  loadSesionesByVendedor,
  cleanupLocalSessions,
} from "../../actions/sesionesCajaActions";
import {
  FiDollarSign,
  FiClock,
  FiPlus,
  FiMinus,
  FiRefreshCw,
  FiAlertTriangle,
} from "react-icons/fi";
import styles from "./Caja.module.css";

const Caja = () => {
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { sesionAbierta, sesiones, loading } = useSelector(
    (state) => state.sesionesCaja
  );

  useEffect(() => {
    if (user) {
      console.log("🔄 Caja: Cargando sesiones para usuario:", user.id);
      dispatch(loadOpenSesion(user.id));
      dispatch(loadSesionesByVendedor(user.id));
    }
  }, [dispatch, user]);

  // ✅ VERIFICAR SESIONES ANTIGUAS AL CARGAR
  useEffect(() => {
    const verificarSesionesAntiguas = async () => {
      if (user?.id) {
        const sesionesLocales = await getSesionesLocales();
        const sesionesAntiguas = sesionesLocales.filter(
          (s) => s.estado === "abierta" && esSesionAntigua(s)
        );

        if (sesionesAntiguas.length > 0) {
          console.warn(
            `⚠️ Encontradas ${sesionesAntiguas.length} sesiones antiguas`
          );
        }
      }
    };

    verificarSesionesAntiguas();
  }, [user]);

  const getSesionesLocales = async () => {
    try {
      // Esta función necesitarías implementarla o usar IndexedDBService directamente
      return [];
    } catch (error) {
      return [];
    }
  };

  const esSesionAntigua = (sesion) => {
    const fechaApertura = new Date(sesion.fecha_apertura);
    const ahora = new Date();
    const horasAbierta = (ahora - fechaApertura) / (1000 * 60 * 60);
    return horasAbierta > 24;
  };

  const handleForzarLimpieza = async () => {
    setCleaning(true);
    try {
      const result = await dispatch(cleanupLocalSessions());
      console.log("🧹 Resultado limpieza:", result);

      // Recargar sesiones después de limpiar
      if (user?.id) {
        setTimeout(() => {
          dispatch(loadOpenSesion(user.id));
          dispatch(loadSesionesByVendedor(user.id));
        }, 1000);
      }
    } catch (error) {
      console.error("Error en limpieza:", error);
    } finally {
      setCleaning(false);
    }
  };

  const handleRefresh = () => {
    if (user) {
      console.log("🔄 Forzando recarga de sesiones...");
      dispatch(loadOpenSesion(user.id));
      dispatch(loadSesionesByVendedor(user.id));
    }
  };

  const calcularDuracion = (fechaApertura) => {
    if (!fechaApertura) return "0h";
    const inicio = new Date(fechaApertura);
    const ahora = new Date();
    const diffMs = ahora - inicio;

    const horas = Math.floor(diffMs / (1000 * 60 * 60));
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${horas}h ${minutos}m`;
  };

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

        <div className={styles.headerActions}>
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={loading}
            title="Actualizar estado"
          >
            <FiRefreshCw className={loading ? styles.spinning : ""} />
          </button>

          {sesionAbierta && (
            <div className={styles.activeBadge}>
              <div className={styles.activeDot}></div>
              Sesión Activa
            </div>
          )}
        </div>
      </div>

      {/* ✅ ALERTA DE MODO OFFLINE */}
      {!navigator.onLine && (
        <div className={styles.offlineAlert}>
          <FiAlertTriangle className={styles.alertIcon} />
          <div className={styles.alertContent}>
            <strong>Modo Offline</strong>
            <span>
              Las sesiones se guardarán localmente y se sincronizarán cuando
              recuperes la conexión
            </span>
          </div>
        </div>
      )}

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
                  disabled={loading}
                >
                  <FiPlus className={styles.buttonIcon} />
                  <span>Abrir Nueva Sesión</span>
                </button>
              ) : (
                <button
                  className={`${styles.actionButton} ${styles.secondaryAction}`}
                  onClick={() => setShowCerrarModal(true)}
                  disabled={loading}
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
                <>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Duración</span>
                    <span className={styles.statValue}>
                      {calcularDuracion(sesionAbierta.fecha_apertura)}
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Saldo Inicial</span>
                    <span className={styles.statValue}>
                      ${sesionAbierta.saldo_inicial?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* ✅ BOTÓN DE LIMPIEZA (solo desarrollo) */}
            {process.env.NODE_ENV === "development" && (
              <div className={styles.debugSection}>
                <button
                  className={styles.cleanupButton}
                  onClick={handleForzarLimpieza}
                  disabled={cleaning}
                >
                  <FiRefreshCw className={cleaning ? styles.spinning : ""} />
                  {cleaning ? "Limpiando..." : "Limpiar Sesiones Locales"}
                </button>
              </div>
            )}
          </div>

          {/* ✅ INFORMACIÓN DE CONEXIÓN */}
          <div className={styles.connectionCard}>
            <h4>Estado de Conexión</h4>
            <div className={styles.connectionStatus}>
              <div
                className={`${styles.statusIndicator} ${
                  navigator.onLine ? styles.online : styles.offline
                }`}
              >
                {navigator.onLine ? "🟢" : "🔴"}
              </div>
              <span>{navigator.onLine ? "Conectado" : "Sin conexión"}</span>
            </div>
            {!navigator.onLine && (
              <p className={styles.connectionHelp}>
                Los datos se guardarán localmente y se sincronizarán
                automáticamente cuando recuperes la conexión.
              </p>
            )}
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
