// components/features/categories/CategoryModal/CategoryModal.jsx
import { useState, useEffect } from "react";
import { FiX, FiSave, FiTag, FiFileText } from "react-icons/fi";
import Button from "../../ui/Button/Button";
import styles from "./CategoryModal.module.css";

const CategoryModal = ({ isOpen, onClose, onSave, category }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    activo: true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        nombre: category.nombre || "",
        descripcion: category.descripcion || "",
        activo: category.activo !== undefined ? category.activo : true,
      });
    } else {
      setFormData({
        nombre: "",
        descripcion: "",
        activo: true,
      });
    }
    setErrors({});
  }, [category, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre de la categoría es requerido";
    } else if (formData.nombre.trim().length < 2) {
      newErrors.nombre = "El nombre debe tener al menos 2 caracteres";
    }

    if (formData.descripcion && formData.descripcion.length > 500) {
      newErrors.descripcion = "La descripción no puede exceder 500 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>
            <FiTag className={styles.modalIcon} />
            {category ? "Editar Categoría" : "Nueva Categoría"}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="nombre" className={styles.label}>
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className={`${styles.input} ${errors.nombre ? styles.error : ""}`}
              placeholder="Ej: Electrónicos, Ropa, Hogar..."
            />
            {errors.nombre && (
              <span className={styles.errorText}>{errors.nombre}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="descripcion" className={styles.label}>
              <FiFileText className={styles.labelIcon} />
              Descripción (Opcional)
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              className={`${styles.textarea} ${
                errors.descripcion ? styles.error : ""
              }`}
              placeholder="Describe brevemente esta categoría..."
              rows="3"
            />
            {errors.descripcion && (
              <span className={styles.errorText}>{errors.descripcion}</span>
            )}
            <div className={styles.charCount}>
              {formData.descripcion.length}/500 caracteres
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="activo"
                checked={formData.activo}
                onChange={handleChange}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>Categoría activa</span>
            </label>
            <p className={styles.helpText}>
              Las categorías inactivas no estarán disponibles para nuevos
              productos
            </p>
          </div>

          <div className={styles.modalActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              <FiSave className={styles.buttonIcon} />
              {isSubmitting
                ? "Guardando..."
                : category
                ? "Actualizar Categoría"
                : "Crear Categoría"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
