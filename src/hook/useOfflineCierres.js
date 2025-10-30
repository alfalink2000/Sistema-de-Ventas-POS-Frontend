import { useState, useEffect } from "react";
import IndexedDBService from "../services/IndexedDBService";
import SyncService from "../services/SyncService";

export const useOfflineCierres = () => {
  const [cierres, setCierres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    loadCierresCompletos();

    const unsubscribe = SyncService.addSyncListener((event) => {
      if (event === "sync_complete" || event === "sync_error") {
        console.log("🔄 Evento de sync - Recargando cierres...");
        loadCierresCompletos();
      }
    });

    return unsubscribe;
  }, []);

  const loadCierresCompletos = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("📥 Cargando TODOS los cierres (online + offline)...");

      // ✅ CARGAR DESDE MÚLTIPLES FUENTES
      const [cierresSincronizados, cierresPendientes, sesionesCerradas] =
        await Promise.all([
          IndexedDBService.getAll("cierres"), // Cierres del servidor
          IndexedDBService.getAll("cierres_pendientes"), // Cierres locales pendientes
          IndexedDBService.safeGetAll(
            "sesiones_caja_offline",
            "estado",
            "cerrada"
          ), // Sesiones cerradas locales
        ]);

      console.log(
        `📊 Fuentes: ${cierresSincronizados?.length || 0} sincronizados, ${
          cierresPendientes?.length || 0
        } pendientes, ${sesionesCerradas?.length || 0} sesiones cerradas`
      );

      // ✅ COMBINAR Y ENRIQUECER DATOS
      let todosCierres = [];

      // 1. Agregar cierres sincronizados del servidor
      if (cierresSincronizados && cierresSincronizados.length > 0) {
        todosCierres = [
          ...todosCierres,
          ...cierresSincronizados.map((c) => ({
            ...c,
            origen: "servidor",
            sincronizado: true,
            id_mostrar: c.id, // Usar ID del servidor para mostrar
          })),
        ];
      }

      // 2. Agregar cierres pendientes de sincronización
      if (cierresPendientes && cierresPendientes.length > 0) {
        todosCierres = [
          ...todosCierres,
          ...cierresPendientes.map((c) => ({
            ...c,
            origen: "local_pendiente",
            sincronizado: false,
            id_mostrar: c.id_local || `local_${c.id_local}`,
          })),
        ];
      }

      // 3. ✅ CRÍTICO: Crear cierres a partir de sesiones cerradas locales sin cierre explícito
      if (sesionesCerradas && sesionesCerradas.length > 0) {
        const cierresDeSesiones = await Promise.all(
          sesionesCerradas.map(async (sesion) => {
            // Buscar si ya existe un cierre para esta sesión
            const cierreExistente = todosCierres.find(
              (c) =>
                c.sesion_caja_id_local === sesion.id_local ||
                c.sesion_caja_id === sesion.id_local
            );

            if (!cierreExistente && sesion.estado === "cerrada") {
              // ✅ CREAR CIERRE A PARTIR DE SESIÓN CERRADA
              return await crearCierreDesdeSesion(sesion);
            }
            return null;
          })
        );

        const cierresValidos = cierresDeSesiones.filter((c) => c !== null);
        todosCierres = [...todosCierres, ...cierresValidos];
      }

      // ✅ ORDENAR POR FECHA (MÁS RECIENTE PRIMERO) Y FILTRAR VÁLIDOS
      const cierresOrdenados = todosCierres
        .filter((cierre) => cierre && cierre.fecha_cierre)
        .sort((a, b) => new Date(b.fecha_cierre) - new Date(a.fecha_cierre))
        .map((cierre, index) => ({
          ...cierre,
          // ✅ Asegurar que tenga un ID para la tabla
          id: cierre.id || cierre.id_mostrar || `cierre_${index}`,
          // ✅ Enriquecer datos para la UI
          estado_diferencia:
            cierre.diferencia === 0
              ? "exacto"
              : cierre.diferencia > 0
              ? "sobrante"
              : "faltante",
          diferencia_absoluta: Math.abs(cierre.diferencia || 0),
        }));

      console.log(
        `✅ ${cierresOrdenados.length} cierres totales cargados para reportes`
      );

      setCierres(cierresOrdenados);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("❌ Error cargando cierres completos:", err);
      setError("No se pudieron cargar los cierres almacenados localmente");
      setCierres([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN PARA CREAR CIERRE A PARTIR DE SESIÓN CERRADA
  const crearCierreDesdeSesion = async (sesion) => {
    try {
      // Calcular totales para la sesión
      const totales = await calcularTotalesSesion(sesion.id_local);

      const saldoInicial = sesion.saldo_inicial || 0;
      const totalEfectivo = totales.total_efectivo || 0;
      const saldoFinalReal = sesion.saldo_final || saldoInicial + totalEfectivo;
      const saldoFinalTeorico = saldoInicial + totalEfectivo;
      const diferencia = saldoFinalReal - saldoFinalTeorico;

      const cierreDesdeSesion = {
        id: `sesion_${sesion.id_local}`,
        id_local: `cierre_sesion_${sesion.id_local}`,
        sesion_caja_id: null,
        sesion_caja_id_local: sesion.id_local,
        vendedor_id: sesion.vendedor_id,
        vendedor_nombre: sesion.vendedor_nombre || "Vendedor",
        fecha_cierre: sesion.fecha_cierre || new Date().toISOString(),
        fecha_apertura: sesion.fecha_apertura,
        total_ventas: totales.total_ventas || 0,
        total_efectivo: totales.total_efectivo || 0,
        total_tarjeta: totales.total_tarjeta || 0,
        total_transferencia: totales.total_transferencia || 0,
        ganancia_bruta: totales.ganancia_bruta || 0,
        saldo_inicial: saldoInicial,
        saldo_final_teorico: saldoFinalTeorico,
        saldo_final_real: saldoFinalReal,
        diferencia: diferencia,
        observaciones:
          sesion.observaciones || "Cierre a partir de sesión local cerrada",
        sincronizado: false,
        origen: "sesion_local",
        estado: "completado",
        cantidad_ventas: totales.cantidad_ventas || 0,
      };

      return cierreDesdeSesion;
    } catch (error) {
      console.error(
        `Error creando cierre desde sesión ${sesion.id_local}:`,
        error
      );
      return null;
    }
  };

  const refreshCierres = async () => {
    await loadCierresCompletos();
  };

  return {
    cierres,
    loading,
    error,
    lastUpdate,
    refreshCierres,
  };
};

// ✅ FUNCIÓN AUXILIAR PARA CALCULAR TOTALES DE UNA SESIÓN
async function calcularTotalesSesion(sesionIdLocal) {
  try {
    const todasVentas = await IndexedDBService.getAll("ventas_pendientes");

    const ventasSesion = todasVentas.filter(
      (venta) =>
        venta.sesion_caja_id_local === sesionIdLocal ||
        venta.sesion_caja_id === sesionIdLocal
    );

    let totales = {
      cantidad_ventas: 0,
      total_ventas: 0,
      total_efectivo: 0,
      total_tarjeta: 0,
      total_transferencia: 0,
      ganancia_bruta: 0,
    };

    ventasSesion.forEach((venta) => {
      if (venta.estado !== "cancelada" && venta.estado !== "rechazada") {
        totales.cantidad_ventas++;
        totales.total_ventas += parseFloat(venta.total || 0);

        switch (venta.metodo_pago) {
          case "efectivo":
            totales.total_efectivo += parseFloat(venta.total || 0);
            break;
          case "tarjeta":
            totales.total_tarjeta += parseFloat(venta.total || 0);
            break;
          case "transferencia":
            totales.total_transferencia += parseFloat(venta.total || 0);
            break;
          default:
            totales.total_efectivo += parseFloat(venta.total || 0);
        }

        // Estimación simple de ganancia (40% del total)
        totales.ganancia_bruta += parseFloat(venta.total || 0) * 0.4;
      }
    });

    // Redondear a 2 decimales
    Object.keys(totales).forEach((key) => {
      if (typeof totales[key] === "number") {
        totales[key] = Math.round(totales[key] * 100) / 100;
      }
    });

    return totales;
  } catch (error) {
    console.error("Error calculando totales de sesión:", error);
    return {
      cantidad_ventas: 0,
      total_ventas: 0,
      total_efectivo: 0,
      total_tarjeta: 0,
      total_transferencia: 0,
      ganancia_bruta: 0,
    };
  }
}
