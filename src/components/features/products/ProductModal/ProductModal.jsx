import { useState, useEffect } from "react";
import {
  FiX,
  FiSave,
  FiPackage,
  FiDollarSign,
  FiTrendingUp,
  FiTag,
  FiUpload,
  FiImage,
  FiShield,
  FiEye,
  FiAlertCircle,
  FiLock,
  FiWifi,
  FiWifiOff,
} from "react-icons/fi";
import styles from "./ProductModal.module.css";
import ProductsOfflineController from "../../../../controllers/offline/ProductsOfflineController/ProductsOfflineController";
import PriceSyncController from "../../../../controllers/offline/PriceSyncController/PriceSyncController";
import Swal from "sweetalert2";

const ProductModal = ({
  isOpen,
  onClose,
  onSave,
  product,
  categories = [],
  canManageProducts = true,
}) => {
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    precio_compra: "",
    categoria_id: "",
    stock: "0",
    stock_minimo: "5",
    activo: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // ✅ DETECTAR SI ESTAMOS OFFLINE
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        console.log("📝 Editando producto:", product);
        setFormData({
          nombre: product.nombre || "",
          descripcion: product.descripcion || "",
          precio: product.precio?.toString() || "",
          precio_compra: product.precio_compra?.toString() || "",
          categoria_id: product.categoria_id || "",
          stock: product.stock?.toString() || "0",
          stock_minimo: "5",
          activo: product.activo !== undefined ? product.activo : true,
        });
        setImagePreview(product.imagen_url || "");
      } else {
        console.log("🆕 Creando nuevo producto");
        setFormData({
          nombre: "",
          descripcion: "",
          precio: "",
          precio_compra: "",
          categoria_id: "",
          stock: "0",
          stock_minimo: "5",
          activo: true,
        });
        setImagePreview("");
      }
      setImageFile(null);
      setErrors({});
      setLoading(false);
    }
  }, [isOpen, product]);

  // ✅ FUNCIÓN PARA DETERMINAR SI UN CAMPO ESTÁ BLOQUEADO EN OFFLINE
  const isFieldBlockedOffline = (fieldName) => {
    if (!isOffline) return false;

    // ✅ EN OFFLINE: Solo permitir editar precio_compra y precio
    const allowedOfflineFields = ["precio_compra", "precio"];
    return !allowedOfflineFields.includes(fieldName);
  };

  const validateForm = () => {
    const newErrors = {};
    const missingFields = [];

    if (!formData.nombre.trim() && !isOffline) {
      newErrors.nombre = "El nombre del producto es requerido";
      missingFields.push("Nombre");
    }

    if (!formData.descripcion.trim() && !isOffline) {
      newErrors.descripcion = "La descripción del producto es requerida";
      missingFields.push("Descripción");
    }

    if (!formData.precio || parseFloat(formData.precio) <= 0) {
      newErrors.precio = "El precio debe ser un número mayor a 0";
      missingFields.push("Precio de venta");
    }

    if (!formData.precio_compra || parseFloat(formData.precio_compra) <= 0) {
      newErrors.precio_compra = "El precio de compra debe ser mayor a 0";
      missingFields.push("Precio de compra");
    }

    if (!formData.categoria_id && !isOffline) {
      newErrors.categoria_id = "Debes seleccionar una categoría";
      missingFields.push("Categoría");
    }

    // ✅ IMAGEN: Solo requerida para productos nuevos y cuando estamos online
    if (!product && !imageFile && !imagePreview && !isOffline) {
      newErrors.imagen = "La imagen del producto es requerida";
      missingFields.push("Imagen");
    }

    // ✅ STOCK: Solo validar en creación y cuando estamos online
    if (!product && !isOffline) {
      const stock = parseInt(formData.stock);
      if (formData.stock === "" || isNaN(stock) || stock < 0) {
        newErrors.stock = "El stock no puede ser negativo";
        missingFields.push("Stock");
      }
    }

    setErrors(newErrors);

    return {
      isValid: Object.keys(newErrors).length === 0,
      missingFields: missingFields,
    };
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // ✅ BLOQUEAR CAMBIO EN STOCK_MÍNIMO - SIEMPRE MANTENER EN 5
    if (name === "stock_minimo") {
      return;
    }

    // ✅ BLOQUEAR CAMBIO EN STOCK EN MODO EDICIÓN
    if (product && name === "stock") {
      return;
    }

    // ✅ BLOQUEAR CAMBIOS EN CAMPOS NO PERMITIDOS EN OFFLINE
    if (isFieldBlockedOffline(name)) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageUpload = (e) => {
    if (!canManageProducts || isOffline) return;

    const file = e.target.files[0];
    if (file) {
      console.log("🖼️ Archivo seleccionado:", file.name, file.size, file.type);

      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          imagen: "Por favor selecciona un archivo de imagen válido",
        }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          imagen: "La imagen debe ser menor a 5MB",
        }));
        return;
      }

      // ✅ LIMPIAR ERRORES Y ESTABLECER ARCHIVO
      setImageFile(file);
      setErrors((prev) => ({ ...prev, imagen: "" }));

      // ✅ CREAR PREVIEW
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log("✅ Preview de imagen creado");
        setImagePreview(reader.result);
      };
      reader.onerror = () => {
        console.error("❌ Error leyendo archivo");
        setErrors((prev) => ({
          ...prev,
          imagen: "Error al procesar la imagen",
        }));
      };
      reader.readAsDataURL(file);

      console.log("🖼️ Imagen establecida correctamente");
    } else {
      console.log("❌ No se seleccionó archivo");
    }
  };
  const removeImage = () => {
    if (!canManageProducts || isOffline) return;

    console.log("🗑️ Eliminando imagen...");

    setImageFile(null);
    setImagePreview("");

    // ✅ SOLO MARCAR ERROR SI ES PRODUCTO NUEVO
    if (!product) {
      setErrors((prev) => ({
        ...prev,
        imagen: "La imagen del producto es requerida",
      }));
    } else {
      // ✅ PARA EDICIÓN, LIMPIAR ERRORES
      setErrors((prev) => ({ ...prev, imagen: "" }));
    }

    // ✅ LIMPIAR INPUT FILE
    const fileInput = document.getElementById("imagen_upload");
    if (fileInput) fileInput.value = "";

    console.log("✅ Imagen eliminada");
  };
  // ✅ HANDLE SUBMIT MEJORADO PARA MANEJAR OFFLINE
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canManageProducts) {
      Swal.fire({
        icon: "error",
        title: "Sin permisos",
        text: "No tienes permisos para realizar esta acción",
        confirmButtonText: "Entendido",
      });
      return;
    }

    // ✅ VALIDACIÓN ESPECIAL PARA OFFLINE
    if (isOffline && !product) {
      Swal.fire({
        icon: "error",
        title: "Modo Offline",
        text: "No se pueden crear productos nuevos en modo offline. Solo se permite editar precios de productos existentes.",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const validation = validateForm();

    if (!validation.isValid) {
      const missingFieldsText = validation.missingFields.join(", ");

      Swal.fire({
        icon: "error",
        title: "Campos incompletos",
        html: `
          <div style="text-align: left;">
            <p><strong>Faltan los siguientes campos requeridos:</strong></p>
            <ul style="margin-left: 20px;">
              ${validation.missingFields
                .map((field) => `<li>• ${field}</li>`)
                .join("")}
            </ul>
            <p style="margin-top: 10px; color: #666;">Por favor completa toda la información requerida.</p>
          </div>
        `,
        confirmButtonText: "Entendido",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("📤 Enviando datos del formulario:", formData);

      let submitData;

      if (isOffline && product) {
        // ✅ MODO OFFLINE: Solo enviar precios
        submitData = {
          precio_compra: parseFloat(formData.precio_compra),
          precio: parseFloat(formData.precio),
        };

        console.log("📱 Modo OFFLINE - Enviando solo precios:", submitData);
      } else {
        // ✅ MODO ONLINE: Enviar todos los datos
        submitData = {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio: parseFloat(formData.precio),
          precio_compra: parseFloat(formData.precio_compra),
          categoria_id: formData.categoria_id,
          stock: parseInt(formData.stock),
          stock_minimo: 5,
          activo: formData.activo,
        };

        console.log("🌐 Modo ONLINE - Enviando todos los datos:", submitData);
      }

      const productId = product ? product.id : null;
      const result = await onSave(submitData, productId, imageFile);

      if (result?.success) {
        console.log("✅ Producto guardado exitosamente");

        // ✅ REGISTRAR CAMBIO DE PRECIO SI ES OFFLINE
        if (isOffline && product) {
          await PriceSyncController.registerPriceChange(product.id, {
            precio_compra_anterior: product.precio_compra,
            precio_compra_nuevo: parseFloat(formData.precio_compra),
            precio_venta_anterior: product.precio,
            precio_venta_nuevo: parseFloat(formData.precio),
            motivo: "Actualización offline",
            usuario: "Sistema",
          });
        }

        handleClose();
      } else {
        console.log("❌ Error al guardar producto:", result?.error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: result?.error || "Error al guardar el producto",
          confirmButtonText: "Entendido",
        });
      }
    } catch (error) {
      console.error("❌ Error en handleSubmit:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error inesperado: " + error.message,
        confirmButtonText: "Entendido",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      precio_compra: "",
      categoria_id: "",
      stock: "0",
      stock_minimo: "5",
      activo: true,
    });
    setImageFile(null);
    setImagePreview("");
    setErrors({});
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>
            {product ? (
              <>
                <FiPackage className={styles.headerIcon} />
                {canManageProducts ? "Editar Producto" : "Ver Producto"}
                {isOffline && (
                  <FiWifiOff
                    className={styles.offlineIcon}
                    title="Modo Offline"
                  />
                )}
              </>
            ) : (
              <>
                <FiPackage className={styles.headerIcon} />
                {canManageProducts ? "Nuevo Producto" : "Ver Producto"}
              </>
            )}
          </h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <FiX />
          </button>
        </div>

        {!canManageProducts && (
          <div className={styles.permissionWarning}>
            <FiShield className={styles.warningIcon} />
            <span>
              Modo de solo visualización. Los cambios requieren autorización de
              administrador.
            </span>
          </div>
        )}

        {isOffline && (
          <div className={styles.offlineWarning}>
            <FiWifiOff className={styles.offlineIcon} />
            <div className={styles.offlineText}>
              <strong>Modo Offline</strong>
              <span>
                Los cambios se guardarán localmente y se sincronizarán cuando
                recuperes la conexión.
              </span>
              {product && (
                <small>
                  Solo los campos de precio están disponibles para edición.
                </small>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            {/* Información Básica */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>
                <FiTag className={styles.sectionIcon} />
                Información Básica
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Nombre {!isOffline && "*"}
                  {errors.nombre && (
                    <FiAlertCircle className={styles.errorIcon} />
                  )}
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={`${styles.input} ${
                    errors.nombre ? styles.error : ""
                  } ${
                    !canManageProducts || isFieldBlockedOffline("nombre")
                      ? styles.disabled
                      : ""
                  }`}
                  placeholder="Nombre del producto"
                  readOnly={
                    !canManageProducts || isFieldBlockedOffline("nombre")
                  }
                  title={
                    isFieldBlockedOffline("nombre")
                      ? "Campo bloqueado en modo offline"
                      : ""
                  }
                />
                {errors.nombre && (
                  <span className={styles.errorText}>{errors.nombre}</span>
                )}
                {isFieldBlockedOffline("nombre") && (
                  <small className={styles.offlineFieldNote}>
                    <FiLock /> Solo disponible online
                  </small>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Descripción {!isOffline && "*"}
                  {errors.descripcion && (
                    <FiAlertCircle className={styles.errorIcon} />
                  )}
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  rows="3"
                  className={`${styles.textarea} ${
                    errors.descripcion ? styles.error : ""
                  } ${
                    !canManageProducts || isFieldBlockedOffline("descripcion")
                      ? styles.disabled
                      : ""
                  }`}
                  placeholder="Descripción del producto"
                  readOnly={
                    !canManageProducts || isFieldBlockedOffline("descripcion")
                  }
                  title={
                    isFieldBlockedOffline("descripcion")
                      ? "Campo bloqueado en modo offline"
                      : ""
                  }
                />
                {errors.descripcion && (
                  <span className={styles.errorText}>{errors.descripcion}</span>
                )}
                {isFieldBlockedOffline("descripcion") && (
                  <small className={styles.offlineFieldNote}>
                    <FiLock /> Solo disponible online
                  </small>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Categoría {!isOffline && "*"}
                  {errors.categoria_id && (
                    <FiAlertCircle className={styles.errorIcon} />
                  )}
                </label>
                <select
                  name="categoria_id"
                  value={formData.categoria_id}
                  onChange={handleInputChange}
                  className={`${styles.select} ${
                    errors.categoria_id ? styles.error : ""
                  } ${
                    !canManageProducts || isFieldBlockedOffline("categoria_id")
                      ? styles.disabled
                      : ""
                  }`}
                  disabled={
                    !canManageProducts || isFieldBlockedOffline("categoria_id")
                  }
                  title={
                    isFieldBlockedOffline("categoria_id")
                      ? "Campo bloqueado en modo offline"
                      : ""
                  }
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nombre}
                    </option>
                  ))}
                </select>
                {errors.categoria_id && (
                  <span className={styles.errorText}>
                    {errors.categoria_id}
                  </span>
                )}
                {isFieldBlockedOffline("categoria_id") && (
                  <small className={styles.offlineFieldNote}>
                    <FiLock /> Solo disponible online
                  </small>
                )}
              </div>
            </div>

            {/* Precios - SIEMPRE DISPONIBLES */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>
                <FiDollarSign className={styles.sectionIcon} />
                Precios
                {isOffline && (
                  <span className={styles.offlineBadge}>
                    Disponible Offline
                  </span>
                )}
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Precio de Compra *
                  {errors.precio_compra && (
                    <FiAlertCircle className={styles.errorIcon} />
                  )}
                </label>
                <div className={styles.inputWithIcon}>
                  <span className={styles.currency}>$</span>
                  <input
                    type="number"
                    name="precio_compra"
                    value={formData.precio_compra}
                    onChange={handleInputChange}
                    className={`${styles.input} ${
                      errors.precio_compra ? styles.error : ""
                    } ${!canManageProducts ? styles.disabled : ""}`}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    readOnly={!canManageProducts}
                  />
                </div>
                {errors.precio_compra && (
                  <span className={styles.errorText}>
                    {errors.precio_compra}
                  </span>
                )}
                {isOffline && (
                  <small className={styles.offlineFieldNoteAvailable}>
                    <FiWifiOff /> Disponible offline
                  </small>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Precio de Venta *
                  {errors.precio && (
                    <FiAlertCircle className={styles.errorIcon} />
                  )}
                </label>
                <div className={styles.inputWithIcon}>
                  <span className={styles.currency}>$</span>
                  <input
                    type="number"
                    name="precio"
                    value={formData.precio}
                    onChange={handleInputChange}
                    className={`${styles.input} ${
                      errors.precio ? styles.error : ""
                    } ${!canManageProducts ? styles.disabled : ""}`}
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    readOnly={!canManageProducts}
                  />
                </div>
                {errors.precio && (
                  <span className={styles.errorText}>{errors.precio}</span>
                )}
                {isOffline && (
                  <small className={styles.offlineFieldNoteAvailable}>
                    <FiWifiOff /> Disponible offline
                  </small>
                )}
              </div>
            </div>

            {/* Inventario - BLOQUEADO EN OFFLINE */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>
                <FiTrendingUp className={styles.sectionIcon} />
                Inventario
                {isOffline && (
                  <span className={styles.offlineBadge}>Bloqueado Offline</span>
                )}
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Stock {!product && !isOffline && "*"}
                  {errors.stock && (
                    <FiAlertCircle className={styles.errorIcon} />
                  )}
                </label>
                <div className={styles.inputWithLock}>
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className={`${styles.input} ${
                      errors.stock ? styles.error : ""
                    } ${
                      !canManageProducts ||
                      product ||
                      isFieldBlockedOffline("stock")
                        ? styles.disabled
                        : ""
                    }`}
                    min="0"
                    placeholder="0"
                    readOnly={
                      !canManageProducts ||
                      !!product ||
                      isFieldBlockedOffline("stock")
                    }
                    title={
                      isFieldBlockedOffline("stock")
                        ? "Campo bloqueado en modo offline"
                        : product
                        ? "Stock actual del producto - Use el módulo de inventario para modificarlo"
                        : "Stock inicial del producto"
                    }
                  />
                  {(product || isFieldBlockedOffline("stock")) && (
                    <FiLock
                      className={styles.lockIcon}
                      title={
                        isFieldBlockedOffline("stock")
                          ? "Campo bloqueado en modo offline"
                          : "Stock bloqueado en edición"
                      }
                    />
                  )}
                </div>
                {errors.stock && (
                  <span className={styles.errorText}>{errors.stock}</span>
                )}
                {isFieldBlockedOffline("stock") ? (
                  <small className={styles.helpText}>
                    <FiLock className={styles.helpIcon} />
                    Stock no editable en modo offline
                  </small>
                ) : product ? (
                  <small className={styles.helpText}>
                    <FiLock className={styles.helpIcon} />
                    Stock actual del producto. Use el módulo de inventario para
                    realizar ajustes.
                  </small>
                ) : (
                  <small className={styles.helpText}>
                    Stock inicial del producto
                  </small>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Stock Mínimo *</label>
                <div className={styles.inputWithLock}>
                  <input
                    type="number"
                    name="stock_minimo"
                    value={formData.stock_minimo}
                    onChange={handleInputChange}
                    className={`${styles.input} ${
                      errors.stock_minimo ? styles.error : ""
                    } ${styles.disabled}`}
                    min="5"
                    placeholder="5"
                    readOnly={true}
                    title="Stock mínimo fijo en 5 unidades"
                  />
                  <FiLock
                    className={styles.lockIcon}
                    title="Valor fijo - No editable"
                  />
                </div>
                <small className={styles.helpText}>
                  <FiLock className={styles.helpIcon} />
                  Valor fijo: Se notificará cuando el stock baje de 5 unidades
                </small>
                {errors.stock_minimo && (
                  <span className={styles.errorText}>
                    {errors.stock_minimo}
                  </span>
                )}
              </div>
            </div>

            {/* Imagen y Estado - BLOQUEADO EN OFFLINE */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>
                <FiImage className={styles.sectionIcon} />
                Imagen y Estado
                {isOffline && (
                  <span className={styles.offlineBadge}>Bloqueado Offline</span>
                )}
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Imagen del Producto {!product && !isOffline && "*"}
                  {errors.imagen && (
                    <FiAlertCircle className={styles.errorIcon} />
                  )}
                </label>
                <input
                  type="file"
                  id="imagen_upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className={`${styles.fileInput} ${
                    errors.imagen ? styles.error : ""
                  } ${
                    !canManageProducts || isFieldBlockedOffline("imagen")
                      ? styles.disabled
                      : ""
                  }`}
                  disabled={
                    !canManageProducts || isFieldBlockedOffline("imagen")
                  }
                  title={
                    isFieldBlockedOffline("imagen")
                      ? "Campo bloqueado en modo offline"
                      : ""
                  }
                />
                <small className={styles.helpText}>
                  Formatos: JPG, PNG, GIF. Máximo 5MB.
                  {!product &&
                    !isOffline &&
                    " La imagen es requerida para productos nuevos."}
                  {isOffline && " No disponible en modo offline."}
                </small>

                {errors.imagen && (
                  <span className={styles.errorText}>{errors.imagen}</span>
                )}

                {imagePreview && (
                  <div className={styles.imagePreviewContainer}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className={styles.imagePreview}
                    />
                    {canManageProducts && !isOffline && (
                      <button
                        type="button"
                        className={styles.removeImageButton}
                        onClick={removeImage}
                      >
                        <FiX /> Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleInputChange}
                    className={`${styles.checkbox} ${
                      !canManageProducts || isFieldBlockedOffline("activo")
                        ? styles.disabled
                        : ""
                    }`}
                    disabled={
                      !canManageProducts || isFieldBlockedOffline("activo")
                    }
                    title={
                      isFieldBlockedOffline("activo")
                        ? "Campo bloqueado en modo offline"
                        : ""
                    }
                  />
                  <span
                    className={`${styles.checkboxText} ${
                      !canManageProducts || isFieldBlockedOffline("activo")
                        ? styles.disabled
                        : ""
                    }`}
                  >
                    Producto activo
                  </span>
                </label>
                <p className={styles.helpText}>
                  Los productos inactivos no estarán disponibles para la venta
                  {isOffline && " - No editable en modo offline"}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClose}
              disabled={loading}
            >
              {canManageProducts ? "Cancelar" : "Cerrar"}
            </button>
            <button
              type="submit"
              className={`${styles.saveButton} ${
                !canManageProducts ? styles.viewOnly : ""
              } ${isOffline ? styles.offlineSave : ""}`}
              disabled={loading || !canManageProducts}
              title={
                !canManageProducts
                  ? "Requiere autorización de administrador"
                  : isOffline && !product
                  ? "No se pueden crear productos en modo offline"
                  : product
                  ? isOffline
                    ? "Actualizar solo precios (offline)"
                    : "Actualizar producto"
                  : "Crear producto"
              }
            >
              {loading ? (
                <>
                  <div className={styles.spinner}></div>
                  Guardando...
                </>
              ) : !canManageProducts ? (
                <>
                  <FiShield className={styles.shieldIcon} />
                  Requiere Autorización
                </>
              ) : isOffline && product ? (
                <>
                  <FiWifiOff className={styles.offlineIcon} />
                  Guardar Precios (Offline)
                </>
              ) : isOffline && !product ? (
                <>
                  <FiWifiOff className={styles.offlineIcon} />
                  No disponible offline
                </>
              ) : (
                <>
                  <FiSave className={styles.saveIcon} />
                  {product ? "Actualizar" : "Crear"} Producto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
