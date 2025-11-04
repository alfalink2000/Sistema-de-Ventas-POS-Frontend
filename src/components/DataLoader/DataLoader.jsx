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
      sales: false,
      closures: false,
      sessions: false,
    },
  });

  const { data: products } = useSelector((state) => state.products);
  const { data: categories } = useSelector((state) => state.categories);

  const dispatch = useDispatch();
  const loadAttemptedRef = useRef(false);

  // ✅ CARGA ESENCIAL DE DATOS
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

          // 📦 PRODUCTOS
          if (!products || products.length === 0) {
            console.log("📦 DataLoader: Cargando productos...");
            progressUpdates.products = false;
            loadPromises.push(
              dispatch(loadProductsIfNeeded()).then(() => {
                setLoadState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, products: true },
                }));
                console.log("✅ DataLoader: Productos cargados");
              })
            );
          } else {
            console.log("✅ DataLoader: Productos ya cargados");
            progressUpdates.products = true;
          }

          // 📂 CATEGORÍAS
          if (!categories || categories.length === 0) {
            console.log("📂 DataLoader: Cargando categorías...");
            progressUpdates.categories = false;
            loadPromises.push(
              dispatch(loadCategoriesIfNeeded()).then(() => {
                setLoadState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, categories: true },
                }));
                console.log("✅ DataLoader: Categorías cargadas");
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
            dispatch(loadInventory()).then(() => {
              setLoadState((prev) => ({
                ...prev,
                progress: { ...prev.progress, inventory: true },
              }));
              console.log("✅ DataLoader: Inventario cargado");
            })
          );

          // 💰 CIERRES DE CAJA
          console.log("💰 DataLoader: Cargando cierres de caja...");
          progressUpdates.closures = false;
          loadPromises.push(
            dispatch(loadTodayClosure()).then(() => {
              setLoadState((prev) => ({
                ...prev,
                progress: { ...prev.progress, closures: true },
              }));
              console.log("✅ DataLoader: Cierres de caja cargados");
            })
          );

          // 🏦 SESIONES ABIERTAS
          if (user?.id) {
            console.log("🏦 DataLoader: Verificando sesiones activas...");
            progressUpdates.sessions = false;
            loadPromises.push(
              dispatch(loadOpenSesion(user.id)).then(() => {
                setLoadState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, sessions: true },
                }));
                console.log("✅ DataLoader: Sesiones verificadas");
              })
            );
          } else {
            progressUpdates.sessions = true;
          }

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

          console.log("🎉 DataLoader: Carga esencial completada");
        } catch (error) {
          console.error("❌ DataLoader: Error en carga esencial:", error);
          setLoadState((prev) => ({
            ...prev,
            initialLoadComplete: true,
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
