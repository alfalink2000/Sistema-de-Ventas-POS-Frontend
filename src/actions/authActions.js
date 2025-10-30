// actions/authActions.js - VERSIÓN COMPLETAMENTE CORREGIDA
import { types } from "../types/types";
import Swal from "sweetalert2";
import { fetchSinToken } from "../helpers/fetch";
import { loadProducts } from "./productsActions";
import { loadCategories } from "./categoriesActions";
import UserOfflineService from "../services/UserOfflineService";
import SyncService from "../services/SyncService";

export const startLoading = () => ({
  type: types.authStartLoading,
});

export const finishLoading = () => ({
  type: types.authFinishLoading,
});

export const checkingFinish = () => ({
  type: types.authCheckingFinish,
});

// ✅ ACTION MEJORADO PARA LOGIN CON LIMPIEZA DE DUPLICADOS
export const startLogin = (username, password) => {
  return async (dispatch) => {
    dispatch(startLoading());

    try {
      console.log("🔐 INICIANDO LOGIN para:", username);
      console.log("🌐 Estado de conexión:", navigator.onLine);

      // ✅ LIMPIAR DUPLICADOS ANTES DEL LOGIN (PREVENTIVO)
      try {
        console.log("🧹 Verificando duplicados antes del login...");
        const stats = await UserOfflineService.getOfflineUsersStats();
        if (stats && stats.duplicates > 0) {
          console.log(
            `⚠️ Encontrados ${stats.duplicates} duplicados, limpiando...`
          );
          await UserOfflineService.cleanupDuplicateUsers();
        }
      } catch (cleanupError) {
        console.warn("⚠️ Error en limpieza preventiva:", cleanupError);
        // No bloquear el login por error de limpieza
      }

      // 1. PRIMERO INTENTAR CON SERVIDOR SI HAY CONEXIÓN
      if (navigator.onLine) {
        try {
          console.log("🔄 Intentando login ONLINE...");
          const response = await fetchSinToken(
            "auth/login",
            { username, password },
            "POST"
          );

          console.log("📥 Respuesta del servidor:", response);

          if (response.ok) {
            const { token, usuario } = response;

            // ✅ GUARDAR PARA USO OFFLINE (con cleanup automático)
            await UserOfflineService.saveUserForOffline(usuario, token);

            // ✅ LIMPIAR DUPLICADOS DESPUÉS DE GUARDAR
            await UserOfflineService.cleanupDuplicateUsers();

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(usuario));

            console.log("✅ Login online exitoso, sincronizando datos...");

            // Sincronizar datos maestros
            await SyncService.syncMasterData();

            // Cargar datos en Redux
            await dispatch(loadProducts());
            await dispatch(loadCategories());

            await Swal.fire({
              icon: "success",
              title: "¡Bienvenido!",
              text: `Hola ${usuario.nombre}`,
              timer: 2000,
              showConfirmButton: false,
            });

            dispatch({
              type: types.authLogin,
              payload: usuario,
            });

            return; // Éxito - salir
          } else {
            // ✅ MANEJAR ERROR DEL SERVIDOR
            console.error("❌ Error del servidor:", response);
            throw new Error(response.msg || "Credenciales incorrectas");
          }
        } catch (onlineError) {
          console.error("💥 Error en login online:", onlineError);

          // ✅ VERIFICAR SI ES ERROR DE RED O DEL SERVIDOR
          if (
            onlineError.message.includes("Failed to fetch") ||
            onlineError.message.includes("Network")
          ) {
            console.log("🌐 Error de red - continuando con modo offline");
            // Continuar con intento offline
          } else {
            // Es un error de credenciales u otro - relanzar el error
            throw onlineError;
          }
        }
      }

      // 2. MODO OFFLINE (si no hay conexión o falló por red)
      console.log("📴 Intentando login OFFLINE...");
      const offlineResult = await UserOfflineService.verifyOfflineCredentials(
        username,
        password
      );

      if (offlineResult.success) {
        const { user, token } = offlineResult;

        // ✅ ACTUALIZAR ÚLTIMO LOGIN EN OFFLINE
        await UserOfflineService.updateLastLogin(username);

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        // Cargar datos desde cache offline
        const offlineData = await SyncService.loadMasterDataFromCache();

        if (offlineData.productos && offlineData.productos.length > 0) {
          dispatch({
            type: types.productsLoad,
            payload: offlineData.productos,
          });
        }

        if (offlineData.categorias && offlineData.categorias.length > 0) {
          dispatch({
            type: types.categoriesLoad,
            payload: offlineData.categorias,
          });
        }

        dispatch({
          type: types.authLogin,
          payload: user,
        });

        await Swal.fire({
          icon: "warning",
          title: "Modo Offline",
          text: `Hola ${user.nombre}. Trabajando sin conexión.`,
          timer: 3000,
          showConfirmButton: false,
        });

        // ✅ DEBUG: Verificar estado después del login offline
        const stats = await UserOfflineService.getOfflineUsersStats();
        console.log("📊 Estado después de login offline:", stats);
      } else {
        throw new Error(offlineResult.error || "Credenciales incorrectas");
      }
    } catch (error) {
      console.error("❌ Error final en login:", error);

      // ✅ MENSAJES DE ERROR MÁS ESPECÍFICOS
      let errorMessage = error.message;
      let errorTitle = "Error de acceso";

      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("Network")
      ) {
        errorTitle = "Error de conexión";
        errorMessage =
          "No se pudo conectar al servidor. Verifica tu conexión a internet.";
      } else if (error.message.includes("offline")) {
        errorTitle = "Modo Offline";
        errorMessage =
          "Usuario no disponible sin conexión. Conecta a internet para primer acceso.";
      }

      await Swal.fire({
        icon: "error",
        title: errorTitle,
        text: errorMessage,
        confirmButtonText: "Entendido",
      });

      dispatch({
        type: types.authError,
        payload: error.message,
      });
    } finally {
      dispatch(finishLoading());
    }
  };
};

