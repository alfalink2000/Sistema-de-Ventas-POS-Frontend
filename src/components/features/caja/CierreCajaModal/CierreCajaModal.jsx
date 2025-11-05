// components/features/caja/CierreCajaModal/CierreCajaModal.jsx - CORREGIDO
import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  closeSesionCaja,
  loadOpenSesion,
} from "../../../../actions/sesionesCajaActions";
import {
  createClosure,
  calculateClosureTotals,
} from "../../../../actions/closuresActions";
import ClosuresOfflineController from "../../../../controllers/offline/ClosuresOfflineController/ClosuresOfflineController";
import SessionsOfflineController from "../../../../controllers/offline/SessionsOfflineController/SessionsOfflineController";
import SalesOfflineController from "../../../../controllers/offline/SalesOfflineController/SalesOfflineController";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import Swal from "sweetalert2";
import { types } from "../../../../types/types";
import {
  FiWifi,
  FiWifiOff,
  FiDollarSign,
  FiClock,
  FiShoppingCart,
  FiBarChart2,
  FiPackage,
  FiList,
} from "react-icons/fi";
import styles from "./CierreCajaModal.module.css";

const CierreCajaModal = ({ isOpen, onClose, sesion }) => {
  const [saldoFinalReal, setSaldoFinalReal] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [processing, setProcessing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [totales, setTotales] = useState(null);
  const [diferencia, setDiferencia] = useState(0);
  const [errorCalculo, setErrorCalculo] = useState(null);
  const [detalleVentas, setDetalleVentas] = useState([]);
  const [productosVendidos, setProductosVendidos] = useState([]);

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isOnline = navigator.onLine;

  // ✅ CALCULAR TOTALES CON NUEVOS CONTROLADORES
  const calcularTotalesCompletos = useCallback(async () => {
    if (!sesion) return;

    setCalculating(true);
    setErrorCalculo(null);

    try {
      let totals;
      const sesionId = sesion.id || sesion.id_local;

      console.log(`🔄 Calculando totales para sesión: ${sesionId}`);

      if (isOnline && sesion.id) {
        try {
          // Intentar cálculo online primero
          totals = await dispatch(calculateClosureTotals(sesion.id));
        } catch (onlineError) {
          console.warn(
            "⚠️ Error en cálculo online, intentando offline:",
            onlineError
          );
          // Fallback a cálculo offline
          totals = await ClosuresOfflineController.calculateSessionTotals(
            sesionId
          );
        }
      } else {
        // Cálculo offline directo
        totals = await ClosuresOfflineController.calculateSessionTotals(
          sesionId
        );
      }

      const saldoInicial = sesion.saldo_inicial || 0;
      const saldoFinalTeorico = saldoInicial + (totals.total_efectivo || 0);

      const totalesCompletos = {
        ...totals,
        saldo_final_teorico: saldoFinalTeorico,
        saldo_inicial: saldoInicial,
      };

      setTotales(totalesCompletos);

      // Sugerir saldo final real basado en el teórico
      if (!saldoFinalReal) {
        setSaldoFinalReal(saldoFinalTeorico.toFixed(2));
      }
    } catch (error) {
      console.error("❌ Error calculando totales:", error);
      setErrorCalculo(
        "No se pudieron calcular los totales. Verifica las ventas."
      );

      // Datos por defecto en caso de error
      setTotales({
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        ganancia_bruta: 0,
        cantidad_ventas: 0,
        saldo_final_teorico: sesion?.saldo_inicial || 0,
        saldo_inicial: sesion?.saldo_inicial || 0,
      });
    } finally {
      setCalculating(false);
    }
  }, [sesion, dispatch, saldoFinalReal, isOnline]);

  useEffect(() => {
    if (isOpen && sesion) {
      calcularTotalesCompletos();
    }
  }, [isOpen, sesion, calcularTotalesCompletos]);

  useEffect(() => {
    if (totales && saldoFinalReal) {
      const saldoRealNum = parseFloat(saldoFinalReal) || 0;
      const diferenciaCalculada = saldoRealNum - totales.saldo_final_teorico;
      setDiferencia(diferenciaCalculada);
    } else {
      setDiferencia(0);
    }
  }, [saldoFinalReal, totales]);

  // ✅ FUNCIÓN DE DIAGNÓSTICO MEJORADA - ENFOCADA EN VENTAS Y PRODUCTOS
  const handleDiagnosticar = async () => {
    if (!sesion) return;

    const sesionId = sesion.id || sesion.id_local;

    try {
      console.log(`🔍 Iniciando diagnóstico para sesión: ${sesionId}`);

      // 1. Obtener ventas de la sesión
      const ventas = await SalesOfflineController.getSalesBySession(sesionId);
      console.log(`📊 Ventas encontradas: ${ventas.length}`, ventas);

      // 2. Obtener detalles de todas las ventas
      let todosLosDetalles = [];
      let todosLosProductos = [];

      for (const venta of ventas) {
        const detalles = await SalesOfflineController.getSaleDetails(
          venta.id_local
        );
        console.log(`📦 Detalles para venta ${venta.id_local}:`, detalles);

        todosLosDetalles = [...todosLosDetalles, ...detalles];

        // Procesar productos vendidos
        detalles.forEach((detalle) => {
          const productoExistente = todosLosProductos.find(
            (p) => p.producto_id === detalle.producto_id
          );
          if (productoExistente) {
            productoExistente.cantidad_total += detalle.cantidad;
            productoExistente.subtotal_total += detalle.subtotal;
          } else {
            todosLosProductos.push({
              producto_id: detalle.producto_id,
              nombre:
                detalle.producto_nombre || `Producto ${detalle.producto_id}`,
              cantidad_total: detalle.cantidad,
              subtotal_total: detalle.subtotal,
              precio_unitario: detalle.precio_unitario,
            });
          }
        });
      }

      setDetalleVentas(ventas);
      setProductosVendidos(todosLosProductos);

      // 3. Mostrar diagnóstico detallado
      const totalProductosVendidos = todosLosDetalles.reduce(
        (sum, detalle) => sum + detalle.cantidad,
        0
      );
      const totalVentasCalculado = ventas.reduce(
        (sum, venta) => sum + (venta.total || 0),
        0
      );
      const totalEfectivoCalculado = ventas
        .filter((v) => v.metodo_pago === "efectivo")
        .reduce((sum, venta) => sum + (venta.total || 0), 0);

      await Swal.fire({
        title: "Diagnóstico de Ventas",
        html: `
          <div style="text-align: left; font-size: 14px; max-height: 400px; overflow-y: auto;">
            <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
              <h4 style="margin: 0 0 10px 0; color: #333;">📊 Resumen General</h4>
              <p><strong>Total de Ventas:</strong> ${ventas.length}</p>
              <p><strong>Total Productos Vendidos:</strong> ${totalProductosVendidos}</p>
              <p><strong>Monto Total Ventas:</strong> $${totalVentasCalculado.toFixed(
                2
              )}</p>
              <p><strong>Total Efectivo:</strong> $${totalEfectivoCalculado.toFixed(
                2
              )}</p>
            </div>

            <div style="margin-bottom: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #333;">🛍️ Ventas Realizadas</h4>
              ${ventas
                .map(
                  (venta) => `
                <div style="padding: 8px; margin: 5px 0; background: #e9ecef; border-radius: 4px;">
                  <strong>Venta ${venta.id_local}</strong> - $${
                    venta.total?.toFixed(2) || "0.00"
                  } 
                  (${venta.metodo_pago || "efectivo"})<br/>
                  <small>Fecha: ${new Date(
                    venta.fecha_venta
                  ).toLocaleString()}</small>
                </div>
              `
                )
                .join("")}
            </div>

            <div>
              <h4 style="margin: 0 0 10px 0; color: #333;">📦 Productos Vendidos</h4>
              ${todosLosProductos
                .map(
                  (producto) => `
                <div style="padding: 6px; margin: 3px 0; background: #d1ecf1; border-radius: 3px;">
                  <strong>${producto.nombre}</strong><br/>
                  <small>Cantidad: ${
                    producto.cantidad_total
                  } | Total: $${producto.subtotal_total.toFixed(2)}</small>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `,
        width: 600,
        confirmButtonText: "Entendido",
      });
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      await Swal.fire({
        icon: "error",
        title: "Error en diagnóstico",
        text: "No se pudieron obtener los datos de ventas",
        confirmButtonText: "Entendido",
      });
    }
  };

  // ✅ MANEJAR CIERRE CON NUEVOS CONTROLADORES
  const handleCerrarSesion = async () => {
    const saldoFinalNumero = parseFloat(saldoFinalReal);

    if (!saldoFinalReal || isNaN(saldoFinalNumero) || saldoFinalNumero < 0) {
      await Swal.fire({
        icon: "error",
        title: "Saldo inválido",
        text: "Ingresa un saldo final válido (número positivo)",
        confirmButtonText: "Entendido",
      });
      return;
    }

    if (!sesion) {
      await Swal.fire({
        icon: "error",
        title: "Sesión no válida",
        text: "No se encontró la sesión de caja",
        confirmButtonText: "Entendido",
      });
      return;
    }

    setProcessing(true);

    try {
      const sesionId = sesion.id || sesion.id_local;
      const closureData = {
        sesion_caja_id: sesion.id || sesion.id_local,
        sesion_caja_id_local: sesion.id_local || sesionId,
        vendedor_id: user.id,
        vendedor_nombre: user.nombre || user.username,
        total_ventas: totales?.total_ventas || 0,
        total_efectivo: totales?.total_efectivo || 0,
        total_tarjeta: totales?.total_tarjeta || 0,
        total_transferencia: totales?.total_transferencia || 0,
        ganancia_bruta: totales?.ganancia_bruta || 0,
        saldo_inicial: totales?.saldo_inicial || sesion.saldo_inicial || 0,
        saldo_final_teorico: totales?.saldo_final_teorico || 0,
        saldo_final_real: saldoFinalNumero,
        diferencia: diferencia,
        observaciones: observaciones.trim() || null,
        fecha_apertura: sesion.fecha_apertura,
      };

      let result;

      if (isOnline && sesion.id) {
        // ✅ MODO ONLINE - Usar actions de Redux
        result = await dispatch(createClosure(closureData));

        if (result && result.success !== false) {
          // Cerrar sesión en servidor
          const closeResult = await dispatch(
            closeSesionCaja(sesion.id, {
              saldo_final: saldoFinalNumero,
              observaciones: observaciones.trim() || null,
            })
          );

          if (!closeResult || closeResult.success === false) {
            throw new Error(
              closeResult?.error || "Error al cerrar sesión online"
            );
          }
        } else {
          throw new Error(
            result?.error || "Error al crear cierre de caja online"
          );
        }
      } else {
        // ✅ MODO OFFLINE - Usar controladores offline
        console.log("📱 Creando cierre offline...");

        // 1. Crear cierre offline
        const closureResult = await ClosuresOfflineController.createClosure(
          closureData
        );

        if (!closureResult.success) {
          throw new Error(closureResult.error);
        }

        // 2. Cerrar sesión offline
        const closeSessionResult = await SessionsOfflineController.closeSession(
          sesionId,
          {
            saldo_final: saldoFinalNumero,
            observaciones: observaciones.trim() || null,
          }
        );

        if (!closeSessionResult.success) {
          throw new Error(closeSessionResult.error);
        }

        result = {
          success: true,
          cierre: closureResult.cierre,
          message:
            "Cierre guardado localmente. Se sincronizará cuando haya conexión.",
        };

        // ✅ DISPATCH PARA ACTUALIZAR ESTADO LOCAL - SESIÓN
        dispatch({
          type: types.sesionCajaClosedOffline,
          payload: closeSessionResult.sesion,
        });

        // ✅ DISPATCH PARA ACTUALIZAR ESTADO LOCAL - CIERRE (NUEVO)
        dispatch({
          type: types.closureAddNewOffline,
          payload: closureResult.cierre,
        });

        console.log("✅ Cierre y sesión cerrados localmente");
      }

      // ✅ MOSTRAR CONFIRMACIÓN
      await Swal.fire({
        icon: "success",
        title: isOnline ? "Cierre Completado" : "Cierre Guardado (Offline)",
        text: isOnline
          ? "La sesión de caja ha sido cerrada exitosamente"
          : "El cierre se guardó localmente y se sincronizará cuando haya conexión",
        confirmButtonText: "Aceptar",
      });

      // ✅ FORZAR RECARGA DE SESIÓN ABIERTA
      if (user?.id) {
        setTimeout(() => {
          dispatch(loadOpenSesion(user.id));
        }, 1000);
      }

      handleCloseModal();
    } catch (error) {
      console.error("❌ Error en cierre de caja:", error);

      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Ocurrió un error al cerrar la caja",
        confirmButtonText: "Entendido",
      });
    } finally {
      setProcessing(false);
    }
  };

  // ✅ CERRAR MODAL
  const handleCloseModal = () => {
    setSaldoFinalReal("");
    setObservaciones("");
    setTotales(null);
    setDiferencia(0);
    setErrorCalculo(null);
    setDetalleVentas([]);
    setProductosVendidos([]);
    onClose();
  };

  const handleRetryCalculation = () => {
    calcularTotalesCompletos();
  };

  if (!sesion) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleCloseModal}
        title="Cerrar Sesión de Caja"
      >
        <div className={styles.errorState}>
          <p>No se encontró la sesión de caja</p>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cerrar
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title="Cerrar Sesión de Caja"
      size="large"
    >
      <div className={styles.modalContent}>
        {/* Indicador de estado de conexión */}
        <div
          className={`${styles.connectionStatus} ${
            isOnline ? styles.online : styles.offline
          }`}
        >
          {isOnline ? (
            <>
              <FiWifi className={styles.connectionIcon} />
              <span>Conectado - Los datos se guardarán en el servidor</span>
            </>
          ) : (
            <>
              <FiWifiOff className={styles.connectionIcon} />
              <span>Sin conexión - Los datos se guardarán localmente</span>
            </>
          )}
        </div>

        {/* Información de la Sesión */}
        <div className={styles.sessionInfo}>
          <h4>
            <FiClock className={styles.sectionIcon} />
            Información de la Sesión
          </h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span>Fecha Apertura:</span>
              <span>
                {new Date(sesion.fecha_apertura).toLocaleString("es-MX")}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span>Saldo Inicial:</span>
              <span className={styles.highlight}>
                ${sesion.saldo_inicial?.toFixed(2)}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span>Estado:</span>
              <span
                className={isOnline ? styles.onlineBadge : styles.localBadge}
              >
                {isOnline ? "Sincronizada" : "Sesión Local"}
              </span>
            </div>
          </div>
        </div>

        {/* Resumen de Ventas */}
        <div className={styles.salesSummary}>
          <h4>
            <FiShoppingCart className={styles.sectionIcon} />
            Resumen de Ventas
            {!isOnline && <span className={styles.offlineBadge}>Local</span>}
          </h4>

          {calculating ? (
            <div className={styles.calculating}>
              <div className={styles.spinner}></div>
              <p>
                {isOnline
                  ? "Calculando totales de ventas..."
                  : "Calculando totales localmente..."}
              </p>
            </div>
          ) : errorCalculo ? (
            <div className={styles.calculationError}>
              <p>{errorCalculo}</p>
              <Button variant="secondary" onClick={handleRetryCalculation}>
                Reintentar Cálculo
              </Button>
              <Button
                variant="outline"
                onClick={handleDiagnosticar}
                style={{ marginLeft: "8px" }}
              >
                <FiList style={{ marginRight: "4px" }} />
                Diagnosticar Ventas
              </Button>
            </div>
          ) : (
            totales && (
              <>
                <div className={styles.totalesGrid}>
                  <div className={styles.totalItem}>
                    <span>Total Ventas:</span>
                    <span>${totales.total_ventas?.toFixed(2)}</span>
                  </div>
                  <div className={styles.totalItem}>
                    <span>Ventas Efectivo:</span>
                    <span>${totales.total_efectivo?.toFixed(2)}</span>
                  </div>
                  <div className={styles.totalItem}>
                    <span>Ventas Tarjeta:</span>
                    <span>${totales.total_tarjeta?.toFixed(2)}</span>
                  </div>
                  <div className={styles.totalItem}>
                    <span>Cantidad Ventas:</span>
                    <span>
                      <FiPackage style={{ marginRight: "4px" }} />
                      {totales.cantidad_ventas}
                    </span>
                  </div>
                </div>

                {/* Cálculos de Caja */}
                <div className={styles.cashCalculations}>
                  <h5>
                    <FiBarChart2 className={styles.sectionIcon} />
                    Cálculos de Caja
                  </h5>
                  <div className={styles.calculationGrid}>
                    <div className={styles.calcItem}>
                      <span>Saldo Inicial:</span>
                      <span>${totales.saldo_inicial?.toFixed(2)}</span>
                    </div>
                    <div className={styles.calcItem}>
                      <span>+ Ventas Efectivo:</span>
                      <span>+${totales.total_efectivo?.toFixed(2)}</span>
                    </div>
                    <div className={styles.calcItem}>
                      <span>Saldo Final Teórico:</span>
                      <span className={styles.theoreticalHighlight}>
                        ${totales.saldo_final_teorico?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )
          )}
        </div>

        {/* Entrada de Saldo Final Real */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            <FiDollarSign className={styles.labelIcon} />
            Saldo Final Real (Contado Físicamente)
            <small>Ingresa el monto real que cuentas en caja</small>
          </label>
          <input
            type="number"
            value={saldoFinalReal}
            onChange={(e) => setSaldoFinalReal(e.target.value)}
            placeholder={totales?.saldo_final_teorico?.toFixed(2) || "0.00"}
            step="0.01"
            min="0"
            className={styles.input}
            disabled={calculating}
          />
        </div>

        {/* Diferencia Automática */}
        {saldoFinalReal && (
          <div className={styles.differenceSection}>
            <div
              className={`${styles.difference} ${
                diferencia === 0
                  ? styles.exact
                  : diferencia > 0
                  ? styles.surplus
                  : styles.shortage
              }`}
            >
              <span>Diferencia:</span>
              <span className={styles.differenceAmount}>
                {diferencia > 0 ? "+" : ""}${Math.abs(diferencia).toFixed(2)}
              </span>
            </div>
            <small className={styles.differenceHelp}>
              {diferencia === 0
                ? "✅ Perfecto, la caja cuadra exactamente"
                : diferencia > 0
                ? "📈 Hay sobrante en caja"
                : "📉 Hay faltante en caja"}
            </small>
          </div>
        )}

        {/* Observaciones */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            📝 Observaciones (Opcional)
            <small>Notas sobre el cierre, diferencias, etc...</small>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej: Cierre normal, sin novedades..."
            rows="3"
            className={styles.textarea}
            disabled={processing}
          />
        </div>

        {!isOnline && (
          <div className={styles.offlineWarning}>
            <strong>⚠️ Modo Offline</strong>
            <p>
              El cierre se guardará localmente y se sincronizará automáticamente
              cuando recuperes la conexión a internet.
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className={styles.actions}>
          <Button
            variant="outline"
            onClick={handleDiagnosticar}
            disabled={processing}
            style={{
              marginRight: "auto",
              backgroundColor: "#f0f9ff",
              borderColor: "#0ea5e9",
              color: "#0369a1",
            }}
          >
            <FiList style={{ marginRight: "4px" }} />
            Diagnosticar Ventas
          </Button>

          <Button
            variant="secondary"
            onClick={handleCloseModal}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleCerrarSesion}
            disabled={
              !saldoFinalReal || processing || calculating || !!errorCalculo
            }
            loading={processing}
          >
            {processing
              ? "Procesando..."
              : isOnline
              ? "Confirmar Cierre"
              : "Guardar Cierre (Offline)"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CierreCajaModal;
