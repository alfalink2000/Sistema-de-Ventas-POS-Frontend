// services/ImageCacheService.js
class ImageCacheService {
  // ✅ MÉTODO getFileName CORREGIDO - debe ser static
  static getFileName(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split("/").pop() || "imagen";
    } catch {
      return url.split("/").pop() || "imagen";
    }
  }

  static async cacheProductImages(products) {
    if (!("caches" in window)) {
      console.warn("❌ Cache API no disponible");
      return { total: 0, cached: 0, errors: 0, alreadyCached: 0 };
    }

    try {
      // ✅ USAR EL MISMO NOMBRE QUE WORKBOX
      const cache = await caches.open("imgbb-images-v2");
      console.group(`🖼️ ImageCacheService: Cacheando imágenes MANUALMENTE`);

      // Filtrar productos con imágenes de ImgBB
      const imageUrls = products
        .filter((p) => p.imagen_url && p.imagen_url.includes("i.ibb.co"))
        .map((p) => p.imagen_url);

      console.log(`📊 Productos recibidos: ${products.length}`);
      console.log(`🖼️ Productos con imágenes ImgBB: ${imageUrls.length}`);
      console.log(`📝 URLs a cachear:`, imageUrls);

      if (imageUrls.length === 0) {
        console.log("ℹ️ No hay imágenes para cachear");
        console.groupEnd();
        return { total: 0, cached: 0, errors: 0, alreadyCached: 0 };
      }

      let cachedCount = 0;
      let errorCount = 0;
      let alreadyCachedCount = 0;

      for (const url of imageUrls) {
        try {
          console.group(`📦 Procesando imagen: ${this.getFileName(url)}`);
          console.log(`🔗 URL: ${url}`);

          // Verificar si ya está en cache
          const alreadyCached = await cache.match(url);
          if (alreadyCached) {
            console.log(`✅ Ya en cache: ${this.getFileName(url)}`);
            alreadyCachedCount++;
            console.groupEnd();
            continue;
          }

          console.log(`⬇️ Descargando: ${this.getFileName(url)}`);

          // ✅ ESTRATEGIA MEJORADA: Fetch con timeout
          let response;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            response = await fetch(url, {
              signal: controller.signal,
              mode: "cors",
              credentials: "omit",
              cache: "force-cache",
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
          } catch (fetchError) {
            console.warn(`❌ Error fetch: ${fetchError.message}`);
            // REINTENTAR CON ESTRATEGIA ALTERNATIVA
            try {
              console.log(`🔄 Reintentando con no-cors...`);
              response = await fetch(url, {
                mode: "no-cors",
                cache: "force-cache",
              });
            } catch (retryError) {
              console.warn(`❌ Reintento falló: ${retryError.message}`);
              throw fetchError;
            }
          }

          if (response) {
            console.log(`✅ Descarga exitosa: ${this.getFileName(url)}`);

            // ✅ GUARDAR EN CACHE
            try {
              await cache.put(url, response.clone());

              // ✅ VERIFICAR QUE SE GUARDÓ
              const verifyCache = await cache.match(url);
              if (verifyCache) {
                cachedCount++;
                console.log(`💾 GUARDADA EN CACHE: ${this.getFileName(url)}`);

                // ✅ VERIFICACIÓN EXTRA
                const blob = await verifyCache.blob();
                console.log(
                  `📊 Verificación - Tamaño blob: ${blob.size} bytes`
                );
              } else {
                throw new Error("No se pudo verificar el guardado");
              }
            } catch (cacheError) {
              console.warn(
                `❌ Error guardando en cache: ${cacheError.message}`
              );
              throw cacheError;
            }
          }

          console.groupEnd();
        } catch (error) {
          console.groupEnd();
          console.warn(
            `⚠️ No se pudo cachear ${this.getFileName(url)}:`,
            error.message
          );
          errorCount++;
        }
      }

      // ✅ VERIFICACIÓN FINAL DEL CACHE
      console.log(`🔍 Verificando cache final...`);
      const finalKeys = await cache.keys();
      console.log(
        `📦 Imágenes en cache después del proceso: ${finalKeys.length}`
      );

      finalKeys.forEach((req) => {
        console.log(`   ✅ ${this.getFileName(req.url)}`);
      });

      console.log(`📊 RESUMEN CACHE MANUAL:`);
      console.log(`✅ Nuevas cacheadas: ${cachedCount}`);
      console.log(`📦 Ya en cache: ${alreadyCachedCount}`);
      console.log(`❌ Errores: ${errorCount}`);
      console.log(`📋 Total procesadas: ${imageUrls.length}`);
      console.groupEnd();

      return {
        total: imageUrls.length,
        cached: cachedCount,
        errors: errorCount,
        alreadyCached: alreadyCachedCount,
        finalCacheCount: finalKeys.length,
      };
    } catch (error) {
      console.error("❌ Error en ImageCacheService:", error);
      console.groupEnd();
      return {
        total: 0,
        cached: 0,
        errors: 1,
        alreadyCached: 0,
        error: error.message,
      };
    }
  }

  static async getCachedImage(url, forceRefresh = false) {
    if (!("caches" in window)) {
      return url;
    }

    try {
      console.group(`🔍 ImageCacheService: Buscando en cache MANUAL`);
      console.log(`📝 URL solicitada: ${url}`);

      // ✅ USAR EL MISMO NOMBRE QUE WORKBOX
      const cache = await caches.open("imgbb-images-v2");

      if (forceRefresh) {
        await cache.delete(url);
        console.log(`🧹 Entrada limpiada: ${this.getFileName(url)}`);
      }

      const cached = await cache.match(url);
      console.log(`📦 Encontrado en cache: ${!!cached}`);

      if (cached) {
        try {
          const blob = await cached.blob();
          console.log(`📊 Blob obtenido - Tamaño: ${blob.size} bytes`);

          if (blob && blob.size > 0) {
            const objectUrl = URL.createObjectURL(blob);
            console.log(`✅ URL objeto creada para: ${this.getFileName(url)}`);
            console.groupEnd();
            return objectUrl;
          } else {
            console.warn(`⚠️ Blob vacío o inválido`);
            await cache.delete(url);
          }
        } catch (blobError) {
          console.warn(`⚠️ Error procesando blob:`, blobError);
          await cache.delete(url);
        }
      }

      console.log(`❌ No encontrada en cache: ${this.getFileName(url)}`);
      console.groupEnd();
      return url;
    } catch (error) {
      console.warn("❌ Error obteniendo imagen cacheada:", error);
      console.groupEnd();
      return url;
    }
  }

  static async verifyImageCache(products) {
    if (!("caches" in window)) {
      return { available: false, cachedImages: 0 };
    }

    try {
      console.group(`🔍 ImageCacheService: Verificando cache MANUAL`);

      // ✅ USAR EL MISMO NOMBRE QUE WORKBOX
      const cache = await caches.open("imgbb-images-v2");
      const keys = await cache.keys();

      console.log(`📦 Total imágenes en cache: ${keys.length}`);
      console.log(
        `📝 URLs en cache:`,
        keys.map((k) => this.getFileName(k.url))
      );

      const productImageUrls = products
        .filter((p) => p.imagen_url)
        .map((p) => p.imagen_url);

      console.log(`🖼️ Productos con imágenes: ${productImageUrls.length}`);

      const cachedProductImages = keys.filter((request) =>
        productImageUrls.includes(request.url)
      );

      console.log(
        `📊 Imágenes de productos en cache: ${cachedProductImages.length}`
      );
      console.log(
        `🎯 Cobertura: ${cachedProductImages.length}/${productImageUrls.length}`
      );

      const coverage =
        productImageUrls.length > 0
          ? Math.round(
              (cachedProductImages.length / productImageUrls.length) * 100
            )
          : 0;

      console.log(`📈 Porcentaje cobertura: ${coverage}%`);
      console.groupEnd();

      return {
        available: true,
        totalCached: keys.length,
        productImagesCached: cachedProductImages.length,
        totalProductImages: productImageUrls.length,
        coverage: coverage,
        cachedUrls: keys.map((k) => k.url),
      };
    } catch (error) {
      console.error("❌ Error verificando cache:", error);
      return { available: false, error: error.message };
    }
  }

  static async getCacheStatus() {
    try {
      if (!("caches" in window)) {
        return { available: false };
      }

      console.group(`📊 ImageCacheService: Estado del cache MANUAL`);

      // ✅ USAR EL MISMO NOMBRE QUE WORKBOX
      const cache = await caches.open("imgbb-images-v2");
      const keys = await cache.keys();

      console.log(`📦 Total imágenes: ${keys.length}`);
      console.log(
        `📝 URLs:`,
        keys.map((k) => this.getFileName(k.url))
      );
      console.groupEnd();

      return {
        available: true,
        totalImages: keys.length,
        imageUrls: keys.map((req) => req.url),
        cacheName: "imgbb-images-v2",
      };
    } catch (error) {
      console.error("❌ Error obteniendo estado del cache:", error);
      return { available: false, error: error.message };
    }
  }

  static async clearImageCache() {
    try {
      if (!("caches" in window)) return false;

      console.log(`🧹 ImageCacheService: Limpiando cache manual`);
      const deleted = await caches.delete("imgbb-images-v2");
      console.log(`✅ Cache limpiado: ${deleted}`);
      return deleted;
    } catch (error) {
      console.error("❌ Error limpiando cache:", error);
      return false;
    }
  }

  // ✅ NUEVO MÉTODO: Verificación de persistencia
  // ✅ MÉTODO testCachePersistence CORREGIDO
  static async testCachePersistence() {
    try {
      if (!("caches" in window)) {
        return { success: false, error: "Cache API no disponible" };
      }

      console.group("🧪 TEST DE PERSISTENCIA DE CACHE");

      const testUrl = "https://i.ibb.co/hRfJ08fP/ef1a26c5f51f.jpg";
      const cache = await caches.open("imgbb-images-v2");

      // 1. Guardar una imagen de test
      console.log("1. Guardando imagen de test...");
      const response = await fetch(testUrl);
      await cache.put(testUrl, response);

      // 2. Verificar inmediatamente
      console.log("2. Verificando inmediatamente...");
      const immediateCheck = await cache.match(testUrl);
      console.log(`   Inmediato: ${immediateCheck ? "✅" : "❌"}`);

      // 3. Esperar 2 segundos y verificar de nuevo
      console.log("3. Esperando 2 segundos...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const delayedCheck = await cache.match(testUrl);
      console.log(`   Después de 2s: ${delayedCheck ? "✅" : "❌"}`);

      // 4. Recargar la página y verificar (simulado)
      console.log("4. Simulando recarga...");
      const finalCheck = await cache.match(testUrl);
      console.log(`   Final: ${finalCheck ? "✅" : "❌"}`);

      console.groupEnd();

      return {
        success: !!finalCheck,
        immediate: !!immediateCheck,
        delayed: !!delayedCheck,
        final: !!finalCheck,
      };
    } catch (error) {
      console.error("❌ Error en test de persistencia:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ NUEVO MÉTODO: Verificación de cache más robusta para offline
  static async verifyImageCacheForOffline(products) {
    if (!("caches" in window)) {
      return { available: false, cachedImages: 0 };
    }

    try {
      console.group(`🔍 ImageCacheService: Verificación OFFLINE`);

      // ✅ USAR EL MISMO CACHE QUE WORKBOX
      const cache = await caches.open("imgbb-images-v2");
      const keys = await cache.keys();

      console.log(`📦 Total imágenes en cache: ${keys.length}`);

      const productImageUrls = products
        .filter((p) => p.imagen_url && p.imagen_url.includes("i.ibb.co"))
        .map((p) => p.imagen_url);

      console.log(
        `🖼️ Productos con imágenes ImgBB: ${productImageUrls.length}`
      );

      // ✅ VERIFICACIÓN REAL: Intentar acceder a cada imagen
      const verifiedCached = [];
      const failedCached = [];

      for (const url of productImageUrls) {
        try {
          const cached = await cache.match(url);
          if (cached) {
            const blob = await cached.blob();
            if (blob && blob.size > 0) {
              verifiedCached.push(url);
            } else {
              failedCached.push(url);
            }
          } else {
            failedCached.push(url);
          }
        } catch (error) {
          failedCached.push(url);
        }
      }

      console.log(`✅ Imágenes verificadas: ${verifiedCached.length}`);
      console.log(`❌ Imágenes fallidas: ${failedCached.length}`);

      const coverage =
        productImageUrls.length > 0
          ? Math.round((verifiedCached.length / productImageUrls.length) * 100)
          : 0;

      console.log(`📈 Cobertura real: ${coverage}%`);
      console.groupEnd();

      return {
        available: true,
        totalCached: keys.length,
        productImagesCached: verifiedCached.length,
        totalProductImages: productImageUrls.length,
        coverage: coverage,
        cachedUrls: verifiedCached,
        failedUrls: failedCached,
      };
    } catch (error) {
      console.error("❌ Error verificando cache offline:", error);
      return { available: false, error: error.message };
    }
  }
  // En ImageCacheService.js, después de la inicialización
  // ✅ MÉTODO CORREGIDO: Verificación de persistencia
  static async verifyCachePersistence() {
    try {
      // ✅ USAR EL MISMO CACHE QUE WORKBOX
      const cache = await caches.open("imgbb-images-v2");
      const keys = await cache.keys();
      console.log("🔍 Verificación persistencia cache:", {
        totalImages: keys.length,
        urls: keys.map((req) => req.url),
      });

      // ✅ CORREGIDO: No llamar a preloadCriticalImages si está vacío
      // En su lugar, simplemente retornar el estado
      if (keys.length === 0) {
        console.log(
          "🔄 Cache vacío - será poblado cuando se carguen productos"
        );
        // NO intentar precargar aquí - eso se hace en DataLoader con los productos
      }

      return keys.length > 0;
    } catch (error) {
      console.error("❌ Error verificando persistencia:", error);
      return false;
    }
  }

  // ✅ AGREGAR MÉTODO FALTANTE: preloadCriticalImages
  static async preloadCriticalImages(products = []) {
    try {
      console.group("🚀 ImageCacheService: Precarga crítica de imágenes");

      if (!products || products.length === 0) {
        console.log("📝 No hay productos para precargar");
        console.groupEnd();
        return { success: false, error: "No products provided" };
      }

      if (!("caches" in window)) {
        console.log("❌ Cache API no disponible");
        console.groupEnd();
        return { success: false, error: "Cache API not available" };
      }

      const criticalProducts = products.slice(0, 3); // Primeros 3 productos
      const imageUrls = criticalProducts
        .filter((p) => p.imagen_url && p.imagen_url.includes("i.ibb.co"))
        .map((p) => p.imagen_url);

      console.log(`📦 Precargando ${imageUrls.length} imágenes críticas...`);

      if (imageUrls.length === 0) {
        console.log("ℹ️ No hay imágenes críticas para precargar");
        console.groupEnd();
        return { success: true, loaded: 0, errors: 0 };
      }

      const cache = await caches.open("imgbb-images-v2");
      let loaded = 0;
      let errors = 0;

      for (const url of imageUrls) {
        try {
          // Verificar si ya está en cache
          const existing = await cache.match(url);
          if (existing) {
            console.log(`✅ Ya en cache: ${this.getFileName(url)}`);
            loaded++;
            continue;
          }

          // Descargar y guardar
          const response = await fetch(url, {
            mode: "cors",
            cache: "force-cache",
          });

          if (response.ok) {
            await cache.put(url, response);
            loaded++;
            console.log(`✅ Precargada: ${this.getFileName(url)}`);
          } else {
            errors++;
            console.warn(`❌ Error HTTP: ${response.status} - ${url}`);
          }
        } catch (error) {
          errors++;
          console.warn(`❌ Error precargando ${url}:`, error.message);
        }
      }

      console.log(`📊 Resultado precarga: ${loaded} OK, ${errors} errores`);
      console.groupEnd();

      return {
        success: errors === 0,
        loaded,
        errors,
      };
    } catch (error) {
      console.error("❌ Error en precarga crítica:", error);
      console.groupEnd();
      return { success: false, error: error.message };
    }
  }

  // ✅ AGREGAR MÉTODO saveImageToCache que se usa en OfflineImage
  static async saveImageToCache(url, imageElement) {
    try {
      if (!("caches" in window)) {
        console.warn("❌ Cache API no disponible para guardar imagen");
        return false;
      }

      console.log(`💾 Intentando guardar en cache: ${this.getFileName(url)}`);

      const cache = await caches.open("imgbb-images-v2");

      // Verificar si ya está en cache
      const existing = await cache.match(url);
      if (existing) {
        console.log(`✅ Ya está en cache: ${this.getFileName(url)}`);
        return true;
      }

      // Crear un blob desde el elemento de imagen
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = imageElement.naturalWidth;
      canvas.height = imageElement.naturalHeight;
      ctx.drawImage(imageElement, 0, 0);

      return new Promise((resolve) => {
        canvas.toBlob(
          async (blob) => {
            try {
              if (blob) {
                const response = new Response(blob, {
                  status: 200,
                  statusText: "OK",
                  headers: { "Content-Type": "image/jpeg" },
                });

                await cache.put(url, response);

                // Verificar que se guardó
                const verified = await cache.match(url);
                console.log(
                  `✅ Imagen guardada en cache: ${this.getFileName(url)} - ${
                    verified ? "Verificada" : "No verificada"
                  }`
                );
                resolve(!!verified);
              } else {
                console.warn(`❌ No se pudo crear blob para: ${url}`);
                resolve(false);
              }
            } catch (error) {
              console.warn(`❌ Error guardando en cache: ${error.message}`);
              resolve(false);
            }
          },
          "image/jpeg",
          0.8
        );
      });
    } catch (error) {
      console.error("❌ Error en saveImageToCache:", error);
      return false;
    }
  }
  static getFileName(url) {
    try {
      if (!url) return null;

      // Extraer nombre de archivo de la URL
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split("/").pop() || null;
    } catch (error) {
      console.error("❌ Error extrayendo nombre de archivo:", error);
      // Fallback: extraer directamente de la URL string
      const parts = url.split("/");
      return parts[parts.length - 1] || null;
    }
  }

  // También agregar esta función auxiliar
  static extractFileNameFromUrl(url) {
    return this.getFileName(url);
  }

  // ✅ NUEVO MÉTODO: Precarga forzada de imágenes críticas
  static async forcePreloadCriticalImages(products) {
    if (!("caches" in window)) {
      return { success: false, error: "Cache API no disponible" };
    }

    try {
      console.group(`🚀 PRECARGA FORZADA DE IMÁGENES CRÍTICAS`);

      const cache = await caches.open("imgbb-images-v2");
      const imageUrls = products
        .slice(0, 10) // Solo las primeras 10 imágenes
        .filter((p) => p.imagen_url && p.imagen_url.includes("i.ibb.co"))
        .map((p) => p.imagen_url);

      console.log(`📦 Precargando ${imageUrls.length} imágenes críticas...`);

      let loaded = 0;
      let errors = 0;

      for (const url of imageUrls) {
        try {
          // Verificar si ya está en cache
          const existing = await cache.match(url);
          if (existing) {
            console.log(`✅ Ya en cache: ${this.getFileName(url)}`);
            loaded++;
            continue;
          }

          // Descargar y guardar
          const response = await fetch(url, {
            mode: "cors",
            cache: "force-cache",
          });

          if (response.ok) {
            await cache.put(url, response);
            loaded++;
            console.log(`✅ Precargada: ${this.getFileName(url)}`);
          } else {
            errors++;
            console.warn(`❌ Error HTTP: ${response.status} - ${url}`);
          }
        } catch (error) {
          errors++;
          console.warn(`❌ Error precargando ${url}:`, error.message);
        }
      }

      console.log(`📊 Resultado precarga: ${loaded} OK, ${errors} errores`);
      console.groupEnd();

      return {
        success: errors === 0,
        loaded,
        errors,
      };
    } catch (error) {
      console.error("❌ Error en precarga forzada:", error);
      return { success: false, error: error.message };
    }
  }
}
export default ImageCacheService;
