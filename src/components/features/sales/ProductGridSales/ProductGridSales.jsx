// components/features/sales/ProductGridSales/ProductGridSales.jsx
import { useDispatch } from "react-redux";
import { addToCart } from "../../../../actions/cartActions";
import { FiPackage, FiShoppingCart } from "react-icons/fi";
import styles from "./ProductGridSales.module.css";

const ProductCardSales = ({ product }) => {
  const dispatch = useDispatch();

  const handleAddToCart = () => {
    dispatch(addToCart(product));
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

        {/* ✅ BOTÓN DE AGREGAR AL CARRITO */}
        <button
          className={styles.addToCartButton}
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          title={
            product.stock === 0 ? "Producto agotado" : "Agregar al carrito"
          }
        >
          <FiShoppingCart className={styles.cartIcon} />
          <span>Agregar</span>
        </button>

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
        </div>
      </div>
    </div>
  );
};

const ProductGridSales = ({ products, loading, error, compact = false }) => {
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
    <div className={`${styles.productGrid} ${compact ? styles.compact : ""}`}>
      {products.map((product) => (
        <ProductCardSales key={product.id} product={product} />
      ))}
    </div>
  );
};

export default ProductGridSales;
