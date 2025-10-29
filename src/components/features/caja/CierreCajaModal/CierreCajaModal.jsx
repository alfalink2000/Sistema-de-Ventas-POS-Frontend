// components/features/caja/CierreCajaModal/CierreCajaModal.jsx - ACTUALIZADO
import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { closeSesionCaja } from "../../../../actions/sesionesCajaActions";
import {
  createClosure,
  calculateClosureTotals,
} from "../../../../actions/closuresActions";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import { FiWifi, FiWifiOff } from "react-icons/fi";
import styles from "./CierreCajaModal.module.css";

const CierreCajaModal = ({ isOpen, onClose, sesion }) => {
  const [saldoFinalReal, setSaldoFinalReal] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [processing, setProcessing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [totales, setTotales] = useState(null);
  const [diferencia, setDiferencia] = useState(0);

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isOnline = navigator.onLine;

  // ✅ CALCULAR TOTALES AL ABRIR EL MODAL
  const calcularTotalesCompletos = useCallback(async () => {
    if (!sesion?.id) return;

    setCalculating(true);
    try {
      const totals = await dispatch(calculateClosureTotals(sesion.id));

      const saldoFinalTeorico =
        (sesion.saldo_inicial || 0) + (totals.total_efectivo || 0);

      setTotales({
        ...totals,
        saldo_final_teorico: saldoFinalTeorico,
      });

      // ✅ SOLO SETEAR SUGERENCIA SI NO HAY VALOR PREVIO
      if (!saldoFinalReal) {
        setSaldoFinalReal(saldoFinalTeorico.toFixed(2));
        setDiferencia(0); // Inicialmente no hay diferencia
      }
    } catch (error) {
      console.error("Error calculando totales:", error);
      setTotales({
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        total_transferencia: 0,
        ganancia_bruta: 0,
        cantidad_ventas: 0,
        saldo_final_teorico: sesion?.saldo_inicial || 0,
      });
    } finally {
      setCalculating(false);
    }
  }, [sesion, dispatch, saldoFinalReal]);

  // ✅ EFECTO PARA CALCULAR TOTALES AL ABRIR
  useEffect(() => {
    if (isOpen && sesion) {
      calcularTotalesCompletos();
    }
  }, [isOpen, sesion, calcularTotalesCompletos]);

  // ✅ EFECTO SEPARADO PARA CALCULAR DIFERENCIA EN TIEMPO REAL
  useEffect(() => {
    if (totales && saldoFinalReal) {
      const saldoRealNum = parseFloat(saldoFinalReal);
      const diferenciaCalculada = saldoRealNum - totales.saldo_final_teorico;

      // ✅ ACTUALIZAR SOLO LA DIFERENCIA, NO TODO EL OBJETO TOTALES
      setDiferencia(diferenciaCalculada);
    } else {
      setDiferencia(0);
    }
  }, [saldoFinalReal, totales]);

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

    setProcessing(true);
    try {
      const closureData = {
        sesion_caja_id: sesion.id,
        vendedor_id: user.id,
        total_ventas: totales?.total_ventas || 0,
        total_efectivo: totales?.total_efectivo || 0,
        total_tarjeta: totales?.total_tarjeta || 0,
        ganancia_bruta: totales?.ganancia_bruta || 0,
        saldo_final_teorico: totales?.saldo_final_teorico || 0,
        saldo_final_real: saldoFinalNumero,
        diferencia: diferencia,
        observaciones: observaciones.trim() || null,
      };

      console.log("🔄 Creando cierre de caja:", closureData);
      const cierreCreado = await dispatch(createClosure(closureData));

      if (!cierreCreado || !cierreCreado.success) {
        throw new Error(cierreCreado?.error || "Error al crear cierre de caja");
      }

      // ✅ CERRAR LA SESIÓN
      await dispatch(
        closeSesionCaja(sesion.id, {
          saldo_final: saldoFinalNumero,
          observaciones: observaciones.trim() || null,
        })
      );

      console.log("✅ Sesión y cierre completados exitosamente");

      // ✅ CORREGIDO: Cerrar modal después de completar
      onClose();
      setSaldoFinalReal("");
      setObservaciones("");
      setTotales(null);
      setDiferencia(0);
    } catch (error) {
      console.error("❌ Error en cierre de caja:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setSaldoFinalReal("");
    setObservaciones("");
    setTotales(null);
    setDiferencia(0);
    onClose();
  };

  if (!sesion) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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
          <h4>📋 Información de la Sesión</h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span>Fecha Apertura:</span>
              <span>{new Date(sesion.fecha_apertura).toLocaleString()}</span>
            </div>
            <div className={styles.infoItem}>
              <span>Saldo Inicial:</span>
              <span className={styles.highlight}>
                ${sesion.saldo_inicial?.toFixed(2)}
              </span>
            </div>
            {sesion.id_local && !sesion.sincronizado && (
              <div className={styles.infoItem}>
                <span>Estado:</span>
                <span className={styles.localBadge}>Sesión Local</span>
              </div>
            )}
          </div>
        </div>

        {/* Resumen de Ventas */}
        {calculating ? (
          <div className={styles.calculating}>
            <div className={styles.spinner}></div>
            <p>
              {isOnline
                ? "Calculando totales de ventas..."
                : "Calculando totales localmente..."}
            </p>
          </div>
        ) : (
          totales && (
            <div className={styles.salesSummary}>
              <h4>💰 Resumen de Ventas</h4>
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
                  <span>Ganancia Bruta:</span>
                  <span className={styles.profitHighlight}>
                    +${totales.ganancia_bruta?.toFixed(2)}
                  </span>
                </div>
                <div className={styles.totalItem}>
                  <span>Cantidad Ventas:</span>
                  <span>{totales.cantidad_ventas}</span>
                </div>
              </div>
            </div>
          )
        )}

        {/* Cálculos de Caja */}
        {totales && (
          <div className={styles.cashCalculations}>
            <h4>🧮 Cálculos de Caja</h4>
            <div className={styles.calculationGrid}>
              <div className={styles.calcItem}>
                <span>Saldo Inicial:</span>
                <span>${sesion.saldo_inicial?.toFixed(2)}</span>
              </div>
              <div className={styles.calcItem}>
                <span>+ Ventas Efectivo:</span>
                <span>${totales.total_efectivo?.toFixed(2)}</span>
              </div>
              <div className={styles.calcItem}>
                <span>Saldo Final Teórico:</span>
                <span className={styles.theoreticalHighlight}>
                  ${totales.saldo_final_teorico?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Entrada de Saldo Final Real */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            💵 Saldo Final Real (Contado Físicamente)
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
          />
        </div>

        {/* Diferencia Automática */}
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
              {diferencia > 0 ? "+" : ""}${diferencia.toFixed(2)}
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

        {/* Observaciones */}
        <div className={styles.formGroup}>
          <label className={styles.label}>📝 Observaciones (Opcional)</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas sobre el cierre..."
            rows="3"
            className={styles.textarea}
          />
        </div>

        {!isOnline && (
          <div className={styles.offlineWarning}>
            <strong>⚠️ Modo Offline</strong>
            <p>
              El cierre se guardará localmente y se sincronizará cuando
              recuperes la conexión.
            </p>
          </div>
        )}

        {/* Acciones */}
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleCerrarSesion}
            disabled={!saldoFinalReal || processing || calculating}
            loading={processing}
          >
            {processing ? "Procesando..." : "Confirmar Cierre de Caja"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CierreCajaModal;
