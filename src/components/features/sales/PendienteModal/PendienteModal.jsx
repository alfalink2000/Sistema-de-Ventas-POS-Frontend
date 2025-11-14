import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPendiente } from "../../../../actions/pendientesActions";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import {
  FiDollarSign,
  FiFileText,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
} from "react-icons/fi";
import styles from "./PendienteModal.module.css";

const PendienteModal = ({ isOpen, onClose }) => {
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [tipo, setTipo] = useState("retiro");
  const [procesando, setProcesando] = useState(false);

  const dispatch = useDispatch();
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!descripcion.trim() || !monto || parseFloat(monto) <= 0) {
      Swal.fire({
        icon: "error",
        title: "Datos incompletos",
        text: "Por favor, completa todos los campos correctamente",
        confirmButtonText: "Entendido",
      });
      return;
    }

    if (!sesionAbierta) {
      Swal.fire({
        icon: "error",
        title: "Sesión requerida",
        text: "Debes tener una sesión de caja abierta para registrar pendientes",
        confirmButtonText: "Entendido",
      });
      return;
    }

    setProcesando(true);

    try {
      const result = await dispatch(
        createPendiente({
          descripcion: descripcion.trim(),
          monto: parseFloat(monto),
          tipo,
        })
      );

      if (result.success) {
        // Limpiar formulario
        setDescripcion("");
        setMonto("");
        setTipo("retiro");
        onClose();
      }
    } catch (error) {
      console.error("Error al crear pendiente:", error);
    } finally {
      setProcesando(false);
    }
  };

  const handleClose = () => {
    if (!procesando) {
      setDescripcion("");
      setMonto("");
      setTipo("retiro");
      onClose();
    }
  };

  const getTipoConfig = (tipoSeleccionado) => {
    const configs = {
      retiro: {
        icon: <FiTrendingDown className={styles.tipoIcon} />,
        color: "#dc2626",
        label: "Retiro de Efectivo",
        description: "Salida de dinero de la caja (gastos, imprevistos, etc.)",
      },
      ingreso: {
        icon: <FiTrendingUp className={styles.tipoIcon} />,
        color: "#16a34a",
        label: "Ingreso de Efectivo",
        description:
          "Entrada de dinero a la caja (depósitos, reintegros, etc.)",
      },
      pendiente: {
        icon: <FiClock className={styles.tipoIcon} />,
        color: "#d97706",
        label: "Pendiente de Pago",
        description: "Producto llevado con pago pendiente",
      },
    };
    return configs[tipoSeleccionado] || configs.retiro;
  };

  const tipoConfig = getTipoConfig(tipo);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Registrar Pendiente/Imprevisto"
      size="medium"
    >
      <div className={styles.pendienteModal}>
        {/* Información de la Sesión */}
        {sesionAbierta && (
          <div className={styles.sessionInfo}>
            <div className={styles.sessionBadge}>
              <FiDollarSign className={styles.sessionIcon} />
              <span>Sesión: {sesionAbierta.id || sesionAbierta.id_local}</span>
            </div>
            <div className={styles.sessionSaldo}>
              Saldo Inicial: ${sesionAbierta.saldo_inicial?.toFixed(2)}
            </div>
          </div>
        )}

        {/* Selector de Tipo */}
        <div className={styles.tipoSection}>
          <label className={styles.label}>Tipo de Movimiento</label>
          <div className={styles.tipoOptions}>
            {["retiro", "ingreso", "pendiente"].map((tipoOption) => (
              <div
                key={tipoOption}
                className={`${styles.tipoOption} ${
                  tipo === tipoOption ? styles.tipoOptionSelected : ""
                }`}
                onClick={() => setTipo(tipoOption)}
                style={{
                  borderColor: getTipoConfig(tipoOption).color,
                }}
              >
                {getTipoConfig(tipoOption).icon}
                <div className={styles.tipoInfo}>
                  <span className={styles.tipoLabel}>
                    {getTipoConfig(tipoOption).label}
                  </span>
                  <span className={styles.tipoDescription}>
                    {getTipoConfig(tipoOption).description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Campo Descripción */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <FiFileText className={styles.labelIcon} />
              Descripción
              <small>Describe el motivo del movimiento</small>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={
                tipo === "retiro"
                  ? "Ej: Retiro para gastos de transporte..."
                  : tipo === "ingreso"
                  ? "Ej: Ingreso por depósito de cliente..."
                  : "Ej: Producto pendiente de pago: Laptop HP..."
              }
              rows="3"
              className={styles.textarea}
              disabled={procesando}
              required
            />
          </div>

          {/* Campo Monto */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <FiDollarSign className={styles.labelIcon} />
              Monto
              <small>Ingresa el monto del movimiento</small>
            </label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              className={styles.input}
              disabled={procesando}
              required
            />
          </div>

          {/* Resumen del Movimiento */}
          {monto && descripcion && (
            <div className={styles.resumenSection}>
              <div
                className={styles.resumenCard}
                style={{ borderLeftColor: tipoConfig.color }}
              >
                <div className={styles.resumenHeader}>
                  {tipoConfig.icon}
                  <span className={styles.resumenTitle}>
                    Resumen del Movimiento
                  </span>
                </div>
                <div className={styles.resumenContent}>
                  <div className={styles.resumenItem}>
                    <span>Tipo:</span>
                    <span
                      className={styles.resumenValue}
                      style={{ color: tipoConfig.color }}
                    >
                      {tipoConfig.label}
                    </span>
                  </div>
                  <div className={styles.resumenItem}>
                    <span>Monto:</span>
                    <span className={styles.resumenValue}>
                      ${parseFloat(monto).toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.resumenItem}>
                    <span>Descripción:</span>
                    <span className={styles.resumenDesc}>{descripcion}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!descripcion.trim() || !monto || procesando}
              loading={procesando}
              style={{
                backgroundColor: tipoConfig.color,
                borderColor: tipoConfig.color,
              }}
            >
              {procesando ? "Registrando..." : `Registrar ${tipoConfig.label}`}
            </Button>
          </div>

          {/* Información de Conexión */}
          {!navigator.onLine && (
            <div className={styles.offlineWarning}>
              <span>📱 Modo Offline</span>
              <small>
                El pendiente se guardará localmente y se sincronizará cuando
                recuperes la conexión
              </small>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
};

export default PendienteModal;
