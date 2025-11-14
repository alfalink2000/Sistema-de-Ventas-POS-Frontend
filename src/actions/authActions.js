// // actions/authActions.js - VERSIÓN FINAL CORREGIDA
// import { types } from "../types/types";
// import Swal from "sweetalert2";
// import { fetchSinToken, fetchConToken } from "../helpers/fetch";
// import { loadProducts } from "./productsActions";
// import { loadCategories } from "./categoriesActions";
// import AuthOfflineController from "../controllers/offline/AuthOfflineController/AuthOfflineController";
// // import SyncController from "../controllers/offline/SyncController/SyncController";

// // ✅ ACTIONS BÁSICAS
// export const startLoading = () => ({
//   type: types.authStartLoading,
// });

// export const finishLoading = () => ({
//   type: types.authFinishLoading,
// });

// export const checkingFinish = () => ({
//   type: types.authCheckingFinish,
// });

// export const clearError = () => ({
//   type: types.authClearError,
// });

// // ✅ VERIFICACIÓN DE AUTENTICACIÓN - VERSIÓN FINAL
// export const startChecking = () => {
//   return async (dispatch) => {
//     const token = localStorage.getItem("token");
//     const user = localStorage.getItem("user");

//     console.log("🔍 Verificando autenticación...", {
//       hasToken: !!token,
//       hasUser: !!user,
//       isOnline: navigator.onLine,
//     });

//     if (!token || !user) {
//       console.log("❌ No hay credenciales guardadas");
//       dispatch(checkingFinish());
//       return;
//     }

//     try {
//       const userData = JSON.parse(user);

//       // ✅ SIEMPRE: Buscar usuario en cache offline primero
//       const offlineUser = await AuthOfflineController.getUserByUsername(
//         userData.username
//       );

//       if (!offlineUser) {
//         console.warn("❌ Usuario no encontrado en datos offline");
//         localStorage.removeItem("token");
//         localStorage.removeItem("user");
//         dispatch(checkingFinish());
//         return;
//       }

//       console.log("✅ Usuario encontrado en cache offline - Procesando...");

//       // ✅ MODO OFFLINE: Autenticar inmediatamente SIN verificar token
//       if (!navigator.onLine) {
//         console.log("📱 Modo offline - Autenticando SIN verificación de token");
//         dispatch({
//           type: types.authLogin,
//           payload: userData,
//         });
//         dispatch(checkingFinish());
//         return;
//       }

//       // ✅ MODO ONLINE: Verificar token con servidor
//       console.log("🌐 Modo online - Verificando token...");
//       try {
//         const response = await fetchConToken("auth/verify-token");

//         if (response.ok === true) {
//           console.log("✅ Token válido en servidor - Autenticando");
//           dispatch({
//             type: types.authLogin,
//             payload: userData,
//           });
//         } else {
//           // ❌ Token inválido online - Limpiar y mostrar alerta UNA SOLA VEZ
//           console.warn("⚠️ Token inválido online - Limpiando credenciales");
//           localStorage.removeItem("token");
//           localStorage.removeItem("user");

//           // ✅ PREVENIR BUCLE: Usar sessionStorage para mostrar alerta solo una vez
//           if (!sessionStorage.getItem("token_expired_shown")) {
//             sessionStorage.setItem("token_expired_shown", "true");

//             await Swal.fire({
//               icon: "warning",
//               title: "Sesión expirada",
//               text: "Tu sesión ha caducado. Por favor, inicia sesión nuevamente.",
//               confirmButtonText: "Entendido",
//               background: "#fef2f2",
//               color: "#7f1d1d",
//             }).then(() => {
//               // Limpiar el flag después de que el usuario cierre el alert
//               setTimeout(() => {
//                 sessionStorage.removeItem("token_expired_shown");
//               }, 1000);
//             });
//           }
//         }
//       } catch (onlineError) {
//         console.warn("⚠️ Error verificación online:", onlineError);

