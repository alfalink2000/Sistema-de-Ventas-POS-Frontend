// src/components/features/offline/OfflineDataStatus/OfflineDataStatus.jsx - VERSIÓN CORREGIDA
import { useState, useEffect } from "react";
import {
  FiWifi,
  FiWifiOff,
  FiUsers,
  FiPackage,
  FiRefreshCw,
  FiAlertTriangle,
  FiCheckCircle,
  FiDatabase,
} from "react-icons/fi";
import styles from "./OfflineDataStatus.module.css";
import IndexedDBService from "../../../services/IndexedDBService";
import AuthOfflineController from "../../../controllers/offline/AuthOfflineController/AuthOfflineController";
import ProductsOfflineController from "../../../controllers/offline/ProductsOfflineController/ProductsOfflineController";

const OfflineDataStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStats, setShowStats] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [offlineUsers, setOfflineUsers] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [usersStats, setUsersStats] = useState(null);

  // Cargar datos offline
  useEffect(() => {
    loadOfflineData();
  }, []);

  const loadOfflineData = async () => {
    try {
      // Cargar usuarios offline
      const users = await AuthOfflineController.getAllOfflineUsers();
      setOfflineUsers(users);

      // Cargar productos
      const products = await ProductsOfflineController.getProducts();
      setProductos(products);

      // Cargar categorías
      const categories = await IndexedDBService.getAll("categorias");
      setCategorias(categories || []);

      // Calcular estadísticas de usuarios
      calculateUsersStats(users);

      // Obtener última actualización
      const cache = await IndexedDBService.get("cache_maestros", "productos");
      if (cache?.ultima_actualizacion) {
        setLastUpdate(cache.ultima_actualizacion);
      }
    } catch (error) {
      console.error("Error cargando datos offline:", error);
    }
  };

  const calculateUsersStats = (users) => {
    if (!users || users.length === 0) {
      setUsersStats({
        totalRecords: 0,
        uniqueUsers: 0,
        duplicates: 0,
      });
      return;
    }

    const uniqueIds = new Set();
    const duplicates = users.length - new Set(users.map((u) => u.id)).size;

    users.forEach((user) => {
      if (user.id) uniqueIds.add(user.id);
    });

    setUsersStats({
      totalRecords: users.length,
      uniqueUsers: uniqueIds.size,
      duplicates: duplicates,
    });
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) return;

    setIsLoading(true);
    try {
      // Sincronizar usuarios
      await AuthOfflineController.syncUsersFromServer();

      // Sincronizar productos
      await ProductsOfflineController.syncProductsFromServer();

      // Recargar datos
      await loadOfflineData();
    } catch (error) {
      console.error("Error en sincronización:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await AuthOfflineController.cleanupDuplicateUsers();
      if (result.success) {
        console.log(`🧹 Limpiados ${result.removed} usuarios duplicados`);
        await loadOfflineData(); // Recargar datos
      }
    } catch (error) {
      console.error("Error limpiando duplicados:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calcular estado de datos
  const getDataStatus = () => {
    const hasUsers = offlineUsers.length > 0;
    const hasProducts = productos.length > 0;
    const hasCategories = categorias.length > 0;

    if (hasUsers && hasProducts && hasCategories) {
      return "optimal";
    } else if (hasUsers && hasProducts) {
      return "good";
    } else if (hasUsers) {
      return "minimal";
    } else {
      return "critical";
    }
  };

  const dataStatus = getDataStatus();
  const hasDuplicates = usersStats && usersStats.duplicates > 0;

  return (
    <div className={styles.container}>
      <div className={isOnline ? styles.statusOnline : styles.statusOffline}>
        {isOnline ? (
          <FiWifi className={styles.onlineIcon} />
        ) : (
          <FiWifiOff className={styles.offlineIcon} />
        )}
        <span>{isOnline ? "Conexión activa" : "Modo Offline"}</span>

        {/* ✅ BOTÓN DE DEBUG */}
        {hasDuplicates && (
          <button
            className={styles.debugButton}
            onClick={() => setShowStats(!showStats)}
            title="Mostrar información de depuración"
          >
            <FiDatabase />
          </button>
        )}
      </div>

      {/* ✅ INFORMACIÓN DE DEBUG */}
      {showStats && usersStats && (
        <div className={styles.debugInfo}>
          <div className={styles.debugItem}>
            <strong>Estadísticas de Usuarios:</strong>
          </div>
          <div className={styles.debugItem}>
            Registros totales: {usersStats.totalRecords}
          </div>
          <div className={styles.debugItem}>
            Usuarios únicos: {usersStats.uniqueUsers}
          </div>
          <div className={styles.debugItem}>
            Duplicados:{" "}
            <span className={styles.duplicateWarning}>
              {usersStats.duplicates}
            </span>
          </div>
          {usersStats.duplicates > 0 && (
            <button className={styles.cleanupButton} onClick={handleCleanup}>
              🧹 Limpiar Duplicados
            </button>
          )}
        </div>
      )}

      <div className={styles.dataStatus}>
        <div className={styles.dataItem}>
          <FiUsers className={styles.dataIcon} />
          <span>
            {offlineUsers.length} usuario{offlineUsers.length !== 1 ? "s" : ""}{" "}
            disponible{offlineUsers.length !== 1 ? "s" : ""} offline
            {hasDuplicates && <span className={styles.duplicateBadge}>!</span>}
          </span>
        </div>

        <div className={styles.dataItem}>
          <FiPackage className={styles.dataIcon} />
          <span>{productos.length} productos disponibles offline</span>
        </div>

        <div className={styles.dataItem}>
          <FiPackage className={styles.dataIcon} />
          <span>{categorias.length} categorías disponibles offline</span>
        </div>

        {lastUpdate && (
          <div className={styles.lastUpdate}>
            Actualizado: {formatDate(lastUpdate)}
          </div>
        )}

        {/* Mensajes de estado */}
        {dataStatus === "optimal" && (
          <div className={styles.dataSuccess}>
            <FiCheckCircle className={styles.successIcon} />
            <span>Listo para trabajar sin conexión</span>
          </div>
        )}

        {dataStatus === "critical" && (
          <div className={styles.dataWarning}>
            <FiAlertTriangle className={styles.warningIcon} />
            <span>
              {isOnline
                ? "Datos offline insuficientes. Sincroniza para modo offline."
                : "Datos insuficientes. Conecta a internet para sincronizar."}
            </span>
          </div>
        )}

        {/* Botón de sincronización */}
        {(dataStatus === "critical" || dataStatus === "minimal") &&
          isOnline && (
            <button
              className={styles.syncButton}
              onClick={handleSync}
              disabled={isLoading}
            >
              <FiRefreshCw className={isLoading ? styles.spinning : ""} />
              {isLoading ? "Sincronizando..." : "Sincronizar Datos Offline"}
            </button>
          )}
      </div>
    </div>
  );
};

export default OfflineDataStatus;
