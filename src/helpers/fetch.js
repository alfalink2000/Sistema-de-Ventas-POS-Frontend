// helpers/fetch.js - VERSIÓN COMPLETAMENTE CORREGIDA

// URL base para desarrollo - apunta a tu backend local
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// ✅ HEADERS MEJORADOS CON DETECCIÓN AUTOMÁTICA
const getCommonHeaders = (isFormData = false) => {
  const headers = {
    Accept: "application/json",
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

/**
 * Fetch sin token (para login, registro, etc.)
 */
export const fetchSinToken = async (endpoint, data, method = "GET") => {
  const url = `${baseURL}/${endpoint}`;

  const isFormData = data instanceof FormData;
  const config = {
    method,
    headers: getCommonHeaders(isFormData),
    credentials: "include", // ✅ IMPORTANTE para cookies/tokens
  };

  if (method !== "GET" && data) {
    config.body = isFormData ? data : JSON.stringify(data);
  }

  try {
    console.log(`🔄 fetchSinToken: ${method} ${url}`);

    const response = await fetch(url, config);
    return await handleResponse(response, `${method} ${endpoint}`);
  } catch (error) {
    console.error(`❌ Error en fetchSinToken (${method} ${endpoint}):`, error);
    throw error;
  }
};

/**
 * Fetch con token (para rutas protegidas) - ✅ CORREGIDO
 */
export const fetchConToken = async (endpoint, data, method = "GET") => {
  const url = `${baseURL}/${endpoint}`;
  const token = localStorage.getItem("token");

  console.log(`🔄 fetchConToken: ${method} ${url}`);
  console.log(`🔑 Token disponible:`, token ? "✅ SÍ" : "❌ NO");

  if (!token) {
    console.error("❌ No hay token disponible - redirigiendo a login");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Token no disponible");
  }

  const isFormData = data instanceof FormData;
  const config = {
    method,
    headers: {
      ...getCommonHeaders(isFormData),
      Authorization: `Bearer ${token}`, // ✅ CORREGIDO: Bearer token
      "x-token": token, // ✅ BACKUP: header alternativo
    },
    credentials: "include",
  };

  if (method !== "GET" && data) {
    config.body = isFormData ? data : JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);
    return await handleResponse(response, `${method} ${endpoint}`);
  } catch (error) {
    console.error(`❌ Error en fetchConToken (${method} ${endpoint}):`, error);

    // Si es error 401, limpiar y redirigir
    if (error.message.includes("401")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    throw error;
  }
};

/**
 * ✅ MANEJO UNIFICADO DE RESPUESTAS
 */
async function handleResponse(response, context) {
  const contentType = response.headers.get("content-type");

  // Verificar si la respuesta es JSON
  if (contentType && contentType.includes("application/json")) {
    const result = await response.json();

    if (!response.ok) {
      const errorMsg =
        result.error ||
        result.msg ||
        `Error ${response.status}: ${response.statusText}`;
      console.error(`❌ ${context} - Error:`, errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`✅ ${context} - Éxito:`, result);
    return result;
  } else {
    // Si no es JSON, devolver texto
    const text = await response.text();

    if (!response.ok) {
      console.error(`❌ ${context} - Error texto:`, text);
      throw new Error(`Error ${response.status}: ${text}`);
    }

    return text;
  }
}

/**
 * ✅ NUEVO: Fetch con reintentos para offline/online
 */
export const fetchWithRetry = async (
  endpoint,
  data,
  method = "GET",
  maxRetries = 3
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const token = localStorage.getItem("token");
      const fetchFunction = token ? fetchConToken : fetchSinToken;
      return await fetchFunction(endpoint, data, method);
    } catch (error) {
      console.warn(`⚠️ Intento ${attempt}/${maxRetries} falló:`, error.message);

      if (attempt === maxRetries) {
        throw error;
      }

      // Esperar antes del próximo intento
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
};
