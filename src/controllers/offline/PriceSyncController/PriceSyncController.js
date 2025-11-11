// controllers/offline/PriceSyncController/PriceSyncController.js - VERSIÓN CORREGIDA

import IndexedDBService from "../../../services/IndexedDBService";
import { fetchConToken } from "../../../helpers/fetch";

class PriceSyncController {
  constructor() {
    this.storeName = "cambios_precios_pendientes";
  }

  // ✅ MÉTODO ESTÁTICO PARA OBTENER ESTADÍSTICAS
  static async getPendingStats() {
    try {
      const cambios = await IndexedDBService.getAll(
        "cambios_precios_pendientes"
      );
      const pendientes = cambios.filter((c) => !c.sincronizado);
      return {
        total: pendientes.length,
        pendientes: pendientes.length,
        con_errores: pendientes.filter((c) => c.ultimo_error).length,
        sincronizados: cambios.length - pendientes.length,
      };
    } catch (error) {
      console.error("❌ Error obteniendo stats de precios:", error);
      return { total: 0, pendientes: 0, con_errores: 0, sincronizados: 0 };
    }
  }

  // ✅ REGISTRAR CAMBIO DE PRECIO PENDIENTE (ESTÁTICO)
  static async registerPriceChange(productoId, priceData) {
    try {
      const cambio = {
        id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        producto_id: productoId,
        precio_anterior: priceData.precio_anterior,
        precio_nuevo: priceData.precio_nuevo,
        timestamp: new Date().toISOString(),
        sincronizado: false,
        intentos: 0,
        tipo: priceData.tipo || "ajuste_manual",
        motivo: priceData.motivo || "Ajuste manual",
        usuario: priceData.usuario || "Sistema",
      };

      await IndexedDBService.put("cambios_precios_pendientes", cambio);

      // ✅ EMITIR EVENTO SIMPLE
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("price_changes_updated"));
      }

