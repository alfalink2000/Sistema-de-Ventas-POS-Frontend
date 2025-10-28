// helpers/fetch.js

// URL base para desarrollo - apunta a tu backend local
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Headers comunes para todas las peticiones
const commonHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

/**
 * Fetch sin token (para login, registro, etc.)
 */
export const fetchSinToken = async (endpoint, data, method = "GET") => {
  const url = `${baseURL}/${endpoint}`;

  const config = {
    method,
    headers: commonHeaders,
  };

  if (method !== "GET" && data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);

    // Verificar si la respuesta es JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `Error ${response.status}: ${response.statusText}`
        );
      }

      return result;
    } else {
      // Si no es JSON, devolver texto
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${text}`);
      }
      return text;
    }
  } catch (error) {
    console.error(`Error en fetchSinToken (${method} ${endpoint}):`, error);
    throw error;
  }
};

/**
 * Fetch con token (para rutas protegidas)
 */
export const fetchConToken = async (endpoint, data, method = "GET") => {
  const url = `${baseURL}/${endpoint}`;
  const token = localStorage.getItem("token") || "";

  console.log(`🔄 Fetch: ${method} ${url}`);
  console.log(`📦 Data type:`, data instanceof FormData ? "FormData" : "JSON");

  const config = {
    method,
    headers: {
      // ✅ NO incluir Content-Type para FormData
      ...(data instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
    },
  };

  if (method !== "GET" && data) {
    config.body = data instanceof FormData ? data : JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);

    const contentType = response.headers.get("content-type");
    let result;

    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Respuesta no JSON: ${text}`);
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
      throw new Error(
        result.error || `Error ${response.status}: ${response.statusText}`
      );
    }

    console.log(`✅ Fetch exitoso:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Error en fetchConToken (${method} ${endpoint}):`, error);
    throw error;
  }
};
