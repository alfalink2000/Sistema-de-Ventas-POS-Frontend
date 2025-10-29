// components/features/caja/SesionCajaModal/SesionCajaModal.jsx
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { openSesionCaja } from "../../../../actions/sesionesCajaActions";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import { FiWifi, FiWifiOff } from "react-icons/fi";
import styles from "./SesionCajaModal.module.css";

const SesionCajaModal = ({ isOpen, onClose }) => {
  const [saldoInicial, setSaldoInicial] = useState("");
  const [processing, setProcessing] = useState(false);

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isOnline = navigator.onLine;

  const handleAbrirSesion = async () => {
    if (!saldoInicial || saldoInicial < 0) return;

    setProcessing(true);
    try {
      const result = await dispatch(
        openSesionCaja({
          vendedor_id: user.id,
          saldo_inicial: parseFloat(saldoInicial),
        })
      );

      if (result.success) {
        onClose();
        setSaldoInicial("");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setSaldoInicial("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Abrir Sesión de Caja">
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

        <div className={styles.formGroup}>
          <label className={styles.label}>Saldo Inicial en Caja</label>
          <input
            type="number"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className={styles.input}
          />
          <small className={styles.helpText}>
            Ingresa el monto inicial con el que comienza la caja
          </small>
        </div>

        {!isOnline && (
          <div className={styles.offlineWarning}>
            <strong>⚠️ Modo Offline</strong>
            <p>
              La sesión se abrirá localmente y se sincronizará cuando recuperes
              la conexión a internet.
            </p>
          </div>
        )}

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
            onClick={handleAbrirSesion}
            disabled={!saldoInicial || processing}
            loading={processing}
          >
            {isOnline ? "Abrir Sesión" : "Abrir Sesión (Local)"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SesionCajaModal;
