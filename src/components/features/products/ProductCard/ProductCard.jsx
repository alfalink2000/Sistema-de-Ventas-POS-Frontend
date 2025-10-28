// components/features/products/ProductCard/ProductCard.jsx - ACTUALIZADO CON PERMISOS
import { FiEdit, FiTrash2, FiPackage, FiEye, FiShield } from "react-icons/fi";
import styles from "./ProductCard.module.css";

const ProductCard = ({
  product,
  onEdit,
  onDelete,
  canManageProducts = true, // ✅ NUEVO: permisos
}) => {
  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(product);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(product.id);
  };

  const getStockStatus = () => {
    if (product.stock === 0) return "out-of-stock";
    if (product.stock <= (product.stock_minimo || 5)) return "low-stock";
    return "healthy";
  };

  const stockStatus = getStockStatus();

  return (
    <div className={styles.productCard}>
      <div className={styles.imageContainer}>
        {product.imagen_url ? (
          <img
            src={product.imagen_url}
            alt={product.nombre}
            className={styles.productImage}
          />
        ) : (
          <FiPackage className={styles.placeholderImage} />
        )}

        {/* Botones de acción */}
        <div className={styles.actions}>
          <button
            className={`${styles.editButton} ${
              !canManageProducts ? styles.viewOnly : ""
            }`}
            onClick={handleEdit}
            title={
              canManageProducts
                ? "Editar producto"
                : "Solo visualización - Requiere autorización de administrador"
            }
          >
            {canManageProducts ? (
              <FiEdit />
            ) : (
              <FiEye className={styles.viewIcon} />
            )}
          </button>
          <button
            className={`${styles.deleteButton} ${
              !canManageProducts ? styles.disabled : ""
            }`}
            onClick={handleDelete}
            title={
              canManageProducts
                ? "Eliminar producto"
                : "Solo visualización - Requiere autorización de administrador"
            }
            disabled={!canManageProducts}
          >
            <FiTrash2 />
          </button>
        </div>

        {stockStatus === "out-of-stock" && (
          <div className={styles.outOfStock}>Agotado</div>
        )}
      </div>

      <div className={styles.productInfo}>
        <h3 className={styles.productName}>{product.nombre}</h3>

        {product.descripcion && (
          <p className={styles.productDescription}>{product.descripcion}</p>
        )}

        <div className={styles.productMeta}>
          {product.categoria_nombre && (
            <span className={styles.category}>{product.categoria_nombre}</span>
          )}
          <span className={`${styles.stock} ${styles[stockStatus]}`}>
            Stock: {product.stock}
            {stockStatus === "low-stock" && (
              <span className={styles.stockAlert}>(Bajo)</span>
            )}
            {stockStatus === "out-of-stock" && (
              <span className={styles.stockAlert}>(Agotado)</span>
            )}
          </span>
        </div>

        <div className={styles.productFooter}>
          <div className={styles.priceSection}>
            <span className={styles.price}>${product.precio?.toFixed(2)}</span>
            {product.precio_compra && (
              <span className={styles.costPrice}>
                Costo: ${product.precio_compra.toFixed(2)}
              </span>
            )}
          </div>

          {!canManageProducts && (
            <div className={styles.permissionIndicator}>
              <FiShield className={styles.shieldIcon} />
              <span>Solo lectura</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
