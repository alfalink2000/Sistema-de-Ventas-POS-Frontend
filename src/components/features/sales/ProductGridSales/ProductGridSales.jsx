// components/features/sales/ProductGridSales/ProductGridSales.jsx
import React from "react"; // ✅ AGREGAR ESTA IMPORTACIÓN
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
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductGridSales = ({ products, loading, error, compact = false }) => {
  // ✅ FUNCIÓN PARA ELIMINAR DUPLICADOS
  const getUniqueProducts = (productsArray) => {
    if (!productsArray || !Array.isArray(productsArray)) return [];

    const seen = new Set();
    const uniqueProducts = [];

    productsArray.forEach((product) => {
      if (!product?.id) return;

      // Crear una clave única combinando ID y nombre
      const productKey = `${product.id}-${product.nombre}`;

      if (!seen.has(productKey)) {
        seen.add(productKey);
        uniqueProducts.push(product);
      } else {
        console.warn(`⚠️ Producto duplicado eliminado:`, {
          id: product.id,
          nombre: product.nombre,
          key: productKey,
        });
      }
    });

    return uniqueProducts;
  };

  // ✅ PRODUCTOS ÚNICOS
  const uniqueProducts = getUniqueProducts(products);

  // ✅ DEBUG: Mostrar información de duplicados
  React.useEffect(() => {
    if (products && products.length > uniqueProducts.length) {
      console.warn(
        `🔄 Se eliminaron ${
          products.length - uniqueProducts.length
        } productos duplicados`
      );
      console.log("📋 Productos únicos:", uniqueProducts.length);
      console.log("📋 Productos originales:", products.length);

      // Mostrar IDs duplicados
      const duplicateIds = products.filter(
        (product, index, self) =>
          index !== self.findIndex((p) => p.id === product.id)
      );
      console.log(
        "🚫 IDs duplicados:",
        duplicateIds.map((p) => ({ id: p.id, nombre: p.nombre }))
      );
    }
  }, [products, uniqueProducts.length]);

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

  return (
    <div className={`${styles.productGrid} ${compact ? styles.compact : ""}`}>
      {uniqueProducts.map((product) => (
        <ProductCardSales
          key={`${product.id}-${product.nombre}-${Math.random()
            .toString(36)
            .substr(2, 9)}`} // ✅ KEY ÚNICA
          product={product}
        />
      ))}
    </div>
  );
};

export default ProductGridSales;
