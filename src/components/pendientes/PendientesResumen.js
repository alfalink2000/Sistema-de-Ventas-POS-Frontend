import React from "react";
import {
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiDollarSign,
} from "react-icons/fi";
import styles from "./PendientesResumen.module.css";

const PendientesResumen = ({ pendientesTotals, onVerDetalles }) => {
  if (!pendientesTotals) return null;

  return (
    <div className={styles.pendientesResumen}>
      <div className={styles.header}>
        <h4>
          <FiClock className={styles.sectionIcon} />
          Pendientes e Imprevistos
        </h4>
        <button className={styles.verDetallesBtn} onClick={onVerDetalles}>
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
              -${pendientesTotals.total_retiros?.toFixed(2)}
            </div>
            <div className={styles.detalle}>
              {pendientesTotals.cantidad_retiros || 0} retiros
            </div>
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
              +${pendientesTotals.total_ingresos?.toFixed(2)}
            </div>
            <div className={styles.detalle}>
              {pendientesTotals.cantidad_ingresos || 0} ingresos
            </div>
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
              ${pendientesTotals.total_pendientes?.toFixed(2)}
            </div>
            <div className={styles.detalle}>
              {pendientesTotals.cantidad_pendientes || 0} pendientes
            </div>
          </div>
        </div>

        {/* RESUMEN DE IMPACTO */}
        <div className={styles.impactoCard}>
          <div className={styles.impactoHeader}>
            <span>Impacto en Caja</span>
          </div>
          <div className={styles.impactoContent}>
            <div className={styles.impactoItem}>
              <span>Neto Pendientes:</span>
              <span
                className={
                  pendientesTotals.total_ingresos -
                    pendientesTotals.total_retiros >=
                  0
                    ? styles.positivo
                    : styles.negativo
                }
              >
                $
                {(
                  pendientesTotals.total_ingresos -
                  pendientesTotals.total_retiros
                ).toFixed(2)}
              </span>
            </div>
            <div className={styles.impactoNote}>
              {pendientesTotals.total_ingresos > pendientesTotals.total_retiros
                ? "✅ Aumenta el efectivo en caja"
                : "⚠️ Reduce el efectivo en caja"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendientesResumen;
