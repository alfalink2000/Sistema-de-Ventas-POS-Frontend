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
  const [dbInitialized, setDbInitialized] = useState(false);

  // Inicializar IndexedDB y cargar datos
  useEffect(() => {
    initializeDB();
  }, []);

  const initializeDB = async () => {
    try {
      console.log("🔄 Inicializando IndexedDB...");
      const initialized = await IndexedDBService.init();
      setDbInitialized(initialized);

      if (initialized) {
        await loadOfflineData();
      } else {
        console.error("❌ No se pudo inicializar IndexedDB");
      }
    } catch (error) {
      console.error("❌ Error inicializando DB:", error);
    }
  };

  const loadOfflineData = async () => {
    if (!dbInitialized) {
      console.log("⏳ Esperando inicialización de DB...");
      return;
    }

    try {
      console.log("🔄 Cargando datos offline...");

      // ✅ VERIFICAR SI EL STORE EXISTE ANTES DE ACCEDER
      const storeExists = await IndexedDBService.storeExists("offline_users");
      console.log("📊 Store offline_users existe:", storeExists);

      if (storeExists) {
        // ✅ OBTENER USUARIOS DIRECTAMENTE DE INDEXEDDB
        const users = await IndexedDBService.getAll("offline_users");
        console.log("👥 Usuarios obtenidos de IndexedDB:", users?.length || 0);
        setOfflineUsers(users || []);
        calculateUsersStats(users || []);
      } else {
        console.warn("⚠️ Store offline_users no existe");
        setOfflineUsers([]);
        setUsersStats({ totalRecords: 0, uniqueUsers: 0, duplicates: 0 });
      }

      // ✅ Cargar productos
      try {
        const products = await ProductsOfflineController.getProducts();
        setProductos(products || []);
        console.log("📦 Productos cargados:", products?.length || 0);
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
          console.log("📁 Categorías cargadas:", categories?.length || 0);
        } else {
          setCategorias([]);
        }
      } catch (categoryError) {
        console.error("❌ Error cargando categorías:", categoryError);
        setCategorias([]);
      }

      // ✅ Obtener última actualización
      try {
        const cacheStoreExists = await IndexedDBService.storeExists(
          "cache_maestros"
        );
        if (cacheStoreExists) {
          const cache = await IndexedDBService.get(
            "cache_maestros",
            "productos"
          );
          if (cache?.ultima_actualizacion) {
            setLastUpdate(cache.ultima_actualizacion);
          }
        }
      } catch (cacheError) {
        console.error("❌ Error obteniendo última actualización:", cacheError);
      }
    } catch (error) {
      console.error("❌ Error cargando datos offline:", error);
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
    const seenIds = new Set();
    let duplicates = 0;

    users.forEach((user) => {
      if (user.id) {
        if (seenIds.has(user.id)) {
          duplicates++;
        } else {
          seenIds.add(user.id);
          uniqueIds.add(user.id);
        }
      }
    });

    setUsersStats({
      totalRecords: users.length,
      uniqueUsers: uniqueIds.size,
      duplicates: duplicates,
    });
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

  const handleSync = async () => {
    if (!isOnline) {
      alert("❌ No hay conexión a internet para sincronizar");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔄 Iniciando sincronización manual...");

      // ✅ SINCRONIZAR USUARIOS - Usar el método que SÍ existe
      let userSyncResult;
      try {
        userSyncResult = await AuthOfflineController.syncUsersFromServer();
        console.log("✅ Sincronización usuarios:", userSyncResult);
      } catch (userSyncError) {
        console.error("❌ Error sincronizando usuarios:", userSyncError);
        userSyncResult = { success: false, error: userSyncError.message };
      }

      // ✅ SINCRONIZAR PRODUCTOS
      let productSyncResult;
      try {
        productSyncResult =
          await ProductsOfflineController.syncProductsFromServer();
        console.log("✅ Sincronización productos:", productSyncResult);
      } catch (productSyncError) {
        console.error("❌ Error sincronizando productos:", productSyncError);
        productSyncResult = { success: false, error: productSyncError.message };
      }

      // ✅ RECARGAR DATOS
      await loadOfflineData();

      // ✅ MOSTRAR RESUMEN
      const userCount = userSyncResult.success ? userSyncResult.count : 0;
      const productCount = productSyncResult.success ? "✓" : "✗";

      alert(
        `🔄 Sincronización completada:\n👥 Usuarios: ${userCount}\n📦 Productos: ${productCount}`
      );
    } catch (error) {
      console.error("❌ Error en sincronización:", error);
      alert(`❌ Error en sincronización: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanup = async () => {
    try {
      console.log("🧹 Iniciando limpieza de duplicados...");

      const users = await IndexedDBService.getAll("offline_users");

      if (!users || users.length === 0) {
        alert("ℹ️ No hay usuarios para limpiar");
        return;
      }

      const uniqueUsers = [];
      const seenIds = new Set();
      let removedCount = 0;

      // Identificar duplicados
      for (const user of users) {
        if (user.id && !seenIds.has(user.id)) {
          seenIds.add(user.id);
          uniqueUsers.push(user);
        } else {
          removedCount++;
        }
      }

      // Limpiar y guardar usuarios únicos
      await IndexedDBService.clear("offline_users");
      for (const user of uniqueUsers) {
        await IndexedDBService.add("offline_users", user);
      }

      console.log(
        `✅ Limpieza completada: ${removedCount} duplicados eliminados`
      );
      alert(
        `🧹 Limpieza completada:\nEliminados: ${removedCount} duplicados\nRestantes: ${uniqueUsers.length} usuarios únicos`
      );

      // Recargar datos
      await loadOfflineData();
    } catch (error) {
      console.error("❌ Error limpiando duplicados:", error);
      alert(`❌ Error en limpieza: ${error.message}`);
    }
  };

  const handleDebugUsers = async () => {
    try {
      console.log("🐛 Debug: Inspeccionando usuarios offline...");

      const storeExists = await IndexedDBService.storeExists("offline_users");
      console.log("Store existe:", storeExists);

      const users = await IndexedDBService.getAll("offline_users");
      console.log("Usuarios en DB:", users);

      const dbInfo = await IndexedDBService.getDBInfo();
      console.log("Información de DB:", dbInfo);

      alert(
        `🔍 Debug Info:\nStore existe: ${storeExists}\nUsuarios encontrados: ${users.length}\nVer consola para detalles`
      );
    } catch (error) {
      console.error("❌ Error en debug:", error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Nunca";
    try {
      return new Date(dateString).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Fecha inválida";
    }
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

  if (!dbInitialized) {
    return (
      <div className={styles.container}>
        <div className={styles.statusOffline}>
          <FiDatabase />
          <span>Inicializando base de datos offline...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ✅ ESTADO DE CONEXIÓN */}
      <div className={isOnline ? styles.statusOnline : styles.statusOffline}>
        {isOnline ? (
          <FiWifi className={styles.onlineIcon} />
        ) : (
          <FiWifiOff className={styles.offlineIcon} />
        )}
        <span>{isOnline ? "Conexión activa" : "Modo Offline"}</span>

        {/* ✅ BOTONES DE DEBUG */}
        <div className={styles.debugButtons}>
          <button
            className={styles.debugButton}
            onClick={handleDebugUsers}
            title="Depurar usuarios"
          >
            🐛
          </button>

          {(offlineUsers.length > 0 || hasDuplicates) && (
            <button
              className={styles.debugButton}
              onClick={() => setShowStats(!showStats)}
              title="Mostrar estadísticas"
            >
              <FiDatabase />
            </button>
          )}
        </div>
      </div>

      {/* ✅ INFORMACIÓN DE DEBUG */}
      {showStats && usersStats && (
        <div className={styles.debugInfo}>
          <div className={styles.debugHeader}>
            <strong>Información de Depuración</strong>
          </div>
          <div className={styles.debugItem}>
            <span>Registros totales:</span>
            <span>{usersStats.totalRecords}</span>
          </div>
          <div className={styles.debugItem}>
            <span>Usuarios únicos:</span>
            <span>{usersStats.uniqueUsers}</span>
          </div>
          <div className={styles.debugItem}>
            <span>Duplicados:</span>
            <span className={hasDuplicates ? styles.duplicateWarning : ""}>
              {usersStats.duplicates}
            </span>
          </div>
          <div className={styles.debugActions}>
            {hasDuplicates && (
              <button
                className={styles.cleanupButton}
                onClick={handleCleanup}
                title="Eliminar usuarios duplicados"
              >
                🧹 Limpiar Duplicados
              </button>
            )}
            <button
              className={styles.refreshButton}
              onClick={loadOfflineData}
              title="Recargar datos"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
      )}

      {/* ✅ DATOS DISPONIBLES OFFLINE */}
      <div className={styles.dataStatus}>
        <div className={styles.dataItem}>
          <FiUsers className={styles.dataIcon} />
          <span className={styles.dataText}>
            {offlineUsers.length} usuario{offlineUsers.length !== 1 ? "s" : ""}{" "}
            disponible{offlineUsers.length !== 1 ? "s" : ""} offline
            {hasDuplicates && <span className={styles.duplicateBadge}>!</span>}
          </span>
        </div>

        <div className={styles.dataItem}>
          <FiPackage className={styles.dataIcon} />
          <span className={styles.dataText}>
            {productos.length} producto{productos.length !== 1 ? "s" : ""}{" "}
            disponible{productos.length !== 1 ? "s" : ""} offline
          </span>
        </div>

        <div className={styles.dataItem}>
          <FiPackage className={styles.dataIcon} />
          <span className={styles.dataText}>
            {categorias.length} categoría{categorias.length !== 1 ? "s" : ""}{" "}
            disponible{categorias.length !== 1 ? "s" : ""} offline
          </span>
        </div>

        {lastUpdate && (
          <div className={styles.lastUpdate}>
            <small>Actualizado: {formatDate(lastUpdate)}</small>
          </div>
        )}

        {/* ✅ MENSAJES DE ESTADO */}
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

        {/* ✅ BOTÓN DE SINCRONIZACIÓN */}
        {isOnline && (
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