// ✅ ACTION MEJORADO PARA SINCRONIZAR USUARIOS CON LIMPIEZA
export const syncOfflineUsers = () => {
  return async (dispatch) => {
    try {
      Swal.fire({
        title: "Sincronizando...",
        text: "Actualizando datos de usuarios offline",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const result = await UserOfflineService.syncUsersFromServer();

      Swal.close();

      if (result.success) {
        // ✅ LIMPIAR DUPLICADOS DESPUÉS DE SINCRONIZAR
        await UserOfflineService.cleanupDuplicateUsers();

        // Obtener estadísticas actualizadas
        const stats = await UserOfflineService.getOfflineUsersStats();

        dispatch({
          type: types.authSyncComplete,
          payload: {
            usersSynced: result.count,
            stats: stats,
          },
        });

        await Swal.fire({
          icon: "success",
          title: "Sincronización completada",
          text: `✅ ${result.count} usuarios sincronizados\n📊 ${stats.uniqueUsers} usuarios únicos disponibles offline`,
          timer: 3000,
          showConfirmButton: false,
        });

        return { success: true, count: result.count, stats };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error sincronizando usuarios:", error);

      Swal.close();

      await Swal.fire({
        icon: "error",
        title: "Error de sincronización",
        text: error.message || "No se pudieron sincronizar los usuarios",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

// ✅ NUEVO ACTION PARA LIMPIAR DUPLICADOS MANUALMENTE
export const cleanupUserDuplicates = () => {
  return async (dispatch) => {
    try {
      Swal.fire({
        title: "Limpiando duplicados...",
        text: "Optimizando almacenamiento de usuarios",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const statsBefore = await UserOfflineService.getOfflineUsersStats();
      const cleanedUsers = await UserOfflineService.cleanupDuplicateUsers();
      const statsAfter = await UserOfflineService.getOfflineUsersStats();

      Swal.close();

      const duplicatesRemoved = statsBefore ? statsBefore.duplicates : 0;

      dispatch({
        type: types.authCleanupComplete,
        payload: {
          duplicatesRemoved,
          stats: statsAfter,
        },
      });

      if (duplicatesRemoved > 0) {
        await Swal.fire({
          icon: "success",
          title: "Limpieza completada",
          text: `🧹 Se eliminaron ${duplicatesRemoved} usuarios duplicados\n📊 Ahora hay ${statsAfter.uniqueUsers} usuarios únicos`,
          timer: 3000,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          icon: "info",
          title: "Sin duplicados",
          text: "No se encontraron usuarios duplicados para limpiar",
          timer: 2000,
          showConfirmButton: false,
        });
      }

      return {
        success: true,
        duplicatesRemoved,
        uniqueUsers: statsAfter.uniqueUsers,
      };
    } catch (error) {
      console.error("Error limpiando duplicados:", error);

      Swal.close();

      await Swal.fire({
        icon: "error",
        title: "Error en limpieza",
        text: "No se pudieron limpiar los duplicados",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

// ✅ NUEVO ACTION PARA OBTENER ESTADÍSTICAS DE USUARIOS
export const getOfflineUsersStats = () => {
  return async (dispatch) => {
    try {
      const stats = await UserOfflineService.getOfflineUsersStats();

      dispatch({
        type: types.authStatsLoaded,
        payload: stats,
      });

      return stats;
    } catch (error) {
      console.error("Error obteniendo estadísticas:", error);
      return null;
    }
  };
};

// ✅ ACTION PARA LOGOUT CON SWEETALERT
export const startLogout = () => {
  return async (dispatch) => {
    // Mostrar confirmación
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

// ✅ ACTION PARA VERIFICAR AUTENTICACIÓN
export const startChecking = () => {
  return async (dispatch) => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      const userData = JSON.parse(user);

      // Verificar si el token sigue siendo válido
      try {
        const tokenExpiration = JSON.parse(atob(token.split(".")[1])).exp;
        const isTokenValid = tokenExpiration * 1000 > Date.now();

        if (isTokenValid) {
          // ✅ VERIFICAR DUPLICADOS AL INICIAR LA APP
          try {
            const stats = await UserOfflineService.getOfflineUsersStats();
            if (stats && stats.duplicates > 5) {
              // Solo limpiar si hay muchos duplicados
              console.warn(
                `⚠️ Muchos duplicados al iniciar: ${stats.duplicates}`
              );
              await UserOfflineService.cleanupDuplicateUsers();
            }
          } catch (cleanupError) {
            console.warn(
              "⚠️ Error limpiando duplicados al iniciar:",
              cleanupError
            );
          }

          dispatch({
            type: types.authLogin,
            payload: userData,
          });
        } else {
          // Token expirado
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          dispatch(checkingFinish());
        }
      } catch (tokenError) {
        console.error("Error verificando token:", tokenError);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        dispatch(checkingFinish());
      }
    } else {
      dispatch(checkingFinish());
    }
  };
};

// ✅ ACTION PARA MANEJO DE ERRORES
export const clearError = () => ({
  type: types.authClearError,
});

// ✅ NUEVO ACTION PARA DEBUGGING
export const debugOfflineUsers = () => {
  return async () => {
    try {
      console.group("🔍 DEBUG - Usuarios Offline");
      const allUsers = await UserOfflineService.debugListAllUsers();
      const stats = await UserOfflineService.getOfflineUsersStats();
      console.log("📊 Estadísticas:", stats);
      console.groupEnd();

      return { allUsers, stats };
    } catch (error) {
      console.error("Error en debugging:", error);
      return null;
    }
  };
};
