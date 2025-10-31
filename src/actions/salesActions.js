// actions/salesActions.js - CON SOPORTE OFFLINE COMPLETO
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import { useOfflineOperations } from "../hook/useOfflineOperations";

export const loadSales = (limite = 50, pagina = 1) => {
  return async (dispatch) => {
    dispatch({ type: types.salesStartLoading });

    try {
      console.log(`🔄 [SALES] Cargando ventas...`, {
        limite,
        pagina,
        online: navigator.onLine,
      });

      let ventas = [];

      if (navigator.onLine) {
        // ✅ CON CONEXIÓN: Cargar desde API
        const response = await fetchConToken(
          `ventas?limite=${limite}&pagina=${pagina}`
        );

        if (response && response.ok === true) {
          ventas = response.ventas || [];
          console.log(
            `✅ [SALES] ${ventas.length} ventas cargadas desde servidor`
          );
        } else {
          console.warn("⚠️ [SALES] Respuesta no exitosa desde API");
        }
      }

      // ✅ EN OFFLINE O COMO FALLBACK: Cargar ventas pendientes locales
      const { getPendingSales } = useOfflineOperations();
      const ventasPendientes = await getPendingSales();

      if (ventasPendientes.length > 0) {
        console.log(
          `📱 [SALES] ${ventasPendientes.length} ventas pendientes de sincronizar`
        );
        // Combinar ventas del servidor con ventas pendientes locales
        ventas = [...ventasPendientes, ...ventas];
      }

      // ✅ ENRIQUECER DATOS PARA EL FRONTEND
      const ventasEnriquecidas = ventas.map((venta) => ({
        ...venta,
        estado_venta: venta.sincronizado ? "completada" : "pendiente",
        es_local: !!venta.es_local,
        icono_estado: venta.sincronizado ? "✅" : "⏳",
        color_estado: venta.sincronizado ? "success" : "warning",
      }));

      // ✅ ORDENAR POR FECHA (MÁS RECIENTE PRIMERO)
      const ventasOrdenadas = ventasEnriquecidas.sort((a, b) => {
        return new Date(b.fecha_venta) - new Date(a.fecha_venta);
      });

      console.log(`✅ [SALES] ${ventasOrdenadas.length} ventas procesadas`);

      dispatch({
        type: types.salesLoad,
        payload: ventasOrdenadas,
      });

      return ventasOrdenadas;
    } catch (error) {
      console.error("❌ [SALES] Error cargando ventas:", error);

      // ✅ FALLBACK: Cargar solo ventas pendientes locales
      try {
        const { getPendingSales } = useOfflineOperations();
        const ventasPendientes = await getPendingSales();

        dispatch({
          type: types.salesLoad,
          payload: ventasPendientes,
        });

        return ventasPendientes;
      } catch (offlineError) {
        dispatch({
          type: types.salesLoad,
          payload: [],
        });
        return [];
      }
    } finally {
      dispatch({ type: types.salesFinishLoading });
    }
  };
};

// ✅ CREAR VENTA CON SOPORTE OFFLINE COMPLETO
export const createSale = (saleData) => {
  return async (dispatch, getState) => {
    try {
      console.log("🔄 [SALES] Creando venta...", {
        productos: saleData.productos?.length,
        online: navigator.onLine,
      });

      // ✅ VALIDAR STOCK ANTES DE PROCESAR
      const { validateStockForSale, processSaleStockUpdate } =
        useOfflineOperations();

      const validacionStock = await validateStockForSale(saleData.productos);

      if (!validacionStock.valido) {
        const mensajeError = validacionStock.errores.join("\n");
        throw new Error(`Error de stock:\n${mensajeError}`);
      }

      let resultado;
      const isOnline = navigator.onLine;

      if (isOnline) {
        // ✅ CON CONEXIÓN: Crear en servidor
        const response = await fetchConToken("ventas", saleData, "POST");

        if (response && response.ok === true && response.venta) {
          resultado = response.venta;
          console.log(
            "✅ [SALES] Venta creada exitosamente en servidor:",
            response.venta.id
          );

          // ✅ ACTUALIZAR STOCK EN SERVIDOR (ya se hace automáticamente en el backend)
        } else {
          throw new Error(
            response?.error || "Error al crear venta en servidor"
          );
        }
      } else {
        // ✅ SIN CONEXIÓN: Crear localmente
        const { createSaleOffline } = useOfflineOperations();

        const resultadoOffline = await createSaleOffline(saleData);

        if (resultadoOffline.success) {
          resultado = resultadoOffline.venta;
          console.log(
            "✅ [SALES] Venta creada localmente:",
            resultadoOffline.id_local
          );

          // ✅ ACTUALIZAR STOCK LOCALMENTE
          const actualizacionStock = await processSaleStockUpdate(
            saleData.productos,
            resultadoOffline.id_local
          );

          if (!actualizacionStock.success) {
            console.error(
              "⚠️ [SALES] Algunos stocks no se actualizaron:",
              actualizacionStock.resultados.fallidos
            );
          }
        } else {
          throw new Error(resultadoOffline.error);
        }
      }

      // ✅ ACTUALIZAR ESTADO GLOBAL
      dispatch({
        type: types.saleAddNew,
        payload: resultado,
      });

      // ✅ ACTUALIZAR PRODUCTOS EN ESTADO GLOBAL (para reflejar cambios de stock)
      if (!isOnline) {
        dispatch({
          type: types.productsUpdateFromSale,
          payload: saleData.productos,
        });
      }

      // ✅ MOSTRAR CONFIRMACIÓN
      const mensajeExito = isOnline
        ? `Venta #${resultado.id} registrada exitosamente`
        : `Venta local #${resultado.id_local} guardada. Se sincronizará cuando recuperes la conexión`;

      await Swal.fire({
        icon: isOnline ? "success" : "info",
        title: isOnline ? "¡Venta Exitosa!" : "Venta Guardada (Offline)",
        text: mensajeExito,
        timer: 3000,
        showConfirmButton: false,
      });

      return {
        success: true,
        venta: resultado,
        es_local: !isOnline,
      };
    } catch (error) {
      console.error("❌ [SALES] Error creando venta:", error);

      await Swal.fire({
        icon: "error",
        title: "Error en Venta",
        text: error.message || "Error al procesar la venta",
        confirmButtonText: "Entendido",
      });

      return {
        success: false,
        error: error.message,
      };
    }
  };
};

