// controllers/offline/ProductsSyncController/ProductsSyncController.js
import IndexedDBService from "../../../services/IndexedDBService";
import { fetchConToken } from "../../../helpers/fetch";

class ProductsSyncController {
  constructor() {
    this.storeName = "productos";
    this.pendingStoreName = "productos_pendientes";
  }

  // 📥 SINCRONIZAR DESDE SERVIDOR
  async syncFromServer() {
    try {
      console.log("🔄 [PRODUCTS SYNC] Sincronizando desde servidor...");

      const response = await fetchConToken("productos?limite=1000");

      if (!response.ok) {
        throw new Error(response.error || "Error del servidor");
      }

      const productos = response.productos || [];

      // Limpiar y guardar nuevos productos
      await IndexedDBService.clear(this.storeName);

      for (const producto of productos) {
        await IndexedDBService.add(this.storeName, {
          ...producto,
          sincronizado: true,
          last_sync: new Date().toISOString(),
        });
      }

      console.log(
        `✅ [PRODUCTS SYNC] ${productos.length} productos sincronizados desde servidor`
      );

      return {
        success: true,
        count: productos.length,
        source: "server",
      };
    } catch (error) {
      console.error(
        "❌ [PRODUCTS SYNC] Error sincronizando desde servidor:",
        error
      );
      return {
        success: false,
        error: error.message,
        source: "server",
      };
    }
  }
  // En ProductsSyncController.js - AGREGAR
  // En ProductsSyncController.js - AGREGAR
  async syncPendingStockChanges() {
    try {
      console.log(
        "🔄 [STOCK SYNC] Sincronizando cambios de stock pendientes..."
      );

      if (!navigator.onLine) {
        return { success: false, error: "Sin conexión a internet" };
      }

      // Obtener cambios de stock pendientes
      const cambiosPendientes = await IndexedDBService.getAll(
        "cambios_stock_pendientes"
      );
      const cambiosNoSincronizados = cambiosPendientes.filter(
        (c) => !c.sincronizado
      );

      console.log(
        `📦 ${cambiosNoSincronizados.length} cambios de stock pendientes`
      );

      if (cambiosNoSincronizados.length === 0) {
        return { success: true, message: "No hay cambios de stock pendientes" };
      }

      let sincronizados = 0;
      let fallidos = 0;
      const resultados = [];

      for (const cambio of cambiosNoSincronizados) {
        try {
          console.log(
            `🔄 Sincronizando cambio de stock: ${cambio.producto_id}`
          );

          const stockData = {
            stock: cambio.stock_nuevo,
            motivo: cambio.motio,
            adminPassword: "", // Puedes manejar esto según tu lógica
          };

          const response = await fetchConToken(
            `productos/${cambio.producto_id}/stock`,
            stockData,
            "PUT"
          );

          if (response && response.ok === true) {
            // Marcar como sincronizado
            await IndexedDBService.put("cambios_stock_pendientes", {
              ...cambio,
              sincronizado: true,
              fecha_sincronizacion: new Date().toISOString(),
            });

            sincronizados++;
            resultados.push({
              producto_id: cambio.producto_id,
              status: "success",
              message: "Stock sincronizado",
            });

            console.log(`✅ Stock sincronizado: ${cambio.producto_id}`);
          } else {
            throw new Error(response?.msg || "Error del servidor");
          }
        } catch (error) {
          fallidos++;
          resultados.push({
            producto_id: cambio.producto_id,
            status: "failed",
            error: error.message,
          });

          console.error(
            `❌ Error sincronizando stock ${cambio.producto_id}:`,
            error
          );

          // Incrementar intentos
          await IndexedDBService.put("cambios_stock_pendientes", {
            ...cambio,
            intentos: (cambio.intentos || 0) + 1,
            ultimo_error: error.message,
            ultimo_intento: new Date().toISOString(),
          });
        }
      }

      return {
        success: fallidos === 0,
        sincronizados,
        fallidos,
        total: cambiosNoSincronizados.length,
        resultados,
      };
    } catch (error) {
      console.error("❌ Error en syncPendingStockChanges:", error);
      return { success: false, error: error.message };
    }
  }

