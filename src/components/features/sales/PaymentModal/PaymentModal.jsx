// components/features/sales/PaymentModal/PaymentModal.jsx - VERSIÓN CON GANANCIA BRUTA OCULTA
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearCart } from "../../../../actions/cartActions";
import {
  createSale,
  reloadProductsAfterSale,
} from "../../../../actions/salesActions";
import { loadOpenSesion } from "../../../../actions/sesionesCajaActions";
import { loadProducts } from "../../../../actions/productsActions";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import Swal from "sweetalert2";
import styles from "./PaymentModal.module.css";
import IndexedDBService from "../../../../services/IndexedDBService";

const PaymentModal = ({ isOpen, onClose, onSuccess, onError }) => {
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [cashAmount, setCashAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [stockUpdateStatus, setStockUpdateStatus] = useState({});
  const [debugInfo, setDebugInfo] = useState({});

  const dispatch = useDispatch();
  const { items } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);

  // ✅ VERIFICAR SI ES ADMINISTRADOR
  const isAdmin = user?.rol === "admin";

  // ✅ CALCULAR GANANCIA BRUTA (SOLO PARA ADMIN)
  const calculateProfit = () => {
    if (!isAdmin) return 0;

    return items.reduce((profit, item) => {
      const costo = item.precio * 0.8; // Asumiendo 20% de ganancia
      const gananciaItem = (item.precio - costo) * item.quantity;
      return profit + gananciaItem;
    }, 0);
  };

  // ✅ DIAGNÓSTICO COMPLETO DE INDEXEDDB
  const runFullDiagnostic = async () => {
    console.log("🩺 EJECUTANDO DIAGNÓSTICO COMPLETO...");

    const diagnostic = {
      timestamp: new Date().toISOString(),
      cartItems: items,
      indexedDBStatus: {},
      productMatch: {},
      errors: [],
    };

    try {
      // 1. VERIFICAR ESTADO DE INDEXEDDB
      diagnostic.indexedDBStatus.dbInfo = await IndexedDBService.getDBInfo();

      // 2. OBTENER TODOS LOS PRODUCTOS
      const allProducts = await IndexedDBService.getAll("productos");
      diagnostic.indexedDBStatus.totalProducts = allProducts.length;
      diagnostic.indexedDBStatus.products = allProducts.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        stock: p.stock,
        precio: p.precio,
      }));

      // 3. VERIFICAR COINCIDENCIAS CON EL CARRITO
      diagnostic.productMatch = {};
      for (const item of items) {
        const match = {
          cartItem: item,
          foundById: null,
          foundByName: null,
          exactMatch: null,
        };

        // Buscar por ID exacto
        match.foundById = allProducts.find((p) => p.id === item.id);

        // Buscar por nombre
        match.foundByName = allProducts.find(
          (p) => p.nombre?.toLowerCase() === item.nombre?.toLowerCase()
        );

        // Buscar coincidencia exacta
        match.exactMatch = allProducts.find(
          (p) =>
            p.id === item.id &&
            p.nombre?.toLowerCase() === item.nombre?.toLowerCase()
        );

        diagnostic.productMatch[item.id] = match;

        if (!match.foundById && !match.foundByName) {
          diagnostic.errors.push(
            `PRODUCTO NO ENCONTRADO: ${item.nombre} (ID: ${item.id})`
          );
        }
      }

      // 4. VERIFICAR MÉTODOS DE INDEXEDDB
      diagnostic.indexedDBStatus.methods = {};
      for (const item of items) {
        try {
          const directGet = await IndexedDBService.get("productos", item.id);
          diagnostic.indexedDBStatus.methods[item.id] = {
            directGet: directGet ? "SUCCESS" : "NULL",
            directGetData: directGet,
          };
        } catch (error) {
          diagnostic.indexedDBStatus.methods[item.id] = {
            directGet: "ERROR: " + error.message,
          };
        }
      }

      console.log("🔍 DIAGNÓSTICO COMPLETO:", diagnostic);
      setDebugInfo(diagnostic);

      return diagnostic;
    } catch (error) {
      console.error("❌ ERROR EN DIAGNÓSTICO:", error);
      diagnostic.errors.push(`Error en diagnóstico: ${error.message}`);
      setDebugInfo(diagnostic);
      return diagnostic;
    }
  };

  // ✅ FUNCIÓN PARA VERIFICAR STOCK CON DIAGNÓSTICO
  const checkStockAvailability = async () => {
    console.log("🔍 Verificando stock con diagnóstico...");

    const diagnostic = await runFullDiagnostic();
    const stockIssues = [];

    // Usar los datos del diagnóstico para verificar stock
    for (const item of items) {
      const match = diagnostic.productMatch[item.id];

      if (!match.foundById && !match.foundByName) {
        stockIssues.push({
          product: item.nombre,
          error: `NO ENCONTRADO EN INDEXEDDB`,
          diagnostic: {
            availableProducts: diagnostic.indexedDBStatus.products,
            directGetResult: diagnostic.indexedDBStatus.methods[item.id],
          },
        });
        continue;
      }

      // Usar el producto encontrado (priorizar por ID, luego por nombre)
      const product = match.foundById || match.foundByName;

      if (product.stock < item.quantity) {
        stockIssues.push({
          product: item.nombre,
          currentStock: product.stock,
          required: item.quantity,
          deficit: item.quantity - product.stock,
        });
      }
    }

    return stockIssues;
  };

  // ✅ FUNCIÓN MEJORADA PARA ACTUALIZAR STOCK
  const updateProductStockOffline = async (productId, quantity) => {
    console.log(`🔄 Actualizando stock: ${productId} -${quantity}`);

    try {
      // PRIMERO: Diagnosticar antes de la operación
      const diagnostic = await runFullDiagnostic();
      const item = items.find((item) => item.id === productId);
      const match = diagnostic.productMatch[productId];

      if (!match.foundById && !match.foundByName) {
        throw new Error(
          `PRODUCTO NO ENCONTRADO EN DIAGNÓSTICO: ${item?.nombre} (${productId})`
        );
      }

      // USAR el producto del diagnóstico
      const product = match.foundById || match.foundByName;
      console.log(`✅ Producto para actualizar:`, product);

      const newStock = product.stock - quantity;

      if (newStock < 0) {
        throw new Error(
          `Stock insuficiente: ${product.stock} disponible, ${quantity} requerido`
        );
      }

      // ✅ ACTUALIZACIÓN MEJORADA - usar put con el objeto completo
      const updatedProduct = {
        ...product,
        stock: newStock,
        last_updated: new Date().toISOString(),
      };

      console.log(`💾 Guardando producto actualizado:`, updatedProduct);

      // ✅ USAR PUT EN LUGAR DE UPDATE
      await IndexedDBService.put("productos", updatedProduct);

      console.log(
        `✅ Stock actualizado: ${product.nombre} (${product.stock} → ${newStock})`
      );

      // ✅ VERIFICACIÓN MEJORADA
      const verifyProduct = await IndexedDBService.get("productos", productId);
      if (!verifyProduct || verifyProduct.stock !== newStock) {
        console.error("❌ Verificación fallida:", verifyProduct);
        throw new Error(
          "La actualización de stock no se verificó correctamente"
        );
      }

      console.log(`✅ Verificación exitosa:`, verifyProduct);

      return {
        success: true,
        newStock,
        productName: product.nombre,
        verification: verifyProduct,
      };
    } catch (error) {
      console.error(`❌ Error crítico actualizando stock:`, error);
      return {
        success: false,
        error: error.message,
        diagnostic: await runFullDiagnostic(),
      };
    }
  };

  const handleProcessSale = async () => {
    console.log("💰 INICIANDO VENTA CON CONTROL DE STOCK");

    // ✅ BLOQUEAR PROCESAMIENTO SIMULTÁNEO
    if (processing) {
      console.warn("⚠️ Venta ya en proceso, ignorando...");
      return;
    }

    setProcessing(true);

    try {
      // ✅ VERIFICAR STOCK UNA SOLA VEZ
      setStockUpdateStatus({ updating: true, message: "Verificando stock..." });
      const stockIssues = await checkStockAvailability();

      if (stockIssues.length > 0) {
        const issueText = stockIssues
          .map((issue) =>
            issue.error
              ? `❌ ${issue.product}: ${issue.error}`
              : `⚠️ ${issue.product}: Stock insuficiente (${issue.currentStock} disponible, necesita ${issue.required})`
          )
          .join("\n");

        throw new Error(`Problemas de stock:\n${issueText}`);
      }

      // El stock se actualizará en salesActions.js
      setStockUpdateStatus({ updating: true, message: "Creando venta..." });

      const productosConCosto = items.map((item) => ({
        producto_id: item.id,
        cantidad: parseInt(item.quantity),
        precio_unitario: parseFloat(item.precio),
        precio_compra: parseFloat(item.precio * 0.8),
        subtotal: parseFloat(item.precio * item.quantity),
        nombre: item.nombre,
        producto_nombre: item.nombre,
      }));

      const saleData = {
        sesion_caja_id: sesionAbierta.id || sesionAbierta.id_local,
        vendedor_id: user.id,
        total: total,
        metodo_pago: paymentMethod,
        ...(paymentMethod === "efectivo" && {
          efectivo_recibido: parseFloat(cashAmount),
          cambio: parseFloat(change),
        }),
        productos: productosConCosto,
        es_offline: !navigator.onLine,
        timestamp_offline: new Date().toISOString(),
        ganancia_bruta: isAdmin ? calculateProfit() : 0,
      };

      console.log("📤 Enviando venta al sistema...");

      // ✅ DELEGAR LA ACTUALIZACIÓN DE STOCK A salesActions.js
      const resultadoVenta = await dispatch(createSale(saleData));

      if (!resultadoVenta?.success) {
        throw new Error(resultadoVenta?.error || "Error al crear la venta");
      }

      // ✅ ÉXITO - NO ACTUALIZAR STOCK MANUALMENTE
      dispatch(clearCart());

      setStockUpdateStatus({
        updating: false,
        success: true,
        message: "✅ Venta completada",
      });

      // ✅ MOSTRAR ALERTA DE ÉXITO Y CERRAR MODAL
      await Swal.fire({
        title: "¡Venta Exitosa!",
        text: "La venta se ha procesado correctamente",
        icon: "success",
        confirmButtonText: "Aceptar",
        timer: 3000,
        timerProgressBar: true,
      });

      // ✅ CERRAR MODAL Y EJECUTAR CALLBACK DE ÉXITO
      onClose();
      if (onSuccess) {
        onSuccess(resultadoVenta);
      }
    } catch (error) {
      console.error("❌ Error en venta:", error);

      // ✅ MOSTRAR ALERTA DE ERROR
      await Swal.fire({
        title: "Error en Venta",
        text: error.message,
        icon: "error",
        confirmButtonText: "Aceptar",
      });

      setStockUpdateStatus({
        updating: false,
        success: false,
        message: error.message,
      });

      // Ejecutar callback de error si existe
      if (onError) {
        onError(error);
      }

      // Recargar productos para restaurar estado
      await dispatch(loadProducts());
    } finally {
      setProcessing(false);
    }
  };

  // ✅ COMPONENTE DE RESUMEN CON GANANCIA BRUTA CONDICIONAL
  const ProfitSummary = () => {
    if (!isAdmin) return null;

    const profit = calculateProfit();

    return (
      <div className={styles.profitSummary}>
        <div className={styles.profitRow}>
          <span>Ganancia Bruta Estimada:</span>
          <span className={styles.profitAmount}>${profit.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  // ✅ COMPONENTE DE DEBUG CLICKEABLE
  const DebugPanel = () => {
    const [showDetails, setShowDetails] = useState(false);

    if (Object.keys(debugInfo).length === 0) return null;

    return (
      <div className={styles.debugPanel}>
        <div
          className={styles.debugHeader}
          onClick={() => setShowDetails(!showDetails)}
          style={{
            cursor: "pointer",
            padding: "10px",
            background: "#f5f5f5",
            border: "1px solid #ddd",
          }}
        >
          <strong>🩺 DIAGNÓSTICO INDEXEDDB</strong>
          <span style={{ float: "right" }}>
            {showDetails ? "▲" : "▼"}
            {debugInfo.errors?.length > 0
              ? ` ❌ ${debugInfo.errors.length} errores`
              : " ✅ OK"}
          </span>
        </div>

        {showDetails && (
          <div
            className={styles.debugDetails}
            style={{
              padding: "10px",
              background: "#fff",
              border: "1px solid #ddd",
              fontSize: "12px",
            }}
          >
            <div>
              <strong>Productos en IndexedDB:</strong>{" "}
              {debugInfo.indexedDBStatus?.totalProducts || 0}
            </div>
            <div>
              <strong>Productos en carrito:</strong>{" "}
              {debugInfo.cartItems?.length || 0}
            </div>

            {debugInfo.errors?.length > 0 && (
              <div style={{ color: "red", marginTop: "10px" }}>
                <strong>ERRORES:</strong>
                <ul>
                  {debugInfo.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: "10px" }}>
              <strong>COINCIDENCIAS:</strong>
              {debugInfo.cartItems?.map((item) => {
                const match = debugInfo.productMatch?.[item.id];
                return (
                  <div
                    key={item.id}
                    style={{
                      margin: "5px 0",
                      padding: "5px",
                      background: match?.foundById ? "#e8f5e8" : "#ffe8e8",
                    }}
                  >
                    <div>
                      <strong>{item.nombre}</strong> (ID: {item.id})
                    </div>
                    <div>Por ID: {match?.foundById ? "✅" : "❌"}</div>
                    <div>Por nombre: {match?.foundByName ? "✅" : "❌"}</div>
                    {match?.foundById && (
                      <div>Stock: {match.foundById.stock}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                console.log("🔍 DIAGNÓSTICO COMPLETO:", debugInfo);
                Swal.fire({
                  title: "Diagnóstico en Consola",
                  text: "Revisa la consola del navegador para ver todos los detalles",
                  icon: "info",
                });
              }}
              style={{ marginTop: "10px", padding: "5px 10px" }}
            >
              📋 Ver en Consola
            </button>
          </div>
        )}
      </div>
    );
  };

  // Reset cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod("efectivo");
      setCashAmount("");
      setProcessing(false);
      setStockUpdateStatus({});
      setDebugInfo({});

      // Ejecutar diagnóstico automáticamente
      setTimeout(() => runFullDiagnostic(), 500);
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Procesar Pago" size="large">
      <div className={styles.paymentModal}>
        {/* Estado de procesamiento */}
        {stockUpdateStatus.updating && (
          <div className={styles.processingOverlay}>
            <div className={styles.processingContent}>
              <div className={styles.spinner}></div>
              <p>{stockUpdateStatus.message}</p>
            </div>
          </div>
        )}

        {/* Panel de diagnóstico */}
        <DebugPanel />

        {/* Alertas */}
        {!sesionAbierta && (
          <div className={styles.alertWarning}>
            ⚠️ No hay sesión de caja activa
          </div>
        )}

        {!navigator.onLine && (
          <div className={styles.alertInfo}>
            📱 Modo Offline - Las ventas se guardarán localmente
          </div>
        )}

        {/* Contenido normal del modal */}
        <div className={styles.orderSummary}>
          <h4>Resumen de la Venta</h4>
          <div className={styles.orderItems}>
            {items.map((item) => (
              <div key={item.id} className={styles.orderItem}>
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>{item.nombre}</span>
                  <span className={styles.itemQuantity}>x{item.quantity}</span>
                </div>
                <div className={styles.itemDetails}>
                  <span className={styles.itemPrice}>
                    ${(item.precio * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.orderTotal}>
            <span>Total a Pagar:</span>
            <span className={styles.totalAmount}>${total.toFixed(2)}</span>
          </div>

          {/* ✅ MOSTRAR GANANCIA BRUTA SOLO PARA ADMIN */}
          <ProfitSummary />
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
                <div className={`${styles.cashRow} ${styles.changeRow}`}>
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
