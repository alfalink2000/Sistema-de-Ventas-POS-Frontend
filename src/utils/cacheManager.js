// src/utils/cacheManager.js - NUEVO ARCHIVO
import IndexedDBService from "../services/IndexedDBService";

class CacheManager {
  constructor() {
    this.CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
    this.loadingPromises = new Map(); // Evitar cargas duplicadas
  }

  async getWithCache(cacheKey, fetchFunction, forceRefresh = false) {
    // ✅ Evitar múltiples llamadas simultáneas para misma key
    if (this.loadingPromises.has(cacheKey)) {
      console.log(`🔄 Esperando carga existente para: ${cacheKey}`);
      return this.loadingPromises.get(cacheKey);
    }

    const loadPromise = this._executeGetWithCache(
      cacheKey,
      fetchFunction,
      forceRefresh
    );
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  async _executeGetWithCache(cacheKey, fetchFunction, forceRefresh) {
    try {
      // 1. Verificar si debemos forzar recarga
      if (forceRefresh) {
        console.log(`🔄 Forzando recarga para: ${cacheKey}`);
        const freshData = await fetchFunction();
        await this._saveToCache(cacheKey, freshData);
        return { data: freshData, fromCache: false, timestamp: Date.now() };
      }

      // 2. Intentar obtener desde cache
      const cached = await this._getFromCache(cacheKey);

      if (cached && !this._isCacheExpired(cached.timestamp)) {
        console.log(`✅ Cache HIT: ${cacheKey}`);
        return { ...cached, fromCache: true };
      }

      // 3. Obtener datos frescos
      console.log(`🔄 Cache MISS/EXPIRED: ${cacheKey}`);
      const freshData = await fetchFunction();

      // 4. Guardar en cache
      await this._saveToCache(cacheKey, freshData);

      return { data: freshData, fromCache: false, timestamp: Date.now() };
    } catch (error) {
      console.error(`❌ Error en cache para ${cacheKey}:`, error);

      // 5. Fallback: intentar devolver cache expirado si existe
      const cached = await this._getFromCache(cacheKey);
      if (cached) {
        console.log(`🔄 Usando cache expirado como fallback: ${cacheKey}`);
        return { ...cached, fromCache: true, expired: true };
      }

      throw error;
    }
  }

  async _getFromCache(cacheKey) {
    try {
      const cached = await IndexedDBService.get("cache_maestros", cacheKey);
      if (cached && cached.data && cached.timestamp) {
        return cached;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error obteniendo cache: ${cacheKey}`, error);
      return null;
    }
  }

  async _saveToCache(cacheKey, data) {
    try {
      const cacheData = {
        tipo: cacheKey,
        data: data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_DURATION,
      };

      await IndexedDBService.put("cache_maestros", cacheData);
      console.log(`💾 Cache guardado: ${cacheKey}`);
    } catch (error) {
      console.error(`❌ Error guardando cache: ${cacheKey}`, error);
    }
  }

  _isCacheExpired(timestamp) {
    return Date.now() - timestamp > this.CACHE_DURATION;
  }

  async invalidateCache(cacheKey) {
    try {
      await IndexedDBService.delete("cache_maestros", cacheKey);
      console.log(`🧹 Cache invalidado: ${cacheKey}`);
    } catch (error) {
      console.error(`❌ Error invalidando cache: ${cacheKey}`, error);
    }
  }

  async clearAllCache() {
    try {
      await IndexedDBService.clear("cache_maestros");
      console.log("🧹 Todo el cache limpiado");
    } catch (error) {
      console.error("❌ Error limpiando cache:", error);
    }
  }
}

export const cacheManager = new CacheManager();