  // En ProductsSyncController.js - AGREGAR
  async syncPendingStockChanges() {
    try {
      console.log(
        "🔄 [STOCK SYNC] Sincronizando cambios de stock pendientes..."
      );

      if (!navigator.onLine) {
        return { success: false, error: "Sin conexión a internet" };
      }

      // Obtener cambios de stock pendientes
      const cambiosPendientes = await IndexedDBService.getAll(
        "cambios_stock_pendientes"
      );
      const cambiosNoSincronizados = cambiosPendientes.filter(
        (c) => !c.sincronizado
      );

      console.log(
        `📦 ${cambiosNoSincronizados.length} cambios de stock pendientes`
      );

      if (cambiosNoSincronizados.length === 0) {
        return { success: true, message: "No hay cambios de stock pendientes" };
      }

      let sincronizados = 0;
      let fallidos = 0;
      const resultados = [];

      for (const cambio of cambiosNoSincronizados) {
        try {
          console.log(
            `🔄 Sincronizando cambio de stock: ${cambio.producto_id}`
          );

          const stockData = {
            stock: cambio.stock_nuevo,
            motivo: cambio.motivo,
            adminPassword: "", // Puedes manejar esto según tu lógica
          };

          const response = await fetchConToken(
            `productos/${cambio.producto_id}/stock`,
            stockData,
            "PUT"
          );

          if (response && response.ok === true) {
            // Marcar como sincronizado
            await IndexedDBService.put("cambios_stock_pendientes", {
              ...cambio,
              sincronizado: true,
              fecha_sincronizacion: new Date().toISOString(),
            });

            sincronizados++;
            resultados.push({
              producto_id: cambio.producto_id,
              status: "success",
              message: "Stock sincronizado",
            });

            console.log(`✅ Stock sincronizado: ${cambio.producto_id}`);
          } else {
            throw new Error(response?.msg || "Error del servidor");
          }
        } catch (error) {
          fallidos++;
          resultados.push({
            producto_id: cambio.producto_id,
            status: "failed",
            error: error.message,
          });

          console.error(
            `❌ Error sincronizando stock ${cambio.producto_id}:`,
            error
          );

          // Incrementar intentos
          await IndexedDBService.put("cambios_stock_pendientes", {
            ...cambio,
            intentos: (cambio.intentos || 0) + 1,
            ultimo_error: error.message,
            ultimo_intento: new Date().toISOString(),
          });
        }
      }

      return {
        success: fallidos === 0,
        sincronizados,
        fallidos,
        total: cambiosNoSincronizados.length,
        resultados,
      };
    } catch (error) {
      console.error("❌ Error en syncPendingStockChanges:", error);
      return { success: false, error: error.message };
    }
  }
  // 📤 SINCRONIZAR CAMBIOS PENDIENTES
  async syncPendingChanges() {
    try {
      console.log("🔄 [PRODUCTS SYNC] Sincronizando cambios pendientes...");

      // Obtener productos pendientes
      const productosPendientes = await IndexedDBService.getByIndex(
        this.storeName,
        "sincronizado",
        false
      );

      if (productosPendientes.length === 0) {
        return {
          success: true,
          count: 0,
          message: "No hay cambios pendientes",
        };
      }

      let exitosos = 0;
      let fallidos = 0;
      const resultados = [];

      for (const producto of productosPendientes) {
        try {
          let result;

          if (producto.id && producto.id.startsWith("prod_")) {
            // Actualizar producto existente
            result = await fetchConToken(
              `productos/${producto.id}`,
              producto,
              "PUT"
            );
          } else {
            // Crear nuevo producto
            result = await fetchConToken("productos", producto, "POST");
          }

          if (result && result.ok) {
            // Marcar como sincronizado
            await IndexedDBService.put(this.storeName, {
              ...producto,
              sincronizado: true,
              last_sync: new Date().toISOString(),
              id: result.producto?.id || producto.id, // Usar ID del servidor si existe
            });

            exitosos++;
            resultados.push({ id: producto.id, status: "success" });
          } else {
            throw new Error(result?.error || "Error del servidor");
          }
        } catch (error) {
          fallidos++;
          resultados.push({
            id: producto.id,
            status: "failed",
            error: error.message,
          });
          console.error(
            `❌ Error sincronizando producto ${producto.id}:`,
            error
          );
        }
      }

      console.log(
        `✅ [PRODUCTS SYNC] Sincronización completada: ${exitosos} exitosos, ${fallidos} fallidos`
      );

      return {
        success: exitosos > 0 || fallidos === 0,
        exitosos,
        fallidos,
        total: productosPendientes.length,
        resultados,
      };
    } catch (error) {
      console.error(
        "❌ [PRODUCTS SYNC] Error sincronizando cambios pendientes:",
        error
      );
      return {
        success: false,
        error: error.message,
        exitosos: 0,
        fallidos: 0,
        total: 0,
      };
    }
  }

