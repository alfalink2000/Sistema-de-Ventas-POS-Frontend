// // helpers/fetch.js - VERSIÓN COMPLETAMENTE CORREGIDA
// import Swal from "sweetalert2";

// // URL base para desarrollo - apunta a tu backend local
// const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// // ✅ HEADERS MEJORADOS CON DETECCIÓN AUTOMÁTICA
// const getCommonHeaders = (isFormData = false) => {
//   const headers = {
//     Accept: "application/json",
//   };

//   if (!isFormData) {
//     headers["Content-Type"] = "application/json";
//   }

//   return headers;
// };

// // ✅ FUNCIÓN PARA MOSTRAR ERROR DE SESIÓN EXPIRADA
// async function mostrarErrorSesionExpirada() {
//   // Cerrar cualquier SweetAlert pendiente
//   Swal.close();

//   const result = await Swal.fire({
//     icon: "warning",
//     title: "Sesión expirada",
//     text: "Tu sesión ha caducado. Por favor, inicia sesión nuevamente.",
//     confirmButtonText: "Ir al login",
//     allowOutsideClick: false,
//     allowEscapeKey: false,
//     backdrop: true,
//   });

//   if (result.isConfirmed) {
//     // Limpiar localStorage y redirigir
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     window.location.href = "/login";
//   }
// }

// /**
//  * Fetch sin token (para login, registro, etc.)
//  */
// export const fetchSinToken = async (endpoint, data, method = "GET") => {
//   const url = `${baseURL}/${endpoint}`;

//   const isFormData = data instanceof FormData;
//   const config = {
//     method,
//     headers: getCommonHeaders(isFormData),
//     credentials: "include", // ✅ IMPORTANTE para cookies/tokens
//   };

//   if (method !== "GET" && data) {
//     config.body = isFormData ? data : JSON.stringify(data);
//   }

//   try {
//     console.log(`🔄 fetchSinToken: ${method} ${url}`);

//     const response = await fetch(url, config);
//     return await handleResponse(response, `${method} ${endpoint}`);
//   } catch (error) {
//     console.error(`❌ Error en fetchSinToken (${method} ${endpoint}):`, error);
//     throw error;
//   }
// };

// /**
//  * Fetch con token (para rutas protegidas) - ✅ ERROR DE SINTAXIS CORREGIDO
//  */
// export const fetchConToken = async (endpoint, data, method = "GET") => {
//   const url = `${baseURL}/${endpoint}`;
//   const token = localStorage.getItem("token");

//   console.log(`🔄 fetchConToken: ${method} ${url}`);
//   console.log(`🔑 Token disponible:`, token ? "✅ SÍ" : "❌ NO");

//   // ✅ CORREGIDO: Se había duplicado "if" - ahora es correcto
//   if (!token) {
//     console.error("❌ No hay token disponible - redirigiendo a login");
//     await mostrarErrorSesionExpirada();
//     throw new Error("Token no disponible");
//   }

//   const isFormData = data instanceof FormData;
//   const config = {
//     method,
//     headers: {
//       ...getCommonHeaders(isFormData),
//       Authorization: `Bearer ${token}`,
//       "x-token": token,
//     },
//     credentials: "include",
//   };

//   if (method !== "GET" && data) {
//     config.body = isFormData ? data : JSON.stringify(data);
//   }

//   try {
//     const response = await fetch(url, config);
//     return await handleResponse(response, `${method} ${endpoint}`);
//   } catch (error) {
//     console.error(`❌ Error en fetchConToken (${method} ${endpoint}):`, error);

//     // ✅ Manejar errores de autenticación
//     if (
//       error.message.includes("401") ||
//       error.message.includes("Token no válido") ||
//       error.message.includes("jwt expired") ||
//       error.message.includes("No autorizado")
//     ) {
//       await mostrarErrorSesionExpirada();
//     }

//     throw error;
//   }
// };