//         // ✅ EN CASO DE ERROR DE CONEXIÓN DURANTE VERIFICACIÓN: Permitir offline
//         if (
//           onlineError.message.includes("Failed to fetch") ||
//           onlineError.message.includes("Network")
//         ) {
//           console.log(
//             "🌐 Error de red durante verificación - Autenticando en modo offline"
//           );
//           dispatch({
//             type: types.authLogin,
//             payload: userData,
//           });
//         } else {
//           // ❌ Otros errores: Limpiar credenciales
//           console.error("❌ Error crítico en verificación:", onlineError);
//           localStorage.removeItem("token");
//           localStorage.removeItem("user");
//         }
//       }
//     } catch (error) {
//       console.error("❌ Error en verificación de autenticación:", error);
//       localStorage.removeItem("token");
//       localStorage.removeItem("user");
//     } finally {
//       dispatch(checkingFinish());
//     }
//   };
// };
// // ✅ LOGIN PRINCIPAL
// // export const startLogin = (username, password) => {
// //   return async (dispatch) => {
// //     dispatch({ type: types.authStartLoading });

// //     try {
// //       console.log("🔐 INICIANDO LOGIN para:", username);

// //       let loginResult;

// //       // 1. INTENTAR ONLINE PRIMERO
// //       if (navigator.onLine) {
// //         try {
// //           console.log("🔄 Intentando login ONLINE...");
// //           const response = await fetchSinToken(
// //             "auth/login",
// //             { username, password },
// //             "POST"
// //           );

// //           console.log("📥 Respuesta del servidor:", response);

// //           if (response.ok === true) {
// //             const { token, usuario } = response;

// //             // ✅ GUARDAR TOKEN INMEDIATAMENTE
// //             localStorage.setItem("token", token);
// //             localStorage.setItem("user", JSON.stringify(usuario));

// //             console.log(
// //               "✅ Login online exitoso - Token guardado:",
// //               token ? "✅" : "❌"
// //             );

// //             // ✅ GUARDAR USUARIO EN INDEXEDDB
// //             console.log("💾 Guardando usuario en IndexedDB para offline...");
// //             try {
// //               const saveResult = await AuthOfflineController.saveUser(
// //                 usuario,
// //                 token
// //               );
// //               console.log("💾 Resultado de guardar usuario:", saveResult);

// //               if (!saveResult.success) {
// //                 console.error(
// //                   "❌ No se pudo guardar usuario offline:",
// //                   saveResult.error
// //                 );
// //               } else {
// //                 console.log(
// //                   "✅ Usuario guardado exitosamente para uso offline"
// //                 );
// //               }
// //             } catch (saveError) {
// //               console.error("❌ Error guardando usuario offline:", saveError);
// //             }

// //             // ✅ DISPATCH INMEDIATO
// //             dispatch({
// //               type: types.authLogin,
// //               payload: usuario,
// //             });

// //             // ✅ VERIFICAR INMEDIATAMENTE QUE EL TOKEN FUNCIONE
// //             try {
// //               console.log("🔍 Verificando que el token funcione...");
// //               const testResponse = await fetchConToken("productos");
// //               console.log("✅ Token verificado correctamente");
// //             } catch (tokenError) {
// //               console.error("❌ El token no funciona:", tokenError);
// //             }

// //             // ✅ CARGAR DATOS DESPUÉS DEL LOGIN
// //             try {
// //               await dispatch(loadProducts());
// //               await dispatch(loadCategories());
// //             } catch (loadError) {
// //               console.error("Error cargando datos:", loadError);
// //             }

// //             // ✅ SINCRONIZACIÓN NO BLOQUEANTE
// //             // setTimeout(async () => {
// //             //   try {
// //             //     if (navigator.onLine) {
// //             //       await SyncController.syncMasterData();
// //             //     }
// //             //   } catch (syncError) {
// //             //     console.error("❌ Error sincronizando:", syncError);
// //             //   }
// //             // }, 1000);

