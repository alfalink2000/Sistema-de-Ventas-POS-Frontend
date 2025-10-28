// components/features/products/ProductGrid/ProductGrid.jsx - ACTUALIZADO CON PERMISOS
import ProductCard from "../ProductCard/ProductCard";
import styles from "./ProductGrid.module.css";

const ProductGrid = ({
  products,
  loading,
  error,
  onEdit,
  onDelete,
  canManageProducts = true, // ✅ NUEVO: permisos
}) => {
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

  if (!products || products.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIcon}>📦</div>
        <h3>No se encontraron productos</h3>
        <p>Intenta ajustar los filtros de búsqueda</p>
      </div>
    );
  }

  return (
    <div className={styles.productGrid}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
          canManageProducts={canManageProducts} // ✅ Pasar permisos a cada tarjeta
        />
      ))}
    </div>
  );
};

export default ProductGrid;
