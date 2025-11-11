// controllers/offline/SalesSyncController/SalesSyncController.js
import { fetchConToken } from "../../../helpers/fetch";
import IndexedDBService from "../../../services/IndexedDBService";

class SalesSyncController {
  constructor() {
    this.name = "SalesSyncController";
  }

  // 📥 SINCRONIZAR DESDE EL SERVIDOR
  async syncFromServer() {
    try {
      console.log("📥 [SALES SYNC] Sincronizando ventas desde servidor...");

      const response = await fetchConToken("ventas?limite=1000");

      if (response && response.ok === true && response.ventas) {
        // Limpiar ventas existentes
        await IndexedDBService.clear("ventas");

        // Guardar nuevas ventas
        for (const venta of response.ventas) {
          await IndexedDBService.add("ventas", venta);
        }

        console.log(
          `✅ [SALES SYNC] ${response.ventas.length} ventas sincronizadas desde servidor`
        );
        return {
          success: true,
          synced: response.ventas.length,
          source: "server",
        };
      } else {
        throw new Error(response?.error || "Error en respuesta del servidor");
      }
    } catch (error) {
      console.error(
        "❌ [SALES SYNC] Error sincronizando desde servidor:",
        error
      );
      return {
        success: false,
        error: error.message,
        source: "server",
      };
    }
  }

  // 📤 SINCRONIZAR VENTAS PENDIENTES
  async syncPendingChanges() {
    try {
      console.log("📤 [SALES SYNC] Sincronizando ventas pendientes...");

      // Obtener ventas pendientes de sincronización
      const ventasPendientes = await IndexedDBService.getByIndex(
        "ventas_pendientes",
        "sincronizado",
        false
      );

      if (ventasPendientes.length === 0) {
        console.log(
          "✅ [SALES SYNC] No hay ventas pendientes para sincronizar"
        );
        return {
          success: true,
          synced: 0,
          pending: 0,
        };
      }

      console.log(
        `🔄 [SALES SYNC] ${ventasPendientes.length} ventas pendientes encontradas`
      );

      const results = {
        successful: [],
        failed: [],
        total: ventasPendientes.length,
      };

      // Sincronizar cada venta pendiente
      for (const venta of ventasPendientes) {
        try {
          // Preparar datos para el servidor (remover campos locales)
          const ventaParaServidor = {
            ...venta,
            // Remover campos específicos de local
            id_local: undefined,
            sincronizado: undefined,
            syncInProgress: undefined,
            retryCount: undefined,
          };

          // Enviar al servidor
          const response = await fetchConToken(
            "ventas",
            ventaParaServidor,
            "POST"
          );

          if (response && response.ok === true) {
            // Marcar como sincronizada en IndexedDB
            await IndexedDBService.update("ventas_pendientes", venta.id_local, {
              sincronizado: true,
              sincronizado_en: new Date().toISOString(),
              id_servidor: response.venta?.id,
            });

            // También guardar en el store de ventas sincronizadas
            if (response.venta) {
              await IndexedDBService.add("ventas", response.venta);
            }

            results.successful.push({
              id_local: venta.id_local,
              id_servidor: response.venta?.id,
            });

            console.log(`✅ Venta ${venta.id_local} sincronizada exitosamente`);
          } else {
            throw new Error(response?.error || "Error del servidor");
          }
        } catch (error) {
          console.error(
            `❌ Error sincronizando venta ${venta.id_local}:`,
            error
          );

          // Incrementar contador de reintentos
          const retryCount = (venta.retryCount || 0) + 1;
          await IndexedDBService.update("ventas_pendientes", venta.id_local, {
            retryCount,
            lastError: error.message,
            lastRetry: new Date().toISOString(),
          });

          results.failed.push({
            id_local: venta.id_local,
            error: error.message,
            retryCount,
          });
        }
      }

      console.log(`🎉 [SALES SYNC] Sincronización completada:`, {
        exitosas: results.successful.length,
        fallidas: results.failed.length,
        total: results.total,
      });

      return {
        success: results.failed.length === 0,
        synced: results.successful.length,
        failed: results.failed.length,
        total: results.total,
        details: results,
      };
    } catch (error) {
      console.error(
        "❌ [SALES SYNC] Error en sincronización de ventas pendientes:",
        error
      );
      return {
        success: false,
        error: error.message,
        synced: 0,
        failed: 0,
        total: 0,
      };
    }
  }

