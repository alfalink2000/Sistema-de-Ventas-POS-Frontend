// components/features/products/ProductGrid/ProductGrid.jsx - CORREGIDO
import ProductCard from "../ProductCard/ProductCard";
import styles from "./ProductGrid.module.css";

const ProductGrid = ({
  products,
  loading,
  error,
  onEdit,
  onDelete,
  canManageProducts = true,
}) => {
  // ✅ FUNCIÓN MEJORADA PARA KEY ÚNICA
  const getProductKey = (product) => {
    if (!product) return Math.random().toString(36);

    // Prioridad: ID del servidor, luego ID local, luego fallback
    if (product.id && product.id !== product.id_local) {
      return `server_${product.id}`;
    }
    if (product.id_local) {
      return `local_${product.id_local}`;
    }
    if (product.id) {
      return `id_${product.id}`;
    }

    // Último recurso: combinación de nombre y timestamp
    return `temp_${product.nombre}_${Date.now()}_${Math.random().toString(36)}`;
  };

  // ✅ ELIMINAR DUPLICADOS EN TIEMPO REAL
  const removeDuplicates = (productsArray) => {
    if (!Array.isArray(productsArray)) return [];

    const seen = new Map();
    const uniqueProducts = [];

    productsArray.forEach((product) => {
      if (!product) return;

      const key = getProductKey(product);

      if (!seen.has(key)) {
        seen.set(key, true);
        uniqueProducts.push(product);
      } else {
        console.warn(`🔄 Eliminando duplicado en render: ${product.nombre}`, {
          id: product.id,
          id_local: product.id_local,
          key: key,
        });
      }
    });

    return uniqueProducts;
  };

  const uniqueProducts = removeDuplicates(products);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h3>Error al cargar productos</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!uniqueProducts || uniqueProducts.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>📦</div>
        <h3>No se encontraron productos</h3>
        <p>Intenta ajustar los filtros de búsqueda</p>
      </div>
    );
  }

  console.log(
    `🎯 Renderizando ${uniqueProducts.length} productos únicos de ${
      products?.length || 0
    } totales`
  );

  return (
    <div className={styles.productGrid}>
      {uniqueProducts.map((product) => (
        <ProductCard
          key={getProductKey(product)} // ✅ KEY ÚNICA GARANTIZADA
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          canManageProducts={canManageProducts}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