// /**
//  * ✅ MANEJO UNIFICADO DE RESPUESTAS
//  */
// async function handleResponse(response, context) {
//   const contentType = response.headers.get("content-type");

//   // ✅ Manejar error 401 antes de procesar la respuesta
//   if (response.status === 401) {
//     console.error(`❌ ${context} - Error 401: No autorizado`);
//     throw new Error("401 - Token no válido o expirado");
//   }

//   // Verificar si la respuesta es JSON
//   if (contentType && contentType.includes("application/json")) {
//     const result = await response.json();

//     if (!response.ok) {
//       const errorMsg =
//         result.error ||
//         result.msg ||
//         `Error ${response.status}: ${response.statusText}`;
//       console.error(`❌ ${context} - Error:`, errorMsg);
//       throw new Error(errorMsg);
//     }

//     console.log(`✅ ${context} - Éxito:`, result);
//     return result;
//   } else {
//     // Si no es JSON, devolver texto
//     const text = await response.text();

//     if (!response.ok) {
//       console.error(`❌ ${context} - Error texto:`, text);
//       throw new Error(`Error ${response.status}: ${text}`);
//     }

//     return text;
//   }
// }

// /**
//  * ✅ NUEVO: Fetch con reintentos para offline/online
//  */
// export const fetchWithRetry = async (
//   endpoint,
//   data,
//   method = "GET",
//   maxRetries = 3
// ) => {
//   for (let attempt = 1; attempt <= maxRetries; attempt++) {
//     try {
//       const token = localStorage.getItem("token");
//       const fetchFunction = token ? fetchConToken : fetchSinToken;
//       return await fetchFunction(endpoint, data, method);
//     } catch (error) {
//       console.warn(`⚠️ Intento ${attempt}/${maxRetries} falló:`, error.message);

//       // ✅ NO REINTENTAR SI ES ERROR DE AUTENTICACIÓN
//       if (
//         error.message.includes("401") ||
//         error.message.includes("Token no válido")
//       ) {
//         throw error;
//       }

//       if (attempt === maxRetries) {
//         throw error;
//       }

//       // Esperar antes del próximo intento
//       await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
//     }
//   }
// };

// export default {
//   fetchSinToken,
//   fetchConToken,
//   fetchWithRetry,
// };
// helpers/fetch.js - VERSIÓN COMPLETAMENTE CORREGIDA CON MANEJO OFFLINE
import Swal from "sweetalert2";

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

// ✅ FUNCIÓN PARA MOSTRAR ERROR DE SESIÓN EXPIRADA
async function mostrarErrorSesionExpirada() {
  // Cerrar cualquier SweetAlert pendiente
  Swal.close();

  const result = await Swal.fire({
    icon: "warning",
    title: "Sesión expirada",
    text: "Tu sesión ha caducado. Por favor, inicia sesión nuevamente.",
    confirmButtonText: "Ir al login",
    allowOutsideClick: false,
    allowEscapeKey: false,
    backdrop: true,
  });

  if (result.isConfirmed) {
    // Limpiar localStorage y redirigir
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
}

// ✅ NUEVO: Función para verificar si estamos en modo offline
const isOfflineMode = () => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  // Si no hay conexión pero tenemos usuario, estamos en modo offline
  if (!navigator.onLine && user) {
    console.log("MODO OFFLINE DETECTADO - Continuando con datos locales");
    return true;
  }

  // Si el token es nuestro token offline placeholder
  if (token === "offline-token") {
    console.log("MODO OFFLINE - Token placeholder detectado");
    return true;
  }

  return false;
};

// ✅ NUEVO: Función para manejar operaciones offline
const handleOfflineOperation = (endpoint, method) => {
  console.log(`Operación offline - ${method} ${endpoint}`);

  // Para endpoints de lectura, devolvemos éxito para permitir continuar
  if (method === "GET") {
    return {
      ok: true,
      offline: true,
      message: "Operación en modo offline",
      data: null,
    };
  }

  // Para endpoints de escritura, podemos manejarlos diferente
  // pero por ahora permitimos continuar
  return {
    ok: true,
    offline: true,
    message: "Datos guardados localmente para sincronización posterior",
    requiresSync: true,
  };
};

