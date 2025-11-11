// components/features/sales/PaymentModal/PaymentModal.jsx - VERSIÓN SIMPLIFICADA
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearCart } from "../../../../actions/cartActions";
import { createSale } from "../../../../actions/salesActions";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import Swal from "sweetalert2";
import styles from "./PaymentModal.module.css";

const PaymentModal = ({ isOpen, onClose, onSuccess, isOnline }) => {
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [cashAmount, setCashAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  const dispatch = useDispatch();
  const { items } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);

  // ✅ FUNCIÓN SIMPLIFICADA DE PROCESAMIENTO
  const handleProcessSale = async () => {
    if (processing) return;

    const originalConsoleLog = console.log;
    console.log = () => {};
    setProcessing(true);

    try {
      // ✅ PREPARAR DATOS DE LA VENTA (IGUAL QUE ANTES)
      const productosVenta = items.map((item) => ({
        producto_id: item.id,
        cantidad: parseInt(item.quantity),
        precio_unitario: parseFloat(item.precio),
        precio_compra: parseFloat(item.precio * 0.8),
        subtotal: parseFloat(item.precio * item.quantity),
        nombre: item.nombre,
        producto_nombre: item.nombre,
      }));

      const totalVenta = items.reduce(
        (total, item) => total + item.precio * item.quantity,
        0
      );

      const saleData = {
        sesion_caja_id: sesionAbierta.id || sesionAbierta.id_local,
        vendedor_id: user.id,
        total: totalVenta,
        metodo_pago: paymentMethod,
        productos: productosVenta,
        ...(paymentMethod === "efectivo" &&
          cashAmount && {
            efectivo_recibido: parseFloat(cashAmount),
            cambio: parseFloat(cashAmount - totalVenta),
          }),
      };

      // ✅ USAR LA ACCIÓN MEJORADA createSale (QUE AHORA ACTUALIZA STOCK)
      const resultado = await dispatch(createSale(saleData));

      if (!resultado.success) {
        throw new Error(resultado.error || "Error al procesar la venta");
      }

      // ✅ ÉXITO - LIMPIAR CARRITO
      dispatch(clearCart());

      // ✅ MOSTRAR MENSAJE DE ÉXITO MEJORADO
      await Swal.fire({
        title: resultado.online ? "¡Venta Exitosa!" : "✅ Venta Guardada",
        html: `
        <div style="text-align: left;">
          <p><strong>${
            resultado.online
              ? "Venta procesada en servidor"
              : "Venta guardada localmente"
          }</strong></p>
          <p>Total: <strong>$${totalVenta.toFixed(2)}</strong></p>
          <p>Productos: <strong>${items.length}</strong></p>
          ${
            !resultado.online
              ? "<p>📱 Se sincronizará automáticamente cuando recuperes conexión</p>"
              : ""
          }
        </div>
      `,
        icon: "success",
        confirmButtonText: "Aceptar",
      });

      // ✅ CERRAR MODAL Y EJECUTAR CALLBACK
      onClose();
      if (onSuccess) {
        onSuccess(resultado.venta);
      }

      // ✅ DISPARAR EVENTO PARA ACTUALIZAR HEADER (STOCK PENDIENTES)
      window.dispatchEvent(new CustomEvent("stock_changes_updated"));
    } catch (error) {
      console.error("❌ Error en venta:", error);

      await Swal.fire({
        title: "Error en Venta",
        text: error.message,
        icon: "error",
        confirmButtonText: "Aceptar",
      });
    } finally {
      console.log = originalConsoleLog;
      setProcessing(false);
    }
  };

  // ✅ CALCULAR TOTAL Y CAMBIO
  const total = items.reduce(
    (sum, item) => sum + item.precio * item.quantity,
    0
  );
  const change = cashAmount ? (parseFloat(cashAmount) - total).toFixed(2) : 0;

  // ✅ RESET AL ABRIR MODAL
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod("efectivo");
      setCashAmount("");
      setProcessing(false);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Procesar Pago" size="large">
      <div className={styles.paymentModal}>
        {/* ALERTAS */}
        {!sesionAbierta && (
          <div className={styles.alertWarning}>
            ⚠️ No hay sesión de caja activa
          </div>
        )}

        {!isOnline && (
          <div className={styles.alertInfo}>
            📱 Modo Offline - Las ventas se guardarán localmente
          </div>
        )}

        {/* RESUMEN DE VENTA */}
        <div className={styles.orderSummary}>
          <h4>Resumen de la Venta</h4>
          <div className={styles.orderItems}>
            {items.map((item) => (
              <div key={item.id} className={styles.orderItem}>
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>{item.nombre}</span>
                  <span className={styles.itemQuantity}>x{item.quantity}</span>
                </div>
                <div className={styles.itemPrice}>
                  ${(item.precio * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.orderTotal}>
            <span>Total:</span>
            <span className={styles.totalAmount}>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* MÉTODO DE PAGO */}
        <div className={styles.paymentMethod}>
          <h4>Método de Pago</h4>
          <div className={styles.methodOptions}>
            <label className={styles.methodOption}>
              <input
                type="radio"
                value="efectivo"
                checked={paymentMethod === "efectivo"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span>💵 Efectivo</span>
            </label>
            <label className={styles.methodOption}>
              <input
                type="radio"
                value="tarjeta"
                checked={paymentMethod === "tarjeta"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span>💳 Tarjeta</span>
            </label>
          </div>
        </div>

        {/* EFECTIVO */}
        {paymentMethod === "efectivo" && (
          <div className={styles.cashPayment}>
            <label>Monto Recibido</label>
            <input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              placeholder="0.00"
              min={total}
              step="0.01"
              className={styles.cashInput}
            />
            {cashAmount && (
              <div className={styles.cashCalculations}>
                <div className={styles.cashRow}>
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className={styles.cashRow}>
                  <span>Recibido:</span>
                  <span>${parseFloat(cashAmount).toFixed(2)}</span>
                </div>
                <div className={`${styles.cashRow} ${styles.changeRow}`}>
                  <span>Cambio:</span>
                  <span>${Math.max(0, change).toFixed(2)}</span>
                </div>
                {change < 0 && (
                  <div className={styles.insufficientWarning}>
                    ⚠️ Monto insuficiente
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ACCIONES */}
        <div className={styles.paymentActions}>
          <Button variant="secondary" onClick={onClose} disabled={processing}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleProcessSale}
            disabled={
              processing ||
              items.length === 0 ||
              !sesionAbierta ||
              (paymentMethod === "efectivo" && (!cashAmount || change < 0))
            }
            loading={processing}
          >
            {processing ? "Procesando..." : "Confirmar Venta"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentModal;
