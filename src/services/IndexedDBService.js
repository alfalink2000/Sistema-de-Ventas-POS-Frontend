import { openDB } from "idb";

class IndexedDBService {
  constructor() {
    this.dbName = "OfflinePOS";
    this.dbVersion = 15; // Incrementado para nuevos stores
    this.db = null;
    this.initialized = false;
  }

  async init() {
    try {
      console.log("🔄 Inicializando IndexedDB...");

      this.db = await openDB(this.dbName, this.dbVersion, {
        upgrade(db, oldVersion, newVersion, transaction) {
          console.log(`📊 Actualizando BD de v${oldVersion} a v${newVersion}`);

          // =============================================
          // 🗂️ STORES PRINCIPALES (Sincronizados desde Backend)
          // =============================================

          // 📦 PRODUCTOS
          if (!db.objectStoreNames.contains("productos")) {
            const productStore = db.createObjectStore("productos", {
              keyPath: "id",
            });
            productStore.createIndex("categoria_id", "categoria_id");
            productStore.createIndex("activo", "activo");
            productStore.createIndex("nombre", "nombre");
            productStore.createIndex("stock", "stock");
            productStore.createIndex("codigo_barras", "codigo_barras");
            productStore.createIndex("sincronizado", "sincronizado"); // ✅ NUEVO ÍNDICE
            console.log('✅ Object store "productos" creado');
          }
          // 🟡 STORE PARA CAMBIOS DE STOCK PENDIENTES
          if (!db.objectStoreNames.contains("cambios_stock_pendientes")) {
            const cambiosStockStore = db.createObjectStore(
              "cambios_stock_pendientes",
              {
                keyPath: "id",
              }
            );
            cambiosStockStore.createIndex("producto_id", "producto_id");
            cambiosStockStore.createIndex("sincronizado", "sincronizado");
            cambiosStockStore.createIndex("timestamp", "timestamp");
            cambiosStockStore.createIndex("tipo", "tipo");
            console.log('✅ Object store "cambios_stock_pendientes" creado');
          }
          // 📂 CATEGORÍAS
          if (!db.objectStoreNames.contains("categorias")) {
            const categoryStore = db.createObjectStore("categorias", {
              keyPath: "id",
            });
            categoryStore.createIndex("activo", "activo");
            categoryStore.createIndex("nombre", "nombre");
            categoryStore.createIndex("sincronizado", "sincronizado"); // ✅ NUEVO ÍNDICE
            console.log('✅ Object store "categorias" creado');
          }

          // 👥 USUARIOS DEL SISTEMA
          if (!db.objectStoreNames.contains("users")) {
            const userStore = db.createObjectStore("users", {
              keyPath: "id",
            });
            userStore.createIndex("username", "username");
            userStore.createIndex("activo", "activo");
            userStore.createIndex("rol", "rol");
            userStore.createIndex("email", "email");
            userStore.createIndex("sincronizado", "sincronizado"); // ✅ NUEVO ÍNDICE
            console.log('✅ Object store "users" creado');
          }

          // 🏦 SESIONES DE CAJA
          if (!db.objectStoreNames.contains("sesiones_caja")) {
            const sessionStore = db.createObjectStore("sesiones_caja", {
              keyPath: "id",
            });
            sessionStore.createIndex("estado", "estado");
            sessionStore.createIndex("vendedor_id", "vendedor_id");
            sessionStore.createIndex("fecha_apertura", "fecha_apertura");
            sessionStore.createIndex("fecha_cierre", "fecha_cierre");
            sessionStore.createIndex("id_local", "id_local");
            console.log('✅ Object store "sesiones_caja" creado');
          }
          // 🏷️ STORE PARA CAMBIOS DE PRECIO PENDIENTES
          if (!db.objectStoreNames.contains("cambios_precios_pendientes")) {
            const cambiosPreciosStore = db.createObjectStore(
              "cambios_precios_pendientes",
              {
                keyPath: "id",
              }
            );
            cambiosPreciosStore.createIndex("producto_id", "producto_id");
            cambiosPreciosStore.createIndex("sincronizado", "sincronizado");
            cambiosPreciosStore.createIndex("timestamp", "timestamp");
            cambiosPreciosStore.createIndex("tipo", "tipo");
            console.log('✅ Object store "cambios_precios_pendientes" creado');
          }
          // 💰 CIERRES DE CAJA
          if (!db.objectStoreNames.contains("cierres")) {
            const closureStore = db.createObjectStore("cierres", {
              keyPath: "id",
            });
            closureStore.createIndex("sesion_caja_id", "sesion_caja_id");
            closureStore.createIndex("fecha_cierre", "fecha_cierre");
            closureStore.createIndex("vendedor_id", "vendedor_id");
            closureStore.createIndex("estado", "estado");
            closureStore.createIndex("id_local", "id_local");
            console.log('✅ Object store "cierres" creado');
          }

          // 🧾 VENTAS
          if (!db.objectStoreNames.contains("ventas")) {
            const ventasStore = db.createObjectStore("ventas", {
              keyPath: "id",
            });
            ventasStore.createIndex("sesion_caja_id", "sesion_caja_id");
            ventasStore.createIndex("vendedor_id", "vendedor_id");
            ventasStore.createIndex("fecha_venta", "fecha_venta");
            ventasStore.createIndex("estado", "estado");
            ventasStore.createIndex("metodo_pago", "metodo_pago");
            ventasStore.createIndex("id_local", "id_local");
            console.log('✅ Object store "ventas" creado');
          }

          // 📋 DETALLES DE VENTA
          if (!db.objectStoreNames.contains("detalles_venta")) {
            const detallesStore = db.createObjectStore("detalles_venta", {
              keyPath: "id",
            });
            detallesStore.createIndex("venta_id", "venta_id");
            detallesStore.createIndex("producto_id", "producto_id");
            detallesStore.createIndex("id_local", "id_local");
            console.log('✅ Object store "detalles_venta" creado');
          }

          // =============================================
          // 📱 STORES PARA DATOS OFFLINE (Pendientes de Sincronización)
          // =============================================
          // 🛒 PRODUCTOS PENDIENTES (Offline)
          if (!db.objectStoreNames.contains("productos_pendientes")) {
            const pendingProductsStore = db.createObjectStore(
              "productos_pendientes",
              {
                keyPath: "id_local",
              }
            );
            pendingProductsStore.createIndex("sincronizado", "sincronizado");
            pendingProductsStore.createIndex("operacion", "operacion");
            pendingProductsStore.createIndex("producto_id", "producto_id");
            pendingProductsStore.createIndex("timestamp", "timestamp");
            console.log('✅ Object store "productos_pendientes" creado');
          }
          // 🛒 VENTAS PENDIENTES (Offline)
          if (!db.objectStoreNames.contains("ventas_pendientes")) {
            const pendingSalesStore = db.createObjectStore(
              "ventas_pendientes",
              {
                keyPath: "id_local",
              }
            );
            pendingSalesStore.createIndex("sincronizado", "sincronizado");
            pendingSalesStore.createIndex("sesion_caja_id", "sesion_caja_id");
            pendingSalesStore.createIndex(
              "sesion_caja_id_local",
              "sesion_caja_id_local"
            );
            pendingSalesStore.createIndex("fecha_venta", "fecha_venta");
            pendingSalesStore.createIndex("vendedor_id", "vendedor_id");
            pendingSalesStore.createIndex("estado", "estado");
            pendingSalesStore.createIndex("es_sesion_local", "es_sesion_local");
            console.log('✅ Object store "ventas_pendientes" creado');
          }

          // 📝 DETALLES VENTA PENDIENTES (Offline)
          if (!db.objectStoreNames.contains("detalles_venta_pendientes")) {
            const pendingDetailsStore = db.createObjectStore(
              "detalles_venta_pendientes",
              {
                keyPath: "id_local",
              }
            );
            pendingDetailsStore.createIndex("venta_id_local", "venta_id_local");
            pendingDetailsStore.createIndex("producto_id", "producto_id");
            pendingDetailsStore.createIndex("sincronizado", "sincronizado");
            console.log('✅ Object store "detalles_venta_pendientes" creado');
          }

          // 🏦 SESIONES PENDIENTES (Offline)
          if (!db.objectStoreNames.contains("sesiones_pendientes")) {
            const pendingSessionsStore = db.createObjectStore(
              "sesiones_pendientes",
              {
                keyPath: "id_local",
              }
            );
            pendingSessionsStore.createIndex("sincronizado", "sincronizado");
            pendingSessionsStore.createIndex("estado", "estado");
            pendingSessionsStore.createIndex("vendedor_id", "vendedor_id");
            pendingSessionsStore.createIndex(
              "fecha_apertura",
              "fecha_apertura"
            );
            console.log('✅ Object store "sesiones_pendientes" creado');
          }

          // 💰 CIERRES PENDIENTES (Offline)
          if (!db.objectStoreNames.contains("cierres_pendientes")) {
            const pendingClosuresStore = db.createObjectStore(
              "cierres_pendientes",
              {
                keyPath: "id_local",
              }
            );
            pendingClosuresStore.createIndex("sincronizado", "sincronizado");
            pendingClosuresStore.createIndex(
              "sesion_caja_id",
              "sesion_caja_id"
            );
            pendingClosuresStore.createIndex("vendedor_id", "vendedor_id");
            pendingClosuresStore.createIndex("fecha_cierre", "fecha_cierre");
            pendingClosuresStore.createIndex(
              "sesion_caja_id_local",
              "sesion_caja_id_local"
            );
            console.log('✅ Object store "cierres_pendientes" creado');
          }

          // =============================================
          // 🔐 STORES PARA AUTENTICACIÓN OFFLINE
          // =============================================

          // 👤 USUARIOS OFFLINE (Para login sin conexión)
          if (!db.objectStoreNames.contains("offline_users")) {
            const offlineUsersStore = db.createObjectStore("offline_users", {
              keyPath: "username", // Usar username como clave para búsqueda rápida
            });
            offlineUsersStore.createIndex("id", "id");
            offlineUsersStore.createIndex("rol", "rol");
            offlineUsersStore.createIndex("activo", "activo");
            offlineUsersStore.createIndex("email", "email");
            offlineUsersStore.createIndex("savedAt", "savedAt");
            console.log('✅ Object store "offline_users" creado');
          }

          // =============================================
          // 🏗️ STORES PARA CACHE MEJORADO
          // =============================================

          // 🏪 SESIONES CAJA OFFLINE (Cache mejorado)
          if (!db.objectStoreNames.contains("sesiones_caja_offline")) {
            const sesionesOfflineStore = db.createObjectStore(
              "sesiones_caja_offline",
              {
                keyPath: "id_local",
              }
            );
            sesionesOfflineStore.createIndex("vendedor_id", "vendedor_id");
            sesionesOfflineStore.createIndex("estado", "estado");
            sesionesOfflineStore.createIndex(
              "fecha_apertura",
              "fecha_apertura"
            );
            sesionesOfflineStore.createIndex("sincronizado", "sincronizado");
            sesionesOfflineStore.createIndex("id_servidor", "id_servidor");
            console.log('✅ Object store "sesiones_caja_offline" creado');
          }

          // =============================================
          // 📊 STORES DE CONTROL Y MÉTRICAS
          // =============================================

          // 🕐 METADATOS DE SINCRONIZACIÓN
          if (!db.objectStoreNames.contains("sync_metadata")) {
            const metadataStore = db.createObjectStore("sync_metadata", {
              keyPath: "key",
            });
            metadataStore.createIndex("timestamp", "timestamp");
            metadataStore.createIndex("tipo", "tipo");
            console.log('✅ Object store "sync_metadata" creado');
          }

          // 📋 COLA DE SINCRONIZACIÓN
          if (!db.objectStoreNames.contains("sync_queue")) {
            const queueStore = db.createObjectStore("sync_queue", {
              keyPath: "id",
              autoIncrement: true,
            });
            queueStore.createIndex("tipo", "tipo");
            queueStore.createIndex("estado", "estado");
            queueStore.createIndex("timestamp", "timestamp");
            queueStore.createIndex("prioridad", "prioridad");
            console.log('✅ Object store "sync_queue" creado');
          }

          // 📈 ESTADÍSTICAS Y MÉTRICAS
          if (!db.objectStoreNames.contains("estadisticas")) {
            const statsStore = db.createObjectStore("estadisticas", {
              keyPath: "id",
            });
            statsStore.createIndex("tipo", "tipo");
            statsStore.createIndex("fecha", "fecha");
            console.log('✅ Object store "estadisticas" creado');
          }

          // 🔄 LOGS DE OPERACIONES
          if (!db.objectStoreNames.contains("operation_logs")) {
            const logsStore = db.createObjectStore("operation_logs", {
              keyPath: "id",
              autoIncrement: true,
            });
            logsStore.createIndex("tipo", "tipo");
            logsStore.createIndex("fecha", "fecha");
            logsStore.createIndex("estado", "estado");
            console.log('✅ Object store "operation_logs" creado');
          }

          console.log(
            "🎯 Estructura de IndexedDB completamente alineada con backend"
          );
          console.log(`📊 Total de stores: ${db.objectStoreNames.length}`);
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

  // =============================================
  // 🛠️ MÉTODOS PRINCIPALES MEJORADOS
  // =============================================

  async get(storeName, key) {
    try {
      if (!this.initialized) await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Store ${storeName} no existe`);
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

  async getAll(storeName) {
    try {
      if (!this.initialized) await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Store ${storeName} no existe`);
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

  async add(storeName, data) {
    try {
      if (!this.initialized) await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.error(`❌ Store ${storeName} no existe para add`);
        return false;
      }

      const store = this.db
        .transaction(storeName, "readwrite")
        .objectStore(storeName);
      await store.add(data);
      return true;
    } catch (error) {
      console.error(`❌ Error en add(${storeName}):`, error, data);
      return false;
    }
  }

  async put(storeName, data) {
    try {
      if (!this.initialized) await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.error(`❌ Store ${storeName} no existe para put`);
        return false;
      }

      const store = this.db
        .transaction(storeName, "readwrite")
        .objectStore(storeName);
      await store.put(data);
      return true;
    } catch (error) {
      console.error(`❌ Error en put(${storeName}):`, error, data);
      return false;
    }
  }

  async delete(storeName, key) {
    try {
      if (!this.initialized) await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Store ${storeName} no existe para delete`);
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

  async clear(storeName) {
    try {
      if (!this.initialized) await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Store ${storeName} no existe para clear`);
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

  async getByIndex(storeName, indexName, value) {
    try {
      if (!this.initialized) await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Store ${storeName} no existe`);
        return [];
      }

      const store = this.db
        .transaction(storeName, "readonly")
        .objectStore(storeName);

      // ✅ VERIFICAR QUE EL ÍNDICE EXISTE
      const indexNames = Array.from(store.indexNames);
      if (!indexNames.includes(indexName)) {
        console.warn(`⚠️ Índice ${indexName} no existe en store ${storeName}`);
        console.log(`📋 Índices disponibles:`, indexNames);

        // Fallback: filtrar manualmente
        const allRecords = await this.getAll(storeName);
        return allRecords.filter((record) => {
          // Manejar diferentes tipos de datos
          const recordValue = record[indexName];
          if (typeof recordValue === "boolean" && typeof value === "boolean") {
            return recordValue === value;
          }
          // Convertir a string para comparación segura
          return String(recordValue) === String(value);
        });
      }

      const index = store.index(indexName);

      // ✅ CONVERTIR VALOR PARA EVITAR DataError
      let safeValue = value;

      // Si el valor es booleano, convertirlo a número (0 o 1) para compatibilidad
      if (typeof value === "boolean") {
        safeValue = value ? 1 : 0;
        console.log(
          `🔄 Convertido booleano ${value} → número ${safeValue} para índice ${indexName}`
        );
      }

      // Si el valor es undefined o null, usar valor por defecto
      if (value === undefined || value === null) {
        safeValue = 0;
        console.log(
          `🔄 Valor ${value} convertido a ${safeValue} para índice ${indexName}`
        );
      }

      console.log(`🔍 Buscando en índice ${indexName} con valor:`, safeValue);
      const result = await index.getAll(safeValue);
      console.log(`✅ Encontrados ${result.length} registros`);

      return result;
    } catch (error) {
      console.error(
        `❌ Error en getByIndex(${storeName}, ${indexName}, ${value}):`,
        error
      );

      // ✅ FALLBACK ROBUSTO
      try {
        console.log(`🔄 Intentando fallback para ${storeName}...`);
        const allRecords = await this.getAll(storeName);
        const filtered = allRecords.filter((record) => {
          try {
            const recordValue = record[indexName];

            // Manejo especial para valores booleanos
            if (
              typeof value === "boolean" &&
              typeof recordValue === "boolean"
            ) {
              return recordValue === value;
            }

            // Manejo especial para números vs strings
            if (typeof value === "number" && typeof recordValue === "string") {
              return Number(recordValue) === value;
            }
            if (typeof value === "string" && typeof recordValue === "number") {
              return recordValue === Number(value);
            }

            // Comparación por defecto
            return String(recordValue) === String(value);
          } catch (filterError) {
            console.warn(`⚠️ Error filtrando registro:`, filterError);
            return false;
          }
        });

        console.log(
          `✅ Fallback exitoso: ${filtered.length} registros encontrados`
        );
        return filtered;
      } catch (fallbackError) {
        console.error("❌ Fallback también falló:", fallbackError);
        return [];
      }
    }
  }
  // IndexedDBService.js - AGREGAR este método mejorado
  async safeGetByIndex(storeName, indexName, value) {
    try {
      console.log(
        `🛡️ [SAFE] Buscando en ${storeName}.${indexName} con valor:`,
        value
      );

      // Primero intentar con getByIndex normal
      const result = await this.getByIndex(storeName, indexName, value);
      return result;
    } catch (error) {
      console.error(`❌ [SAFE] Error en safeGetByIndex:`, error);

      // Último recurso: obtener todo y filtrar
      try {
        const allData = await this.getAll(storeName);
        const filtered = allData.filter((item) => {
          try {
            // Conversión segura de tipos
            const itemValue = item[indexName];
            const searchValue = value;

            // Manejar diferentes combinaciones de tipos
            if (itemValue === searchValue) return true;
            if (String(itemValue) === String(searchValue)) return true;
            if (itemValue == searchValue) return true; // Comparación flexible

            return false;
          } catch (e) {
            return false;
          }
        });

        console.log(
          `🛡️ [SAFE] Fallback manual: ${filtered.length} de ${allData.length} registros`
        );
        return filtered;
      } catch (finalError) {
        console.error(`💥 [SAFE] Error crítico en fallback:`, finalError);
        return [];
      }
    }
  }
  // =============================================
  // 🔍 MÉTODOS ESPECIALIZADOS
  // =============================================

  async storeExists(storeName) {
    try {
      if (!this.initialized) await this.init();
      return this.db.objectStoreNames.contains(storeName);
    } catch (error) {
      console.error(`❌ Error verificando store ${storeName}:`, error);
      return false;
    }
  }

  async safeGetAll(storeName) {
    try {
      if (!this.initialized) await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`⚠️ Store ${storeName} no existe`);
        return [];
      }
      return await this.getAll(storeName);
    } catch (error) {
      console.error(`❌ Error en safeGetAll(${storeName}):`, error);
      return [];
    }
  }

  async update(storeName, key, updates) {
    try {
      if (!this.initialized) await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.error(`❌ Store ${storeName} no existe para update`);
        return false;
      }

      const existing = await this.get(storeName, key);
      if (!existing) {
        console.warn(`⚠️ Item con key ${key} no encontrado en ${storeName}`);
        return false;
      }

      const updated = { ...existing, ...updates };
      return await this.put(storeName, updated);
    } catch (error) {
      console.error(`❌ Error en update(${storeName}, ${key}):`, error);
      return false;
    }
  }

  async count(storeName) {
    try {
      if (!this.initialized) await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        return 0;
      }

      const store = this.db
        .transaction(storeName, "readonly")
        .objectStore(storeName);
      return await store.count();
    } catch (error) {
      console.error(`❌ Error en count(${storeName}):`, error);
      return 0;
    }
  }

  // =============================================
  // 🛠️ MÉTODOS MEJORADOS PARA OFFLINE FIRST
  // =============================================

  /**
   * ✅ MÉTODO SEGURO PARA GUARDAR VENTAS OFFLINE
   * Siempre usa "ventas_pendientes" para datos offline
   */
  async putSaleOffline(ventaData) {
    try {
      if (!this.initialized) await this.init();

      // ✅ VALIDAR QUE TENGA id_local
      if (!ventaData.id_local) {
        throw new Error("Venta offline debe tener id_local");
      }

      // ✅ GUARDAR SOLO EN VENTAS_PENDIENTES
      const result = await this.put("ventas_pendientes", ventaData);

      if (!result) {
        throw new Error("No se pudo guardar la venta offline");
      }

      return true;
    } catch (error) {
      console.error("❌ Error en putSaleOffline:", error, ventaData);
      return false;
    }
  }

  /**
   * ✅ MÉTODO SEGURO PARA GUARDAR VENTAS DEL SERVIDOR
   * Usa "ventas" para datos con ID del servidor
   */
  async putSaleOnline(ventaData) {
    try {
      if (!this.initialized) await this.init();

      // ✅ VALIDAR QUE TENGA id (del servidor)
      if (!ventaData.id) {
        throw new Error("Venta online debe tener id del servidor");
      }

      const result = await this.put("ventas", ventaData);

      if (!result) {
        throw new Error("No se pudo guardar la venta online");
      }

      console.log("✅ Venta online guardada en ventas:", ventaData.id);
      return true;
    } catch (error) {
      console.error("❌ Error en putSaleOnline:", error, ventaData);
      return false;
    }
  }

  /**
   * ✅ OBTENER VENTAS POR SESIÓN (compatible con ambos sistemas)
   */
  async getSalesBySession(sesionId) {
    try {
      if (!this.initialized) await this.init();

      console.log(`🔍 Buscando ventas para sesión: ${sesionId}`);

      let ventas = [];

      // ✅ BUSCAR EN VENTAS PENDIENTES (offline)
      const ventasPendientes = await this.getAll("ventas_pendientes");
      const ventasPendientesFiltradas = ventasPendientes.filter(
        (venta) =>
          venta.sesion_caja_id === sesionId ||
          venta.sesion_caja_id_local === sesionId
      );

      // ✅ BUSCAR EN VENTAS (online/sincronizadas)
      const ventasOnline = await this.getAll("ventas");
      const ventasOnlineFiltradas = ventasOnline.filter(
        (venta) => venta.sesion_caja_id === sesionId
      );

      ventas = [...ventasPendientesFiltradas, ...ventasOnlineFiltradas];

      console.log(
        `📊 Ventas encontradas: ${ventas.length} (${ventasPendientesFiltradas.length} pendientes, ${ventasOnlineFiltradas.length} sincronizadas)`
      );

      return ventas;
    } catch (error) {
      console.error("❌ Error en getSalesBySession:", error);
      return [];
    }
  }
  // =============================================
  // 🔄 MÉTODOS DE SINCRONIZACIÓN
  // =============================================

  async sincronizarMaestros(tipo, datos) {
    try {
      if (!this.initialized) await this.init();

      console.log(`🔄 Sincronizando ${tipo}:`, datos.length, "registros");

      const storeName = this._getStoreNameForTipo(tipo);
      if (!storeName) {
        throw new Error(`Tipo de datos no soportado: ${tipo}`);
      }

      // Limpiar store existente
      await this.clear(storeName);

      // Agregar nuevos datos
      for (const item of datos) {
        await this.add(storeName, item);
      }

      // Guardar metadata de sincronización
      await this.put("sync_metadata", {
        key: `last_sync_${tipo}`,
        timestamp: new Date().toISOString(),
        count: datos.length,
        tipo: tipo,
      });

      console.log(`✅ ${tipo} sincronizados: ${datos.length} registros`);
      return true;
    } catch (error) {
      console.error(`❌ Error sincronizando ${tipo}:`, error);
      return false;
    }
  }

  async getPendingRecords(storeName) {
    try {
      if (!this.initialized) await this.init();
      return await this.getByIndex(storeName, "sincronizado", false);
    } catch (error) {
      console.error(`❌ Error obteniendo pendientes de ${storeName}:`, error);
      return [];
    }
  }

  async markAsSynced(storeName, key) {
    try {
      if (!this.initialized) await this.init();
      return await this.update(storeName, key, { sincronizado: true });
    } catch (error) {
      console.error(`❌ Error marcando como sincronizado:`, error);
      return false;
    }
  }

  // =============================================
  // 🛠️ MÉTODOS AUXILIARES
  // =============================================

  _getStoreNameForTipo(tipo) {
    const mapping = {
      productos: "productos",
      categorias: "categorias",
      usuarios: "users",
      users: "users",
      sesiones: "sesiones_caja",
      cierres: "cierres",
      ventas: "ventas",
      detalles_venta: "detalles_venta",
    };

    return mapping[tipo] || null;
  }
  // 🆕 MÉTODO PARA INSERTAR O ACTUALIZAR
  async addOrUpdate(storeName, data) {
    try {
      if (!this.initialized) await this.init();
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.error(`❌ Store ${storeName} no existe para addOrUpdate`);
        return false;
      }

      const store = this.db
        .transaction(storeName, "readwrite")
        .objectStore(storeName);

      // ✅ Usar put que actualiza si existe, inserta si no existe
      await store.put(data);
      return true;
    } catch (error) {
      console.error(`❌ Error en addOrUpdate(${storeName}):`, error, data);
      return false;
    }
  }
  async getDatabaseInfo() {
    try {
      if (!this.initialized) await this.init();

      const info = {
        name: this.dbName,
        version: this.dbVersion,
        stores: [],
        totalRecords: 0,
      };

      for (const storeName of this.db.objectStoreNames) {
        const count = await this.count(storeName);
        info.stores.push({
          name: storeName,
          recordCount: count,
        });
        info.totalRecords += count;
      }

      return info;
    } catch (error) {
      console.error("❌ Error obteniendo info de BD:", error);
      return null;
    }
  }

  async exportData() {
    try {
      if (!this.initialized) await this.init();

      const exportData = {};

      for (const storeName of this.db.objectStoreNames) {
        exportData[storeName] = await this.getAll(storeName);
      }

      return exportData;
    } catch (error) {
      console.error("❌ Error exportando datos:", error);
      return null;
    }
  }

  async importData(importData) {
    try {
      if (!this.initialized) await this.init();

      for (const [storeName, data] of Object.entries(importData)) {
        if (this.db.objectStoreNames.contains(storeName)) {
          await this.clear(storeName);
          for (const item of data) {
            await this.add(storeName, item);
          }
        }
      }

      return true;
    } catch (error) {
      console.error("❌ Error importando datos:", error);
      return false;
    }
  }
}

export default new IndexedDBService();