// //             await Swal.fire({
// //               icon: "success",
// //               title: "¡Bienvenido!",
// //               text: `Hola ${usuario.nombre}`,
// //               timer: 2000,
// //               showConfirmButton: false,
// //             });

// //             return { success: true, user: usuario };
// //           } else {
// //             throw new Error(response.error || "Credenciales incorrectas");
// //           }
// //         } catch (onlineError) {
// //           console.error("💥 Error en login online:", onlineError);
// //           // Si es error de red, continuar con offline
// //           if (onlineError.message.includes("Failed to fetch")) {
// //             console.log("🌐 Error de red - continuando offline");
// //           } else {
// //             throw onlineError;
// //           }
// //         }
// //       }

// //       // 2. MODO OFFLINE
// //       console.log("📴 Intentando login OFFLINE...");
// //       const offlineResult = await AuthOfflineController.verifyCredentials(
// //         username,
// //         password
// //       );

// //       if (offlineResult.success) {
// //         const { user, token } = offlineResult;

// //         localStorage.setItem("token", token);
// //         localStorage.setItem("user", JSON.stringify(user));

// //         dispatch({
// //           type: types.authLogin,
// //           payload: user,
// //         });

// //         await Swal.fire({
// //           icon: "warning",
// //           title: "Modo Offline",
// //           text: `Hola ${user.nombre}. Trabajando sin conexión.`,
// //           timer: 3000,
// //           showConfirmButton: false,
// //         });

// //         return { success: true, user: user, isOffline: true };
// //       } else {
// //         throw new Error(offlineResult.error || "Credenciales incorrectas");
// //       }
// //     } catch (error) {
// //       console.error("❌ Error final en login:", error);

// //       await Swal.fire({
// //         icon: "error",
// //         title: "Error de acceso",
// //         text: error.message,
// //         confirmButtonText: "Entendido",
// //       });

// //       dispatch({
// //         type: types.authError,
// //         payload: error.message,
// //       });

// //       return { success: false, error: error.message };
// //     } finally {
// //       dispatch({ type: types.authFinishLoading });
// //     }
// //   };
// // };
// export const startLogin = (username, password) => {
//   return async (dispatch) => {
//     dispatch({ type: types.authStartLoading });

//     try {
//       console.log("🔐 INICIANDO LOGIN para:", username);

//       // 1. PRIMERO VERIFICAR SI HAY USUARIOS OFFLINE DISPONIBLES
//       const offlineUsers = await AuthOfflineController.getAllOfflineUsers();
//       const hasOfflineUsers = offlineUsers && offlineUsers.length > 0;

//       console.log(
//         "📊 Usuarios offline disponibles:",
//         offlineUsers?.length || 0
//       );

//       // 2. SI ESTÁ ONLINE, INTENTAR LOGIN ONLINE PRIMERO
//       if (navigator.onLine) {
//         try {
//           console.log("🔄 Intentando login ONLINE...");
//           const response = await fetchSinToken(
//             "auth/login",
//             { username, password },
//             "POST"
//           );

//           console.log("📥 Respuesta del servidor:", response);

//           if (response.ok === true) {
//             const { token, usuario } = response;

//             // ✅ GUARDAR TOKEN INMEDIATAMENTE
//             localStorage.setItem("token", token);
//             localStorage.setItem("user", JSON.stringify(usuario));

//             console.log(
//               "✅ Login online exitoso - Token guardado:",
//               token ? "✅" : "❌"
//             );

//             // ✅ GUARDAR USUARIO EN INDEXEDDB PARA USO OFFLINO FUTURO
//             console.log("💾 Guardando usuario en IndexedDB para offline...");
//             try {
//               await AuthOfflineController.saveUser(usuario, token);
//               console.log("✅ Usuario guardado exitosamente para uso offline");
//             } catch (saveError) {
//               console.error("❌ Error guardando usuario offline:", saveError);
//               // NO IMPEDIR EL LOGIN POR ERROR AL GUARDAR OFFLINE
//             }

//             // ✅ DISPATCH INMEDIATO
//             dispatch({
//               type: types.authLogin,
//               payload: usuario,
//             });

