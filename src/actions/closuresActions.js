// src/actions/closuresActions.js - VERSIÓN CORREGIDA
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import IndexedDBService from "../services/IndexedDBService";
import ClosuresOfflineController from "../controllers/offline/ClosuresOfflineController/ClosuresOfflineController";
// import SyncController from "../controllers/offline/SyncController/SyncController";
import PendientesOfflineController from "../controllers/offline/PendientesOfflineController/PendientesOfflineController";

export const loadClosures = (limite = 100, pagina = 1) => {
  return async (dispatch) => {
    dispatch({ type: types.closuresStartLoading });

    try {
      console.log(`🔄 [CLOSURES] Cargando cierres...`, {
        online: navigator.onLine,
        limite,
        pagina,
      });

      let cierres = [];

      if (navigator.onLine) {
        // ✅ MODO ONLINE - desde API
        const response = await fetchConToken(
          `cierres?limite=${limite}&pagina=${pagina}`
        );

        console.log("📦 [CLOSURES] Respuesta API:", {
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
        // ✅ MODO OFFLINE - CORREGIDO: BUSCAR EN AMBOS STORES
        console.log("📱 [CLOSURES] Modo OFFLINE - Buscando en IndexedDB...");

        try {
          // ✅ BUSCAR EN "cierres" (sincronizados) Y "cierres_pendientes" (offline)
          const [cierresStore, cierresPendientes] = await Promise.all([
            IndexedDBService.getAll("cierres"),
            IndexedDBService.getAll("cierres_pendientes"),
          ]);

          console.log(`📱 [CLOSURES] IndexedDB respondió:`, {
            cierres_sincronizados: cierresStore.length,
            cierres_pendientes: cierresPendientes.length,
            total: cierresStore.length + cierresPendientes.length,
          });

          // ✅ COMBINAR Y TRANSFORMAR LOS DATOS
          cierres = [
            ...cierresStore, // Cierres ya sincronizados
            ...cierresPendientes.map((cierre) => ({
              ...cierre,
              // ✅ MARCAR COMO OFFLINE Y AGREGAR IDENTIFICADORES
              es_local: true,
              origen: "offline",
              // ✅ USAR id_local COMO ID PRINCIPAL SI NO HAY id
              id: cierre.id || cierre.id_local,
              // ✅ ASEGURAR FORMATO CONSISTENTE
              fecha_cierre: cierre.fecha_cierre || new Date().toISOString(),
              vendedor_nombre: cierre.vendedor_nombre || "Vendedor Offline",
            })),
          ];

          console.log(`📱 [CLOSURES] ${cierres.length} cierres combinados`);
        } catch (dbError) {
          console.error("❌ [CLOSURES] Error accediendo a IndexedDB:", dbError);
        }
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
        // ✅ IDENTIFICADOR ÚNICO MEJORADO
        uniqueId: cierre.id || cierre.id_local || `local_${Date.now()}`,
        // ✅ ORIGEN CLARO
        origen: cierre.origen || (cierre.es_local ? "offline" : "online"),
      }));

      // ✅ ORDENAR POR FECHA DE CIERRE (MÁS RECIENTE PRIMERO)
      const cierresOrdenados = cierresEnriquecidos.sort((a, b) => {
        return new Date(b.fecha_cierre) - new Date(a.fecha_cierre);
      });

      console.log(
        `✅ [CLOSURES] ${cierresOrdenados.length} cierres cargados y ordenados`,
        cierresOrdenados.map((c) => ({
          id: c.id,
          id_local: c.id_local,
          origen: c.origen,
          fecha: c.fecha_cierre,
        }))
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
        console.log("🔄 [CLOSURES] Intentando recuperación local...");
        const [cierresLocal, cierresPendientes] = await Promise.all([
          IndexedDBService.getAll("cierres"),
          IndexedDBService.getAll("cierres_pendientes"),
        ]);

        const cierresCombinados = [
          ...cierresLocal,
          ...cierresPendientes.map((c) => ({
            ...c,
            es_local: true,
            origen: "offline",
          })),
        ];

        dispatch({
          type: types.closuresLoad,
          payload: cierresCombinados || [],
        });
        return cierresCombinados || [];
      } catch (localError) {
        console.error("❌ [CLOSURES] Error en recuperación local:", localError);
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
}; // ✅ ELIMINAR CIERRE LOCALMENTE
export const deleteLocalClosure = (closure) => {
  return async (dispatch, getState) => {
    try {
      console.log("🗑️ [CLOSURES] Eliminando cierre local:", closure);

      const { user } = getState().auth;

      // ✅ CONFIRMACIÓN CON SWEETALERT2
      const result = await Swal.fire({
        title: "¿Eliminar cierre local?",
        html: `
          <div style="text-align: left;">
            <p><strong>ID:</strong> ${closure.id || closure.id_local}</p>
            <p><strong>Fecha:</strong> ${new Date(
              closure.fecha_cierre
            ).toLocaleDateString()}</p>
            <p><strong>Vendedor:</strong> ${closure.vendedor_nombre}</p>
            <p><strong>Total:</strong> $${(closure.total_ventas || 0).toFixed(
              2
            )}</p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        reverseButtons: true,
      });

      if (!result.isConfirmed) {
        return { success: false, message: "Eliminación cancelada" };
      }

      let eliminado = false;

      // ✅ ELIMINAR DE AMBOS STORES POSIBLES
      if (closure.id) {
        // Cierre sincronizado (store "cierres")
        eliminado = await IndexedDBService.delete("cierres", closure.id);
        console.log(`🗑️ Eliminado de "cierres": ${closure.id}`, eliminado);
      }

      if (closure.id_local) {
        // Cierre pendiente (store "cierres_pendientes")
        eliminado =
          (await IndexedDBService.delete(
            "cierres_pendientes",
            closure.id_local
          )) || eliminado;
        console.log(
          `🗑️ Eliminado de "cierres_pendientes": ${closure.id_local}`,
          eliminado
        );
      }

      if (eliminado) {
        // ✅ ACTUALIZAR ESTADO DE REDUX
        dispatch({
          type: types.closureDeleteLocal,
          payload: closure.id || closure.id_local,
        });

        await Swal.fire({
          icon: "success",
          title: "Cierre eliminado",
          text: "El cierre ha sido eliminado del almacenamiento local",
          timer: 2000,
          showConfirmButton: false,
        });

        // ✅ RECARGAR DATOS LOCALES
        setTimeout(() => {
          dispatch(loadOfflineClosures());
        }, 500);

        return { success: true, message: "Cierre eliminado exitosamente" };
      } else {
        throw new Error(
          "No se pudo eliminar el cierre de la base de datos local"
        );
      }
    } catch (error) {
      console.error("❌ [CLOSURES] Error eliminando cierre local:", error);

      await Swal.fire({
        icon: "error",
        title: "Error al eliminar",
        text: error.message || "No se pudo eliminar el cierre local",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

// ✅ ELIMINAR TODOS LOS CIERRES LOCALES (OPCIONAL)
export const clearAllLocalClosures = () => {
  return async (dispatch, getState) => {
    try {
      const { user } = getState().auth;

      const result = await Swal.fire({
        title: "¿Eliminar TODOS los cierres locales?",
        html: `
          <div style="text-align: center; color: #dc2626;">
            <p><strong>⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER</strong></p>
            <p>Se eliminarán todos los cierres almacenados localmente</p>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Sí, eliminar todo",
        cancelButtonText: "Cancelar",
        reverseButtons: true,
      });

      if (!result.isConfirmed) {
        return { success: false, message: "Eliminación cancelada" };
      }

      // ✅ LIMPIAR AMBOS STORES
      await Promise.all([
        IndexedDBService.clear("cierres"),
        IndexedDBService.clear("cierres_pendientes"),
      ]);

      // ✅ ACTUALIZAR ESTADO
      dispatch({
        type: types.closuresClearAllLocal,
      });

      await Swal.fire({
        icon: "success",
        title: "Datos limpiados",
        text: "Todos los cierres locales han sido eliminados",
        timer: 2000,
        showConfirmButton: false,
      });

      return { success: true, message: "Todos los cierres locales eliminados" };
    } catch (error) {
      console.error("❌ [CLOSURES] Error eliminando todos los cierres:", error);

      await Swal.fire({
        icon: "error",
        title: "Error al limpiar",
        text: "No se pudieron eliminar los cierres locales",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};
// ✅ VERIFICAR ESTADO DE DATOS LOCALES
export const checkLocalClosuresStatus = () => {
  return async (dispatch) => {
    try {
      const [cierresCount, pendientesCount] = await Promise.all([
        IndexedDBService.count("cierres"),
        IndexedDBService.count("cierres_pendientes"),
      ]);

      const status = {
        cierresSincronizados: cierresCount,
        cierresPendientes: pendientesCount,
        totalLocal: cierresCount + pendientesCount,
        lastChecked: new Date().toISOString(),
      };

      console.log("📊 Estado de cierres locales:", status);

      dispatch({
        type: types.closuresLocalStatus,
        payload: status,
      });

      return status;
    } catch (error) {
      console.error("❌ Error verificando estado local:", error);
      return null;
    }
  };
};
// En closuresActions.js - AGREGAR ESTE MÉTODO
export const loadOfflineClosures = () => {
  return async (dispatch) => {
    try {
      console.log("🔄 [CLOSURES] Cargando específicamente cierres offline...");

      const [cierresPendientes, cierresSincronizados] = await Promise.all([
        IndexedDBService.getAll("cierres_pendientes"),
        IndexedDBService.getAll("cierres"),
      ]);

      console.log("📊 [CLOSURES] Resultados carga offline:", {
        pendientes: cierresPendientes.length,
        sincronizados: cierresSincronizados.length,
      });

      // Combinar y enriquecer
      const cierresOffline = [
        ...cierresPendientes.map((c) => ({
          ...c,
          es_local: true,
          origen: "offline_pendiente",
          id: c.id_local, // Usar id_local como identificador principal
          sincronizado: false,
        })),
        ...cierresSincronizados.map((c) => ({
          ...c,
          origen: "online_sincronizado",
          sincronizado: true,
        })),
      ];

      dispatch({
        type: types.closuresLoad,
        payload: cierresOffline,
      });

      return cierresOffline;
    } catch (error) {
      console.error("❌ [CLOSURES] Error cargando cierres offline:", error);
      return [];
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

// En closuresActions.js - VERSIÓN COMPLETAMENTE CORREGIDA
// ✅ MÉTODO COMPLETO - calculateClosureTotals (ACTUALIZADO)
export const calculateClosureTotals = (sesionCajaId) => {
  return async (dispatch, getState) => {
    try {
      console.log(
        `🧮 [CLOSURES] Calculando totales para sesión: ${sesionCajaId}`
      );

      const isOnline = navigator.onLine;
      let totales;

      if (isOnline) {
        // ✅ ESTRATEGIA ONLINE COMPLETA
        console.log("🌐 [CLOSURES] Calculando totales online...");

        try {
          // 1. Intentar usar el endpoint específico de cálculo
          const response = await fetchConToken(
            `cierres/calcular-totales/${sesionCajaId}`
          );

          if (response && response.ok === true && response.totales) {
            console.log(
              "✅ [CLOSURES] Totales obtenidos desde endpoint:",
              response.totales
            );
            totales = response.totales;
          } else {
            throw new Error("Endpoint no disponible o respuesta inválida");
          }
        } catch (endpointError) {
          console.warn(
            "⚠️ [CLOSURES] Fallback a cálculo manual online:",
            endpointError.message
          );

          // 2. Fallback: Obtener ventas de la sesión y calcular manualmente
          try {
            const responseVentas = await fetchConToken(
              `ventas/sesion/${sesionCajaId}`
            );

            if (responseVentas && responseVentas.ok === true) {
              const ventasSesion = responseVentas.ventas || [];

              // Obtener información de la sesión
              const { sesionesCaja } = getState();
              const sesion = sesionesCaja.sesiones.find(
                (s) => s.id === sesionCajaId || s.id_local === sesionCajaId
              );

              if (!sesion) {
                throw new Error("Sesión no encontrada en estado local");
              }

              // ✅ OBTENER PENDIENTES PARA CÁLCULO ONLINE
              const pendientesTotals =
                await PendientesOfflineController.calculatePendientesTotals(
                  sesionCajaId
                );

              // Calcular totales manualmente CON PENDIENTES
              totales = calcularTotalesDesdeVentas(
                ventasSesion,
                sesion,
                pendientesTotals
              );
              console.log(
                "✅ [CLOSURES] Totales calculados manualmente online:",
                totales
              );
            } else {
              throw new Error("No se pudieron obtener ventas del servidor");
            }
          } catch (ventasError) {
            console.warn(
              "⚠️ [CLOSURES] Fallback a cálculo completamente local:",
              ventasError.message
            );
            // 3. Último fallback: cálculo local con datos disponibles
            totales = await calculateLocalTotals(
              sesionCajaId,
              dispatch,
              getState
            );
          }
        }
      } else {
        // ✅ CÁLCULO OFFLINE
        console.log("📱 [CLOSURES] Calculando totales localmente...");
        totales = await calculateLocalTotals(sesionCajaId, dispatch, getState);
      }

      // ✅ ASEGURAR QUE TENEMOS TODOS LOS CAMPOS REQUERIDOS CON PENDIENTES
      const totalesCompletos = {
        cantidad_ventas: totales.cantidad_ventas || 0,
        total_ventas: totales.total_ventas || 0,
        total_efectivo: totales.total_efectivo || 0,
        total_tarjeta: totales.total_tarjeta || 0,
        total_transferencia: totales.total_transferencia || 0,
        ganancia_bruta: totales.ganancia_bruta || 0,
        saldo_inicial: totales.saldo_inicial || 0,
        saldo_final_teorico: totales.saldo_final_teorico || 0,
        // ✅ INCLUIR PENDIENTES EN LA RESPUESTA
        total_retiros_pendientes: totales.total_retiros_pendientes || 0,
        total_ingresos_pendientes: totales.total_ingresos_pendientes || 0,
        total_pendientes_pago: totales.total_pendientes_pago || 0,
        cantidad_retiros: totales.cantidad_retiros || 0,
        cantidad_ingresos: totales.cantidad_ingresos || 0,
        cantidad_pendientes: totales.cantidad_pendientes || 0,
        diferencia: 0, // Se calculará después con saldo final real
      };

      console.log(
        "✅ [CLOSURES] Totales finales CON PENDIENTES:",
        totalesCompletos
      );
      return totalesCompletos;
    } catch (error) {
      console.error("❌ [CLOSURES] Error calculando totales:", error);

      // Devolver totales en cero PERO CON SALDO INICIAL si está disponible
      const { sesionesCaja } = getState();
      const sesion = sesionesCaja.sesiones.find(
        (s) => s.id === sesionCajaId || s.id_local === sesionCajaId
      );

      const totalesError = {
        cantidad_ventas: 0,
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        ganancia_bruta: 0,
        saldo_inicial: sesion?.saldo_inicial || 0,
        saldo_final_teorico: sesion?.saldo_inicial || 0,
        total_retiros_pendientes: 0,
        total_ingresos_pendientes: 0,
        total_pendientes_pago: 0,
        cantidad_retiros: 0,
        cantidad_ingresos: 0,
        cantidad_pendientes: 0,
        diferencia: 0,
      };

      console.log("🔄 [CLOSURES] Totales por error:", totalesError);
      return totalesError;
    }
  };
};

// ✅ FUNCIÓN AUXILIAR PARA CÁLCULO LOCAL
// ✅ MÉTODO COMPLETO CORREGIDO - calculateLocalTotals
const calculateLocalTotals = async (sesionCajaId, dispatch, getState) => {
  try {
    const { sesionesCaja, ventas } = getState();
    const sesion = sesionesCaja.sesiones.find(
      (s) => s.id === sesionCajaId || s.id_local === sesionCajaId
    );

    if (!sesion) {
      throw new Error("Sesión no encontrada");
    }

    console.log(`🔍 [CLOSURES] Buscando ventas para sesión: ${sesionCajaId}`);

    // Obtener ventas de la sesión
    let ventasSesion = [];
    if (ventas.ventas && ventas.ventas.length > 0) {
      ventasSesion = ventas.ventas.filter(
        (venta) =>
          venta.sesion_caja_id === sesionCajaId ||
          venta.sesion_caja_id_local === sesionCajaId
      );
      console.log(
        `📊 [CLOSURES] ${ventasSesion.length} ventas encontradas en estado Redux`
      );
    } else {
      console.log("🔄 [CLOSURES] Cargando ventas desde el servidor...");
      await dispatch(loadSales());
      const { ventas: ventasActualizadas } = getState();
      ventasSesion = ventasActualizadas.ventas.filter(
        (venta) =>
          venta.sesion_caja_id === sesionCajaId ||
          venta.sesion_caja_id_local === sesionCajaId
      );
      console.log(
        `📊 [CLOSURES] ${ventasSesion.length} ventas cargadas después de dispatch`
      );
    }

    // ✅ OBTENER PENDIENTES CORRECTAMENTE
    const pendientesTotals =
      await PendientesOfflineController.calculatePendientesTotals(sesionCajaId);
    console.log("📊 [CLOSURES] Totales de pendientes:", pendientesTotals);

    // Calcular totales de ventas
    const calculo = {
      cantidad_ventas: ventasSesion.length,
      total_ventas: 0,
      total_efectivo: 0,
      total_tarjeta: 0,
      total_transferencia: 0,
      ganancia_bruta: 0,
      saldo_inicial: parseFloat(sesion.saldo_inicial) || 0,
      // ✅ INCLUIR TOTALES DE PENDIENTES
      total_retiros_pendientes: pendientesTotals.total_retiros || 0,
      total_ingresos_pendientes: pendientesTotals.total_ingresos || 0,
      total_pendientes_pago: pendientesTotals.total_pendientes || 0,
      cantidad_retiros: pendientesTotals.cantidad_retiros || 0,
      cantidad_ingresos: pendientesTotals.cantidad_ingresos || 0,
      cantidad_pendientes: pendientesTotals.cantidad_pendientes || 0,
    };

    // Calcular totales de ventas
    ventasSesion.forEach((venta) => {
      calculo.total_ventas += parseFloat(venta.total) || 0;
      calculo.total_efectivo += parseFloat(venta.monto_efectivo) || 0;
      calculo.total_tarjeta += parseFloat(venta.monto_tarjeta) || 0;
      calculo.total_transferencia += parseFloat(venta.monto_transferencia) || 0;
      calculo.ganancia_bruta += parseFloat(venta.ganancia_bruta) || 0;
    });

    // ✅ CÁLCULO CORRECTO DEL SALDO FINAL TEÓRICO CON PENDIENTES
    calculo.saldo_final_teorico =
      calculo.saldo_inicial +
      calculo.total_efectivo +
      calculo.total_ingresos_pendientes -
      calculo.total_retiros_pendientes;

    calculo.diferencia = 0; // Se calculará después con el saldo final real

    console.log("✅ [CLOSURES] Cálculo local completado:", calculo);
    return calculo;
  } catch (error) {
    console.error("❌ [CLOSURES] Error en cálculo local:", error);
    throw error;
  }
};

// ✅ FUNCIÓN AUXILIAR PARA CALCULAR TOTALES DESDE VENTAS
// ✅ FUNCIÓN AUXILIAR ACTUALIZADA - calcularTotalesDesdeVentas CON PENDIENTES
const calcularTotalesDesdeVentas = (
  ventasSesion,
  sesion,
  pendientesTotals = null
) => {
  const calculo = {
    cantidad_ventas: ventasSesion.length,
    total_ventas: 0,
    total_efectivo: 0,
    total_tarjeta: 0,
    total_transferencia: 0,
    ganancia_bruta: 0,
    saldo_inicial: parseFloat(sesion.saldo_inicial) || 0,
    // ✅ INCLUIR PENDIENTES SI SE PROVEEN
    total_retiros_pendientes: pendientesTotals?.total_retiros || 0,
    total_ingresos_pendientes: pendientesTotals?.total_ingresos || 0,
    total_pendientes_pago: pendientesTotals?.total_pendientes || 0,
    cantidad_retiros: pendientesTotals?.cantidad_retiros || 0,
    cantidad_ingresos: pendientesTotals?.cantidad_ingresos || 0,
    cantidad_pendientes: pendientesTotals?.cantidad_pendientes || 0,
  };

  ventasSesion.forEach((venta) => {
    calculo.total_ventas += parseFloat(venta.total) || 0;
    calculo.total_efectivo += parseFloat(venta.monto_efectivo) || 0;
    calculo.total_tarjeta += parseFloat(venta.monto_tarjeta) || 0;
    calculo.total_transferencia += parseFloat(venta.monto_transferencia) || 0;
    calculo.ganancia_bruta += parseFloat(venta.ganancia_bruta) || 0;
  });

  // ✅ CÁLCULO CORRECTO CON PENDIENTES
  calculo.saldo_final_teorico =
    calculo.saldo_inicial +
    calculo.total_efectivo +
    calculo.total_ingresos_pendientes -
    calculo.total_retiros_pendientes;

  calculo.diferencia = 0;

  return calculo;
};

// En closuresActions.js - SIMPLIFICAR createClosure
export const createClosure = (closureData) => {
  return async (dispatch, getState) => {
    try {
      console.log("🔄 [CLOSURES] Creando cierre de caja...", closureData);

      // Validaciones básicas
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

      if (isOnline) {
        // ✅ MODO ONLINE - Enviar directamente al servidor
        const datosCompletos = {
          sesion_caja_id:
            closureData.sesion_caja_id || closureData.sesion_caja_id_local,
          total_ventas: closureData.total_ventas || 0,
          total_efectivo: closureData.total_efectivo || 0,
          total_tarjeta: closureData.total_tarjeta || 0,
          total_transferencia: closureData.total_transferencia || 0,
          ganancia_bruta: closureData.ganancia_bruta || 0,
          saldo_final_teorico: closureData.saldo_final_teorico || 0,
          saldo_final_real: parseFloat(closureData.saldo_final_real),
          diferencia: closureData.diferencia || 0,
          observaciones: closureData.observaciones || "",
          vendedor_id: closureData.vendedor_id,
        };

        console.log("🌐 Enviando cierre al servidor:", datosCompletos);
        const response = await fetchConToken("cierres", datosCompletos, "POST");

        if (response && response.ok === true) {
          resultado = response;
          console.log("✅ Cierre creado exitosamente en servidor");
        } else {
          throw new Error(response?.error || "Error al crear cierre");
        }
      } else {
        // ✅ MODO OFFLINE - Crear localmente
        console.log("📱 Creando cierre localmente...");

        const closureResult = await ClosuresOfflineController.createClosure(
          closureData
        );

        if (closureResult.success) {
          resultado = {
            ok: true,
            cierre: closureResult.cierre,
            message: "Cierre guardado localmente",
          };
        } else {
          throw new Error(closureResult.error);
        }
      }

      // Dispatch y notificación...
      if (resultado.cierre) {
        dispatch({
          type: types.closureAddNew,
          payload: { cierre: resultado.cierre },
        });
      }

      return { success: true, cierre: resultado.cierre };
    } catch (error) {
      console.error("❌ Error creando cierre:", error);
      throw error;
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
// ✅ CORREGIR syncPendingClosures
export const syncPendingClosures = () => {
  return async (dispatch) => {
    try {
      if (!navigator.onLine) {
        await Swal.fire({
          icon: "warning",
          title: "Sin conexión",
          text: "No hay conexión a internet para sincronizar cierres",
          confirmButtonText: "Entendido",
        });
        return false;
      }

      await Swal.fire({
        title: "Sincronizando cierres...",
        text: "Sincronizando cierres pendientes con el servidor",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const resultado = await ClosuresSyncController.syncPendingClosures();

      Swal.close();

      if (resultado.success) {
        // Recargar cierres después de sincronizar
        await dispatch(loadClosures());

        await Swal.fire({
          icon: "success",
          title: "Cierres sincronizados",
          text: `Se sincronizaron ${resultado.sincronizados} cierres correctamente`,
          timer: 2000,
          showConfirmButton: false,
        });

        return true;
      } else {
        throw new Error(resultado.error || "Error al sincronizar cierres");
      }
    } catch (error) {
      console.error("❌ Error sincronizando cierres:", error);

      Swal.close();
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudieron sincronizar los cierres",
        confirmButtonText: "Entendido",
      });

      return false;
    }
  };
};
// ✅ ACTUALIZAR ESTADO DE CONEXIÓN EN REDUX
export const updateConnectionStatus = (isOnline) => ({
  type: types.connectionStatusUpdate,
  payload: isOnline,
});

// ✅ VERIFICAR ESTADO DE SINCRONIZACIÓN
export const checkSyncStatus = () => {
  return async (dispatch) => {
    try {
      const pendingClosures = await IndexedDBService.getPendingRecords(
        "cierres"
      );

      dispatch({
        type: types.syncProgress,
        payload: {
          pendingClosures: pendingClosures.length,
          lastChecked: new Date().toISOString(),
        },
      });

      return pendingClosures.length;
    } catch (error) {
      console.error("❌ Error verificando estado de sync:", error);
      return 0;
    }
  };
};

// ✅ SINCRONIZACIÓN MEJORADA CON ESTADO EN REDUX
export const enhancedSyncPendingClosures = () => {
  return async (dispatch) => {
    try {
      if (!navigator.onLine) {
        dispatch({
          type: types.syncError,
          payload: "Sin conexión a internet",
        });
        return false;
      }

      dispatch({ type: types.syncStart });

      await Swal.fire({
        title: "Sincronizando...",
        text: "Sincronizando cierres pendientes con el servidor",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const syncResult = await SyncController.fullSync();

      // Actualizar progreso
      dispatch({
        type: types.syncProgress,
        payload: {
          pendingClosures: 0,
          lastSync: new Date().toISOString(),
        },
      });

      // Recargar cierres
      await dispatch(loadClosures());

      Swal.close();

      if (syncResult.success) {
        dispatch({ type: types.syncFinish });

        await Swal.fire({
          icon: "success",
          title: "Sincronización completada",
          text: `Se sincronizaron ${syncResult.results?.success || 0} cierres`,
          timer: 2000,
          showConfirmButton: false,
        });

        return true;
      } else {
        throw new Error(syncResult.error || "Error en sincronización");
      }
    } catch (error) {
      console.error("❌ Error sincronizando cierres:", error);

      Swal.close();
      dispatch({
        type: types.syncError,
        payload: error.message,
      });

      await Swal.fire({
        icon: "error",
        title: "Error de sincronización",
        text:
          error.message || "No se pudieron sincronizar los cierres pendientes",
        confirmButtonText: "Entendido",
      });

      return false;
    }
  };
};
