import { openDB } from "idb";

class IndexedDBService {
  constructor() {
    this.dbName = "OfflinePOS";
    this.dbVersion = 1;
    this.db = null;
    this.initialized = false;
  }

  async init() {
    try {
      console.log("🔄 Inicializando IndexedDB...");

      this.db = await openDB(this.dbName, this.dbVersion, {
        upgrade(db, oldVersion, newVersion, transaction) {
          console.log(`📊 Actualizando BD de v${oldVersion} a v${newVersion}`);

          // ✅ CREAR OBJECT STORES SI NO EXISTEN
          if (!db.objectStoreNames.contains("productos")) {
            const productStore = db.createObjectStore("productos", {
              keyPath: "id",
            });
            productStore.createIndex("categoria_id", "categoria_id");
            productStore.createIndex("activo", "activo");
            console.log('✅ Object store "productos" creado');
          }

          if (!db.objectStoreNames.contains("categorias")) {
            const categoryStore = db.createObjectStore("categorias", {
              keyPath: "id",
            });
            categoryStore.createIndex("activo", "activo");
            console.log('✅ Object store "categorias" creado');
          }

          if (!db.objectStoreNames.contains("ventas_pendientes")) {
            const pendingSalesStore = db.createObjectStore(
              "ventas_pendientes",
              { keyPath: "id_local" }
            );
            pendingSalesStore.createIndex("sincronizado", "sincronizado");
            pendingSalesStore.createIndex(
              "sesion_caja_id_local",
              "sesion_caja_id_local"
            );
            pendingSalesStore.createIndex("fecha_venta", "fecha_venta");
            console.log('✅ Object store "ventas_pendientes" creado');
          }

          if (!db.objectStoreNames.contains("detalles_venta_pendientes")) {
            const pendingDetailsStore = db.createObjectStore(
              "detalles_venta_pendientes",
              { keyPath: "id_local" }
            );
            pendingDetailsStore.createIndex("venta_id_local", "venta_id_local");
            pendingDetailsStore.createIndex("producto_id", "producto_id");
            console.log('✅ Object store "detalles_venta_pendientes" creado');
          }

          if (!db.objectStoreNames.contains("sesiones_caja_offline")) {
            const sessionStore = db.createObjectStore("sesiones_caja_offline", {
              keyPath: "id_local",
            });
            sessionStore.createIndex("sincronizado", "sincronizado");
            sessionStore.createIndex("estado", "estado");
            sessionStore.createIndex("vendedor_id", "vendedor_id");
            sessionStore.createIndex("fecha_apertura", "fecha_apertura");
            console.log('✅ Object store "sesiones_caja_offline" creado');
          }

          if (!db.objectStoreNames.contains("cierres_pendientes")) {
            const closureStore = db.createObjectStore("cierres_pendientes", {
              keyPath: "id_local",
            });
            closureStore.createIndex("sincronizado", "sincronizado");
            closureStore.createIndex(
              "sesion_caja_id_local",
              "sesion_caja_id_local"
            );
            closureStore.createIndex("fecha_cierre", "fecha_cierre");
            console.log('✅ Object store "cierres_pendientes" creado');
          }

          if (!db.objectStoreNames.contains("cierres")) {
            const closureStore = db.createObjectStore("cierres", {
              keyPath: "id",
            });
            closureStore.createIndex("fecha_cierre", "fecha_cierre");
            closureStore.createIndex("sesion_caja_id", "sesion_caja_id");
            console.log('✅ Object store "cierres" creado');
          }

          if (!db.objectStoreNames.contains("cache_maestros")) {
            const cacheStore = db.createObjectStore("cache_maestros", {
              keyPath: "tipo",
            });
            cacheStore.createIndex("timestamp", "timestamp");
            console.log('✅ Object store "cache_maestros" creado');
          }

          if (!db.objectStoreNames.contains("sync_metrics")) {
            const metricsStore = db.createObjectStore("sync_metrics", {
              keyPath: "id",
            });
            metricsStore.createIndex("timestamp", "timestamp");
            metricsStore.createIndex("success", "success");
            console.log('✅ Object store "sync_metrics" creado');
          }
        },
      });

      this.initialized = true;
      console.log("✅ IndexedDB inicializado exitosamente");
      return true;
    } catch (error) {
      console.error("❌ Error inicializando IndexedDB:", error);
      this.initialized = false;
      return false;
    }
  }

