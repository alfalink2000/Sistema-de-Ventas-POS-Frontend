// src/services/IndexedDBService.js - VERSIÓN COMPLETA MEJORADA
class IndexedDBService {
  constructor() {
    this.dbName = "KioskoPOSDB";
    this.version = 6;
    this.db = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized && this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error("❌ Error abriendo IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        console.log("✅ IndexedDB inicializada correctamente");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log("🔄 Actualizando IndexedDB a versión:", this.version);
        this.createObjectStores(db);
      };

      request.onblocked = () => {
        console.warn("⚠️ IndexedDB bloqueada - cierra otras pestañas");
      };
    });
  }

  createObjectStores(db) {
    console.log("📁 Creando/actualizando object stores...");

    // Productos
    if (!db.objectStoreNames.contains("productos")) {
      const productosStore = db.createObjectStore("productos", {
        keyPath: "id",
      });
      productosStore.createIndex("categoria_id", "categoria_id", {
        unique: false,
      });
      productosStore.createIndex("activo", "activo", { unique: false });
      console.log("✅ Object store 'productos' creado");
    }

    // Categorías
    if (!db.objectStoreNames.contains("categorias")) {
      db.createObjectStore("categorias", { keyPath: "id" });
      console.log("✅ Object store 'categorias' creado");
    }

    // Ventas pendientes
    if (!db.objectStoreNames.contains("ventas_pendientes")) {
      const ventasStore = db.createObjectStore("ventas_pendientes", {
        keyPath: "id_local",
        autoIncrement: true,
      });
      ventasStore.createIndex("fecha_venta", "fecha_venta", { unique: false });
      ventasStore.createIndex("sincronizado", "sincronizado", {
        unique: false,
      });
      ventasStore.createIndex("sesion_caja_id", "sesion_caja_id", {
        unique: false,
      });
      ventasStore.createIndex("sesion_caja_id_local", "sesion_caja_id_local", {
        unique: false,
      });
      console.log("✅ Object store 'ventas_pendientes' creado");
    }

    // Detalles de venta pendientes
    if (!db.objectStoreNames.contains("detalles_venta_pendientes")) {
      const detallesStore = db.createObjectStore("detalles_venta_pendientes", {
        keyPath: "id_local",
        autoIncrement: true,
      });
      detallesStore.createIndex("venta_id_local", "venta_id_local", {
        unique: false,
      });
      console.log("✅ Object store 'detalles_venta_pendientes' creado");
    }

    // Sesiones de caja offline
    if (!db.objectStoreNames.contains("sesiones_caja_offline")) {
      const sesionesStore = db.createObjectStore("sesiones_caja_offline", {
        keyPath: "id_local",
        autoIncrement: true,
      });
      sesionesStore.createIndex("estado", "estado", { unique: false });
      sesionesStore.createIndex("vendedor_id", "vendedor_id", {
        unique: false,
      });
      sesionesStore.createIndex("sincronizado", "sincronizado", {
        unique: false,
      });
      sesionesStore.createIndex("fecha_apertura", "fecha_apertura", {
        unique: false,
      });
      console.log("✅ Object store 'sesiones_caja_offline' creado");
    }

    // Cierres pendientes
    if (!db.objectStoreNames.contains("cierres_pendientes")) {
      const cierresStore = db.createObjectStore("cierres_pendientes", {
        keyPath: "id_local",
        autoIncrement: true,
      });
      cierresStore.createIndex("sesion_caja_id_local", "sesion_caja_id_local", {
        unique: false,
      });
      cierresStore.createIndex("sincronizado", "sincronizado", {
        unique: false,
      });
      cierresStore.createIndex("fecha_cierre", "fecha_cierre", {
        unique: false,
      });
      console.log("✅ Object store 'cierres_pendientes' creado");
    }

    // Configuración
    if (!db.objectStoreNames.contains("configuracion")) {
      db.createObjectStore("configuracion", { keyPath: "key" });
      console.log("✅ Object store 'configuracion' creado");
    }

    // Cache de datos maestros
    if (!db.objectStoreNames.contains("cache_maestros")) {
      const cacheStore = db.createObjectStore("cache_maestros", {
        keyPath: "tipo",
      });
      cacheStore.createIndex("ultima_actualizacion", "ultima_actualizacion", {
        unique: false,
      });
      console.log("✅ Object store 'cache_maestros' creado");
    }

    // Usuarios offline
    if (!db.objectStoreNames.contains("offline_users")) {
      const usersStore = db.createObjectStore("offline_users", {
        keyPath: "id",
      });
      usersStore.createIndex("username", "username", { unique: false });
      usersStore.createIndex("activo", "activo", { unique: false });
      usersStore.createIndex("lastLogin", "lastLogin", { unique: false });
      console.log("✅ Object store 'offline_users' creado");
    }

    // Cierres
    if (!db.objectStoreNames.contains("cierres")) {
      const cierresStore = db.createObjectStore("cierres", {
        keyPath: "id",
      });
      cierresStore.createIndex("fecha_cierre", "fecha_cierre", {
        unique: false,
      });
      cierresStore.createIndex("usuario_id", "usuario_id", { unique: false });
      cierresStore.createIndex("sesion_caja_id", "sesion_caja_id", {
        unique: false,
      });
      console.log("✅ Object store 'cierres' creado");
    }

    // Métricas de sincronización
    if (!db.objectStoreNames.contains("sync_metrics")) {
      const metricsStore = db.createObjectStore("sync_metrics", {
        keyPath: "id",
      });
      metricsStore.createIndex("timestamp", "timestamp", { unique: false });
      metricsStore.createIndex("success", "success", { unique: false });
      console.log("✅ Object store 'sync_metrics' creado");
    }

    console.log(
      "🎉 Todos los object stores creados:",
      Array.from(db.objectStoreNames)
    );
  }

  // ✅ NUEVO: Verificar si un object store existe
  async storeExists(storeName) {
    try {
      if (!this.db) await this.init();
      return this.db.objectStoreNames.contains(storeName);
    } catch (error) {
      console.error(`❌ Error verificando store ${storeName}:`, error);
      return false;
    }
  }

  // ✅ NUEVO: Método seguro para getAll
  async safeGetAll(storeName, indexName = null, query = null) {
    try {
      if (!this.db) await this.init();

      // Verificar si el store existe
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(
          `⚠️ Store ${storeName} no existe, devolviendo array vacío`
        );
        return [];
      }

      return await this.getAll(storeName, indexName, query);
    } catch (error) {
      console.error(`❌ Error seguro en getAll(${storeName}):`, error);
      return [];
    }
  }

  // Métodos CRUD genéricos
  async add(storeName, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName, indexName = null, query = null) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);

      let request;
      if (indexName && query) {
        const index = store.index(indexName);
        request = index.getAll(query);
      } else if (indexName) {
        const index = store.index(indexName);
        request = index.getAll();
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Método para obtener información de la base de datos
  async getDBInfo() {
    if (!this.db) await this.init();

    return {
      name: this.db.name,
      version: this.db.version,
      objectStores: Array.from(this.db.objectStoreNames),
      size: await this.estimateSize(),
      initialized: this.initialized,
    };
  }

  // Método para estimar el tamaño de la base de datos
  async estimateSize() {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return estimate;
      } catch (error) {
        console.error("Error estimando almacenamiento:", error);
        return null;
      }
    }
    return null;
  }

  // ✅ NUEVO: Verificar salud de la base de datos
  async healthCheck() {
    try {
      if (!this.initialized) {
        return { healthy: false, error: "No inicializada" };
      }

      const dbInfo = await this.getDBInfo();
      const criticalStores = [
        "productos",
        "categorias",
        "ventas_pendientes",
        "offline_users",
      ];

      const missingStores = criticalStores.filter(
        (store) => !dbInfo.objectStores.includes(store)
      );

      return {
        healthy: missingStores.length === 0,
        objectStores: dbInfo.objectStores,
        missingStores,
        size: dbInfo.size,
        version: dbInfo.version,
      };
    } catch (error) {
      console.error("Error en health check:", error);
      return { healthy: false, error: error.message };
    }
  }

  // ✅ NUEVO: Reinicializar base de datos (útil para debugging)
  async reinitialize() {
    try {
      this.db?.close();
      this.db = null;
      this.initialized = false;

      console.log("🔄 Reinicializando IndexedDB...");
      await this.init();

      return await this.healthCheck();
    } catch (error) {
      console.error("❌ Error reinicializando IndexedDB:", error);
      throw error;
    }
  }

  // ✅ NUEVO: Backup de datos (útil para migraciones)
  async backupData() {
    try {
      if (!this.db) await this.init();

      const stores = Array.from(this.db.objectStoreNames);
      const backup = {};

      for (const storeName of stores) {
        backup[storeName] = await this.safeGetAll(storeName);
      }

      console.log(`💾 Backup creado con ${stores.length} stores`);
      return backup;
    } catch (error) {
      console.error("❌ Error creando backup:", error);
      return null;
    }
  }

  // ✅ NUEVO: Restaurar datos desde backup
  async restoreData(backup) {
    try {
      if (!this.db) await this.init();

      for (const [storeName, data] of Object.entries(backup)) {
        if (this.db.objectStoreNames.contains(storeName)) {
          await this.clear(storeName);
          for (const item of data) {
            await this.add(storeName, item);
          }
        }
      }

      console.log(`🔄 Backup restaurado: ${Object.keys(backup).length} stores`);
      return true;
    } catch (error) {
      console.error("❌ Error restaurando backup:", error);
      return false;
    }
  }
}

export default new IndexedDBService();
