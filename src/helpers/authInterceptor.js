// helpers/authInterceptor.js - INTERCEPTOR GLOBAL
import Swal from "sweetalert2";

export class AuthInterceptor {
  static async handleAuthError(error) {
    if (this.isAuthError(error)) {
      await this.showSessionExpiredAlert();
      this.redirectToLogin();
      return true; // Error manejado
    }
    return false; // Error no manejado
  }

  static isAuthError(error) {
    const errorMessage = error.message || "";
    return (
      errorMessage.includes("401") ||
      errorMessage.includes("Token no válido") ||
      errorMessage.includes("jwt expired") ||
      errorMessage.includes("SESSION_EXPIRED")
    );
  }

  static async showSessionExpiredAlert() {
    // Cerrar cualquier alerta previa
    Swal.close();

    await Swal.fire({
      icon: "warning",
      title: "Sesión expirada",
      text: "Tu sesión ha caducado. Por favor, inicia sesión nuevamente.",
      confirmButtonText: "Ir al login",
      allowOutsideClick: false,
      allowEscapeKey: false,
      backdrop: true,
    });
  }

  static redirectToLogin() {
    // Limpiar almacenamiento local
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // Redirigir al login
    window.location.href = "/login";
  }
}

// ✅ USO EN fetch.js
import { AuthInterceptor } from "./authInterceptor.js";

// En el catch de fetchConToken:
try {
  // ... código existente
} catch (error) {
  console.error(`❌ Error en fetchConToken (${method} ${endpoint}):`, error);

  // ✅ USAR INTERCEPTOR GLOBAL
  const wasHandled = await AuthInterceptor.handleAuthError(error);
  if (!wasHandled) {
    // Manejar otros tipos de error aquí
    throw error;
  }
}
