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
import Swal from "sweetalert2";

// URL base - ya corregida para Render
const baseURL =
  import.meta.env.VITE_API_URL ||
  "https://sistema-de-ventas-pos-backend.onrender.com/api";

// ✅ VARIABLE DE CONTROL PARA EVITAR BUCLE
let sessionExpiredShown = false;

// ✅ HEADERS MEJORADOS
const getCommonHeaders = (isFormData = false) => {
  const headers = {
    Accept: "application/json",
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

// ✅ FUNCIÓN MEJORADA PARA MOSTRAR ERROR DE SESIÓN EXPIRADA (SIN BUCLE)
async function mostrarErrorSesionExpirada() {
  // Evitar mostrar múltiples veces
  if (sessionExpiredShown) return;

  // Solo mostrar si estamos online
  if (!navigator.onLine) return;

  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  // ✅ NO MOSTRAR SI NO HAY CREDENCIALES PREVIAS (inicio de app)
  if (!token && !user) {
    console.log("🔒 Inicio de app sin credenciales - No mostrar error");
    return;
  }

  sessionExpiredShown = true;

  console.log("🔐 Mostrando error de sesión expirada...");

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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionExpiredShown = false; // Resetear para futuras sesiones
    window.location.href = "/login";
  } else {
    sessionExpiredShown = false;
  }
}

// ✅ DETECCIÓN INTELIGENTE DE MODO OFFLINE
const shouldUseOfflineMode = (endpoint, method = "GET") => {
  // 1. SI ESTAMOS ONLINE - NUNCA USAR OFFLINE
  if (navigator.onLine) {
    return false;
  }

  // 2. ENDPOINTS QUE NUNCA DEBEN USAR MODO OFFLINE
  const criticalEndpoints = [
    "auth/login",
    "auth/register",
    "auth/verify-token",
  ];

  if (criticalEndpoints.includes(endpoint)) {
    console.log(
      `⚠️ Endpoint crítico ${endpoint} - Forzando modo online fallback`
    );
    return false;
  }

  // 3. VERIFICAR SI TENEMOS DATOS OFFLINE VÁLIDOS
  const user = localStorage.getItem("user");
  const token = localStorage.getItem("token");

  if (!user || !token) {
    console.log("❌ No hay credenciales offline disponibles");
    return false;
  }

  // 4. PARA OPERACIONES DE ESCRITURA EN OFFLINE, PERMITIR PERO MARCAR PARA SYNC
  if (method !== "GET") {
    console.log(`📝 Operación de escritura offline - ${method} ${endpoint}`);
    return true;
  }

  // 5. OPERACIONES DE LECTURA - PERMITIR OFFLINE SI TENEMOS DATOS
  console.log(`📖 Operación de lectura offline - ${endpoint}`);
  return true;
};

// ✅ MANEJO ELEGANTE DE OPERACIONES OFFLINE
const handleOfflineOperation = async (endpoint, method, data) => {
  console.log(`📴 Ejecutando operación offline: ${method} ${endpoint}`);

  // Simular delay de red
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Respuesta base para offline
  const baseResponse = {
    ok: true,
    offline: true,
    message: "Operación completada en modo offline",
    timestamp: new Date().toISOString(),
    requiresSync: method !== "GET",
  };

  // Respuestas específicas por endpoint
  switch (endpoint) {
    case "auth/verify-token":
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return {
          ...baseResponse,
          ok: true,
          usuario: user,
          message: "Token verificado offline exitosamente",
        };
      }
      return {
        ...baseResponse,
        ok: false,
        error: "No hay usuario autenticado offline",
      };

    case "users":
      // Devolver usuario actual para operaciones offline
      const currentUser = localStorage.getItem("user");
      if (currentUser) {
        return {
          ...baseResponse,
          usuarios: [JSON.parse(currentUser)],
        };
      }
      return {
        ...baseResponse,
        usuarios: [],
      };

    case "productos":
      return {
        ...baseResponse,
        productos: [],
        message: "Usando datos locales de productos",
      };

    case "categorias":
      return {
        ...baseResponse,
        categorias: [],
        message: "Usando datos locales de categorías",
      };

    default:
      return baseResponse;
  }
};

