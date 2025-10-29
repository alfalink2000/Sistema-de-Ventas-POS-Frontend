// components/features/caja/CierreCajaModal/CierreCajaModal.jsx - IMPORTS CORREGIDOS
import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { closeSesionCaja } from "../../../../actions/sesionesCajaActions";
import {
  createClosure,
  calculateClosureTotals,
} from "../../../../actions/closuresActions";
import OfflineClosureService from "../../../../services/OfflineClosureService";
import IndexedDBService from "../../../../services/IndexedDBService";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import {
  FiWifi,
  FiWifiOff,
  FiDollarSign,
  FiClock,
  FiShoppingCart,
  FiBarChart2,
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

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isOnline = navigator.onLine;

  // ✅ CALCULAR TOTALES (ONLINE Y OFFLINE) - COMPLETAMENTE CORREGIDO
  const calcularTotalesCompletos = useCallback(async () => {
    if (!sesion) return;

    setCalculating(true);
    setErrorCalculo(null);

    try {
      let totals;
      const sesionId = sesion.id || sesion.id_local;

      console.log(`🔄 Calculando totales para sesión: ${sesionId}`, {
        isOnline,
        sesion,
      });

      if (isOnline && sesion.id) {
        // ✅ MODO ONLINE: usar la acción de Redux
        try {
          totals = await dispatch(calculateClosureTotals(sesion.id));
          console.log("📊 Totales online obtenidos:", totals);
        } catch (onlineError) {
          console.warn(
            "⚠️ Error en cálculo online, intentando offline:",
            onlineError
          );
          // Fallback a cálculo offline si falla online
          totals = await OfflineClosureService.calculateClosureTotals(sesionId);
        }
      } else {
        // ✅ MODO OFFLINE: usar el servicio offline
        totals = await OfflineClosureService.calculateClosureTotals(sesionId);
        console.log("📊 Totales offline calculados:", totals);
      }

      const saldoInicial = sesion.saldo_inicial || 0;
      const saldoFinalTeorico = saldoInicial + (totals.total_efectivo || 0);

      const totalesCompletos = {
        ...totals,
        saldo_final_teorico: saldoFinalTeorico,
        saldo_inicial: saldoInicial,
      };

      setTotales(totalesCompletos);

      // ✅ SETEAR SUGERENCIA SOLO SI NO HAY VALOR PREVIO
      if (!saldoFinalReal) {
        setSaldoFinalReal(saldoFinalTeorico.toFixed(2));
      }

      console.log("✅ Totales establecidos:", totalesCompletos);
    } catch (error) {
      console.error("❌ Error calculando totales:", error);
      setErrorCalculo(
        "No se pudieron calcular los totales. Verifica las ventas."
      );

      // Establecer totales por defecto
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

  // ✅ EFECTO PARA CALCULAR AL ABRIR EL MODAL
  useEffect(() => {
    if (isOpen && sesion) {
      console.log("🎯 Modal abierto, calculando totales...");
      calcularTotalesCompletos();
    }
  }, [isOpen, sesion, calcularTotalesCompletos]);

  // ✅ CALCULAR DIFERENCIA EN TIEMPO REAL
  useEffect(() => {
    if (totales && saldoFinalReal) {
      const saldoRealNum = parseFloat(saldoFinalReal) || 0;
      const diferenciaCalculada = saldoRealNum - totales.saldo_final_teorico;
      setDiferencia(diferenciaCalculada);
    } else {
      setDiferencia(0);
    }
  }, [saldoFinalReal, totales]);

  // ✅ MANEJAR CIERRE DE CAJA (ONLINE Y OFFLINE) - COMPLETAMENTE CORREGIDO
  const handleCerrarSesion = async () => {
    const saldoFinalNumero = parseFloat(saldoFinalReal);

    // Validaciones
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
        sesion_caja_id: sesion.id, // Para online
        sesion_caja_id_local: sesion.id_local || sesionId, // Para offline
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
        // ✅ MODO ONLINE
        console.log("🔄 Creando cierre online:", closureData);

        result = await dispatch(createClosure(closureData));

        if (result && result.success !== false) {
          // Cerrar la sesión en el servidor
          await dispatch(
            closeSesionCaja(sesion.id, {
              saldo_final: saldoFinalNumero,
              observaciones: observaciones.trim() || null,
            })
          );

          console.log("✅ Cierre online completado exitosamente");
        } else {
          throw new Error(
            result?.error || "Error al crear cierre de caja online"
          );
        }
      } else {
        // ✅ MODO OFFLINE
        console.log("📴 Creando cierre offline:", closureData);

        result = await OfflineClosureService.createOfflineClosure(closureData);

        if (!result.success) {
          throw new Error(result.error);
        }

        // Marcar sesión como cerrada localmente
        if (sesion.id_local || sesionId) {
          const sesionActualizada = {
            ...sesion,
            estado: "cerrada",
            fecha_cierre: new Date().toISOString(),
            saldo_final: saldoFinalNumero,
            observaciones: observaciones.trim() || null,
            sincronizado: false,
          };

          await IndexedDBService.put(
            "sesiones_caja_offline",
            sesionActualizada
          );
          console.log("✅ Sesión marcada como cerrada localmente");
        }

        console.log("✅ Cierre offline guardado exitosamente");
      }

      // Mostrar confirmación
      await Swal.fire({
        icon: "success",
        title: isOnline ? "Cierre Completado" : "Cierre Guardado (Offline)",
        text: isOnline
          ? "La sesión de caja ha sido cerrada exitosamente"
          : "El cierre se guardó localmente y se sincronizará cuando haya conexión",
        confirmButtonText: "Aceptar",
      });

      // Cerrar modal y resetear estado
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

  // ✅ CERRAR MODAL Y RESETEAR ESTADO
  const handleCloseModal = () => {
    setSaldoFinalReal("");
    setObservaciones("");
    setTotales(null);
    setDiferencia(0);
    setErrorCalculo(null);
    onClose();
  };

  // ✅ REINTENTAR CÁLCULO
  const handleRetryCalculation = () => {
    calcularTotalesCompletos();
  };

  // ✅ NUEVO: FUNCIÓN DE DIAGNÓSTICO DETALLADO
  const handleDiagnosticar = async () => {
    if (!sesion) return;

    const sesionId = sesion.id_local || sesion.id;
    console.log("🔍 Ejecutando diagnóstico detallado para sesión:", sesionId);

    const diagnostico = await OfflineClosureService.diagnosticarProblema(
      sesionId
    );
    console.log("📊 Resultado diagnóstico:", diagnostico);

    // Mostrar resultado en alerta detallada
    const ventasEnSesion = diagnostico.ventasSesion || [];

    await Swal.fire({
      title: "🔍 Diagnóstico Offline",
      html: `
        <div style="text-align: left; font-size: 14px;">
          <h4>📋 Sesión:</h4>
          <pre>${JSON.stringify(diagnostico.sesion, null, 2)}</pre>
          
          <h4>📊 Resumen:</h4>
          <ul>
            <li>Total ventas en DB: ${
              diagnostico.resumen?.totalVentas || 0
            }</li>
            <li>Ventas en esta sesión: <strong>${
              diagnostico.resumen?.ventasEnSesion || 0
            }</strong></li>
            <li>Total detalles en DB: ${
              diagnostico.resumen?.totalDetalles || 0
            }</li>
          </ul>
          
          <h4>🎯 Ventas de esta sesión (${ventasEnSesion.length}):</h4>
          ${
            ventasEnSesion.length > 0
              ? `<pre>${JSON.stringify(ventasEnSesion, null, 2)}</pre>`
              : '<p style="color: red;">❌ NO SE ENCONTRARON VENTAS PARA ESTA SESIÓN</p>'
          }
          
          <h4>📦 Todas las ventas (${
            diagnostico.todasVentas?.length || 0
          }):</h4>
          <details>
            <summary>Ver todas las ventas</summary>
            <pre>${JSON.stringify(diagnostico.todasVentas, null, 2)}</pre>
          </details>
        </div>
      `,
      width: 1000,
      confirmButtonText: "Entendido",
    });
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
            🔍 Diagnosticar
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
