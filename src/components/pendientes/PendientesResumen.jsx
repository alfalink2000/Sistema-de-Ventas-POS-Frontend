import React from "react";
import {
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiDollarSign,
  FiInfo,
} from "react-icons/fi";
import styles from "./PendientesResumen.module.css";

const PendientesResumen = ({ pendientesTotals, onVerDetalles, sesionId }) => {
  if (!pendientesTotals) {
    return (
      <div className={styles.pendientesResumen}>
        <div className={styles.header}>
          <h4>
            <FiClock className={styles.sectionIcon} />
            Pendientes e Imprevistos
          </h4>
          <span className={styles.loadingText}>Cargando...</span>
        </div>
      </div>
    );
  }

  // Calcular impacto neto
  const impactoNeto =
    (pendientesTotals.total_ingresos || 0) -
    (pendientesTotals.total_retiros || 0);
  const hayMovimientos =
    (pendientesTotals.cantidad_retiros || 0) +
      (pendientesTotals.cantidad_ingresos || 0) +
      (pendientesTotals.cantidad_pendientes || 0) >
    0;

  if (!hayMovimientos) {
    return (
      <div className={styles.pendientesResumen}>
        <div className={styles.header}>
          <h4>
            <FiClock className={styles.sectionIcon} />
            Pendientes e Imprevistos
          </h4>
        </div>
        <div className={styles.sinMovimientos}>
          <FiInfo className={styles.infoIcon} />
          <span>No hay movimientos pendientes registrados</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pendientesResumen}>
      <div className={styles.header}>
        <h4>
          <FiClock className={styles.sectionIcon} />
          Pendientes e Imprevistos
        </h4>
        <button
          className={styles.verDetallesBtn}
          onClick={onVerDetalles}
          title="Ver detalles completos de pendientes"
        >
          Ver Detalles
        </button>
      </div>

      <div className={styles.grid}>
        {/* RETIROS */}
        <div className={styles.card}>
          <div className={styles.cardHeader} style={{ color: "#dc2626" }}>
            <FiTrendingDown />
            <span>Retiros de Efectivo</span>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.monto} style={{ color: "#dc2626" }}>
              -${(pendientesTotals.total_retiros || 0).toFixed(2)}
            </div>
            <div className={styles.detalle}>
              {pendientesTotals.cantidad_retiros || 0} retiro(s)
            </div>
            <div className={styles.descripcion}>Salidas de dinero de caja</div>
          </div>
        </div>

        {/* INGRESOS */}
        <div className={styles.card}>
          <div className={styles.cardHeader} style={{ color: "#16a34a" }}>
            <FiTrendingUp />
            <span>Ingresos de Efectivo</span>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.monto} style={{ color: "#16a34a" }}>
              +${(pendientesTotals.total_ingresos || 0).toFixed(2)}
            </div>
            <div className={styles.detalle}>
              {pendientesTotals.cantidad_ingresos || 0} ingreso(s)
            </div>
            <div className={styles.descripcion}>Entradas de dinero a caja</div>
          </div>
        </div>

        {/* PENDIENTES DE PAGO */}
        <div className={styles.card}>
          <div className={styles.cardHeader} style={{ color: "#d97706" }}>
            <FiDollarSign />
            <span>Pendientes de Pago</span>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.monto} style={{ color: "#d97706" }}>
              ${(pendientesTotals.total_pendientes || 0).toFixed(2)}
            </div>
            <div className={styles.detalle}>
              {pendientesTotals.cantidad_pendientes || 0} pendiente(s)
            </div>
            <div className={styles.descripcion}>
              Productos con pago pendiente
            </div>
          </div>
        </div>

        {/* RESUMEN DE IMPACTO */}
        <div className={styles.impactoCard}>
          <div className={styles.impactoHeader}>
            <FiInfo />
            <span>Impacto Neto en Caja</span>
          </div>
          <div className={styles.impactoContent}>
            <div className={styles.impactoItem}>
              <span>Efectivo Neto:</span>
              <span
                className={impactoNeto >= 0 ? styles.positivo : styles.negativo}
              >
                {impactoNeto >= 0 ? "+" : ""}${Math.abs(impactoNeto).toFixed(2)}
              </span>
            </div>
            <div className={styles.impactoNote}>
              {impactoNeto > 0
                ? "✅ Aumenta el efectivo en caja"
                : impactoNeto < 0
                ? "⚠️ Reduce el efectivo en caja"
                : "⚖️ Sin impacto en efectivo"}
            </div>
            <div className={styles.impactoDetalle}>
              <small>
                Total Movimientos:{" "}
                {(pendientesTotals.cantidad_retiros || 0) +
                  (pendientesTotals.cantidad_ingresos || 0) +
                  (pendientesTotals.cantidad_pendientes || 0)}
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* EXPLICACIÓN DEL CÁLCULO */}
      <div className={styles.explicacion}>
        <div className={styles.explicacionTitle}>
          💡 ¿Cómo se calcula el saldo final?
        </div>
        <div className={styles.explicacionFormula}>
          <strong>Saldo Final Teórico =</strong>
          <br />
          Saldo Inicial + Ventas Efectivo + Ingresos Pendientes - Retiros
          Pendientes
        </div>
      </div>
    </div>
  );
};

export default PendientesResumen;
