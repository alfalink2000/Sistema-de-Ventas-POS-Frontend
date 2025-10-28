// pages/Inventory/Inventory.jsx
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import DashboardLayout from "../../components/layout/DashboardLayout/DashboardLayout";
import { loadProducts, updateStock } from "../../actions/productsActions";
import {
  FiPackage,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCw,
  FiEdit,
  FiShield,
  FiEye,
} from "react-icons/fi";
import Swal from "sweetalert2"; // ✅ IMPORTAR SWEETALERT2
import styles from "./Inventory.module.css";

const Inventory = () => {
  const dispatch = useDispatch();
  const { products, loading } = useSelector((state) => state.products);
  const { user: currentUser } = useSelector((state) => state.auth); // ✅ OBTENER USUARIO ACTUAL
  const [editingStock, setEditingStock] = useState(null);
  const [newStockValue, setNewStockValue] = useState("");

  useEffect(() => {
    dispatch(loadProducts());
  }, [dispatch]);

  // ✅ PROTEGER CONTRA DATOS INVALIDOS
  const safeProducts = Array.isArray(products) ? products : [];

  const lowStockProducts = safeProducts.filter(
    (p) => p.stock <= (p.stock_minimo || 5) && p.stock > 0
  );
  const outOfStockProducts = safeProducts.filter((p) => p.stock === 0);
  const healthyStockProducts = safeProducts.filter(
    (p) => p.stock > (p.stock_minimo || 5)
  );

  // ✅ FUNCIÓN PARA SOLICITAR CONTRASEÑA DE ADMIN
  const requestAdminPassword = async (action = "realizar esta acción") => {
    if (currentUser.rol === "admin") {
      return true; // Los admins no necesitan validación adicional
    }

    const { value: password } = await Swal.fire({
      title: "Se requiere autorización de administrador",
      text: `Para ${action}, ingresa la contraseña de un administrador`,
      input: "password",
      inputLabel: "Contraseña de Administrador",
      inputPlaceholder: "Ingresa la contraseña...",
      inputAttributes: {
        maxlength: 50,
        autocapitalize: "off",
        autocorrect: "off",
      },
      showCancelButton: true,
      confirmButtonText: "Autorizar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      inputValidator: (value) => {
        if (!value) {
          return "La contraseña es requerida";
        }
      },
    });

    return password;
  };

  const handleUpdateStock = async (productId) => {
    if (!newStockValue || isNaN(newStockValue)) return;

    // ✅ VERIFICAR PERMISOS PARA ACTUALIZAR STOCK
    if (currentUser.rol !== "admin") {
      const adminPassword = await requestAdminPassword("actualizar el stock");
      if (!adminPassword) return; // Usuario canceló
    }

    const stockData = {
      stock: parseInt(newStockValue),
      // ✅ INCLUIR CONTRASEÑA DE ADMIN SI FUE SOLICITADA
      ...(currentUser.rol !== "admin" && { adminPassword }),
    };

    const success = await dispatch(updateStock(productId, stockData));

    if (success) {
      setEditingStock(null);
      setNewStockValue("");
    }
  };

  const startEditingStock = async (product) => {
    // ✅ VERIFICAR PERMISOS PARA EDITAR STOCK
    if (currentUser.rol !== "admin") {
      const adminPassword = await requestAdminPassword("editar el stock");
      if (!adminPassword) return; // Usuario canceló
    }

    setEditingStock(product.id);
    setNewStockValue(product.stock.toString());
  };

  const cancelEditing = () => {
    setEditingStock(null);
    setNewStockValue("");
  };

  const getStockStatus = (product) => {
    if (product.stock === 0) return "out-of-stock";
    if (product.stock <= (product.stock_minimo || 5)) return "low-stock";
    return "healthy";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "out-of-stock":
        return "#dc2626";
      case "low-stock":
        return "#d97706";
      case "healthy":
        return "#059669";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "out-of-stock":
        return <FiAlertTriangle className={styles.statusIcon} />;
      case "low-stock":
        return <FiAlertTriangle className={styles.statusIcon} />;
      case "healthy":
        return <FiCheckCircle className={styles.statusIcon} />;
      default:
        return <FiPackage className={styles.statusIcon} />;
    }
  };

  // ✅ FUNCIÓN PARA OBTENER TEXTO DE PERMISOS
  const getPermissionText = () => {
    if (currentUser.rol === "admin") {
      return "Tienes permisos completos para gestionar el inventario";
    } else {
      return "Algunas acciones requieren autorización de administrador";
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className={styles.inventoryPage}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <h1>Gestión de Inventario</h1>
          <p>Control de stock y alertas del sistema</p>
          <div className={styles.permissionInfo}>
            <FiShield className={styles.permissionIcon} />
            <span>{getPermissionText()}</span>
          </div>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{safeProducts.length}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
          <div className={`${styles.stat} ${styles.healthy}`}>
            <span className={styles.statNumber}>
              {healthyStockProducts.length}
            </span>
            <span className={styles.statLabel}>Óptimo</span>
          </div>
          <div className={`${styles.stat} ${styles.warning}`}>
            <span className={styles.statNumber}>{lowStockProducts.length}</span>
            <span className={styles.statLabel}>Bajo Stock</span>
          </div>
          <div className={`${styles.stat} ${styles.danger}`}>
            <span className={styles.statNumber}>
              {outOfStockProducts.length}
            </span>
            <span className={styles.statLabel}>Agotados</span>
          </div>
        </div>
      </div>

      {/* ✅ RESUMEN DE ALERTAS */}
      <div className={styles.alertsSummary}>
        {outOfStockProducts.length > 0 && (
          <div className={styles.alertCard}>
            <div className={styles.alertHeader}>
              <div className={styles.alertTitle}>
                <FiAlertTriangle className={styles.alertIcon} />
                <h3>Productos Agotados</h3>
              </div>
              <span className={styles.alertCount}>
                {outOfStockProducts.length}
              </span>
            </div>
            <p>Productos que necesitan reabastecimiento urgente</p>
          </div>
        )}

        {lowStockProducts.length > 0 && (
          <div className={`${styles.alertCard} ${styles.warning}`}>
            <div className={styles.alertHeader}>
              <div className={styles.alertTitle}>
                <FiAlertTriangle className={styles.alertIcon} />
                <h3>Stock Bajo</h3>
              </div>
              <span className={styles.alertCount}>
                {lowStockProducts.length}
              </span>
            </div>
            <p>Productos cerca del nivel mínimo de stock</p>
          </div>
        )}

        {safeProducts.length === 0 && (
          <div className={`${styles.alertCard} ${styles.info}`}>
            <div className={styles.alertHeader}>
              <div className={styles.alertTitle}>
                <FiPackage className={styles.alertIcon} />
                <h3>Sin Productos</h3>
              </div>
            </div>
            <p>No hay productos cargados en el sistema</p>
          </div>
        )}
      </div>

      {/* ✅ LISTA DETALLADA DE INVENTARIO */}
      {safeProducts.length > 0 && (
        <div className={styles.inventorySection}>
          <div className={styles.sectionHeader}>
            <h2>
              <FiPackage className={styles.sectionIcon} />
              Inventario Completo
            </h2>
            <div className={styles.sectionActions}>
              <span className={styles.userRoleBadge}>
                <FiShield className={styles.roleIcon} />
                {currentUser.rol === "admin" ? "Administrador" : "Vendedor"}
              </span>
              <button
                className={styles.refreshButton}
                onClick={() => dispatch(loadProducts())}
              >
                <FiRefreshCw className={styles.refreshIcon} />
                Actualizar
              </button>
            </div>
          </div>

          <div className={styles.inventoryTable}>
            <div className={styles.tableHeader}>
              <span>Producto</span>
              <span>Stock Actual</span>
              <span>Stock Mínimo</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>

            <div className={styles.tableBody}>
              {safeProducts.map((product) => {
                const status = getStockStatus(product);
                const canEditStock = currentUser.rol === "admin"; // ✅ DETERMINAR PERMISOS

                return (
                  <div key={product.id} className={styles.productRow}>
                    <div className={styles.productInfo}>
                      <span className={styles.productName}>
                        {product.nombre}
                      </span>
                      {product.categoria_nombre && (
                        <span className={styles.productCategory}>
                          {product.categoria_nombre}
                        </span>
                      )}
                    </div>

                    <div className={styles.stockInfo}>
                      {editingStock === product.id ? (
                        <input
                          type="number"
                          value={newStockValue}
                          onChange={(e) => setNewStockValue(e.target.value)}
                          className={styles.stockInput}
                          min="0"
                        />
                      ) : (
                        <span className={styles.stockValue}>
                          {product.stock}
                        </span>
                      )}
                    </div>

                    <div className={styles.minStock}>
                      <span>{product.stock_minimo || 5}</span>
                    </div>

                    <div className={styles.status}>
                      <div
                        className={styles.statusBadge}
                        style={{ backgroundColor: getStatusColor(status) }}
                      >
                        {getStatusIcon(status)}
                        <span>
                          {status === "out-of-stock" && "Agotado"}
                          {status === "low-stock" && "Bajo Stock"}
                          {status === "healthy" && "Óptimo"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.actions}>
                      {editingStock === product.id ? (
                        <div className={styles.editActions}>
                          <button
                            className={styles.saveButton}
                            onClick={() => handleUpdateStock(product.id)}
                          >
                            Guardar
                          </button>
                          <button
                            className={styles.cancelButton}
                            onClick={cancelEditing}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          className={`${styles.editButton} ${
                            !canEditStock ? styles.viewOnly : ""
                          }`}
                          onClick={() => startEditingStock(product)}
                          title={
                            canEditStock
                              ? "Editar stock del producto"
                              : "Solo visualización - Requiere autorización de administrador"
                          }
                        >
                          {canEditStock ? (
                            <>
                              <FiEdit className={styles.editIcon} />
                              Editar Stock
                            </>
                          ) : (
                            <>
                              <FiEye className={styles.viewIcon} />
                              Ver Stock
                              <FiShield className={styles.shieldIcon} />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ✅ INFORMACIÓN DE PERMISOS AL FINAL */}
          <div className={styles.permissionsFooter}>
            <div className={styles.permissionNote}>
              <FiShield className={styles.noteIcon} />
              <div>
                <strong>Información de permisos:</strong>
                <ul>
                  <li>
                    <strong>Administradores:</strong> Pueden editar stock
                    directamente
                  </li>
                  <li>
                    <strong>Vendedores:</strong> Solo visualización. Para editar
                    stock requieren autorización de administrador
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
