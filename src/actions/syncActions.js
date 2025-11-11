// actions/syncActions.js
import SyncController from "../controllers/offline/SyncController/SyncController";
import Swal from "sweetalert2";

export const startAutoSync = () => {
  return async (dispatch) => {
    try {
      const result = await SyncController.autoSync();

      if (result.success) {
        dispatch({
          type: "SYNC_COMPLETE",
          payload: result,
        });
      } else {
        dispatch({
          type: "SYNC_ERROR",
          payload: result.error,
        });
      }

      return result;
    } catch (error) {
      dispatch({
        type: "SYNC_ERROR",
        payload: error.message,
      });
      return { success: false, error: error.message };
    }
  };
};

export const syncByType = (type, options = {}) => {
  return async (dispatch) => {
    try {
      dispatch({ type: "SYNC_START", payload: { type } });

      const result = await SyncController.syncByType(type, options);

      if (result.success) {
        dispatch({
          type: "SYNC_TYPE_COMPLETE",
          payload: { type, result },
        });

        await Swal.fire({
          icon: "success",
          title: "Sincronización completada",
          text: `Se sincronizaron ${
            result.count || result.exitosos || 0
          } ${type}`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      dispatch({
        type: "SYNC_ERROR",
        payload: error.message,
      });

      await Swal.fire({
        icon: "error",
        title: "Error de sincronización",
        text: error.message,
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

export const getSyncStatus = () => {
  return async (dispatch) => {
    try {
      const status = await SyncController.getSyncStatus();

      dispatch({
        type: "SYNC_STATUS_LOADED",
        payload: status,
      });

      return status;
    } catch (error) {
      console.error("Error obteniendo estado de sincronización:", error);
      return null;
    }
  };
};
