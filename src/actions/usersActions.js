// actions/usersActions.js
import { types } from "../types/types";
import Swal from "sweetalert2";
import { fetchAPIConfig } from "../helpers/fetchAPIConfig";

// ✅ CARGAR USUARIOS
export const loadUsers = () => {
  return async (dispatch) => {
    dispatch({ type: types.usersStartLoading });

    try {
      console.log("📥 Cargando usuarios desde API...");
      const body = await fetchAPIConfig("users");

      if (body.ok) {
        console.log(`✅ ${body.usuarios?.length || 0} usuarios cargados`);
        dispatch({
          type: types.usersLoad,
          payload: body.usuarios || [],
        });
      } else {
        console.error("❌ Error en respuesta:", body.msg);
        throw new Error(body.msg || "Error cargando usuarios");
      }
    } catch (error) {
      console.error("❌ Error cargando usuarios:", error);

      // ✅ MOSTRAR ALERTA SOLO SI NO ES 404 (PARA EVITAR SPAM)
      if (!error.message.includes("404")) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los usuarios",
          confirmButtonText: "Entendido",
        });
      }

      dispatch({
        type: types.usersLoad,
        payload: [], // Enviar array vacío para evitar errores en la UI
      });
    } finally {
      dispatch({ type: types.usersFinishLoading });
    }
  };
};

// ✅ CREAR USUARIO
export const createUser = (userData) => {
  return async (dispatch) => {
    try {
      Swal.fire({
        title: "Creando usuario...",
        text: "Por favor espera",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const body = await fetchAPIConfig("users", userData, "POST");

      Swal.close();

      if (body.ok) {
        dispatch({
          type: types.userAddNew,
          payload: body.usuario,
        });

        Swal.fire({
          icon: "success",
          title: "¡Usuario creado!",
          text: "Usuario registrado correctamente",
        });

        return { success: true, data: body };
      } else {
        Swal.fire("Error", body.msg, "error");
        return { success: false, error: body.msg };
      }
    } catch (error) {
      console.error("Error creando usuario:", error);
      Swal.close();
      Swal.fire("Error", "Error de conexión al crear usuario", "error");
      return { success: false, error: error.message };
    }
  };
};

// ✅ ACTUALIZAR USUARIO
export const updateUser = (id, userData) => {
  return async (dispatch) => {
    try {
      Swal.fire({
        title: "Actualizando usuario...",
        text: "Por favor espera",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const body = await fetchAPIConfig(`users/${id}`, userData, "PUT");

      Swal.close();

      if (body.ok) {
        dispatch({
          type: types.userUpdated,
          payload: body.usuario,
        });

        Swal.fire({
          icon: "success",
          title: "¡Usuario actualizado!",
          text: "Usuario modificado correctamente",
        });

        return { success: true, data: body };
      } else {
        Swal.fire("Error", body.msg, "error");
        return { success: false, error: body.msg };
      }
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      Swal.close();
      Swal.fire("Error", "Error de conexión al actualizar usuario", "error");
      return { success: false, error: error.message };
    }
  };
};

// ✅ ELIMINAR USUARIO
export const deleteUser = (id) => {
  return async (dispatch) => {
    try {
      const result = await Swal.fire({
        title: "¿Estás seguro?",
        text: "¡No podrás revertir esta acción!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      });

      if (!result.isConfirmed) {
        return { success: false, cancelled: true };
      }

      Swal.fire({
        title: "Eliminando usuario...",
        text: "Por favor espera",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const body = await fetchAPIConfig(`users/${id}`, {}, "DELETE");

      Swal.close();

      if (body.ok) {
        dispatch({
          type: types.userDeleted,
          payload: id,
        });

        Swal.fire({
          icon: "success",
          title: "¡Eliminado!",
          text: "Usuario eliminado correctamente",
          timer: 2000,
          showConfirmButton: false,
        });

        return { success: true, data: body };
      } else {
        Swal.fire("Error", body.msg, "error");
        return { success: false, error: body.msg };
      }
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      Swal.close();
      Swal.fire("Error", "Error de conexión al eliminar usuario", "error");
      return { success: false, error: error.message };
    }
  };
};
