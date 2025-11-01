// components/features/sales/PaymentModal/PaymentModal.jsx - VERSIÓN CORREGIDA
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearCart } from "../../../../actions/cartActions";
import { createSale } from "../../../../actions/salesActions";
import { loadOpenSesion } from "../../../../actions/sesionesCajaActions";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import Swal from "sweetalert2";
import styles from "./PaymentModal.module.css";

const PaymentModal = ({ isOpen, onClose, onSuccess, onError }) => {
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [cashAmount, setCashAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [stockUpdateStatus, setStockUpdateStatus] = useState({});

  const dispatch = useDispatch();
  const { items } = useSelector((state) => state.cart);
  const { products } = useSelector((state) => state.products);
  const { user } = useSelector((state) => state.auth);
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);

  // Resetear estado cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod("efectivo");
      setCashAmount("");
      setProcessing(false);
      setStockUpdateStatus({});
    }
  }, [isOpen]);

  const getTotalPrice = () => {
    return items.reduce(
      (total, item) => total + item.precio * item.quantity,
      0
    );
  };

  const total = getTotalPrice();
  const change = cashAmount ? (parseFloat(cashAmount) - total).toFixed(2) : 0;

  // Verificar stock antes de procesar
  const checkStockAvailability = () => {
    const stockIssues = [];

    items.forEach((item) => {
      const product = products.find((p) => p.id === item.id);
      if (product) {
        const newStock = product.stock - item.quantity;
        if (newStock < 0) {
          stockIssues.push({
            product: item.nombre,
            currentStock: product.stock,
            required: item.quantity,
            deficit: Math.abs(newStock),
          });
        }
      }
    });

    return stockIssues;
  };

  // ✅ FUNCIÓN ALTERNATIVA PARA ACTUALIZAR STOCK
  const updateProductStock = async (productId, quantity) => {
    try {
      // Buscar el producto actual
      const product = products.find((p) => p.id === productId);
      if (!product) {
        throw new Error(`Producto con ID ${productId} no encontrado`);
      }

      // Calcular nuevo stock
      const newStock = product.stock - quantity;
      if (newStock < 0) {
        throw new Error(
          `Stock insuficiente: ${product.stock} disponible, ${quantity} requerido`
        );
      }

      // Actualizar en Redux (simulación - en una app real esto haría una llamada API)
      dispatch({
        type: "PRODUCT_UPDATE_STOCK",
        payload: {
          id: productId,
          stock: newStock,
        },
      });

      return true;
    } catch (error) {
      console.error(
        `Error actualizando stock del producto ${productId}:`,
        error
      );
      return false;
    }
  };

  const handleProcessSale = async () => {
    console.log("🔍 [PAYMENT] Iniciando proceso de venta...");

    console.log("🔍 Estado de sesión:", {
      sesionAbierta: !!sesionAbierta,
      id: sesionAbierta?.id,
      id_local: sesionAbierta?.id_local,
      estado: sesionAbierta?.estado,
      vendedor: sesionAbierta?.vendedor_id,
    });

    // ✅ VERIFICAR SESIÓN DE CAJA PRIMERO
    if (!sesionAbierta || (!sesionAbierta.id && !sesionAbierta.id_local)) {
      await Swal.fire({
        icon: "error",
        title: "Sesión de Caja Requerida",
        text: "Debes tener una sesión de caja abierta para realizar ventas",
        confirmButtonText: "Entendido",
      });
      return;
    }

    // ✅ VERIFICAR QUE LOS PRODUCTOS TENGAN ID VÁLIDO
    const productosSinId = items.filter((item) => !item.id || item.id === "");
    if (productosSinId.length > 0) {
      await Swal.fire({
        icon: "error",
        title: "Productos Inválidos",
        text: `Los siguientes productos no tienen ID válido: ${productosSinId
          .map((p) => p.nombre)
          .join(", ")}`,
        confirmButtonText: "Entendido",
      });
      return;
    }

    setProcessing(true);
    setStockUpdateStatus({ updating: true, message: "Verificando stock..." });

    try {
      // 1. Verificar disponibilidad de stock
      const stockIssues = checkStockAvailability();
      if (stockIssues.length > 0) {
        const issueMessages = stockIssues
          .map(
            (issue) =>
              `${issue.product}: Stock actual ${issue.currentStock}, necesita ${issue.required}`
          )
          .join("\n");

        throw new Error(`Stock insuficiente:\n${issueMessages}`);
      }

      // 2. ✅ ACTUALIZAR STOCK USANDO LA FUNCIÓN ALTERNATIVA
      setStockUpdateStatus({
        updating: true,
        message: "Actualizando stock...",
      });

      console.log("🔄 Actualizando stock de productos vendidos...");
      const stockUpdates = [];

      for (const item of items) {
        try {
          const success = await updateProductStock(item.id, item.quantity);
          stockUpdates.push({
            productId: item.id,
            productName: item.nombre,
            success: success,
            quantity: item.quantity,
            previousStock: products.find((p) => p.id === item.id)?.stock || 0,
          });

          if (!success) {
            throw new Error(`Error actualizando stock de ${item.nombre}`);
          }
        } catch (error) {
          console.error(
            `❌ Error actualizando stock para ${item.nombre}:`,
            error
          );
          stockUpdates.push({
            productId: item.id,
            productName: item.nombre,
            success: false,
            quantity: item.quantity,
            error: error.message,
          });
        }
      }

      // 3. Verificar resultados de actualización de stock
      const failedUpdates = stockUpdates.filter((update) => !update.success);
      if (failedUpdates.length > 0) {
        const errorMessages = failedUpdates
          .map((update) => `${update.productName}: ${update.error}`)
          .join(", ");
        throw new Error(`Error en actualización de stock: ${errorMessages}`);
      }

      setStockUpdateStatus({ updating: true, message: "Creando venta..." });

      // 4. CREAR LA VENTA CON PRODUCTOS INCLUIDOS
      const saleData = {
        sesion_caja_id: sesionAbierta.id || sesionAbierta.id_local,
        vendedor_id: user.id,
        total: total,
        metodo_pago: paymentMethod,
        // Solo enviar estos campos si no son null
        ...(paymentMethod === "efectivo" && {
          efectivo_recibido: parseFloat(cashAmount),
          cambio: parseFloat(change),
        }),
        productos: items.map((item) => ({
          producto_id: item.id.toString(), // ✅ ASEGURAR QUE SEA STRING
          cantidad: parseInt(item.quantity),
          precio_unitario: parseFloat(item.precio),
          subtotal: parseFloat(item.precio * item.quantity),
        })),
      };

      console.log("🔄 [PAYMENT] Enviando datos de venta:", saleData);
      const ventaCreada = await dispatch(createSale(saleData));

      if (!ventaCreada) {
        throw new Error("Error al crear la venta en la base de datos");
      }

      // 5. Limpiar carrito y notificar éxito
      dispatch(clearCart());

      // 6. Recargar sesión de caja para actualizar totales
      await dispatch(loadOpenSesion(user.id));

      setStockUpdateStatus({
        updating: false,
        success: true,
        message: "Venta completada ✅",
      });

      console.log("💰 Venta procesada exitosamente:", {
        venta: ventaCreada,
        productos: saleData.productos,
        stockUpdates: stockUpdates,
      });

      // Pequeño delay para mostrar el estado de éxito
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (onSuccess) {
        onSuccess({
          venta: ventaCreada,
          productos: saleData.productos,
          stockUpdates: stockUpdates,
        });
      }

      onClose();
    } catch (error) {
      console.error("❌ Error procesando venta:", error);
      setStockUpdateStatus({
        updating: false,
        success: false,
        message: error.message,
      });

      if (onError) {
        onError(error);
      }
    } finally {
      setProcessing(false);
    }
  };

  const getProductStockInfo = (productId) => {
    const product = products.find((p) => p.id === productId);
    const cartItem = items.find((item) => item.id === productId);

    if (!product || !cartItem) return null;

    return {
      current: product.stock,
      after: product.stock - cartItem.quantity,
      sufficient: product.stock - cartItem.quantity >= 0,
    };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Procesar Pago" size="large">
      <div className={styles.paymentModal}>
        {/* Estado de actualización de stock */}
        {stockUpdateStatus.updating && (
          <div className={styles.processingOverlay}>
            <div className={styles.processingContent}>
              <div className={styles.spinner}></div>
              <p>{stockUpdateStatus.message}</p>
            </div>
          </div>
        )}

        {/* Alerta de sesión de caja */}
        {!sesionAbierta && (
          <div className={styles.alertWarning}>
            ⚠️ No hay sesión de caja abierta. Abre una sesión primero en la
            sección de Caja.
          </div>
        )}

        <div className={styles.orderSummary}>
          <h4>Resumen de la Venta</h4>
          <div className={styles.orderItems}>
            {items.map((item) => {
              const stockInfo = getProductStockInfo(item.id);
              return (
                <div key={item.id} className={styles.orderItem}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemName}>{item.nombre}</span>
                    <span className={styles.itemQuantity}>
                      x{item.quantity}
                    </span>
                  </div>
                  <div className={styles.itemDetails}>
                    <span className={styles.itemPrice}>
                      ${(item.precio * item.quantity).toFixed(2)}
                    </span>
                    {stockInfo && (
                      <span
                        className={`${styles.stockInfo} ${
                          !stockInfo.sufficient ? styles.stockWarning : ""
                        }`}
                      >
                        Stock: {stockInfo.current} → {stockInfo.after}
                        {!stockInfo.sufficient && " ⚠️"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.orderTotal}>
            <span>Total a Pagar:</span>
            <span className={styles.totalAmount}>${total.toFixed(2)}</span>
          </div>
        </div>

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

        {paymentMethod === "efectivo" && (
          <div className={styles.cashPayment}>
            <label className={styles.cashLabel}>Monto Recibido</label>
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
                <div
                  className={`${styles.cashRow} ${styles.changeRow} ${
                    change >= 0 ? styles.sufficient : styles.insufficient
                  }`}
                >
                  <span>Cambio:</span>
                  <span>${Math.abs(change).toFixed(2)}</span>
                </div>
                {change < 0 && (
                  <div className={styles.insufficientWarning}>
                    ⚠️ El monto recibido es insuficiente
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
