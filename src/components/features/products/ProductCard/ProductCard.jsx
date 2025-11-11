// components/features/products/ProductCard/ProductCard.jsx (actualizado)
import { useState } from "react";
import { FiEdit, FiTrash2, FiEye, FiPackage } from "react-icons/fi";
import OfflineImage from "../../../ui/OfflineImage/OfflineImage";
import styles from "./ProductCard.module.css";

// ✅ FUNCIÓN MEJORADA: Buscar imagen en múltiples propiedades
const getImageUrl = (product) => {
  if (!product) return null;

  // Lista de propiedades posibles donde puede estar la imagen
  const possibleImageProps = [
    "imagen_url",
    "imagen",
    "image_url",
    "image",
    "url_imagen",
    "img",
    "picture",
    "foto",
    "url",
    "thumbnail",
    "imagenUrl",
    "imageUrl",
    "photo",
    "photo_url",
    "foto_url",
  ];

  // Buscar en todas las propiedades posibles
  for (const prop of possibleImageProps) {
    if (
      product[prop] &&
      typeof product[prop] === "string" &&
      product[prop].trim() !== ""
    ) {
      return product[prop];
    }
  }

  // ✅ BUSCAR EN CUALQUIER PROPIEDAD QUE CONTENGA "URL" Y SEA DE IMGBB
  for (const key in product) {
    if (
      product.hasOwnProperty(key) &&
      typeof product[key] === "string" &&
      product[key].includes("i.ibb.co")
    ) {
      return product[key];
    }
  }

  return null;
};

// ✅ COMPONENTE MEJORADO: ImageWithFallback
const ImageWithFallback = ({ src, alt, className, fallback }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) {
    return fallback;
  }

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        style={{
          opacity: loading ? 0 : 1,
          transition: "opacity 0.3s ease",
        }}
      />
      {loading && (
        <div className={styles.imageSkeleton}>
          <div className={styles.loadingSpinner}></div>
        </div>
      )}
    </>
  );
};

const ProductCard = ({
  product,
  onEdit,
  onDelete,
  canManageProducts = true,
}) => {
  const imageUrl = getImageUrl(product);

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

  const fallbackContent = (
    <div className={styles.placeholderContainer}>
      <FiPackage className={styles.placeholderImage} />
      <span className={styles.placeholderText}>Sin imagen</span>
    </div>
  );

  return (
    <div className={styles.productCard}>
      <div className={styles.imageContainer}>
        {imageUrl ? (
          <ImageWithFallback
            src={imageUrl}
            alt={product.nombre}
            className={styles.productImage}
            fallback={fallbackContent}
          />
        ) : (
          fallbackContent
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
