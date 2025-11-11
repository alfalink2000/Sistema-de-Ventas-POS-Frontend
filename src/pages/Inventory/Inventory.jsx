// pages/Inventory/Inventory.jsx - VERSIÓN FINAL CORREGIDA
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadProductsFromIndexedDB } from "../../actions/salesActions";
import { actualizarStock } from "../../actions/productsActions";
import {
  FiPackage,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCw,
  FiEdit,
  FiShield,
  FiEye,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";
import Swal from "sweetalert2";
import styles from "./Inventory.module.css";

const Inventory = () => {
  const dispatch = useDispatch();
  const { products, loading } = useSelector((state) => state.products);
  const { user: currentUser } = useSelector((state) => state.auth);
  const [editingStock, setEditingStock] = useState(null);
  const [newStockValue, setNewStockValue] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // ✅ EFFECT PARA DETECTAR CONEXIÓN
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("🌐 Conexión recuperada - Inventory");
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("📴 Sin conexión - Inventory");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ✅ EFFECT PARA CARGAR PRODUCTOS DESDE INDEXEDDB
  useEffect(() => {
    console.log("🔄 Inventory: Cargando productos desde IndexedDB...");
    dispatch(loadProductsFromIndexedDB());
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

  // ✅ MEJORAR LA FUNCIÓN requestAdminPassword
  const requestAdminPassword = async (action = "realizar esta acción") => {
    if (currentUser?.rol === "admin") {
      return true; // Los admin no necesitan contraseña
    }

    try {
      const { value: password } = await Swal.fire({
        title: "🔐 Autorización Requerida",
        html: `
        <div style="text-align: left;">
          <p><strong>Para ${action}, se requiere autorización de administrador.</strong></p>
          <p>Por favor, solicita a un administrador que ingrese su contraseña.</p>
        </div>
      `,
        input: "password",
        inputLabel: "Contraseña de Administrador",
        inputPlaceholder: "Ingresa la contraseña de administrador...",
        inputAttributes: {
          maxlength: "50",
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
          if (value.length < 6) {
            return "La contraseña debe tener al menos 6 caracteres";
          }
        },
      });

      return password;
    } catch (error) {
      console.error("Error en solicitud de contraseña:", error);
      return null;
    }
  };

  // ✅ FUNCIÓN PARA ACTUALIZAR STOCK (CORREGIDA)
  const handleUpdateStock = async (productoId) => {
    if (!newStockValue || isNaN(newStockValue)) {
      await Swal.fire({
        icon: "warning",
        title: "Valor inválido",
        text: "Por favor ingresa un valor numérico válido para el stock",
        confirmButtonText: "Entendido",
      });
      return;
    }

    // ✅ VERIFICAR PERMISOS PARA ACTUALIZAR STOCK
    let adminPassword;
    if (currentUser?.rol !== "admin") {
      adminPassword = await requestAdminPassword("actualizar el stock");
      if (!adminPassword) return; // Usuario canceló
    }

    const stockData = {
      stock: parseInt(newStockValue),
      // ✅ INCLUIR CONTRASEÑA DE ADMIN SI FUE SOLICITADA
      ...(currentUser?.rol !== "admin" && { adminPassword }),
    };

    console.log(`🔄 Actualizando stock del producto ${productoId}:`, stockData);

    try {
      // ✅ MOSTRAR LOADING DURANTE LA ACTUALIZACIÓN
      Swal.fire({
        title: "Actualizando stock...",
        text: "Por favor espera",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // ✅ USAR LA ACCIÓN CORREGIDA actualizarStock
      const result = await dispatch(actualizarStock(productoId, stockData));

      Swal.close();

      if (result?.success) {
        setEditingStock(null);
        setNewStockValue("");

        await Swal.fire({
          icon: "success",
          title: "¡Éxito!",
          text: result.message || "El stock se ha actualizado correctamente",
          timer: 2000,
          showConfirmButton: false,
          position: "top-end",
          toast: true,
        });

        // ✅ RECARGAR PRODUCTOS PARA ASEGURAR CONSISTENCIA
        setTimeout(() => {
          dispatch(loadProductsFromIndexedDB());
        }, 500);
      } else {
        throw new Error(result?.error || "Error al actualizar stock");
      }
    } catch (error) {
      console.error("❌ Error actualizando stock:", error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudo actualizar el stock",
        confirmButtonText: "Entendido",
      });
    }
  };

  // ✅ FUNCIÓN PARA ACTUALIZAR MANUALMENTE
  const handleRefreshInventory = () => {
    console.log("🔄 Forzando recarga de inventario...");
    dispatch(loadProductsFromIndexedDB());
  };

  const startEditingStock = async (product) => {
    try {
      // ✅ VERIFICAR PERMISOS PARA EDITAR STOCK
      let adminPassword;
      if (currentUser?.rol !== "admin") {
        adminPassword = await requestAdminPassword("editar el stock");
        if (!adminPassword) {
          console.log("Usuario canceló la autorización");
          return; // Usuario canceló
        }
      }

      // ✅ INICIAR EDICIÓN
      setEditingStock(product.id);
      setNewStockValue(product.stock.toString());

      console.log(`✏️ Iniciando edición de stock para: ${product.nombre}`);
    } catch (error) {
      console.error("Error iniciando edición de stock:", error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo iniciar la edición del stock",
        confirmButtonText: "Entendido",
      });
    }
  };

  const cancelEditing = () => {
    setEditingStock(null);
    setNewStockValue("");
  };

  const getStockStatus = (product) => {
    const stock = product.stock || 0;
    const stockMinimo = product.stock_minimo || 5;

    if (stock === 0) return "out-of-stock";
    if (stock <= stockMinimo) return "low-stock";
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
    if (currentUser?.rol === "admin") {
      return "Tienes permisos completos para gestionar el inventario";
    } else {
      return "Algunas acciones requieren autorización de administrador";
    }
  };

  // ✅ FUNCIÓN PARA OBTENER TEXTO DE ESTADO DE CONEXIÓN
  const getConnectionText = () => {
    return isOnline ? "Conectado" : "Modo offline - Datos locales";
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

            {/* ✅ INDICADOR DE CONEXIÓN */}
            <div
              className={`${styles.connectionStatus} ${
                isOnline ? styles.online : styles.offline
              }`}
            >
              <div className={styles.connectionIcon}>
                {isOnline ? <FiWifi /> : <FiWifiOff />}
              </div>
              <div className={styles.connectionText}>
                <span className={styles.connectionState}>
                  {getConnectionText()}
                </span>
              </div>
            </div>
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
                {currentUser?.rol === "admin" ? "Administrador" : "Vendedor"}
              </span>
              <button
                className={styles.refreshButton}
                onClick={handleRefreshInventory}
                disabled={loading}
              >
                <FiRefreshCw className={loading ? styles.spinning : ""} />
                {loading ? "Cargando..." : "Actualizar"}
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
                const canEditStock = currentUser?.rol === "admin";
                const productId = product.id;
                const stockActual = product.stock || 0;
                const stockMinimo = product.stock_minimo || 5;
                const productName = product.nombre;

                return (
                  <div key={productId} className={styles.productRow}>
                    <div className={styles.productInfo}>
                      <span className={styles.productName}>{productName}</span>
                      {product.categoria_nombre && (
                        <span className={styles.productCategory}>
                          {product.categoria_nombre}
                        </span>
                      )}
                    </div>

                    <div className={styles.stockInfo}>
                      {editingStock === productId ? (
                        <div className={styles.editContainer}>
                          <input
                            type="number"
                            value={newStockValue}
                            onChange={(e) => setNewStockValue(e.target.value)}
                            className={styles.stockInput}
                            min="0"
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleUpdateStock(productId);
                              }
                            }}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <span className={styles.stockValue}>{stockActual}</span>
                      )}
                    </div>

                    <div className={styles.minStock}>
                      <span>{stockMinimo}</span>
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
                      {editingStock === productId ? (
                        <div className={styles.editActions}>
                          <button
                            className={styles.saveButton}
                            onClick={() => handleUpdateStock(productId)}
                            disabled={!newStockValue || isNaN(newStockValue)}
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
                  <li>
                    <strong>Modo Offline:</strong> Los cambios se guardan
                    localmente y se sincronizan al recuperar conexión
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
