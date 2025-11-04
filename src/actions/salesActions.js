// actions/salesActions.js - VERSIÓN CORREGIDA

import { types } from "../types/types";
import { fetchConToken } from "../helpers/fetch";
import Swal from "sweetalert2";
import SalesOfflineController from "../controllers/offline/SalesOfflineController/SalesOfflineController";
import ProductsOfflineController from "../controllers/offline/ProductsOfflineController/ProductsOfflineController";
import IndexedDBService from "../services/IndexedDBService";
// ✅ FUNCIÓN AUXILIAR PARA ACTUALIZAR STOCK (AGREGAR ESTA FUNCIÓN)

// ✅ FUNCIÓN PARA GUARDAR VENTA OFFLINE (AGREGAR ESTA FUNCIÓN)
// ✅ FUNCIÓN PARA GUARDAR VENTA OFFLINE (AGREGAR ESTA FUNCIÓN)
// ✅ FUNCIÓN PARA GUARDAR VENTA OFFLINE
const saveSaleOffline = async (saleData) => {
  try {
    console.log("📱 [SALES] Guardando venta offline...", saleData);

    const id_local = `venta_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const ventaPendiente = {
      id_local: id_local,
      ...saleData,
      sincronizado: false,
      fecha_venta: new Date().toISOString(),
      timestamp: Date.now(),
      es_local: true,
    };

    // Guardar venta principal
    await IndexedDBService.add("ventas_pendientes", ventaPendiente);
    console.log("✅ [SALES] Venta guardada en IndexedDB:", id_local);

    return ventaPendiente;
  } catch (error) {
    console.error("❌ [SALES] Error guardando venta offline:", error);
    throw new Error(`Error guardando venta offline: ${error.message}`);
  }
};

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
      const ventasPendientes = await SalesOfflineController.getPendingSales();

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
        const ventasPendientes = await SalesOfflineController.getPendingSales();

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

// ✅ CREAR VENTA - VERSIÓN CORREGIDA
// ✅ FUNCIÓN PRINCIPAL CREATE SALE CORREGIDA
// ✅ FUNCIÓN PRINCIPAL CREATE SALE CORREGIDA
// ✅ FUNCIÓN PRINCIPAL CREATE SALE MEJORADA
// salesActions.js - CORREGIR DUPLICACIÓN DE STOCK
export const createSale = (saleData) => {
  return async (dispatch) => {
    try {
      console.log("🔄 [SALES] Creando venta...");

      // ✅ SOLUCIÓN: Control centralizado de stock
      let stockActualizado = false;

      if (navigator.onLine) {
        // Online: servidor maneja el stock
        const response = await fetchConToken("ventas", saleData, "POST");
        if (response.ok) {
          // No actualizar stock aquí - el servidor ya lo hizo
          dispatch({ type: types.saleAddNew, payload: response.venta });
          return { success: true, venta: response.venta };
        }
      } else {
        // Offline: actualizar stock UNA SOLA VEZ
        if (!stockActualizado) {
          await updateStockAfterSale(saleData.productos);
          stockActualizado = true;

          const resultado = await SalesOfflineController.createSaleOffline(
            saleData
          );
          dispatch({ type: types.saleAddNew, payload: resultado.venta });
          return { success: true, venta: resultado.venta };
        }
      }
    } catch (error) {
      console.error("❌ Error creando venta:", error);
      return { success: false, error: error.message };
    }
  };
};

// ✅ FUNCIÓN PARA ACTUALIZAR STOCK DESPUÉS DE VENTA
// ✅ FUNCIÓN PARA ACTUALIZAR STOCK DESPUÉS DE VENTA
// ✅ FUNCIÓN CORREGIDA PARA ACTUALIZAR STOCK (COMPATIBLE)
// salesActions.js - FUNCIÓN MEJORADA DE ACTUALIZACIÓN DE STOCK
const updateStockAfterSale = async (productos) => {
  try {
    console.log(
      "🔄 [STOCK] Actualizando stock después de venta offline...",
      productos
    );

    const actualizaciones = [];

    for (const item of productos) {
      try {
        console.log(`🔍 Actualizando stock para: ${item.producto_id}`);

        const product = await IndexedDBService.get(
          "productos",
          item.producto_id
        );

        if (product) {
          const stockActual = parseInt(product.stock) || 0;
          const cantidadVendida = parseInt(item.cantidad) || 0;

          if (cantidadVendida <= 0) {
            console.log(
              `⚠️ Cantidad inválida para ${product.nombre}: ${cantidadVendida}`
            );
            continue;
          }

          const nuevoStock = Math.max(0, stockActual - cantidadVendida);

          console.log(
            `📊 Stock cálculo: ${stockActual} - ${cantidadVendida} = ${nuevoStock}`
          );

          // ✅ REGISTRAR LA ACTUALIZACIÓN
          actualizaciones.push({
            producto_id: item.producto_id,
            nombre: product.nombre,
            stock_anterior: stockActual,
            cantidad_vendida: cantidadVendida,
            stock_nuevo: nuevoStock,
          });

          // ✅ ACTUALIZAR EN INDEXEDDB
          if (typeof IndexedDBService.update === "function") {
            await IndexedDBService.update("productos", item.producto_id, {
              stock: nuevoStock,
              ultima_actualizacion: new Date().toISOString(),
            });
          } else {
            // Fallback: eliminar y agregar
            await IndexedDBService.delete("productos", item.producto_id);
            await IndexedDBService.add("productos", {
              ...product,
              stock: nuevoStock,
              ultima_actualizacion: new Date().toISOString(),
            });
          }

          console.log(
            `✅ Stock actualizado: ${product.nombre} -> ${nuevoStock}`
          );
        } else {
          console.error(`❌ Producto no encontrado: ${item.producto_id}`);
        }
      } catch (error) {
        console.error(
          `❌ Error actualizando stock de ${item.producto_id}:`,
          error
        );
      }
    }

    console.log("📊 RESUMEN ACTUALIZACIONES:", actualizaciones);
    console.log(
      `✅ [STOCK] ${actualizaciones.length} productos actualizados correctamente`
    );
  } catch (error) {
    console.error("❌ [STOCK] Error general actualizando stock:", error);
  }
};

// ✅ FUNCIÓN DE VALIDACIÓN DE STOCK CORREGIDA
// ✅ FUNCIÓN DE VALIDACIÓN DE STOCK CORREGIDA
// ✅ FUNCIÓN DE VALIDACIÓN DE STOCK CORREGIDA
const validateStockForSale = async (productos) => {
  try {
    console.log("🔍 [VALIDATE STOCK] Validando productos:", productos);

    const errores = [];
    const resultados = [];

    for (const item of productos) {
      try {
        console.log(`🔍 Buscando producto: ${item.producto_id}`);

        // ✅ BUSCAR PRODUCTO EN INDEXEDDB
        const product = await IndexedDBService.get(
          "productos",
          item.producto_id
        );

        console.log(`📦 Resultado búsqueda:`, product);

        if (!product) {
          const errorMsg = `Producto ${item.producto_id} no encontrado`;
          console.error(`❌ ${errorMsg}`);
          errores.push(errorMsg);
          resultados.push({
            producto_id: item.producto_id,
            valido: false,
            error: errorMsg,
          });
          continue;
        }

        console.log(
          `✅ Producto encontrado: ${product.nombre}, Stock: ${product.stock}`
        );

        // ✅ VALIDAR STOCK
        const stockDisponible = parseInt(product.stock) || 0;
        const cantidadRequerida = parseInt(item.cantidad) || 0;

        if (stockDisponible < cantidadRequerida) {
          const errorMsg = `${product.nombre}: Stock insuficiente (${stockDisponible} disponible, ${cantidadRequerida} requerido)`;
          console.error(`❌ ${errorMsg}`);
          errores.push(errorMsg);
          resultados.push({
            producto_id: item.producto_id,
            producto_nombre: product.nombre,
            valido: false,
            stock_disponible: stockDisponible,
            cantidad_requerida: cantidadRequerida,
            error: "Stock insuficiente",
          });
        } else {
          console.log(`✅ Stock suficiente: ${product.nombre}`);
          resultados.push({
            producto_id: item.producto_id,
            producto_nombre: product.nombre,
            valido: true,
            stock_disponible: stockDisponible,
            cantidad_requerida: cantidadRequerida,
            stock_restante: stockDisponible - cantidadRequerida,
          });
        }
      } catch (error) {
        const errorMsg = `Error validando producto ${item.producto_id}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errores.push(errorMsg);
        resultados.push({
          producto_id: item.producto_id,
          valido: false,
          error: error.message,
        });
      }
    }

    return {
      valid: errores.length === 0,
      errors: errores,
      results: resultados,
    };
  } catch (error) {
    console.error("❌ [VALIDATE STOCK] Error general:", error);
    return {
      valid: false,
      errors: [error.message],
      results: [],
    };
  }
};
// ✅ OBTENER VENTAS PENDIENTES DE SINCRONIZACIÓN
export const loadPendingSales = () => {
  return async (dispatch) => {
    try {
      console.log("🔄 [SALES] Cargando ventas pendientes...");

      const ventasPendientes = await SalesOfflineController.getPendingSales();

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
// ✅ VERSIÓN ALTERNATIVA SI IndexedDBService NO TIENE UPDATE
const updateStockAfterSaleAlternative = async (productos) => {
  try {
    console.log("🔄 [STOCK] Actualizando stock (método alternativo)...");

    for (const item of productos) {
      try {
        const product = await IndexedDBService.get(
          "productos",
          item.producto_id
        );

        if (product) {
          const nuevoStock = Math.max(
            0,
            (parseInt(product.stock) || 0) - (parseInt(item.cantidad) || 0)
          );

          // ✅ MÉTODO COMPATIBLE: Eliminar y volver a agregar
          await IndexedDBService.delete("productos", item.producto_id);
          await IndexedDBService.add("productos", {
            ...product,
            stock: nuevoStock,
            ultima_actualizacion: new Date().toISOString(),
          });

          console.log(
            `✅ Stock actualizado (alt): ${product.nombre} -> ${nuevoStock}`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error actualizando stock (alt) de ${item.producto_id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("❌ [STOCK] Error general (alt):", error);
  }
};
// ✅ SINCRONIZAR VENTAS PENDIENTES MANUALMENTE
// ✅ FUNCIÓN PARA SINCRONIZAR QUE ACTUALICE STOCK EN SERVIDOR
export const syncPendingSales = () => {
  return async (dispatch) => {
    try {
      if (!navigator.onLine) {
        throw new Error("No hay conexión a internet");
      }

      console.log("🔄 [SYNC] Sincronizando ventas pendientes...");

      // 1. Obtener ventas pendientes
      const ventasPendientes = await IndexedDBService.getAll(
        "ventas_pendientes"
      );
      console.log(
        `📦 Ventas pendientes a sincronizar: ${ventasPendientes.length}`
      );

      let exitosas = 0;
      let fallidas = 0;

      for (const venta of ventasPendientes) {
        try {
          console.log(`🔄 Sincronizando venta: ${venta.id_local}`);

          // 2. Enviar venta al servidor
          const response = await fetchConToken(
            "ventas",
            {
              ...venta,
              id_local: venta.id_local, // Incluir referencia local
            },
            "POST"
          );

          if (response && response.ok === true) {
            // 3. Si éxito, eliminar venta pendiente y actualizar stock en servidor
            await IndexedDBService.delete("ventas_pendientes", venta.id_local);
            exitosas++;
            console.log(`✅ Venta sincronizada: ${venta.id_local}`);
          } else {
            fallidas++;
            console.error(`❌ Error sincronizando venta: ${response?.error}`);
          }
        } catch (error) {
          fallidas++;
          console.error(
            `❌ Error sincronizando venta ${venta.id_local}:`,
            error
          );
        }
      }

      // 4. Recargar ventas después de sincronizar
      dispatch(loadSales());

      return {
        success: exitosas > 0 || fallidas === 0,
        exitosas,
        fallidas,
        total: ventasPendientes.length,
      };
    } catch (error) {
      console.error("❌ [SYNC] Error sincronizando ventas:", error);
      throw error;
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
        const ventasPendientes = await SalesOfflineController.getPendingSales();
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
