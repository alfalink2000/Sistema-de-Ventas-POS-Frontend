import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadProductsIfNeeded,
  syncProductsFromServer,
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
  // ✅ PRECARGA AGRESIVA DE IMÁGENES
  // ✅ CORREGIR LA FUNCIÓN preloadImagesAggressively
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
          const remainingProducts = products.slice(3); // Ya precargamos las primeras 3
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
    if (!isOnline) {
      // En modo offline, verificar y forzar recarga de cache
      ImageCacheService.verifyCachePersistence()
        .then((success) => {
          console.log(
            `📱 Modo offline - Cache ${success ? "disponible" : "vacío"}`
          );
          // No forzar recarga aquí - eso se hace cuando se cargan los productos
        })
        .catch((error) => {
          console.warn("⚠️ Advertencia verificando persistencia:", error);
        });
    }
  }, [isOnline]);

  // Luego en tu useEffect de productos, llama esta función:
  useEffect(() => {
    if (products && products.length > 0 && isOnline) {
      preloadImagesAggressively(products);
    }
  }, [products, isOnline]);
  // ✅ FUNCIÓN MEJORADA: Cachear imágenes de productos - ENFOQUE OFFLINE
  const cacheProductImages = async (productos, isCritical = false) => {
    try {
      console.group(`🖼️ DataLoader: Cacheando imágenes para OFFLINE`);
      console.log(`📊 Total productos: ${productos.length}`);
      console.log(`🌐 Online: ${isOnline}`);

      if (!isOnline) {
        // ✅ EN OFFLINE: Verificación más estricta del cache
        console.log("📱 Modo OFFLINE - verificando cache existente...");
        const cacheStatus = await ImageCacheService.verifyImageCacheForOffline(
          productos
        );
        console.log(
          `🔍 Estado real del cache: ${cacheStatus.coverage}% de cobertura`
        );

        // ✅ MARCAR IMÁGENES COMO LISTAS INMEDIATAMENTE EN OFFLINE
        setLoadState((prev) => ({
          ...prev,
          progress: { ...prev.progress, images: true },
        }));

        console.groupEnd();
        return cacheStatus;
      }

      // ✅ ONLINE: Precarga agresiva
      if (isCritical) {
        // Precarga inmediata de imágenes críticas
        await ImageCacheService.forcePreloadCriticalImages(
          productos.slice(0, 3)
        );
      } else {
        // Cache completo en segundo plano
        await ImageCacheService.cacheProductImages(productos);
      }

      // ✅ MARCAR IMÁGENES COMO LISTAS INMEDIATAMENTE
      setLoadState((prev) => ({
        ...prev,
        progress: { ...prev.progress, images: true },
      }));

      console.groupEnd();
      return { success: true };
    } catch (error) {
      console.error("❌ Error en cache de imágenes:", error);
      // ✅ NO BLOQUEAR LA APLICACIÓN
      setLoadState((prev) => ({
        ...prev,
        progress: { ...prev.progress, images: true },
      }));
      console.groupEnd();
      return { error: error.message };
    }
  };
  // Luego en tu useEffect de productos, llama esta función:
  useEffect(() => {
    if (products && products.length > 0 && isOnline) {
      preloadImagesAggressively(products);
    }
  }, [products, isOnline]);
  // ✅ FUNCIÓN MEJORADA: Logs detallados con verificación offline
  const logDataSummary = async () => {
    try {
      console.group("📊 RESUMEN COMPLETO DE DATOS CARGADOS");

      // 📦 DATOS DE REDUX (BACKEND/FRONTEND)
      console.log("🔄 DATOS EN REDUX (FRONTEND):", {
        productos: {
          count: products?.length || 0,
          sample:
            products?.slice(0, 3)?.map((p) => ({
              id: p.id,
              nombre: p.nombre,
              precio: p.precio_venta,
              tiene_imagen: !!p.imagen_url,
            })) || [],
        },
        categorias: {
          count: categories?.length || 0,
          sample:
            categories
              ?.slice(0, 3)
              ?.map((c) => ({ id: c.id, nombre: c.nombre })) || [],
        },
        usuarios: {
          count: users?.length || 0,
          sample:
            users
              ?.slice(0, 3)
              ?.map((u) => ({ id: u.id, username: u.username, rol: u.rol })) ||
            [],
        },
        sesionActiva: openSession
          ? {
              id: openSession.id,
              estado: openSession.estado,
              vendedor_id: openSession.vendedor_id,
            }
          : null,
      });

      // 💾 DATOS EN INDEXEDDB
      console.log("💾 DATOS EN INDEXEDDB:");

      const stores = [
        "productos",
        "categorias",
        "users",
        "sesiones_caja",
        "ventas_pendientes",
      ];

      for (const storeName of stores) {
        try {
          const exists = await IndexedDBService.storeExists(storeName);
          if (exists) {
            const data = await IndexedDBService.getAll(storeName);
            console.log(`   📁 ${storeName}:`, {
              count: data.length,
              sample: data.slice(0, 2).map((item) => {
                if (storeName === "productos") {
                  return {
                    id: item.id,
                    nombre: item.nombre,
                    stock: item.stock,
                    tiene_imagen: !!item.imagen_url,
                  };
                } else if (storeName === "users") {
                  return {
                    id: item.id,
                    username: item.username,
                    rol: item.rol,
                  };
                } else if (storeName === "ventas_pendientes") {
                  return {
                    id_local: item.id_local,
                    sincronizado: item.sincronizado,
                  };
                }
                return { id: item.id, ...item };
              }),
            });

            dataSummaryRef.current.indexeddb[storeName] = {
              count: data.length,
              exists: true,
            };
          } else {
            console.log(`   📁 ${storeName}: ❌ Store no existe`);
            dataSummaryRef.current.indexeddb[storeName] = {
              count: 0,
              exists: false,
            };
          }
        } catch (error) {
          console.log(`   📁 ${storeName}: ❌ Error: ${error.message}`);
          dataSummaryRef.current.indexeddb[storeName] = {
            count: 0,
            exists: false,
            error: error.message,
          };
        }
      }

      // ✅ VERIFICACIÓN MEJORADA DEL CACHE DE IMÁGENES
      console.log("🖼️ ESTADO DE CACHE DE IMÁGENES (PARA OFFLINE):");
      try {
        if ("caches" in window) {
          const cacheStatus = await ImageCacheService.getCacheStatus();
          console.log(`   📸 Cache disponible: ${cacheStatus.available}`);

          if (cacheStatus.available) {
            console.log(
              `   🔢 Total imágenes en cache: ${cacheStatus.totalImages}`
            );
            console.log(
              `   🔍 Ejemplos:`,
              cacheStatus.imageUrls?.slice(0, 3) || []
            );

            // Verificar cobertura para productos actuales
            if (products && products.length > 0) {
              const coverage = await ImageCacheService.verifyImageCache(
                products
              );
              console.log(
                `   🎯 Cobertura para productos: ${coverage.coverage}% (${coverage.productImagesCached}/${coverage.totalProductImages})`
              );

              // ✅ CRÍTICO: Actualizar estado basado en cobertura real
              if (coverage.coverage >= 50 && !loadState.progress.images) {
                setLoadState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, images: true },
                }));
                console.log(
                  "   ✅ Estado corregido: Imágenes marcadas como listas"
                );
              }
            }
          } else {
            console.log(
              "   ❌ Cache API no disponible o error:",
              cacheStatus.error
            );
          }
        } else {
          console.log("   ❌ Cache API no disponible en este navegador");
        }
      } catch (cacheError) {
        console.log("   ❌ Error verificando cache:", cacheError.message);
      }

      // 🔄 ESTADO DE SINCRONIZACIÓN
      console.log("🔄 ESTADO DE SINCRONIZACIÓN:", {
        modo: isOnline ? "🌐 ONLINE" : "📱 OFFLINE",
        backendToRedux: {
          productos: products?.length || 0,
          categorias: categories?.length || 0,
          usuarios: users?.length || 0,
        },
        reduxToIndexedDB: dataSummaryRef.current.indexeddb,
        sesionActiva: !!openSession,
        imagenesCacheadas: loadState.progress.images,
      });

      // 📈 MÉTRICAS DE PERFORMANCE
      const totalBackend =
        (products?.length || 0) +
        (categories?.length || 0) +
        (users?.length || 0);
      const totalIndexedDB = Object.values(
        dataSummaryRef.current.indexeddb
      ).reduce((sum, store) => sum + (store.count || 0), 0);

      // Calcular cobertura de imágenes
      let imageCoverage = "0%";
      let imagenesListas = loadState.progress.images;

      try {
        if (products && products.length > 0) {
          const coverage = await ImageCacheService.verifyImageCache(products);
          imageCoverage = `${coverage.coverage}%`;
          // ✅ SI HAY COBERTURA SUFICIENTE, MARCAR COMO LISTAS
          if (coverage.coverage >= 30 && !imagenesListas) {
            imagenesListas = true;
            setLoadState((prev) => ({
              ...prev,
              progress: { ...prev.progress, images: true },
            }));
          }
        }
      } catch (e) {
        imageCoverage = "N/A";
      }

      console.log("📈 MÉTRICAS FINALES:", {
        totalDatosBackend: totalBackend,
        totalDatosIndexedDB: totalIndexedDB,
        syncEfficiency:
          totalIndexedDB > 0
            ? `${Math.round((totalIndexedDB / totalBackend) * 100)}%`
            : "0%",
        storesIndexedDB: Object.keys(dataSummaryRef.current.indexeddb).length,
        imagenesListas: imagenesListas,
        coberturaImagenes: imageCoverage,
      });

      console.groupEnd();

      // 🎯 LOG RESUMEN FINAL MEJORADO - ENFOQUE OFFLINE
      console.log(
        `🎉 CARGA COMPLETADA | Modo: ${isOnline ? "ONLINE" : "OFFLINE"} | ` +
          `Backend: ${totalBackend} registros | ` +
          `IndexedDB: ${totalIndexedDB} registros | ` +
          `Sesión: ${openSession ? "ACTIVA" : "INACTIVA"} | ` +
          `Imágenes: ${imagenesListas ? "✅ CACHEADAS" : "⏳ PENDIENTES"} | ` +
          `Cobertura: ${imageCoverage}`
      );
    } catch (error) {
      console.error("❌ Error generando resumen de datos:", error);
    }
  };

  // ✅ CARGA ESENCIAL MEJORADA - ENFOQUE OFFLINE PRIMERO
  useEffect(() => {
    const shouldLoadData =
      !checking && isAuthenticated && user && !loadAttemptedRef.current;

    if (shouldLoadData) {
      console.log("🎯 Condiciones cumplidas, iniciando carga de datos...");
      loadAttemptedRef.current = true;

      const loadEssentialData = async () => {
        try {
          const loadPromises = [];

          // 📦 PRODUCTOS - ESTRATEGIA MEJORADA
          console.log("📦 Iniciando carga de productos...");
          const productsPromise = (async () => {
            try {
              let result;
              if (isOnline) {
                console.log(
                  "🌐 MODO ONLINE: Sincronizando productos desde servidor..."
                );
                result = await dispatch(loadProductsIfNeeded());

                if (result?.success) {
                  console.log(
                    `✅ Productos cargados desde servidor: ${
                      products?.length || 0
                    } registros`
                  );

                  // ✅ CORREGIDO: Usar el método correcto para guardar productos offline
                  try {
                    // Verificar que ProductsOfflineController tenga el método saveProducts
                    if (
                      ProductsOfflineController &&
                      ProductsOfflineController.saveProducts
                    ) {
                      await ProductsOfflineController.saveProducts(
                        products || []
                      );
                    } else {
                      console.warn(
                        "⚠️ ProductsOfflineController.saveProducts no disponible"
                      );
                      // Fallback: usar otro método disponible
                      if (ProductsOfflineController.saveProduct) {
                        for (const product of products || []) {
                          await ProductsOfflineController.saveProduct(product);
                        }
                      }
                    }
                  } catch (saveError) {
                    console.warn(
                      "⚠️ Error guardando productos offline:",
                      saveError
                    );
                  }
                }
              } else {
                console.log(
                  "📱 MODO OFFLINE: Cargando productos desde cache local..."
                );
                result = await dispatch(loadProductsIfNeeded(true));
                console.log(
                  `✅ Productos cargados desde cache: ${
                    products?.length || 0
                  } registros`
                );
              }
            } catch (error) {
              console.error("❌ Error crítico cargando productos:", error);
            } finally {
              setLoadState((prev) => ({
                ...prev,
                progress: { ...prev.progress, products: true },
              }));
              console.log("✅ Proceso de productos completado");
            }
          })();
          loadPromises.push(productsPromise);

          // 📂 CATEGORÍAS
          console.log("📂 Iniciando carga de categorías...");
          const categoriesPromise = dispatch(loadCategoriesIfNeeded())
            .then((result) => {
              console.log(
                `✅ Categorías cargadas: ${categories?.length || 0} registros`
              );
            })
            .catch((error) => {
              console.error("❌ Error cargando categorías:", error);
            })
            .finally(() => {
              setLoadState((prev) => ({
                ...prev,
                progress: { ...prev.progress, categories: true },
              }));
            });
          loadPromises.push(categoriesPromise);

          // 👥 USUARIOS
          console.log("👥 Iniciando carga de usuarios...");
          const usersPromise = dispatch(loadUsers())
            .then((result) => {
              const userCount = result?.count || users?.length || 0;
              console.log(`✅ Usuarios cargados: ${userCount} registros`);
            })
            .catch((error) => {
              console.error("❌ Error cargando usuarios:", error);
            })
            .finally(() => {
              setLoadState((prev) => ({
                ...prev,
                progress: { ...prev.progress, users: true },
              }));
            });
          loadPromises.push(usersPromise);

          // 🏦 SESIONES ABIERTAS
          if (user?.id) {
            console.log("🏦 Verificando sesiones de caja activas...");
            const sessionsPromise = dispatch(loadOpenSesion(user.id))
              .then((result) => {
                if (openSession) {
                  console.log(`✅ Sesión activa encontrada: ${openSession.id}`);
                } else {
                  console.log("ℹ️ No hay sesiones activas");
                }
              })
              .catch((error) => {
                console.error("❌ Error verificando sesiones:", error);
              })
              .finally(() => {
                setLoadState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, sessions: true },
                }));
              });
            loadPromises.push(sessionsPromise);
          } else {
            setLoadState((prev) => ({
              ...prev,
              progress: { ...prev.progress, sessions: true },
            }));
          }

          // Esperar a que todas las cargas esenciales terminen
          await Promise.allSettled(loadPromises);

          // ✅ CARGA COMPLETADA - GENERAR RESUMEN
          console.log(
            "🎯 Todas las cargas esenciales completadas, generando resumen..."
          );

          // Pequeño delay para asegurar que Redux se actualizó
          setTimeout(async () => {
            await logDataSummary();

            setLoadState((prev) => ({
              ...prev,
              essentialDataLoaded: true,
              initialLoadComplete: true,
            }));
          }, 500);
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

      // Timeout de seguridad - NO BLOQUEAR POR IMÁGENES
      const timeout = setTimeout(() => {
        if (!loadState.initialLoadComplete) {
          console.warn("⏰ Timeout: Continuando con carga parcial");

          // ✅ FORZAR ESTADO DE IMÁGENES A COMPLETADO EN TIMEOUT
          setLoadState((prev) => ({
            ...prev,
            progress: { ...prev.progress, images: true },
            initialLoadComplete: true,
            essentialDataLoaded: true,
          }));

          logDataSummary();
        }
      }, 10000); // 10 segundos máximo

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
    products,
    categories,
    users,
    openSession,
  ]);

  // ✅ RESETEO AL CERRAR SESIÓN
  useEffect(() => {
    if (!isAuthenticated && loadAttemptedRef.current) {
      console.log("🔄 Sesión cerrada - Reseteando DataLoader...");
      loadAttemptedRef.current = false;
      dataSummaryRef.current = {
        backend: {},
        indexeddb: {},
        syncStatus: {},
      };
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

  // ✅ VERIFICACIÓN FINAL DEL ESTADO DE IMÁGENES
  useEffect(() => {
    if (loadState.initialLoadComplete && !loadState.error) {
      // Verificación final para corregir cualquier estado incorrecto
      const verifyFinalImageState = async () => {
        if (products && products.length > 0) {
          try {
            const coverage = await ImageCacheService.verifyImageCache(products);
            console.log(
              `🔍 Verificación final: ${coverage.coverage}% de cobertura`
            );

            // Si tenemos cobertura decente pero el estado está mal, corregirlo
            if (coverage.coverage >= 30 && !loadState.progress.images) {
              console.log("✅ Corrigiendo estado final de imágenes");
              setLoadState((prev) => ({
                ...prev,
                progress: { ...prev.progress, images: true },
              }));
            }
          } catch (error) {
            console.warn("⚠️ Error en verificación final:", error);
          }
        }
      };

      verifyFinalImageState();
      console.log("🏁 DataLoader: Carga inicial marcada como completada");
    }
  }, [loadState.initialLoadComplete, loadState.error, products]);

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

  // ✅ RENDERIZADO DE LOADING (optimizado para no bloquear por imágenes)
  if (!loadState.initialLoadComplete) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <div className={styles.loadingContent}>
          <h3>Preparando aplicación</h3>
          <p>
            {isOnline ? "Sincronizando datos..." : "Cargando datos locales..."}
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
        </div>
      </div>
    );
  }

  // ✅ RENDERIZAR CONTENIDO PRINCIPAL
  return children;
};

export default DataLoader;
