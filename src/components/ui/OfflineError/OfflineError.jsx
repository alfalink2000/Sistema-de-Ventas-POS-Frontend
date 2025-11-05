import styles from "./OfflineError.module.css";

const OfflineError = ({ error, onRetry }) => {
  return (
    <div className={styles.offlineError}>
      <div className={styles.errorContent}>
        <div className={styles.errorIcon}>📱</div>
        <h3>Modo Offline</h3>
        <p>La aplicación está funcionando sin conexión a internet</p>
        <p className={styles.errorDetail}>{error}</p>

        <div className={styles.errorActions}>
          <button onClick={onRetry} className={styles.retryButton}>
            Reintentar Conexión
          </button>
          <button
            onClick={() => window.location.reload()}
            className={styles.reloadButton}
          >
            Recargar Aplicación
          </button>
        </div>

        <div className={styles.offlineTips}>
          <h4>Para usar la aplicación offline:</h4>
          <ul>
            <li>Asegúrate de haber iniciado sesión previamente con internet</li>
            <li>Los datos se sincronizarán cuando recuperes la conexión</li>
            <li>Puedes realizar ventas y operaciones normales</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OfflineError;
