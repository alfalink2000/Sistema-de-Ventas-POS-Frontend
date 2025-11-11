// components/layout/Header/Header.jsx - VERSIÓN COMPLETA CORREGIDA
import { useDispatch, useSelector } from "react-redux";
import {
  FiMenu,
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiX,
  FiPackage,
  FiAlertTriangle,
  FiDollarSign,
  FiArchive,
  FiTrash2,
} from "react-icons/fi";
import styles from "./Header.module.css";
import { useState, useEffect } from "react";
import StockSyncController from "../../../controllers/offline/StockSyncController/StockSyncController";
import Swal from "sweetalert2";

const Header = ({ user, onToggleSidebar, sidebarOpen }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    pendingStock: 0,
    pendingPrices: 0,
    pendingClosures: 0,
    lastSync: null,
    hasPendingChanges: false,
  });

  // ✅ CARGAR ESTADO DE SINCRONIZACIÓN
  const loadSyncStatus = async () => {
    try {
      console.log("🔄 Cargando estado de sincronización...");

      // ✅ OBTENER ESTADÍSTICAS ACTUALIZADAS
      const stockStats = await StockSyncController.getPendingStats();

      let priceStats = { total: 0 };
      let closuresStats = { total: 0 };

      try {
        const PriceSyncController = await import(
          "../../../controllers/offline/PriceSyncController/PriceSyncController"
        ).then((module) => module.default);

        if (PriceSyncController) {
          // ✅ USAR MÉTODO ESTÁTICO CORREGIDO
          priceStats = await PriceSyncController.getPendingStats();
        }
      } catch (error) {
        console.warn("⚠️ No se pudo cargar PriceSyncController:", error);
      }

      try {
        const ClosuresSyncController = await import(
          "../../../controllers/offline/ClosuresSyncController/ClosuresSyncController"
        ).then((module) => module.default);

        if (ClosuresSyncController) {
          closuresStats = await ClosuresSyncController.getPendingStats();
        }
      } catch (error) {
        console.warn("⚠️ No se pudo cargar ClosuresSyncController:", error);
      }

      const hasPending =
        stockStats.total > 0 || priceStats.total > 0 || closuresStats.total > 0;

      setSyncStatus({
        pendingStock: stockStats.total || 0,
        pendingPrices: priceStats.total || 0,
        pendingClosures: closuresStats.total || 0,
        lastSync: new Date().toLocaleTimeString(),
        hasPendingChanges: hasPending,
      });

      console.log(
        `📊 Estado sync actualizado: ${stockStats.total} stock, ${priceStats.total} precios, ${closuresStats.total} cierres pendientes`
      );
    } catch (error) {
      console.error("❌ Error cargando estado de sync:", error);
      setSyncStatus({
        pendingStock: 0,
        pendingPrices: 0,
        pendingClosures: 0,
        lastSync: new Date().toLocaleTimeString(),
        hasPendingChanges: false,
      });
    }
  };

  // ✅ BOTÓN DE LIMPIEZA MANUAL
  const handleForceCleanup = async () => {
    try {
      Swal.fire({
        title: "Limpiando...",
        text: "Eliminando registros sincronizados",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const PriceSyncController = await import(
        "../../../controllers/offline/PriceSyncController/PriceSyncController"
      ).then((module) => module.default);

      if (PriceSyncController) {
        const result = await PriceSyncController.cleanupSyncedPriceChanges();

        Swal.close();

        if (result.success) {
          await Swal.fire({
            icon: "success",
            title: "Limpieza completada",
            text: `${result.deletedCount} registros sincronizados eliminados`,
            confirmButtonText: "Entendido",
          });

          // ✅ ACTUALIZAR ESTADO
          await loadSyncStatus();
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      Swal.close();
      await Swal.fire({
        icon: "error",
        title: "Error en limpieza",
        text: error.message,
        confirmButtonText: "Entendido",
      });
    }
  };

  // ✅ SINCRONIZACIÓN MANUAL
  const handleManualSync = async () => {
    if (!isOnline) {
      await Swal.fire({
        icon: "warning",
        title: "Sin conexión",
        text: "No hay conexión a internet para sincronizar",
        confirmButtonText: "Entendido",
      });
      return;
    }

    setIsSyncing(true);
    try {
      await Swal.fire({
        title: "Sincronizando...",
        text: "Actualizando datos pendientes",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // Sincronizar cambios de stock
      const stockResult = await StockSyncController.syncPendingStockChanges();
      console.log("Resultado sync stock:", stockResult);

      // Sincronizar cambios de precio
      let priceResult = { success: false };
      try {
        const PriceSyncController = await import(
          "../../../controllers/offline/PriceSyncController/PriceSyncController"
        ).then((module) => module.default);
        priceResult = await PriceSyncController.syncPendingPriceChanges();
        console.log("Resultado sync precios:", priceResult);
      } catch (error) {
        console.error("Error sincronizando precios:", error);
      }

      // Sincronizar cierres
      let closuresResult = { success: false };
      try {
        const ClosuresSyncController = await import(
          "../../../controllers/offline/ClosuresSyncController/ClosuresSyncController"
        ).then((module) => module.default);
        closuresResult = await ClosuresSyncController.syncPendingClosures();
        console.log("Resultado sync cierres:", closuresResult);
      } catch (error) {
        console.error("Error sincronizando cierres:", error);
      }

      Swal.close();

      // Mostrar resumen
      const totalSincronizados =
        (stockResult.sincronizados || 0) +
        (priceResult.sincronizados || 0) +
        (closuresResult.sincronizados || 0);

      if (totalSincronizados > 0) {
        await Swal.fire({
          icon: "success",
          title: "Sincronización completada",
          text: `Se sincronizaron ${totalSincronizados} elementos`,
          timer: 3000,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          icon: "info",
          title: "Sincronización completada",
          text: "No había elementos pendientes por sincronizar",
          timer: 3000,
          showConfirmButton: false,
        });
      }

      // Recargar estado
      await loadSyncStatus();
    } catch (error) {
      console.error("❌ Error en sincronización manual:", error);
      Swal.close();
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error durante la sincronización",
        confirmButtonText: "Entendido",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // ✅ EFFECT PRINCIPAL CORREGIDO (SOLO UNO)
  useEffect(() => {
    // Cargar estado inicial
    loadSyncStatus();

    // Manejadores de eventos
    const handleOnline = () => {
      setIsOnline(true);
      console.log("🌐 Conexión recuperada - Header");
      loadSyncStatus();

      // Sincronizar automáticamente al recuperar conexión
      setTimeout(() => {
        handleManualSync();
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("📴 Sin conexión - Header");
    };

    const handleSyncStatusUpdated = () => {
      console.log("📢 Evento de actualización de sync recibido");
      loadSyncStatus();
    };

    const handlePriceChangesUpdated = () => {
      console.log("💰 Evento de actualización de precios recibido");
      loadSyncStatus();
    };

    const handleStockChangesUpdated = () => {
      console.log("📦 Evento de actualización de stock recibido");
      loadSyncStatus();
    };

    const handleClosuresChangesUpdated = () => {
      console.log("📋 Evento de actualización de cierres recibido");
      loadSyncStatus();
    };

    // Registrar event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("sync_status_updated", handleSyncStatusUpdated);
    window.addEventListener("price_changes_updated", handlePriceChangesUpdated);
    window.addEventListener("stock_changes_updated", handleStockChangesUpdated);
    window.addEventListener(
      "closures_changes_updated",
      handleClosuresChangesUpdated
    );

    // Intervalo de actualización periódica
    const interval = setInterval(() => {
      if (isOnline && syncStatus.hasPendingChanges) {
        console.log("⏰ Sincronización periódica...");
        loadSyncStatus();
      }
    }, 60000); // Cada minuto

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "sync_status_updated",
        handleSyncStatusUpdated
      );
      window.removeEventListener(
        "price_changes_updated",
        handlePriceChangesUpdated
      );
      window.removeEventListener(
        "stock_changes_updated",
        handleStockChangesUpdated
      );
      window.removeEventListener(
        "closures_changes_updated",
        handleClosuresChangesUpdated
      );
      clearInterval(interval);
    };
  }, [isOnline, syncStatus.hasPendingChanges]); // Dependencias

  // ✅ CALCULAR TOTAL DE PENDIENTES
  const totalPending =
    syncStatus.pendingStock +
    syncStatus.pendingPrices +
    syncStatus.pendingClosures;

  // ✅ MODAL DE SINCRONIZACIÓN
  const SyncModal = () => {
    if (!showSyncModal) return null;

    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Estado de Sincronización</h3>
            <button
              className={styles.closeButton}
              onClick={() => setShowSyncModal(false)}
            >
              <FiX />
            </button>
          </div>

          <div className={styles.modalBody}>
            {/* ESTADO DE CONEXIÓN */}
            <div className={styles.connectionStatus}>
              <div
                className={`${styles.statusIndicator} ${
                  isOnline ? styles.online : styles.offline
                }`}
              >
                <div className={styles.statusIcon}>
                  {isOnline ? <FiWifi /> : <FiWifiOff />}
                </div>
                <div className={styles.statusText}>
                  <span className={styles.statusTitle}>
                    {isOnline ? "Conectado al Servidor" : "Modo Offline"}
                  </span>
                  <span className={styles.statusSubtitle}>
                    {isOnline
                      ? "Sincronización disponible"
                      : "Datos guardados localmente"}
                  </span>
                </div>
              </div>
            </div>

            {/* SECCIÓN DE DETALLES */}
            <div className={styles.syncDetails}>
              <h4>Datos Pendientes</h4>

              {/* SECCIÓN DE STOCK */}
              <div className={styles.syncItem}>
                <div className={styles.syncIcon}>
                  {syncStatus.pendingStock > 0 ? (
                    <FiAlertTriangle className={styles.warningIcon} />
                  ) : (
                    <FiPackage className={styles.successIcon} />
                  )}
                </div>
                <div className={styles.syncInfo}>
                  <span className={styles.syncLabel}>Cambios de Stock</span>
                  <span
                    className={`${styles.syncCount} ${
                      syncStatus.pendingStock > 0
                        ? styles.warning
                        : styles.success
                    }`}
                  >
                    {syncStatus.pendingStock} pendientes
                  </span>
                </div>
              </div>

              {/* SECCIÓN DE PRECIOS */}
              <div className={styles.syncItem}>
                <div className={styles.syncIcon}>
                  {syncStatus.pendingPrices > 0 ? (
                    <FiAlertTriangle className={styles.warningIcon} />
                  ) : (
                    <FiDollarSign className={styles.successIcon} />
                  )}
                </div>
                <div className={styles.syncInfo}>
                  <span className={styles.syncLabel}>Cambios de Precio</span>
                  <span
                    className={`${styles.syncCount} ${
                      syncStatus.pendingPrices > 0
                        ? styles.warning
                        : styles.success
                    }`}
                  >
                    {syncStatus.pendingPrices} pendientes
                  </span>
                </div>
              </div>

              {/* SECCIÓN DE CIERRES */}
              <div className={styles.syncItem}>
                <div className={styles.syncIcon}>
                  {syncStatus.pendingClosures > 0 ? (
                    <FiAlertTriangle className={styles.warningIcon} />
                  ) : (
                    <FiArchive className={styles.successIcon} />
                  )}
                </div>
                <div className={styles.syncInfo}>
                  <span className={styles.syncLabel}>Cierres de Caja</span>
                  <span
                    className={`${styles.syncCount} ${
                      syncStatus.pendingClosures > 0
                        ? styles.warning
                        : styles.success
                    }`}
                  >
                    {syncStatus.pendingClosures} pendientes
                  </span>
                </div>
              </div>

              {syncStatus.lastSync && (
                <div className={styles.lastSync}>
                  <small>Última verificación: {syncStatus.lastSync}</small>
                </div>
              )}
            </div>

            {/* SECCIÓN DE ACCIONES AVANZADAS */}
            <div className={styles.advancedActions}>
              <h4>Acciones Avanzadas</h4>
              <button
                className={styles.cleanupButton}
                onClick={handleForceCleanup}
                disabled={!isOnline}
                title="Forzar limpieza de registros sincronizados"
              >
                <FiTrash2 />
                Limpiar Registros Sincronizados
              </button>
              <small className={styles.helpText}>
                Elimina los cambios que ya fueron sincronizados con el servidor
              </small>
            </div>

            {/* ACCIONES PRINCIPALES */}
            <div className={styles.syncActions}>
              <button
                className={`${styles.syncButton} ${
                  !isOnline || isSyncing || totalPending === 0
                    ? styles.disabled
                    : ""
                }`}
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing || totalPending === 0}
              >
                <FiRefreshCw className={isSyncing ? styles.spinning : ""} />
                {isSyncing ? "Sincronizando..." : "Sincronizar Ahora"}
              </button>

              {!isOnline && (
                <div className={styles.warningMessage}>
                  <FiWifiOff /> Conecta a internet para sincronizar
                </div>
              )}

              {isOnline && totalPending === 0 && (
                <div className={styles.successMessage}>
                  <FiPackage /> Todos los datos están sincronizados
                </div>
              )}

              {isOnline && totalPending > 0 && (
                <div className={styles.infoMessage}>
                  Tienes {totalPending} cambios pendientes de sincronización
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button className={styles.menuButton} onClick={onToggleSidebar}>
          <FiMenu />
        </button>
        <div className={styles.breadcrumb}>
          <span className={styles.appName}>KioskoFlow</span>
          {!isOnline && (
            <span className={styles.offlineBadge}>
              <FiWifiOff /> Offline
            </span>
          )}
        </div>
      </div>

      <div className={styles.headerRight}>
        {/* INDICADOR DE SINCRONIZACIÓN */}
        <div
          className={`${styles.syncIndicator} ${
            totalPending > 0 ? styles.hasPending : ""
          }`}
          onClick={() => setShowSyncModal(true)}
          title="Estado de sincronización"
        >
          <div className={styles.syncIconContainer}>
            <div
              className={`${styles.syncIcon} ${
                isOnline ? styles.online : styles.offline
              } ${totalPending > 0 ? styles.pending : ""}`}
            >
              {isOnline ? <FiWifi /> : <FiWifiOff />}
            </div>
            {totalPending > 0 && isOnline && (
              <div className={styles.syncBadge}>
                {totalPending > 99 ? "99+" : totalPending}
              </div>
            )}
          </div>
          <div className={styles.syncInfo}>
            <span className={styles.syncStatus}>
              {isOnline ? "En línea" : "Offline"}
            </span>
            {totalPending > 0 && isOnline && (
              <span className={styles.pendingText}>
                {totalPending} pendientes
              </span>
            )}
          </div>
        </div>

        {/* USUARIO */}
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            <span className={styles.userInitial}>
              {user?.nombre ? user.nombre.charAt(0).toUpperCase() : "U"}
            </span>
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>{user?.nombre || "Usuario"}</span>
            <span className={styles.userRole}>{user?.rol || "Vendedor"}</span>
          </div>
        </div>
      </div>

      <SyncModal />
    </header>
  );
};

export default Header;
