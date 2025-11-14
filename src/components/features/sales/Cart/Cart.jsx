// components/features/sales/Cart/Cart.jsx - VERSIÓN CORREGIDA
import { useSelector, useDispatch } from "react-redux";
import { clearCart } from "../../../../actions/cartActions";
import CartItem from "../CartItem/CartItem";
import Button from "../../../ui/Button/Button";
import { FiShoppingCart, FiArrowRight, FiClock } from "react-icons/fi";
import styles from "./Cart.module.css";
import PendienteModal from "../PendienteModal/PendienteModal";
import { useState } from "react";
const Cart = ({ onCheckout, disabled = false }) => {
  const dispatch = useDispatch();
  const { items } = useSelector((state) => state.cart);
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);
  const [showPendienteModal, setShowPendienteModal] = useState(false);
  const getTotalPrice = () => {
    return items.reduce(
      (total, item) => total + item.precio * item.quantity,
      0
    );
  };

  if (items.length === 0) {
    return (
      <div className={styles.emptyCart}>
        <div className={styles.emptyIllustration}>
          <div className={styles.cartIconWrapper}>
            <FiShoppingCart className={styles.cartIcon} />
          </div>
        </div>

        <div className={styles.emptyContent}>
          <h3 className={styles.emptyTitle}>Carrito Vacío</h3>
          <p className={styles.emptyText}>
            Agrega productos desde el catálogo para comenzar una venta
          </p>
          <div className={styles.emptyHint}>
            <FiArrowRight className={styles.hintIcon} />
            <span>Selecciona productos para comenzar</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cart}>
      {/* ✅ HEADER FIJO */}
      <div className={styles.cartHeader}>
        <h3>Carrito de Venta ({items.length})</h3>
        <Button
          variant="secondary"
          size="small"
          onClick={() => dispatch(clearCart())}
        >
          Limpiar
        </Button>
      </div>

      {/* ✅ CONTENEDOR CON SCROLL CONTROLADO */}
      <div className={styles.cartItemsContainer}>
        <div className={styles.cartItems}>
          {items.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* ✅ FOOTER SIEMPRE VISIBLE */}
      <div className={styles.cartFooter}>
        <div className={styles.total}>
          <span>Total:</span>
          <span className={styles.totalAmount}>
            ${getTotalPrice().toFixed(2)}
          </span>
        </div>

        {/* ✅ DESHABILITAR BOTÓN SI NO HAY SESIÓN */}
        {!sesionAbierta && (
          <div className={styles.warningMessage}>
            ⚠️ Abre una sesión de caja para vender
          </div>
        )}
        <Button
          className={styles.pendienteButton}
          onClick={() => setShowPendienteModal(true)}
          disabled={!sesionAbierta || items.length === 0}
        >
          <FiClock className={styles.buttonIcon} />
          Registrar Pendiente
        </Button>
        <Button
          variant="primary"
          size="large"
          onClick={onCheckout}
          fullWidth
          disabled={disabled || !sesionAbierta}
          className={styles.checkoutButton}
        >
          {!sesionAbierta ? "Sesión Requerida" : "Proceder al Pago"}
        </Button>
      </div>
      <PendienteModal
        isOpen={showPendienteModal}
        onClose={() => setShowPendienteModal(false)}
      />
    </div>
  );
};

export default Cart;
