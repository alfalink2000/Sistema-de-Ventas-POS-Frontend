import { useEffect } from "react";
import StockSyncController from "../controllers/offline/StockSyncController/StockSyncController";
import ClosuresSyncController from "../controllers/offline/ClosuresSyncController/ClosuresSyncController";
import Swal from "sweetalert2";
import { useDispatch } from "react-redux";
import {
  loadProductsFromIndexedDB,
  syncProductsFromServer,
} from "../actions/productsActions";

export const useSyncListener = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // =============================================
    // 🔄 MANEJADORES DE ACTUALIZACIÓN DE PRECIOS
    // =============================================
    const handlePriceUpdate = async (event) => {
      console.log("💰 [PRICE UPDATE] Evento recibido:", event.detail);

      // Recargar productos para reflejar cambios de precio
      dispatch(loadProductsFromIndexedDB());

      // Actualizar contadores en header
      window.dispatchEvent(new CustomEvent("price_changes_updated"));
    };

    // =============================================
    // 🌐 MANEJADORES DE CONEXIÓN - MEJORADO
    // =============================================
    const handleOnline = async () => {
      console.log(
        "🌐 Conexión restaurada - Iniciando sincronización automática..."
      );

      Swal.fire({
        icon: "success",
        title: "Conexión restaurada",
        text: "Sincronizando datos pendientes...",
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        position: "top-end",
        toast: true,
      });

      setTimeout(async () => {
        try {
          let totalSincronizados = 0;
          let resultados = {};

          // ✅ 1. SINCRONIZAR CAMBIOS DE PRECIO
          console.log(
            "🔄 [SYNC] Sincronizando cambios de precio pendientes..."
          );

          const PriceSyncController = await import(
            "../controllers/offline/PriceSyncController/PriceSyncController"
          ).then((module) => module.default);

          if (PriceSyncController) {
            resultados.prices =
              await PriceSyncController.syncPendingPriceChanges();

            if (resultados.prices.success) {
              totalSincronizados += resultados.prices.sincronizados || 0;
              console.log(
                `✅ ${resultados.prices.sincronizados} cambios de precio sincronizados`
              );
            }
          }

          // ✅ 2. SINCRONIZAR CAMBIOS DE STOCK
          console.log("🔄 [SYNC] Sincronizando cambios de stock pendientes...");
          resultados.stock =
            await StockSyncController.syncPendingStockChanges();

          if (resultados.stock.success) {
            totalSincronizados += resultados.stock.sincronizados || 0;
            console.log(
              `✅ ${resultados.stock.sincronizados} cambios de stock sincronizados`
            );
          }
          // ✅ 3. SINCRONIZAR CIERRES DE CAJA PENDIENTES (NUEVO)
          console.log("🔄 [SYNC] Sincronizando cierres de caja pendientes...");
          resultados.closures =
            await ClosuresSyncController.syncPendingClosures();

          if (resultados.closures.success) {
            totalSincronizados += resultados.closures.sincronizados || 0;
            console.log(
              `✅ ${resultados.closures.sincronizados} cierres sincronizados`
            );
          }
          // ✅ 4. MOSTRAR RESULTADO FINAL
          if (totalSincronizados > 0) {
            Swal.fire({
              icon: "success",
              title: "Sincronización Completada",
              html: `
          <div style="text-align: left;">
            <p><strong>Resumen de sincronización:</strong></p>
            <p>✅ Precios: ${
              resultados.prices?.sincronizados || 0
            } actualizados</p>
            <p>✅ Stock: ${
              resultados.stock?.sincronizados || 0
            } actualizados</p>
            <p>✅ Cierres: ${
              resultados.closures?.sincronizados || 0
            } sincronizados</p>
            <p><strong>Total: ${totalSincronizados} cambios sincronizados</strong></p>
          </div>
        `,
              confirmButtonText: "Entendido",
            });
          } else {
            Swal.fire({
              icon: "info",
              title: "Sin cambios pendientes",
              text: "No había datos pendientes para sincronizar",
              timer: 2000,
              showConfirmButton: false,
            });
          }

          // ✅ 4. RECARGAR DATOS LOCALES
          dispatch(loadProductsFromIndexedDB());
        } catch (error) {
          console.error("❌ Error en sincronización automática:", error);

          Swal.fire({
            icon: "error",
            title: "Error de sincronización",
            text: error.message || "No se pudieron sincronizar algunos datos",
            confirmButtonText: "Entendido",
          });
        }
      }, 2000);
    };

    // =============================================
    // 🎯 CONFIGURACIÓN DE EVENT LISTENERS - AGREGAR PRECIOS
    // =============================================
    console.log("🎯 [SYNC] Configurando listeners de sincronización...");

    // 🔄 Listeners de conexión
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 📦 Listeners de actualización de productos y precios
    window.addEventListener("product_updated", handleProductUpdate);
    window.addEventListener("price_updated", handlePriceUpdate); // ✅ NUEVO
    window.addEventListener(
      "products_force_refresh",
      handleProductsForceRefresh
    );

    // 🧹 CLEANUP FUNCTION - AGREGAR PRECIOS
    return () => {
      console.log("🧹 [SYNC] Limpiando listeners de sincronización...");

      // Limpiar listeners
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Limpiar listeners de productos y precios
      window.removeEventListener("product_updated", handleProductUpdate);
      window.removeEventListener("price_updated", handlePriceUpdate); // ✅ NUEVO
      window.removeEventListener(
        "products_force_refresh",
        handleProductsForceRefresh
      );
    };
  }, [dispatch]);
};