  // ✅ MÉTODO SEGURO PARA OBTENER TODOS LOS REGISTROS
  async safeGetAll(storeName, indexName = null, value = null) {
    try {
      if (!this.initialized) {
        await this.init();
      }

      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Object store "${storeName}" no existe`);
        return [];
      }

      const store = this.db
        .transaction(storeName, "readonly")
        .objectStore(storeName);

      // Si se especifica un índice y valor, usar el índice
      if (indexName && value !== null) {
        // Verificar si el índice existe
        const indexNames = Array.from(store.indexNames);
        if (!indexNames.includes(indexName)) {
          console.warn(
            `⚠️ Índice "${indexName}" no existe en "${storeName}", usando getAll`
          );
          return await store.getAll();
        }

        const index = store.index(indexName);
        return await index.getAll(value);
      }

      // Si no hay índice, obtener todos los registros
      return await store.getAll();
    } catch (error) {
      console.error(
        `❌ Error en safeGetAll(${storeName}, ${indexName}, ${value}):`,
        error
      );

      // En caso de error con índice, intentar sin índice
      if (error.name === "NotFoundError" && indexName) {
        console.log(`🔄 Reintentando sin índice ${indexName}...`);
        try {
          const store = this.db
            .transaction(storeName, "readonly")
            .objectStore(storeName);
          return await store.getAll();
        } catch (fallbackError) {
          console.error(`❌ Error en fallback:`, fallbackError);
          return [];
        }
      }

      return [];
    }
  }

  // ✅ MÉTODO PARA OBTENER TODOS LOS REGISTROS (sin filtros)
  async getAll(storeName) {
    try {
      if (!this.initialized) {
        await this.init();
      }

      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Object store "${storeName}" no existe`);
        return [];
      }

