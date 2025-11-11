import { useState, useEffect, useRef } from "react";
import ImageCacheService from "../../../services/ImageCacheService";

const OfflineImage = ({
  src,
  alt,
  className,
  fallback = null,
  onError,
  onLoad,
}) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Limpiar object URLs
      if (imgSrc && imgSrc.startsWith("blob:")) {
        URL.revokeObjectURL(imgSrc);
      }
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const loadImage = async () => {
      // ✅ FUNCIÓN FALLBACK SEGURA para obtener nombre de archivo
      const getFileNameSafe = (url) => {
        try {
          if (!url) return "unknown";

          // Primero intentar con ImageCacheService si existe
          if (
            ImageCacheService.getFileName &&
            typeof ImageCacheService.getFileName === "function"
          ) {
            return ImageCacheService.getFileName(url);
          }

          // Fallback: extraer nombre de archivo manualmente
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          const fileName = pathname.split("/").pop();
          return fileName || "unknown";
        } catch (error) {
          console.warn("❌ Error en getFileNameSafe, usando fallback:", error);
          // Último fallback: extraer de la string
          const parts = url.split("/");
          return parts[parts.length - 1] || "unknown";
        }
      };

      if (!src) {
        if (mountedRef.current && !isCancelled) {
          setError(true);
          setLoading(false);
        }
        return;
      }

      try {
        if (mountedRef.current && !isCancelled) {
          setLoading(true);
          setError(false);
        }

        const fileName = getFileNameSafe(src);
        console.log(`🖼️ OfflineImage: Cargando ${fileName}`);
        console.log(`🌐 Online: ${navigator.onLine}`);

        // ✅ VERIFICAR DISPONIBILIDAD DE ImageCacheService
        if (!ImageCacheService || !ImageCacheService.getCachedImage) {
          console.warn(
            "❌ ImageCacheService no disponible, cargando directamente"
          );
          if (mountedRef.current && !isCancelled) {
            setImgSrc(src);
            setLoading(false);
            onLoad?.();
          }
          return;
        }

        // ✅ ESTRATEGIA MEJORADA: Cache primero SIEMPRE
        const cachedUrl = await ImageCacheService.getCachedImage(src);

        if (cachedUrl && cachedUrl !== src) {
          console.log(`✅ Imagen encontrada en cache: ${fileName}`);

          if (mountedRef.current && !isCancelled) {
            setImgSrc(cachedUrl);
            setLoading(false);
            onLoad?.();
          }
          return;
        }

        // ✅ SI NO ESTÁ EN CACHE Y ESTAMOS OFFLINE, ERROR INMEDIATO
        if (!navigator.onLine) {
          console.warn(`📱 OFFLINE - Imagen no en cache: ${fileName}`);

          // Último intento: forzar verificación de cache
          try {
            const forcedCache = await ImageCacheService.getCachedImage(
              src,
              true
            );
            if (forcedCache && forcedCache !== src) {
              console.log(
                `🔄 Imagen recuperada en verificación forzada: ${fileName}`
              );
              if (mountedRef.current && !isCancelled) {
                setImgSrc(forcedCache);
                setLoading(false);
                onLoad?.();
              }
              return;
            }
          } catch (cacheError) {
            console.warn(
              "❌ Error en verificación forzada de cache:",
              cacheError
            );
          }

          // Si llegamos aquí, no hay imagen en cache
          if (mountedRef.current && !isCancelled) {
            setError(true);
            setLoading(false);
            onError?.(new Error("OFFLINE_IMAGE_NOT_CACHED"));
          }
          return;
        }

        // ✅ ONLINE: Cargar desde red
        console.log(`🌐 Cargando desde red: ${fileName}`);

        const img = new Image();
        const loadTimeout = setTimeout(() => {
          if (!img.complete) {
            console.warn(`⏰ Timeout cargando: ${fileName}`);
            img.onerror?.(new Event("timeout"));
          }
        }, 8000);

        img.onload = () => {
          clearTimeout(loadTimeout);
          console.log(`✅ Carga exitosa desde red: ${fileName}`);

          // ✅ INTENTAR GUARDAR EN CACHE PARA PRÓXIMA VEZ
          if (ImageCacheService.saveImageToCache) {
            ImageCacheService.saveImageToCache(src, img).catch((saveError) => {
              console.warn("⚠️ No se pudo guardar en cache:", saveError);
            });
          }

          if (mountedRef.current && !isCancelled) {
            setImgSrc(src);
            setLoading(false);
            onLoad?.();
          }
        };

        img.onerror = async (e) => {
          clearTimeout(loadTimeout);
          console.warn(`❌ Error carga red: ${fileName}`, e.type);

          // ✅ REINTENTAR CON CACHE (último recurso)
          if (retryCount < 1) {
            console.log(`🔄 Reintento con cache forzado...`);
            setRetryCount((prev) => prev + 1);

            try {
              const forcedCacheUrl = await ImageCacheService.getCachedImage(
                src,
                true
              );
              if (forcedCacheUrl && forcedCacheUrl !== src) {
                if (mountedRef.current && !isCancelled) {
                  setImgSrc(forcedCacheUrl);
                  setLoading(false);
                  onLoad?.();
                }
                return;
              }
            } catch (cacheError) {
              console.warn("❌ Error en reintento de cache:", cacheError);
            }
          }

          if (mountedRef.current && !isCancelled) {
            setError(true);
            setLoading(false);
            onError?.(e);
          }
        };

        img.src = src;
      } catch (error) {
        console.error(`💥 Error crítico en OfflineImage:`, error);

        // ✅ ULTIMO INTENTO: usar src directamente como fallback
        if (mountedRef.current && !isCancelled) {
          console.log("🔄 Usando fallback: src directo");
          setImgSrc(src);
          setLoading(false);
          onLoad?.();
        }
      }
    };

    loadImage();

    return () => {
      isCancelled = true;
    };
  }, [src, retryCount, onError, onLoad]);

  // ✅ RENDERIZADO SIMPLIFICADO
  if (error) {
    return (
      fallback || (
        <div className={styles.fallbackContainer}>
          <div className={styles.fallbackContent}>
            <div className={styles.fallbackIcon}>📸</div>
            <small>Imagen no disponible</small>
          </div>
        </div>
      )
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingPlaceholder}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onLoad={onLoad}
      onError={(e) => {
        console.warn(`❌ Error renderizando imagen: ${src}`);
        if (mountedRef.current) {
          setError(true);
          onError?.(e);
        }
      }}
    />
  );
};

// Estilos mínimos
const styles = {
  loadingPlaceholder: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    minHeight: "100px",
  },
  loadingSpinner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid #e5e5e5",
    borderTop: "2px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  fallbackContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    minHeight: "100px",
  },
  fallbackContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    color: "#6c757d",
  },
  fallbackIcon: {
    fontSize: "20px",
  },
};

export default OfflineImage;