  // 🔢 OBTENER CONTEO DE PENDIENTES
  async getPendingCount() {
    try {
      const ventasPendientes = await IndexedDBService.getByIndex(
        "ventas_pendientes",
        "sincronizado",
        false
      );

      const conErrores = ventasPendientes.filter((v) => v.retryCount > 0);
      const nuevos = ventasPendientes.filter(
        (v) => !v.retryCount || v.retryCount === 0
      );

      return {
        pending: ventasPendientes.length,
        withErrors: conErrores.length,
        new: nuevos.length,
        total: ventasPendientes.length,
      };
    } catch (error) {
      console.error(
        "❌ [SALES SYNC] Error obteniendo conteo pendiente:",
        error
      );
      return {
        pending: 0,
        withErrors: 0,
        new: 0,
        total: 0,
        error: error.message,
      };
    }
  }

  // 🕐 OBTENER ÚLTIMA SINCRONIZACIÓN
  async getLastSync() {
    try {
      const metadata = await IndexedDBService.get(
        "sync_metadata",
        "last_sync_sales"
      );

      if (metadata) {
        return {
          timestamp: metadata.timestamp,
          success: metadata.success,
          synced: metadata.synced || 0,
        };
      }

      // Buscar la última venta sincronizada
      const ventasSincronizadas = await IndexedDBService.getByIndex(
        "ventas_pendientes",
        "sincronizado",
        true
      );

      if (ventasSincronizadas.length > 0) {
        const ultimaSincronizada = ventasSincronizadas
          .filter((v) => v.sincronizado_en)
          .sort(
            (a, b) => new Date(b.sincronizado_en) - new Date(a.sincronizado_en)
          )[0];

        if (ultimaSincronizada) {
          return {
            timestamp: ultimaSincronizada.sincronizado_en,
            success: true,
            synced: ventasSincronizadas.length,
          };
        }
      }

      return {
        timestamp: null,
        success: false,
        synced: 0,
      };
    } catch (error) {
      console.error(
        "❌ [SALES SYNC] Error obteniendo última sincronización:",
        error
      );
      return {
        timestamp: null,
        success: false,
        synced: 0,
        error: error.message,
      };
    }
  }

  // 🧹 LIMPIAR DATOS SINCRONIZADOS
  async cleanupSynced() {
    try {
      console.log("🧹 [SALES SYNC] Limpiando ventas sincronizadas...");

      // Obtener ventas ya sincronizadas
      const ventasSincronizadas = await IndexedDBService.getByIndex(
        "ventas_pendientes",
        "sincronizado",
        true
      );

      let cleaned = 0;

      // Eliminar ventas sincronizadas (opcional - puedes mantenerlas como historial)
      for (const venta of ventasSincronizadas) {
        // Solo eliminar si tienen más de 1 día sincronizadas (para seguridad)
        const sincronizadoHace = new Date() - new Date(venta.sincronizado_en);
        const unDiaEnMs = 24 * 60 * 60 * 1000;

        if (sincronizadoHace > unDiaEnMs) {
          await IndexedDBService.delete("ventas_pendientes", venta.id_local);
          cleaned++;
        }
      }

      console.log(`✅ [SALES SYNC] ${cleaned} ventas sincronizadas limpiadas`);
      return {
        cleaned,
        total: ventasSincronizadas.length,
      };
    } catch (error) {
      console.error(
        "❌ [SALES SYNC] Error limpiando datos sincronizados:",
        error
      );
      return {
        cleaned: 0,
        total: 0,
        error: error.message,
      };
    }
  }

  // 🔍 OBTENER ESTADO DETALLADO
  async getDetailedStatus() {
    try {
      const [pendientes, sincronizadas, ultimaSync] = await Promise.all([
        this.getPendingCount(),
        IndexedDBService.count("ventas"),
        this.getLastSync(),
      ]);

      return {
        pendientes,
        sincronizadas: {
          total: sincronizadas,
          store: "ventas",
        },
        ultimaSincronizacion: ultimaSync,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        "❌ [SALES SYNC] Error obteniendo estado detallado:",
        error
      );
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default SalesSyncController;
