// components/features/DataLoader/DataLoader.js - CORREGIDO
import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loadProductsIfNeeded,
  syncProductsForOffline,
} from "../../actions/productsActions";
import { loadCategoriesIfNeeded } from "../../actions/categoriesActions";
import { loadInventory } from "../../actions/inventoryActions";
import { loadOpenSesion } from "../../actions/sesionesCajaActions";
// ❌ REMOVER loadClosures de aquí - causaba conflicto
import LoadingSpinner from "../ui/LoadingSpinner/LoadingSpinner";
import styles from "./DataLoader.module.css";

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
      sessions: false,
      // ❌ REMOVER closures del progreso esencial
    },
  });

  const { data: products } = useSelector((state) => state.products);
  const { data: categories } = useSelector((state) => state.categories);

  const dispatch = useDispatch();
  const loadAttemptedRef = useRef(false);

  // ✅ FUNCIÓN CORREGIDA: PREPARAR DATOS OFFLINE
  const prepareOfflineData = async () => {
    try {
      console.log("🔄 DataLoader: Preparando datos offline...");
      await dispatch(syncProductsForOffline());
      console.log("✅ DataLoader: Datos offline preparados correctamente");
    } catch (error) {
      console.error("❌ DataLoader: Error preparando datos offline:", error);
    }
  };

  // ✅ CARGA ESENCIAL SIMPLIFICADA - SIN CIERRES
  useEffect(() => {
    const shouldLoadData =
      !checking &&
      isAuthenticated &&
      user &&
      !loadAttemptedRef.current &&
      !loadState.essentialDataLoaded;

    if (shouldLoadData) {
      loadAttemptedRef.current = true;
      console.log("🚀 DataLoader: Iniciando carga esencial OFFLINE...");

      const loadEssentialData = async () => {
        try {
          const loadPromises = [];
          const progressUpdates = {};

          // 📦 PRODUCTOS - SOLO DATOS OFFLINE
          console.log("📦 DataLoader: Cargando productos offline...");
          progressUpdates.products = false;

          const productsPromise = (async () => {
            try {
              await prepareOfflineData();
              await dispatch(loadProductsIfNeeded());
              setLoadState((prev) => ({
                ...prev,
                progress: { ...prev.progress, products: true },
              }));
              console.log("✅ DataLoader: Productos offline cargados");
            } catch (error) {
              console.error(
                "❌ DataLoader: Error cargando productos offline:",
                error
              );
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

          // 📊 INVENTARIO
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

          // 🏦 SESIONES ABIERTAS (ESENCIAL)
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

          // ❌ REMOVER CARGA DE CIERRES - Se maneja en Reports/ClosuresHistory

          // Establecer progreso inicial
          setLoadState((prev) => ({
            ...prev,
            progress: { ...prev.progress, ...progressUpdates },
          }));

          // Esperar a que todas las cargas esenciales terminen
          await Promise.allSettled(loadPromises);

          // ✅ CARGA COMPLETADA
          setLoadState((prev) => ({
            ...prev,
            essentialDataLoaded: true,
            initialLoadComplete: true,
          }));

          console.log("🎉 DataLoader: Carga esencial OFFLINE completada");
        } catch (error) {
          console.error("❌ DataLoader: Error en carga esencial:", error);
          setLoadState((prev) => ({
            ...prev,
            initialLoadComplete: true,
            essentialDataLoaded: true,
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
  ]);

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
          sessions: false,
        },
      });
    }
  }, [isAuthenticated]);

  // ✅ CALCULAR PROGRESO (actualizado)
  const calculateProgress = () => {
    const progressItems = Object.values(loadState.progress);
    const completed = progressItems.filter(Boolean).length;
    const total = progressItems.length;
    return Math.round((completed / total) * 100);
  };

  const progress = calculateProgress();

  // ✅ RENDERIZADO DE LOADING (actualizado)
  if (!loadState.initialLoadComplete) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <div className={styles.loadingContent}>
          <h3>Preparando aplicación</h3>
          <p>Cargando datos esenciales...</p>

          {/* BARRA DE PROGRESO */}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className={styles.progressText}>{progress}% completado</span>

          {/* DETALLES DE CARGA ACTUALIZADOS */}
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

          {/* ✅ INDICADOR MODO OFFLINE */}
          <div className={styles.offlineNotice}>
            <span>📱 Modo Offline - Trabajando con datos locales</span>
          </div>
        </div>
      </div>
    );
  }

  // ✅ RENDERIZAR CONTENIDO PRINCIPAL
  return children;
};

export default DataLoader;
