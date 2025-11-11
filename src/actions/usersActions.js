// actions/usersActions.js - VERSIÓN CORREGIDA
import { types } from "../types/types";
import Swal from "sweetalert2";
import { fetchConToken } from "../helpers/fetch";
import IndexedDBService from "../services/IndexedDBService";

// ✅ CARGA DE USUARIOS CON MANEJO MEJORADO DE ERRORES
export const loadUsers = () => {
  return async (dispatch) => {
    try {
      console.log("👥 [USERS] Iniciando carga de usuarios...");

      dispatch({ type: types.usersStartLoading });

      let usuarios = [];
      let errorDeServidor = null;

      // 1. INTENTAR DESDE BACKEND (ONLINE)
      if (navigator.onLine) {
        console.log("🌐 [USERS] Cargando desde servidor...");
        try {
          const resp = await fetchConToken("users");

          if (resp.ok && resp.usuarios) {
            usuarios = resp.usuarios;
            console.log(
              `✅ [USERS] ${usuarios.length} usuarios cargados desde servidor`
            );

            // ✅ GUARDAR DIRECTAMENTE EN INDEXEDDB
            console.log("💾 [USERS] Guardando usuarios en IndexedDB...");
            await IndexedDBService.clear("users");
            for (const usuario of usuarios) {
              await IndexedDBService.add("users", usuario);
            }
            console.log("✅ [USERS] Usuarios guardados en IndexedDB");
          }
        } catch (error) {
          // ✅ PROPAGAR ERROR DE AUTENTICACIÓN (401)
          if (
            error.message.includes("401") ||
            error.message.includes("Token no válido")
          ) {
            throw error; // Dejar que se maneje en el catch principal
          }

          // ✅ PARA OTROS ERRORES, GUARDAR EL ERROR PERO CONTINUAR
          errorDeServidor = error;
          console.warn(
            "⚠️ [USERS] Error de servidor, continuando con datos locales:",
            error.message
          );
        }
      }

      // 2. SI NO HAY DATOS ONLINE, CARGAR DESDE INDEXEDDB
      if (usuarios.length === 0) {
        console.log("📱 [USERS] Cargando desde IndexedDB...");
        usuarios = await IndexedDBService.getAll("users");
        console.log(
          `✅ [USERS] ${usuarios.length} usuarios cargados desde IndexedDB`
        );

        // ✅ MOSTRAR ADVERTENCIA SI ESTAMOS OFFLINE O HUBO ERROR
        if (!navigator.onLine || errorDeServidor) {
          await Swal.fire({
            icon: "info",
            title: !navigator.onLine
              ? "Modo sin conexión"
              : "Error de servidor",
            text: `Mostrando ${usuarios.length} usuarios almacenados localmente`,
            timer: 3000,
            showConfirmButton: false,
          });
        }
      }

      // ✅ DISPATCH CRÍTICO - ACTUALIZAR REDUX
      dispatch({
        type: types.usersLoad,
        payload: usuarios,
      });

      // ✅ FINALIZAR LOADING
      dispatch({ type: types.usersFinishLoading });

      console.log(
        `🎯 [USERS] Redux actualizado con ${usuarios.length} usuarios`
      );

      return {
        success: true,
        count: usuarios.length,
        source: navigator.onLine ? "server" : "indexeddb",
        hadServerError: !!errorDeServidor,
      };
    } catch (error) {
      console.error("❌ [USERS] Error cargando usuarios:", error);
      dispatch({ type: types.usersFinishLoading });

      // ✅ NO MOSTRAR SWAL SI ES ERROR 401 - YA SE MANEJÓ EN fetchConToken
      const isAuthError =
        error.message.includes("401") ||
        error.message.includes("Token no válido");

      if (!isAuthError) {
        await Swal.fire({
          icon: "error",
          title: "Error al cargar usuarios",
          text: "No se pudieron cargar los usuarios: " + error.message,
          confirmButtonText: "Entendido",
        });
      }

      return {
        success: false,
        error: error.message,
        isAuthError: isAuthError,
      };
    }
  };
};

// ✅ CREAR USUARIO - VERSIÓN MEJORADA
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

      const response = await fetchConToken("users", userData, "POST");

      Swal.close();

      if (response && response.ok === true) {
        const nuevoUsuario = response.usuario;

        // ✅ GUARDAR EN INDEXEDDB
        await IndexedDBService.add("users", nuevoUsuario);

        dispatch({
          type: types.userAddNew,
          payload: nuevoUsuario,
        });

        await Swal.fire({
          icon: "success",
          title: "¡Usuario creado!",
          text: "Usuario registrado correctamente",
          timer: 2000,
          showConfirmButton: false,
        });

        return { success: true, data: response };
      } else {
        throw new Error(response?.msg || "Error al crear usuario");
      }
    } catch (error) {
      console.error("❌ Error creando usuario:", error);

      // ✅ CERRAR LOADING SI ESTÁ ABIERTO
      Swal.close();

      // ✅ NO MOSTRAR SWAL SI ES ERROR DE AUTENTICACIÓN (ya se manejó en fetchConToken)
      const isAuthError =
        error.message.includes("401") ||
        error.message.includes("Token no válido");

      if (!isAuthError) {
        await Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "Error de conexión al crear usuario",
          confirmButtonText: "Entendido",
        });
      }

      return {
        success: false,
        error: error.message,
        isAuthError: isAuthError,
      };
    }
  };
};

