// utils/authUtils.js - crear este archivo
export const isUserAuthenticated = () => {
  try {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || token === "undefined" || token === "null") {
      return false;
    }

    if (!user) {
      return false;
    }

    // Verificar que el user sea un objeto JSON válido
    const userObj = JSON.parse(user);
    if (!userObj || !userObj.id) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error verificando autenticación:", error);
    return false;
  }
};

export const getAuthUser = () => {
  try {
    const userData = localStorage.getItem("user");
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    return null;
  }
};

export const waitForAuthentication = (timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkAuth = () => {
      if (isUserAuthenticated()) {
        resolve(true);
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error("Timeout esperando autenticación"));
        return;
      }

      setTimeout(checkAuth, 100);
    };

    checkAuth();
  });
};
