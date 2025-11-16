// export default DataLoader;
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadProductsIfNeeded,
  syncProductsFromServer,
  loadProducts, // ✅ AGREGAR ESTA IMPORTACIÓN
} from "../../actions/productsActions";
import { loadCategoriesIfNeeded } from "../../actions/categoriesActions";
import { loadUsers } from "../../actions/usersActions";
import { loadOpenSesion } from "../../actions/sesionesCajaActions";
import LoadingSpinner from "../ui/LoadingSpinner/LoadingSpinner";
import styles from "./DataLoader.module.css";
import IndexedDBService from "../../services/IndexedDBService";
import ImageCacheService from "../../services/ImageCacheService";

const DataLoader = ({
  children,
  isOnline,
  isAuthenticated,
  checking,
  user,
}) => {
  const [loadState, setLoadState] = useState({
    initialLoadComplete: false,
    essentialDataLoaded: false,
    progress: {
      products: false,
      categories: false,
      users: false,
      sessions: false,
      images: false,
    },
    error: null,
  });

  const { products } = useSelector((state) => state.products);
  const { categories } = useSelector((state) => state.categories);
  const { users } = useSelector((state) => state.users);
  const { openSession } = useSelector((state) => state.sesionesCaja);

  const dispatch = useDispatch();
  const loadAttemptedRef = useRef(false);
  const dataSummaryRef = useRef({
    backend: {},
    indexeddb: {},
    syncStatus: {},
  });

  // ✅ PRECARGA AGRESIVA DE IMÁGENES - CORREGIDA
  const preloadImagesAggressively = async (products) => {
    try {
      console.group("🚀 PRECARGA AGRESIVA DE IMÁGENES");

      if (!navigator.onLine) {
        console.log("📱 Modo offline - saltando precarga");
        console.groupEnd();
        return;
      }

      if (!products || products.length === 0) {
        console.log("📝 No hay productos para precargar");
        console.groupEnd();
        return;
      }

      // ✅ USAR EL MÉTODO CORREGIDO
      const result = await ImageCacheService.preloadCriticalImages(products);

      console.log(
        `✅ Precarga agresiva: ${result.loaded || 0} imágenes cargadas`
      );

      // En segundo plano, cargar el resto usando cacheProductImages
      setTimeout(async () => {
        try {
          const remainingProducts = products.slice(3);
          if (remainingProducts.length > 0) {
            console.log(
              `🔄 Iniciando carga en background de ${remainingProducts.length} imágenes...`
            );
            await ImageCacheService.cacheProductImages(remainingProducts);
            console.log(`✅ Carga en background completada`);
          }
        } catch (bgError) {
          console.warn("⚠️ Error en carga background:", bgError);
        }
      }, 2000);

      console.groupEnd();
    } catch (error) {
      console.error("❌ Error en precarga agresiva:", error);
      console.groupEnd();
    }
  };

  useEffect(() => {
    if (products && products.length > 0 && isOnline) {
      preloadImagesAggressively(products);
    }
  }, [products, isOnline]);

  // ✅ LOGS DETALLADOS MEJORADOS
  const logDataSummary = async () => {
    try {
      console.group("📊 RESUMEN COMPLETO DE DATOS CARGADOS");

      // 📦 DATOS DE REDUX
      console.log("🔄 DATOS EN REDUX:", {
        productos: {
          count: products?.length || 0,
          sample:
            products?.slice(0, 2)?.map((p) => ({
              nombre: p.nombre,
              stock: p.stock,
              precio: p.precio,
              modificado_local:
                p.stock_modificado_localmente || p.precio_modificado_localmente,
            })) || [],
        },
        categorias: {
          count: categories?.length || 0,
        },
        usuarios: {
          count: users?.length || 0,
        },
        sesionActiva: !!openSession,
      });

      // 💾 DATOS EN INDEXEDDB
      console.log("💾 DATOS EN INDEXEDDB:");
      try {
        const productosDB = await IndexedDBService.getAll("productos");
        console.log(`   📦 Productos: ${productosDB.length}`);

        // ✅ VERIFICAR PRODUCTOS CON DATOS LOCALES PRESERVADOS
        const productosConDatosLocales = productosDB.filter(
          (p) => p.stock_modificado_localmente || p.precio_modificado_localmente
        );

        console.log(
          `   🎯 Productos con datos locales preservados: ${productosConDatosLocales.length}`
        );

        if (productosConDatosLocales.length > 0) {
          console.log(
            "   🔍 Ejemplos de datos preservados:",
            productosConDatosLocales.slice(0, 3).map((p) => ({
              nombre: p.nombre,
              stock: p.stock,
              precio: p.precio,
              stock_modificado: p.stock_modificado_localmente,
              precio_modificado: p.precio_modificado_localmente,
            }))
          );
        }
      } catch (dbError) {
        console.log("   ❌ Error accediendo a IndexedDB:", dbError);
      }

      console.log("🎯 RESUMEN FINAL:", {
        modo: isOnline ? "🌐 ONLINE" : "📱 OFFLINE",
        productosCargados: products?.length || 0,
        datosLocalesPreservados: true, // Se verifica arriba
        sesionActiva: !!openSession,
      });

      console.groupEnd();
    } catch (error) {
      console.error("❌ Error generando resumen:", error);
    }
  };

  // ✅ CARGA ESENCIAL CORREGIDA - USANDO LA NUEVA LÓGICA DE COMBINACIÓN
  useEffect(() => {
    const shouldLoadData =
      !checking && isAuthenticated && user && !loadAttemptedRef.current;

    if (shouldLoadData) {
      console.log("🎯 DataLoader: Iniciando carga con combinación de datos...");
      loadAttemptedRef.current = true;

      const loadEssentialData = async () => {
        try {
          const loadPromises = [];

          // 📦 PRODUCTOS - ESTRATEGIA CORREGIDA
          console.log("📦 Iniciando carga de productos CON COMBINACIÓN...");
          const productsPromise = (async () => {
            try {
              let result;

              // ✅ SIEMPRE USAR loadProducts CON LA LÓGICA DE COMBINACIÓN
              console.log(
                "🔄 Ejecutando loadProducts (con combinación automática)..."
              );
              result = await dispatch(loadProducts(true)); // true = forceRefresh para forzar combinación

              console.log("📊 Resultado de carga de productos:", {
                success: result?.success,
                source: result?.source,
                count: result?.data?.length,
                combined: result?.combined,
                maintainedLocalData: result?.combined, // ✅ ESTE ES EL INDICADOR CLAVE
              });

              if (result?.success && result?.combined) {
                console.log(
                  "✅ COMBINACIÓN EXITOSA: Stock y precios locales preservados"
                );
              }
            } catch (error) {
              console.error("❌ Error crítico cargando productos:", error);
            } finally {
              setLoadState((prev) => ({
                ...prev,
                progress: { ...prev.progress, products: true },
              }));
            }
          })();
          loadPromises.push(productsPromise);

          // 📂 CATEGORÍAS
          console.log("📂 Iniciando carga de categorías...");
          const categoriesPromise = dispatch(loadCategoriesIfNeeded()).finally(
            () => {
              setLoadState((prev) => ({
                ...prev,
                progress: { ...prev.progress, categories: true },
              }));
            }
          );
          loadPromises.push(categoriesPromise);

          // 👥 USUARIOS
          console.log("👥 Iniciando carga de usuarios...");
          const usersPromise = dispatch(loadUsers()).finally(() => {
            setLoadState((prev) => ({
              ...prev,
              progress: { ...prev.progress, users: true },
            }));
          });
          loadPromises.push(usersPromise);

          // 🏦 SESIONES ABIERTAS
          if (user?.id) {
            console.log("🏦 Verificando sesiones de caja activas...");
            const sessionsPromise = dispatch(loadOpenSesion(user.id)).finally(
              () => {
                setLoadState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, sessions: true },
                }));
              }
            );
            loadPromises.push(sessionsPromise);
          } else {
            setLoadState((prev) => ({
              ...prev,
              progress: { ...prev.progress, sessions: true },
            }));
          }

          // Esperar a que todas las cargas esenciales terminen
          await Promise.allSettled(loadPromises);

          // ✅ MARCAR IMÁGENES COMO COMPLETADAS (NO BLOQUEAR POR ELLAS)
          setLoadState((prev) => ({
            ...prev,
            progress: { ...prev.progress, images: true },
          }));

          // ✅ CARGA COMPLETADA - GENERAR RESUMEN
          console.log("🎯 Todas las cargas esenciales completadas");

          setTimeout(async () => {
            await logDataSummary();

            setLoadState((prev) => ({
              ...prev,
              essentialDataLoaded: true,
              initialLoadComplete: true,
            }));
          }, 1000);
        } catch (error) {
          console.error("❌ Error en carga esencial:", error);
          setLoadState((prev) => ({
            ...prev,
            initialLoadComplete: true,
            essentialDataLoaded: true,
            error: error.message,
          }));
        }
      };

      // Timeout de seguridad
      const timeout = setTimeout(() => {
        if (!loadState.initialLoadComplete) {
          console.warn("⏰ Timeout: Continuando con carga parcial");
          setLoadState((prev) => ({
            ...prev,
            progress: { ...prev.progress, images: true },
            initialLoadComplete: true,
            essentialDataLoaded: true,
          }));
          logDataSummary();
        }
      }, 15000); // 15 segundos máximo

      loadEssentialData().finally(() => {
        clearTimeout(timeout);
      });
    }
  }, [
    isAuthenticated,
    checking,
    user,
    dispatch,
    loadState.initialLoadComplete,
    isOnline,
  ]);

  // ✅ RESETEO AL CERRAR SESIÓN
  useEffect(() => {
    if (!isAuthenticated && loadAttemptedRef.current) {
      console.log("🔄 Sesión cerrada - Reseteando DataLoader...");
      loadAttemptedRef.current = false;
      dataSummaryRef.current = { backend: {}, indexeddb: {}, syncStatus: {} };
      setLoadState({
        initialLoadComplete: false,
        essentialDataLoaded: false,
        progress: {
          products: false,
          categories: false,
          users: false,
          sessions: false,
          images: false,
        },
        error: null,
      });
    }
  }, [isAuthenticated]);

  const calculateProgress = () => {
    const progressItems = Object.values(loadState.progress);
    const completed = progressItems.filter(Boolean).length;
    const total = progressItems.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const progress = calculateProgress();

  // ✅ MOSTRAR ERROR SI HAY
  if (loadState.error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <h3>Error al cargar la aplicación</h3>
          <p>{loadState.error}</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ✅ RENDERIZADO DE LOADING
  if (!loadState.initialLoadComplete) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <div className={styles.loadingContent}>
          <h3>Preparando aplicación</h3>
          <p>
            {isOnline
              ? "Sincronizando y combinando datos..."
              : "Cargando datos locales..."}
          </p>

          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className={styles.progressText}>{progress}% completado</span>

          <div className={styles.loadingDetails}>
            <div className={styles.loadingItem}>
              <span
                className={`${styles.statusDot} ${
                  loadState.progress.products
                    ? styles.completed
                    : styles.pending
                }`}
              ></span>
              <span>Productos {loadState.progress.products ? "✓" : "..."}</span>
            </div>
            <div className={styles.loadingItem}>
              <span
                className={`${styles.statusDot} ${
                  loadState.progress.categories
                    ? styles.completed
                    : styles.pending
                }`}
              ></span>
              <span>
                Categorías {loadState.progress.categories ? "✓" : "..."}
              </span>
            </div>
            <div className={styles.loadingItem}>
              <span
                className={`${styles.statusDot} ${
                  loadState.progress.users ? styles.completed : styles.pending
                }`}
              ></span>
              <span>Usuarios {loadState.progress.users ? "✓" : "..."}</span>
            </div>
            <div className={styles.loadingItem}>
              <span
                className={`${styles.statusDot} ${
                  loadState.progress.sessions
                    ? styles.completed
                    : styles.pending
                }`}
              ></span>
              <span>
                Sesiones activas {loadState.progress.sessions ? "✓" : "..."}
              </span>
            </div>
            <div className={styles.loadingItem}>
              <span
                className={`${styles.statusDot} ${
                  loadState.progress.images ? styles.completed : styles.pending
                }`}
              ></span>
              <span>Imágenes {loadState.progress.images ? "✓" : "..."}</span>
            </div>
          </div>

          {!isOnline && (
            <div className={styles.offlineNotice}>
              <span>📱 Modo Offline - Trabajando con datos locales</span>
            </div>
          )}

          {/* ✅ AGREGAR INFO SOBRE COMBINACIÓN */}
          {isOnline && loadState.progress.products && (
            <div className={styles.combinationNotice}>
              <span>🔄 Combinando datos locales con servidor...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ✅ RENDERIZAR CONTENIDO PRINCIPAL
  return children;
};

export default DataLoader;
