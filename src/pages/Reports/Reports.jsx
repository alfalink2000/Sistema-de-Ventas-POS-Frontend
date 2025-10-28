// pages/Reports/Reports.jsx - VERSIÓN SIMPLIFICADA SOLO PARA CIERRES
import React from "react";
import ClosuresHistory from "../../components/features/caja/ClosuresHistory/ClosuresHistory";
import { FiCalendar, FiArchive } from "react-icons/fi";
import styles from "./Reports.module.css";

const Reports = () => {
  return (
    <div className={styles.reportsPage}>
      <div className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerTitle}>
            <FiCalendar className={styles.headerIcon} />
            <h1>Historial de Cierres de Caja</h1>
          </div>
          <p>Consulta todos los cierres de caja realizados anteriormente</p>
        </div>

        <div className={styles.headerStats}>
          <div className={styles.statBadge}>
            <FiArchive className={styles.statIcon} />
            <span>Registros históricos</span>
          </div>
        </div>
      </div>

      {/* ✅ SOLO MOSTRAR EL HISTORIAL DE CIERRES */}
      <div className={styles.closuresSection}>
        <ClosuresHistory />
      </div>
    </div>
  );
};

export default Reports;
