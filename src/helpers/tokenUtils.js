// helpers/tokenUtils.js - NUEVO ARCHIVO
export const tokenUtils = {
  // Verificar si el token está expirado sin hacer request
  isTokenExpired: (token) => {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const exp = payload.exp * 1000; // Convertir a milisegundos
      return Date.now() >= exp;
    } catch (error) {
      console.error("Error verificando token:", error);
      return true;
    }
  },

  // Limpiar credenciales de forma segura
  clearCredentials: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token_expired_shown");
  },

  // Verificar token de forma segura
  verifyToken: async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      return { valid: false, reason: "no_token" };
    }

    if (tokenUtils.isTokenExpired(token)) {
      tokenUtils.clearCredentials();
      return { valid: false, reason: "expired" };
    }

    return { valid: true };
  },
};