//             // ✅ CARGAR DATOS DESPUÉS DEL LOGIN
//             try {
//               await dispatch(loadProducts());
//               await dispatch(loadCategories());
//             } catch (loadError) {
//               console.error("Error cargando datos:", loadError);
//             }

//             await Swal.fire({
//               icon: "success",
//               title: "¡Bienvenido!",
//               text: `Hola ${usuario.nombre}`,
//               timer: 2000,
//               showConfirmButton: false,
//             });

//             return { success: true, user: usuario };
//           } else {
//             throw new Error(response.error || "Credenciales incorrectas");
//           }
//         } catch (onlineError) {
//           console.error("💥 Error en login online:", onlineError);

//           // ✅ SI HAY ERROR DE RED Y HAY USUARIOS OFFLINE, INTENTAR OFFLINE
//           if (
//             onlineError.message.includes("Failed to fetch") &&
//             hasOfflineUsers
//           ) {
//             console.log("🌐 Error de red - continuando con login offline...");
//             // Continuará al bloque offline más abajo
//           } else {
//             // ❌ SI NO HAY USUARIOS OFFLINE O ES OTRO ERROR, PROPAGAR EL ERROR
//             throw onlineError;
//           }
//         }
//       }

//       // 3. MODO OFFLINE O FALLBACK OFFLINE
//       // Solo intentar offline si hay usuarios disponibles offline
//       if (hasOfflineUsers) {
//         console.log("📴 Intentando login OFFLINE...");
//         const offlineResult = await AuthOfflineController.verifyCredentials(
//           username,
//           password
//         );

//         if (offlineResult.success) {
//           const { user, token } = offlineResult;

//           localStorage.setItem("token", token);
//           localStorage.setItem("user", JSON.stringify(user));

//           dispatch({
//             type: types.authLogin,
//             payload: user,
//           });

//           await Swal.fire({
//             icon: "warning",
//             title: "Modo Offline",
//             text: `Hola ${user.nombre}. Trabajando sin conexión.`,
//             timer: 3000,
//             showConfirmButton: false,
//           });

//           return { success: true, user: user, isOffline: true };
//         } else {
//           // ❌ FALLÓ LOGIN OFFLINE
//           throw new Error(
//             offlineResult.error || "Credenciales incorrectas en modo offline"
//           );
//         }
//       } else {
//         // ❌ NO HAY USUARIOS OFFLINE DISPONIBLES
//         throw new Error(
//           "No hay usuarios disponibles offline. Conecta a internet para primer acceso."
//         );
//       }
//     } catch (error) {
//       console.error("❌ Error final en login:", error);

//       await Swal.fire({
//         icon: "error",
//         title: "Error de acceso",
//         text: error.message,
//         confirmButtonText: "Entendido",
//       });

//       dispatch({
//         type: types.authError,
//         payload: error.message,
//       });

//       return { success: false, error: error.message };
//     } finally {
//       dispatch({ type: types.authFinishLoading });
//     }
//   };
// };
// // ✅ OFFLINE CHECKING
// export const startOfflineChecking = () => {
//   return async (dispatch) => {
//     console.log("🔍 Iniciando verificación offline...");

//     const token = localStorage.getItem("token");
//     const user = localStorage.getItem("user");

//     if (!token || !user) {
//       console.log("❌ No hay credenciales guardadas para offline");
//       dispatch(checkingFinish());
//       return;
//     }

//     try {
//       const userData = JSON.parse(user);

//       // Verificar si el usuario existe en IndexedDB
//       const offlineUser = await AuthOfflineController.getUserByUsername(
//         userData.username
//       );

//       if (offlineUser) {
//         console.log("✅ Credenciales offline válidas - Autenticando");

//         dispatch({
//           type: types.authLogin,
//           payload: userData,
//         });

//         dispatch(checkingFinish());

