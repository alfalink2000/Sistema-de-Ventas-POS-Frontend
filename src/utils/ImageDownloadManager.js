// utils/ImageDownloadManager.js - ARCHIVO NUEVO
class ImageDownloadManager {
  constructor() {
    this.baseUrl = "/images/products/";
  }

  // ✅ DESCARGAR imagen de i.ibb.co y convertir a local
  async downloadAndCacheImage(externalUrl, productId) {
    try {
      if (!externalUrl || !productId) return null;

      // Verificar si es una URL de i.ibb.co
      if (!externalUrl.includes("i.ibb.co")) {
        console.log(`⏩ Saltando imagen no i.ibb.co: ${externalUrl}`);
        return null;
      }

      // Verificar si ya existe localmente
      const localPath = `${this.baseUrl}${productId}.webp`;
      const cached = await this.getLocalImage(localPath);
      if (cached) {
        console.log(`✅ Imagen ya en cache: ${productId}`);
        return localPath;
      }

      // Descargar imagen de i.ibb.co
      console.log(
        `📥 Descargando imagen para producto ${productId}:`,
        externalUrl
      );

      const response = await fetch(externalUrl, {
        mode: "cors",
        credentials: "omit",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${externalUrl}`);
      }

      const blob = await response.blob();

      // Verificar que sea una imagen válida
      if (!blob.type.startsWith("image/")) {
        throw new Error("Respuesta no es una imagen válida");
      }

      // Convertir a formato optimizado (WebP)
      const optimizedBlob = await this.optimizeImage(blob);

      // Guardar en cache local
      const saved = await this.saveLocalImage(localPath, optimizedBlob);

      if (saved) {
        console.log(`✅ Imagen guardada localmente: ${localPath}`);
        return localPath;
      } else {
        throw new Error("No se pudo guardar la imagen localmente");
      }
    } catch (error) {
      console.warn(`❌ Error descargando imagen ${productId}:`, error.message);
      return null; // No retornar la URL externa como fallback
    }
  }

  // ✅ OPTIMIZAR imagen (reducir tamaño)
  async optimizeImage(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        try {
          // Redimensionar si es muy grande (max 800px)
          const maxWidth = 800;
          let { width, height } = img;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a WebP (85% calidad) - fallback a JPEG si no soporta WebP
          if (canvas.toBlob) {
            canvas.toBlob(resolve, "image/webp", 0.85);
          } else {
            // Fallback para navegadores antiguos
            canvas.toBlob(resolve, "image/jpeg", 0.85);
          }
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Error cargando imagen para optimización"));
      };

      img.src = URL.createObjectURL(blob);
    });
  }

  // ✅ GUARDAR imagen en cache local
  async saveLocalImage(path, blob) {
    try {
      const cache = await caches.open("product-images-local");
      const response = new Response(blob, {
        headers: {
          "Content-Type": blob.type || "image/webp",
          "Cache-Control": "max-age=31536000",
        },
      });
      await cache.put(path, response);
      return true;
    } catch (error) {
      console.error("Error guardando imagen local:", error);
      return false;
    }
  }

  // ✅ OBTENER imagen local
  async getLocalImage(path) {
    try {
      const cache = await caches.open("product-images-local");
      const response = await cache.match(path);
      return response ? path : null;
    } catch (error) {
      return null;
    }
  }

  // ✅ DESCARGAR todas las imágenes de productos
  async downloadAllProductImages(products) {
    if (!products || !Array.isArray(products)) return products;

    console.log("📥 Iniciando descarga MASIVA de imágenes desde i.ibb.co...");

    let downloadedCount = 0;
    const totalProducts = products.length;

    const downloadPromises = products.map(async (product) => {
      if (!product.id) return product;

      const imageUrl = product.image || product.imagen || product.img;

      // Solo procesar URLs de i.ibb.co
      if (!imageUrl || !imageUrl.includes("i.ibb.co")) {
        return product;
      }

      try {
        const localPath = await this.downloadAndCacheImage(
          imageUrl,
          product.id
        );

        // Actualizar producto con ruta local
        if (localPath) {
          product.localImage = localPath;
          product.hasLocalImage = true;
          downloadedCount++;

          console.log(
            `✅ [${downloadedCount}/${totalProducts}] Imagen local para producto ${product.id}`
          );
        }
      } catch (error) {
        console.warn(`❌ Error con producto ${product.id}:`, error.message);
      }

      return product;
    });

    // Descargar en batches de 2 para no sobrecargar i.ibb.co
    for (let i = 0; i < downloadPromises.length; i += 2) {
      const batch = downloadPromises.slice(i, i + 2);
      await Promise.allSettled(batch);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Pausa de 1 segundo entre batches
    }

    console.log(
      `✅ Descarga masiva completada: ${downloadedCount}/${totalProducts} imágenes descargadas`
    );
    return products;
  }

  // ✅ VERIFICAR almacenamiento local
  async getLocalStorageUsage() {
    try {
      if (!navigator.storage || !navigator.storage.estimate) return null;

      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage,
        quota: estimate.quota,
        percentage: Math.round((estimate.usage / estimate.quota) * 100),
      };
    } catch (error) {
      return null;
    }
  }

  // ✅ LIMPIAR cache de imágenes
  async clearImageCache() {
    try {
      const cache = await caches.open("product-images-local");
      const keys = await cache.keys();
      await Promise.all(keys.map((key) => cache.delete(key)));
      console.log("🧹 Cache de imágenes limpiado");
      return true;
    } catch (error) {
      console.error("Error limpiando cache:", error);
      return false;
    }
  }
}

export default new ImageDownloadManager();
