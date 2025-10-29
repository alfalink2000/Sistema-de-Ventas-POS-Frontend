// actions/authActions.js
import { types } from "../types/types";
import Swal from "sweetalert2";
import { fetchSinToken } from "../helpers/fetch";
import { loadProducts } from "./productsActions";
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

// ✅ ACTION PARA LOGIN CON BACKEND REAL
export const startLogin = (username, password) => {
  return async (dispatch) => {
    dispatch(startLoading());

    try {
      console.log("🔐 Intentando login...");

      // Primero intentar con el servidor
      if (navigator.onLine) {
        try {
          const response = await fetchSinToken(
            "auth/login",
            { username, password },
            "POST"
          );

          if (response.ok) {
            const { token, usuario } = response;

            // ✅ GUARDAR PARA USO OFFLINE
            await UserOfflineService.saveUserForOffline(usuario, token);

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
          }
        } catch (onlineError) {
          console.log("❌ Error en login online:", onlineError);
          // Continuar con intento offline
        }
      }

      // ✅ INTENTAR LOGIN OFFLINE
      console.log("🌐 Intentando login offline...");
      const offlineResult = await UserOfflineService.verifyOfflineCredentials(
        username,
        password
      );

      if (offlineResult.success) {
        const { user, token } = offlineResult;

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
      } else {
        throw new Error(offlineResult.error || "Credenciales incorrectas");
      }
    } catch (error) {
      console.error("❌ Error en login:", error);

      await Swal.fire({
        icon: "error",
        title: "Error de acceso",
        text: error.message || "Credenciales incorrectas",
        confirmButtonText: "Intentar nuevamente",
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
// ✅ NUEVO ACTION PARA SINCRONIZAR USUARIOS
export const syncOfflineUsers = () => {
  return async (dispatch) => {
    try {
      const result = await UserOfflineService.syncUsersFromServer();

      if (result.success) {
        dispatch({
          type: types.authSyncComplete,
          payload: { usersSynced: result.count },
        });

        return { success: true, count: result.count };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error sincronizando usuarios:", error);
      return { success: false, error: error.message };
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
  return (dispatch) => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      const userData = JSON.parse(user);

      // Verificar si el token sigue siendo válido
      const tokenExpiration = JSON.parse(atob(token.split(".")[1])).exp;
      const isTokenValid = tokenExpiration * 1000 > Date.now();

      if (isTokenValid) {
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
    } else {
      dispatch(checkingFinish());
    }
  };
};

// ✅ ACTION PARA MANEJO DE ERRORES
export const clearError = () => ({
  type: types.authClearError,
});
