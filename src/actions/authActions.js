// actions/authActions.js - VERSIÓN CORREGIDA Y COMPLETA
import { types } from "../types/types";
import Swal from "sweetalert2";
import { fetchSinToken } from "../helpers/fetch";
import { loadProducts } from "./productsActions";
import { loadCategories } from "./categoriesActions";
import AuthOfflineController from "../controllers/offline/AuthOfflineController/AuthOfflineController";
import SyncController from "../controllers/offline/SyncController/SyncController";
import ProductsOfflineController from "../controllers/offline/ProductsOfflineController/ProductsOfflineController";

export const startLoading = () => ({
  type: types.authStartLoading,
});

export const finishLoading = () => ({
  type: types.authFinishLoading,
});

export const checkingFinish = () => ({
  type: types.authCheckingFinish,
});

// ✅ CORREGIDO: LOGIN CON NUEVOS CONTROLLERS
export const startLogin = (username, password) => {
  return async (dispatch) => {
    // ✅ USAR LOS TYPES CORRECTOS
    dispatch({ type: types.authStartLoading });

    try {
      console.log("🔐 INICIANDO LOGIN para:", username);

      let loginResult;

      // 1. INTENTAR ONLINE PRIMERO
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

            // Guardar en localStorage
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(usuario));

            console.log("✅ Login online exitoso");

            // ✅ DISPATCH CORRECTO
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

            // ✅ SINCRONIZACIÓN NO BLOQUEANTE
            setTimeout(async () => {
              try {
                if (navigator.onLine) {
                  await SyncController.syncMasterData();
                }
              } catch (syncError) {
                console.error("❌ Error sincronizando:", syncError);
              }
            }, 1000);

            await Swal.fire({
              icon: "success",
              title: "¡Bienvenido!",
              text: `Hola ${usuario.nombre}`,
              timer: 2000,
              showConfirmButton: false,
            });

            return { success: true, user: usuario };
          } else {
            throw new Error(response.error || "Credenciales incorrectas");
          }
        } catch (onlineError) {
          console.error("💥 Error en login online:", onlineError);
          // Si es error de red, continuar con offline
          if (onlineError.message.includes("Failed to fetch")) {
            console.log("🌐 Error de red - continuando offline");
          } else {
            throw onlineError;
          }
        }
      }

      // 2. MODO OFFLINE
      console.log("📴 Intentando login OFFLINE...");
      const offlineResult = await AuthOfflineController.verifyCredentials(
        username,
        password
      );

      if (offlineResult.success) {
        const { user, token } = offlineResult;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));

        // ✅ DISPATCH CORRECTO PARA OFFLINE
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

        return { success: true, user: user, isOffline: true };
      } else {
        throw new Error(offlineResult.error || "Credenciales incorrectas");
      }
    } catch (error) {
      console.error("❌ Error final en login:", error);

      await Swal.fire({
        icon: "error",
        title: "Error de acceso",
        text: error.message,
        confirmButtonText: "Entendido",
      });

      dispatch({
        type: types.authError,
        payload: error.message,
      });

      return { success: false, error: error.message };
    } finally {
      // ✅ FINALIZAR LOADING CORRECTAMENTE
      dispatch({ type: types.authFinishLoading });
    }
  };
};

// ✅ NUEVO: ACTION PARA LOGIN OFFLINE DIRECTO
export const offlineLogin = (userData) => ({
  type: types.authLogin,
  payload: userData,
});

// ✅ CORREGIDO: SINCRONIZAR USUARIOS
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

      const result = await AuthOfflineController.syncUsersFromServer();

      Swal.close();

      if (result.success) {
        // Obtener estadísticas actualizadas
        const users = await AuthOfflineController.getAllOfflineUsers();
        const stats = {
          totalRecords: users.length,
          uniqueUsers: users.length,
          duplicates: 0,
          usersByRole: {},
        };

        // Calcular estadísticas
        users.forEach((user) => {
          stats.usersByRole[user.rol] = (stats.usersByRole[user.rol] || 0) + 1;
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

// ✅ NUEVO: OBTENER ESTADÍSTICAS DE USUARIOS
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

// ✅ ACTION PARA LOGOUT
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

// ✅ ACTION PARA VERIFICAR AUTENTICACIÓN
export const startChecking = () => {
  return async (dispatch) => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      try {
        const userData = JSON.parse(user);

        // Verificar token JWT
        try {
          const tokenPayload = JSON.parse(atob(token.split(".")[1]));
          const isTokenValid = tokenPayload.exp * 1000 > Date.now();

          if (isTokenValid) {
            dispatch({
              type: types.authLogin,
              payload: userData,
            });
          } else {
            console.warn("⚠️ Token expirado");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            dispatch(checkingFinish());
          }
        } catch (tokenError) {
          console.error("❌ Error verificando token:", tokenError);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          dispatch(checkingFinish());
        }
      } catch (parseError) {
        console.error("❌ Error parseando usuario:", parseError);
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

// ✅ NUEVO: ACTUALIZAR ESTADO DE CONEXIÓN
export const updateConnectionStatus = (isOnline) => ({
  type: types.connectionStatusUpdate,
  payload: { isOnline },
});
