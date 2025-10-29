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
      // 1. Sincronizar sesiones pendientes
      await this.syncPendingSessions();

      // 2. Sincronizar ventas pendientes
      await this.syncPendingSales();

      // 3. Sincronizar cierres pendientes
      await this.syncPendingClosures();

      // 4. Sincronizar datos maestros
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

  // ✅ NUEVO: Sincronizar sesiones pendientes
  async syncPendingSessions() {
    try {
      const pendingSessions = await IndexedDBService.getAll(
        "sesiones_caja_offline",
        "sincronizado",
        false
      );

      console.log(
        `📦 Sincronizando ${pendingSessions.length} sesiones pendientes...`
      );

      for (const session of pendingSessions) {
        try {
          const { id_local, ...sessionData } = session;

          const response = await fetchConToken(
            "sesiones-caja/abrir",
            sessionData,
            "POST"
          );

          if (response.ok && response.sesion) {
            // Marcar como sincronizado y guardar ID del servidor
            await IndexedDBService.put("sesiones_caja_offline", {
              ...session,
              sincronizado: true,
              id_servidor: response.sesion.id,
              fecha_sincronizacion: new Date().toISOString(),
            });

            console.log(
              `✅ Sesión ${id_local} sincronizada como ${response.sesion.id}`
            );
          } else {
            throw new Error(response.error || "Error del servidor");
          }
        } catch (error) {
          console.error(
            `❌ Error sincronizando sesión ${session.id_local}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("❌ Error en syncPendingSessions:", error);
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
        "cierres_pendientes",
        "sincronizado",
        false
      );

      console.log(
        `📦 Sincronizando ${pendingClosures.length} cierres pendientes...`
      );

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

            console.log(
              `✅ Cierre ${id_local} sincronizado como ${response.cierre.id}`
            );

            // Si hay una sesión local asociada, cerrarla también
            if (closure.sesion_caja_id_local) {
              await this.closePendingSession(
                closure.sesion_caja_id_local,
                response.cierre.id
              );
            }
          }
        } catch (error) {
          console.error(
            `❌ Error sincronizando cierre ${closure.id_local}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error("❌ Error en syncPendingClosures:", error);
    }
  }

  // ✅ NUEVO: Cerrar sesión pendiente después de sincronizar cierre
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

  // Sincronizar datos maestros (productos, categorías, cierres)
  async syncMasterData() {
    try {
      console.log("🔄 Sincronizando datos maestros...");

      // Obtener datos actualizados del servidor
      const [productosResponse, categoriasResponse, cierresResponse] =
        await Promise.all([
          fetchConToken("productos"),
          fetchConToken("categorias"),
          fetchConToken("cierres?limite=1000&pagina=1"),
        ]);

      if (productosResponse.ok && categoriasResponse.ok && cierresResponse.ok) {
        // Guardar en IndexedDB
        await this.saveMasterData("productos", productosResponse.productos);
        await this.saveMasterData("categorias", categoriasResponse.categorias);
        await this.saveMasterData("cierres", cierresResponse.cierres);

        // Actualizar cache
        await IndexedDBService.put("cache_maestros", {
          tipo: "productos_categorias_cierres",
          datos: {
            productos: productosResponse.productos,
            categorias: categoriasResponse.categorias,
            cierres: cierresResponse.cierres,
          },
          ultima_actualizacion: new Date().toISOString(),
        });

        console.log("✅ Datos maestros actualizados (incluyendo cierres)");
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

  // Forzar sincronización manual
  async forceSync() {
    return this.trySync();
  }

  // Obtener estado de sincronización
  async getSyncStatus() {
    const pendingSessions = await IndexedDBService.getAll(
      "sesiones_caja_offline",
      "sincronizado",
      false
    );
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
      pendingSessions: pendingSessions.length,
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

  // ✅ NUEVO: Verificar si hay datos pendientes de sincronización
  async hasPendingData() {
    const status = await this.getSyncStatus();
    return (
      status.pendingSessions > 0 ||
      status.pendingSales > 0 ||
      status.pendingClosures > 0
    );
  }
}

export default new SyncService();