      const store = this.db
        .transaction(storeName, "readonly")
        .objectStore(storeName);
      return await store.getAll();
    } catch (error) {
      console.error(`❌ Error en getAll(${storeName}):`, error);
      return [];
    }
  }

  // ✅ MÉTODO PARA OBTENER UN REGISTRO POR KEY
  async get(storeName, key) {
    try {
      if (!this.initialized) {
        await this.init();
      }

      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Object store "${storeName}" no existe`);
        return null;
      }

      const store = this.db
        .transaction(storeName, "readonly")
        .objectStore(storeName);
      return await store.get(key);
    } catch (error) {
      console.error(`❌ Error en get(${storeName}, ${key}):`, error);
      return null;
    }
  }

  // ✅ MÉTODO PARA AGREGAR UN REGISTRO
  async add(storeName, data) {
    try {
      if (!this.initialized) {
        await this.init();
      }

      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Object store "${storeName}" no existe`);
        return false;
      }

      const store = this.db
        .transaction(storeName, "readwrite")
        .objectStore(storeName);
      await store.add(data);
      return true;
    } catch (error) {
      console.error(`❌ Error en add(${storeName}):`, error);
      return false;
    }
  }

  // ✅ MÉTODO PARA ACTUALIZAR UN REGISTRO
  async put(storeName, data) {
    try {
      if (!this.initialized) {
        await this.init();
      }

      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Object store "${storeName}" no existe`);
        return false;
      }

      const store = this.db
        .transaction(storeName, "readwrite")
        .objectStore(storeName);
      await store.put(data);
      return true;
    } catch (error) {
      console.error(`❌ Error en put(${storeName}):`, error);
      return false;
    }
  }

  // ✅ MÉTODO PARA ELIMINAR UN REGISTRO
  async delete(storeName, key) {
    try {
      if (!this.initialized) {
        await this.init();
      }

      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Object store "${storeName}" no existe`);
        return false;
      }

      const store = this.db
        .transaction(storeName, "readwrite")
        .objectStore(storeName);
      await store.delete(key);
      return true;
    } catch (error) {
      console.error(`❌ Error en delete(${storeName}, ${key}):`, error);
      return false;
    }
  }

  // ✅ MÉTODO PARA LIMPIAR UN OBJECT STORE
  async clear(storeName) {
    try {
      if (!this.initialized) {
        await this.init();
      }

      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Object store "${storeName}" no existe`);
        return false;
      }

      const store = this.db
        .transaction(storeName, "readwrite")
        .objectStore(storeName);
      await store.clear();
      return true;
    } catch (error) {
      console.error(`❌ Error en clear(${storeName}):`, error);
      return false;
    }
  }

  // ✅ MÉTODO PARA OBTENER INFORMACIÓN DE LA BD
  async getDBInfo() {
    try {
      if (!this.initialized) {
        await this.init();
      }

      const objectStores = Array.from(this.db.objectStoreNames);
      const info = {
        objectStores: objectStores,
        version: this.dbVersion,
        initialized: this.initialized,
      };

      // Obtener conteos de cada store
      info.counts = {};
      for (const storeName of objectStores) {
        try {
          const store = this.db
            .transaction(storeName, "readonly")
            .objectStore(storeName);
          info.counts[storeName] = await store.count();
        } catch (error) {
          info.counts[storeName] = "error";
        }
      }

      return info;
    } catch (error) {
      console.error("❌ Error obteniendo información de BD:", error);
      return {
        objectStores: [],
        version: 0,
        initialized: false,
        counts: {},
      };
    }
  }

  // ✅ MÉTODO PARA ESTIMAR EL TAMAÑO DEL ALMACENAMIENTO
  async estimateSize() {
    try {
      if (!this.initialized || !navigator.storage) {
        return null;
      }

      if (navigator.storage && navigator.storage.estimate) {
        const estimation = await navigator.storage.estimate();
        return {
          usage: estimation.usage,
          quota: estimation.quota,
          usagePercentage: estimation.quota
            ? (estimation.usage / estimation.quota) * 100
            : 0,
        };
      }

      return null;
    } catch (error) {
      console.error("❌ Error estimando tamaño de almacenamiento:", error);
      return null;
    }
  }

  // ✅ MÉTODO PARA VERIFICAR SI UN OBJECT STORE EXISTE
  async storeExists(storeName) {
    try {
      if (!this.initialized) {
        await this.init();
      }
      return this.db.objectStoreNames.contains(storeName);
    } catch (error) {
      console.error(`❌ Error verificando store ${storeName}:`, error);
      return false;
    }
  }

  // ✅ MÉTODO PARA VERIFICAR SI UN ÍNDICE EXISTE
  async indexExists(storeName, indexName) {
    try {
      if (!this.initialized) {
        await this.init();
      }

      if (!this.db.objectStoreNames.contains(storeName)) {
        return false;
      }

      const store = this.db
        .transaction(storeName, "readonly")
        .objectStore(storeName);
      const indexNames = Array.from(store.indexNames);
      return indexNames.includes(indexName);
    } catch (error) {
      console.error(
        `❌ Error verificando índice ${indexName} en ${storeName}:`,
        error
      );
      return false;
    }
  }

  // ✅ MÉTODO PARA OBTENER REGISTROS POR ÍNDICE (CON VERIFICACIÓN)
  async getByIndex(storeName, indexName, value) {
    try {
      if (!this.initialized) {
        await this.init();
      }

      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Object store "${storeName}" no existe`);
        return [];
      }

      const store = this.db
        .transaction(storeName, "readonly")
        .objectStore(storeName);

      // Verificar si el índice existe
      const indexExists = Array.from(store.indexNames).includes(indexName);
      if (!indexExists) {
        console.warn(`⚠️ Índice "${indexName}" no existe en "${storeName}"`);
        return [];
      }

      const index = store.index(indexName);
      return await index.getAll(value);
    } catch (error) {
      console.error(
        `❌ Error en getByIndex(${storeName}, ${indexName}, ${value}):`,
        error
      );
      return [];
    }
  }
}

export default new IndexedDBService();
