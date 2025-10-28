// helpers/fetchAPIConfig.js - AUMENTAR TIMEOUT
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// ✅ Solo logs en desarrollo
const isDevelopment = import.meta.env.NODE_ENV === "development";

export const fetchAPIConfig = (
  endpoint,
  data,
  method = "GET",
  isFormData = false
) => {
  const url = `${baseURL}/${endpoint}`;
  const token = localStorage.getItem("token") || "";

  if (isDevelopment) {
    console.log("🌐 Realizando petición a:", url);
    console.log("📦 Datos:", data);
    console.log("🔄 Método:", method);
    console.log("📎 Es FormData:", isFormData);
  }

  const config = {
    method,
    headers: {
      "x-token": token,
    },
  };

  // ✅ AUMENTAR TIMEOUT PARA SUBIDA DE IMÁGENES (60 segundos)
  const timeout = isFormData ? 60000 : 15000; // 60 segundos para FormData, 15 para otros

  if (method === "GET") {
    const fetchPromise = fetch(url, config);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Timeout: La petición tardó demasiado")),
        timeout
      )
    );

    return Promise.race([fetchPromise, timeoutPromise]).then(
      async (response) => {
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      }
    );
  } else {
    if (isFormData) {
      config.body = data;
    } else {
      config.headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(data);
    }

    const fetchPromise = fetch(url, config);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Timeout: La petición tardó demasiado")),
        timeout
      )
    );

    return Promise.race([fetchPromise, timeoutPromise]).then(
      async (response) => {
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      }
    );
  }
};
