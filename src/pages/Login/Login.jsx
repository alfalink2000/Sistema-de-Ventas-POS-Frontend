// pages/Login/Login.jsx - VERSIÓN CORREGIDA
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import LoginForm from "../../components/features/auth/LoginForm/LoginForm";
import OfflineDataStatus from "../../components/offline/OfflineDataStatus/OfflineDataStatus";
import {
  syncOfflineUsers,
  diagnoseOfflineAuth,
} from "../../actions/authActions";
import styles from "./Login.module.css";

const Login = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 Conexión restaurada");
      setIsOnline(true);

      // ✅ SOLO SINCRONIZAR SI HAY CONEXIÓN Y NO ESTÁ YA SINCRONIZANDO
      if (!isSyncing && navigator.onLine) {
        setIsSyncing(true);
        setTimeout(() => {
          dispatch(syncOfflineUsers()).finally(() => {
            setIsSyncing(false);
          });
        }, 2000);
      }
    };

    const handleOffline = () => {
      console.log("📴 Conexión perdida - Modo offline");
      setIsOnline(false);
      setIsSyncing(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [dispatch, isSyncing]);

  // Llama esta función en tu componente Login para diagnosticar
  useEffect(() => {
    diagnoseOfflineAuth();
  }, []);

  return (
    <div className={styles.loginContainer}>
      {/* ✅ HEADER MEJORADO CON ESTADO OFFLINE */}
      <div className={styles.offlineHeader}>
        <OfflineDataStatus />

        {!isOnline && (
          <div className={styles.offlineBanner}>
            <div className={styles.offlineContent}>
              <span className={styles.offlineIcon}>📱</span>
              <div>
                <strong>Modo Offline Activado</strong>
                <p>
                  Puedes iniciar sesión con credenciales previamente
                  sincronizadas
                </p>
              </div>
            </div>
          </div>
        )}

        {isOnline && isSyncing && (
          <div className={styles.syncBanner}>
            <div className={styles.syncContent}>
              <span className={styles.syncIcon}>🔄</span>
              <div>
                <strong>Sincronizando datos...</strong>
                <p>Actualizando información para modo offline</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.loginBackground}>
        <div className={styles.backgroundPattern}></div>
      </div>

      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.logo}>
            <div className={styles.reactIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,18.5C9.5,18.5 7.5,16.4 7.5,14C7.5,11.6 9.6,9.5 12,9.5C14.4,9.5 16.5,11.6 16.5,14C16.5,16.4 14.4,18.5 12,18.5M12,7.5C8.4,7.5 5.5,10.4 5.5,14C5.5,17.6 8.4,20.5 12,20.5C15.6,20.5 18.5,17.6 18.5,14C18.5,10.4 15.6,7.5 12,7.5M12,21.5C7.9,21.5 4.5,18.1 4.5,14C4.5,9.9 7.9,6.5 12,6.5C16.1,6.5 19.5,9.9 19.5,14C19.5,18.1 16.1,21.5 12,21.5M12,4.5C6.2,4.5 1.5,9.2 1.5,15C1.5,20.8 6.2,25.5 12,25.5C17.8,25.5 22.5,20.8 22.5,15C22.5,9.2 17.8,4.5 12,4.5Z" />
              </svg>
            </div>
            <div className={styles.logoText}>
              <h1>KioskoFlow</h1>
              <p>Sistema de Punto de Venta {!isOnline && "(Offline)"}</p>
            </div>
          </div>
        </div>

        <LoginForm />

        {/* ✅ INFORMACIÓN ADICIONAL PARA MODO OFFLINE */}
      </div>
    </div>
  );
};

export default Login;
