// actions/statsActions.js
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";

export const loadDashboardStats = () => {
  return async (dispatch) => {
    try {
      const response = await fetchConToken("estadisticas/dashboard");

      if (response.ok && response.estadisticas) {
        dispatch({
          type: types.statsLoadDashboard,
          payload: response.estadisticas,
        });
      }

      return response.estadisticas || {};
    } catch (error) {
      console.error("❌ Error cargando estadísticas:", error);
      return {};
    }
  };
};
