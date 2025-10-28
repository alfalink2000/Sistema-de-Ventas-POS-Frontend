// pages/Users/Users.jsx - CORREGIDO
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

  const dispatch = useDispatch();
  const { users, loading } = useSelector((state) => state.users);
  const { user: currentUser } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadUsers());
  }, [dispatch]);

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

  const handleCreateUser = async () => {
    // ✅ SOLO ADMINS PUEDEN CREAR USUARIOS
    if (currentUser.rol !== "admin") {
      const adminPassword = await requestAdminPassword(
        "crear un nuevo usuario"
      );
      if (!adminPassword) return; // Usuario canceló
    }

    setEditingUser(null);
    setShowUserModal(true);
  };

  const handleEditUser = async (user) => {
    // ✅ SOLO ADMINS PUEDEN EDITAR USUARIOS (excepto auto-edición)
    if (currentUser.rol !== "admin" && user.id !== currentUser.id) {
      const adminPassword = await requestAdminPassword(
        `editar al usuario ${user.nombre}`
      );
      if (!adminPassword) return;
    }

    setEditingUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = async (user) => {
    // No permitir eliminarse a sí mismo
    if (user.id === currentUser.id) {
      await Swal.fire({
        icon: "error",
        title: "No puedes eliminarte a ti mismo",
        text: "No es posible eliminar tu propio usuario",
        confirmButtonText: "Entendido",
      });
      return;
    }

    // ✅ SOLO ADMINS PUEDEN ELIMINAR USUARIOS
    if (currentUser.rol !== "admin") {
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
      dispatch(deleteUser(user.id));
    }
  };

  const handleSaveUser = async (userData) => {
    try {
      let result;

      // ✅ INCLUIR CONTRASEÑA DE ADMIN SI FUE SOLICITADA
      if (currentUser.rol !== "admin") {
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

      if (result?.success) {
        setShowUserModal(false);
        setEditingUser(null);
        dispatch(loadUsers()); // Recargar lista
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

  // ✅ CALCULAR ESTADÍSTICAS ADICIONALES
  const adminUsers = users.filter((u) => u.rol === "admin").length;
  const vendedorUsers = users.filter((u) => u.rol === "vendedor").length;

  return (
    <div className={styles.usersPage}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <FiUsers />
          </div>
          <div>
            <h1>Gestión de Usuarios</h1>
            <p>Administra los usuarios del sistema POS</p>
            {currentUser.rol !== "admin" && (
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

      {/* Barra de acciones y filtros */}
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
              currentUser.rol !== "admin"
                ? "Requiere autorización de administrador"
                : "Crear nuevo usuario"
            }
          >
            <FiPlus className={styles.addIcon} />
            Nuevo Usuario
            {currentUser.rol !== "admin" && (
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
                currentUser.rol !== "admin"
                  ? "Requiere autorización de administrador"
                  : "Crear primer usuario"
              }
            >
              <FiPlus className={styles.addIcon} />
              Agregar Primer Usuario
              {currentUser.rol !== "admin" && (
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
                      <span className={styles.username}>{user.username}</span>
                      {user.id === currentUser.id && (
                        <span className={styles.currentUserBadge}>(Tú)</span>
                      )}
                    </td>
                    <td>{user.nombre}</td>
                    <td>{user.email}</td>
                    <td>
                      <span
                        className={`${styles.roleBadge} ${styles[user.rol]}`}
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
                            currentUser.rol !== "admin" &&
                            user.id !== currentUser.id
                              ? "Requiere autorización de administrador"
                              : "Editar usuario"
                          }
                        >
                          <FiEdit />
                          {currentUser.rol !== "admin" &&
                            user.id !== currentUser.id && (
                              <FiShield className={styles.actionShield} />
                            )}
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteUser(user)}
                          disabled={user.id === currentUser.id}
                          title={
                            user.id === currentUser.id
                              ? "No puedes eliminarte a ti mismo"
                              : currentUser.rol !== "admin"
                              ? "Requiere autorización de administrador"
                              : "Eliminar usuario"
                          }
                        >
                          <FiTrash2 />
                          {currentUser.rol !== "admin" &&
                            user.id !== currentUser.id && (
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
