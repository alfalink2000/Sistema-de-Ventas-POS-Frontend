// src/services/IndexedDBService.js
class IndexedDBService {
  constructor() {
    this.dbName = "KioskoPOSDB";
    this.version = 5; // ⬅️ INCREMENTADO a 5 para agregar cierres
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log("✅ IndexedDB inicializada correctamente");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log("🔄 Actualizando IndexedDB a versión:", this.version);
        this.createObjectStores(db);
      };
    });
  }

  createObjectStores(db) {
    console.log("📁 Creando/actualizando object stores...");

    // Productos (para catálogo offline)
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

    // Categorías (para filtros offline)
    if (!db.objectStoreNames.contains("categorias")) {
      db.createObjectStore("categorias", { keyPath: "id" });
      console.log("✅ Object store 'categorias' creado");
    }

    // Ventas pendientes de sincronización
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
      });
      sesionesStore.createIndex("estado", "estado", { unique: false });
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
      console.log("✅ Object store 'cierres_pendientes' creado");
    }

    // Configuración y cache
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

    // ✅ NUEVO: Usuarios para autenticación offline
    if (!db.objectStoreNames.contains("offline_users")) {
      const usersStore = db.createObjectStore("offline_users", {
        keyPath: "savedAt",
      });
      usersStore.createIndex("user_id", "user.id", { unique: false });
      console.log("✅ Object store 'offline_users' creado");
    }

    // ✅ AGREGADO: Cierres de caja para reportes offline
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

    console.log(
      "🎉 Todos los object stores creados:",
      Array.from(db.objectStoreNames)
    );
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

  // Método para verificar si un object store existe
  async storeExists(storeName) {
    if (!this.db) await this.init();
    return this.db.objectStoreNames.contains(storeName);
  }

  // Método para obtener información de la base de datos
  async getDBInfo() {
    if (!this.db) await this.init();

    return {
      name: this.db.name,
      version: this.db.version,
      objectStores: Array.from(this.db.objectStoreNames),
      size: await this.estimateSize(),
    };
  }

  // Método para estimar el tamaño de la base de datos
  async estimateSize() {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate;
    }
    return null;
  }
}

export default new IndexedDBService();
