// components/layout/Header/Header.jsx - VERSIÓN CORREGIDA
import { useDispatch, useSelector } from "react-redux";
import { startLogout } from "../../../actions/authActions";
import {
  FiMenu,
  FiTrendingUp,
  FiDollarSign,
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiAlertCircle,
  FiX,
  FiCheck,
  FiAlertTriangle,
  FiInfo,
  FiPackage,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiSearch,
} from "react-icons/fi";
import styles from "./Header.module.css";
import { useState, useEffect } from "react";
import SyncController from "../../../controllers/offline/SyncController/SyncController";
import ProductsOfflineController from "../../../controllers/offline/ProductsOfflineController/ProductsOfflineController";
import { fetchConToken } from "../../../helpers/fetch";
import diagnosticarSesionesVentas from "../../../controllers/offline/SyncController/SyncController";
import Swal from "sweetalert2";
const Header = ({ user, onToggleSidebar, sidebarOpen }) => {
  const dispatch = useDispatch();
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);
  const { sales } = useSelector((state) => state.sales);
  const { products } = useSelector((state) => state.products);

  // ✅ ESTADOS MEJORADOS
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncDetails, setSyncDetails] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState({
    pendingSessions: 0,
    pendingSales: 0,
    pendingClosures: 0,
    pendingStock: 0,
    pendingProducts: 0,
  });

  // ✅ CARGAR DATOS PENDIENTES
  const loadPendingData = async () => {
    try {
      const status = await SyncController.getSyncStatus();
      setPendingCount(status.totalPending);
      setSyncStatus({
        pendingSessions: status.pendingSessions,
        pendingSales: status.pendingSales,
        pendingClosures: status.pendingClosures,
        pendingStock: status.pendingStock,
        pendingProducts: status.pendingProducts || 0,
      });

      const details = await SyncController.getPendingDetails();
      setSyncDetails(details);
    } catch (error) {
      console.error("❌ Error cargando estado de sincronización:", error);
      const basicStatus = await SyncController.getSyncStatus();
      setPendingCount(basicStatus.totalPending || 0);
      setSyncStatus({
        pendingSessions: basicStatus.pendingSessions || 0,
        pendingSales: basicStatus.pendingSales || 0,
        pendingClosures: basicStatus.pendingClosures || 0,
        pendingStock: basicStatus.pendingStock || 0,
        pendingProducts: basicStatus.pendingProducts || 0,
      });
    }
  };

  useEffect(() => {
    loadPendingData();

    const interval = setInterval(loadPendingData, 20000);

    const handleDataChanged = () => {
      loadPendingData();
    };

    const removeListener = SyncController.addSyncListener((event, data) => {
      if (
        event === "sync_complete" ||
        event === "sync_error" ||
        event === "products_sync_complete" ||
        event === "product_pending_changed"
      ) {
        loadPendingData();
      }
    });

    window.addEventListener("stockPendingUpdatesChanged", handleDataChanged);
    window.addEventListener("pendingUpdatesChanged", handleDataChanged);
    window.addEventListener("productsPendingUpdatesChanged", handleDataChanged);
    window.addEventListener("product_created_offline", handleDataChanged);
    window.addEventListener("product_updated_offline", handleDataChanged);
    window.addEventListener("product_deleted_offline", handleDataChanged);

    return () => {
      clearInterval(interval);
      removeListener();
      window.removeEventListener(
        "stockPendingUpdatesChanged",
        handleDataChanged
      );
      window.removeEventListener("pendingUpdatesChanged", handleDataChanged);
      window.removeEventListener(
        "productsPendingUpdatesChanged",
        handleDataChanged
      );
      window.removeEventListener("product_created_offline", handleDataChanged);
      window.removeEventListener("product_updated_offline", handleDataChanged);
      window.removeEventListener("product_deleted_offline", handleDataChanged);
    };
  }, []);

  // ✅ MANEJO DE CONEXIÓN
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => {
        if (pendingCount > 0) {
          handleForceSync();
        }
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [pendingCount]);

  // ✅ SINCRONIZACIÓN MANUAL
  // Header.jsx - MEJORAR MANEJO DE ERRORES
  const handleForceSync = async () => {
    try {
      console.log("🔄 Iniciando sincronización manual...");

      // ✅ CONFIRMACIÓN SIMPLE
      const { value: aceptar } = await Swal.fire({
        title: "Sincronizar ventas pendientes",
        text: "¿Deseas enviar todas las ventas pendientes al servidor?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, sincronizar",
        cancelButtonText: "Cancelar",
      });

      if (!aceptar) return;

      // ✅ PROGRESO
      Swal.fire({
        title: "Sincronizando...",
        html: "Reasignando ventas a sesión actual<br/><small>Esto puede tomar unos segundos</small>",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      // ✅ SINCRONIZAR DIRECTAMENTE
      const syncResult = await SyncController.fullSync();

      Swal.close();

      // ✅ MOSTRAR RESULTADOS
      if (syncResult && syncResult.success) {
        const ventasExitosas = syncResult.sales?.exitosas || 0;
        const ventasTotales = syncResult.sales?.total || 0;

        let htmlResultado = `
        <div style="text-align: left;">
          <p><strong>Resultado de sincronización:</strong></p>
          <p>✅ Ventas sincronizadas: ${ventasExitosas}/${ventasTotales}</p>
      `;

        if (syncResult.sales?.fallidas > 0) {
          htmlResultado += `<p>❌ Ventas fallidas: ${syncResult.sales.fallidas}</p>`;
        }

        if (ventasExitosas === 0 && ventasTotales > 0) {
          htmlResultado += `
          <hr style="margin: 10px 0;">
          <p style="color: #f39c12; font-size: 14px;">
            💡 <strong>Solución:</strong> 
            Las ventas necesitan una sesión activa. Abre una sesión en "Sesiones de Caja" y vuelve a intentar.
          </p>
        `;
        }

        htmlResultado += `</div>`;

        await Swal.fire({
          icon: ventasExitosas > 0 ? "success" : "warning",
          title:
            ventasExitosas > 0
              ? "¡Sincronización exitosa!"
              : "Sincronización parcial",
          html: htmlResultado,
          confirmButtonText: "Aceptar",
        });

        // ✅ RECARGAR DATOS SI SE SINCRONIZÓ ALGO
        if (ventasExitosas > 0) {
          dispatch(loadSales());
          dispatch(loadProducts());
        }
      } else {
        throw new Error(
          syncResult?.error || "Error desconocido en sincronización"
        );
      }
    } catch (error) {
      console.error("❌ Error en sincronización manual:", error);

      Swal.close();

      await Swal.fire({
        icon: "error",
        title: "Error de sincronización",
        html: `
        <div style="text-align: left;">
          <p><strong>Error:</strong> ${error.message}</p>
          <hr style="margin: 10px 0;">
          <p style="font-size: 14px;">
            🔧 <strong>Pasos para solucionar:</strong>
          </p>
          <ol style="text-align: left; font-size: 13px; margin: 10px 0; padding-left: 20px;">
            <li>Ve a <strong>"Sesiones de Caja"</strong></li>
            <li>Abre una <strong>nueva sesión</strong></li>
            <li>Vuelve a intentar la sincronización</li>
          </ol>
        </div>
      `,
        confirmButtonText: "Entendido",
      });
    }
  };

  // ✅ ABRIR MODAL DE DETALLES
  const handleShowSyncDetails = async () => {
    try {
      const details = await SyncController.getPendingDetails();
      setSyncDetails(details);
      setShowSyncModal(true);
    } catch (error) {
      console.error("Error cargando detalles de sync:", error);
    }
  };

  // ✅ CALCULAR GANANCIAS EN TIEMPO REAL
  const calcularGananciasSesion = () => {
    if (!sesionAbierta || !sales || sales.length === 0) {
      return { gananciaBruta: 0, ventasTotales: 0, cantidadVentas: 0 };
    }

    const ventasSesionActual = sales.filter(
      (venta) =>
        venta.sesion_caja_id === sesionAbierta.id ||
        venta.sesion_caja_id_local === sesionAbierta.id_local
    );

    if (ventasSesionActual.length === 0) {
      return { gananciaBruta: 0, ventasTotales: 0, cantidadVentas: 0 };
    }

    let gananciaBruta = 0;
    let ventasTotales = 0;

    ventasSesionActual.forEach((venta) => {
      ventasTotales += venta.total || 0;

      if (venta.productos && Array.isArray(venta.productos)) {
        venta.productos.forEach((productoVenta) => {
          const producto = products.find(
            (p) => p.id === productoVenta.producto_id
          );
          if (producto && producto.precio_compra) {
            const gananciaProducto =
              (productoVenta.precio_unitario - producto.precio_compra) *
              productoVenta.cantidad;
            gananciaBruta += gananciaProducto;
          }
        });
      } else {
        gananciaBruta += (venta.total || 0) * 0.3;
      }
    });

    return {
      gananciaBruta,
      ventasTotales,
      cantidadVentas: ventasSesionActual.length,
    };
  };

  const { gananciaBruta, ventasTotales, cantidadVentas } =
    calcularGananciasSesion();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  // ✅ FUNCIÓN PARA OBTENER ICONO DE OPERACIÓN DE PRODUCTO
  const getProductOperationIcon = (operacion) => {
    switch (operacion) {
      case "crear":
        return <FiPlus />;
      case "actualizar":
        return <FiEdit />;
      case "eliminar":
        return <FiTrash2 />;
      default:
        return <FiPackage />;
    }
  };

  // ✅ FUNCIÓN PARA OBTENER COLOR DE OPERACIÓN DE PRODUCTO
  const getProductOperationColor = (operacion) => {
    switch (operacion) {
      case "crear":
        return "#10b981";
      case "actualizar":
        return "#f59e0b";
      case "eliminar":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  // ✅ COMPONENTE MODAL DE SINCRONIZACIÓN
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
            {/* ESTADO ACTUAL */}
            <div className={styles.syncStatusSection}>
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

            {/* CONTADORES PENDIENTES */}
            <div className={styles.pendingCounters}>
              <div className={styles.counterItem}>
                <span className={styles.counterNumber}>
                  {syncStatus.pendingSessions}
                </span>
                <span className={styles.counterLabel}>Sesiones</span>
              </div>
              <div className={styles.counterItem}>
                <span className={styles.counterNumber}>
                  {syncStatus.pendingSales}
                </span>
                <span className={styles.counterLabel}>Ventas</span>
              </div>
              <div className={styles.counterItem}>
                <span className={styles.counterNumber}>
                  {syncStatus.pendingClosures}
                </span>
                <span className={styles.counterLabel}>Cierres</span>
              </div>
              <div className={styles.counterItem}>
                <span className={styles.counterNumber}>
                  {syncStatus.pendingStock}
                </span>
                <span className={styles.counterLabel}>Stock</span>
              </div>
              <div className={styles.counterItem}>
                <span className={styles.counterNumber}>
                  {syncStatus.pendingProducts}
                </span>
                <span className={styles.counterLabel}>Productos</span>
              </div>
              <div className={styles.counterTotal}>
                <span className={styles.totalNumber}>{pendingCount}</span>
                <span className={styles.totalLabel}>Total Pendiente</span>
              </div>
            </div>

            {/* DETALLES DE DATOS PENDIENTES */}
            {syncDetails && (
              <div className={styles.pendingDetails}>
                <h4>Detalles de Datos Pendientes</h4>

                {syncDetails.products && syncDetails.products.length > 0 && (
                  <div className={styles.detailSection}>
                    <h5>
                      <FiPackage className={styles.sectionIcon} />
                      Productos ({syncDetails.products.length})
                    </h5>
                    {syncDetails.products.map((product) => (
                      <div key={product.id} className={styles.detailItem}>
                        <div
                          className={styles.itemIcon}
                          style={{
                            color: getProductOperationColor(product.operacion),
                          }}
                        >
                          {getProductOperationIcon(product.operacion)}
                        </div>
                        <div className={styles.itemContent}>
                          <span className={styles.itemTitle}>
                            {product.descripcion}
                          </span>
                          <span className={styles.itemDate}>
                            {new Date(product.fecha).toLocaleDateString()} -
                            {new Date(product.fecha).toLocaleTimeString()}
                          </span>
                          {product.data?.datos?.nombre && (
                            <span className={styles.itemSubtitle}>
                              {product.data.datos.nombre}
                            </span>
                          )}
                        </div>
                        <div
                          className={styles.itemStatus}
                          style={{
                            backgroundColor:
                              getProductOperationColor(product.operacion) +
                              "20",
                            color: getProductOperationColor(product.operacion),
                          }}
                        >
                          {product.operacion?.toUpperCase()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {syncDetails.sessions.length > 0 && (
                  <div className={styles.detailSection}>
                    <h5>
                      <FiInfo className={styles.sectionIcon} />
                      Sesiones de Caja ({syncDetails.sessions.length})
                    </h5>
                    {syncDetails.sessions.map((session) => (
                      <div key={session.id} className={styles.detailItem}>
                        <div className={styles.itemIcon}>
                          <FiInfo />
                        </div>
                        <div className={styles.itemContent}>
                          <span className={styles.itemTitle}>
                            {session.descripcion}
                          </span>
                          <span className={styles.itemDate}>
                            {new Date(session.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          className={`${styles.itemStatus} ${styles.pending}`}
                        >
                          Pendiente
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {syncDetails.sales.length > 0 && (
                  <div className={styles.detailSection}>
                    <h5>
                      <FiDollarSign className={styles.sectionIcon} />
                      Ventas ({syncDetails.sales.length})
                    </h5>
                    {syncDetails.sales.map((sale) => (
                      <div key={sale.id} className={styles.detailItem}>
                        <div className={styles.itemIcon}>
                          <FiDollarSign />
                        </div>
                        <div className={styles.itemContent}>
                          <span className={styles.itemTitle}>
                            {sale.descripcion}
                          </span>
                          <span className={styles.itemDate}>
                            {new Date(sale.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          className={`${styles.itemStatus} ${styles.pending}`}
                        >
                          Pendiente
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {syncDetails.stock && syncDetails.stock.length > 0 && (
                  <div className={styles.detailSection}>
                    <h5>
                      <FiPackage className={styles.sectionIcon} />
                      Actualizaciones de Stock ({syncDetails.stock.length})
                    </h5>
                    {syncDetails.stock.map((stockUpdate) => (
                      <div key={stockUpdate.id} className={styles.detailItem}>
                        <div className={styles.itemIcon}>
                          <FiPackage />
                        </div>
                        <div className={styles.itemContent}>
                          <span className={styles.itemTitle}>
                            {stockUpdate.descripcion}
                          </span>
                          <span className={styles.itemDate}>
                            {new Date(stockUpdate.fecha).toLocaleTimeString()}
                          </span>
                        </div>
                        <div
                          className={`${styles.itemStatus} ${styles.pending}`}
                        >
                          Pendiente
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {syncDetails.closures.length > 0 && (
                  <div className={styles.detailSection}>
                    <h5>
                      <FiTrendingUp className={styles.sectionIcon} />
                      Cierres de Caja ({syncDetails.closures.length})
                    </h5>
                    {syncDetails.closures.map((closure) => (
                      <div key={closure.id} className={styles.detailItem}>
                        <div className={styles.itemIcon}>
                          <FiTrendingUp />
                        </div>
                        <div className={styles.itemContent}>
                          <span className={styles.itemTitle}>
                            {closure.descripcion}
                          </span>
                          <span className={styles.itemDate}>
                            {new Date(closure.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          className={`${styles.itemStatus} ${styles.pending}`}
                        >
                          Pendiente
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pendingCount === 0 && (
                  <div className={styles.noPendingData}>
                    <FiCheck className={styles.successIcon} />
                    <span>¡Todo sincronizado! No hay datos pendientes.</span>
                  </div>
                )}
              </div>
            )}

            {syncDetails?.error && (
              <div className={styles.errorSection}>
                <FiAlertTriangle className={styles.errorIcon} />
                <span>Error cargando detalles: {syncDetails.error}</span>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button
              className={styles.secondaryButton}
              onClick={() => setShowSyncModal(false)}
            >
              Cerrar
            </button>

            {isOnline && pendingCount > 0 && (
              <button
                className={styles.primaryButton}
                onClick={handleForceSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <FiRefreshCw className={styles.spinner} />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <FiRefreshCw />
                    Sincronizar Ahora
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.menuButtonContainer}>
          {/* ✅ CORRECCIÓN: Mostrar siempre el botón de menú */}
          <button className={styles.menuButton} onClick={onToggleSidebar}>
            <FiMenu className={styles.menuIcon} />
          </button>
        </div>
        <div className={styles.breadcrumb}>
          <span className={styles.appName}>KioskoFlow</span>
          <span className={styles.welcomeText}>
            Sistema POS - Control de Ventas
            {!isOnline && (
              <span className={styles.offlineHeaderBadge}>
                <FiWifiOff />
                Modo Offline
              </span>
            )}
          </span>
        </div>
      </div>

      <div className={styles.headerRight}>
        {/* ✅ INDICADOR DE SINCRONIZACIÓN COMPACTO */}
        <div className={styles.syncIndicator} onClick={handleShowSyncDetails}>
          <div className={styles.syncIconContainer}>
            <div
              className={`${styles.syncIcon} ${
                isOnline ? styles.online : styles.offline
              } ${isSyncing ? styles.syncing : ""} ${
                pendingCount > 0 ? styles.hasPending : ""
              }`}
            >
              {isSyncing ? (
                <FiRefreshCw className={styles.syncSpinner} />
              ) : isOnline ? (
                <FiWifi className={styles.wifiIcon} />
              ) : (
                <FiWifiOff className={styles.wifiOffIcon} />
              )}

              {pendingCount > 0 && (
                <span className={styles.pendingBadge}>{pendingCount}</span>
              )}
            </div>
          </div>

          {/* ✅ AGREGAR LA INFO DE SINCRONIZACIÓN */}
          <div className={styles.syncInfo}>
            <span className={styles.syncStatus}>
              {isSyncing
                ? "Sincronizando..."
                : isOnline
                ? "En línea"
                : "Offline"}
            </span>
            {pendingCount > 0 && (
              <span className={styles.pendingCount}>
                {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ✅ INDICADOR DE GANANCIAS COMPACTO */}
        {sesionAbierta ? (
          <div className={styles.earningsIndicator}>
            <div className={styles.earningsIcon}>
              <FiTrendingUp className={styles.trendingIcon} />
            </div>
            <div className={styles.earningsInfo}>
              <span className={styles.earningsAmount}>
                {formatCurrency(gananciaBruta)}
              </span>
              <span className={styles.salesCount}>
                {cantidadVentas} venta{cantidadVentas !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.noSessionIndicator}>
            <div className={styles.noSessionIcon}>
              <FiDollarSign className={styles.dollarIcon} />
            </div>
            <div className={styles.noSessionInfo}>
              <span className={styles.noSessionText}>Sin sesión</span>
            </div>
          </div>
        )}

        {/* ✅ INFORMACIÓN DEL USUARIO COMPACTA */}
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            <span className={styles.userInitial}>
              {user?.nombre?.charAt(0) || user?.name?.charAt(0) || "U"}
            </span>
          </div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>
              {user?.nombre || user?.name || "Usuario"}
            </span>
          </div>
        </div>
      </div>

      {/* ✅ MODAL DE SINCRONIZACIÓN */}
      <SyncModal />
    </header>
  );
};

export default Header;