// ✅ EXPORT ADICIONAL PARA USO EN COMPONENTES
export const triggerManualSync = async (dispatch) => {
  try {
    if (!navigator.onLine) {
      throw new Error("No hay conexión a internet");
    }

    console.log("🔄 [SYNC] Sincronización manual iniciada...");

    Swal.fire({
      title: "Sincronizando...",
      html: "Procesando datos pendientes<br/><small>Por favor espera</small>",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    let resultados = {};
    let totalSincronizados = 0;

    // ✅ 1. SINCRONIZAR PRECIOS
    const PriceSyncController = await import(
      "../controllers/offline/PriceSyncController/PriceSyncController"
    ).then((module) => module.default);

    if (PriceSyncController) {
      resultados.prices = await PriceSyncController.syncPendingPriceChanges();
      if (resultados.prices.success) {
        totalSincronizados += resultados.prices.sincronizados || 0;
      }
    }

    // ✅ 2. SINCRONIZAR STOCK
    resultados.stock = await StockSyncController.syncPendingStockChanges();
    if (resultados.stock.success) {
      totalSincronizados += resultados.stock.sincronizados || 0;
    }

    Swal.close();

    // ✅ 3. MOSTRAR RESULTADOS DETALLADOS
    if (totalSincronizados > 0) {
      Swal.fire({
        icon: "success",
        title: "Sincronización Exitosa",
        html: `
          <div style="text-align: left;">
            <p><strong>Resumen de sincronización:</strong></p>
            <p>✅ <strong>Precios:</strong> ${
              resultados.prices?.sincronizados || 0
            } actualizados</p>
            <p>✅ <strong>Stock:</strong> ${
              resultados.stock?.sincronizados || 0
            } actualizados</p>
            <p>📊 <strong>Total:</strong> ${totalSincronizados} cambios sincronizados</p>
            ${
              resultados.prices?.fallidos > 0
                ? `<p>❌ <strong>Errores en precios:</strong> ${resultados.prices.fallidos}</p>`
                : ""
            }
            ${
              resultados.stock?.fallidos > 0
                ? `<p>❌ <strong>Errores en stock:</strong> ${resultados.stock.fallidos}</p>`
                : ""
            }
          </div>
        `,
        confirmButtonText: "Entendido",
      });
    } else {
      Swal.fire({
        icon: "info",
        title: "Sin cambios pendientes",
        text: "No se encontraron datos pendientes para sincronizar",
        confirmButtonText: "Entendido",
      });
    }

    // ✅ 4. ACTUALIZAR DATOS LOCALES
    if (dispatch && typeof dispatch === "function") {
      dispatch(loadProductsFromIndexedDB());
    }

    return {
      success: true,
      totalSincronizados,
      detalles: resultados,
    };
  } catch (error) {
    console.error("❌ Error en sincronización manual:", error);

    Swal.close();
    Swal.fire({
      icon: "error",
      title: "Error de Sincronización",
      text: error.message || "No se pudieron sincronizar los datos",
      confirmButtonText: "Entendido",
    });

    return {
      success: false,
      error: error.message,
    };
  }
};

export default useSyncListener;
