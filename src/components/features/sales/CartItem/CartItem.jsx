// components/features/sales/CartItem/CartItem.jsx - VERSIÓN MEJORADA
import { useDispatch } from "react-redux";
import {
  removeFromCart,
  updateCartQuantity,
} from "../../../../actions/cartActions";
import Button from "../../../ui/Button/Button";
import { FiMinus, FiPlus, FiTrash2, FiImage, FiTag } from "react-icons/fi";
import styles from "./CartItem.module.css";

const CartItem = ({ item }) => {
  const dispatch = useDispatch();

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) {
      dispatch(removeFromCart(item.id));
      return;
    }
    dispatch(updateCartQuantity(item.id, newQuantity));
  };

  const handleRemove = () => {
    dispatch(removeFromCart(item.id));
  };

  const handleIncrement = () => {
    handleQuantityChange(item.quantity + 1);
  };

  const handleDecrement = () => {
    handleQuantityChange(item.quantity - 1);
  };

  return (
    <div className={styles.cartItem}>
      <div className={styles.itemImage}>
        {item.imagen_url ? (
          <img src={item.imagen_url} alt={item.nombre} />
        ) : (
          <div className={styles.placeholder}>
            <FiImage className={styles.placeholderIcon} />
          </div>
        )}
      </div>

      <div className={styles.itemInfo}>
        <h4 className={styles.itemName}>{item.nombre}</h4>
        <div className={styles.itemDetails}>
          <span className={styles.itemPrice}>
            <FiTag className={styles.priceIcon} />${item.precio.toFixed(2)} c/u
          </span>
          <span className={styles.itemSubtotal}>
            ${(item.precio * item.quantity).toFixed(2)}
          </span>
        </div>
      </div>

      <div className={styles.itemControls}>
        <div className={styles.quantityControls}>
          <Button
            variant="secondary"
            size="small"
            onClick={handleDecrement}
            className={styles.quantityButton}
          >
            <FiMinus className={styles.quantityIcon} />
          </Button>
          <span className={styles.quantity}>{item.quantity}</span>
          <Button
            variant="secondary"
            size="small"
            onClick={handleIncrement}
            className={styles.quantityButton}
          >
            <FiPlus className={styles.quantityIcon} />
          </Button>
        </div>

        <Button
          variant="danger"
          size="small"
          onClick={handleRemove}
          className={styles.removeButton}
        >
          <FiTrash2 className={styles.removeIcon} />
        </Button>
      </div>
    </div>
  );
};

export default CartItem;
