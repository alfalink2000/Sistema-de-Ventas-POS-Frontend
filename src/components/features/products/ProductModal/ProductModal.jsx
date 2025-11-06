// // components/features/products/ProductModal/ProductModal.jsx - ACTUALIZADO CON PERMISOS
// import { useState, useEffect } from "react";
// import {
//   FiX,
//   FiSave,
//   FiPackage,
//   FiDollarSign,
//   FiTrendingUp,
//   FiTag,
//   FiUpload,
//   FiImage,
//   FiShield,
//   FiEye,
// } from "react-icons/fi";
// import styles from "./ProductModal.module.css";
// import ProductsOfflineController from "../../../../controllers/offline/ProductsOfflineController/ProductsOfflineController";

// const ProductModal = ({
//   isOpen,
//   onClose,
//   onSave,
//   product,
//   categories = [],
//   canManageProducts = true, // ✅ NUEVO: permisos
// }) => {
//   const [formData, setFormData] = useState({
//     nombre: "",
//     descripcion: "",
//     precio: "",
//     precio_compra: "",
//     categoria_id: "",
//     stock: "0",
//     stock_minimo: "5",
//     activo: true,
//   });
//   const [imageFile, setImageFile] = useState(null);
//   const [imagePreview, setImagePreview] = useState("");
//   const [errors, setErrors] = useState({});
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (isOpen) {
//       if (product) {
//         console.log("📝 Editando producto:", product);
//         setFormData({
//           nombre: product.nombre || "",
//           descripcion: product.descripcion || "",
//           precio: product.precio?.toString() || "",
//           precio_compra: product.precio_compra?.toString() || "",
//           categoria_id: product.categoria_id || "",
//           stock: product.stock?.toString() || "0",
//           stock_minimo: product.stock_minimo?.toString() || "5",
//           activo: product.activo !== undefined ? product.activo : true,
//         });
//         setImagePreview(product.imagen_url || "");
//       } else {
//         console.log("🆕 Creando nuevo producto");
//         setFormData({
//           nombre: "",
//           descripcion: "",
//           precio: "",
//           precio_compra: "",
//           categoria_id: "",
//           stock: "0",
//           stock_minimo: "5",
//           activo: true,
//         });
//         setImagePreview("");
//       }
//       setImageFile(null);
//       setErrors({});
//       setLoading(false);
//     }
//   }, [isOpen, product]);

//   // ✅ Validación igual a tu ejemplo
//   const validateForm = () => {
//     const newErrors = {};

//     if (!formData.nombre.trim()) {
//       newErrors.nombre = "El nombre del producto es requerido";
//     }

//     if (!formData.descripcion.trim()) {
//       newErrors.descripcion = "La descripción del producto es requerida";
//     }

//     if (!formData.precio || parseFloat(formData.precio) <= 0) {
//       newErrors.precio = "El precio debe ser un número mayor a 0";
//     }

//     if (!formData.precio_compra || parseFloat(formData.precio_compra) <= 0) {
//       newErrors.precio_compra = "El precio de compra debe ser mayor a 0";
//     }

//     if (!formData.categoria_id) {
//       newErrors.categoria_id = "Debes seleccionar una categoría";
//     }

//     // ✅ IMAGEN: Solo requerida para productos nuevos (igual a tu ejemplo)
//     if (!product && !imageFile && !imagePreview) {
//       newErrors.imagen = "La imagen del producto es requerida";
//     }

//     const stock = parseInt(formData.stock);
//     if (formData.stock === "" || isNaN(stock) || stock < 0) {
//       newErrors.stock = "El stock no puede ser negativo";
//     }

//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: type === "checkbox" ? checked : value,
//     }));

//     if (errors[name]) {
//       setErrors((prev) => ({ ...prev, [name]: "" }));
//     }
//   };

//   const handleImageUpload = (e) => {
//     if (!canManageProducts) return; // ✅ Bloquear si no tiene permisos

//     const file = e.target.files[0];
//     if (file) {
//       if (!file.type.startsWith("image/")) {
//         setErrors((prev) => ({
//           ...prev,
//           imagen: "Por favor selecciona un archivo de imagen válido",
//         }));
//         return;
//       }

//       if (file.size > 5 * 1024 * 1024) {
//         setErrors((prev) => ({
//           ...prev,
//           imagen: "La imagen debe ser menor a 5MB",
//         }));
//         return;
//       }

//       setImageFile(file);
//       setErrors((prev) => ({ ...prev, imagen: "" }));

//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setImagePreview(reader.result);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const removeImage = () => {
//     if (!canManageProducts) return; // ✅ Bloquear si no tiene permisos

//     setImageFile(null);
//     setImagePreview("");
//     if (!product) {
//       setErrors((prev) => ({
//         ...prev,
//         imagen: "La imagen del producto es requerida",
//       }));
//     }
//     const fileInput = document.getElementById("imagen_upload");
//     if (fileInput) fileInput.value = "";
//   };

//   // ✅ HandleSubmit igual a tu ejemplo
//   // const handleSubmit = async (e) => {
//   //   e.preventDefault();

//   //   if (!canManageProducts) {
//   //     alert("No tienes permisos para realizar esta acción");
//   //     return;
//   //   }

//   //   if (!validateForm()) {
//   //     alert("Por favor completa todos los campos requeridos correctamente");
//   //     return;
//   //   }

//   //   setLoading(true);

//   //   try {
//   //     console.log("📤 Enviando datos del formulario:", formData);

//   //     const submitFormData = new FormData();

//   //     Object.keys(formData).forEach((key) => {
//   //       submitFormData.append(key, formData[key]);
//   //     });

//   //     if (imageFile) {
//   //       submitFormData.append("imagen", imageFile);
//   //     }

//   //     if (product) {
//   //       submitFormData.append("id", product.id);
//   //     }

//   //     console.log("🚀 Enviando FormData al onSave");
//   //     const result = await onSave(submitFormData);

//   //     if (result?.success) {
//   //       console.log("✅ Producto guardado exitosamente");
//   //       handleClose();
//   //     } else {
//   //       console.log("❌ Error al guardar producto:", result?.error);
//   //     }
//   //   } catch (error) {
//   //     console.error("❌ Error en handleSubmit:", error);
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };
//   // En ProductModal.jsx - CORREGIR handleSubmit
//   // En ProductModal.jsx - CORREGIR handleSubmit

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!canManageProducts) {
//       alert("No tienes permisos para realizar esta acción");
//       return;
//     }

//     if (!validateForm()) {
//       alert("Por favor completa todos los campos requeridos correctamente");
//       return;
//     }

//     setLoading(true);

//     try {
//       console.log("📤 Enviando datos del formulario:", formData);
//       console.log("🎯 Producto actual:", product);

//       // ✅ SIEMPRE USAR JSON - NUNCA FormData
//       const submitData = {
//         nombre: formData.nombre,
//         descripcion: formData.descripcion,
//         precio: parseFloat(formData.precio),
//         precio_compra: parseFloat(formData.precio_compra),
//         categoria_id: formData.categoria_id,
//         stock: parseInt(formData.stock),
//         stock_minimo: parseInt(formData.stock_minimo),
//         activo: formData.activo,
//         // ✅ NO incluir imagen aquí - se maneja por separado si es necesario
//       };

//       console.log("🚀 Enviando JSON al onSave:", submitData);

//       // ✅ CRÍTICO: Pasar SOLO el ID del producto
//       const productId = product ? product.id : null;
//       console.log("🎯 ID del producto a actualizar:", productId);

//       // ✅ Pasar también la imagen por separado si existe
//       const result = await onSave(submitData, productId, imageFile);

//       if (result?.success) {
//         console.log("✅ Producto guardado exitosamente");
//         handleClose();
//       } else {
//         console.log("❌ Error al guardar producto:", result?.error);
//       }
//     } catch (error) {
//       console.error("❌ Error en handleSubmit:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleClose = () => {
//     setFormData({
//       nombre: "",
//       descripcion: "",
//       precio: "",
//       precio_compra: "",
//       categoria_id: "",
//       stock: "0",
//       stock_minimo: "5",
//       activo: true,
//     });
//     setImageFile(null);
//     setImagePreview("");
//     setErrors({});
//     setLoading(false);
//     onClose();
//   };

//   if (!isOpen) return null;

//   return (
//     <div className={styles.modalOverlay}>
//       <div className={styles.modal}>
//         <div className={styles.modalHeader}>
//           <h2>
//             {product ? (
//               <>
//                 <FiPackage className={styles.headerIcon} />
//                 {canManageProducts ? "Editar Producto" : "Ver Producto"}
//               </>
//             ) : (
//               <>
//                 <FiPackage className={styles.headerIcon} />
//                 {canManageProducts ? "Nuevo Producto" : "Ver Producto"}
//               </>
//             )}
//           </h2>
//           <button className={styles.closeButton} onClick={handleClose}>
//             <FiX />
//           </button>
//         </div>

//         {!canManageProducts && (
//           <div className={styles.permissionWarning}>
//             <FiShield className={styles.warningIcon} />
//             <span>
//               Modo de solo visualización. Los cambios requieren autorización de
//               administrador.
//             </span>
//           </div>
//         )}

//         <form onSubmit={handleSubmit} className={styles.form}>
//           <div className={styles.formGrid}>
//             {/* Información Básica */}
//             <div className={styles.formSection}>
//               <h3 className={styles.sectionTitle}>
//                 <FiTag className={styles.sectionIcon} />
//                 Información Básica
//               </h3>

//               <div className={styles.formGroup}>
//                 <label className={styles.label}>Nombre *</label>
//                 <input
//                   type="text"
//                   name="nombre"
//                   value={formData.nombre}
//                   onChange={handleInputChange}
//                   className={`${styles.input} ${
//                     errors.nombre ? styles.error : ""
//                   } ${!canManageProducts ? styles.disabled : ""}`}
//                   placeholder="Nombre del producto"
//                   readOnly={!canManageProducts}
//                 />
//                 {errors.nombre && (
//                   <span className={styles.errorText}>{errors.nombre}</span>
//                 )}
//               </div>

//               <div className={styles.formGroup}>
//                 <label className={styles.label}>Descripción *</label>
//                 <textarea
//                   name="descripcion"
//                   value={formData.descripcion}
//                   onChange={handleInputChange}
//                   rows="3"
//                   className={`${styles.textarea} ${
//                     errors.descripcion ? styles.error : ""
//                   } ${!canManageProducts ? styles.disabled : ""}`}
//                   placeholder="Descripción del producto"
//                   readOnly={!canManageProducts}
//                 />
//                 {errors.descripcion && (
//                   <span className={styles.errorText}>{errors.descripcion}</span>
//                 )}
//               </div>

//               <div className={styles.formGroup}>
//                 <label className={styles.label}>Categoría *</label>
//                 <select
//                   name="categoria_id"
//                   value={formData.categoria_id}
//                   onChange={handleInputChange}
//                   className={`${styles.select} ${
//                     errors.categoria_id ? styles.error : ""
//                   } ${!canManageProducts ? styles.disabled : ""}`}
//                   disabled={!canManageProducts}
//                 >
//                   <option value="">Seleccionar categoría</option>
//                   {categories.map((category) => (
//                     <option key={category.id} value={category.id}>
//                       {category.nombre}
//                     </option>
//                   ))}
//                 </select>
//                 {errors.categoria_id && (
//                   <span className={styles.errorText}>
//                     {errors.categoria_id}
//                   </span>
//                 )}
//               </div>
//             </div>

//             {/* Precios */}
//             <div className={styles.formSection}>
//               <h3 className={styles.sectionTitle}>
//                 <FiDollarSign className={styles.sectionIcon} />
//                 Precios
//               </h3>

//               <div className={styles.formGroup}>
//                 <label className={styles.label}>Precio de Compra *</label>
//                 <div className={styles.inputWithIcon}>
//                   <span className={styles.currency}>$</span>
//                   <input
//                     type="number"
//                     name="precio_compra"
//                     value={formData.precio_compra}
//                     onChange={handleInputChange}
//                     className={`${styles.input} ${
//                       errors.precio_compra ? styles.error : ""
//                     } ${!canManageProducts ? styles.disabled : ""}`}
//                     min="0.01"
//                     step="0.01"
//                     placeholder="0.00"
//                     readOnly={!canManageProducts}
//                   />
//                 </div>
//                 {errors.precio_compra && (
//                   <span className={styles.errorText}>
//                     {errors.precio_compra}
//                   </span>
//                 )}
//               </div>

//               <div className={styles.formGroup}>
//                 <label className={styles.label}>Precio de Venta *</label>
//                 <div className={styles.inputWithIcon}>
//                   <span className={styles.currency}>$</span>
//                   <input
//                     type="number"
//                     name="precio"
//                     value={formData.precio}
//                     onChange={handleInputChange}
//                     className={`${styles.input} ${
//                       errors.precio ? styles.error : ""
//                     } ${!canManageProducts ? styles.disabled : ""}`}
//                     min="0.01"
//                     step="0.01"
//                     placeholder="0.00"
//                     readOnly={!canManageProducts}
//                   />
//                 </div>
//                 {errors.precio && (
//                   <span className={styles.errorText}>{errors.precio}</span>
//                 )}
//               </div>
//             </div>

//             {/* Inventario */}
//             <div className={styles.formSection}>
//               <h3 className={styles.sectionTitle}>
//                 <FiTrendingUp className={styles.sectionIcon} />
//                 Inventario
//               </h3>

//               <div className={styles.formGroup}>
//                 <label className={styles.label}>Stock *</label>
//                 <input
//                   type="number"
//                   name="stock"
//                   value={formData.stock}
//                   onChange={handleInputChange}
//                   className={`${styles.input} ${
//                     errors.stock ? styles.error : ""
//                   } ${!canManageProducts ? styles.disabled : ""}`}
//                   min="0"
//                   placeholder="0"
//                   readOnly={!canManageProducts}
//                 />
//                 {errors.stock && (
//                   <span className={styles.errorText}>{errors.stock}</span>
//                 )}
//               </div>

//               <div className={styles.formGroup}>
//                 <label className={styles.label}>Stock Mínimo *</label>
//                 <input
//                   type="number"
//                   name="stock_minimo"
//                   value={formData.stock_minimo}
//                   onChange={handleInputChange}
//                   className={`${styles.input} ${
//                     errors.stock_minimo ? styles.error : ""
//                   } ${!canManageProducts ? styles.disabled : ""}`}
//                   min="0"
//                   placeholder="5"
//                   readOnly={!canManageProducts}
//                 />
//                 {errors.stock_minimo && (
//                   <span className={styles.errorText}>
//                     {errors.stock_minimo}
//                   </span>
//                 )}
//               </div>
//             </div>

//             {/* Imagen y Estado */}
//             <div className={styles.formSection}>
//               <h3 className={styles.sectionTitle}>
//                 <FiImage className={styles.sectionIcon} />
//                 Imagen y Estado
//               </h3>

//               <div className={styles.formGroup}>
//                 <label className={styles.label}>
//                   Imagen del Producto {!product && "*"}
//                 </label>
//                 <input
//                   type="file"
//                   id="imagen_upload"
//                   accept="image/*"
//                   onChange={handleImageUpload}
//                   className={`${styles.fileInput} ${
//                     errors.imagen ? styles.error : ""
//                   } ${!canManageProducts ? styles.disabled : ""}`}
//                   disabled={!canManageProducts}
//                 />
//                 <small className={styles.helpText}>
//                   Formatos: JPG, PNG, GIF. Máximo 5MB.
//                   {!product && " La imagen es requerida para productos nuevos."}
//                 </small>

//                 {errors.imagen && (
//                   <span className={styles.errorText}>{errors.imagen}</span>
//                 )}

//                 {imagePreview && (
//                   <div className={styles.imagePreviewContainer}>
//                     <img
//                       src={imagePreview}
//                       alt="Preview"
//                       className={styles.imagePreview}
//                     />
//                     {canManageProducts && (
//                       <button
//                         type="button"
//                         className={styles.removeImageButton}
//                         onClick={removeImage}
//                       >
//                         <FiX /> Eliminar
//                       </button>
//                     )}
//                   </div>
//                 )}
//               </div>

//               <div className={styles.formGroup}>
//                 <label className={styles.checkboxLabel}>
//                   <input
//                     type="checkbox"
//                     name="activo"
//                     checked={formData.activo}
//                     onChange={handleInputChange}
//                     className={`${styles.checkbox} ${
//                       !canManageProducts ? styles.disabled : ""
//                     }`}
//                     disabled={!canManageProducts}
//                   />
//                   <span
//                     className={`${styles.checkboxText} ${
//                       !canManageProducts ? styles.disabled : ""
//                     }`}
//                   >
//                     Producto activo
//                   </span>
//                 </label>
//                 <p className={styles.helpText}>
//                   Los productos inactivos no estarán disponibles para la venta
//                 </p>
//               </div>
//             </div>
//           </div>

//           <div className={styles.modalFooter}>
//             <button
//               type="button"
//               onClick={async () => {
//                 console.log("🐛 DEBUG - FormData actual:", formData);
//                 console.log("🐛 DEBUG - Product actual:", product);

//                 // Probar createProductPending directamente
//                 const testData = {
//                   nombre: formData.nombre,
//                   descripcion: formData.descripcion,
//                   precio: formData.precio,
//                   precio_compra: formData.precio_compra,
//                   categoria_id: formData.categoria_id,
//                   stock: formData.stock,
//                   stock_minimo: formData.stock_minimo,
//                   activo: formData.activo,
//                 };

//                 console.log("🐛 DEBUG - Test data:", testData);

//                 const result =
//                   await ProductsOfflineController.debugCreateProductFlow(
//                     testData
//                   );
//                 console.log("🐛 DEBUG - Resultado:", result);
//               }}
//               className={styles.debugButton}
//             >
//               🐛 Debug Data
//             </button>
//             <button
//               type="button"
//               className={styles.cancelButton}
//               onClick={handleClose}
//               disabled={loading}
//             >
//               {canManageProducts ? "Cancelar" : "Cerrar"}
//             </button>
//             <button
//               type="submit"
//               className={`${styles.saveButton} ${
//                 !canManageProducts ? styles.viewOnly : ""
//               }`}
//               disabled={loading || !canManageProducts}
//               title={
//                 !canManageProducts
//                   ? "Requiere autorización de administrador"
//                   : product
//                   ? "Actualizar producto"
//                   : "Crear producto"
//               }
//             >
//               {loading ? (
//                 <>
//                   <div className={styles.spinner}></div>
//                   Guardando...
//                 </>
//               ) : !canManageProducts ? (
//                 <>
//                   <FiShield className={styles.shieldIcon} />
//                   Requiere Autorización
//                 </>
//               ) : (
//                 <>
//                   <FiSave className={styles.saveIcon} />
//                   {product ? "Actualizar" : "Crear"} Producto
//                 </>
//               )}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default ProductModal;
// components/features/products/ProductModal/ProductModal.jsx - ACTUALIZADO CON VALIDACIONES
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
} from "react-icons/fi";
import styles from "./ProductModal.module.css";
import ProductsOfflineController from "../../../../controllers/offline/ProductsOfflineController/ProductsOfflineController";
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
    stock_minimo: "5", // ✅ VALOR FIJO DE 5
    activo: true,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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
          stock_minimo: "5", // ✅ SIEMPRE 5, incluso en edición
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
          stock_minimo: "5", // ✅ SIEMPRE 5
          activo: true,
        });
        setImagePreview("");
      }
      setImageFile(null);
      setErrors({});
      setLoading(false);
    }
  }, [isOpen, product]);

  // ✅ VALIDACIÓN MEJORADA - Muestra todos los campos faltantes
  const validateForm = () => {
    const newErrors = {};
    const missingFields = [];

    if (!formData.nombre.trim()) {
      newErrors.nombre = "El nombre del producto es requerido";
      missingFields.push("Nombre");
    }

    if (!formData.descripcion.trim()) {
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

    if (!formData.categoria_id) {
      newErrors.categoria_id = "Debes seleccionar una categoría";
      missingFields.push("Categoría");
    }

    // ✅ IMAGEN: Solo requerida para productos nuevos
    if (!product && !imageFile && !imagePreview) {
      newErrors.imagen = "La imagen del producto es requerida";
      missingFields.push("Imagen");
    }

    const stock = parseInt(formData.stock);
    if (formData.stock === "" || isNaN(stock) || stock < 0) {
      newErrors.stock = "El stock no puede ser negativo";
      missingFields.push("Stock");
    }

    setErrors(newErrors);

    // ✅ RETORNAR OBJETO CON ERRORES Y CAMPOS FALTANTES
    return {
      isValid: Object.keys(newErrors).length === 0,
      missingFields: missingFields,
    };
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    // ✅ BLOQUEAR CAMBIO EN STOCK_MÍNIMO - SIEMPRE MANTENER EN 5
    if (name === "stock_minimo") {
      return; // No permitir cambios
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
    if (!canManageProducts) return;

    const file = e.target.files[0];
    if (file) {
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

      setImageFile(file);
      setErrors((prev) => ({ ...prev, imagen: "" }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    if (!canManageProducts) return;

    setImageFile(null);
    setImagePreview("");
    if (!product) {
      setErrors((prev) => ({
        ...prev,
        imagen: "La imagen del producto es requerida",
      }));
    }
    const fileInput = document.getElementById("imagen_upload");
    if (fileInput) fileInput.value = "";
  };

  // ✅ HANDLE SUBMIT CON VALIDACIONES MEJORADAS
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

    // ✅ VALIDAR FORMULARIO Y MOSTRAR SWAL CON CAMPOS FALTANTES
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
        customClass: {
          popup: "custom-swal-popup",
        },
      });
      return;
    }

    setLoading(true);

    try {
      console.log("📤 Enviando datos del formulario:", formData);

      const submitData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        precio: parseFloat(formData.precio),
        precio_compra: parseFloat(formData.precio_compra),
        categoria_id: formData.categoria_id,
        stock: parseInt(formData.stock),
        stock_minimo: 5, // ✅ ENVIAR SIEMPRE 5
        activo: formData.activo,
      };

      console.log("🚀 Enviando JSON al onSave:", submitData);

      const productId = product ? product.id : null;
      const result = await onSave(submitData, productId, imageFile);

      if (result?.success) {
        console.log("✅ Producto guardado exitosamente");
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
      stock_minimo: "5", // ✅ RESETEAR A 5
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
                  Nombre *
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
                  } ${!canManageProducts ? styles.disabled : ""}`}
                  placeholder="Nombre del producto"
                  readOnly={!canManageProducts}
                />
                {errors.nombre && (
                  <span className={styles.errorText}>{errors.nombre}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Descripción *
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
                  } ${!canManageProducts ? styles.disabled : ""}`}
                  placeholder="Descripción del producto"
                  readOnly={!canManageProducts}
                />
                {errors.descripcion && (
                  <span className={styles.errorText}>{errors.descripcion}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Categoría *
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
                  } ${!canManageProducts ? styles.disabled : ""}`}
                  disabled={!canManageProducts}
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
              </div>
            </div>

            {/* Precios */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>
                <FiDollarSign className={styles.sectionIcon} />
                Precios
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
              </div>
            </div>

            {/* Inventario */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>
                <FiTrendingUp className={styles.sectionIcon} />
                Inventario
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Stock *
                  {errors.stock && (
                    <FiAlertCircle className={styles.errorIcon} />
                  )}
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  className={`${styles.input} ${
                    errors.stock ? styles.error : ""
                  } ${!canManageProducts ? styles.disabled : ""}`}
                  min="0"
                  placeholder="0"
                  readOnly={!canManageProducts}
                />
                {errors.stock && (
                  <span className={styles.errorText}>{errors.stock}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Stock Mínimo *</label>
                <input
                  type="number"
                  name="stock_minimo"
                  value={formData.stock_minimo}
                  onChange={handleInputChange}
                  className={`${styles.input} ${
                    errors.stock_minimo ? styles.error : ""
                  } ${styles.disabled}`} // ✅ SIEMPRE DESHABILITADO
                  min="5"
                  placeholder="5"
                  readOnly={true} // ✅ BLOQUEADO - NO SE PUEDE EDITAR
                  title="Stock mínimo fijo en 5 unidades"
                />
                <small className={styles.helpText}>
                  ✅ Valor fijo: Se notificará cuando el stock baje de 5
                  unidades
                </small>
                {errors.stock_minimo && (
                  <span className={styles.errorText}>
                    {errors.stock_minimo}
                  </span>
                )}
              </div>
            </div>

            {/* Imagen y Estado */}
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>
                <FiImage className={styles.sectionIcon} />
                Imagen y Estado
              </h3>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Imagen del Producto {!product && "*"}
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
                  } ${!canManageProducts ? styles.disabled : ""}`}
                  disabled={!canManageProducts}
                />
                <small className={styles.helpText}>
                  Formatos: JPG, PNG, GIF. Máximo 5MB.
                  {!product && " La imagen es requerida para productos nuevos."}
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
                    {canManageProducts && (
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
                      !canManageProducts ? styles.disabled : ""
                    }`}
                    disabled={!canManageProducts}
                  />
                  <span
                    className={`${styles.checkboxText} ${
                      !canManageProducts ? styles.disabled : ""
                    }`}
                  >
                    Producto activo
                  </span>
                </label>
                <p className={styles.helpText}>
                  Los productos inactivos no estarán disponibles para la venta
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
              }`}
              disabled={loading || !canManageProducts}
              title={
                !canManageProducts
                  ? "Requiere autorización de administrador"
                  : product
                  ? "Actualizar producto"
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
