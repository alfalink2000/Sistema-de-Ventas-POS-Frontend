// pages/Products/Products.jsx - VERSIÓN CORREGIDA SIN ERRORES
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProductGrid from "../../components/features/products/ProductGrid/ProductGrid";
import ProductSearch from "../../components/features/products/ProductSearch/ProductSearch";
import ProductModal from "../../components/features/products/ProductModal/ProductModal";
import CategoryModal from "../../components/features/categories/CategoryModal";
import IndexedDBService from "../../services/IndexedDBService";

import {
  loadProducts,
  loadProductsIfNeeded,
  createProduct,
  updateProduct,
  deleteProduct,
  syncProductsFromServer,
  cleanDuplicateProducts, // ✅ IMPORTAR LA FUNCIÓN CORRECTA
  emergencyCleanDuplicates,
} from "../../actions/productsActions";
import {
  loadCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../actions/categoriesActions";
import {
  FiPlus,
  FiFilter,
  FiPackage,
  FiTrendingDown,
  FiTag,
  FiEdit,
  FiTrash2,
  FiLayers,
  FiChevronDown,
  FiChevronUp,
  FiShield,
  FiEye,
  FiRefreshCw,
} from "react-icons/fi";
import Swal from "sweetalert2";
import styles from "./Products.module.css";

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);

  const dispatch = useDispatch();
  const { products, loading, dataLoaded, error } = useSelector(
    (state) => state.products
  );
  const { categories: categoriesFromStore, loading: categoriesLoading } =
    useSelector((state) => state.categories);
  const { user: currentUser } = useSelector((state) => state.auth);

  // Agregar esto en Products.jsx como función de emergencia

  const emergencyCleanDuplicates = async () => {
    try {
      console.log("🚨 EJECUTANDO LIMPIEZA DE EMERGENCIA COMPLETA...");

      // 1. Obtener todos los productos de IndexedDB
      const allProducts = await IndexedDBService.getAll("productos");
      console.log(`📦 Total productos en BD: ${allProducts.length}`);

      // 2. Aplicar limpieza agresiva
      const uniqueProducts = [];
      const seenIds = new Set();
      const seenLocalIds = new Set();

      allProducts.forEach((product) => {
        if (!product) return;

        let isDuplicate = false;

        // Verificar por ID del servidor
        if (product.id && seenIds.has(product.id)) {
          isDuplicate = true;
          console.log(`🗑️ Duplicado por ID: ${product.id} - ${product.nombre}`);
        }

        // Verificar por ID local
        if (product.id_local && seenLocalIds.has(product.id_local)) {
          isDuplicate = true;
          console.log(
            `🗑️ Duplicado por ID local: ${product.id_local} - ${product.nombre}`
          );
        }

        if (!isDuplicate) {
          if (product.id) seenIds.add(product.id);
          if (product.id_local) seenLocalIds.add(product.id_local);
          uniqueProducts.push(product);
        }
      });

      console.log(
        `✅ Productos únicos después de limpieza: ${uniqueProducts.length}`
      );

      // 3. Limpiar y restaurar
      await IndexedDBService.clear("productos");

      for (const product of uniqueProducts) {
        await IndexedDBService.add("productos", product);
      }

      // 4. Recargar en Redux
      dispatch({
        type: types.productsLoad,
        payload: uniqueProducts,
      });

      await Swal.fire({
        icon: "success",
        title: "Limpieza completada",
        text: `Se eliminaron ${
          allProducts.length - uniqueProducts.length
        } productos duplicados`,
        timer: 3000,
      });

      return uniqueProducts;
    } catch (error) {
      console.error("❌ Error en limpieza de emergencia:", error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron limpiar los duplicados",
      });
    }
  };

  // ✅ EFFECT UNIFICADO Y CORREGIDO
  useEffect(() => {
    console.log("🔄 Products: Iniciando carga de datos...");

    // Cargar productos de manera inteligente
    dispatch(loadProductsIfNeeded());

    // Siempre cargar categorías (son livianas)
    dispatch(loadCategories());
  }, [dispatch]);

  // ✅ VERIFICAR SI LOS DATOS SE CARGARON CORRECTAMENTE
  useEffect(() => {
    console.log("📊 Products: Estado actual:", {
      productsCount: products?.length || 0,
      categoriesCount: categories?.length || 0,
      loading,
      dataLoaded,
    });
  }, [products, categories, loading, dataLoaded]);

  useEffect(() => {
    if (categoriesFromStore && categoriesFromStore.length > 0) {
      setCategories(categoriesFromStore);
    }
  }, [categoriesFromStore]);

  // ✅ FUNCIÓN CORREGIDA PARA VERIFICAR DUPLICADOS
  // const checkForDuplicates = async () => {
  //   try {
  //     console.log("🔍 Verificando productos duplicados...");

  //     // ✅ USAR LA FUNCIÓN DEL ACTION CORRECTAMENTE
  //     const duplicates = await dispatch(checkForDuplicateProducts());

  //     if (duplicates && duplicates.length > 0) {
  //       console.warn(
  //         `⚠️ Encontrados ${duplicates.length} productos duplicados`
  //       );
  //       setShowDuplicates(true);
  //     } else {
  //       console.log("✅ No se encontraron productos duplicados");
  //       setShowDuplicates(false);
  //     }
  //   } catch (error) {
  //     console.error("❌ Error verificando duplicados:", error);
  //   }
  // };

  // ✅ FUNCIÓN CORREGIDA PARA LIMPIAR DUPLICADOS
  const handleCleanDuplicates = async () => {
    try {
      setCleaningDuplicates(true);
      console.log("🧹 Iniciando limpieza de duplicados...");

      // ✅ IMPORTAR EL SERVICIO CORRECTAMENTE
      const IndexedDBService = await import(
        "../../services/IndexedDBService"
      ).then((module) => module.default);

      if (!IndexedDBService) {
        throw new Error("No se pudo cargar IndexedDBService");
      }

      const allProducts = await IndexedDBService.getAll("productos");
      const seenIds = new Set();
      const duplicates = [];

      // Identificar duplicados
      allProducts.forEach((product) => {
        if (seenIds.has(product.id)) {
          duplicates.push(product.id);
        } else {
          seenIds.add(product.id);
        }
      });

      if (duplicates.length > 0) {
        console.log(
          `🔄 Eliminando ${duplicates.length} productos duplicados...`
        );

        // Eliminar duplicados
        for (const duplicateId of duplicates) {
          await IndexedDBService.delete("productos", duplicateId);
        }

        // Recargar productos
        await dispatch(loadProducts());

        setShowDuplicates(false);

        await Swal.fire({
          icon: "success",
          title: "Limpieza completada",
          text: `Se eliminaron ${duplicates.length} productos duplicados`,
          timer: 3000,
          showConfirmButton: false,
        });
      } else {
        await Swal.fire({
          icon: "info",
          title: "Sin duplicados",
          text: "No se encontraron productos duplicados para limpiar",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("❌ Error limpiando duplicados:", error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron limpiar los duplicados",
        confirmButtonText: "Entendido",
      });
    } finally {
      setCleaningDuplicates(false);
    }
  };

  // // ✅ VERIFICAR DUPLICADOS CUANDO SE CARGAN LOS PRODUCTOS
  // useEffect(() => {
  //   if (products && products.length > 0) {
  //     const timer = setTimeout(() => {
  //       checkForDuplicates();
  //     }, 3000);

  //     return () => clearTimeout(timer);
  //   }
  // }, [products]);

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

  // ✅ VERIFICAR PERMISOS PARA ACCIONES
  const canManageProducts = currentUser.rol === "admin";
  const canManageCategories = currentUser.rol === "admin";

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSelectedCategory("all");
  };

  const handleCreateProduct = async () => {
    if (!canManageProducts) {
      const adminPassword = await requestAdminPassword("crear un producto");
      if (!adminPassword) return; // Usuario canceló
    }

    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleEditProduct = async (product) => {
    if (!canManageProducts) {
      const adminPassword = await requestAdminPassword("editar un producto");
      if (!adminPassword) return; // Usuario canceló
    }

    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!canManageProducts) {
      const adminPassword = await requestAdminPassword("eliminar un producto");
      if (!adminPassword) return; // Usuario canceló
    }

    dispatch(deleteProduct(productId));
  };

  // ✅ MANEJAR GUARDADO DE PRODUCTO
  const handleSaveProduct = async (
    productData,
    productId,
    imageFile = null
  ) => {
    try {
      console.log("💾 Guardando producto...", {
        productData,
        productId,
        hasImage: !!imageFile,
        tipoProductId: typeof productId,
      });

      let result;

      if (productId) {
        console.log(`🔄 Actualizando producto ID: ${productId}`);

        // ✅ SI HAY IMAGEN, crear FormData solo para la imagen
        if (imageFile) {
          console.log("🖼️ Hay imagen, creando FormData combinado...");
          const formData = new FormData();

          // Agregar todos los campos del producto
          Object.keys(productData).forEach((key) => {
            formData.append(key, productData[key]);
          });

          // Agregar la imagen
          formData.append("imagen", imageFile);

          result = await dispatch(updateProduct(productId, formData));
        } else {
          // ✅ SIN IMAGEN, usar JSON normal
          console.log("📄 Sin imagen, usando JSON normal");
          result = await dispatch(updateProduct(productId, productData));
        }
      } else {
        console.log("🆕 Creando nuevo producto");

        // ✅ PARA CREAR: Similar lógica
        if (imageFile) {
          const formData = new FormData();
          Object.keys(productData).forEach((key) => {
            formData.append(key, productData[key]);
          });
          formData.append("imagen", imageFile);
          result = await dispatch(createProduct(formData));
        } else {
          result = await dispatch(createProduct(productData));
        }
      }

      return result;
    } catch (error) {
      console.error("❌ Error guardando producto:", error);
      return { success: false, error: error.message };
    }
  };

  const handleCreateCategory = async () => {
    if (!canManageCategories) {
      const adminPassword = await requestAdminPassword("crear una categoría");
      if (!adminPassword) return; // Usuario canceló
    }

    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const handleEditCategory = async (category) => {
    if (!canManageCategories) {
      const adminPassword = await requestAdminPassword("editar una categoría");
      if (!adminPassword) return; // Usuario canceló
    }

    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!canManageCategories) {
      const adminPassword = await requestAdminPassword(
        "eliminar una categoría"
      );
      if (!adminPassword) return; // Usuario canceló
    }

    await dispatch(deleteCategory(categoryId));
  };

  // ✅ CORREGIDO: Manejo mejorado de async/await
  const handleSaveCategory = async (categoryData) => {
    try {
      let result;
      if (editingCategory) {
        result = await dispatch(
          updateCategory(editingCategory.id, categoryData)
        );
      } else {
        result = await dispatch(createCategory(categoryData));
      }

      // ✅ VERIFICAR SI LA OPERACIÓN FUE EXITOSA
      if (result?.success) {
        setShowCategoryModal(false);
        setEditingCategory(null);
        // Recargar categorías para asegurar datos actualizados
        dispatch(loadCategories());
      }
    } catch (error) {
      console.error("Error en handleSaveCategory:", error);
    }
  };

  // ✅ FUNCIÓN PARA SINCRONIZAR PRODUCTOS
  const handleSyncProducts = async () => {
    try {
      await Swal.fire({
        title: "Sincronizando...",
        text: "Actualizando catálogo de productos",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const result = await dispatch(syncProductsFromServer());

      Swal.close();

      if (result.success) {
        await Swal.fire({
          icon: "success",
          title: "Sincronización completada",
          text: `✅ ${
            result.count || result.data?.length || 0
          } productos actualizados`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        throw new Error(result.error || "Error en sincronización");
      }
    } catch (error) {
      Swal.close();
      await Swal.fire({
        icon: "error",
        title: "Error de sincronización",
        text: error.message || "No se pudieron actualizar los productos",
        confirmButtonText: "Entendido",
      });
    }
  };

  const toggleCategoriesSection = () => {
    setCategoriesExpanded(!categoriesExpanded);
  };

  // ✅ FUNCIÓN PARA OBTENER TEXTO DE PERMISOS
  const getPermissionText = () => {
    if (currentUser.rol === "admin") {
      return "Tienes permisos completos para gestionar productos y categorías";
    } else {
      return "Algunas acciones requieren autorización de administrador";
    }
  };

  const safeProducts = Array.isArray(products) ? products : [];

  const filteredProducts = safeProducts.filter((product) => {
    const matchesSearch =
      product.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo_barras?.includes(searchTerm);
    const matchesCategory =
      selectedCategory === "all" ||
      product.categoria_nombre === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = safeProducts.filter(
    (p) => p.stock > 0 && p.stock <= (p.stock_minimo || 5)
  ).length;
  const outOfStockProducts = safeProducts.filter((p) => p.stock === 0).length;

  return (
    <div className={styles.productsPage}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <h1>Catálogo de Productos</h1>
          <p>Gestiona y explora todos los productos disponibles</p>
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
          <div
            className={`${styles.stat} ${
              lowStockProducts > 0 ? styles.warning : ""
            }`}
          >
            <span className={styles.statNumber}>{lowStockProducts}</span>
            <span className={styles.statLabel}>Stock Bajo</span>
          </div>
          <div
            className={`${styles.stat} ${
              outOfStockProducts > 0 ? styles.danger : ""
            }`}
          >
            <span className={styles.statNumber}>{outOfStockProducts}</span>
            <span className={styles.statLabel}>Agotados</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>{categories.length}</span>
            <span className={styles.statLabel}>Categorías</span>
          </div>
        </div>
      </div>

      {/* ✅ ALERTA DE DUPLICADOS */}
      {showDuplicates && (
        <div className={styles.duplicateAlert}>
          <div className={styles.alertContent}>
            <div className={styles.alertText}>
              <strong>⚠️ Productos Duplicados Detectados</strong>
              <p>
                Se encontraron productos duplicados en la base de datos local.
              </p>
            </div>
            <button
              onClick={handleCleanDuplicates}
              disabled={cleaningDuplicates}
              className={styles.cleanButton}
            >
              <FiRefreshCw
                className={cleaningDuplicates ? styles.spinning : ""}
              />
              {cleaningDuplicates ? "Limpiando..." : "Limpiar Duplicados"}
            </button>
          </div>
        </div>
      )}

      {(outOfStockProducts > 0 || lowStockProducts > 0) && (
        <div className={styles.alertsSection}>
          {outOfStockProducts > 0 && (
            <div className={`${styles.alert} ${styles.danger}`}>
              <FiTrendingDown className={styles.alertIcon} />
              <span>{outOfStockProducts} productos agotados</span>
            </div>
          )}
          {lowStockProducts > 0 && (
            <div className={`${styles.alert} ${styles.warning}`}>
              <FiTrendingDown className={styles.alertIcon} />
              <span>{lowStockProducts} productos con stock bajo</span>
            </div>
          )}
        </div>
      )}

      <div className={styles.productsContent}>
        <div className={styles.productsHeader}>
          <div className={styles.actionsBar}>
            <div className={styles.searchSection}>
              <ProductSearch
                onSearch={handleSearch}
                onClear={handleClearSearch}
                loading={loading}
              />
            </div>

            <div className={styles.filtersSection}>
              <div className={styles.filterGroup}>
                <FiFilter className={styles.filterIcon} />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={styles.categorySelect}
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.nombre}>
                      {category.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {(searchTerm || selectedCategory !== "all") && (
                <button
                  className={styles.clearFilters}
                  onClick={handleClearSearch}
                >
                  Limpiar filtros
                </button>
              )}

              <div className={styles.actionButtons}>
                {/* <button
                  className={styles.syncButton}
                  onClick={handleSyncProducts}
                  disabled={loading}
                  title="Sincronizar con servidor"
                >
                  <FiRefreshCw className={loading ? styles.spinning : ""} />
                  Sincronizar
                </button> */}

                <button
                  className={`${styles.addButton} ${styles.categoryButton} ${
                    !canManageCategories ? styles.viewOnly : ""
                  }`}
                  onClick={handleCreateCategory}
                  title={
                    canManageCategories
                      ? "Crear nueva categoría"
                      : "Solo visualización - Requiere autorización de administrador"
                  }
                >
                  {canManageCategories ? (
                    <>
                      <FiTag className={styles.addIcon} />
                      Nueva Categoría
                    </>
                  ) : (
                    <>
                      <FiEye className={styles.viewIcon} />
                      Ver Categorías
                      <FiShield className={styles.shieldIcon} />
                    </>
                  )}
                </button>

                <button
                  className={`${styles.addButton} ${
                    !canManageProducts ? styles.viewOnly : ""
                  }`}
                  onClick={handleCreateProduct}
                  title={
                    canManageProducts
                      ? "Crear nuevo producto"
                      : "Solo visualización - Requiere autorización de administrador"
                  }
                >
                  {canManageProducts ? (
                    <>
                      <FiPlus className={styles.addIcon} />
                      Nuevo Producto
                    </>
                  ) : (
                    <>
                      <FiEye className={styles.viewIcon} />
                      Ver Productos
                      <FiShield className={styles.shieldIcon} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className={styles.resultsInfo}>
            <div className={styles.resultsHeader}>
              <h3>
                <FiPackage className={styles.sectionIcon} />
                Productos ({filteredProducts.length})
              </h3>
              <div className={styles.userRoleBadge}>
                <FiShield className={styles.roleIcon} />
                {currentUser.rol === "admin" ? "Administrador" : "Vendedor"}
              </div>
            </div>
            <span className={styles.resultsText}>
              {searchTerm && `Búsqueda: "${searchTerm}"`}
              {selectedCategory !== "all" &&
                ` • Categoría: ${selectedCategory}`}
            </span>
          </div>
        </div>
        // En Products.jsx - AGREGAR ESTOS BOTONES ADICIONALES
        <div className={styles.debugActions}>
          <button
            className={styles.debugButton}
            onClick={async () => {
              const result = await dispatch(cleanDuplicateProducts());
              if (result.success) {
                Swal.fire({
                  icon: "success",
                  title: "Limpieza completada",
                  text: `Se eliminaron ${result.removed} productos duplicados`,
                  timer: 3000,
                });
              } else {
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: result.error || "Error en limpieza",
                });
              }
            }}
            title="Limpieza normal de duplicados"
          >
            🧹 Limpiar Duplicados
          </button>

          <div className={styles.debugActions}>
            <button
              className={styles.emergencyButton}
              onClick={emergencyCleanDuplicates}
              title="Limpieza agresiva de duplicados"
            >
              🚨 Limpiar Duplicados (Emergencia)
            </button>
          </div>

          <button
            className={styles.debugButton}
            onClick={async () => {
              // Debug: mostrar estado actual de productos
              const products = await IndexedDBService.getAll("productos");
              console.log("🔍 DEBUG - Productos actuales:", products);

              // Buscar el producto problemático específico
              const problemProduct = products.find(
                (p) =>
                  p.id === "prod_1762804099660_1ohwul8to" ||
                  p.id_local === "prod_1762804099660_1ohwul8to"
              );

              console.log("🔍 Producto problemático:", problemProduct);

              Swal.fire({
                icon: "info",
                title: "Debug Info",
                html: `
          <div style="text-align: left;">
            <p><strong>Total productos:</strong> ${products.length}</p>
            <p><strong>Producto problemático:</strong> ${
              problemProduct ? "ENCONTRADO" : "NO ENCONTRADO"
            }</p>
            ${
              problemProduct
                ? `
              <p><strong>Nombre:</strong> ${problemProduct.nombre}</p>
              <p><strong>ID:</strong> ${problemProduct.id}</p>
              <p><strong>ID Local:</strong> ${problemProduct.id_local}</p>
            `
                : ""
            }
          </div>
        `,
              });
            }}
            title="Debug información de productos"
          >
            🔍 Debug Info
          </button>
        </div>
        {/* ✅ SECCIÓN DE CATEGORÍAS COLAPSABLE */}
        <div
          className={`${styles.categoriesSection} ${
            categoriesExpanded ? styles.expanded : styles.collapsed
          }`}
        >
          <div
            className={styles.categoriesHeader}
            onClick={toggleCategoriesSection}
          >
            <div className={styles.categoriesTitle}>
              {categoriesExpanded ? (
                <FiChevronUp className={styles.expandIcon} />
              ) : (
                <FiChevronDown className={styles.expandIcon} />
              )}
              <FiLayers className={styles.sectionIcon} />
              <div>
                <h4>Gestión de Categorías</h4>
                <span className={styles.categoriesCount}>
                  {categories.length} categorías
                </span>
              </div>
            </div>
            <button
              className={`${styles.manageCategoriesBtn} ${
                !canManageCategories ? styles.viewOnly : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleCreateCategory();
              }}
              title={
                canManageCategories
                  ? "Crear nueva categoría"
                  : "Solo visualización - Requiere autorización de administrador"
              }
            >
              {canManageCategories ? (
                <>
                  <FiPlus className={styles.addIcon} />
                  Nueva Categoría
                </>
              ) : (
                <>
                  <FiEye className={styles.viewIcon} />
                  Ver Categorías
                  <FiShield className={styles.shieldIcon} />
                </>
              )}
            </button>
          </div>

          {categoriesExpanded && (
            <div className={styles.categoriesContent}>
              {categories.length > 0 ? (
                <div className={styles.categoriesGrid}>
                  {categories.map((category) => (
                    <div key={category.id} className={styles.categoryCard}>
                      <div className={styles.categoryInfo}>
                        <h5 className={styles.categoryName}>
                          {category.nombre}
                        </h5>
                        {category.descripcion && (
                          <p className={styles.categoryDescription}>
                            {category.descripcion}
                          </p>
                        )}
                        <div className={styles.categoryMeta}>
                          <span
                            className={`${styles.categoryStatus} ${
                              category.activo ? styles.active : styles.inactive
                            }`}
                          >
                            {category.activo ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                      </div>
                      <div className={styles.categoryActions}>
                        <button
                          className={`${styles.editBtn} ${
                            !canManageCategories ? styles.disabled : ""
                          }`}
                          onClick={() => handleEditCategory(category)}
                          title={
                            canManageCategories
                              ? "Editar categoría"
                              : "Solo visualización - Requiere autorización de administrador"
                          }
                          disabled={!canManageCategories}
                        >
                          {canManageCategories ? (
                            <FiEdit />
                          ) : (
                            <FiEye className={styles.viewIcon} />
                          )}
                        </button>
                        <button
                          className={`${styles.deleteBtn} ${
                            !canManageCategories ? styles.disabled : ""
                          }`}
                          onClick={() => handleDeleteCategory(category.id)}
                          title={
                            canManageCategories
                              ? "Eliminar categoría"
                              : "Solo visualización - Requiere autorización de administrador"
                          }
                          disabled={!canManageCategories}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noCategories}>
                  <FiTag className={styles.noCategoriesIcon} />
                  <p>No hay categorías creadas</p>
                  <button
                    className={`${styles.addCategoryBtn} ${
                      !canManageCategories ? styles.viewOnly : ""
                    }`}
                    onClick={handleCreateCategory}
                    title={
                      canManageCategories
                        ? "Crear primera categoría"
                        : "Solo visualización - Requiere autorización de administrador"
                    }
                  >
                    {canManageCategories ? (
                      <>
                        <FiPlus className={styles.addIcon} />
                        Crear Primera Categoría
                      </>
                    ) : (
                      <>
                        <FiEye className={styles.viewIcon} />
                        Ver Categorías
                        <FiShield className={styles.shieldIcon} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <ProductGrid
          products={filteredProducts}
          loading={loading}
          error={error}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          canManageProducts={canManageProducts}
        />
      </div>

      <ProductModal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        product={editingProduct}
        categories={categories}
        canManageProducts={canManageProducts}
      />

      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        category={editingCategory}
        canManageCategories={canManageCategories}
      />

      {/* ✅ INFORMACIÓN DE PERMISOS AL FINAL */}
      <div className={styles.permissionsFooter}>
        <div className={styles.permissionNote}>
          <FiShield className={styles.noteIcon} />
          <div>
            <strong>Información de permisos:</strong>
            <ul>
              <li>
                <strong>Administradores:</strong> Pueden crear, editar y
                eliminar productos y categorías directamente
              </li>
              <li>
                <strong>Vendedores:</strong> Solo visualización. Para realizar
                cambios requieren autorización de administrador
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