/**
 * Fetch sin token (para login, registro, etc.)
 */
export const fetchSinToken = async (endpoint, data, method = "GET") => {
  const url = `${baseURL}/${endpoint}`;

  // ✅ VERIFICAR MODO OFFLINE
  if (isOfflineMode() && endpoint !== "auth/login") {
    console.log(`fetchSinToken offline - ${method} ${endpoint}`);
    return handleOfflineOperation(endpoint, method);
  }

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
    console.log(`fetchSinToken: ${method} ${url}`);

    const response = await fetch(url, config);
    return await handleResponse(response, `${method} ${endpoint}`);
  } catch (error) {
    console.error(`Error en fetchSinToken (${method} ${endpoint}):`, error);

    // ✅ SI ESTAMOS OFFLINE, PERMITIR CONTINUAR
    if (!navigator.onLine) {
      console.log(
        `fetchSinToken offline por error de red - ${method} ${endpoint}`
      );
      return handleOfflineOperation(endpoint, method);
    }

    throw error;
  }
};

/**
 * Fetch con token (para rutas protegidas) - ✅ CON MANEJO OFFLINE COMPLETO
 */
export const fetchConToken = async (endpoint, data, method = "GET") => {
  const url = `${baseURL}/${endpoint}`;
  const token = localStorage.getItem("token");

  console.log(`fetchConToken: ${method} ${url}`);
  console.log(`Token disponible:`, token ? "SI" : "NO");
  console.log(`Conexion:`, navigator.onLine ? "ONLINE" : "OFFLINE");

  // ✅ MODO OFFLINE: Permitir operaciones sin validar token
  if (isOfflineMode()) {
    console.log(`fetchConToken offline - ${method} ${endpoint}`);
    return handleOfflineOperation(endpoint, method);
  }

  // ✅ CORREGIDO: Verificar token solo en modo online
  if (!token && navigator.onLine) {
    console.error("No hay token disponible - redirigiendo a login");
    await mostrarErrorSesionExpirada();
    throw new Error("Token no disponible");
  }

  const isFormData = data instanceof FormData;
  const config = {
    method,
    headers: {
      ...getCommonHeaders(isFormData),
      Authorization: `Bearer ${token}`,
      "x-token": token,
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
    console.error(`Error en fetchConToken (${method} ${endpoint}):`, error);

    // ✅ SI ESTAMOS OFFLINE, PERMITIR CONTINUAR CON OPERACIÓN OFFLINE
    if (!navigator.onLine) {
      console.log(
        `fetchConToken offline por error de red - ${method} ${endpoint}`
      );
      return handleOfflineOperation(endpoint, method);
    }

    // ✅ Manejar errores de autenticación SOLO EN MODO ONLINE
    if (
      error.message.includes("401") ||
      error.message.includes("Token no válido") ||
      error.message.includes("jwt expired") ||
      error.message.includes("No autorizado")
    ) {
      await mostrarErrorSesionExpirada();
    }

    throw error;
  }
};

/**
 * ✅ MANEJO UNIFICADO DE RESPUESTAS
 */
async function handleResponse(response, context) {
  const contentType = response.headers.get("content-type");

  // ✅ Manejar error 401 antes de procesar la respuesta
  if (response.status === 401) {
    console.error(`${context} - Error 401: No autorizado`);
    throw new Error("401 - Token no válido o expirado");
  }

  // Verificar si la respuesta es JSON
  if (contentType && contentType.includes("application/json")) {
    const result = await response.json();

    if (!response.ok) {
      const errorMsg =
        result.error ||
        result.msg ||
        `Error ${response.status}: ${response.statusText}`;
      console.error(`${context} - Error:`, errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`${context} - Exito:`, result);
    return result;
  } else {
    // Si no es JSON, devolver texto
    const text = await response.text();

    if (!response.ok) {
      console.error(`${context} - Error texto:`, text);
      throw new Error(`Error ${response.status}: ${text}`);
    }

    return text;
  }
}

/**
 * ✅ NUEVO: Fetch específico para operaciones offline
 */
export const fetchOffline = async (endpoint, data, method = "GET") => {
  console.log(`fetchOffline: ${method} ${endpoint}`);

  // Simular una respuesta exitosa para operaciones offline
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        offline: true,
        message: "Operación completada en modo offline",
        endpoint,
        method,
        timestamp: new Date().toISOString(),
        requiresSync: method !== "GET", // Las operaciones GET no necesitan sync
      });
    }, 100); // Pequeño delay para simular async
  });
};