  // 🔢 OBTENER CONTEO DE PENDIENTES
  async getPendingCount() {
    try {
      const pendientes = await IndexedDBService.getByIndex(
        this.storeName,
        "sincronizado",
        false
      );

      return {
        total: pendientes.length,
        porTipo: {
          nuevos: pendientes.filter((p) => !p.id || !p.id.startsWith("prod_"))
            .length,
          actualizaciones: pendientes.filter(
            (p) => p.id && p.id.startsWith("prod_")
          ).length,
        },
      };
    } catch (error) {
      console.error("❌ Error obteniendo conteo de pendientes:", error);
      return { total: 0, error: error.message };
    }
  }

  // 📅 OBTENER ÚLTIMA SINCRONIZACIÓN
  async getLastSync() {
    try {
      const metadata = await IndexedDBService.get(
        "sync_metadata",
        "last_products_sync"
      );
      return metadata || null;
    } catch (error) {
      return null;
    }
  }

  // 🧹 LIMPIAR DATOS SINCRONIZADOS
  async cleanupSynced() {
    try {
      // Por ahora no limpiamos productos sincronizados, los mantenemos para offline
      // Podríamos limpiar productos muy antiguos si es necesario
      return {
        success: true,
        message: "No se requiere limpieza para productos",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 🔄 SINCRONIZAR STOCK PENDIENTE
  async syncPendingStock() {
    try {
      console.log("🔄 [PRODUCTS SYNC] Sincronizando cambios de stock...");

      const productos = await IndexedDBService.getAll(this.storeName);
      const productosConStockModificado = productos.filter(
        (p) => p.stock !== p.stock_servidor && p.sincronizado
      );

      if (productosConStockModificado.length === 0) {
        return { success: true, count: 0 };
      }

      let exitosos = 0;

      for (const producto of productosConStockModificado) {
        try {
          await fetchConToken(
            `productos/${producto.id}/stock`,
            { stock: producto.stock },
            "PUT"
          );

          // Actualizar stock_servidor para marcar como sincronizado
          await IndexedDBService.put(this.storeName, {
            ...producto,
            stock_servidor: producto.stock,
          });

          exitosos++;
        } catch (error) {
          console.error(
            `❌ Error sincronizando stock de ${producto.id}:`,
            error
          );
        }
      }

      return {
        success: true,
        count: exitosos,
        total: productosConStockModificado.length,
      };
    } catch (error) {
      console.error("❌ Error sincronizando stock:", error);
      return { success: false, error: error.message };
    }
  }
}

export default ProductsSyncController;
