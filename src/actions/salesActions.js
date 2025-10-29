// src/actions/salesActions.js - VERSIÓN COMPLETAMENTE CORREGIDA
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

      // ✅ OBTENER SESIÓN ACTIVA DEL STATE
      const { sesionesCaja, auth } = getState();
      const { sesionAbierta } = sesionesCaja;
      const { user } = auth;

      console.log("📋 Sesión activa encontrada:", sesionAbierta);

      if (!sesionAbierta) {
        throw new Error(
          "No hay una sesión de caja activa. Abre una sesión primero."
        );
      }

      // Generar ID local único
      const id_local = `local_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // ✅ DATOS COMPLETOS CON REFERENCIA A SESIÓN
      const saleWithLocalId = {
        ...saleData,
        id_local,
        sincronizado: false,
        es_local: true,
        fecha_creacion: new Date().toISOString(),
        // ✅ REFERENCIA CRÍTICA A LA SESIÓN
        sesion_caja_id: sesionAbierta.id, // ID del servidor (si existe)
        sesion_caja_id_local: sesionAbierta.id_local || sesionAbierta.id, // ID local
        vendedor_id: user.id,
        vendedor_nombre: user.nombre || user.username,
        estado: "completada",
        fecha_venta: new Date().toISOString(),
      };

      console.log("💾 Datos de venta a guardar:", {
        sesion_caja_id: saleWithLocalId.sesion_caja_id,
        sesion_caja_id_local: saleWithLocalId.sesion_caja_id_local,
        total: saleWithLocalId.total,
        productos: saleWithLocalId.productos?.length,
      });

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

      // ✅ GUARDAR VENTA OFFLINE CON REFERENCIA A SESIÓN
      console.log("💾 Guardando venta offline en IndexedDB...");
      await IndexedDBService.add("ventas_pendientes", saleWithLocalId);

      // ✅ GUARDAR DETALLES DE VENTA
      if (saleData.productos && saleData.productos.length > 0) {
        console.log(
          `📦 Guardando ${saleData.productos.length} detalles de venta...`
        );

        for (const producto of saleData.productos) {
          const detalleVenta = {
            venta_id_local: id_local,
            producto_id: producto.producto_id,
            cantidad: producto.cantidad,
            precio_unitario: producto.precio_unitario,
            subtotal: producto.subtotal,
            sincronizado: false,
            fecha_creacion: new Date().toISOString(),
          };

          await IndexedDBService.add("detalles_venta_pendientes", detalleVenta);
          console.log(
            `✅ Detalle guardado: ${producto.producto_id} x ${producto.cantidad}`
          );
        }
      }

      console.log("💾 Venta guardada localmente:", {
        id_local,
        sesion: saleWithLocalId.sesion_caja_id_local,
        total: saleWithLocalId.total,
      });

      // Mostrar confirmación al usuario
      await Swal.fire({
        icon: "success",
        title: "Venta Guardada (Offline)",
        text: `La venta se guardó localmente y se sincronizará cuando haya conexión. Total: $${saleData.total}`,
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

// ... el resto de las acciones se mantienen igual ...
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
