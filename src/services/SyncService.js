// src/services/SyncService.js
import IndexedDBService from "./IndexedDBService";
import { fetchConToken } from "../helpers/fetch";

class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.syncListeners = [];

    this.setupEventListeners();
    this.init();
  }

  async init() {
    try {
      await IndexedDBService.init();
      console.log("✅ IndexedDB inicializado para modo offline");
    } catch (error) {
      console.error("❌ Error inicializando IndexedDB:", error);
    }
  }

  setupEventListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      console.log("🌐 Conexión restaurada - Iniciando sincronización...");
      this.trySync();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      console.log("📴 Modo offline activado");
      this.notifyListeners("offline");
    });
  }

  // Verificar estado de conexión
  checkConnection() {
    return this.isOnline && navigator.onLine;
  }

  // Agregar listener para cambios de estado
  addSyncListener(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter((cb) => cb !== callback);
    };
  }

  notifyListeners(event, data = null) {
    this.syncListeners.forEach((callback) => {
      try {
        callback(event, data);
      } catch (error) {
        console.error("Error en sync listener:", error);
      }
    });
  }

  // Sincronizar datos pendientes
  async trySync() {
    if (this.isSyncing || !this.checkConnection()) return;

    console.log("🔄 Iniciando sincronización de datos pendientes...");
    this.isSyncing = true;
    this.notifyListeners("sync_start");

    try {
      // 1. Sincronizar ventas pendientes
      await this.syncPendingSales();

      // 2. Sincronizar cierres pendientes
      await this.syncPendingClosures();

      // 3. Sincronizar datos maestros
      await this.syncMasterData();

      console.log("✅ Sincronización completada exitosamente");
      this.notifyListeners("sync_complete");
    } catch (error) {
      console.error("❌ Error en sincronización:", error);
      this.notifyListeners("sync_error", error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Sincronizar ventas pendientes
  async syncPendingSales() {
    try {
      const pendingSales = await IndexedDBService.getAll(
        "ventas_pendientes",
        "sincronizado",
        false
      );

      console.log(
        `📦 Sincronizando ${pendingSales.length} ventas pendientes...`
      );

      for (const sale of pendingSales) {
        try {
          // Preparar datos para enviar (sin id_local)
          const { id_local, ...saleData } = sale;

          const response = await fetchConToken("ventas", saleData, "POST");

          if (response.ok && response.venta) {
            // Marcar como sincronizado y guardar ID del servidor
            await IndexedDBService.put("ventas_pendientes", {
              ...sale,
              sincronizado: true,
              id_servidor: response.venta.id,
              fecha_sincronizacion: new Date().toISOString(),
            });

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
          // Continuar con la siguiente venta
        }
      }
    } catch (error) {
      console.error("❌ Error en syncPendingSales:", error);
      throw error;
    }
  }

  // Sincronizar cierres pendientes
  async syncPendingClosures() {
    try {
      const pendingClosures = await IndexedDBService.getAll(
        "cierres_pendientes"
      );

      for (const closure of pendingClosures) {
        if (!closure.sincronizado) {
          try {
            const { id_local, ...closureData } = closure;

            const response = await fetchConToken(
              "cierres",
              closureData,
              "POST"
            );

            if (response.ok) {
              await IndexedDBService.put("cierres_pendientes", {
                ...closure,
                sincronizado: true,
                fecha_sincronizacion: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error(
              `Error sincronizando cierre ${closure.id_local}:`,
              error
            );
          }
        }
      }
    } catch (error) {
      console.error("Error en syncPendingClosures:", error);
    }
  }

  // Sincronizar datos maestros (productos, categorías)
  async syncMasterData() {
    try {
      console.log("🔄 Sincronizando datos maestros...");

      // Obtener datos actualizados del servidor
      const [productosResponse, categoriasResponse] = await Promise.all([
        fetchConToken("productos"),
        fetchConToken("categorias"),
      ]);

      if (productosResponse.ok && categoriasResponse.ok) {
        // Guardar en IndexedDB
        await this.saveMasterData("productos", productosResponse.productos);
        await this.saveMasterData("categorias", categoriasResponse.categorias);

        // Actualizar cache
        await IndexedDBService.put("cache_maestros", {
          tipo: "productos_categorias",
          datos: {
            productos: productosResponse.productos,
            categorias: categoriasResponse.categorias,
          },
          ultima_actualizacion: new Date().toISOString(),
        });

        console.log("✅ Datos maestros actualizados");
      }
    } catch (error) {
      console.error("❌ Error sincronizando datos maestros:", error);
    }
  }

  async saveMasterData(storeName, data) {
    try {
      // Limpiar store existente
      await IndexedDBService.clear(storeName);

      // Agregar nuevos datos
      for (const item of data) {
        await IndexedDBService.add(storeName, item);
      }
    } catch (error) {
      console.error(`Error guardando ${storeName} en IndexedDB:`, error);
    }
  }

  // Cargar datos maestros desde cache
  async loadMasterDataFromCache() {
    try {
      const cache = await IndexedDBService.get(
        "cache_maestros",
        "productos_categorias"
      );
      return cache ? cache.datos : { productos: [], categorias: [] };
    } catch (error) {
      console.error("Error cargando datos del cache:", error);
      return { productos: [], categorias: [] };
    }
  }

  // Forzar sincronización manual
  async forceSync() {
    return this.trySync();
  }

  // Obtener estado de sincronización
  async getSyncStatus() {
    const pendingSales = await IndexedDBService.getAll(
      "ventas_pendientes",
      "sincronizado",
      false
    );
    const pendingClosures = await IndexedDBService.getAll(
      "cierres_pendientes",
      "sincronizado",
      false
    );

    return {
      isOnline: this.checkConnection(),
      isSyncing: this.isSyncing,
      pendingSales: pendingSales.length,
      pendingClosures: pendingClosures.length,
      lastSync: await this.getLastSync(),
    };
  }

  async getLastSync() {
    try {
      const config = await IndexedDBService.get("configuracion", "last_sync");
      return config ? config.value : null;
    } catch (error) {
      return null;
    }
  }
}

export default new SyncService();
