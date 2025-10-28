// components/features/users/UserModal/UserModal.jsx
import { useState, useEffect } from "react";
import {
  FiX,
  FiSave,
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiShield,
  FiKey,
} from "react-icons/fi";
import Modal from "../../ui/Modal/Modal";
import Button from "../../ui/Button/Button";
import styles from "./UserModal.module.css";

const UserModal = ({ isOpen, onClose, onSave, user }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    nombre: "",
    rol: "vendedor",
    currentPassword: "", // Nueva campo para contraseña actual
    newPassword: "", // Nueva campo para nueva contraseña
    confirmPassword: "", // Confirmación de nueva contraseña
    adminPassword: "", // Para validación de admin
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false); // Estado para mostrar campos de cambio de contraseña

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          username: user.username || "",
          email: user.email || "",
          nombre: user.nombre || "",
          rol: user.rol || "vendedor",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          adminPassword: "",
        });
        setChangingPassword(false); // Inicialmente oculto
      } else {
        setFormData({
          username: "",
          email: "",
          nombre: "",
          rol: "vendedor",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          adminPassword: "",
        });
        setChangingPassword(true); // En creación siempre mostrar
      }
      setErrors({});
      setLoading(false);
    }
  }, [isOpen, user]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "El nombre de usuario es requerido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El email no es válido";
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre completo es requerido";
    }

    // ✅ Validación para creación de usuario
    if (!user && !formData.newPassword) {
      newErrors.newPassword = "La contraseña es requerida para nuevos usuarios";
    }

    // ✅ Validación para cambio de contraseña en edición
    if (user && changingPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = "La contraseña actual es requerida";
      }

      if (!formData.newPassword) {
        newErrors.newPassword = "La nueva contraseña es requerida";
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword =
          "La nueva contraseña debe tener al menos 6 caracteres";
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Las nuevas contraseñas no coinciden";
      }
    }

    // ✅ Validación para rol de administrador
    if (formData.rol === "admin" && !formData.adminPassword) {
      newErrors.adminPassword =
        "Se requiere contraseña de administrador para asignar este rol";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const userData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        nombre: formData.nombre.trim(),
        rol: formData.rol,
      };

      // ✅ Incluir datos de cambio de contraseña si es edición y se está cambiando
      if (user && changingPassword) {
        userData.currentPassword = formData.currentPassword;
        userData.newPassword = formData.newPassword;
      }

      // ✅ Incluir password si es creación de usuario
      if (!user && formData.newPassword) {
        userData.password = formData.newPassword;
      }

      // ✅ Incluir contraseña de admin si se está asignando rol de administrador
      if (formData.rol === "admin" && formData.adminPassword) {
        userData.adminPassword = formData.adminPassword;
      }

      await onSave(userData);
    } catch (error) {
      console.error("Error guardando usuario:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      username: "",
      email: "",
      nombre: "",
      rol: "vendedor",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      adminPassword: "",
    });
    setErrors({});
    setChangingPassword(false);
    onClose();
  };

  const togglePasswordChange = () => {
    setChangingPassword(!changingPassword);
    // Limpiar campos de contraseña al ocultar
    if (changingPassword) {
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={user ? "Editar Usuario" : "Nuevo Usuario"}
      size="medium"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <FiUser className={styles.labelIcon} />
              Nombre de Usuario *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={`${styles.input} ${
                errors.username ? styles.error : ""
              }`}
              placeholder="usuario123"
            />
            {errors.username && (
              <span className={styles.errorText}>{errors.username}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <FiMail className={styles.labelIcon} />
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.email ? styles.error : ""}`}
              placeholder="usuario@ejemplo.com"
            />
            {errors.email && (
              <span className={styles.errorText}>{errors.email}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              <FiUser className={styles.labelIcon} />
              Nombre Completo *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleInputChange}
              className={`${styles.input} ${errors.nombre ? styles.error : ""}`}
              placeholder="Juan Pérez"
            />
            {errors.nombre && (
              <span className={styles.errorText}>{errors.nombre}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Rol *</label>
            <select
              name="rol"
              value={formData.rol}
              onChange={handleInputChange}
              className={styles.select}
            >
              <option value="vendedor">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
            <div className={styles.roleDescription}>
              {formData.rol === "vendedor"
                ? "Puede realizar ventas y gestionar productos"
                : "Acceso completo al sistema con todos los permisos"}
            </div>
          </div>

          {/* ✅ Campo de contraseña de administrador (solo cuando se selecciona rol admin) */}
          {formData.rol === "admin" && (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                <FiShield className={styles.labelIcon} />
                Contraseña de Administrador *
              </label>
              <div className={styles.passwordInput}>
                <input
                  type={showAdminPassword ? "text" : "password"}
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleInputChange}
                  className={`${styles.input} ${
                    errors.adminPassword ? styles.error : ""
                  }`}
                  placeholder="Ingresa tu contraseña de administrador"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                >
                  {showAdminPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.adminPassword && (
                <span className={styles.errorText}>{errors.adminPassword}</span>
              )}
              <div className={styles.adminHelp}>
                Se requiere contraseña de administrador para asignar este rol
                privilegiado
              </div>
            </div>
          )}

          {/* ✅ Sección de cambio de contraseña para edición */}
          {user && (
            <div className={styles.passwordChangeSection}>
              <div className={styles.passwordChangeHeader}>
                <button
                  type="button"
                  className={styles.passwordChangeToggle}
                  onClick={togglePasswordChange}
                >
                  <FiKey className={styles.toggleIcon} />
                  {changingPassword ? "Ocultar" : "Cambiar Contraseña"}
                </button>
              </div>

              {changingPassword && (
                <div className={styles.passwordChangeFields}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      <FiLock className={styles.labelIcon} />
                      Contraseña Actual *
                    </label>
                    <div className={styles.passwordInput}>
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        className={`${styles.input} ${
                          errors.currentPassword ? styles.error : ""
                        }`}
                        placeholder="Ingresa tu contraseña actual"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                      >
                        {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {errors.currentPassword && (
                      <span className={styles.errorText}>
                        {errors.currentPassword}
                      </span>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      <FiLock className={styles.labelIcon} />
                      Nueva Contraseña *
                    </label>
                    <div className={styles.passwordInput}>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        className={`${styles.input} ${
                          errors.newPassword ? styles.error : ""
                        }`}
                        placeholder="••••••"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <span className={styles.errorText}>
                        {errors.newPassword}
                      </span>
                    )}
                    <div className={styles.passwordRequirements}>
                      <div
                        className={`${styles.requirement} ${
                          formData.newPassword.length >= 6
                            ? styles.met
                            : styles.unmet
                        }`}
                      >
                        <span className={styles.requirementIcon}>
                          {formData.newPassword.length >= 6 ? "✓" : "○"}
                        </span>
                        Mínimo 6 caracteres
                      </div>
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      <FiLock className={styles.labelIcon} />
                      Confirmar Nueva Contraseña *
                    </label>
                    <div className={styles.passwordInput}>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`${styles.input} ${
                          errors.confirmPassword ? styles.error : ""
                        }`}
                        placeholder="••••••"
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <span className={styles.errorText}>
                        {errors.confirmPassword}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ✅ Campos de contraseña para creación de usuario */}
          {!user && (
            <div className={styles.passwordCreateSection}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FiLock className={styles.labelIcon} />
                  Contraseña *
                </label>
                <div className={styles.passwordInput}>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className={`${styles.input} ${
                      errors.newPassword ? styles.error : ""
                    }`}
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.newPassword && (
                  <span className={styles.errorText}>{errors.newPassword}</span>
                )}
                <div className={styles.passwordRequirements}>
                  <div
                    className={`${styles.requirement} ${
                      formData.newPassword.length >= 6
                        ? styles.met
                        : styles.unmet
                    }`}
                  >
                    <span className={styles.requirementIcon}>
                      {formData.newPassword.length >= 6 ? "✓" : "○"}
                    </span>
                    Mínimo 6 caracteres
                  </div>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FiLock className={styles.labelIcon} />
                  Confirmar Contraseña *
                </label>
                <div className={styles.passwordInput}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`${styles.input} ${
                      errors.confirmPassword ? styles.error : ""
                    }`}
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className={styles.errorText}>
                    {errors.confirmPassword}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            loading={loading}
          >
            <FiSave className={styles.saveIcon} />
            {user ? "Actualizar" : "Crear"} Usuario
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;
