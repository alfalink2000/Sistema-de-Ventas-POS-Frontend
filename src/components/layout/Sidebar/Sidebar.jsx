import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux"; // ✅ Agregar useSelector
import { startLogout } from "../../../actions/authActions";
import {
  FiHome,
  FiShoppingCart,
  FiPackage,
  FiTrendingUp,
  FiDollarSign,
  FiBarChart2,
  FiMenu,
  FiX,
  FiShield,
  FiUsers,
  FiLogOut,
} from "react-icons/fi";
import Swal from "sweetalert2"; // ✅ Importar Swal
import styles from "./Sidebar.module.css";

const Sidebar = ({ isOpen, onToggle, onNavigation, currentView }) => {
  const dispatch = useDispatch();
  const [currentPath, setCurrentPath] = useState(`/${currentView || "sales"}`);
  const [isMobile, setIsMobile] = useState(false);

  // ✅ OBTENER ESTADO DE LA CAJA ABIERTA DESDE REDUX
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: FiHome },
    { path: "/sales", label: "Punto de Venta", icon: FiShoppingCart },
    { path: "/products", label: "Productos", icon: FiPackage },
    { path: "/inventory", label: "Inventario", icon: FiTrendingUp },
    { path: "/caja", label: "Caja", icon: FiDollarSign },
    { path: "/reports", label: "Reportes", icon: FiBarChart2 },
    { path: "/users", label: "Usuarios", icon: FiUsers },
  ];

  // ✅ DETECTAR SI ES MÓVIL
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    setCurrentPath(`/${currentView || "sales"}`);
  }, [currentView]);

  const isActive = (path) => currentPath === path;

  const handleNavigation = (path) => {
    setCurrentPath(path);
    if (onNavigation) {
      onNavigation(path);
    }
    // ✅ Cerrar sidebar en móvil después de navegar
    if (isMobile) {
      onToggle();
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA CERRAR SESIÓN CON VALIDACIÓN
  const handleLogout = async () => {
    try {
      console.log("🔍 Verificando estado de caja antes de cerrar sesión...");

      // ✅ VERIFICAR SI HAY UNA CAJA ABIERTA
      if (sesionAbierta) {
        console.warn(
          "⚠️ Intento de cerrar sesión con caja abierta:",
          sesionAbierta
        );

        await Swal.fire({
          icon: "error",
          title: "No puede cerrar sesión",
          html: `
            <div style="text-align: left;">
              <p><strong>¡Tiene una caja abierta!</strong></p>
              <p>Para cerrar sesión primero debe:</p>
              <ul style="text-align: left; margin-left: 20px;">
                <li>Cerrar la caja actual</li>
                <li>Sincronizar todas las ventas pendientes</li>
                <li>Confirmar el cierre de sesión de caja</li>
              </ul>
              <p style="margin-top: 10px; color: #666;">
                Sesión activa: <strong>${
                  sesionAbierta.id || sesionAbierta.id_local
                }</strong><br/>
                Abierta: ${new Date(
                  sesionAbierta.fecha_apertura
                ).toLocaleString()}
              </p>
            </div>
          `,
          confirmButtonText: "Entendido",
          confirmButtonColor: "#d33",
          showCancelButton: false,
          width: "500px",
        });

        return; // ✅ DETENER EL PROCESO DE LOGOUT
      }

      // ✅ SI NO HAY CAJA ABIERTA, PROCEDER CON LOGOUT NORMAL
      console.log("✅ No hay caja abierta, procediendo con logout...");

      // Mostrar confirmación estándar
      const result = await Swal.fire({
        title: "¿Cerrar sesión?",
        text: "¿Está seguro de que desea cerrar sesión?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, cerrar sesión",
        cancelButtonText: "Cancelar",
      });

      if (result.isConfirmed) {
        dispatch(startLogout());
      }
    } catch (error) {
      console.error("❌ Error en proceso de logout:", error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ocurrió un error al intentar cerrar sesión",
        confirmButtonText: "Entendido",
      });
    }
  };

  // ✅ MANEJAR CLICK EN OVERLAY (solo en móvil)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onToggle();
    }
  };

  // ✅ COMPORTAMIENTO DIFERENTE PARA MÓVIL VS DESKTOP
  if (!isOpen) {
    return (
      <div className={styles.sidebarClosed}>
        <button className={styles.menuButton} onClick={onToggle}>
          <FiMenu className={styles.menuIcon} />
        </button>
      </div>
    );
  }

  return (
    <>
      {/* ✅ OVERLAY SOLO EN MÓVIL */}
      {isMobile && (
        <div className={styles.overlay} onClick={handleOverlayClick} />
      )}

      <aside
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <FiShield className={styles.logoIcon} />
            <h2>KioskoFlow</h2>
          </div>
          <button className={styles.closeButton} onClick={onToggle}>
            <FiX className={styles.closeIcon} />
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {menuItems.map((item) => {
            const IconComponent = item.icon;

            return (
              <button
                key={item.path}
                className={`${styles.navItem} ${
                  isActive(item.path) ? styles.active : ""
                }`}
                onClick={() => handleNavigation(item.path)}
              >
                <div className={styles.navIconWrapper}>
                  <IconComponent className={styles.navIcon} />
                </div>
                <span className={styles.navLabel}>{item.label}</span>

                {isActive(item.path) && (
                  <div className={styles.activeIndicator} />
                )}
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          {/* ✅ MOSTRAR INDICADOR DE CAJA ABIERTA */}
          {sesionAbierta && (
            <div className={styles.cajaAbiertaWarning}>
              <div className={styles.warningIcon}>⚠️</div>
              <div className={styles.warningText}>
                <strong>Caja Abierta</strong>
                <small>ID: {sesionAbierta.id || sesionAbierta.id_local}</small>
              </div>
            </div>
          )}

          <button
            className={`${styles.logoutButton} ${
              sesionAbierta ? styles.logoutDisabled : ""
            }`}
            onClick={handleLogout}
            title={
              sesionAbierta
                ? "Cierre la caja antes de cerrar sesión"
                : "Cerrar sesión"
            }
          >
            <FiLogOut className={styles.logoutIcon} />
            <span className={styles.logoutLabel}>Cerrar Sesión</span>
          </button>

          <div className={styles.systemInfo}>
            <div className={styles.versionBadge}>
              <span>v1.0</span>
            </div>
            <span className={styles.systemText}>Sistema POS</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