// ✅ OBTENER VENTAS PENDIENTES DE SINCRONIZACIÓN
export const loadPendingSales = () => {
  return async (dispatch) => {
    try {
      console.log("🔄 [SALES] Cargando ventas pendientes...");

      const { getPendingSales } = useOfflineOperations();
      const ventasPendientes = await getPendingSales();

      console.log(
        `⏳ [SALES] ${ventasPendientes.length} ventas pendientes de sincronizar`
      );

      dispatch({
        type: types.salesLoadPending,
        payload: ventasPendientes,
      });

      return ventasPendientes;
    } catch (error) {
      console.error("❌ [SALES] Error cargando ventas pendientes:", error);
      return [];
    }
  };
};

// ✅ SINCRONIZAR VENTAS PENDIENTES MANUALMENTE
export const syncPendingSales = () => {
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
        text: "Enviando ventas pendientes al servidor",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const { getPendingSales, fullSync } = useOfflineOperations();
      const ventasPendientes = await getPendingSales();

      if (ventasPendientes.length === 0) {
        Swal.close();
        await Swal.fire({
          icon: "info",
          title: "Sin ventas pendientes",
          text: "No hay ventas pendientes de sincronizar",
          timer: 2000,
          showConfirmButton: false,
        });
        return true;
      }

      console.log(
        `🔄 [SALES] Sincronizando ${ventasPendientes.length} ventas pendientes...`
      );

      // ✅ USAR SINCRONIZACIÓN COMPLETA
      const syncResult = await fullSync();

      Swal.close();

      if (syncResult.success) {
        // ✅ RECARGAR VENTAS DESPUÉS DE SINCRONIZAR
        await dispatch(loadSales());

        await Swal.fire({
          icon: "success",
          title: "Sincronización completada",
          html: `
            <div style="text-align: left;">
              <p><strong>Ventas sincronizadas:</strong></p>
              <p>✅ Ventas: ${syncResult.sales?.success || 0} exitosas</p>
              <p>📊 Total procesado: ${syncResult.sales?.total || 0}</p>
              ${
                syncResult.sales?.failed > 0
                  ? `<p>❌ Falladas: ${syncResult.sales.failed}</p>`
                  : ""
              }
            </div>
          `,
          confirmButtonText: "Aceptar",
        });

        return true;
      } else {
        throw new Error(syncResult.error || "Error en sincronización");
      }
    } catch (error) {
      console.error("❌ [SALES] Error sincronizando ventas:", error);

      Swal.close();

      await Swal.fire({
        icon: "error",
        title: "Error de sincronización",
        text:
          error.message || "No se pudieron sincronizar las ventas pendientes",
        confirmButtonText: "Entendido",
      });

      return false;
    }
  };
};

// ✅ OBTENER VENTA POR ID
export const getSaleById = (saleId) => {
  return async (dispatch) => {
    try {
      console.log(`🔄 [SALES] Obteniendo venta: ${saleId}`);

      let venta;

      if (navigator.onLine) {
        // Buscar en servidor
        const response = await fetchConToken(`ventas/${saleId}`);

        if (response.ok && response.venta) {
          venta = response.venta;
        } else {
          throw new Error(response.error || "Error al obtener venta");
        }
      } else {
        // Buscar en ventas locales
        const { getPendingSales } = useOfflineOperations();
        const ventasPendientes = await getPendingSales();
        venta = ventasPendientes.find((v) => v.id_local === saleId);

        if (!venta) {
          throw new Error("Venta no encontrada localmente");
        }
      }

      dispatch({
        type: types.saleSetActive,
        payload: venta,
      });

      return venta;
    } catch (error) {
      console.error(`❌ [SALES] Error obteniendo venta ${saleId}:`, error);
      throw error;
    }
  };
};

// ✅ CANCELAR VENTA
export const cancelSale = (saleId, motivo) => {
  return async (dispatch) => {
    try {
      if (!navigator.onLine) {
        throw new Error("No se pueden cancelar ventas en modo offline");
      }

      const result = await Swal.fire({
        title: "¿Estás seguro?",
        text: "Esta acción no se puede deshacer",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, cancelar",
        cancelButtonText: "Volver",
      });

      if (!result.isConfirmed) {
        return { cancelled: true };
      }

      const response = await fetchConToken(
        `ventas/cancelar/${saleId}`,
        { motivo },
        "PUT"
      );

      if (response.ok && response.message) {
        dispatch({
          type: types.saleUpdate,
          payload: {
            id: saleId,
            estado: "cancelada",
            motivo_cancelacion: motivo,
          },
        });

        await Swal.fire({
          icon: "success",
          title: "Venta Cancelada",
          text: response.message,
          timer: 2000,
          showConfirmButton: false,
        });

        return { success: true };
      } else {
        throw new Error(response.error || "Error al cancelar venta");
      }
    } catch (error) {
      console.error(`❌ [SALES] Error cancelando venta ${saleId}:`, error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al cancelar la venta",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

export const setActiveSale = (sale) => ({
  type: types.saleSetActive,
  payload: sale,
});

export const clearActiveSale = () => ({
  type: types.saleClearActive,
});
