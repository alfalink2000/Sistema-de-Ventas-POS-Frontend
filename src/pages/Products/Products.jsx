// pages/Products/Products.jsx - CON VALIDACIONES DE ROLES
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import ProductGrid from "../../components/features/products/ProductGrid/ProductGrid";
import ProductSearch from "../../components/features/products/ProductSearch/ProductSearch";
import ProductModal from "../../components/features/products/ProductModal/ProductModal";
import CategoryModal from "../../components/features/categories/CategoryModal";
import {
  loadProducts,
  loadProductsIfNeeded,
  createProduct,
  updateProduct,
  deleteProduct,
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

  const dispatch = useDispatch();
  const { products, loading, dataLoaded, error } = useSelector(
    (state) => state.products
  );
  const { categories: categoriesFromStore, loading: categoriesLoading } =
    useSelector((state) => state.categories);
  const { user: currentUser } = useSelector((state) => state.auth); // ✅ OBTENER USUARIO ACTUAL

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

  // En Products.jsx - ACTUALIZAR handleSaveProduct
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
      product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      product.categoria_nombre === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const lowStockProducts = safeProducts.filter(
    (p) => p.stock <= (p.stock_minimo || 5)
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
