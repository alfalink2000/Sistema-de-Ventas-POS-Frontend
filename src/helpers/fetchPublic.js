// helpers/fetchPublic.js - IGUAL A TU EJEMPLO
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// ✅ Solo mostrar logs en desarrollo
const isDevelopment = import.meta.env.NODE_ENV === "development";

export const fetchPublic = (endpoint, data, method = "GET") => {
  const url = `${baseURL}/${endpoint}`;

  if (isDevelopment) {
    console.log("🌐 [DEBUG] Intentando conectar a:", url);
  }

  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10000),
  };

  if (method !== "GET") {
    config.body = JSON.stringify(data);
  }

  return fetch(url, config)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // ✅ DEVOLVER DIRECTAMENTE el JSON parseado
      const result = await response.json();
      return result;
    })
    .catch((error) => {
      if (isDevelopment) {
        console.error("❌ [DEBUG] Error de fetch:", error);
      }
      throw error;
    });
};
