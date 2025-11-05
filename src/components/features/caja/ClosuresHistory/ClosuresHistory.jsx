// src/components/features/caja/ClosuresHistory/ClosuresHistory.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiCalendar,
  FiDollarSign,
  FiClock,
  FiUser,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiFilter,
  FiDownload,
  FiWifi,
  FiWifiOff,
  FiRefreshCw,
  FiAlertCircle,
  FiUploadCloud,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import {
  loadClosures,
  syncPendingClosures,
} from "../../../../actions/closuresActions";
import ClosuresOfflineController from "../../../../controllers/offline/ClosuresOfflineController/ClosuresOfflineController";
import styles from "./ClosuresHistory.module.css";

const ClosuresHistory = () => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [localLoading, setLocalLoading] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const itemsPerPage = 10;

  const dispatch = useDispatch();
  const { closures: reduxCierres, loading: reduxLoading } = useSelector(
    (state) => state.closures
  );

  // ✅ OBTENER USUARIO ACTUAL PARA VERIFICAR ROL
  const { user: currentUser } = useSelector((state) => state.auth);
  const isAdmin = currentUser?.rol === "admin";

  // ✅ CARGAR CIERRES PENDIENTES DE SINCRONIZACIÓN
  useEffect(() => {
    const loadPendingClosures = async () => {
      try {
        const pendingClosures =
          await ClosuresOfflineController.getPendingClosures();
        setPendingSyncCount(pendingClosures.length);
      } catch (error) {
        console.error("Error cargando cierres pendientes:", error);
      }
    };

    loadPendingClosures();
  }, []);

  // ✅ MANEJAR CAMBIOS DE CONEXIÓN
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      console.log("🌐 Conexión restaurada - Recargando cierres...");

      // Recargar cierres del servidor
      dispatch(loadClosures(100));

      // Actualizar contador de pendientes
      const pendingClosures =
        await ClosuresOfflineController.getPendingClosures();
      setPendingSyncCount(pendingClosures.length);
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("📴 Modo offline - Usando cierres locales");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cargar cierres iniciales
    if (isOnline) {
      dispatch(loadClosures(100));
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [dispatch, isOnline]);

  // ✅ SINCRONIZAR MANUALMENTE
  const handleSync = async () => {
    if (!isOnline) {
      alert("No hay conexión a internet para sincronizar");
      return;
    }

    setIsSyncing(true);
    try {
      await dispatch(syncPendingClosures());

      // Actualizar contador después de sincronizar
      const pendingClosures =
        await ClosuresOfflineController.getPendingClosures();
      setPendingSyncCount(pendingClosures.length);

      // Recargar cierres
      dispatch(loadClosures(100));
    } catch (error) {
      console.error("Error en sincronización manual:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // ✅ REFRESCAR DATOS
  const handleRetry = async () => {
    if (isOnline) {
      dispatch(loadClosures(100));
    } else {
      setLocalLoading(true);
      // En modo offline, recargar desde IndexedDB
      dispatch(loadClosures(100));
      setTimeout(() => setLocalLoading(false), 1000);
    }
  };

  // Determinar qué datos usar
  const closures = reduxCierres || [];
  const loading = reduxLoading || localLoading;

  // ✅ OBTENER AÑOS ÚNICOS DE LOS CIERRES
  const getUniqueYears = () => {
    const years = closures.map((closure) =>
      new Date(closure.fecha_cierre).getFullYear()
    );
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a);
    return uniqueYears;
  };

  // ✅ OBTENER DÍAS ÚNICOS (1-31)
  const getDayOptions = () => {
    return Array.from({ length: 31 }, (_, i) => ({
      value: (i + 1).toString(),
      label: (i + 1).toString(),
    }));
  };

  const getMonthOptions = () => {
    const months = [
      { value: "", label: "Todos los meses" },
      { value: "0", label: "Enero" },
      { value: "1", label: "Febrero" },
      { value: "2", label: "Marzo" },
      { value: "3", label: "Abril" },
      { value: "4", label: "Mayo" },
      { value: "5", label: "Junio" },
      { value: "6", label: "Julio" },
      { value: "7", label: "Agosto" },
      { value: "8", label: "Septiembre" },
      { value: "9", label: "Octubre" },
      { value: "10", label: "Noviembre" },
      { value: "11", label: "Diciembre" },
    ];
    return months;
  };

  // ✅ FILTRAR Y ORDENAR DATOS
  const filteredClosures = closures
    .filter((closure) => {
      const closureDate = new Date(closure.fecha_cierre);
      const closureYear = closureDate.getFullYear();
      const closureMonth = closureDate.getMonth();
      const closureDay = closureDate.getDate();

      // Filtro de búsqueda
      const matchesSearch =
        closure.vendedor_nombre
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        closure.id?.toString().includes(searchTerm) ||
        closure.id_local?.toString().includes(searchTerm);

      // Filtro por mes
      const matchesMonth =
        !filterMonth || closureMonth === parseInt(filterMonth);

      // Filtro por año
      const matchesYear = !filterYear || closureYear === parseInt(filterYear);

      // Filtro por día
      const matchesDay = !filterDay || closureDay === parseInt(filterDay);

      return matchesSearch && matchesMonth && matchesYear && matchesDay;
    })
    // ✅ ORDENAR POR FECHA (MÁS RECIENTE PRIMERO)
    .sort((a, b) => new Date(b.fecha_cierre) - new Date(a.fecha_cierre));

  const totalPages = Math.ceil(filteredClosures.length / itemsPerPage);
  const paginatedClosures = filteredClosures.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ✅ LIMPIAR FILTROS
  const clearFilters = () => {
    setFilterMonth("");
    setFilterYear("");
    setFilterDay("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = (apertura, cierre) => {
    const start = new Date(apertura);
    const end = new Date(cierre);
    const diffMs = end - start;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const exportToCSV = () => {
    if (!isOnline) {
      alert(
        "No puedes exportar en modo offline. Conéctate a internet e intenta nuevamente."
      );
      return;
    }

    const headers = [
      "ID",
      "Fecha Cierre",
      "Vendedor",
      "Ventas Totales",
      "Efectivo",
      "Tarjeta",
      "Transferencia",
      ...(isAdmin ? ["Ganancia Bruta"] : []),
      "Saldo Final Teórico",
      "Saldo Final Real",
      "Diferencia",
      "Duración",
      "Estado",
      "Sincronizado",
    ].join(",");

    const csvData = filteredClosures.map((closure) => {
      const baseData = [
        closure.id || closure.id_local,
        new Date(closure.fecha_cierre).toLocaleDateString(),
        closure.vendedor_nombre,
        closure.total_ventas,
        closure.total_efectivo,
        closure.total_tarjeta,
        closure.total_transferencia || 0,
      ];

      // ✅ SOLO INCLUIR GANANCIA BRUTA SI ES ADMIN
      if (isAdmin) {
        baseData.push(closure.ganancia_bruta);
      }

      baseData.push(
        closure.saldo_final_teorico,
        closure.saldo_final_real,
        closure.diferencia,
        calculateDuration(closure.fecha_apertura, closure.fecha_cierre),
        closure.estado_diferencia ||
          (closure.diferencia === 0
            ? "exacto"
            : closure.diferencia > 0
            ? "sobrante"
            : "faltante"),
        closure.sincronizado ? "Sí" : "No"
      );

      return baseData.join(",");
    });

    const csv = [headers, ...csvData].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cierres-caja-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ COMPONENTE DE ESTADO OFFLINO
  const renderOfflineStatus = () => (
    <div className={styles.offlineStatus}>
      <div className={styles.offlineHeader}>
        <FiWifiOff className={styles.offlineIcon} />
        <span>Modo Sin Conexión</span>
        {pendingSyncCount > 0 && (
          <span className={styles.pendingSyncBadge}>
            {pendingSyncCount} pendientes de sincronizar
          </span>
        )}
      </div>
      <div className={styles.offlineInfo}>
        <p>Mostrando {filteredClosures.length} cierres disponibles</p>
        {pendingSyncCount > 0 && (
          <p className={styles.pendingSyncInfo}>
            Tienes {pendingSyncCount} cierre(s) pendientes de sincronización
          </p>
        )}
      </div>
    </div>
  );

  // ✅ COMPONENTE DE SINCRONIZACIÓN
  const renderSyncButton = () => (
    <button
      className={styles.syncButton}
      onClick={handleSync}
      disabled={!isOnline || isSyncing || pendingSyncCount === 0}
      title={
        !isOnline
          ? "Requiere conexión a internet"
          : pendingSyncCount === 0
          ? "No hay cierres pendientes"
          : "Sincronizar cierres pendientes"
      }
    >
      <FiUploadCloud
        className={`${styles.syncIcon} ${isSyncing ? styles.spinning : ""}`}
      />
      {isSyncing ? "Sincronizando..." : `Sincronizar (${pendingSyncCount})`}
    </button>
  );

  // ✅ COMPONENTE DE INDICADOR DE VISIBILIDAD ADMIN
  const renderAdminVisibilityIndicator = () => (
    <div className={styles.adminVisibilityIndicator}>
      {isAdmin ? (
        <>
          <FiEye className={styles.visibleIcon} />
          <span>Vista de Administrador - Ganancia Bruta visible</span>
        </>
      ) : (
        <>
          <FiEyeOff className={styles.hiddenIcon} />
          <span>Vista de Vendedor - Ganancia Bruta oculta</span>
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>
          {isOnline
            ? "Cargando historial de cierres..."
            : "Cargando cierres locales..."}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.closuresHistory}>
      {/* Header con controles */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2>
            <FiCalendar className={styles.headerIcon} />
            Historial de Cierres de Caja
            {!isOnline && (
              <span className={styles.offlineBadge}>
                <FiWifiOff />
                Offline
              </span>
            )}
            {pendingSyncCount > 0 && isOnline && (
              <span className={styles.pendingBadge}>
                <FiUploadCloud />
                {pendingSyncCount} pendientes
              </span>
            )}
          </h2>
          <p>
            {isOnline
              ? `${filteredClosures.length} registros encontrados`
              : `${filteredClosures.length} registros locales`}
          </p>

          {/* ✅ INDICADOR DE VISIBILIDAD ADMIN */}
          {renderAdminVisibilityIndicator()}

          {!isOnline && renderOfflineStatus()}
        </div>

        <div className={styles.controls}>
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar por vendedor o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* ✅ FILTROS MEJORADOS */}
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <FiFilter className={styles.filterIcon} />
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Todos los años</option>
                {getUniqueYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className={styles.filterSelect}
              >
                {getMonthOptions().map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">Todos los días</option>
                {getDayOptions().map((day) => (
                  <option key={day.value} value={day.value}>
                    Día {day.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ BOTÓN LIMPIAR FILTROS */}
            {(filterMonth || filterYear || filterDay || searchTerm) && (
              <button
                className={styles.clearFiltersButton}
                onClick={clearFilters}
                title="Limpiar todos los filtros"
              >
                Limpiar
              </button>
            )}

            {/* ✅ BOTÓN ACTUALIZAR */}
            <button
              className={styles.refreshBtn}
              onClick={handleRetry}
              disabled={loading}
              title="Actualizar datos"
            >
              <FiRefreshCw className={loading ? styles.spinning : ""} />
            </button>
          </div>

          {/* ✅ BOTÓN SINCRONIZAR */}
          {pendingSyncCount > 0 && renderSyncButton()}

          <button
            className={styles.exportButton}
            onClick={exportToCSV}
            disabled={!isOnline}
            title={
              !isOnline ? "Requiere conexión a internet" : "Exportar a CSV"
            }
          >
            <FiDownload className={styles.exportIcon} />
            Exportar CSV
            {!isOnline && <FiWifiOff className={styles.offlineExportIcon} />}
          </button>
        </div>
      </div>

      {/* Tabla de cierres */}
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.expandColumn}></th>
                <th>ID</th>
                <th>Fecha Cierre</th>
                <th>Vendedor</th>
                <th>Ventas Totales</th>
                <th>Total Efectivo</th>
                <th>Duración</th>
                <th>Diferencia</th>
                <th>Estado</th>
                <th>Sincronizado</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClosures.length === 0 ? (
                <tr>
                  <td colSpan="10" className={styles.noData}>
                    <div className={styles.noDataContent}>
                      <FiCalendar className={styles.noDataIcon} />
                      <p>
                        {isOnline
                          ? "No se encontraron cierres de caja"
                          : "No hay cierres almacenados localmente"}
                      </p>
                      {(filterMonth ||
                        filterYear ||
                        filterDay ||
                        searchTerm) && (
                        <button
                          className={styles.clearFiltersLink}
                          onClick={clearFilters}
                        >
                          Limpiar filtros para ver todos los registros
                        </button>
                      )}
                      {!isOnline && (
                        <p className={styles.offlineHelp}>
                          Conéctate a internet para cargar datos del servidor
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClosures.map((closure) => (
                  <React.Fragment key={closure.id || closure.id_local}>
                    <tr
                      className={styles.tableRow}
                      onClick={() => toggleRow(closure.id || closure.id_local)}
                    >
                      <td className={styles.expandCell}>
                        {expandedRow === (closure.id || closure.id_local) ? (
                          <FiChevronUp className={styles.expandIcon} />
                        ) : (
                          <FiChevronDown className={styles.expandIcon} />
                        )}
                      </td>
                      <td className={styles.idCell}>
                        {closure.id
                          ? `#${closure.id}`
                          : `📱${closure.id_local}`}
                      </td>
                      <td className={styles.dateCell}>
                        {formatDate(closure.fecha_cierre)}
                      </td>
                      <td className={styles.userCell}>
                        <FiUser className={styles.userIcon} />
                        {closure.vendedor_nombre}
                      </td>
                      <td className={styles.salesCell}>
                        {formatCurrency(closure.total_ventas)}
                      </td>
                      <td className={styles.amountCell}>
                        {formatCurrency(closure.total_efectivo)}
                      </td>
                      <td className={styles.durationCell}>
                        <FiClock className={styles.durationIcon} />
                        {calculateDuration(
                          closure.fecha_apertura,
                          closure.fecha_cierre
                        )}
                      </td>
                      <td className={styles.differenceCell}>
                        <span
                          className={
                            closure.diferencia === 0
                              ? styles.exact
                              : closure.diferencia > 0
                              ? styles.positive
                              : styles.negative
                          }
                        >
                          {formatCurrency(closure.diferencia)}
                        </span>
                      </td>
                      <td className={styles.statusCell}>
                        <span
                          className={
                            closure.diferencia === 0
                              ? styles.statusExact
                              : closure.diferencia > 0
                              ? styles.statusSurplus
                              : styles.statusShortage
                          }
                        >
                          {closure.diferencia === 0
                            ? "Exacto"
                            : closure.diferencia > 0
                            ? "Sobrante"
                            : "Faltante"}
                        </span>
                      </td>
                      <td className={styles.syncCell}>
                        {closure.sincronizado === false ? (
                          <span className={styles.pendingSync}>
                            <FiUploadCloud />
                            Pendiente
                          </span>
                        ) : (
                          <span className={styles.synced}>
                            <FiWifi />
                            Sincronizado
                          </span>
                        )}
                      </td>
                    </tr>
                    {expandedRow === (closure.id || closure.id_local) && (
                      <tr className={styles.detailsRow}>
                        <td colSpan="10">
                          <div className={styles.detailsContent}>
                            <div className={styles.detailsGrid}>
                              <div className={styles.detailSection}>
                                <h4>Información de la Sesión</h4>
                                <div className={styles.detailItem}>
                                  <span>Fecha Apertura:</span>
                                  <span>
                                    {formatDate(closure.fecha_apertura)}
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span>Fecha Cierre:</span>
                                  <span>
                                    {formatDate(closure.fecha_cierre)}
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span>Duración Total:</span>
                                  <span>
                                    {calculateDuration(
                                      closure.fecha_apertura,
                                      closure.fecha_cierre
                                    )}
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span>Saldo Inicial:</span>
                                  <span>
                                    {formatCurrency(closure.saldo_inicial)}
                                  </span>
                                </div>
                              </div>

                              <div className={styles.detailSection}>
                                <h4>Totales por Método de Pago</h4>
                                <div className={styles.detailItem}>
                                  <span>Efectivo:</span>
                                  <span>
                                    {formatCurrency(closure.total_efectivo)}
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span>Tarjeta:</span>
                                  <span>
                                    {formatCurrency(closure.total_tarjeta)}
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span>Transferencia:</span>
                                  <span>
                                    {formatCurrency(
                                      closure.total_transferencia || 0
                                    )}
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span>Ventas Totales:</span>
                                  <span className={styles.totalAmount}>
                                    {formatCurrency(closure.total_ventas)}
                                  </span>
                                </div>
                              </div>

                              <div className={styles.detailSection}>
                                <h4>Resumen Financiero</h4>
                                {/* ✅ SOLO MOSTRAR GANANCIA BRUTA SI ES ADMIN */}
                                {isAdmin && (
                                  <div className={styles.detailItem}>
                                    <span>Ganancia Bruta:</span>
                                    <span className={styles.profitHighlight}>
                                      {formatCurrency(closure.ganancia_bruta)}
                                    </span>
                                  </div>
                                )}
                                <div className={styles.detailItem}>
                                  <span>Saldo Final Teórico:</span>
                                  <span>
                                    {formatCurrency(
                                      closure.saldo_final_teorico
                                    )}
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span>Saldo Final Real:</span>
                                  <span>
                                    {formatCurrency(closure.saldo_final_real)}
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span>Diferencia:</span>
                                  <span
                                    className={
                                      closure.diferencia === 0
                                        ? styles.exact
                                        : closure.diferencia > 0
                                        ? styles.positive
                                        : styles.negative
                                    }
                                  >
                                    {formatCurrency(closure.diferencia)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {closure.observaciones && (
                              <div className={styles.observations}>
                                <h4>Observaciones</h4>
                                <p>{closure.observaciones}</p>
                              </div>
                            )}

                            {/* ✅ INDICADOR DE DATO LOCAL */}
                            {(!closure.id ||
                              closure.sincronizado === false) && (
                              <div className={styles.localDataIndicator}>
                                {closure.sincronizado === false ? (
                                  <>
                                    <FiUploadCloud />
                                    <span>
                                      Pendiente de sincronización - Cierre local
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <FiWifiOff />
                                    <span>
                                      Dato cargado desde almacenamiento local
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationButton}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </button>

          <div className={styles.pageInfo}>
            Página {currentPage} de {totalPages}
            {!isOnline && (
              <span className={styles.offlinePagination}> • Local</span>
            )}
            {pendingSyncCount > 0 && (
              <span className={styles.pendingPagination}>
                {" "}
                • {pendingSyncCount} pendientes
              </span>
            )}
          </div>

          <button
            className={styles.paginationButton}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* ✅ INFORMACIÓN DE PIE OFFLINO */}
      {!isOnline && filteredClosures.length > 0 && (
        <div className={styles.offlineFooter}>
          <FiWifiOff className={styles.offlineFooterIcon} />
          <span>
            Modo offline • {filteredClosures.length} cierres locales •{" "}
            {pendingSyncCount} pendientes de sincronizar
          </span>
        </div>
      )}
    </div>
  );
};

export default ClosuresHistory;
