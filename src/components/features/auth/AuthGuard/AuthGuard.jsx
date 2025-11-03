// components/auth/AuthGuard/AuthGuard.jsx - VERSIÓN CORREGIDA
import { useAuth } from "../../../../hooks/useAuth";
import { useEffect, useState } from "react";
import styles from "./AuthGuard.module.css";

const AuthGuard = ({ children }) => {
  const { isAuthenticated, checking } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  // ✅ EFECTO PARA REDIRECCIÓN
  useEffect(() => {
    if (!checking && !isAuthenticated && !redirecting) {
      console.log("🔐 AuthGuard: Usuario no autenticado, redirigiendo...");
      setRedirecting(true);

      // Usar timeout para evitar bloqueos de renderizado
      const timer = setTimeout(() => {
        window.location.href = "/login";
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, checking, redirecting]);

  // ✅ MIENTRAS VERIFICA
  if (checking) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Verificando autenticación...</p>
      </div>
    );
  }

  // ✅ SI ESTÁ REDIRIGIENDO
  if (redirecting) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Redirigiendo al login...</p>
      </div>
    );
  }

  // ✅ SI NO ESTÁ AUTENTICADO PERO AÚN NO REDIRIGE
  if (!isAuthenticated) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Preparando redirección...</p>
      </div>
    );
  }

  // ✅ USUARIO AUTENTICADO - MOSTRAR CONTENIDO
  return children;
};

export default AuthGuard;
