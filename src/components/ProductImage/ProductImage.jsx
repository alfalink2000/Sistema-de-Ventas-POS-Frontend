// components/ProductImage/ProductImage.jsx
import { useState, useEffect } from "react";

const ProductImage = ({ product, className, alt, ...props }) => {
  const [imgSrc, setImgSrc] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      if (!product) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        // Priorizar imagen local, luego externa
        const imageUrl =
          product.localImage || product.image || product.imagen || product.img;

        if (!imageUrl) {
          setError(true);
          setLoading(false);
          return;
        }

        // Si es imagen local, verificar que exista en cache
        if (product.localImage) {
          const cache = await caches.open("product-images-local");
          const cachedResponse = await cache.match(product.localImage);

          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            setImgSrc(URL.createObjectURL(blob));
          } else {
            // Si no está en cache, usar URL externa como fallback
            setImgSrc(product.image || product.imagen || product.img);
          }
        } else {
          // URL externa directa
          setImgSrc(imageUrl);
        }
      } catch (err) {
        console.warn("Error cargando imagen:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [product]);

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
  };

  if (loading) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
      >
        <div className="animate-pulse text-gray-500">🔄</div>
      </div>
    );
  }

  if (error || !imgSrc) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
      >
        <span className="text-gray-500 text-sm">📷 Sin imagen</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt || product?.name || "Producto"}
      className={className}
      onError={handleError}
      onLoad={handleLoad}
      loading="lazy"
      {...props}
    />
  );
};

export default ProductImage;
