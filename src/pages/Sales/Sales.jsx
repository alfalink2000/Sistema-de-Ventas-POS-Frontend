// pages/Sales/Sales.jsx - VERSIÓN CORREGIDA
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProductGridSales from "../../components/features/sales/ProductGridSales/ProductGridSales";
import Cart from "../../components/features/sales/Cart/Cart";
import PaymentModal from "../../components/features/sales/PaymentModal/PaymentModal";
import SesionCajaModal from "../../components/features/caja/SesionCajaModal/SesionCajaModal";
import { loadProducts } from "../../actions/productsActions";
import { clearCart } from "../../actions/cartActions";
import { loadOpenSesion } from "../../actions/sesionesCajaActions";
import {
  FiFilter,
  FiSearch,
  FiPackage,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";
import styles from "./Sales.module.css";
import IndexedDBService from "../../services/IndexedDBService";
import SyncController from "../../controllers/offline/SyncController/SyncController";

const Sales = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [showSesionModal, setShowSesionModal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({
    pendingSales: 0,
    pendingSessions: 0,
    pendingClosures: 0,
  });

  const dispatch = useDispatch();

  const { products, loading, error } = useSelector((state) => state.products);
  const { items } = useSelector((state) => state.cart);
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);
  const { user } = useSelector((state) => state.auth);

  // Cargar estado de sincronización y detectar conexión
  useEffect(() => {
    const loadSyncStatus = async () => {
      try {
        const status = await SyncController.getSyncStatus();
        setSyncStatus({
          pendingSales: status.pendingSales,
          pendingSessions: status.pendingSessions,
          pendingClosures: status.pendingClosures,
        });
      } catch (error) {
        console.error("Error cargando estado de sincronización:", error);
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    loadSyncStatus();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Actualizar estado cada 30 segundos
    const interval = setInterval(loadSyncStatus, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Cargar productos (online u offline)
  useEffect(() => {
    const loadProductsData = async () => {
      if (isOnline) {
        // Online: cargar desde API
        dispatch(loadProducts());
      } else {
        // Offline: cargar desde IndexedDB
        try {
          const offlineProducts = await IndexedDBService.getAll("productos");
          // Dispatch manual para actualizar estado
          dispatch({
            type: "PRODUCTS_LOAD_OFFLINE",
            payload: offlineProducts || [],
          });
        } catch (error) {
          console.error("Error cargando productos offline:", error);
          dispatch({
            type: "PRODUCTS_LOAD_OFFLINE",
            payload: [],
          });
        }
      }
    };

    loadProductsData();

    if (user) {
      dispatch(loadOpenSesion(user.id));
    }
  }, [dispatch, user, isOnline]);

  // Extraer categorías únicas de los productos
  useEffect(() => {
    if (products && products.length > 0) {
      const uniqueCategories = [
        ...new Set(
          products
            .filter((p) => p.categoria_nombre)
            .map((p) => p.categoria_nombre)
        ),
      ].sort();

      setCategories(uniqueCategories);
    }
  }, [products]);

  // Filtrar productos basado en búsqueda y categoría
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      product.categoria_nombre === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleCheckout = () => {
    if (!sesionAbierta) {
      setShowSesionModal(true);
      return;
    }
    setShowPaymentModal(true);
  };

  const handleSaleSuccess = (saleData) => {
    console.log("Venta exitosa:", saleData);
    dispatch(clearCart());

    // Actualizar estado de sincronización
    SyncController.getSyncStatus().then((status) => {
      setSyncStatus({
        pendingSales: status.pendingSales,
        pendingSessions: status.pendingSessions,
        pendingClosures: status.pendingClosures,
      });
    });

    // Mostrar mensaje según el modo
    if (!isOnline) {
      alert(
        `✅ Venta guardada localmente (#${saleData.id_local}). Se sincronizará cuando haya conexión.`
      );
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
  };

  return (
    <div className={styles.salesPage}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <h1>Punto de Venta</h1>
          <p>
            {isOnline
              ? "Conectado al servidor"
              : "Modo offline - Las ventas se guardarán localmente"}
            {syncStatus.pendingSales > 0 &&
              ` (${syncStatus.pendingSales} pendientes)`}
          </p>
        </div>

        {/* Indicador de conexión */}
        <div
          className={`${styles.connectionStatus} ${
            isOnline ? styles.online : styles.offline
          }`}
        >
          {isOnline ? <FiWifi /> : <FiWifiOff />}
          <span>{isOnline ? "En línea" : "Offline"}</span>
        </div>

        <div className={styles.headerStats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{filteredProducts.length}</span>
            <span className={styles.statLabel}>Productos</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{items.length}</span>
            <span className={styles.statLabel}>En carrito</span>
          </div>
          {!isOnline && (
            <div className={styles.stat}>
              <span className={styles.statNumber}>
                {syncStatus.pendingSales}
              </span>
              <span className={styles.statLabel}>Pendientes</span>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Alerta si no hay sesión */}
      {!sesionAbierta && (
        <div className={styles.alertWarning}>
          <div className={styles.alertIcon}>⚠️</div>
          <div className={styles.alertContent}>
            <h3>No hay sesión de caja activa</h3>
            <p>Debes abrir una sesión de caja para realizar ventas</p>
            <button
              className={styles.openSessionBtn}
              onClick={() => setShowSesionModal(true)}
            >
              Abrir Sesión
            </button>
          </div>
        </div>
      )}

      {/* ✅ Alerta de modo offline */}
      {!isOnline && (
        <div className={styles.offlineAlert}>
          <div className={styles.alertIcon}>📱</div>
          <div className={styles.alertContent}>
            <h3>Modo Offline Activado</h3>
            <p>
              Las ventas se guardarán localmente y se sincronizarán
              automáticamente cuando recuperes la conexión
            </p>
          </div>
        </div>
      )}

      <div className={styles.salesContent}>
        <div className={styles.productsSection}>
          {/* ✅ FILTROS Y BÚSQUEDA */}
          <div className={styles.filtersSection}>
            <div className={styles.searchBox}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              {searchTerm && (
                <button
                  className={styles.clearButton}
                  onClick={() => setSearchTerm("")}
                >
                  ×
                </button>
              )}
            </div>

            <div className={styles.categoryFilter}>
              <div className={styles.filterHeader}>
                <FiFilter className={styles.filterIcon} />
                <span>Filtrar por categoría</span>
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={styles.categorySelect}
              >
                <option value="all">Todas las categorías</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {(searchTerm || selectedCategory !== "all") && (
              <button className={styles.clearFilters} onClick={clearFilters}>
                Limpiar filtros
              </button>
            )}
          </div>

          {/* ✅ CONTADOR DE RESULTADOS */}
          <div className={styles.resultsInfo}>
            <div className={styles.sectionHeader}>
              <h2>
                <FiPackage className={styles.sectionIcon} />
                Productos Disponibles
                <span className={styles.resultsCount}>
                  ({filteredProducts.length}{" "}
                  {filteredProducts.length === 1 ? "producto" : "productos"})
                  {!isOnline && " 📱"}
                </span>
              </h2>
              {sesionAbierta && (
                <div className={styles.sesionStatus}>
                  <span className={styles.statusIndicator}></span>
                  Sesión activa
                </div>
              )}
            </div>
          </div>

          {/* ✅ GRILLA DE PRODUCTOS ESPECIAL PARA VENTAS */}
          <ProductGridSales
            products={filteredProducts}
            loading={loading}
            error={error}
            compact={true}
          />
        </div>

        <div className={styles.cartSection}>
          <Cart
            onCheckout={handleCheckout}
            disabled={!sesionAbierta || items.length === 0}
          />
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handleSaleSuccess}
        isOnline={isOnline}
      />

      <SesionCajaModal
        isOpen={showSesionModal}
        onClose={() => setShowSesionModal(false)}
      />
    </div>
  );
};

export default Sales;
