// components/DataLoader/DataLoader.jsx
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadProductsIfNeeded,
  syncProductsForOffline,
} from "../../actions/productsActions";
import { loadCategoriesIfNeeded } from "../../actions/categoriesActions";
import { loadSales } from "../../actions/salesActions";
import { loadInventory } from "../../actions/inventoryActions";
import { loadTodayClosure } from "../../actions/closuresActions";
import { loadOpenSesion } from "../../actions/sesionesCajaActions";
import LoadingSpinner from "../ui/LoadingSpinner/LoadingSpinner";
import ImageDownloadManager from "../../utils/ImageDownloadManager";
import styles from "./DataLoader.module.css";

import {
  setupProductsSyncListener,
  syncProductsFromServer,
} from "../../actions/productsActions";
import ProductsOfflineController from "../../controllers/offline/ProductsOfflineController/ProductsOfflineController";

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
      inventory: false,
      sales: false,
      closures: false,
      sessions: false,
    },
  });

  const { data: products } = useSelector((state) => state.products);
  const { data: categories } = useSelector((state) => state.categories);

  const dispatch = useDispatch();
  const loadAttemptedRef = useRef(false);

  // ✅ NUEVA FUNCIÓN: SINCRONIZACIÓN FORZADA DE PRODUCTOS
  // const syncProductsData = async () => {
  //   try {
  //     console.log("🔄 DataLoader: Sincronizando datos de productos...");

  //     if (navigator.onLine) {
  //       // ✅ FORZAR SINCRONIZACIÓN DE PRODUCTOS
  //       const syncResult = await ProductsOfflineController.forceProductsSync();

  //       if (syncResult.success) {
  //         console.log("✅ DataLoader: Productos sincronizados correctamente");
  //         // Recargar productos en Redux
  //         await dispatch(loadProductsIfNeeded());
  //       } else {
  //         console.warn(
  //           "⚠️ DataLoader: No se pudieron sincronizar productos:",
  //           syncResult.error
  //         );
  //       }

  //     }
  //   } catch (error) {
  //     console.error("❌ DataLoader: Error sincronizando productos:", error);
  //   }
  // };
  // ✅ FUNCIÓN ACTUALIZADA: SINCRONIZACIÓN CON DESCARGA DE IMÁGENES
  const syncProductsData = async () => {
    try {
      console.log("🔄 DataLoader: Sincronizando datos de productos...");

      if (navigator.onLine) {
        // ✅ FORZAR SINCRONIZACIÓN DE PRODUCTOS CON DESCARGAR IMÁGENES
        const syncResult =
          await ProductsOfflineController.forceProductsSyncWithImageDownload();

        if (syncResult.success) {
          console.log("✅ DataLoader: Productos sincronizados correctamente");
          console.log(
            `📦 ${syncResult.imagesDownloaded} imágenes descargadas localmente`
          );

          // Recargar productos en Redux
          await dispatch(loadProductsIfNeeded());

          // Disparar evento de sincronización completada
          window.dispatchEvent(
            new CustomEvent("products_sync_complete", {
              detail: syncResult,
            })
          );
        } else {
          console.warn(
            "⚠️ DataLoader: No se pudieron sincronizar productos:",
            syncResult.error
          );
        }
      } else {
        console.log("📱 DataLoader: Modo offline - usando datos locales");
      }
    } catch (error) {
      console.error("❌ DataLoader: Error sincronizando productos:", error);
    }
  };
  // ✅ CARGA ESENCIAL DE DATOS - VERSIÓN MEJORADA
  useEffect(() => {
    const shouldLoadData =
      !checking &&
      isAuthenticated &&
      user &&
      !loadAttemptedRef.current &&
      !loadState.essentialDataLoaded;

    if (shouldLoadData) {
      loadAttemptedRef.current = true;
      console.log("🚀 DataLoader: Iniciando carga esencial de datos...");

      const loadEssentialData = async () => {
        try {
          const loadPromises = [];
          const progressUpdates = {};

          // 📦 PRODUCTOS - CON SINCRONIZACIÓN FORZADA
          console.log("📦 DataLoader: Cargando productos...");
          progressUpdates.products = false;

          const productsPromise = (async () => {
            try {
              // ✅ PRIMERO: SINCRONIZAR SI ESTAMOS ONLINE
              if (isOnline) {
                await syncProductsData();
              }

              // ✅ LUEGO: CARGAR PRODUCTOS
              await dispatch(loadProductsIfNeeded());

              setLoadState((prev) => ({
                ...prev,
                progress: { ...prev.progress, products: true },
              }));
              console.log("✅ DataLoader: Productos cargados");
            } catch (error) {
              console.error("❌ DataLoader: Error cargando productos:", error);
              // Continuar incluso si hay error
              setLoadState((prev) => ({
                ...prev,
                progress: { ...prev.progress, products: true },
              }));
            }
          })();

          loadPromises.push(productsPromise);

          // 📂 CATEGORÍAS
          if (!categories || categories.length === 0) {
            console.log("📂 DataLoader: Cargando categorías...");
            progressUpdates.categories = false;
            loadPromises.push(
              dispatch(loadCategoriesIfNeeded())
                .then(() => {
                  setLoadState((prev) => ({
                    ...prev,
                    progress: { ...prev.progress, categories: true },
                  }));
                  console.log("✅ DataLoader: Categorías cargadas");
                })
                .catch((error) => {
                  console.error(
                    "❌ DataLoader: Error cargando categorías:",
                    error
                  );
                  setLoadState((prev) => ({
                    ...prev,
                    progress: { ...prev.progress, categories: true },
                  }));
                })
            );
          } else {
            console.log("✅ DataLoader: Categorías ya cargadas");
            progressUpdates.categories = true;
          }

          // 📊 INVENTARIO (siempre cargar para tener datos actualizados)
          console.log("📊 DataLoader: Cargando inventario...");
          progressUpdates.inventory = false;
          loadPromises.push(
            dispatch(loadInventory())
              .then(() => {
                setLoadState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, inventory: true },
                }));
                console.log("✅ DataLoader: Inventario cargado");
              })
              .catch((error) => {
                console.error(
                  "❌ DataLoader: Error cargando inventario:",
                  error
                );
                setLoadState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, inventory: true },
                }));
              })
          );

          // 💰 CIERRES DE CAJA
          console.log("💰 DataLoader: Cargando cierres de caja...");
          progressUpdates.closures = false;
          loadPromises.push(
            dispatch(loadTodayClosure())
              .then(() => {
                setLoadState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, closures: true },
                }));
                console.log("✅ DataLoader: Cierres de caja cargados");
              })
              .catch((error) => {
                console.error("❌ DataLoader: Error cargando cierres:", error);
                setLoadState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, closures: true },
                }));
              })
          );

          // 🏦 SESIONES ABIERTAS
          if (user?.id) {
            console.log("🏦 DataLoader: Verificando sesiones activas...");
            progressUpdates.sessions = false;
            loadPromises.push(
              dispatch(loadOpenSesion(user.id))
                .then(() => {
                  setLoadState((prev) => ({
                    ...prev,
                    progress: { ...prev.progress, sessions: true },
                  }));
                  console.log("✅ DataLoader: Sesiones verificadas");
                })
                .catch((error) => {
                  console.error(
                    "❌ DataLoader: Error verificando sesiones:",
                    error
                  );
                  setLoadState((prev) => ({
                    ...prev,
                    progress: { ...prev.progress, sessions: true },
                  }));
                })
            );
          } else {
            progressUpdates.sessions = true;
          }

          // Establecer progreso inicial
          setLoadState((prev) => ({
            ...prev,
            progress: { ...prev.progress, ...progressUpdates },
          }));

          // 🔄 SINCRONIZAR PRODUCTOS PARA OFFLINE (solo online)
          if (isOnline) {
            try {
              console.log(
                "🔄 DataLoader: Sincronizando productos para offline..."
              );
              await dispatch(syncProductsForOffline());
              console.log(
                "✅ DataLoader: Productos sincronizados para offline"
              );
            } catch (syncError) {
              console.log(
                "⚠️ DataLoader: Sincronización offline falló:",
                syncError.message
              );
            }
          }

          // Esperar a que todas las cargas esenciales terminen
          await Promise.allSettled(loadPromises);

          // ✅ CARGA COMPLETADA
          setLoadState((prev) => ({
            ...prev,
            essentialDataLoaded: true,
            initialLoadComplete: true,
          }));

          console.log("🎉 DataLoader: Carga esencial completada");

          // ✅ DISPARAR EVENTO DE CARGA COMPLETADA
          window.dispatchEvent(
            new CustomEvent("data_loader_complete", {
              detail: {
                timestamp: new Date().toISOString(),
                productsCount: products?.length || 0,
                categoriesCount: categories?.length || 0,
              },
            })
          );
        } catch (error) {
          console.error("❌ DataLoader: Error en carga esencial:", error);
          setLoadState((prev) => ({
            ...prev,
            initialLoadComplete: true,
            essentialDataLoaded: true, // Forzar continuar incluso con errores
          }));
        }
      };

      // Timeout de seguridad
      const timeout = setTimeout(() => {
        if (!loadState.initialLoadComplete) {
          console.log("⏰ DataLoader: Timeout - Continuando con carga parcial");
          setLoadState((prev) => ({
            ...prev,
            initialLoadComplete: true,
            essentialDataLoaded: true,
          }));
        }
      }, 15000);

      loadEssentialData().finally(() => {
        clearTimeout(timeout);
      });
    }
  }, [
    isAuthenticated,
    checking,
    user,
    dispatch,
    loadState.essentialDataLoaded,
    loadState.initialLoadComplete,
    products,
    categories,
    isOnline,
  ]);

  // ✅ LISTENERS DE SINCRONIZACIÓN - VERSIÓN MEJORADA
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    console.log("🔧 DataLoader: Configurando listeners de sincronización...");

    // ✅ CONFIGURAR LISTENER DE SINCRONIZACIÓN
    dispatch(setupProductsSyncListener());

    // ✅ SINCRONIZAR PRODUCTOS AL INICIAR (solo si hay conexión)
    if (navigator.onLine) {
      const initialSync = setTimeout(() => {
        console.log("🔄 DataLoader: Sincronización inicial de productos...");
        dispatch(syncProductsFromServer());
      }, 3000); // Pequeño delay para no sobrecargar el inicio

      // ✅ SINCRONIZACIÓN FORZADA ADICIONAL
      const forceSync = setTimeout(() => {
        if (navigator.onLine) {
          console.log("🔄 DataLoader: Sincronización forzada de productos...");
          syncProductsData();
        }
      }, 5000);

      return () => {
        clearTimeout(initialSync);
        clearTimeout(forceSync);
      };
    }
  }, [dispatch, isAuthenticated, user]);

  // ✅ SINCRONIZACIÓN PERIÓDICA MEJORADA
  useEffect(() => {
    if (!isAuthenticated || !user || !navigator.onLine) return;

    console.log("⏰ DataLoader: Iniciando sincronización periódica...");

    // ✅ SINCRONIZAR CADA 3 MINUTOS (más frecuente para mejor consistencia)
    const interval = setInterval(() => {
      if (navigator.onLine) {
        console.log("🔄 DataLoader: Sincronización periódica de productos...");
        dispatch(syncProductsFromServer());

        // ✅ SINCRONIZACIÓN FORZADA CADA 2 CICLOS (6 minutos)
        if (Date.now() % (2 * 3 * 60 * 1000) < 3000) {
          syncProductsData();
        }
      }
    }, 3 * 60 * 1000); // 3 minutos

    return () => {
      console.log("🧹 DataLoader: Limpiando sincronización periódica...");
      clearInterval(interval);
    };
  }, [dispatch, isAuthenticated, user]);

  // ✅ LISTENER PARA EVENTOS EXTERNOS DE SINCRONIZACIÓN
  useEffect(() => {
    const handleForceSync = () => {
      if (navigator.onLine) {
        console.log("🔄 DataLoader: Sincronización forzada por evento externo");
        syncProductsData();
      }
    };

    const handleOnline = () => {
      console.log("🌐 DataLoader: Conexión restaurada - Sincronizando...");
      setTimeout(() => {
        syncProductsData();
        dispatch(syncProductsFromServer());
      }, 2000);
    };

    // Registrar event listeners
    window.addEventListener("force_products_sync", handleForceSync);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("force_products_sync", handleForceSync);
      window.removeEventListener("online", handleOnline);
    };
  }, [dispatch]);

  // ✅ RESETEO AL CERRAR SESIÓN
  useEffect(() => {
    if (!isAuthenticated && loadAttemptedRef.current) {
      console.log("🔄 DataLoader: Sesión cerrada, reseteando...");
      loadAttemptedRef.current = false;
      setLoadState({
        initialLoadComplete: false,
        essentialDataLoaded: false,
        progress: {
          products: false,
          categories: false,
          inventory: false,
          sales: false,
          closures: false,
          sessions: false,
        },
      });
    }
  }, [isAuthenticated]);

  // ✅ CALCULAR PROGRESO
  const calculateProgress = () => {
    const progressItems = Object.values(loadState.progress);
    const completed = progressItems.filter(Boolean).length;
    const total = progressItems.length;
    return Math.round((completed / total) * 100);
  };

  const progress = calculateProgress();

  // ✅ RENDERIZADO DE LOADING
  if (!loadState.initialLoadComplete) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <div className={styles.loadingContent}>
          <h3>Preparando aplicación</h3>
          <p>
            {isOnline
              ? "Cargando datos del servidor..."
              : "Cargando datos locales..."}
          </p>

          {/* BARRA DE PROGRESO */}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className={styles.progressText}>{progress}% completado</span>

          {/* DETALLES DE CARGA */}
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
                  loadState.progress.inventory
                    ? styles.completed
                    : styles.pending
                }`}
              ></span>
              <span>
                Inventario {loadState.progress.inventory ? "✓" : "..."}
              </span>
            </div>
            <div className={styles.loadingItem}>
              <span
                className={`${styles.statusDot} ${
                  loadState.progress.closures
                    ? styles.completed
                    : styles.pending
                }`}
              ></span>
              <span>
                Cierres de caja {loadState.progress.closures ? "✓" : "..."}
              </span>
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
          </div>

          {/* ✅ INDICADOR DE SINCRONIZACIÓN */}
          {isOnline && (
            <div className={styles.syncNotice}>
              <span>🔄 Sincronizando datos en tiempo real...</span>
            </div>
          )}

          {!isOnline && (
            <div className={styles.offlineNotice}>
              <span>📱 Modo Offline - Usando datos locales</span>
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