      return { success: true, id: cambio.id };
    } catch (error) {
      console.error("❌ Error registrando cambio de precio:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ SINCRONIZAR CAMBIOS DE PRECIO PENDIENTES (ESTÁTICO)
  static async syncPendingPriceChanges() {
    try {
      console.log(
        "🔄 [PRICE SYNC] Sincronizando cambios de precio pendientes..."
      );

      if (!navigator.onLine) {
        return { success: false, error: "Sin conexión a internet" };
      }

      const pendingChanges = await IndexedDBService.getAll(
        "cambios_precios_pendientes"
      );
      const unsyncedChanges = pendingChanges.filter(
        (change) => !change.sincronizado
      );

      console.log(`📦 ${unsyncedChanges.length} cambios de precio pendientes`);

      if (unsyncedChanges.length === 0) {
        return {
          success: true,
          message: "No hay cambios de precio pendientes",
        };
      }

      let sincronizados = 0;
      let fallidos = 0;
      const resultados = [];

      for (const cambio of unsyncedChanges) {
        try {
          console.log(`🔄 Sincronizando cambio de precio: ${cambio.id}`, {
            producto_id: cambio.producto_id,
            precio_nuevo: cambio.precio_nuevo,
          });

          // ✅ OBTENER PRODUCTO PARA VERIFICACIÓN
          const producto = await IndexedDBService.get(
            "productos",
            cambio.producto_id
          );
          if (!producto) {
            throw new Error(
              `Producto ${cambio.producto_id} no encontrado localmente`
            );
          }

          // ✅ PREPARAR DATOS PARA ACTUALIZACIÓN
          const updateData = {
            precio: Number(cambio.precio_nuevo),
            precio_compra: Number(
              cambio.precio_compra_nuevo || cambio.precio_nuevo * 0.7
            ),
            motivo: cambio.motivo || "Sincronización automática",
            usuario: cambio.usuario || "Sistema",
          };

          console.log(
            `📤 Enviando actualización de precio para: ${producto.nombre}`,
            updateData
          );

          // ✅ ENVIAR AL SERVIDOR - USAR ENDPOINT CORRECTO
          const response = await fetchConToken(
            `productos/${cambio.producto_id}`,
            updateData,
            "PUT"
          );

          console.log("📨 Respuesta del servidor:", response);

          if (response && response.ok === true) {
            // ✅ MARCAR COMO SINCRONIZADO
            await IndexedDBService.put("cambios_precios_pendientes", {
              ...cambio,
              sincronizado: true,
              fecha_sincronizacion: new Date().toISOString(),
              id_servidor: response.producto?.id || cambio.id,
            });

            // ✅ ACTUALIZAR PRODUCTO EN CACHE LOCAL
            if (response.producto) {
              await IndexedDBService.put("productos", {
                ...response.producto,
                last_sync: new Date().toISOString(),
                sincronizado: true,
              });
            }

            sincronizados++;
            resultados.push({
              id: cambio.id,
              producto_id: cambio.producto_id,
              producto_nombre: producto.nombre,
              status: "success",
              message: "Precio sincronizado",
            });

            console.log(
              `✅ Precio sincronizado: ${producto.nombre} -> ${cambio.precio_nuevo}`
            );
          } else {
            throw new Error(
              response?.msg || response?.error || "Error del servidor"
            );
          }
        } catch (error) {
          fallidos++;
          resultados.push({
            id: cambio.id,
            producto_id: cambio.producto_id,
            status: "failed",
            error: error.message,
          });

          console.error(
            `❌ Error sincronizando precio ${cambio.producto_id}:`,
            error
          );

          // ✅ INCREMENTAR INTENTOS
          await IndexedDBService.put("cambios_precios_pendientes", {
            ...cambio,
            intentos: (cambio.intentos || 0) + 1,
            ultimo_error: error.message,
            ultimo_intento: new Date().toISOString(),
          });
        }
      }

      // ✅ LIMPIAR SINCRONIZADOS INMEDIATAMENTE DESPUÉS DEL SYNC
      if (sincronizados > 0) {
        setTimeout(async () => {
          await PriceSyncController.cleanupSyncedPriceChanges();
        }, 500);
      }

      return {
        success: fallidos === 0,
        sincronizados,
        fallidos,
        total: unsyncedChanges.length,
        resultados,
      };
    } catch (error) {
      console.error("❌ Error en syncPendingPriceChanges:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ LIMPIAR PENDIENTES SINCRONIZADOS (ESTÁTICO)
  static async cleanupSyncedPriceChanges() {
    try {
      const allChanges = await IndexedDBService.getAll(
        "cambios_precios_pendientes"
      );
      const synced = allChanges.filter((c) => c.sincronizado);

      for (const change of synced) {
        await IndexedDBService.delete("cambios_precios_pendientes", change.id);
      }

      return { success: true, deletedCount: synced.length };
    } catch (error) {
      console.error("❌ Error limpiando cambios:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ MÉTODO DE DEBUG PARA VERIFICAR ESTADO
  static async debugPriceChanges() {
    try {
      const allChanges = await IndexedDBService.getAll(
        "cambios_precios_pendientes"
      );

      console.log("🔍 DEBUG - Cambios de precio en IndexedDB:");
      console.log(`📊 Total: ${allChanges.length} registros`);

      const synced = allChanges.filter((c) => c.sincronizado);
      const unsynced = allChanges.filter((c) => !c.sincronizado);

      console.log(`✅ Sincronizados: ${synced.length}`);
      console.log(`⏳ Pendientes: ${unsynced.length}`);

      unsynced.forEach((change, index) => {
        console.log(`📋 Pendiente ${index + 1}:`, {
          id: change.id,
          producto_id: change.producto_id,
          precio_anterior: change.precio_anterior,
          precio_nuevo: change.precio_nuevo,
          intentos: change.intentos,
          timestamp: change.timestamp,
        });
      });

      return {
        total: allChanges.length,
        synced: synced.length,
        unsynced: unsynced.length,
        details: unsynced,
      };
    } catch (error) {
      console.error("❌ Error en debug:", error);
      return { error: error.message };
    }
  }
}

export default PriceSyncController;
