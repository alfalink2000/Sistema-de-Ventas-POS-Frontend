// utils/ImageDownloadManager.js - VERSIÓN CORREGIDA
class ImageDownloadManager {
  constructor() {
    this.cacheName = "ibbco-images-cache";
    this.maxRetries = 2;
    this.timeout = 15000; // 15 segundos
  }

  // ✅ DESCARGAR Y CACHEAR IMAGEN (manteniendo URL original)
  async downloadAndCacheImage(imageUrl) {
    try {
      if (!imageUrl || !this.isValidImageUrl(imageUrl)) {
        console.warn(`⚠️ URL de imagen inválida: ${imageUrl}`);
        return null;
      }

      console.log(`📥 Descargando imagen: ${this.getFileName(imageUrl)}`);

      // Verificar si ya está en cache
      const cached = await this.getCachedImage(imageUrl);
      if (cached) {
        console.log(`✅ Imagen ya en cache: ${this.getFileName(imageUrl)}`);
        return imageUrl; // ✅ Devolver la URL original
      }

      // Descargar con reintentos
      const success = await this.downloadWithRetry(imageUrl);

      if (success) {
        console.log(`✅ Imagen cacheada: ${this.getFileName(imageUrl)}`);
        return imageUrl; // ✅ Siempre devolver la URL original
      } else {
        return null;
      }
    } catch (error) {
      console.warn(`❌ Error descargando imagen ${imageUrl}:`, error.message);
      return null;
    }
  }