//         // Mostrar alerta de modo offline
//         setTimeout(() => {
//           Swal.fire({
//             icon: "info",
//             title: "Modo Offline",
//             text: `Bienvenido ${userData.nombre}. Trabajando sin conexión.`,
//             timer: 3000,
//             showConfirmButton: false,
//           });
//         }, 1000);
//       } else {
//         console.warn("❌ Usuario no encontrado en datos offline");
//         localStorage.removeItem("token");
//         localStorage.removeItem("user");
//         dispatch(checkingFinish());
//       }
//     } catch (error) {
//       console.error("❌ Error en verificación offline:", error);
//       localStorage.removeItem("token");
//       localStorage.removeItem("user");
//       dispatch(checkingFinish());
//     }
//   };
// };

// // ✅ SINCRONIZAR USUARIOS - VERSIÓN MEJORADA
// export const syncOfflineUsers = () => {
//   return async (dispatch) => {
//     // ✅ VERIFICAR CONEXIÓN
//     if (!navigator.onLine) {
//       console.log("📴 Sin conexión - No se puede sincronizar usuarios");
//       return {
//         success: false,
//         error: "Sin conexión a internet",
//         silent: true,
//       };
//     }

//     try {
//       Swal.fire({
//         title: "Sincronizando...",
//         text: "Actualizando datos de usuarios offline",
//         allowOutsideClick: false,
//         didOpen: () => {
//           Swal.showLoading();
//         },
//       });

//       const result = await AuthOfflineController.syncUsersFromServer();

//       Swal.close();

//       if (result.success) {
//         const users = await AuthOfflineController.getAllOfflineUsers();
//         const stats = {
//           totalRecords: users.length,
//           uniqueUsers: users.length,
//           duplicates: 0,
//           usersByRole: {},
//         };

//         users.forEach((user) => {
//           stats.usersByRole[user.rol] = (stats.usersByRole[user.rol] || 0) + 1;
//         });

//         await Swal.fire({
//           icon: "success",
//           title: "Datos actualizados",
//           text: `✅ ${result.count} usuarios sincronizados\n📊 ${stats.uniqueUsers} usuarios disponibles offline`,
//           timer: 3000,
//           showConfirmButton: false,
//           background: "#f0f9ff",
//           color: "#1e293b",
//         });

//         return { success: true, count: result.count, stats };
//       } else {
//         // ✅ ERRORES SILENCIOSOS - No mostrar alertas que puedan causar bucles
//         console.warn("Sincronización falló silenciosamente:", result.error);
//         return {
//           success: false,
//           error: result.error,
//           silent: true,
//         };
//       }
//     } catch (error) {
//       console.error("Error en sincronización de usuarios:", error);
//       Swal.close();

//       // ✅ MANEJO SILENCIOSO DE ERRORES - Evitar bucles
//       return {
//         success: false,
//         error: error.message,
//         silent: true, // ✅ NO PROPAGAR EL ERROR
//       };
//     }
//   };
// };
// // ✅ LOGOUT
// export const startLogout = () => {
//   return async (dispatch) => {
//     const result = await Swal.fire({
//       icon: "question",
//       title: "¿Cerrar sesión?",
//       text: "Estás a punto de salir del sistema",
//       showCancelButton: true,
//       confirmButtonText: "Sí, salir",
//       cancelButtonText: "Cancelar",
//       confirmButtonColor: "#ef4444",
//       cancelButtonColor: "#64748b",
//       background: "#f8fafc",
//       color: "#1e293b",
//     });

//     if (result.isConfirmed) {
//       localStorage.removeItem("token");
//       localStorage.removeItem("user");

//       await Swal.fire({
//         icon: "success",
//         title: "Sesión cerrada",
//         text: "Has salido del sistema correctamente",
//         timer: 1500,
//         showConfirmButton: false,
//         background: "#f0f9ff",
//         color: "#1e293b",
//       });

//       dispatch({
//         type: types.authLogout,
//       });
//     }
//   };
// };

