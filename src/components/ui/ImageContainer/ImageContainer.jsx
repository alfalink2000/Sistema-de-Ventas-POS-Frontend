// components/ui/ImageContainer/ImageContainer.jsx
import styles from "./ImageContainer.module.css";

const ImageContainer = ({
  children,
  aspectRatio = "4/3", // Ratio por defecto para productos
  minHeight = "200px",
  maxHeight = "300px",
}) => {
  return (
    <div
      className={styles.imageContainer}
      style={{
        aspectRatio: aspectRatio,
        minHeight: minHeight,
        maxHeight: maxHeight,
      }}
    >
      {children}
    </div>
  );
};

export default ImageContainer;