  // ✅ DESCARGAR CON REINTENTOS
  async downloadWithRetry(imageUrl, retryCount = 0) {
    try {
      console.log(
        `⬇️ Descarga (intento ${retryCount + 1}): ${this.getFileName(imageUrl)}`
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(imageUrl, {
        signal: controller.signal,
        mode: "cors",
        cache: "no-cache",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Verificar que sea una imagen válida
      if (!blob.type.startsWith("image/")) {
        throw new Error(`Tipo MIME inválido: ${blob.type}`);
      }

      console.log(
        `✅ Imagen descargada: ${this.getFileName(
          imageUrl
        )} (${this.formatBytes(blob.size)})`
      );

      // ✅ GUARDAR EN CACHE CON LA URL ORIGINAL
      await this.cacheImage(imageUrl, blob);
      return true;
    } catch (error) {
      console.warn(
        `⚠️ Error descargando ${this.getFileName(imageUrl)}:`,
        error.message
      );

      if (retryCount < this.maxRetries) {
        console.log(
          `🔄 Reintentando... (${retryCount + 1}/${this.maxRetries})`
        );
        await this.delay(1000 * (retryCount + 1)); // Backoff exponencial
        return this.downloadWithRetry(imageUrl, retryCount + 1);
      } else {
        console.error(
          `❌ Fallo después de ${this.maxRetries + 1} intentos: ${imageUrl}`
        );
        return false;
      }
    }
  }

  // ✅ OBTENER IMAGEN DEL CACHE
  async getCachedImage(imageUrl) {
    try {
      const cache = await caches.open(this.cacheName);
      const cachedResponse = await cache.match(imageUrl);
      return cachedResponse ? true : false;
    } catch (error) {
      console.warn("Error accediendo al cache:", error);
      return false;
    }
  }

  // ✅ GUARDAR IMAGEN EN CACHE
  async cacheImage(imageUrl, blob) {
    try {
      const cache = await caches.open(this.cacheName);
      const response = new Response(blob);
      await cache.put(imageUrl, response);
      return true;
    } catch (error) {
      console.warn("Error guardando en cache:", error);
      return false;
    }
  }

  // ✅ VALIDAR URL DE IMAGEN (especialmente i.ibb.co)
  isValidImageUrl(url) {
    if (!url || typeof url !== "string") return false;

    try {
      const urlObj = new URL(url);
      const validProtocols = ["http:", "https:"];
      const validExtensions = [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".svg",
      ];

      // ✅ PERMITIR URLs DE i.ibb.co SIN EXTENSIÓN
      if (urlObj.hostname === "i.ibb.co") {
        return validProtocols.includes(urlObj.protocol);
      }

      // Para otros dominios, verificar extensión
      const extension = urlObj.pathname.toLowerCase();
      const hasValidExtension = validExtensions.some((ext) =>
        extension.includes(ext)
      );

      return validProtocols.includes(urlObj.protocol) && hasValidExtension;
    } catch {
      return false;
    }
  }

  // ✅ OBTENER NOMBRE DEL ARCHIVO
  getFileName(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split("/").pop() || "imagen";
    } catch {
      return url.split("/").pop() || "imagen";
    }
  }

  // ✅ FORMATEAR BYTES
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // ✅ DELAY HELPER
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ✅ DESCARGAR TODAS LAS IMÁGENES DE PRODUCTOS
  async downloadAllProductImages(products) {
    if (!products || !Array.isArray(products)) {
      console.warn("⚠️ No hay productos para descargar imágenes");
      return { success: 0, failed: 0, total: 0 };
    }

    console.log(
      `📥 Iniciando descarga de imágenes para ${products.length} productos...`
    );

    let successCount = 0;
    let failCount = 0;

    // Filtrar solo productos con imágenes de i.ibb.co
    const productsWithImages = products.filter(
      (product) => product.imagen && product.imagen.includes("i.ibb.co")
    );

    console.log(
      `🔍 ${productsWithImages.length} productos con imágenes de i.ibb.co`
    );

    // Descargar en lotes de 3 para no sobrecargar i.ibb.co
    const batchSize = 3;
    for (let i = 0; i < productsWithImages.length; i += batchSize) {
      const batch = productsWithImages.slice(i, i + batchSize);

      const batchPromises = batch.map(async (product) => {
        try {
          const result = await this.downloadAndCacheImage(product.imagen);
          if (result) {
            successCount++;
            console.log(
              `✅ [${successCount + failCount}/${productsWithImages.length}] ${
                product.nombre
              }`
            );
          } else {
            failCount++;
            console.warn(
              `❌ [${successCount + failCount}/${productsWithImages.length}] ${
                product.nombre
              }`
            );
          }
        } catch (error) {
          failCount++;
          console.warn(
            `❌ [${successCount + failCount}/${productsWithImages.length}] ${
              product.nombre
            }:`,
            error.message
          );
        }
      });

      await Promise.allSettled(batchPromises);

      // Pequeña pausa entre lotes para no sobrecargar i.ibb.co
      if (i + batchSize < productsWithImages.length) {
        await this.delay(500);
      }
    }

    console.log(
      `✅ Descarga completada: ${successCount} exitosas, ${failCount} fallidas`
    );

    return {
      success: successCount,
      failed: failCount,
      total: productsWithImages.length,
    };
  }

  // ✅ OBTENER ESTADÍSTICAS DEL CACHE
  async getCacheStats() {
    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();

      let totalSize = 0;
      const stats = {
        totalImages: keys.length,
        totalSize: 0,
        imagesByDomain: {},
      };

      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;

          const domain = new URL(key.url).hostname;
          stats.imagesByDomain[domain] =
            (stats.imagesByDomain[domain] || 0) + 1;
        }
      }

      stats.totalSize = this.formatBytes(totalSize);
      return stats;
    } catch (error) {
      console.error("Error obteniendo stats del cache:", error);
      return null;
    }
  }

  // ✅ LIMPIAR CACHE
  async clearCache() {
    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();

      console.log(`🧹 Eliminando ${keys.length} imágenes del cache`);
      await Promise.all(keys.map((key) => cache.delete(key)));

      console.log("✅ Cache de imágenes limpiado");
      return true;
    } catch (error) {
      console.error("❌ Error limpiando cache:", error);
      return false;
    }
  }

  // ✅ OBTENER USO DE ALMACENAMIENTO
  async getLocalStorageUsage() {
    try {
      if (!navigator.storage || !navigator.storage.estimate) {
        return { error: "Storage API no soportada" };
      }

      const estimation = await navigator.storage.estimate();
      const stats = await this.getCacheStats();

      return {
        usage: estimation.usage,
        quota: estimation.quota,
        usagePercentage: estimation.quota
          ? Math.round((estimation.usage / estimation.quota) * 100)
          : 0,
        cacheStats: stats,
      };
    } catch (error) {
      console.error("❌ Error obteniendo uso de almacenamiento:", error);
      return { error: error.message };
    }
  }
}

export default new ImageDownloadManager();
