// components/features/auth/LoginForm/LoginForm.jsx - VERSIÓN CORREGIDA
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { startLogin } from "../../../../actions/authActions";
import Input from "../../../ui/Input/Input";
import styles from "./LoginForm.module.css";
import AuthOfflineController from "../../../../controllers/offline/AuthOfflineController/AuthOfflineController";

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [offlineMode, setOfflineMode] = useState(!navigator.onLine);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  // Detectar cambios de conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineMode(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineMode(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sincronizar loading local con el del estado global
  useEffect(() => {
    setLocalLoading(loading);
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) return;

    console.log("🔄 Iniciando proceso de login...", {
      offline: offlineMode,
      username: formData.username,
    });
    setLocalLoading(true);

    try {
      let result;

      if (offlineMode) {
        // ✅ MODO OFFLINE: Usar controlador offline
        console.log("📱 Intentando login offline...");
        result = await AuthOfflineController.verifyCredentials(
          formData.username.trim(),
          formData.password
        );

        if (result.success) {
          console.log("✅ Login offline exitoso");

          // ✅ CORRECCIÓN: Usar el type correcto del reducer
          dispatch({
            type: types.authLogin, // ✅ USAR EL TYPE DEFINIDO
            payload: result.user, // ✅ SOLO ENVIAR EL USER (como hace el login online)
          });

          // ✅ GUARDAR EN LOCALSTORAGE (igual que el login online)
          localStorage.setItem("token", result.token);
          localStorage.setItem("user", JSON.stringify(result.user));

          console.log(
            "🔐 Token y usuario guardados en localStorage para offline"
          );
        } else {
          throw new Error(result.error || "Error en autenticación offline");
        }
      } else {
        // ✅ MODO ONLINE: Usar acción normal
        console.log("🌐 Intentando login online...");
        result = await dispatch(
          startLogin(formData.username.trim(), formData.password)
        );

        if (!result?.success) {
          throw new Error(result?.error || "Error en autenticación online");
        }
      }
    } catch (err) {
      console.error("❌ Error en handleSubmit:", err);
      // El error se maneja en el estado de Redux
    } finally {
      setLocalLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleForgotPassword = () => {
    if (offlineMode) {
      alert(
        "La recuperación de contraseña no está disponible en modo offline. Conéctate a internet para usar esta función."
      );
      return;
    }
    console.log("Funcionalidad de recuperación de contraseña");
  };

  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Iconos SVG
  const EyeIcon = () => (
    <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  );

  const EyeSlashIcon = () => (
    <svg className={styles.eyeIcon} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
    </svg>
  );

  const LockIcon = () => (
    <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
    </svg>
  );

  const ShieldIcon = () => (
    <svg className={styles.shieldIcon} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
    </svg>
  );

  const LoadingSpinner = () => (
    <svg className={styles.loadingSpinner} viewBox="0 0 24 24" fill="none">
      <circle
        className={styles.spinnerCircle}
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );

  const OfflineIcon = () => (
    <svg className={styles.offlineIcon} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );

  return (
    <form onSubmit={handleSubmit} className={styles.loginForm}>
      <div className={styles.formHeader}>
        {/* <p>
          {offlineMode
            ? "Ingresa tus credenciales sincronizadas previamente"
            : "Ingresa tus credenciales para acceder al sistema"}
        </p>
        {offlineMode && (
          <div className={styles.offlineNotice}>
            <OfflineIcon />
            <span>Modo Offline Activado</span>
          </div>
        )} */}
        <p>Ingresa tus credenciales para acceder al sistema</p>
      </div>

      <div className={styles.formContent}>
        <div className={styles.formGroup}>
          <Input
            label="Usuario"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
            autoFocus
            placeholder="Ingresa tu usuario"
            autoComplete="username"
            disabled={localLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <div className={styles.passwordContainer}>
            <Input
              label="Contraseña"
              name="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
              disabled={localLoading}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={toggleShowPassword}
              tabIndex={-1}
              disabled={localLoading}
            >
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.errorContainer}>
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
              {offlineMode && (
                <div className={styles.offlineHelp}>
                  Asegúrate de haber iniciado sesión previamente con conexión a
                  internet
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.formActions}>
          <button
            type="submit"
            disabled={localLoading || !formData.username || !formData.password}
            className={`${styles.submitButton} ${
              localLoading ? styles.submitButtonLoading : ""
            } ${offlineMode ? styles.offlineButton : ""}`}
          >
            {localLoading ? (
              <div className={styles.loadingContent}>
                <LoadingSpinner />
                <span>{offlineMode ? "Verificando..." : "Procesando..."}</span>
              </div>
            ) : (
              <div className={styles.normalContent}>
                {offlineMode ? <OfflineIcon /> : <LockIcon />}
                <span>
                  {offlineMode ? "Acceder Offline" : "Acceder al Sistema"}
                </span>
              </div>
            )}
          </button>
        </div>

        <div className={styles.helperLinks}>
          <button
            type="button"
            onClick={handleForgotPassword}
            className={styles.forgotPassword}
            disabled={localLoading || offlineMode}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>

      <div className={styles.formFooter}>
        <p className={styles.helpText}>
          <ShieldIcon />
          Sistema seguro • v1.0 {offlineMode && "• Offline"}
        </p>
      </div>
    </form>
  );
};

export default LoginForm;
