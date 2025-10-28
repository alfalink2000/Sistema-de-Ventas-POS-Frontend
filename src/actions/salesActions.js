// src/actions/salesActions.js - CORREGIDO
import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import IndexedDBService from "../services/IndexedDBService";
import SyncService from "../services/SyncService";
import Swal from "sweetalert2";

export const createSale = (saleData) => {
  return async (dispatch, getState) => {
    try {
      console.log("🔄 Procesando venta (con soporte offline)...", saleData);

      // Validar datos antes de procesar
      if (!saleData.productos || saleData.productos.length === 0) {
        throw new Error("No hay productos en la venta");
      }

      const isOnline = navigator.onLine;

      // Generar ID local único
      const id_local = `local_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const saleWithLocalId = {
        ...saleData,
        id_local,
        sincronizado: false,
        es_local: true,
        fecha_creacion: new Date().toISOString(),
      };

      if (isOnline) {
        // Intentar enviar directamente al servidor
        try {
          const response = await fetchConToken("ventas", saleData, "POST");

          if (response.ok && response.venta) {
            console.log("✅ Venta enviada directamente al servidor");

            dispatch({
              type: types.saleAddNew,
              payload: response.venta,
            });

            await Swal.fire({
              icon: "success",
              title: "¡Venta Exitosa!",
              text: `Venta #${response.venta.id} registrada - Total: $${saleData.total}`,
              timer: 2000,
              showConfirmButton: false,
            });

            dispatch(clearCart());
            return { success: true, id: response.venta.id, es_local: false };
          }
        } catch (onlineError) {
          console.log(
            "🌐 Falló envío online, guardando localmente:",
            onlineError
          );
          // Continuar con guardado local
        }
      }

      // Guardar localmente (tanto si falló el envío como si está offline)
      await IndexedDBService.add("ventas_pendientes", saleWithLocalId);

      // Guardar detalles de venta
      if (saleData.productos && saleData.productos.length > 0) {
        for (const producto of saleData.productos) {
          await IndexedDBService.add("detalles_venta_pendientes", {
            venta_id_local: id_local,
            producto_id: producto.producto_id,
            cantidad: producto.cantidad,
            precio_unitario: producto.precio_unitario,
            subtotal: producto.subtotal,
            sincronizado: false,
          });
        }
      }

      console.log("💾 Venta guardada localmente:", id_local);

      // Mostrar confirmación al usuario
      await Swal.fire({
        icon: "success",
        title: "Venta Guardada (Offline)",
        text: `La venta se guardó localmente y se sincronizará cuando haya conexión. ID: ${id_local}`,
        timer: 3000,
        showConfirmButton: false,
      });

      // Limpiar carrito incluso en modo offline
      dispatch(clearCart());

      return { success: true, id: id_local, es_local: true };
    } catch (error) {
      console.error("❌ Error en createSale:", error);

      await Swal.fire({
        icon: "error",
        title: "Error en Venta",
        text: error.message || "Error al procesar la venta",
        confirmButtonText: "Entendido",
      });

      return { success: false, error: error.message };
    }
  };
};

export const loadSales = (limite = 50, pagina = 1) => {
  return async (dispatch) => {
    console.log(`🔄 [SALES] Iniciando carga de ventas...`);
    dispatch({ type: types.salesStartLoading });

    try {
      const response = await fetchConToken(
        `ventas?limite=${limite}&pagina=${pagina}`
      );
      console.log("📦 [SALES] Respuesta del backend:", response);

      let ventas = [];

      if (response && response.ok === true && response.ventas) {
        ventas = response.ventas;
      }

      console.log(`✅ [SALES] ${ventas.length} ventas cargadas`);

      dispatch({
        type: types.salesLoad,
        payload: ventas,
      });

      return ventas;
    } catch (error) {
      console.error("❌ [SALES] Error cargando ventas:", error);
      dispatch({
        type: types.salesLoad,
        payload: [],
      });
      return [];
    }
  };
};

// Action para limpiar carrito (necesario para el código anterior)
export const clearCart = () => ({
  type: types.cartClear,
});
