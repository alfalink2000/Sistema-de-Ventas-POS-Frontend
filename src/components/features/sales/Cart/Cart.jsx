// components/features/sales/Cart/Cart.jsx - VERSIÓN MEJORADA
import { useSelector, useDispatch } from "react-redux";
import { clearCart } from "../../../../actions/cartActions";
import CartItem from "../CartItem/CartItem";
import Button from "../../../ui/Button/Button";
import { FiShoppingCart, FiArrowRight, FiClock } from "react-icons/fi";
import styles from "./Cart.module.css";

const Cart = ({ onCheckout, disabled = false }) => {
  const dispatch = useDispatch();
  const { items } = useSelector((state) => state.cart);
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);

  const getTotalPrice = () => {
    return items.reduce(
      (total, item) => total + item.precio * item.quantity,
      0
    );
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  // Determinar si mostrar modo compacto
  const isCompact = items.length > 8;

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
    <div className={`${styles.cart} ${isCompact ? styles.compact : ""}`}>
      {/* ✅ HEADER FIJO CON CONTADOR */}
      <div className={styles.cartHeader}>
        <div>
          <h3>Carrito de Venta</h3>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
            {items.length} productos • {getTotalItems()} unidades
          </span>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={() => dispatch(clearCart())}
          disabled={disabled}
        >
          Limpiar
        </Button>
      </div>

      {/* ✅ CONTENEDOR DE SCROLL MEJORADO */}
      <div className={styles.cartItemsContainer}>
        <div className={styles.cartItems}>
          {items.map((item, index) => (
            <CartItem key={`${item.id}-${index}`} item={item} />
          ))}
        </div>

        {/* ✅ INDICADOR DE SCROLL (opcional) */}
        {items.length > 5 && (
          <div className={styles.scrollIndicator}>↑ Desliza para ver más ↑</div>
        )}
      </div>

      {/* ✅ FOOTER SIEMPRE VISIBLE */}
      <div className={styles.cartFooter}>
        <div className={styles.total}>
          <span>Total a Pagar:</span>
          <span className={styles.totalAmount}>
            ${getTotalPrice().toFixed(2)}
          </span>
        </div>

        {/* ✅ MENSAJE DE ADVERTENCIA MEJORADO */}
        {!sesionAbierta && (
          <div className={styles.warningMessage}>
            ⚠️ Debes abrir una sesión de caja para realizar ventas
          </div>
        )}

        <Button
          variant="primary"
          size="large"
          onClick={onCheckout}
          fullWidth
          disabled={disabled || !sesionAbierta}
          className={styles.checkoutButton}
        >
          {!sesionAbierta ? (
            <>📋 Sesión de Caja Requerida</>
          ) : (
            <>💳 Proceder al Pago (${getTotalPrice().toFixed(2)})</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Cart;
