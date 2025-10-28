// actions/closuresActions.js - VERSIÓN COMPATIBLE CON TUS TYPES
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";

export const loadClosures = (limite = 100, pagina = 1) => {
  return async (dispatch) => {
    dispatch({ type: types.closuresStartLoading });

    try {
      console.log(`🔄 [CLOSURES] Cargando cierres...`);

      const response = await fetchConToken(
        `cierres?limite=${limite}&pagina=${pagina}`
      );

      console.log("📦 [CLOSURES] Respuesta:", {
        ok: response?.ok,
        cantidad: response?.cierres?.length || 0,
      });

      if (response && response.ok === true) {
        const cierres = response.cierres || [];

        // ✅ ENRIQUECER DATOS PARA EL FRONTEND
        const cierresEnriquecidos = cierres.map((cierre) => ({
          ...cierre,
          estado_diferencia:
            cierre.diferencia === 0
              ? "exacto"
              : cierre.diferencia > 0
              ? "sobrante"
              : "faltante",
          diferencia_absoluta: Math.abs(cierre.diferencia || 0),
          eficiencia:
            cierre.total_ventas > 0
              ? ((cierre.ganancia_bruta / cierre.total_ventas) * 100).toFixed(
                  1
                ) + "%"
              : "0%",
        }));

        // ✅ ORDENAR POR FECHA DE CIERRE (MÁS RECIENTE PRIMERO)
        const cierresOrdenados = cierresEnriquecidos.sort((a, b) => {
          return new Date(b.fecha_cierre) - new Date(a.fecha_cierre);
        });

        console.log(
          `✅ [CLOSURES] ${cierresOrdenados.length} cierres cargados y ordenados`
        );

        dispatch({
          type: types.closuresLoad,
          payload: cierresOrdenados,
        });

        return cierresOrdenados;
      } else {
        console.warn("⚠️ [CLOSURES] Respuesta no exitosa");
        dispatch({
          type: types.closuresLoad,
          payload: [],
        });
        return [];
      }
    } catch (error) {
      console.error("❌ [CLOSURES] Error cargando cierres:", error);
      dispatch({
        type: types.closuresLoad,
        payload: [],
      });
      return [];
    } finally {
      dispatch({ type: types.closuresFinishLoading });
    }
  };
};

// Cargar cierre del día actual
export const loadTodayClosure = () => {
  return async (dispatch) => {
    try {
      console.log("🔄 [CLOSURES] Cargando cierre de hoy...");

      const response = await fetchConToken("cierres/hoy");

      console.log("📦 [CLOSURES] Respuesta cierre hoy:", response);

      if (response && response.ok === true) {
        dispatch({
          type: types.closureLoadToday,
          payload: {
            existe: response.existe || false,
            cierre: response.cierre || null,
            fecha: response.fecha || new Date().toISOString().split("T")[0],
          },
        });

        return response;
      } else {
        console.warn("⚠️ [CLOSURES] Usando valores por defecto");
        dispatch({
          type: types.closureLoadToday,
          payload: {
            existe: false,
            cierre: null,
            fecha: new Date().toISOString().split("T")[0],
          },
        });
        return {
          ok: true,
          existe: false,
          cierre: null,
          fecha: new Date().toISOString().split("T")[0],
        };
      }
    } catch (error) {
      console.error("❌ [CLOSURES] Error cargando cierre de hoy:", error);
      dispatch({
        type: types.closureLoadToday,
        payload: {
          existe: false,
          cierre: null,
          fecha: new Date().toISOString().split("T")[0],
          error: error.message,
        },
      });
      return {
        ok: true,
        existe: false,
        cierre: null,
        fecha: new Date().toISOString().split("T")[0],
      };
    }
  };
};

// ✅ ACTUALIZADO: CALCULAR TOTALES COMPLETOS
export const calculateClosureTotals = (sesionCajaId) => {
  return async (dispatch) => {
    try {
      console.log(
        `🧮 [CLOSURES] Calculando totales para sesión: ${sesionCajaId}`
      );

      const response = await fetchConToken(
        `cierres/calcular-totales/${sesionCajaId}`
      );

      console.log("📦 [CLOSURES] Respuesta de cálculo:", response?.totales);

      if (response && response.ok === true && response.totales) {
        return {
          ...response.totales,
          // Asegurar valores por defecto
          ganancia_bruta: response.totales.ganancia_bruta || 0,
          saldo_final_teorico: response.totales.saldo_final_teorico || 0,
          saldo_inicial: response.totales.saldo_inicial || 0,
          diferencia: response.totales.diferencia || 0,
        };
      } else {
        console.warn("⚠️ [CLOSURES] Usando valores por defecto");
        return {
          cantidad_ventas: 0,
          total_ventas: 0,
          total_efectivo: 0,
          total_tarjeta: 0,
          total_transferencia: 0,
          ganancia_bruta: 0,
          saldo_inicial: 0,
          saldo_final_teorico: 0,
          diferencia: 0,
        };
      }
    } catch (error) {
      console.error("❌ [CLOSURES] Error calculando totales:", error);
      return {
        cantidad_ventas: 0,
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        ganancia_bruta: 0,
        saldo_inicial: 0,
        saldo_final_teorico: 0,
        diferencia: 0,
      };
    }
  };
};

