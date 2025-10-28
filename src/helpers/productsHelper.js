// helpers/productsHelper.js
export const validateProductsData = (products) => {
  if (!Array.isArray(products)) {
    console.error("❌ Los productos no son un array:", products);
    return [];
  }

  return products.filter(
    (product) =>
      product &&
      product.id &&
      product.nombre &&
      typeof product.precio === "number"
  );
};

export const getProductsStats = (products) => {
  const total = products.length;
  const active = products.filter((p) => p.activo).length;
  const lowStock = products.filter((p) => p.stock <= p.stock_minimo).length;
  const zeroStock = products.filter((p) => p.stock === 0).length;

  return {
    total,
    active,
    lowStock,
    zeroStock,
  };
};