// ✅ ACTUALIZAR USUARIO - VERSIÓN MEJORADA
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

      const response = await fetchConToken(`users/${id}`, userData, "PUT");

      Swal.close();

      if (response && response.ok === true) {
        const usuarioActualizado = response.usuario;

        // ✅ ACTUALIZAR EN INDEXEDDB
        await IndexedDBService.put("users", usuarioActualizado);

        dispatch({
          type: types.userUpdated,
          payload: usuarioActualizado,
        });

        await Swal.fire({
          icon: "success",
          title: "¡Usuario actualizado!",
          text: "Usuario modificado correctamente",
          timer: 2000,
          showConfirmButton: false,
        });

        return { success: true, data: response };
      } else {
        throw new Error(response?.msg || "Error al actualizar usuario");
      }
    } catch (error) {
      console.error("❌ Error actualizando usuario:", error);

      Swal.close();

      // ✅ NO MOSTRAR SWAL SI ES ERROR DE AUTENTICACIÓN
      const isAuthError =
        error.message.includes("401") ||
        error.message.includes("Token no válido");

      if (!isAuthError) {
        await Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "Error de conexión al actualizar usuario",
          confirmButtonText: "Entendido",
        });
      }

      return {
        success: false,
        error: error.message,
        isAuthError: isAuthError,
      };
    }
  };
};

// ✅ ELIMINAR USUARIO - VERSIÓN MEJORADA
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

      const response = await fetchConToken(`users/${id}`, {}, "DELETE");

      Swal.close();

      if (response && response.ok === true) {
        // ✅ ELIMINAR DE INDEXEDDB
        await IndexedDBService.delete("users", id);

        dispatch({
          type: types.userDeleted,
          payload: id,
        });

        await Swal.fire({
          icon: "success",
          title: "¡Eliminado!",
          text: "Usuario eliminado correctamente",
          timer: 2000,
          showConfirmButton: false,
        });

        return { success: true, data: response };
      } else {
        throw new Error(response?.msg || "Error al eliminar usuario");
      }
    } catch (error) {
      console.error("❌ Error eliminando usuario:", error);

      Swal.close();

      // ✅ NO MOSTRAR SWAL SI ES ERROR DE AUTENTICACIÓN
      const isAuthError =
        error.message.includes("401") ||
        error.message.includes("Token no válido");

      if (!isAuthError) {
        await Swal.fire({
          icon: "error",
          title: "Error",
          text: error.message || "Error de conexión al eliminar usuario",
          confirmButtonText: "Entendido",
        });
      }

      return {
        success: false,
        error: error.message,
        isAuthError: isAuthError,
      };
    }
  };
};

// ✅ OBTENER USUARIO POR ID
export const getUserById = (userId) => {
  return async (dispatch) => {
    try {
      let usuario = null;

      if (navigator.onLine) {
        // Online: buscar en servidor
        try {
          const response = await fetchConToken(`users/${userId}`);
          if (response && response.ok === true) {
            usuario = response.usuario;
          }
        } catch (error) {
          // Si es error de auth, propagar
          if (
            error.message.includes("401") ||
            error.message.includes("Token no válido")
          ) {
            throw error;
          }
          // Para otros errores, continuar con IndexedDB
          console.warn(
            "Error obteniendo usuario desde servidor:",
            error.message
          );
        }
      }

      // Si no se pudo obtener del servidor, buscar en IndexedDB
      if (!usuario) {
        usuario = await IndexedDBService.get("users", userId);
      }

      if (usuario) {
        dispatch({
          type: types.userSetActive,
          payload: usuario,
        });
      }

      return usuario;
    } catch (error) {
      console.error(`❌ Error obteniendo usuario ${userId}:`, error);
      throw error;
    }
  };
};

// ✅ SINCRONIZAR USUARIOS MANUALMENTE
export const syncUsers = () => {
  return async (dispatch) => {
    try {
      if (!navigator.onLine) {
        await Swal.fire({
          icon: "warning",
          title: "Sin conexión",
          text: "No hay conexión a internet para sincronizar",
          confirmButtonText: "Entendido",
        });
        return false;
      }

      await Swal.fire({
        title: "Sincronizando...",
        text: "Actualizando lista de usuarios",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Recargar usuarios desde servidor
      const result = await dispatch(loadUsers());

      Swal.close();

      if (result.success) {
        await Swal.fire({
          icon: "success",
          title: "Sincronización completada",
          text: "Usuarios actualizados correctamente",
          timer: 2000,
          showConfirmButton: false,
        });
        return true;
      } else {
        throw new Error(result.error || "Error en sincronización");
      }
    } catch (error) {
      console.error("❌ Error sincronizando usuarios:", error);

      Swal.close();

      // ✅ NO MOSTRAR SWAL SI ES ERROR DE AUTENTICACIÓN
      const isAuthError =
        error.message.includes("401") ||
        error.message.includes("Token no válido");

      if (!isAuthError) {
        await Swal.fire({
          icon: "error",
          title: "Error de sincronización",
          text: "No se pudieron actualizar los usuarios",
          confirmButtonText: "Entendido",
        });
      }

      return false;
    }
  };
};
