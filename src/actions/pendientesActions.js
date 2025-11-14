import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import PendientesOfflineController from "../controllers/offline/PendientesOfflineController/PendientesOfflineController";

// ✅ CREAR PENDIENTE

// ✅ CREAR PENDIENTE (ACTUALIZADO)
export const createPendiente = (pendienteData) => {
  return async (dispatch, getState) => {
    try {
      console.log("🔄 [PENDIENTES] Creando pendiente...", pendienteData);

      const state = getState();
      const { user } = state.auth;
      const { sesionAbierta } = state.sesionesCaja;

      if (!sesionAbierta) {
        throw new Error("No hay una sesión de caja abierta");
      }

      // Preparar datos completos
      const datosCompletos = {
        ...pendienteData,
        vendedor_id: user.id,
        vendedor_nombre: user.nombre,
        sesion_caja_id: sesionAbierta.id,
        sesion_caja_id_local: sesionAbierta.id_local,
        monto: parseFloat(pendienteData.monto),
      };

      let resultado;

      if (navigator.onLine) {
        // MODO ONLINE
        const response = await fetchConToken(
          "pendientes",
          datosCompletos,
          "POST"
        );

        if (response && response.ok === true) {
          resultado = response.pendiente;

          // Guardar también en local para consistencia
          await PendientesOfflineController.createPendiente({
            ...datosCompletos,
            id: resultado.id,
            sincronizado: true,
          });
        } else {
          throw new Error(response?.error || "Error del servidor");
        }
      } else {
        // MODO OFFLINE
        resultado = await PendientesOfflineController.createPendiente(
          datosCompletos
        );

        if (!resultado.success) {
          throw new Error(resultado.error);
        }
      }

      const pendienteCreado = resultado.pendiente || resultado;

      // ✅ DISPATCH CORRECTO PARA ACTUALIZAR REDUX
      dispatch({
        type: types.pendienteAdd,
        payload: pendienteCreado,
      });

      // ✅ ACTUALIZAR LOS TOTALES INMEDIATAMENTE
      const nuevosPendientes =
        await PendientesOfflineController.getPendientesBySesion(
          sesionAbierta.id || sesionAbierta.id_local
        );
      dispatch({
        type: types.pendientesLoad,
        payload: nuevosPendientes,
      });

      await Swal.fire({
        icon: "success",
        title: "Pendiente Registrado",
        text: `Pendiente de ${pendienteData.tipo} registrado correctamente`,
        timer: 2000,
        showConfirmButton: false,
      });

      return { success: true, pendiente: pendienteCreado };
    } catch (error) {
      console.error("❌ Error creando pendiente:", error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al registrar el pendiente",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

// ✅ OBTENER PENDIENTES POR SESIÓN
// ✅ OBTENER PENDIENTES POR SESIÓN (ACTUALIZADO)
export const getPendientesBySesion = (sesionId) => {
  return async (dispatch) => {
    try {
      console.log(
        `🔄 [PENDIENTES] Obteniendo pendientes para sesión: ${sesionId}`
      );

      const pendientes =
        await PendientesOfflineController.getPendientesBySesion(sesionId);

      // ✅ DISPATCH CORRECTO PARA ACTUALIZAR REDUX
      dispatch({
        type: types.pendientesLoad,
        payload: pendientes,
      });

      console.log(
        `✅ [PENDIENTES] ${pendientes.length} pendientes cargados en Redux`
      );
      return pendientes;
    } catch (error) {
      console.error("❌ Error obteniendo pendientes:", error);
      dispatch({
        type: types.pendientesLoad,
        payload: [],
      });
      return [];
    }
  };
};

// ✅ CALCULAR TOTALES DE PENDIENTES
export const calculatePendientesTotals = (sesionId) => {
  return async () => {
    try {
      return await PendientesOfflineController.calculatePendientesTotals(
        sesionId
      );
    } catch (error) {
      console.error("❌ Error calculando totales de pendientes:", error);
      return {
        total_retiros: 0,
        total_ingresos: 0,
        total_pendientes: 0,
        cantidad_retiros: 0,
        cantidad_ingresos: 0,
        cantidad_pendientes: 0,
      };
    }
  };
};

// ✅ SINCRONIZAR PENDIENTES
export const syncPendientes = () => {
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
        title: "Sincronizando Pendientes",
        text: "Sincronizando pendientes con el servidor...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const resultado =
        await PendientesOfflineController.syncPendingPendientes();

      Swal.close();

      if (resultado.success) {
        await Swal.fire({
          icon: "success",
          title: "Pendientes Sincronizados",
          text: `${resultado.exitosos} pendientes sincronizados correctamente`,
          timer: 2000,
          showConfirmButton: false,
        });

        return true;
      } else {
        throw new Error(resultado.error || "Error en sincronización");
      }
    } catch (error) {
      console.error("❌ Error sincronizando pendientes:", error);

      Swal.close();
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudieron sincronizar los pendientes",
        confirmButtonText: "Entendido",
      });

      return false;
    }
  };
};
