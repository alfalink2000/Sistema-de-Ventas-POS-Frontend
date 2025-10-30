// src/services/SyncService.js - VERSIÓN COMPLETA CORREGIDA
import IndexedDBService from "./IndexedDBService";
import { fetchConToken } from "../helpers/fetch";

class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.syncListeners = [];
    this.syncQueue = [];
    this.conflictResolver = new ConflictResolver();
    this.metrics = new SyncMetrics();
    this.initialized = false;

    this.setupEventListeners();
    this.init();
  }

  async init() {
    try {
      await IndexedDBService.init();
      console.log("✅ IndexedDB inicializado para modo offline");
      this.initialized = true;

      // Inicializar métricas
      await this.metrics.init();

      // Verificar salud de la base de datos
      const health = await this.healthCheck();
      if (!health.healthy) {
        console.warn("⚠️ Problemas detectados en IndexedDB:", health.issues);
      }

      this.notifyListeners("initialized");
    } catch (error) {
      console.error("❌ Error inicializando IndexedDB:", error);
      this.initialized = false;
    }
  }

  setupEventListeners() {
    window.addEventListener("online", async () => {
      this.isOnline = true;
      console.log("🌐 Conexión restaurada - Iniciando sincronización...");

      // Esperar un momento para asegurar que la conexión es estable
      setTimeout(() => {
        this.trySync();
      }, 2000);

      this.notifyListeners("online");
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("📴 Modo offline activado");
      this.notifyListeners("offline");
    });

    // Sincronización periódica cada 5 minutos si hay conexión
    setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.initialized) {
        console.log("🔄 Sincronización periódica...");
        this.trySync();
      }
    }, 5 * 60 * 1000);
  }

  // ✅ CORREGIDO: Verificar estado de conexión
  async checkConnection() {
    if (!navigator.onLine) return false;

    try {
      // Usar endpoint de productos que sabemos que existe
      const response = await fetch(
        `${process.env.VITE_API_URL}/productos?limit=1`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.warn("⚠️ Verificación de conexión fallida:", error);
      // Si falla, asumimos que hay conexión pero hubo un error temporal
      return navigator.onLine;
    }
  }

  addSyncListener(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter((cb) => cb !== callback);
    };
  }

  notifyListeners(event, data = null) {
    console.log(`📢 Notificando evento: ${event}`, data);
    this.syncListeners.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        console.error("Error en sync listener:", error);
      }
    });
  }

  async trySync() {
    if (this.isSyncing) {
      console.log("⏳ Sincronización ya en progreso, omitiendo...");
      return;
    }

    if (!this.initialized) {
      console.warn("⚠️ SyncService no inicializado, omitiendo sincronización");
      return;
    }

    const hasConnection = await this.checkConnection();
    if (!hasConnection) {
      console.log("📴 Sin conexión real, omitiendo sincronización");
      this.notifyListeners("sync_skipped", { reason: "no_connection" });
      return;
    }

    console.log("🔄 Iniciando sincronización de datos pendientes...");
    this.isSyncing = true;
    this.notifyListeners("sync_start");

    const syncSession = {
      id: `sync_${Date.now()}`,
      startTime: Date.now(),
      results: {},
    };

    try {
      syncSession.results.sessions = await this.syncPendingSessions();
      syncSession.results.sales = await this.syncPendingSales();
      syncSession.results.closures = await this.syncPendingClosures();
      syncSession.results.masterData = await this.syncMasterData();

      await this.cleanupSyncedData();

      syncSession.duration = Date.now() - syncSession.startTime;
      syncSession.success = true;

      console.log("✅ Sincronización completada exitosamente", syncSession);
      this.notifyListeners("sync_complete", syncSession);

      await this.metrics.recordSync(syncSession);
    } catch (error) {
      syncSession.duration = Date.now() - syncSession.startTime;
      syncSession.success = false;
      syncSession.error = error.message;

      console.error("❌ Error en sincronización:", error);
      this.notifyListeners("sync_error", syncSession);

      await this.metrics.recordSync(syncSession);
    } finally {
      this.isSyncing = false;
    }
  }

  async syncPendingSessions() {
    try {
      const pendingSessions = await IndexedDBService.safeGetAll(
        "sesiones_caja_offline",
        "sincronizado",
        false
      );

      console.log(
        `📦 Sincronizando ${pendingSessions.length} sesiones pendientes...`
      );

      const results = {
        total: pendingSessions.length,
        success: 0,
        failed: 0,
        conflicts: 0,
      };

      for (const session of pendingSessions) {
        try {
          const { id_local, ...sessionData } = session;

          const existingSession = await this.checkExistingSession(sessionData);

          if (existingSession) {
            const resolvedSession =
              await this.conflictResolver.resolveSessionConflict(
                session,
                existingSession
              );
            results.conflicts++;

            await IndexedDBService.put("sesiones_caja_offline", {
              ...session,
              ...resolvedSession,
              sincronizado: true,
              fecha_sincronizacion: new Date().toISOString(),
            });
          } else {
            const response = await fetchConToken(
              "sesiones-caja/abrir",
              sessionData,
              "POST"
            );

            if (response.ok && response.sesion) {
              await IndexedDBService.put("sesiones_caja_offline", {
                ...session,
                sincronizado: true,
                id_servidor: response.sesion.id,
                fecha_sincronizacion: new Date().toISOString(),
              });
              results.success++;
            } else {
              throw new Error(response.error || "Error del servidor");
            }
          }
        } catch (error) {
          console.error(
            `❌ Error sincronizando sesión ${session.id_local}:`,
            error
          );
          results.failed++;

          if (this.isTemporaryError(error)) {
            await this.queueForRetry("session", session);
          }
        }
      }

      console.log(
        `📊 Resultado sesiones: ${results.success} éxito, ${results.failed} fallos, ${results.conflicts} conflictos`
      );
      return results;
    } catch (error) {
      console.error("❌ Error en syncPendingSessions:", error);
      throw error;
    }
  }

  async syncPendingSales() {
    try {
      const pendingSales = await IndexedDBService.safeGetAll(
        "ventas_pendientes",
        "sincronizado",
        false
      );

      console.log(
        `📦 Sincronizando ${pendingSales.length} ventas pendientes...`
      );

      const results = {
        total: pendingSales.length,
        success: 0,
        failed: 0,
        outOfStock: 0,
      };

      for (const sale of pendingSales) {
        try {
          const stockValidation = await this.validateSaleStock(sale);

          if (!stockValidation.valid) {
            console.warn(
              `⚠️ Producto sin stock: ${stockValidation.unavailableProducts.join(
                ", "
              )}`
            );
            results.outOfStock++;

            await this.handleOutOfStockSale(
              sale,
              stockValidation.unavailableProducts
            );
            continue;
          }

          const { id_local, ...saleData } = sale;

          const response = await fetchConToken("ventas", saleData, "POST");

          if (response.ok && response.venta) {
            await IndexedDBService.put("ventas_pendientes", {
              ...sale,
              sincronizado: true,
              id_servidor: response.venta.id,
              fecha_sincronizacion: new Date().toISOString(),
            });

            await this.syncSaleDetails(id_local, response.venta.id);

            results.success++;
            console.log(
              `✅ Venta ${id_local} sincronizada como ${response.venta.id}`
            );
          } else {
            throw new Error(response.error || "Error del servidor");
          }
        } catch (error) {
          console.error(
            `❌ Error sincronizando venta ${sale.id_local}:`,
            error
          );
          results.failed++;

          if (this.isTemporaryError(error)) {
            await this.queueForRetry("sale", sale);
          }
        }
      }

      console.log(
        `📊 Resultado ventas: ${results.success} éxito, ${results.failed} fallos, ${results.outOfStock} sin stock`
      );
      return results;
    } catch (error) {
      console.error("❌ Error en syncPendingSales:", error);
      throw error;
    }
  }

  async syncSaleDetails(localSaleId, serverSaleId) {
    try {
      const pendingDetails = await IndexedDBService.safeGetAll(
        "detalles_venta_pendientes",
        "venta_id_local",
        localSaleId
      );

      for (const detail of pendingDetails) {
        await IndexedDBService.put("detalles_venta_pendientes", {
          ...detail,
          sincronizado: true,
          venta_id: serverSaleId,
          fecha_sincronizacion: new Date().toISOString(),
        });
      }

      console.log(
        `✅ ${pendingDetails.length} detalles sincronizados para venta ${serverSaleId}`
      );
    } catch (error) {
      console.error(
        `❌ Error sincronizando detalles para venta ${localSaleId}:`,
        error
      );
    }
  }

  async syncPendingClosures() {
    try {
      const pendingClosures = await IndexedDBService.safeGetAll(
        "cierres_pendientes",
        "sincronizado",
        false
      );

      console.log(
        `📦 Sincronizando ${pendingClosures.length} cierres pendientes...`
      );

      const results = {
        total: pendingClosures.length,
        success: 0,
        failed: 0,
      };

      for (const closure of pendingClosures) {
        try {
          const { id_local, ...closureData } = closure;

          const response = await fetchConToken("cierres", closureData, "POST");

          if (response.ok && response.cierre) {
            await IndexedDBService.put("cierres_pendientes", {
              ...closure,
              sincronizado: true,
              id_servidor: response.cierre.id,
              fecha_sincronizacion: new Date().toISOString(),
            });

            if (closure.sesion_caja_id_local) {
              await this.closePendingSession(
                closure.sesion_caja_id_local,
                response.cierre.id
              );
            }

            results.success++;
            console.log(
              `✅ Cierre ${id_local} sincronizado como ${response.cierre.id}`
            );
          } else {
            throw new Error(response.error || "Error del servidor");
          }
        } catch (error) {
          console.error(
            `❌ Error sincronizando cierre ${closure.id_local}:`,
            error
          );
          results.failed++;

          if (this.isTemporaryError(error)) {
            await this.queueForRetry("closure", closure);
          }
        }
      }

      console.log(
        `📊 Resultado cierres: ${results.success} éxito, ${results.failed} fallos`
      );
      return results;
    } catch (error) {
      console.error("❌ Error en syncPendingClosures:", error);
      throw error;
    }
  }

  async closePendingSession(sesionIdLocal, cierreIdServidor) {
    try {
      const session = await IndexedDBService.get(
        "sesiones_caja_offline",
        sesionIdLocal
      );

      if (session && !session.sincronizado) {
        const closeData = {
          sesion_id: session.id_servidor || sesionIdLocal,
          saldo_final: session.saldo_final,
          observaciones: session.observaciones,
        };

        const response = await fetchConToken(
          `sesiones-caja/${session.id_servidor || sesionIdLocal}/cerrar`,
          closeData,
          "PUT"
        );

        if (response.ok) {
          await IndexedDBService.put("sesiones_caja_offline", {
            ...session,
            estado: "cerrada",
            fecha_cierre: new Date().toISOString(),
            sincronizado: true,
          });
          console.log(`✅ Sesión ${sesionIdLocal} cerrada en servidor`);
        }
      }
    } catch (error) {
      console.error(`❌ Error cerrando sesión ${sesionIdLocal}:`, error);
    }
  }

  async syncMasterData() {
    try {
      console.log("🔄 Sincronizando datos maestros...");

      const lastUpdate = await this.getLastMasterDataUpdate();
      const now = Date.now();

      if (lastUpdate && now - lastUpdate < 5 * 60 * 1000) {
        console.log(
          "📊 Datos maestros actualizados recientemente, omitiendo..."
        );
        return { skipped: true, reason: "recent_update" };
      }

      const [productosResponse, categoriasResponse, cierresResponse] =
        await Promise.all([
          fetchConToken("productos"),
          fetchConToken("categorias"),
          fetchConToken("cierres?limite=1000&pagina=1"),
        ]);

      if (productosResponse.ok && categoriasResponse.ok && cierresResponse.ok) {
        await this.saveMasterData("productos", productosResponse.productos);
        await this.saveMasterData("categorias", categoriasResponse.categorias);
        await this.saveMasterData("cierres", cierresResponse.cierres);

        await IndexedDBService.put("cache_maestros", {
          tipo: "productos_categorias_cierres",
          datos: {
            productos: productosResponse.productos,
            categorias: categoriasResponse.categorias,
            cierres: cierresResponse.cierres,
          },
          ultima_actualizacion: new Date().toISOString(),
          timestamp: Date.now(),
        });

        console.log("✅ Datos maestros actualizados (incluyendo cierres)");
        return { success: true, updated: true };
      } else {
        throw new Error("Error en respuesta de datos maestros");
      }
    } catch (error) {
      console.error("❌ Error sincronizando datos maestros:", error);
      return { success: false, error: error.message };
    }
  }

  async saveMasterData(storeName, data) {
    try {
      await IndexedDBService.clear(storeName);

      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await Promise.all(
          batch.map((item) => IndexedDBService.add(storeName, item))
        );
      }
    } catch (error) {
      console.error(`Error guardando ${storeName} en IndexedDB:`, error);
      throw error;
    }
  }

  async checkExistingSession(sessionData) {
    try {
      const response = await fetchConToken(
        `sesiones-caja/verificar?fecha=${sessionData.fecha_apertura}&vendedor=${sessionData.vendedor_id}`
      );
      return response.existe ? response.sesion : null;
    } catch (error) {
      console.error("Error verificando sesión existente:", error);
      return null;
    }
  }

  async validateSaleStock(sale) {
    try {
      const unavailableProducts = [];

      if (sale.productos && sale.productos.length > 0) {
        for (const producto of sale.productos) {
          const stockCheck = await fetchConToken(
            `productos/${producto.producto_id}/stock`
          );

          if (stockCheck.ok && stockCheck.stock_actual < producto.cantidad) {
            unavailableProducts.push({
              id: producto.producto_id,
              nombre: producto.nombre,
              stock_disponible: stockCheck.stock_actual,
              cantidad_solicitada: producto.cantidad,
            });
          }
        }
      }

      return {
        valid: unavailableProducts.length === 0,
        unavailableProducts,
      };
    } catch (error) {
      console.error("Error validando stock:", error);
      return { valid: true, unavailableProducts: [] };
    }
  }

  async handleOutOfStockSale(sale, unavailableProducts) {
    await IndexedDBService.put("ventas_pendientes", {
      ...sale,
      sincronizado: false,
      error_sincronizacion: "stock_insuficiente",
      productos_sin_stock: unavailableProducts,
      ultimo_intento: new Date().toISOString(),
    });

    this.notifyListeners("sync_stock_warning", {
      saleId: sale.id_local,
      unavailableProducts,
    });
  }

  isTemporaryError(error) {
    const temporaryErrors = [
      "network",
      "timeout",
      "connection",
      "failed to fetch",
    ];

    return temporaryErrors.some((tempError) =>
      error.message.toLowerCase().includes(tempError)
    );
  }

  async queueForRetry(type, data) {
    const retryItem = {
      type,
      data,
      retryCount: 0,
      nextRetry: Date.now() + 5 * 60 * 1000,
      queuedAt: new Date().toISOString(),
    };

    this.syncQueue.push(retryItem);
    console.log(`📋 Item encolado para reintento: ${type} ${data.id_local}`);
  }

  async cleanupSyncedData() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);

      const [oldSessions, oldSales, oldClosures] = await Promise.all([
        IndexedDBService.safeGetAll("sesiones_caja_offline"),
        IndexedDBService.safeGetAll("ventas_pendientes"),
        IndexedDBService.safeGetAll("cierres_pendientes"),
      ]);

      const cleanupTasks = [];

      oldSessions
        .filter(
          (session) =>
            session.sincronizado &&
            new Date(session.fecha_sincronizacion) < cutoffDate
        )
        .forEach((session) => {
          cleanupTasks.push(
            IndexedDBService.delete("sesiones_caja_offline", session.id_local)
          );
        });

      oldSales
        .filter(
          (sale) =>
            sale.sincronizado &&
            new Date(sale.fecha_sincronizacion) < cutoffDate
        )
        .forEach((sale) => {
          cleanupTasks.push(
            IndexedDBService.delete("ventas_pendientes", sale.id_local)
          );
        });

      await Promise.all(cleanupTasks);
      console.log(`🧹 Limpiados ${cleanupTasks.length} registros antiguos`);
    } catch (error) {
      console.error("Error en limpieza de datos:", error);
    }
  }

  async getLastMasterDataUpdate() {
    try {
      const cache = await IndexedDBService.get(
        "cache_maestros",
        "productos_categorias_cierres"
      );
      return cache ? cache.timestamp : null;
    } catch (error) {
      return null;
    }
  }

  async loadMasterDataFromCache() {
    try {
      const cache = await IndexedDBService.get(
        "cache_maestros",
        "productos_categorias_cierres"
      );
      return cache
        ? cache.datos
        : {
            productos: [],
            categorias: [],
            cierres: [],
          };
    } catch (error) {
      console.error("Error cargando datos del cache:", error);
      return {
        productos: [],
        categorias: [],
        cierres: [],
      };
    }
  }

  async forceSync() {
    console.log("🔄 Forzando sincronización manual...");
    return this.trySync();
  }

  async healthCheck() {
    const checks = {
      indexedDB: false,
      objectStores: [],
      storage: null,
      pendingData: 0,
      issues: [],
    };

    try {
      if (!this.initialized) {
        checks.issues.push("SyncService no inicializado");
        checks.healthy = false;
        return checks;
      }

      const dbInfo = await IndexedDBService.getDBInfo();
      checks.indexedDB = true;
      checks.objectStores = dbInfo.objectStores;

      checks.storage = await IndexedDBService.estimateSize();

      const [pendingSessions, pendingSales, pendingClosures] =
        await Promise.all([
          IndexedDBService.safeGetAll(
            "sesiones_caja_offline",
            "sincronizado",
            false
          ),
          IndexedDBService.safeGetAll(
            "ventas_pendientes",
            "sincronizado",
            false
          ),
          IndexedDBService.safeGetAll(
            "cierres_pendientes",
            "sincronizado",
            false
          ),
        ]);

      checks.pendingData =
        pendingSessions.length + pendingSales.length + pendingClosures.length;

      const criticalStores = ["productos", "categorias", "ventas_pendientes"];
      for (const store of criticalStores) {
        if (!dbInfo.objectStores.includes(store)) {
          checks.issues.push(`Object store crítico faltante: ${store}`);
        }
      }

      if (checks.storage && checks.storage.usage) {
        const usagePercentage =
          (checks.storage.usage / checks.storage.quota) * 100;
        if (usagePercentage > 80) {
          checks.issues.push(
            `Almacenamiento casi lleno: ${usagePercentage.toFixed(1)}%`
          );
        }
      }
    } catch (error) {
      checks.issues.push(`Error en health check: ${error.message}`);
    }

    checks.healthy = checks.indexedDB && checks.issues.length === 0;

    console.log("🔍 Health Check completado:", checks);
    return checks;
  }

  async getSyncStatus() {
    if (!this.initialized) {
      console.warn("⚠️ IndexedDB no inicializado, usando estado por defecto");
      return this.getDefaultSyncStatus();
    }

    try {
      const [pendingSessions, pendingSales, pendingClosures, health] =
        await Promise.all([
          IndexedDBService.safeGetAll(
            "sesiones_caja_offline",
            "sincronizado",
            false
          ),
          IndexedDBService.safeGetAll(
            "ventas_pendientes",
            "sincronizado",
            false
          ),
          IndexedDBService.safeGetAll(
            "cierres_pendientes",
            "sincronizado",
            false
          ),
          this.healthCheck(),
        ]);

      const metrics = await this.metrics.getRecentMetrics();

      return {
        isOnline: this.isOnline,
        isSyncing: this.isSyncing,
        pendingSessions: pendingSessions.length,
        pendingSales: pendingSales.length,
        pendingClosures: pendingClosures.length,
        health: health,
        lastSync: metrics.lastSync,
        syncQueue: this.syncQueue.length,
        storage: health.storage,
        initialized: this.initialized,
      };
    } catch (error) {
      console.error("❌ Error en getSyncStatus:", error);
      return this.getDefaultSyncStatus();
    }
  }

  getDefaultSyncStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: false,
      pendingSessions: 0,
      pendingSales: 0,
      pendingClosures: 0,
      health: { healthy: false, issues: ["IndexedDB no inicializado"] },
      lastSync: null,
      syncQueue: 0,
      storage: null,
      initialized: this.initialized,
    };
  }

  async getSyncSummary() {
    const status = await this.getSyncStatus();

    return {
      online: status.isOnline,
      syncing: status.isSyncing,
      pending: {
        sessions: status.pendingSessions,
        sales: status.pendingSales,
        closures: status.pendingClosures,
        total:
          status.pendingSessions + status.pendingSales + status.pendingClosures,
      },
      health: status.health.healthy ? "healthy" : "degraded",
      lastSync: status.lastSync?.timestamp || "Nunca",
      storage: status.storage
        ? `${((status.storage.usage / status.storage.quota) * 100).toFixed(1)}%`
        : "Desconocido",
      initialized: status.initialized,
    };
  }

  async hasPendingData() {
    const status = await this.getSyncStatus();
    return (
      status.pendingSessions > 0 ||
      status.pendingSales > 0 ||
      status.pendingClosures > 0
    );
  }
}