// // ✅ OBTENER ESTADÍSTICAS
// export const getOfflineUsersStats = () => {
//   return async (dispatch) => {
//     try {
//       const users = await AuthOfflineController.getAllOfflineUsers();
//       const stats = {
//         totalRecords: users.length,
//         uniqueUsers: users.length,
//         duplicates: 0,
//         usersByRole: {},
//         lastSync: users.length > 0 ? users[0].savedAt : null,
//       };

//       users.forEach((user) => {
//         stats.usersByRole[user.rol] = (stats.usersByRole[user.rol] || 0) + 1;
//       });

//       return stats;
//     } catch (error) {
//       console.error("Error obteniendo estadísticas:", error);
//       return null;
//     }
//   };
// };
// actions/authActions.js - VERSIÓN COMPLETA CORREGIDA
import { types } from "../types/types";
import Swal from "sweetalert2";
import { fetchSinToken, fetchConToken } from "../helpers/fetch";
import { loadProducts } from "./productsActions";
import { loadCategories } from "./categoriesActions";
import AuthOfflineController from "../controllers/offline/AuthOfflineController/AuthOfflineController";

// ✅ ACTIONS BÁSICAS
export const startLoading = () => ({
  type: types.authStartLoading,
});

export const finishLoading = () => ({
  type: types.authFinishLoading,
});

export const checkingFinish = () => ({
  type: types.authCheckingFinish,
});

export const clearError = () => ({
  type: types.authClearError,
});

// ✅ FUNCIÓN AUXILIAR PARA MANEJAR TOKEN INVÁLIDO

// ✅ DETECTAR ERRORES DE RED
const isNetworkError = (error) => {
  return (
    error.message.includes("Failed to fetch") ||
    error.message.includes("Network") ||
    error.message.includes("net::")
  );
};