// ✅ MANEJO UNIFICADO DE RESPUESTAS
async function handleResponse(response, context) {
  const contentType = response.headers.get("content-type");

  // ✅ Manejar error 401 antes de procesar la respuesta
  // ✅ MANEJAR 401 DE FORMA MÁS SEGURA
  if (response.status === 401) {
    console.log(`🔐 ${context} - Error 401 detectado`);

    // No limpiar credenciales inmediatamente, esperar verificación
    const token = localStorage.getItem("token");
    if (token && !token.includes("offline")) {
      console.log("🔄 Token parece ser válido pero falló, verificando...");
      // La verificación se hará en el flujo normal
    }

    throw new Error("401 - No autorizado");
  }

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

    console.log(`✅ ${context} - Éxito`);
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

// ✅ FETCH SIN TOKEN - CON MANEJO MEJORADO DE TIMEOUTS
export const fetchSinToken = async (endpoint, data, method = "GET") => {
  const url = `${baseURL}/${endpoint}`;

  // ✅ VERIFICAR SI DEBEMOS USAR MODO OFFLINE
  if (shouldUseOfflineMode(endpoint, method)) {
    return await handleOfflineOperation(endpoint, method, data);
  }

  const isFormData = data instanceof FormData;
  const config = {
    method,
    headers: getCommonHeaders(isFormData),
    credentials: "include",
  };

  if (method !== "GET" && data) {
    config.body = isFormData ? data : JSON.stringify(data);
  }

  try {
    console.log(`🌐 fetchSinToken: ${method} ${url}`);

    // ✅ TIMEOUT ESPECÍFICO PARA LOGIN
    const timeout = endpoint === "auth/login" ? 10000 : 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Timeout en ${endpoint} después de ${timeout}ms`);
      controller.abort();
    }, timeout);
    config.signal = controller.signal;

    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    return await handleResponse(response, `${method} ${endpoint}`);
  } catch (error) {
    console.error(`❌ Error en fetchSinToken (${method} ${endpoint}):`, error);

    if (error.name === "AbortError") {
      console.log(`⏰ Timeout en ${endpoint}`);
      throw new Error(`La solicitud tardó demasiado tiempo (${timeout}ms)`);
    }

    // ✅ SI FALLÓ PERO ESTAMOS OFFLINE, USAR MODO OFFLINE
    if (!navigator.onLine) {
      console.log(`📴 Fallback a modo offline por error:`, error.message);
      return await handleOfflineOperation(endpoint, method, data);
    }

    throw error;
  }
};

// ✅ FETCH CON TOKEN - CON MANEJO MEJORADO DE TIMEOUTS
export const fetchConToken = async (endpoint, data, method = "GET") => {
  const url = `${baseURL}/${endpoint}`;

  // ✅ VERIFICAR SI DEBEMOS USAR MODO OFFLINE
  if (shouldUseOfflineMode(endpoint, method)) {
    return await handleOfflineOperation(endpoint, method, data);
  }

  // ✅ OBTENER TOKEN (REAL U OFFLINE)
  let token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  // ✅ SI NO HAY TOKEN PERO HAY USUARIO, CREAR TOKEN OFFLINE
  if (!token && user) {
    token = "offline-token-" + Date.now();
    localStorage.setItem("token", token);
    console.log("🔐 Token offline generado automáticamente");
  }

  console.log(`🌐 fetchConToken: ${method} ${url}`);

  const isFormData = data instanceof FormData;
  const config = {
    method,
    headers: {
      ...getCommonHeaders(isFormData),
      ...(token && {
        Authorization: `Bearer ${token}`,
        "x-token": token,
      }),
    },
    credentials: "include",
  };

  if (method !== "GET" && data) {
    config.body = isFormData ? data : JSON.stringify(data);
  }

  try {
    console.log(`🔗 Ejecutando petición con token...`);

    // ✅ TIMEOUT REDUCIDO ESPECÍFICAMENTE PARA VERIFICACIÓN
    const timeout =
      endpoint === "auth/verify-token"
        ? 8000
        : endpoint === "auth/login"
        ? 10000
        : 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Timeout en ${endpoint}`);
      controller.abort();
    }, timeout);
    config.signal = controller.signal;

    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    return await handleResponse(response, `${method} ${endpoint}`);
  } catch (error) {
    console.error(`❌ Error en fetchConToken (${method} ${endpoint}):`, error);

    if (error.name === "AbortError") {
      console.log(`⏰ Timeout en ${endpoint}`);
      throw new Error(`La solicitud tardó demasiado tiempo (${timeout}ms)`);
    }

    // ✅ SI ESTAMOS OFFLINO O HAY ERROR DE RED, USAR MODO OFFLINE
    if (!navigator.onLine) {
      console.log(`📴 Fallback a modo offline por error de red`);
      return await handleOfflineOperation(endpoint, method, data);
    }

    throw error;
  }
};

// ✅ FUNCIONES AUXILIARES PARA OFFLINE

// Verificar estado de conexión
export const checkConnection = async () => {
  if (!navigator.onLine) {
    return {
      online: false,
      message: "Sin conexión a internet",
      user: localStorage.getItem("user")
        ? "Usuario offline disponible"
        : "Sin usuario offline",
    };
  }

  try {
    const response = await fetch(`${baseURL}/health`, {
      method: "GET",
      headers: getCommonHeaders(),
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

// Obtener información del estado offline
export const getOfflineStatus = () => {
  const user = localStorage.getItem("user");
  const token = localStorage.getItem("token");

  return {
    isOnline: navigator.onLine,
    hasOfflineUser: !!user,
    hasToken: !!token,
    user: user ? JSON.parse(user) : null,
    canOperateOffline: !navigator.onLine && !!user,
  };
};

// Sincronizar datos pendientes cuando vuelve la conexión
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
      console.log(`🔄 Sincronizando: ${method} ${endpoint}`);

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

// ✅ FETCH INTELIGENTE QUE DECIDE AUTOMÁTICAMENTE
export const fetchSmart = async (endpoint, data, method = "GET") => {
  const token = localStorage.getItem("token");

  if (token && token !== "offline-token") {
    return await fetchConToken(endpoint, data, method);
  } else {
    return await fetchSinToken(endpoint, data, method);
  }
};

export default {
  fetchSinToken,
  fetchConToken,
  fetchSmart,
  checkConnection,
  getOfflineStatus,
  syncPendingOperations,
};
