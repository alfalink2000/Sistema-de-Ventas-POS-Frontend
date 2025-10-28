// actions/authActions.js
import { types } from "../types/types";
import Swal from "sweetalert2";
import { fetchSinToken } from "../helpers/fetch";
import { loadProducts } from "./productsActions";
import AuthOfflineService from "../services/AuthOfflineService";
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
      const response = await fetchSinToken(
        "auth/login",
        { username, password },
        "POST"
      );

      if (response.ok) {
        const { token, usuario } = response;

        // ✅ GUARDAR PARA USO OFFLINE (NUEVO)
        await AuthOfflineService.saveUserForOffline(usuario, token);

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(usuario));

        console.log("✅ Login exitoso, cargando productos...");
        await dispatch(loadProducts());

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
      } else {
        throw new Error(response.error || "Error en el login");
      }
    } catch (error) {
      console.error("❌ Error en login:", error);

      // ✅ NUEVO: INTENTAR LOGIN OFFLINE SI HAY ERROR DE RED
      if (
        error.message.includes("Network") ||
        error.message.includes("Failed to fetch")
      ) {
        console.log("🌐 Error de red - Verificando sesión offline...");

        const offlineUser = await AuthOfflineService.getOfflineUser();
        if (offlineUser) {
          console.log("✅ Sesión offline válida - Iniciando sin conexión...");

          // Cargar productos desde cache offline
          const offlineData = await SyncService.loadMasterDataFromCache();
          if (offlineData.productos.length > 0) {
            dispatch(loadProducts(offlineData.productos));
          }

          dispatch({
            type: types.authLogin,
            payload: offlineUser.user,
          });

          await Swal.fire({
            icon: "warning",
            title: "Modo Offline",
            text: `Hola ${offlineUser.user.nombre}. Trabajando sin conexión.`,
            timer: 3000,
            showConfirmButton: false,
          });

          return; // ¡IMPORTANTE! Salir sin error
        }
      }

      // Si llegamos aquí, es un error real (no solo falta de conexión)
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