let authCheckInProgress = false;
// ✅ VERIFICACIÓN DE AUTENTICACIÓN - VERSIÓN CORREGIDA SIN BUCLE
export const startChecking = () => {
  return async (dispatch) => {
    if (authCheckInProgress) {
      console.log("⏳ Verificación ya en progreso, omitiendo...");
      return;
    }

    authCheckInProgress = true;

    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    console.log("🔍 Verificación silenciosa de autenticación...", {
      hasToken: !!token,
      hasUser: !!user,
      isOnline: navigator.onLine,
    });

    // ✅ CASO 1: NO HAY CREDENCIALES - LIMPIAR INMEDIATAMENTE
    if (!token || !user) {
      console.log("❌ No hay credenciales - Limpiando silenciosamente");
      dispatch(checkingFinish());
      return;
    }

    try {
      const userData = JSON.parse(user);

      // ✅ VERIFICACIÓN OFFLINE RÁPIDA
      if (!navigator.onLine) {
        console.log("📱 Modo offline - Autenticando silenciosamente");
        dispatch({ type: types.authLogin, payload: userData });
        dispatch(checkingFinish());
        return;
      }

      // ✅ VERIFICACIÓN ONLINE CON TIMEOUT
      console.log("🌐 Modo online - Verificando token...");

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );

      const verificationPromise = fetchConToken("auth/verify-token");

      try {
        const response = await Promise.race([
          verificationPromise,
          timeoutPromise,
        ]);

        if (response.ok === true) {
          console.log("✅ Token válido - Autenticando");
          dispatch({ type: types.authLogin, payload: userData });
        } else {
          throw new Error("Token inválido");
        }
      } catch (onlineError) {
        console.log(
          "❌ Error online, usando datos offline:",
          onlineError.message
        );
        // Fallback a datos offline
        dispatch({ type: types.authLogin, payload: userData });
      }
    } catch (error) {
      console.log("❌ Error en verificación - Limpiando:", error.message);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      dispatch({ type: types.authLogout });
    } finally {
      // ✅ GARANTIZAR que checking termina
      authCheckInProgress = false;
      dispatch(checkingFinish());
    }
  };
};
// ✅ LOGIN PRINCIPAL - VERSIÓN COMPLETA
// ✅ LOGIN PRINCIPAL - VERSIÓN CORREGIDA
export const startLogin = (username, password) => {
  return async (dispatch) => {
    dispatch({ type: types.authStartLoading });

    try {
      console.log("🔐 INICIANDO LOGIN para:", username);

      // 1. PRIMERO VERIFICAR SI HAY USUARIOS OFFLINE DISPONIBLES
      const offlineUsers = await AuthOfflineController.getAllOfflineUsers();
      const hasOfflineUsers = offlineUsers && offlineUsers.length > 0;

      console.log(
        "📊 Usuarios offline disponibles:",
        offlineUsers?.length || 0
      );

      // 2. SI ESTÁ ONLINE, INTENTAR LOGIN ONLINE PRIMERO
      if (navigator.onLine) {
        try {
          console.log("🔄 Intentando login ONLINE...");
          const response = await fetchSinToken(
            "auth/login",
            { username, password },
            "POST"
          );

          console.log("📥 Respuesta del servidor:", response);

          if (response.ok === true) {
            const { token, usuario } = response;

            // ✅ GUARDAR TOKEN INMEDIATAMENTE
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(usuario));

            console.log("✅ Login online exitoso - Credenciales guardadas");

            // ✅ CREAR TOKEN OFFLINE DE RESPALDO
            const offlineToken = `offline-backup-${Date.now()}`;
            localStorage.setItem("offline-token-backup", offlineToken);

            // ✅ GUARDAR USUARIO EN INDEXEDDB PARA OFFLINE
            try {
              await AuthOfflineController.saveUser(usuario, token);
              console.log("✅ Usuario guardado para uso offline");
            } catch (saveError) {
              console.error("❌ Error guardando usuario offline:", saveError);
            }

            // ✅ DISPATCH INMEDIATO
            dispatch({
              type: types.authLogin,
              payload: usuario,
            });

            // ✅ CARGAR DATOS DESPUÉS DEL LOGIN
            try {
              await dispatch(loadProducts());
              await dispatch(loadCategories());
            } catch (loadError) {
              console.error("Error cargando datos:", loadError);
            }

            return { success: true, user: usuario };
          } else {
            throw new Error(response.error || "Credenciales incorrectas");
          }
        } catch (onlineError) {
          console.error("💥 Error en login online:", onlineError);

          // ✅ SI HAY ERROR DE RED Y HAY USUARIOS OFFLINE, INTENTAR OFFLINE
          if (
            onlineError.message.includes("Failed to fetch") &&
            hasOfflineUsers
          ) {
            console.log("🌐 Error de red - continuando con login offline...");
            // Continuará al bloque offline más abajo
          } else {
            throw onlineError;
          }
        }
      }

      // 3. MODO OFFLINE O FALLBACK OFFLINE
      if (hasOfflineUsers) {
        console.log("📴 Intentando login OFFLINE...");
        const offlineResult = await AuthOfflineController.verifyCredentials(
          username,
          password
        );

        if (offlineResult.success) {
          const { user, token } = offlineResult;

          localStorage.setItem("token", token);
          localStorage.setItem("user", JSON.stringify(user));

          dispatch({
            type: types.authLogin,
            payload: user,
          });

          return { success: true, user: user, isOffline: true };
        } else {
          throw new Error(
            offlineResult.error || "Credenciales incorrectas en modo offline"
          );
        }
      } else {
        throw new Error(
          "No hay usuarios disponibles offline. Conecta a internet para primer acceso."
        );
      }
    } catch (error) {
      console.error("❌ Error final en login:", error);
      dispatch({
        type: types.authError,
        payload: error.message,
      });
      return { success: false, error: error.message };
    } finally {
      dispatch({ type: types.authFinishLoading });
    }
  };
};