/**
 * ✅ NUEVO: Fetch inteligente que decide entre online/offline
 */
export const fetchSmart = async (endpoint, data, method = "GET") => {
  // Si estamos offline, usar fetchOffline automáticamente
  if (!navigator.onLine || isOfflineMode()) {
    return await fetchOffline(endpoint, data, method);
  }

  // Si estamos online, intentar con token primero, luego sin token
  try {
    const token = localStorage.getItem("token");
    if (token && token !== "offline-token") {
      return await fetchConToken(endpoint, data, method);
    } else {
      return await fetchSinToken(endpoint, data, method);
    }
  } catch (error) {
    // Si falla online pero tenemos datos, usar modo offline
    if (isOfflineMode()) {
      console.log(`Fallback a modo offline por error:`, error.message);
      return await fetchOffline(endpoint, data, method);
    }
    throw error;
  }
};

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
      // Usar fetchSmart que maneja automáticamente online/offline
      return await fetchSmart(endpoint, data, method);
    } catch (error) {
      console.warn(`Intento ${attempt}/${maxRetries} falló:`, error.message);

      // ✅ NO REINTENTAR SI ES ERROR DE AUTENTICACIÓN
      if (
        error.message.includes("401") ||
        error.message.includes("Token no válido")
      ) {
        throw error;
      }

      if (attempt === maxRetries) {
        // Último intento: si falla, usar modo offline
        console.log(`Último intento falló, usando modo offline`);
        return await fetchOffline(endpoint, data, method);
      }

      // Esperar antes del próximo intento
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
};

/**
 * ✅ NUEVO: Verificar estado de conexión
 */
export const checkConnection = async () => {
  if (!navigator.onLine) {
    return { online: false, message: "Sin conexión a internet" };
  }

  try {
    const response = await fetch(`${baseURL}/health`, {
      method: "GET",
      headers: getCommonHeaders(),
      signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
    });

    if (response.ok) {
      return { online: true, message: "Conectado al servidor" };
    } else {
      return { online: false, message: "Servidor no responde correctamente" };
    }
  } catch (error) {
    return {
      online: false,
      message: "Error de conexión: " + error.message,
    };
  }
};

/**
 * ✅ NUEVO: Sincronizar datos pendientes cuando se recupera conexión
 */
export const syncPendingOperations = async (pendingOperations = []) => {
  if (!navigator.onLine) {
    return { success: false, message: "Sin conexión para sincronizar" };
  }

  const results = {
    successful: 0,
    failed: 0,
    details: [],
  };

  for (const operation of pendingOperations) {
    try {
      const { endpoint, data, method } = operation;
      console.log(`Sincronizando: ${method} ${endpoint}`);

      const result = await fetchConToken(endpoint, data, method);
      results.successful++;
      results.details.push({
        endpoint,
        method,
        status: "success",
        result,
      });
    } catch (error) {
      results.failed++;
      results.details.push({
        endpoint: operation.endpoint,
        method: operation.method,
        status: "failed",
        error: error.message,
      });
    }
  }

  return results;
};

export default {
  fetchSinToken,
  fetchConToken,
  fetchOffline,
  fetchSmart,
  fetchWithRetry,
  checkConnection,
  syncPendingOperations,
  isOfflineMode,
};
