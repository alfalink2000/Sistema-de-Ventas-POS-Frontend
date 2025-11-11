// pages/Users/Users.jsx - VERSIÓN MEJORADA
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiUsers,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiFilter,
  FiUserCheck,
  FiUserX,
  FiShield,
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import Swal from "sweetalert2";
import UserModal from "../../components/features/users/UserModal";
import {
  loadUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../../actions/usersActions";
import styles from "./Users.module.css";

const Users = () => {
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [hasAuthError, setHasAuthError] = useState(false);

  const dispatch = useDispatch();
  const { users, loading, error } = useSelector((state) => state.users);
  const { user: currentUser } = useSelector((state) => state.auth);

  // ✅ DETECTAR ESTADO DE CONEXIÓN
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setHasAuthError(false);
      // Recargar datos cuando se recupera la conexión
      if (retryCount > 0) {
        handleLoadUsers();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [dispatch, retryCount]);

  // ✅ FUNCIÓN MEJORADA PARA CARGAR USUARIOS
  const handleLoadUsers = async () => {
    try {
      setHasAuthError(false);
      const result = await dispatch(loadUsers());

      if (result?.isAuthError) {
        setHasAuthError(true);
      }
    } catch (error) {
      console.error("Error en handleLoadUsers:", error);
    }
  };

  // ✅ EFECTO MEJORADO PARA CARGAR USUARIOS
  useEffect(() => {
    if (isOnline && !hasAuthError) {
      console.log("🌐 Users: Online - cargando usuarios desde API");
      handleLoadUsers();
    } else {
      console.log("📴 Users: Offline o error de auth - no se cargan usuarios");
    }
  }, [dispatch, isOnline, retryCount]);

  // ✅ MANEJAR REINTENTO DE CARGA
  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    setHasAuthError(false);
    handleLoadUsers();
  };

  // ✅ FUNCIÓN PARA SOLICITAR CONTRASEÑA DE ADMIN
  const requestAdminPassword = async (action = "realizar esta acción") => {
    if (currentUser?.rol === "admin") {
      return true;
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

  const handleCreateUser = async () => {
    // ✅ VERIFICAR CONEXIÓN PARA CREAR USUARIOS
    if (!isOnline) {
      await Swal.fire({
        icon: "error",
        title: "Sin conexión",
        text: "No puedes crear usuarios en modo offline. Conéctate a internet e intenta nuevamente.",
        confirmButtonText: "Entendido",
      });
      return;
    }

    if (currentUser?.rol !== "admin") {
      const adminPassword = await requestAdminPassword(
        "crear un nuevo usuario"
      );
      if (!adminPassword) return;
    }

    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = async (user) => {
    // ✅ VERIFICAR CONEXIÓN PARA EDITAR USUARIOS
    if (!isOnline) {
      await Swal.fire({
        icon: "error",
        title: "Sin conexión",
        text: "No puedes editar usuarios en modo offline. Conéctate a internet e intenta nuevamente.",
        confirmButtonText: "Entendido",
      });
      return;
    }

    if (currentUser?.rol !== "admin" && user.id !== currentUser?.id) {
      const adminPassword = await requestAdminPassword(
        `editar al usuario ${user.nombre}`
      );
      if (!adminPassword) return;
    }

    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = async (user) => {
    // ✅ VERIFICAR CONEXIÓN PARA ELIMINAR USUARIOS
    if (!isOnline) {
      await Swal.fire({
        icon: "error",
        title: "Sin conexión",
        text: "No puedes eliminar usuarios en modo offline. Conéctate a internet e intenta nuevamente.",
        confirmButtonText: "Entendido",
      });
      return;
    }

    if (user.id === currentUser?.id) {
      await Swal.fire({
        icon: "error",
        title: "No puedes eliminarte a ti mismo",
        text: "No es posible eliminar tu propio usuario",
        confirmButtonText: "Entendido",
      });
      return;
    }

    if (currentUser?.rol !== "admin") {
      const adminPassword = await requestAdminPassword(
        `eliminar al usuario ${user.nombre}`
      );
      if (!adminPassword) return;
    }

    const result = await Swal.fire({
      title: "¿Eliminar usuario?",
      text: `Esta acción eliminará al usuario "${user.nombre}" permanentemente`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      const deleteResult = await dispatch(deleteUser(user.id));

      // ✅ SI HAY ERROR DE AUTENTICACIÓN EN LA ELIMINACIÓN
      if (deleteResult?.isAuthError) {
        setHasAuthError(true);
      }
    }
  };

  const handleSaveUser = async (userData) => {
    try {
      let result;

      if (currentUser?.rol !== "admin") {
        const adminPassword = await requestAdminPassword(
          editingUser ? "actualizar este usuario" : "crear un nuevo usuario"
        );
        if (!adminPassword) return;
        userData.adminPassword = adminPassword;
      }

      if (editingUser) {
        result = await dispatch(updateUser(editingUser.id, userData));
      } else {
        result = await dispatch(createUser(userData));
      }

      // ✅ SI HAY ERROR DE AUTENTICACIÓN
      if (result?.isAuthError) {
        setHasAuthError(true);
        return;
      }

      if (result?.success) {
        setShowUserModal(false);
        setEditingUser(null);
        handleLoadUsers(); // Recargar usuarios
      }
    } catch (error) {
      console.error("Error guardando usuario:", error);
    }
  };

  // Filtrar usuarios
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === "all" || user.rol === filterRole;

    return matchesSearch && matchesRole;
  });

  const activeUsers = users.filter((u) => u.activo).length;
  const inactiveUsers = users.filter((u) => !u.activo).length;
  const adminUsers = users.filter((u) => u.rol === "admin").length;
  const vendedorUsers = users.filter((u) => u.rol === "vendedor").length;

  // ✅ COMPONENTE DE ERROR DE AUTENTICACIÓN
  const renderAuthErrorState = () => (
    <div className={styles.authErrorState}>
      <div className={styles.authErrorContent}>
        <FiAlertCircle className={styles.authErrorIcon} />
        <h3>Error de Autenticación</h3>
        <p>Tu sesión ha expirado. Serás redirigido al login automáticamente.</p>
        <div className={styles.authErrorActions}>
          <button
            className={styles.retryButton}
            onClick={handleRetry}
            disabled={true}
          >
            <FiRefreshCw className={styles.retryIcon} />
            Redirigiendo...
          </button>
        </div>
      </div>
    </div>
  );

  // ✅ COMPONENTE DE ESTADO OFFLINE
  const renderOfflineState = () => (
    <div className={styles.offlineState}>
      <div className={styles.offlineContent}>
        <FiWifiOff className={styles.offlineIcon} />
        <h3>Modo Sin Conexión</h3>
        <p>No puedes cargar o gestionar usuarios sin conexión a internet</p>
        <div className={styles.offlineActions}>
          <button
            className={styles.retryButton}
            onClick={handleRetry}
            disabled={!isOnline}
          >
            <FiRefreshCw className={styles.retryIcon} />
            Reintentar Conexión
          </button>
        </div>
      </div>
    </div>
  );

  // ✅ COMPONENTE DE ERROR DE CARGA
  const renderErrorState = () => (
    <div className={styles.errorState}>
      <div className={styles.errorContent}>
        <FiWifiOff className={styles.errorIcon} />
        <h3>Error de Conexión</h3>
        <p>
          No se pudieron cargar los usuarios. Verifica tu conexión a internet.
        </p>
        <div className={styles.errorActions}>
          <button className={styles.retryButton} onClick={handleRetry}>
            <FiRefreshCw className={styles.retryIcon} />
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );

  // ✅ SI HAY ERROR DE AUTENTICACIÓN, MOSTRAR ESTADO ESPECIAL
  if (hasAuthError) {
    return renderAuthErrorState();
  }

  return (
    <div className={styles.usersPage}>
      {/* Header con estado de conexión */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <FiUsers />
          </div>
          <div>
            <h1>Gestión de Usuarios</h1>
            <p>Administra los usuarios del sistema POS</p>

            {/* ✅ INDICADOR DE ESTADO DE CONEXIÓN */}
            <div
              className={`${styles.connectionStatus} ${
                isOnline ? styles.online : styles.offline
              }`}
            >
              {isOnline ? (
                <>
                  <FiWifi className={styles.connectionIcon} />
                  <span>Conectado - {users.length} usuarios cargados</span>
                </>
              ) : (
                <>
                  <FiWifiOff className={styles.connectionIcon} />
                  <span>Sin conexión - Modo offline</span>
                </>
              )}
            </div>

            {currentUser?.rol !== "admin" && (
              <div className={styles.adminWarning}>
                <FiShield className={styles.warningIcon} />
                <span>
                  Algunas acciones requieren autorización de administrador
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.headerStats}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{users.length}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{activeUsers}</span>
            <span className={styles.statLabel}>Activos</span>
          </div>
          <div className={`${styles.stat} ${styles.adminStat}`}>
            <span className={styles.statNumber}>{adminUsers}</span>
            <span className={styles.statLabel}>Admins</span>
          </div>
          <div className={`${styles.stat} ${styles.vendedorStat}`}>
            <span className={styles.statNumber}>{vendedorUsers}</span>
            <span className={styles.statLabel}>Vendedores</span>
          </div>
        </div>
      </div>

      {/* ✅ MOSTRAR ESTADO OFFLINO O ERROR */}
      {!isOnline && renderOfflineState()}
      {isOnline && error && !hasAuthError && renderErrorState()}

      {/* Barra de acciones y filtros - DESHABILITADA EN OFFLINE */}
      {isOnline && !error && !hasAuthError && (
        <>
          <div className={styles.actionsBar}>
            <div className={styles.searchSection}>
              <div className={styles.searchInput}>
                <FiSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchField}
                />
              </div>

              <div className={styles.filterGroup}>
                <FiFilter className={styles.filterIcon} />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className={styles.roleSelect}
                >
                  <option value="all">Todos los roles</option>
                  <option value="admin">Administrador</option>
                  <option value="vendedor">Vendedor</option>
                </select>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button
                className={styles.addButton}
                onClick={handleCreateUser}
                title={
                  currentUser?.rol !== "admin"
                    ? "Requiere autorización de administrador"
                    : "Crear nuevo usuario"
                }
              >
                <FiPlus className={styles.addIcon} />
                Nuevo Usuario
                {currentUser?.rol !== "admin" && (
                  <FiShield className={styles.shieldIcon} />
                )}
              </button>
            </div>
          </div>

          {/* Tabla de usuarios */}
          <div className={styles.usersTable}>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Cargando usuarios...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className={styles.noUsers}>
                <FiUsers className={styles.noUsersIcon} />
                <h3>No se encontraron usuarios</h3>
                <p>
                  {searchTerm || filterRole !== "all"
                    ? "Intenta ajustar los filtros de búsqueda"
                    : "Comienza agregando el primer usuario al sistema"}
                </p>
                <button
                  className={styles.addFirstUser}
                  onClick={handleCreateUser}
                  title={
                    currentUser?.rol !== "admin"
                      ? "Requiere autorización de administrador"
                      : "Crear primer usuario"
                  }
                >
                  <FiPlus className={styles.addIcon} />
                  Agregar Primer Usuario
                  {currentUser?.rol !== "admin" && (
                    <FiShield className={styles.shieldIcon} />
                  )}
                </button>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Último Login</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className={styles.usernameCell}>
                          <span className={styles.username}>
                            {user.username}
                          </span>
                          {user.id === currentUser?.id && (
                            <span className={styles.currentUserBadge}>
                              (Tú)
                            </span>
                          )}
                        </td>
                        <td>{user.nombre}</td>
                        <td>{user.email}</td>
                        <td>
                          <span
                            className={`${styles.roleBadge} ${
                              styles[user.rol]
                            }`}
                          >
                            {user.rol}
                            {user.rol === "admin" && (
                              <FiShield className={styles.roleIcon} />
                            )}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              user.activo ? styles.active : styles.inactive
                            }`}
                          >
                            {user.activo ? (
                              <>
                                <FiUserCheck className={styles.statusIcon} />
                                Activo
                              </>
                            ) : (
                              <>
                                <FiUserX className={styles.statusIcon} />
                                Inactivo
                              </>
                            )}
                          </span>
                        </td>
                        <td>
                          {user.ultimo_login
                            ? new Date(user.ultimo_login).toLocaleDateString()
                            : "Nunca"}
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.editBtn}
                              onClick={() => handleEditUser(user)}
                              title={
                                currentUser?.rol !== "admin" &&
                                user.id !== currentUser?.id
                                  ? "Requiere autorización de administrador"
                                  : "Editar usuario"
                              }
                            >
                              <FiEdit />
                              {currentUser?.rol !== "admin" &&
                                user.id !== currentUser?.id && (
                                  <FiShield className={styles.actionShield} />
                                )}
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteUser(user)}
                              disabled={user.id === currentUser?.id}
                              title={
                                user.id === currentUser?.id
                                  ? "No puedes eliminarte a ti mismo"
                                  : currentUser?.rol !== "admin"
                                  ? "Requiere autorización de administrador"
                                  : "Eliminar usuario"
                              }
                            >
                              <FiTrash2 />
                              {currentUser?.rol !== "admin" &&
                                user.id !== currentUser?.id && (
                                  <FiShield className={styles.actionShield} />
                                )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal de usuario */}
      <UserModal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        user={editingUser}
      />
    </div>
  );
};

export default Users;
