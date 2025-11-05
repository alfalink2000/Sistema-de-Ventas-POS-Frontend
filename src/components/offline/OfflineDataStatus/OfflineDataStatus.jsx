// src/components/features/offline/OfflineDataStatus/OfflineDataStatus.jsx - VERSIÓN SIMPLIFICADA
import { useState, useEffect } from "react";
import { FiWifi, FiWifiOff, FiUsers, FiPackage } from "react-icons/fi";
import styles from "./OfflineDataStatus.module.css";
import IndexedDBService from "../../../services/IndexedDBService";
import ProductsOfflineController from "../../../controllers/offline/ProductsOfflineController/ProductsOfflineController";

const OfflineDataStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineUsers, setOfflineUsers] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [dbInitialized, setDbInitialized] = useState(false);

  // Inicializar IndexedDB y cargar datos
  useEffect(() => {
    initializeDB();
  }, []);

  const initializeDB = async () => {
    try {
      const initialized = await IndexedDBService.init();
      setDbInitialized(initialized);

      if (initialized) {
        await loadOfflineData();
      }
    } catch (error) {
      console.error("❌ Error inicializando DB:", error);
    }
  };

  const loadOfflineData = async () => {
    if (!dbInitialized) return;

    try {
      // ✅ OBTENER USUARIOS
      const storeExists = await IndexedDBService.storeExists("offline_users");
      if (storeExists) {
        const users = await IndexedDBService.getAll("offline_users");
        setOfflineUsers(users || []);
      }

      // ✅ Cargar productos
      try {
        const products = await ProductsOfflineController.getProducts();
        setProductos(products || []);
      } catch (productError) {
        console.error("❌ Error cargando productos:", productError);
        setProductos([]);
      }

      // ✅ Cargar categorías
      try {
        const categoriesStoreExists = await IndexedDBService.storeExists(
          "categorias"
        );
        if (categoriesStoreExists) {
          const categories = await IndexedDBService.getAll("categorias");
          setCategorias(categories || []);
        }
      } catch (categoryError) {
        console.error("❌ Error cargando categorías:", categoryError);
        setCategorias([]);
      }
    } catch (error) {
      console.error("❌ Error cargando datos offline:", error);
    }
  };

  // Monitorear conexión
  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 Conexión restaurada");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("📴 Conexión perdida");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Recargar datos cuando la DB se inicialice
  useEffect(() => {
    if (dbInitialized) {
      loadOfflineData();
    }
  }, [dbInitialized]);

  const getDataStatus = () => {
    const hasUsers = offlineUsers.length > 0;
    const hasProducts = productos.length > 0;
    const hasCategories = categorias.length > 0;

    if (hasUsers && hasProducts && hasCategories) {
      return { type: "optimal", text: "Datos completos" };
    } else {
      return { type: "critical", text: "Datos insuficientes" };
    }
  };

  const dataStatus = getDataStatus();

  if (!dbInitialized) {
    return (
      <div className={styles.container}>
        <div className={styles.statusHeader}>
          <div className={styles.connectionStatus}>
            <FiWifiOff className={styles.statusIcon} />
            <span>Inicializando base de datos...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.statusHeader}>
        {/* GRUPO DE ESTADO Y DATOS */}
        <div className={styles.statusGroup}>
          {/* ESTADO DE CONEXIÓN */}
          <div
            className={`${styles.connectionStatus} ${
              isOnline ? styles.statusOnline : styles.statusOffline
            }`}
          >
            {isOnline ? (
              <FiWifi className={`${styles.statusIcon} ${styles.onlineIcon}`} />
            ) : (
              <FiWifiOff
                className={`${styles.statusIcon} ${styles.offlineIcon}`}
              />
            )}
            <span>{isOnline ? "En línea" : "Sin conexión"}</span>
          </div>

          {/* DATOS EN LÍNEA */}
          <div className={styles.dataStatusRow}>
            {/* Usuarios */}
            <div className={styles.dataItem}>
              <FiUsers className={styles.dataIcon} />
              <span className={styles.dataText}>
                {offlineUsers.length} user{offlineUsers.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Productos */}
            <div className={styles.dataItem}>
              <FiPackage className={styles.dataIcon} />
              <span className={styles.dataText}>
                {productos.length} prod{productos.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Categorías */}
            <div className={styles.dataItem}>
              <FiPackage className={styles.dataIcon} />
              <span className={styles.dataText}>
                {categorias.length} cat{categorias.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Indicador de estado */}
            <div
              className={`${styles.statusIndicator} ${
                dataStatus.type === "optimal"
                  ? styles.statusOptimal
                  : styles.statusCritical
              }`}
            >
              <span>{dataStatus.text}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineDataStatus;
