// controllers/offline/StockSyncController/StockSyncController.js - VERSIÓN COMPLETAMENTE CORREGIDA
import IndexedDBService from "../../../services/IndexedDBService";
import { fetchConToken } from "../../../helpers/fetch";

class StockSyncController {
  constructor() {
    this.storeName = "cambios_stock_pendientes";
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      console.log(
        `🔄 Inicializando StockSyncController para store: ${this.storeName}`
      );

      // ✅ FORZAR INICIALIZACIÓN COMPLETA
      await IndexedDBService.init();

      // ✅ VERIFICAR QUE EL STORE EXISTE
      const exists = await IndexedDBService.storeExists(this.storeName);
      console.log(`📊 Store ${this.storeName} existe: ${exists}`);

      if (!exists) {
        console.error(
          `❌ Store ${this.storeName} NO EXISTE. Se necesita recargar la aplicación.`
        );
        return false;
      }

      this.initialized = true;
      console.log(`✅ StockSyncController inicializado correctamente`);
      return true;
    } catch (error) {
      console.error("❌ Error inicializando StockSyncController:", error);
      return false;
    }
  }

  // ✅ REGISTRAR CAMBIO DE STOCK - VERSIÓN COMPLETAMENTE CORREGIDA
  async registerStockChange(productoId, stockData) {
    try {
      console.log(
        `📝 [STOCK SYNC] Intentando registrar cambio para producto: ${productoId}`,
        stockData
      );

      if (!this.initialized) {
        console.log("🔄 StockSyncController no inicializado, inicializando...");
        const initResult = await this.init();
        if (!initResult) {
          throw new Error("No se pudo inicializar StockSyncController");
        }
      }

      // ✅ CREAR OBJETO DE CAMBIO COMPLETO
      const cambioStock = {
        id: `stock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        producto_id: productoId,
        stock_anterior: stockData.stock_anterior,
        stock_nuevo: stockData.stock_nuevo,
        tipo: stockData.tipo || "ajuste_manual",
        motivo: stockData.motivo || "Ajuste manual",
        usuario: stockData.usuario || "Sistema",
        timestamp: new Date().toISOString(),
        sincronizado: false,
        intentos: 0,
        ultimo_error: null,
        fecha_creacion: new Date().toISOString(),
      };

      console.log(`💾 Preparando para guardar cambio:`, cambioStock);

      // ✅ VERIFICAR QUE EL STORE EXISTE ANTES DE GUARDAR
      const storeExists = await IndexedDBService.storeExists(this.storeName);
      if (!storeExists) {
        console.error(`❌ Store ${this.storeName} no existe para guardar`);
        throw new Error(`Store ${this.storeName} no disponible`);
      }

      // ✅ USAR PUT (más seguro que add)
      console.log(`📤 Guardando en store: ${this.storeName}`);
      const result = await IndexedDBService.put(this.storeName, cambioStock);

      if (result) {
        console.log(
          `✅ Cambio de stock REGISTRADO EXITOSAMENTE: ${cambioStock.id}`
        );
        console.log(`📊 Datos guardados:`, {
          producto_id: cambioStock.producto_id,
          stock_anterior: cambioStock.stock_anterior,
          stock_nuevo: cambioStock.stock_nuevo,
          timestamp: cambioStock.timestamp,
        });

        // ✅ VERIFICAR QUE REALMENTE SE GUARDÓ
        const verificado = await IndexedDBService.get(
          this.storeName,
          cambioStock.id
        );
        if (verificado) {
          console.log(
            `✅ Verificación exitosa - Cambio guardado correctamente`
          );
        } else {
          console.warn(
            `⚠️ Verificación fallida - No se pudo recuperar el cambio guardado`
          );
        }

        // ✅ DISPARAR EVENTO PARA ACTUALIZAR HEADER
        window.dispatchEvent(
          new CustomEvent("stock_changes_updated", {
            detail: {
              productoId: productoId,
              cambioId: cambioStock.id,
              timestamp: new Date().toISOString(),
            },
          })
        );

        return {
          success: true,
          id: cambioStock.id,
          message: "Cambio registrado para sincronización",
        };
      } else {
        throw new Error("No se pudo guardar el cambio de stock en IndexedDB");
      }
    } catch (error) {
      console.error("❌ Error CRÍTICO registrando cambio de stock:", error);
      console.error("📋 Stack:", error.stack);
      return {
        success: false,
        error: error.message,
        details: `Error en registerStockChange: ${error.message}`,
      };
    }
  }

  // ✅ OBTENER TODOS LOS CAMBIOS (PARA DEBUG)
  async debugGetAllChanges() {
    try {
      if (!this.initialized) await this.init();

      const cambios = await IndexedDBService.getAll(this.storeName);
      console.log(
        `🔍 [DEBUG] Total cambios en ${this.storeName}: ${cambios.length}`
      );

      cambios.forEach((cambio, index) => {
        console.log(`📋 Cambio ${index + 1}:`, {
          id: cambio.id,
          producto_id: cambio.producto_id,
          stock_anterior: cambio.stock_anterior,
          stock_nuevo: cambio.stock_nuevo,
          sincronizado: cambio.sincronizado,
          timestamp: cambio.timestamp,
        });
      });

      return cambios;
    } catch (error) {
      console.error("❌ Error obteniendo cambios para debug:", error);
      return [];
    }
  }

  // ✅ OBTENER NÚMERO DE PENDIENTES
  async getPendingCount() {
    try {
      if (!this.initialized) await this.init();

      const cambios = await IndexedDBService.getAll(this.storeName);
      const pendientes = cambios.filter((c) => !c.sincronizado);

      console.log(
        `📊 Pendientes: ${pendientes.length} de ${cambios.length} totales`
      );
      return pendientes.length;
    } catch (error) {
      console.error("❌ Error obteniendo conteo de pendientes:", error);
      return 0;
    }
  }

  // ✅ SINCRONIZAR CAMBIOS PENDIENTES
  async syncPendingStockChanges() {
    try {
      if (!navigator.onLine) {
        console.log("📴 No hay conexión, no se puede sincronizar");
        return { success: false, error: "Sin conexión a internet" };
      }

      if (!this.initialized) await this.init();

      console.log(
        "🔄 [STOCK SYNC] Iniciando sincronización de cambios pendientes..."
      );

      // Obtener cambios pendientes
      const cambiosPendientes = await IndexedDBService.getAll(this.storeName);
      const cambiosNoSincronizados = cambiosPendientes.filter(
        (c) => !c.sincronizado
      );

      console.log(
        `📦 Encontrados ${cambiosNoSincronizados.length} cambios pendientes de ${cambiosPendientes.length} totales`
      );

      if (cambiosNoSincronizados.length === 0) {
        console.log("✅ No hay cambios de stock pendientes");
        return {
          success: true,
          message: "No hay cambios de stock pendientes",
          sincronizados: 0,
          fallidos: 0,
          total: 0,
        };
      }

      let sincronizados = 0;
      let fallidos = 0;
      const resultados = [];

      // ✅ SINCRONIZAR EN SERIE
      for (const cambio of cambiosNoSincronizados) {
        try {
          console.log(
            `🔄 Sincronizando stock para producto ${cambio.producto_id}: ${cambio.stock_anterior} → ${cambio.stock_nuevo}`
          );

          // Preparar datos para el servidor
          const stockData = {
            stock: cambio.stock_nuevo,
            motivo: cambio.motivo,
            adminPassword: "", // Se puede ajustar según necesidad
          };

          console.log(`🌐 Enviando al servidor:`, stockData);

          // ✅ ENVIAR AL SERVIDOR
          const response = await fetchConToken(
            `productos/${cambio.producto_id}/stock`,
            stockData,
            "PUT"
          );

          console.log(`📥 Respuesta del servidor:`, response);

          if (response && response.ok === true) {
            // ✅ MARCAR COMO SINCRONIZADO
            await IndexedDBService.put(this.storeName, {
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

            console.log(
              `✅ Stock sincronizado exitosamente: ${cambio.producto_id}`
            );
          } else {
            throw new Error(
              response?.msg || response?.error || "Error del servidor"
            );
          }
        } catch (error) {
          console.error(
            `❌ Error sincronizando stock ${cambio.producto_id}:`,
            error
          );

          fallidos++;
          resultados.push({
            producto_id: cambio.producto_id,
            status: "failed",
            error: error.message,
          });

          // ✅ INCREMENTAR INTENTOS
          await IndexedDBService.put(this.storeName, {
            ...cambio,
            intentos: (cambio.intentos || 0) + 1,
            ultimo_error: error.message,
            ultimo_intento: new Date().toISOString(),
          });
        }
      }

      // ✅ ACTUALIZAR HEADER
      window.dispatchEvent(new CustomEvent("stock_changes_updated"));

      const result = {
        success: fallidos === 0,
        sincronizados,
        fallidos,
        total: cambiosNoSincronizados.length,
        resultados,
      };

      console.log(`🎉 Sincronización completada:`, result);
      return result;
    } catch (error) {
      console.error("❌ Error en syncPendingStockChanges:", error);
      return { success: false, error: error.message };
    }
  }

  // 🔄 MÉTODO ALIAS para mantener compatibilidad
  async syncPendingChanges() {
    return await this.syncPendingStockChanges();
  }
  // ✅ OBTENER ESTADÍSTICAS DE PENDIENTES
  async getPendingStats() {
    try {
      if (!this.initialized) await this.init();

      const cambiosPendientes = await IndexedDBService.getAll(this.storeName);
      const noSincronizados = cambiosPendientes.filter((c) => !c.sincronizado);

      return {
        total: noSincronizados.length,
        por_tipo: noSincronizados.reduce((acc, cambio) => {
          acc[cambio.tipo] = (acc[cambio.tipo] || 0) + 1;
          return acc;
        }, {}),
        con_errores: noSincronizados.filter((c) => c.intentos > 0).length,
        ultima_actualizacion: new Date().toISOString(),
        total_registros: cambiosPendientes.length, // ✅ PARA DEBUG
      };
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      return {
        total: 0,
        por_tipo: {},
        con_errores: 0,
        total_registros: 0,
      };
    }
  }

  // ✅ VERIFICAR SI HAY CAMBIOS PENDIENTES
  async hasPendingChanges() {
    try {
      if (!this.initialized) await this.init();
      const cambios = await IndexedDBService.getAll(this.storeName);
      const tienePendientes = cambios.some((c) => !c.sincronizado);
      console.log(
        `📊 Tiene cambios pendientes: ${tienePendientes} (${cambios.length} total)`
      );
      return tienePendientes;
    } catch (error) {
      console.error("❌ Error verificando pendientes:", error);
      return false;
    }
  }

  // ✅ LIMPIAR CAMBIOS ANTIGUOS
  async cleanupOldSyncedChanges() {
    try {
      if (!this.initialized) await this.init();

      const todosCambios = await IndexedDBService.getAll(this.storeName);
      const fechaLimite = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 días

      let eliminados = 0;
      for (const cambio of todosCambios) {
        const fechaCambio = new Date(cambio.timestamp);
        if (cambio.sincronizado && fechaCambio < fechaLimite) {
          await IndexedDBService.delete(this.storeName, cambio.id);
          eliminados++;
          console.log(`🧹 Limpiado cambio antiguo: ${cambio.id}`);
        }
      }

      console.log(`✅ Limpieza completada: ${eliminados} cambios eliminados`);
      return eliminados;
    } catch (error) {
      console.error("❌ Error limpiando cambios antiguos:", error);
      return 0;
    }
  }

  // ✅ FORZAR INICIALIZACIÓN
  async forceInit() {
    console.log("🚀 Forzando reinicialización de StockSyncController...");
    this.initialized = false;
    const result = await this.init();
    console.log(`✅ Reinicialización: ${result ? "ÉXITO" : "FALLO"}`);
    return result;
  }
}

// ✅ EXPORTAR COMO INSTANCIA ÚNICA
export default new StockSyncController();