// ✅ OFFLINE CHECKING - VERSIÓN COMPLETA
// ✅ OFFLINE CHECKING - VERSIÓN SILENCIOSA
export const startOfflineChecking = () => {
  return async (dispatch) => {
    console.log("🔍 Verificación offline silenciosa...");

    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      console.log("❌ No hay credenciales para offline");
      dispatch(checkingFinish());
      return;
    }

    try {
      const userData = JSON.parse(user);
      const offlineUser = await AuthOfflineController.getUserByUsername(
        userData.username
      );

      if (offlineUser) {
        console.log(
          "✅ Credenciales offline válidas - Autenticando silenciosamente"
        );
        dispatch({
          type: types.authLogin,
          payload: userData,
        });
      } else {
        console.log("❌ Usuario no encontrado en datos offline");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        dispatch({ type: types.authLogout });
      }
    } catch (error) {
      console.log(
        "❌ Error en verificación offline - Limpiando silenciosamente"
      );
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      dispatch({ type: types.authLogout });
    } finally {
      dispatch(checkingFinish());
    }
  };
};

// ✅ SINCRONIZAR USUARIOS - VERSIÓN COMPLETA
export const syncOfflineUsers = () => {
  return async (dispatch) => {
    // ✅ VERIFICAR CONEXIÓN
    if (!navigator.onLine) {
      console.log("📴 Sin conexión - No se puede sincronizar usuarios");
      return {
        success: false,
        error: "Sin conexión a internet",
        silent: true,
      };
    }

    try {
      Swal.fire({
        title: "Sincronizando...",
        text: "Actualizando datos de usuarios offline",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const result = await AuthOfflineController.syncUsersFromServer();

      Swal.close();

      if (result.success) {
        const users = await AuthOfflineController.getAllOfflineUsers();
        const stats = {
          totalRecords: users.length,
          uniqueUsers: users.length,
          duplicates: 0,
          usersByRole: {},
        };

        users.forEach((user) => {
          stats.usersByRole[user.rol] = (stats.usersByRole[user.rol] || 0) + 1;
        });

        await Swal.fire({
          icon: "success",
          title: "Datos actualizados",
          text: `✅ ${result.count} usuarios sincronizados\n📊 ${stats.uniqueUsers} usuarios disponibles offline`,
          timer: 3000,
          showConfirmButton: false,
          background: "#f0f9ff",
          color: "#1e293b",
        });

        return { success: true, count: result.count, stats };
      } else {
        // ✅ ERRORES SILENCIOSOS - No mostrar alertas que puedan causar bucles
        console.warn("Sincronización falló silenciosamente:", result.error);
        return {
          success: false,
          error: result.error,
          silent: true,
        };
      }
    } catch (error) {
      console.error("Error en sincronización de usuarios:", error);
      Swal.close();

      // ✅ MANEJO SILENCIOSO DE ERRORES - Evitar bucles
      return {
        success: false,
        error: error.message,
        silent: true, // ✅ NO PROPAGAR EL ERROR
      };
    }
  };
};

// ✅ LOGOUT - VERSIÓN COMPLETA
export const startLogout = () => {
  return async (dispatch) => {
    const result = await Swal.fire({
      icon: "question",
      title: "¿Cerrar sesión?",
      text: "Estás a punto de salir del sistema",
      showCancelButton: true,
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      background: "#f8fafc",
      color: "#1e293b",
    });

    if (result.isConfirmed) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      await Swal.fire({
        icon: "success",
        title: "Sesión cerrada",
        text: "Has salido del sistema correctamente",
        timer: 1500,
        showConfirmButton: false,
        background: "#f0f9ff",
        color: "#1e293b",
      });

      dispatch({
        type: types.authLogout,
      });
    }
  };
};

// ✅ OBTENER ESTADÍSTICAS - VERSIÓN COMPLETA
export const getOfflineUsersStats = () => {
  return async (dispatch) => {
    try {
      const users = await AuthOfflineController.getAllOfflineUsers();
      const stats = {
        totalRecords: users.length,
        uniqueUsers: users.length,
        duplicates: 0,
        usersByRole: {},
        lastSync: users.length > 0 ? users[0].savedAt : null,
      };

      users.forEach((user) => {
        stats.usersByRole[user.rol] = (stats.usersByRole[user.rol] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      return null;
    }
  };
};
