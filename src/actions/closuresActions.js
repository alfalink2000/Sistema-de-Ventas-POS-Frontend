// src/actions/closuresActions.js - VERSIÓN CORREGIDA
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import IndexedDBService from "../services/IndexedDBService";
import ClosuresOfflineController from "../controllers/offline/ClosuresOfflineController/ClosuresOfflineController";
import SyncController from "../controllers/offline/SyncController/SyncController";

export const loadClosures = (limite = 100, pagina = 1) => {
  return async (dispatch) => {
    dispatch({ type: types.closuresStartLoading });

    try {
      console.log(`🔄 [CLOSURES] Cargando cierres...`);

      let cierres = [];

      if (navigator.onLine) {
        // Si hay conexión, cargar desde API
        const response = await fetchConToken(
          `cierres?limite=${limite}&pagina=${pagina}`
        );

        console.log("📦 [CLOSURES] Respuesta:", {
          ok: response?.ok,
          cantidad: response?.cierres?.length || 0,
        });

        if (response && response.ok === true) {
          cierres = response.cierres || [];

          // Guardar en IndexedDB para offline
          await IndexedDBService.clear("cierres");
          for (const cierre of cierres) {
            await IndexedDBService.add("cierres", cierre);
          }
        } else {
          console.warn("⚠️ [CLOSURES] Respuesta no exitosa desde API");
        }
      } else {
        // Si no hay conexión, cargar desde IndexedDB
        cierres = await IndexedDBService.getAll("cierres");
        console.log(
          `📱 [CLOSURES] ${cierres.length} cierres cargados desde almacenamiento local`
        );
      }

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
            ? ((cierre.ganancia_bruta / cierre.total_ventas) * 100).toFixed(1) +
              "%"
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
    } catch (error) {
      console.error("❌ [CLOSURES] Error cargando cierres:", error);

      // En caso de error, intentar cargar desde local
      try {
        const cierresLocal = await IndexedDBService.getAll("cierres");
        dispatch({
          type: types.closuresLoad,
          payload: cierresLocal || [],
        });
        return cierresLocal || [];
      } catch (localError) {
        dispatch({
          type: types.closuresLoad,
          payload: [],
        });
        return [];
      }
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

      let response;

      if (navigator.onLine) {
        // Si hay conexión, cargar desde API
        response = await fetchConToken("cierres/hoy");
      } else {
        // Si no hay conexión, buscar en cierres locales
        const cierres = await IndexedDBService.getAll("cierres");
        const hoy = new Date().toISOString().split("T")[0];
        const cierreHoy = cierres.find((cierre) => {
          const fechaCierre = new Date(cierre.fecha_cierre)
            .toISOString()
            .split("T")[0];
          return fechaCierre === hoy;
        });

        response = {
          ok: true,
          existe: !!cierreHoy,
          cierre: cierreHoy || null,
          fecha: hoy,
        };
      }

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

      // En caso de error, intentar cargar desde local
      try {
        const cierres = await IndexedDBService.getAll("cierres");
        const hoy = new Date().toISOString().split("T")[0];
        const cierreHoy = cierres.find((cierre) => {
          const fechaCierre = new Date(cierre.fecha_cierre)
            .toISOString()
            .split("T")[0];
          return fechaCierre === hoy;
        });

        dispatch({
          type: types.closureLoadToday,
          payload: {
            existe: !!cierreHoy,
            cierre: cierreHoy || null,
            fecha: hoy,
            error: error.message,
          },
        });

        return {
          ok: true,
          existe: !!cierreHoy,
          cierre: cierreHoy || null,
          fecha: hoy,
        };
      } catch (localError) {
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
    }
  };
};

// ✅ CORREGIDO: CALCULAR TOTALES COMPLETOS CON OFFLINE
export const calculateClosureTotals = (sesionCajaId) => {
  return async (dispatch, getState) => {
    try {
      console.log(
        `🧮 [CLOSURES] Calculando totales para sesión: ${sesionCajaId}`
      );

      const isOnline = navigator.onLine;
      let totales;

      if (isOnline) {
        // Si hay conexión, calcular en backend
        const response = await fetchConToken(
          `cierres/calcular-totales/${sesionCajaId}`
        );

        console.log("📦 [CLOSURES] Respuesta de cálculo:", response?.totales);

        if (response && response.ok === true && response.totales) {
          totales = {
            ...response.totales,
            ganancia_bruta: response.totales.ganancia_bruta || 0,
            saldo_final_teorico: response.totales.saldo_final_teorico || 0,
            saldo_inicial: response.totales.saldo_inicial || 0,
            diferencia: response.totales.diferencia || 0,
          };
        } else {
          throw new Error(response?.error || "Error calculando totales");
        }
      } else {
        // Si no hay conexión, calcular localmente
        console.log("📱 [CLOSURES] Calculando totales localmente...");

        // Determinar si es una sesión local o del servidor
        const { sesionesCaja } = getState();
        const sesion = sesionesCaja.sesiones.find(
          (s) => s.id === sesionCajaId || s.id_local === sesionCajaId
        );

        if (!sesion) {
          throw new Error("Sesión no encontrada");
        }

        const sesionIdLocal = sesion.id_local || sesionCajaId;

        // ✅ CORREGIDO: Usar ClosuresOfflineController en lugar de OfflineClosureService
        const totalesCalculados =
          await ClosuresOfflineController.calculateSessionTotals(sesionIdLocal);

        // Obtener saldo inicial
        const saldoInicial = sesion.saldo_inicial || 0;

        // Calcular saldo final teórico
        const saldoFinalTeorico =
          saldoInicial + (totalesCalculados.total_efectivo || 0);

        totales = {
          ...totalesCalculados,
          saldo_inicial: saldoInicial,
          saldo_final_teorico: saldoFinalTeorico,
          diferencia: 0, // Se calculará después con el saldo final real
        };
      }

      return totales;
    } catch (error) {
      console.error("❌ [CLOSURES] Error calculando totales:", error);

      // Devolver totales en cero en caso de error
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

// ✅ CORREGIDO: CREAR CIERRE con soporte offline
export const createClosure = (closureData) => {
  return async (dispatch, getState) => {
    try {
      console.log("🔄 [CLOSURES] Creando cierre de caja...", closureData);

      // Validaciones
      if (!closureData.sesion_caja_id && !closureData.sesion_caja_id_local) {
        throw new Error("ID de sesión de caja es requerido");
      }

      if (
        closureData.saldo_final_real === undefined ||
        closureData.saldo_final_real === null
      ) {
        throw new Error("Saldo final real es requerido");
      }

      const isOnline = navigator.onLine;
      let resultado;

      if (isOnline && closureData.sesion_caja_id) {
        // ✅ MODO ONLINE - Sesión del servidor
        const datosCompletos = {
          sesion_caja_id: closureData.sesion_caja_id,
          total_ventas: closureData.total_ventas || 0,
          total_efectivo: closureData.total_efectivo || 0,
          total_tarjeta: closureData.total_tarjeta || 0,
          total_transferencia: closureData.total_transferencia || 0,
          ganancia_bruta: closureData.ganancia_bruta || 0,
          saldo_final_teorico: closureData.saldo_final_teorico || 0,
          saldo_final_real: parseFloat(closureData.saldo_final_real),
          diferencia:
            closureData.diferencia !== undefined
              ? parseFloat(closureData.diferencia)
              : parseFloat(closureData.saldo_final_real) -
                parseFloat(closureData.saldo_final_teorico || 0),
          observaciones: closureData.observaciones || "",
          vendedor_id: closureData.vendedor_id,
        };

        const response = await fetchConToken("cierres", datosCompletos, "POST");

        console.log("📦 [CLOSURES] Respuesta creación:", response);

        if (response && response.ok === true) {
          resultado = response;
          console.log("✅ [CLOSURES] Cierre creado exitosamente en servidor");

          // Guardar en IndexedDB
          if (response.cierre) {
            await IndexedDBService.add("cierres", response.cierre);
          }
        } else {
          throw new Error(response?.error || "Error al crear cierre");
        }
      } else {
        // ✅ MODO OFFLINE - Crear localmente
        console.log("📱 [CLOSURES] Creando cierre localmente...");

        const { sesionesCaja } = getState();
        const sesion = sesionesCaja.sesiones.find(
          (s) =>
            s.id === closureData.sesion_caja_id ||
            s.id_local === closureData.sesion_caja_id_local
        );

        if (!sesion) {
          throw new Error("Sesión no encontrada");
        }

        const sesionIdLocal =
          sesion.id_local || closureData.sesion_caja_id_local;
        const saldoFinalReal = parseFloat(closureData.saldo_final_real);

        // ✅ CORREGIDO: Usar ClosuresOfflineController
        const closureResult = await ClosuresOfflineController.createClosure({
          ...closureData,
          sesion_caja_id_local: sesionIdLocal,
          saldo_final_real: saldoFinalReal,
        });

        if (closureResult.success) {
          resultado = {
            ok: true,
            cierre: closureResult.cierre,
            message:
              "Cierre guardado localmente. Se sincronizará cuando haya conexión.",
            resumen: {
              estado_caja:
                closureResult.cierre.diferencia === 0
                  ? "Exacto"
                  : closureResult.cierre.diferencia > 0
                  ? "Sobrante"
                  : "Faltante",
            },
          };

          await Swal.fire({
            icon: "info",
            title: "Modo Offline",
            text: "El cierre se guardó localmente y se sincronizará cuando recuperes la conexión",
            confirmButtonText: "Entendido",
          });
        } else {
          throw new Error(closureResult.error);
        }
      }

      // ✅ DISPATCH CORRECTO PARA EL REDUCER
      if (resultado.cierre) {
        const cierreEnriquecido = {
          ...resultado.cierre,
          estado_diferencia:
            resultado.cierre.diferencia === 0
              ? "exacto"
              : resultado.cierre.diferencia > 0
              ? "sobrante"
              : "faltante",
          diferencia_absoluta: Math.abs(resultado.cierre.diferencia || 0),
        };

        dispatch({
          type: types.closureAddNew,
          payload: {
            cierre: cierreEnriquecido,
          },
        });
      }

      // Mostrar resumen al usuario
      if (resultado.resumen && isOnline) {
        await Swal.fire({
          icon: "success",
          title: "Cierre de Caja Exitoso",
          html: `
            <div style="text-align: left;">
              <p><strong>Resumen del Cierre:</strong></p>
              <p>💰 Ventas Totales: $${(
                resultado.cierre?.total_ventas || 0
              ).toFixed(2)}</p>
              <p>💵 Efectivo: $${(
                resultado.cierre?.total_efectivo || 0
              ).toFixed(2)}</p>
              <p>💳 Tarjeta: $${(resultado.cierre?.total_tarjeta || 0).toFixed(
                2
              )}</p>
              <p>🎯 Ganancia Bruta: $${(
                resultado.cierre?.ganancia_bruta || 0
              ).toFixed(2)}</p>
              <p>📊 Diferencia: <span style="color: ${
                resultado.resumen.estado_caja === "Exacto"
                  ? "green"
                  : resultado.resumen.estado_caja === "Sobrante"
                  ? "orange"
                  : "red"
              }">$${(resultado.cierre?.diferencia || 0).toFixed(2)}</span></p>
              <p><strong>Estado: ${resultado.resumen.estado_caja}</strong></p>
            </div>
          `,
          confirmButtonText: "Aceptar",
        });
      }

      return {
        success: true,
        cierre: resultado.cierre,
        message: resultado.message,
      };
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

      let cierre;

      if (navigator.onLine) {
        // Si hay conexión, obtener desde API
        const response = await fetchConToken(`cierres/${closureId}`);

        if (response.ok && response.cierre) {
          cierre = response.cierre;
        } else {
          throw new Error(response.error || "Error al obtener cierre");
        }
      } else {
        // Si no hay conexión, buscar en IndexedDB
        const cierres = await IndexedDBService.getAll("cierres");
        cierre = cierres.find(
          (c) => c.id === closureId || c.id_local === closureId
        );

        if (!cierre) {
          throw new Error("Cierre no encontrado localmente");
        }
      }

      // Enriquecer datos
      const cierreEnriquecido = {
        ...cierre,
        estado_diferencia:
          cierre.diferencia === 0
            ? "exacto"
            : cierre.diferencia > 0
            ? "sobrante"
            : "faltante",
        diferencia_absoluta: Math.abs(cierre.diferencia || 0),
      };

      // Setear como activo
      dispatch({
        type: types.closureSetActive,
        payload: cierreEnriquecido,
      });

      return cierreEnriquecido;
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
      let estadisticas = {};

      if (navigator.onLine) {
        // Si hay conexión, obtener desde API
        const response = await fetchConToken("estadisticas/dashboard");

        if (response && response.ok === true) {
          estadisticas = response.estadisticas || {};
        }
      } else {
        // Si no hay conexión, calcular estadísticas básicas desde local
        const cierres = await IndexedDBService.getAll("cierres");

        estadisticas = {
          total_cierres: cierres.length,
          ventas_totales: cierres.reduce(
            (sum, c) => sum + (c.total_ventas || 0),
            0
          ),
          ganancia_total: cierres.reduce(
            (sum, c) => sum + (c.ganancia_bruta || 0),
            0
          ),
          cierres_hoy: cierres.filter((c) => {
            const fechaCierre = new Date(c.fecha_cierre)
              .toISOString()
              .split("T")[0];
            const hoy = new Date().toISOString().split("T")[0];
            return fechaCierre === hoy;
          }).length,
        };
      }

      dispatch({
        type: types.statsLoadDashboard,
        payload: estadisticas,
      });

      return estadisticas;
    } catch (error) {
      console.error("❌ [CLOSURES] Error cargando estadísticas:", error);
      return {};
    }
  };
};

// ✅ CORREGIDO: Sincronizar cierres pendientes manualmente
export const syncPendingClosures = () => {
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
        text: "Sincronizando cierres pendientes con el servidor",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // ✅ CORREGIDO: Usar fullSync en lugar de forceSync
      const syncResult = await SyncController.fullSync();

      // Recargar cierres después de sincronizar
      await dispatch(loadClosures());

      Swal.close();

      if (syncResult.success) {
        await Swal.fire({
          icon: "success",
          title: "Sincronización completada",
          text: "Todos los cierres pendientes se han sincronizado",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(syncResult.error || "Error en sincronización");
      }

      return true;
    } catch (error) {
      console.error("❌ [CLOSURES] Error sincronizando cierres:", error);

      Swal.close();

      await Swal.fire({
        icon: "error",
        title: "Error de sincronización",
        text: "No se pudieron sincronizar los cierres pendientes",
        confirmButtonText: "Entendido",
      });

      return false;
    }
  };
};