// ✅ ACTUALIZADO: CREAR CIERRE con nuevos campos
export const createClosure = (closureData) => {
  return async (dispatch) => {
    try {
      console.log("🔄 [CLOSURES] Creando cierre de caja...", closureData);

      // Validaciones
      if (!closureData.sesion_caja_id) {
        throw new Error("ID de sesión de caja es requerido");
      }

      if (
        closureData.saldo_final_real === undefined ||
        closureData.saldo_final_real === null
      ) {
        throw new Error("Saldo final real es requerido");
      }

      // Calcular diferencia si no se proporciona
      const datosCompletos = {
        ...closureData,
        diferencia:
          closureData.diferencia !== undefined
            ? closureData.diferencia
            : closureData.saldo_final_real -
              (closureData.saldo_final_teorico || 0),
      };

      const response = await fetchConToken("cierres", datosCompletos, "POST");

      console.log("📦 [CLOSURES] Respuesta creación:", response);

      if (response && response.ok === true) {
        console.log("✅ [CLOSURES] Cierre creado exitosamente");

        // ✅ DISPATCH CORRECTO PARA TU REDUCER
        if (response.cierre) {
          dispatch({
            type: types.closureAddNew,
            payload: {
              cierre: {
                ...response.cierre,
                estado_diferencia:
                  response.cierre.diferencia === 0
                    ? "exacto"
                    : response.cierre.diferencia > 0
                    ? "sobrante"
                    : "faltante",
                diferencia_absoluta: Math.abs(response.cierre.diferencia || 0),
              },
            },
          });
        }

        // Mostrar resumen al usuario
        if (response.resumen) {
          await Swal.fire({
            icon: "success",
            title: "Cierre de Caja Exitoso",
            html: `
              <div style="text-align: left;">
                <p><strong>Resumen del Cierre:</strong></p>
                <p>💰 Ventas Totales: $${(
                  response.cierre?.total_ventas || 0
                ).toFixed(2)}</p>
                <p>💵 Efectivo: $${(
                  response.cierre?.total_efectivo || 0
                ).toFixed(2)}</p>
                <p>💳 Tarjeta: $${(response.cierre?.total_tarjeta || 0).toFixed(
                  2
                )}</p>
                <p>🎯 Ganancia Bruta: $${(
                  response.cierre?.ganancia_bruta || 0
                ).toFixed(2)}</p>
                <p>📊 Diferencia: <span style="color: ${
                  response.resumen.estado_caja === "Exacto"
                    ? "green"
                    : response.resumen.estado_caja === "Sobrante"
                    ? "orange"
                    : "red"
                }">$${(response.cierre?.diferencia || 0).toFixed(2)}</span></p>
                <p><strong>Estado: ${response.resumen.estado_caja}</strong></p>
              </div>
            `,
            confirmButtonText: "Aceptar",
          });
        }

        return {
          success: true,
          cierre: response.cierre,
          message: response.message,
        };
      } else {
        throw new Error(response?.error || "Error al crear cierre");
      }
    } catch (error) {
      console.error("❌ [CLOSURES] Error creando cierre:", error);

      await Swal.fire({
        icon: "error",
        title: "Error en Cierre",
        text: error.message || "Error al procesar el cierre de caja",
        confirmButtonText: "Entendido",
      });

      return {
        success: false,
        error: error.message,
      };
    }
  };
};

// Obtener cierre por ID
export const getClosureById = (closureId) => {
  return async (dispatch) => {
    try {
      console.log(`🔄 [CLOSURES] Obteniendo cierre: ${closureId}`);

      const response = await fetchConToken(`cierres/${closureId}`);

      if (response.ok && response.cierre) {
        // Enriquecer datos
        const cierreEnriquecido = {
          ...response.cierre,
          estado_diferencia:
            response.cierre.diferencia === 0
              ? "exacto"
              : response.cierre.diferencia > 0
              ? "sobrante"
              : "faltante",
          diferencia_absoluta: Math.abs(response.cierre.diferencia || 0),
        };

        // Setear como activo
        dispatch({
          type: types.closureSetActive,
          payload: cierreEnriquecido,
        });

        return cierreEnriquecido;
      } else {
        throw new Error(response.error || "Error al obtener cierre");
      }
    } catch (error) {
      console.error("❌ [CLOSURES] Error obteniendo cierre:", error);
      throw error;
    }
  };
};

// ✅ NUEVO: Para estadísticas de dashboard
export const loadClosuresStats = () => {
  return async (dispatch) => {
    try {
      // Puedes usar tu endpoint existente de estadísticas
      const response = await fetchConToken("estadisticas/dashboard");

      if (response && response.ok === true) {
        dispatch({
          type: types.statsLoadDashboard,
          payload: response.estadisticas || {},
        });
        return response.estadisticas;
      }
      return {};
    } catch (error) {
      console.error("❌ [CLOSURES] Error cargando estadísticas:", error);
      return {};
    }
  };
};
