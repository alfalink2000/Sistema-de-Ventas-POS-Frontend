// components/auth/AuthGuard/AuthGuard.jsx
import { useAuth } from "../../../../hooks/useAuth";
import styles from "./AuthGuard.module.css";

const AuthGuard = ({ children }) => {
  const { isAuthenticated, checking } = useAuth();

  // Mientras está verificando el estado de autenticación
  if (checking) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Verificando autenticación...</p>
      </div>
    );
  }

  // Si no está autenticado después de verificar
  if (!isAuthenticated) {
    // Usar setTimeout para evitar bloqueos de renderizado
    setTimeout(() => {
      window.location.href = "/login";
    }, 100);

    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Redirigiendo al login...</p>
      </div>
    );
  }

  return children;
};

export default AuthGuard;