class ConflictResolver {
  async resolveSessionConflict(localSession, serverSession) {
    const localDate = new Date(
      localSession.updated_at || localSession.created_at
    );
    const serverDate = new Date(
      serverSession.updated_at || serverSession.created_at
    );

    if (localDate > serverDate) {
      return { ...serverSession, ...localSession, conflicto_resuelto: true };
    } else {
      return { ...localSession, ...serverSession, conflicto_resuelto: true };
    }
  }

  async resolveSaleConflict(localSale, serverSale) {
    return { ...localSale, ...serverSale, conflicto_resuelto: true };
  }
}

class SyncMetrics {
  constructor() {
    this.storeName = "sync_metrics";
    this.initialized = false;
  }

  async init() {
    try {
      await IndexedDBService.init();
      const dbInfo = await IndexedDBService.getDBInfo();
      this.initialized = dbInfo.objectStores.includes(this.storeName);
      console.log("✅ Métricas inicializadas:", this.initialized);
    } catch (error) {
      console.error("❌ Error inicializando métricas:", error);
      this.initialized = false;
    }
  }

  async recordSync(session) {
    if (!this.initialized) return;

    try {
      const metric = {
        id: `metric_${session.id}`,
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        duration: session.duration,
        success: session.success,
        results: session.results,
        error: session.error,
      };

      await IndexedDBService.add(this.storeName, metric);

      const allMetrics = await IndexedDBService.getAll(this.storeName);
      if (allMetrics.length > 100) {
        const toDelete = allMetrics
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .slice(0, allMetrics.length - 100);

        for (const oldMetric of toDelete) {
          await IndexedDBService.delete(this.storeName, oldMetric.id);
        }
      }
    } catch (error) {
      console.error("Error guardando métricas:", error);
    }
  }

  async getRecentMetrics(limit = 10) {
    if (!this.initialized) {
      return { recent: [], successRate: 0, totalSyncs: 0, lastSync: null };
    }

    try {
      const allMetrics = await IndexedDBService.getAll(this.storeName);
      const sorted = allMetrics.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      const recent = sorted.slice(0, limit);
      const successRate = this.calculateSuccessRate(allMetrics);

      return {
        recent,
        successRate,
        totalSyncs: allMetrics.length,
        lastSync: recent[0] || null,
      };
    } catch (error) {
      console.error("❌ Error obteniendo métricas:", error);
      return { recent: [], successRate: 0, totalSyncs: 0, lastSync: null };
    }
  }

  calculateSuccessRate(metrics) {
    if (metrics.length === 0) return 0;
    const successful = metrics.filter((m) => m.success).length;
    return (successful / metrics.length) * 100;
  }
}

export default new SyncService();
