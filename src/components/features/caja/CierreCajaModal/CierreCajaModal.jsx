// CierreCajaModal.js
import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useOfflineControllers } from "../../../../hooks/useOfflineControllers";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import Swal from "sweetalert2";
import { types } from "../../../../types/types";
import {
  FiWifi,
  FiWifiOff,
  FiDollarSign,
  FiClock,
  FiShoppingCart,
  FiPackage,
  FiList,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiBox,
  FiInfo,
  FiCreditCard,
} from "react-icons/fi";
import styles from "./CierreCajaModal.module.css";
import PendientesResumen from "../../../pendientes/PendientesResumen";

// ✅ IMPORTAR ACTIONS
import {
  closeSesionCaja,
  loadOpenSesion,
} from "../../../../actions/sesionesCajaActions";
import {
  createClosure,
  calculateClosureTotals,
} from "../../../../actions/closuresActions";
import { getPendientesBySesion } from "../../../../actions/pendientesActions";

const CierreCajaModal = ({ isOpen, onClose, sesion }) => {
  const [saldoFinalReal, setSaldoFinalReal] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [processing, setProcessing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [totales, setTotales] = useState(null);
  const [diferencia, setDiferencia] = useState(0);
  const [errorCalculo, setErrorCalculo] = useState(null);
  const [productosAgrupados, setProductosAgrupados] = useState([]);
  const [ventasDelDia, setVentasDelDia] = useState([]);
  const [mostrarDetalleProductos, setMostrarDetalleProductos] = useState(false);

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isOnline = navigator.onLine;
  const { pendientes, pendientesTotals } = useSelector(
    (state) => state.pendientes
  );

  // ✅ USAR HOOK PARA CONTROLADORES
  const {
    ClosuresOfflineController,
    SessionsOfflineController,
    SalesOfflineController,
    PendientesOfflineController,
    loaded: controllersLoaded,
  } = useOfflineControllers();

  // ✅ CARGAR PENDIENTES AL ABRIR MODAL
  useEffect(() => {
    if (isOpen && sesion) {
      const sesionId = sesion.id || sesion.id_local;
      dispatch(getPendientesBySesion(sesionId));
    }
  }, [isOpen, sesion, dispatch]);

  // ✅ MANEJAR VER DETALLES DE PENDIENTES
  const handleVerDetallesPendientes = async () => {
    if (!sesion || !PendientesOfflineController) return;

    try {
      const sesionId = sesion.id || sesion.id_local;
      const pendientes =
        await PendientesOfflineController.getPendientesBySesion(sesionId);

      await Swal.fire({
        title: "📋 Detalle de Movimientos",
        html: `
        <div style="text-align: left; max-height: 60vh; overflow-y: auto;">
          <h4>Resumen de Movimientos</h4>
          <div style="margin-bottom: 20px;">
            <p><strong>Retiros:</strong> ${
              pendientesTotals?.cantidad_retiros || 0
            } movimientos (-$${
          pendientesTotals?.total_retiros?.toFixed(2) || "0.00"
        })</p>
            <p><strong>Ingresos:</strong> ${
              pendientesTotals?.cantidad_ingresos || 0
            } movimientos (+$${
          pendientesTotals?.total_ingresos?.toFixed(2) || "0.00"
        })</p>
            <p><strong>Pendientes:</strong> ${
              pendientesTotals?.cantidad_pendientes || 0
            } movimientos ($${
          pendientesTotals?.total_pendientes?.toFixed(2) || "0.00"
        })</p>
          </div>
          
          <h4>Lista Completa</h4>
          <div style="max-height: 300px; overflow-y: auto;">
            ${
              pendientes.length > 0
                ? pendientes
                    .map(
                      (p) => `
              <div style="padding: 8px; margin: 5px 0; background: #f8f9fa; border-radius: 5px; border-left: 4px solid ${
                p.tipo === "retiro"
                  ? "#dc2626"
                  : p.tipo === "ingreso"
                  ? "#16a34a"
                  : "#d97706"
              };">
                <div style="display: flex; justify-content: space-between;">
                  <strong>${p.descripcion || "Sin descripción"}</strong>
                  <span style="color: ${
                    p.tipo === "retiro"
                      ? "#dc2626"
                      : p.tipo === "ingreso"
                      ? "#16a34a"
                      : "#d97706"
                  };">
                    ${
                      p.tipo === "retiro"
                        ? "-"
                        : p.tipo === "ingreso"
                        ? "+"
                        : ""
                    }$${parseFloat(p.monto || 0).toFixed(2)}
                  </span>
                </div>
                <div style="font-size: 12px; color: #666;">
                  ${new Date(p.fecha || p.created_at).toLocaleString()} | 
                  ${p.tipo?.toUpperCase() || "PENDIENTE"}
                </div>
              </div>
            `
                    )
                    .join("")
                : '<p style="text-align: center; color: #666;">No hay movimientos</p>'
            }
          </div>
        </div>
      `,
        width: 600,
        confirmButtonText: "Cerrar",
      });
    } catch (error) {
      console.error("❌ Error mostrando detalles de pendientes:", error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los detalles de los movimientos",
        confirmButtonText: "Entendido",
      });
    }
  };

  // ✅ OBTENER VENTAS CON PRODUCTOS DE LA SESIÓN
  const obtenerVentasConProductos = useCallback(async () => {
    if (!sesion) return [];

    try {
      const sesionId = sesion.id || sesion.id_local;
      console.log(`🔍 Obteniendo ventas para sesión: ${sesionId}`);

      let ventas = [];

      if (SalesOfflineController) {
        ventas = await SalesOfflineController.getVentasBySesion(sesionId);
      } else {
        const IndexedDBService = await import(
          "../../../../services/IndexedDBService"
        ).then((module) => module.default);

        const ventasPendientes = await IndexedDBService.getAll(
          "ventas_pendientes"
        );
        const ventasSesionPendientes = ventasPendientes.filter(
          (v) =>
            v.sesion_caja_id === sesionId || v.sesion_caja_id_local === sesionId
        );

        const ventasOnline = await IndexedDBService.getAll("ventas");
        const ventasSesionOnline = ventasOnline.filter(
          (v) => v.sesion_caja_id === sesionId
        );

        ventas = [...ventasSesionPendientes, ...ventasSesionOnline];
      }

      console.log(`📊 ${ventas.length} ventas encontradas para la sesión`);
      setVentasDelDia(ventas);
      return ventas;
    } catch (error) {
      console.error("❌ Error obteniendo ventas:", error);
      setVentasDelDia([]);
      return [];
    }
  }, [sesion, SalesOfflineController]);

  // ✅ OBTENER PRODUCTOS AGRUPADOS MEJORADO
  const obtenerProductosAgrupados = useCallback(async (ventas) => {
    if (!ventas || ventas.length === 0) {
      console.log("📭 No hay ventas para agrupar productos");
      return [];
    }

    try {
      console.log(
        `📦 Procesando ${ventas.length} ventas para agrupar productos...`
      );

      const productosMap = new Map();
      let productosConProblemas = 0;

      ventas.forEach((venta) => {
        let productosVenta = [];

        if (venta.productos && Array.isArray(venta.productos)) {
          productosVenta = venta.productos;
        } else if (venta.detalles && Array.isArray(venta.detalles)) {
          productosVenta = venta.detalles;
        } else if (venta.items && Array.isArray(venta.items)) {
          productosVenta = venta.items;
        } else {
          console.warn(
            `⚠️ Venta ${
              venta.id_local || venta.id
            } no tiene estructura de productos reconocida`
          );
          productosConProblemas++;
          return;
        }

        productosVenta.forEach((productoVenta) => {
          const productoId =
            productoVenta.producto_id ||
            productoVenta.id ||
            productoVenta.productoId;

          if (!productoId) {
            console.warn("❌ Producto sin ID:", productoVenta);
            return;
          }

          const nombre =
            productoVenta.nombre ||
            productoVenta.producto_nombre ||
            "Producto sin nombre";
          const cantidad = parseInt(
            productoVenta.cantidad || productoVenta.quantity || 1
          );
          const precioUnitario = parseFloat(
            productoVenta.precio_unitario ||
              productoVenta.precio ||
              productoVenta.price ||
              0
          );
          const subtotal = parseFloat(
            productoVenta.subtotal || precioUnitario * cantidad
          );

          const existing = productosMap.get(productoId);

          if (existing) {
            existing.cantidad_total += cantidad;
            existing.subtotal_total += subtotal;
          } else {
            productosMap.set(productoId, {
              producto_id: productoId,
              nombre: nombre,
              cantidad_total: cantidad,
              subtotal_total: subtotal,
              precio_unitario: precioUnitario,
            });
          }
        });
      });

      const productosArray = Array.from(productosMap.values());

      console.log(
        `✅ ${productosArray.length} productos agrupados correctamente`
      );
      console.log(
        `⚠️ ${productosConProblemas} ventas con problemas de estructura`
      );

      return productosArray;
    } catch (error) {
      console.error("❌ Error obteniendo productos agrupados:", error);
      return [];
    }
  }, []);

  // ✅ CALCULAR TOTALES MANUALMENTE DESDE VENTAS
  const calcularTotalesManual = (ventas) => {
    const total_ventas = ventas.reduce(
      (sum, venta) => sum + (venta.total || 0),
      0
    );
    const total_efectivo = ventas
      .filter((venta) => venta.metodo_pago === "efectivo")
      .reduce((sum, venta) => sum + (venta.total || 0), 0);
    const total_tarjeta = ventas
      .filter((venta) => venta.metodo_pago === "tarjeta")
      .reduce((sum, venta) => sum + (venta.total || 0), 0);

    return {
      total_ventas,
      total_efectivo,
      total_tarjeta,
      cantidad_ventas: ventas.length,
    };
  };

  // ✅ CALCULAR SALDO FINAL TEÓRICO INCLUYENDO PENDIENTES
  const calcularSaldoFinalTeorico = useCallback(
    (totalesVentas, pendientesTotals, saldoInicial) => {
      if (!totalesVentas || !pendientesTotals) return saldoInicial;

      return (
        saldoInicial +
        (totalesVentas.total_efectivo || 0) +
        (pendientesTotals.total_ingresos || 0) -
        (pendientesTotals.total_retiros || 0)
      );
    },
    []
  );

  // ✅ CALCULAR TOTALES COMPLETOS MEJORADO CON PENDIENTES
  const calcularTotalesCompletos = useCallback(async () => {
    if (!sesion || !controllersLoaded) return;

    setCalculating(true);
    setErrorCalculo(null);

    try {
      const ventas = await obtenerVentasConProductos();
      const productos = await obtenerProductosAgrupados(ventas);
      setProductosAgrupados(productos);

      let totals;
      const sesionId = sesion.id || sesion.id_local;

      console.log(`🔄 Calculando totales para ${ventas.length} ventas`);

      if (isOnline && sesion.id) {
        try {
          totals = await dispatch(calculateClosureTotals(sesion.id));
        } catch (onlineError) {
          console.warn("⚠️ Error en cálculo online:", onlineError);
          if (ClosuresOfflineController) {
            totals = await ClosuresOfflineController.calculateSessionTotals(
              sesionId
            );
          }
        }
      } else {
        if (ClosuresOfflineController) {
          totals = await ClosuresOfflineController.calculateSessionTotals(
            sesionId
          );
        }
      }

      if (!totals && ventas.length > 0) {
        console.log("🧮 Calculando totales manualmente desde ventas...");
        totals = calcularTotalesManual(ventas);
      }

      const saldoInicial = sesion.saldo_inicial || 0;

      // ✅ USAR LA NUEVA FUNCIÓN QUE INCLUYE PENDIENTES
      const saldoFinalTeorico = calcularSaldoFinalTeorico(
        totals,
        pendientesTotals,
        saldoInicial
      );

      const totalesCompletos = {
        ...totals,
        total_ventas:
          totals?.total_ventas ||
          ventas.reduce((sum, v) => sum + (v.total || 0), 0),
        total_efectivo:
          totals?.total_efectivo ||
          ventas
            .filter((v) => v.metodo_pago === "efectivo")
            .reduce((sum, v) => sum + (v.total || 0), 0),
        total_tarjeta:
          totals?.total_tarjeta ||
          ventas
            .filter((v) => v.metodo_pago === "tarjeta")
            .reduce((sum, v) => sum + (v.total || 0), 0),
        cantidad_ventas: totals?.cantidad_ventas || ventas.length,
        saldo_final_teorico: saldoFinalTeorico, // ✅ AHORA INCLUYE PENDIENTES
        saldo_inicial: saldoInicial,
        ganancia_bruta: totals?.ganancia_bruta || 0,
        // ✅ INCLUIR TOTALES DE PENDIENTES EN EL OBJETO
        total_retiros_pendientes: pendientesTotals?.total_retiros || 0,
        total_ingresos_pendientes: pendientesTotals?.total_ingresos || 0,
        total_pendientes_pago: pendientesTotals?.total_pendientes || 0,
      };

      setTotales(totalesCompletos);

      if (!saldoFinalReal) {
        setSaldoFinalReal(saldoFinalTeorico.toFixed(2));
      }

      console.log("✅ Totales calculados CON PENDIENTES:", totalesCompletos);
    } catch (error) {
      console.error("❌ Error calculando totales:", error);
      setErrorCalculo(error.message || "No se pudieron calcular los totales.");

      setTotales({
        total_ventas: 0,
        total_efectivo: 0,
        total_tarjeta: 0,
        cantidad_ventas: 0,
        saldo_final_teorico: sesion?.saldo_inicial || 0,
        saldo_inicial: sesion?.saldo_inicial || 0,
        ganancia_bruta: 0,
        total_retiros_pendientes: 0,
        total_ingresos_pendientes: 0,
        total_pendientes_pago: 0,
      });
    } finally {
      setCalculating(false);
    }
  }, [
    sesion,
    dispatch,
    saldoFinalReal,
    isOnline,
    controllersLoaded,
    ClosuresOfflineController,
    obtenerVentasConProductos,
    obtenerProductosAgrupados,
    pendientesTotals,
    calcularSaldoFinalTeorico,
  ]);

  // ✅ EFFECT PRINCIPAL
  useEffect(() => {
    if (isOpen && sesion && controllersLoaded) {
      calcularTotalesCompletos();
    }
  }, [isOpen, sesion, controllersLoaded, calcularTotalesCompletos]);

  // ✅ EFFECT PARA DIFERENCIA
  useEffect(() => {
    if (totales && saldoFinalReal) {
      const saldoRealNum = parseFloat(saldoFinalReal) || 0;
      const diferenciaCalculada = saldoRealNum - totales.saldo_final_teorico;
      setDiferencia(diferenciaCalculada);
    } else {
      setDiferencia(0);
    }
  }, [saldoFinalReal, totales]);

  // ✅ DIAGNÓSTICO DETALLADO
  const handleDiagnosticar = async () => {
    if (!sesion) return;

    try {
      const ventas = await obtenerVentasConProductos();
      const productos = productosAgrupados;

      const totalUnidades = productos.reduce(
        (sum, p) => sum + p.cantidad_total,
        0
      );
      const totalEfectivo = ventas
        .filter((v) => v.metodo_pago === "efectivo")
        .reduce((sum, v) => sum + (v.total || 0), 0);
      const totalTarjeta = ventas
        .filter((v) => v.metodo_pago === "tarjeta")
        .reduce((sum, v) => sum + (v.total || 0), 0);

      await Swal.fire({
        title: "📊 Diagnóstico Completo",
        html: `
          <div style="text-align: left; font-size: 14px; max-height: 60vh; overflow-y: auto;">
            <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
              <h4 style="margin: 0 0 10px 0; color: #333;">Resumen General</h4>
              <p><strong>Total Ventas:</strong> ${ventas.length}</p>
              <p><strong>Ventas Efectivo:</strong> $${totalEfectivo.toFixed(
                2
              )}</p>
              <p><strong>Ventas Tarjeta:</strong> $${totalTarjeta.toFixed(
                2
              )}</p>
              <p><strong>Productos Diferentes:</strong> ${productos.length}</p>
              <p><strong>Unidades Vendidas:</strong> ${totalUnidades}</p>
            </div>
            
            <div style="margin-bottom: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #333;">Estructura de Ventas</h4>
              <div style="max-height: 200px; overflow-y: auto;">
                ${ventas
                  .map(
                    (venta) => `
                  <div style="padding: 8px; margin: 5px 0; background: #e8f5e8; border-radius: 5px; border-left: 4px solid ${
                    venta.metodo_pago === "efectivo" ? "#28a745" : "#007bff"
                  };">
                    <div style="display: flex; justify-content: space-between;">
                      <strong>Venta ${venta.id_local || venta.id}</strong>
                      <span>$${(venta.total || 0).toFixed(2)}</span>
                    </div>
                    <div style="font-size: 12px; color: #666;">
                      ${new Date(
                        venta.fecha_venta || venta.created_at
                      ).toLocaleTimeString()} | 
                      ${
                        venta.metodo_pago === "efectivo"
                          ? "💵 Efectivo"
                          : "💳 Tarjeta"
                      } |
                      Productos: ${
                        venta.productos?.length ||
                        venta.detalles?.length ||
                        venta.items?.length ||
                        0
                      }
                    </div>
                    ${
                      !venta.productos && !venta.detalles && !venta.items
                        ? '<div style="color: red; font-size: 11px;">⚠️ Sin estructura de productos</div>'
                        : ""
                    }
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>

            ${
              productos.length > 0
                ? `
            <div style="margin-bottom: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #333;">Productos Vendidos</h4>
              <div style="max-height: 200px; overflow-y: auto;">
                ${productos
                  .map(
                    (producto) => `
                  <div style="padding: 6px; margin: 3px 0; background: #fff3cd; border-radius: 3px; display: flex; justify-content: space-between;">
                    <span><strong>${producto.nombre}</strong></span>
                    <span><strong>x${
                      producto.cantidad_total
                    }</strong> unidades</span>
                    <span>$${producto.subtotal_total.toFixed(2)}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
            `
                : '<p style="color: red;">❌ No se encontraron productos agrupados</p>'
            }
          </div>
        `,
        width: 600,
        confirmButtonText: "Entendido",
      });
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      await Swal.fire({
        icon: "error",
        title: "Error en diagnóstico",
        text: "No se pudieron obtener los datos completos",
        confirmButtonText: "Entendido",
      });
    }
  };

  // ✅ MANEJAR CIERRE DE SESIÓN
  // const handleCerrarSesion = async () => {
  //   const saldoFinalNumero = parseFloat(saldoFinalReal);

  //   if (!saldoFinalReal || isNaN(saldoFinalNumero) || saldoFinalNumero < 0) {
  //     await Swal.fire({
  //       icon: "error",
  //       title: "Saldo inválido",
  //       text: "Ingresa un saldo final válido",
  //       confirmButtonText: "Entendido",
  //     });
  //     return;
  //   }

  //   if (!sesion) {
  //     await Swal.fire({
  //       icon: "error",
  //       title: "Sesión no válida",
  //       text: "No se encontró la sesión",
  //       confirmButtonText: "Entendido",
  //     });
  //     return;
  //   }

  //   setProcessing(true);

  //   try {
  //     const sesionId = sesion.id || sesion.id_local;
  //     const productos = productosAgrupados;
  //     const totalUnidades = productos.reduce(
  //       (sum, p) => sum + p.cantidad_total,
  //       0
  //     );

  //     // ✅ INCLUIR PENDIENTES EN EL CIERRE
  //     const closureData = {
  //       sesion_caja_id: sesion.id || sesion.id_local,
  //       sesion_caja_id_local: sesion.id_local || sesionId,
  //       vendedor_id: user.id,
  //       vendedor_nombre: user.nombre || user.username,
  //       total_ventas: totales?.total_ventas || 0,
  //       total_efectivo: totales?.total_efectivo || 0,
  //       total_tarjeta: totales?.total_tarjeta || 0,
  //       total_transferencia: totales?.total_transferencia || 0,
  //       ganancia_bruta: totales?.ganancia_bruta || 0,
  //       saldo_inicial: totales?.saldo_inicial || sesion.saldo_inicial || 0,
  //       saldo_final_teorico: totales?.saldo_final_teorico || 0,
  //       saldo_final_real: saldoFinalNumero,
  //       diferencia: diferencia,
  //       observaciones: observaciones.trim() || null,
  //       fecha_apertura: sesion.fecha_apertura,
  //       productos_vendidos: productos.length,
  //       unidades_vendidas: totalUnidades,
  //       cantidad_ventas: totales?.cantidad_ventas || 0,
  //       // ✅ INCLUIR DATOS DE PENDIENTES EN EL CIERRE
  //       total_retiros_pendientes: pendientesTotals?.total_retiros || 0,
  //       total_ingresos_pendientes: pendientesTotals?.total_ingresos || 0,
  //       total_pendientes_pago: pendientesTotals?.total_pendientes || 0,
  //       cantidad_retiros: pendientesTotals?.cantidad_retiros || 0,
  //       cantidad_ingresos: pendientesTotals?.cantidad_ingresos || 0,
  //       cantidad_pendientes: pendientesTotals?.cantidad_pendientes || 0,
  //     };

  //     let result;

  //     if (isOnline && sesion.id) {
  //       result = await dispatch(createClosure(closureData));

  //       if (result && result.success !== false) {
  //         const closeResult = await dispatch(
  //           closeSesionCaja(sesion.id, {
  //             saldo_final: saldoFinalNumero,
  //             observaciones: observaciones.trim() || null,
  //           })
  //         );

  //         if (!closeResult || closeResult.success === false) {
  //           throw new Error("Error al cerrar sesión online");
  //         }
  //       } else {
  //         throw new Error("Error al crear cierre online");
  //       }
  //     } else {
  //       if (!ClosuresOfflineController || !SessionsOfflineController) {
  //         throw new Error("Controladores offline no disponibles");
  //       }

  //       const closureResult = await ClosuresOfflineController.createClosure(
  //         closureData
  //       );

  //       if (!closureResult.success) {
  //         throw new Error(closureResult.error);
  //       }

  //       const closeSessionResult = await SessionsOfflineController.closeSession(
  //         sesionId,
  //         {
  //           saldo_final: saldoFinalNumero,
  //           observaciones: observaciones.trim() || null,
  //         }
  //       );

  //       if (!closeSessionResult.success) {
  //         throw new Error(closeSessionResult.error);
  //       }

  //       result = {
  //         success: true,
  //         cierre: closureResult.cierre,
  //         message: "Cierre guardado localmente",
  //       };

  //       dispatch({
  //         type: types.sesionCajaClosedOffline,
  //         payload: closeSessionResult.sesion,
  //       });

  //       dispatch({
  //         type: types.closureAddNewOffline,
  //         payload: closureResult.cierre,
  //       });
  //     }

  //     await Swal.fire({
  //       icon: "success",
  //       title: isOnline ? "Cierre Completado" : "Cierre Guardado",
  //       html: `
  //         <div style="text-align: left;">
  //           <p><strong>${
  //             isOnline
  //               ? "Sesión cerrada exitosamente"
  //               : "Cierre guardado localmente"
  //           }</strong></p>
  //           <p>Total Ventas: <strong>$${closureData.total_ventas.toFixed(
  //             2
  //           )}</strong></p>
  //           <p>Productos Vendidos: <strong>${
  //             closureData.productos_vendidos
  //           }</strong></p>
  //           <p>Unidades: <strong>${closureData.unidades_vendidas}</strong></p>
  //           ${
  //             pendientesTotals &&
  //             (pendientesTotals.cantidad_retiros > 0 ||
  //               pendientesTotals.cantidad_ingresos > 0 ||
  //               pendientesTotals.cantidad_pendientes > 0)
  //               ? `<p>Movimientos Pendientes: <strong>${
  //                   (pendientesTotals.cantidad_retiros || 0) +
  //                   (pendientesTotals.cantidad_ingresos || 0) +
  //                   (pendientesTotals.cantidad_pendientes || 0)
  //                 }</strong></p>`
  //               : ""
  //           }
  //           ${
  //             !isOnline
  //               ? "<p>📱 Se sincronizará cuando recuperes conexión</p>"
  //               : ""
  //           }
  //         </div>
  //       `,
  //       confirmButtonText: "Aceptar",
  //     });

  //     if (user?.id) {
  //       setTimeout(() => {
  //         dispatch(loadOpenSesion(user.id));
  //       }, 1000);
  //     }

  //     handleCloseModal();
  //   } catch (error) {
  //     console.error("❌ Error en cierre:", error);
  //     await Swal.fire({
  //       icon: "error",
  //       title: "Error",
  //       text: error.message || "Error al cerrar la caja",
  //       confirmButtonText: "Entendido",
  //     });
  //   } finally {
  //     setProcessing(false);
  //   }
  // };
  const handleCerrarSesion = async () => {
    const saldoFinalNumero = parseFloat(saldoFinalReal);

    if (!saldoFinalReal || isNaN(saldoFinalNumero) || saldoFinalNumero < 0) {
      await Swal.fire({
        icon: "error",
        title: "Saldo inválido",
        text: "Ingresa un saldo final válido",
        confirmButtonText: "Entendido",
      });
      return;
    }

    if (!sesion) {
      await Swal.fire({
        icon: "error",
        title: "Sesión no válida",
        text: "No se encontró la sesión",
        confirmButtonText: "Entendido",
      });
      return;
    }

    setProcessing(true);

    try {
      const sesionId = sesion.id || sesion.id_local;
      const productos = productosAgrupados;
      const totalUnidades = productos.reduce(
        (sum, p) => sum + p.cantidad_total,
        0
      );

      // ✅ INCLUIR PENDIENTES Y PRODUCTOS EN EL CIERRE
      const closureData = {
        sesion_caja_id: sesion.id || sesion.id_local,
        sesion_caja_id_local: sesion.id_local || sesionId,
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
        fecha_cierre: new Date().toISOString(), // ✅ AGREGAR FECHA DE CIERRE
        productos_vendidos: productos.length,
        unidades_vendidas: totalUnidades,
        cantidad_ventas: totales?.cantidad_ventas || 0,
        // ✅ INCLUIR DATOS DE PENDIENTES EN EL CIERRE
        total_retiros_pendientes: pendientesTotals?.total_retiros || 0,
        total_ingresos_pendientes: pendientesTotals?.total_ingresos || 0,
        total_pendientes_pago: pendientesTotals?.total_pendientes || 0,
        cantidad_retiros: pendientesTotals?.cantidad_retiros || 0,
        cantidad_ingresos: pendientesTotals?.cantidad_ingresos || 0,
        cantidad_pendientes: pendientesTotals?.cantidad_pendientes || 0,
        // ✅ NUEVO: GUARDAR DETALLE COMPLETO DE PRODUCTOS VENDIDOS
        productos_vendidos_detalle: productosAgrupados, // ← ESTA ES LA CLAVE
      };

      let result;

      if (isOnline && sesion.id) {
        result = await dispatch(createClosure(closureData));

        if (result && result.success !== false) {
          const closeResult = await dispatch(
            closeSesionCaja(sesion.id, {
              saldo_final: saldoFinalNumero,
              observaciones: observaciones.trim() || null,
            })
          );

          if (!closeResult || closeResult.success === false) {
            throw new Error("Error al cerrar sesión online");
          }
        } else {
          throw new Error("Error al crear cierre online");
        }
      } else {
        if (!ClosuresOfflineController || !SessionsOfflineController) {
          throw new Error("Controladores offline no disponibles");
        }

        const closureResult = await ClosuresOfflineController.createClosure(
          closureData
        );

        if (!closureResult.success) {
          throw new Error(closureResult.error);
        }

        const closeSessionResult = await SessionsOfflineController.closeSession(
          sesionId,
          {
            saldo_final: saldoFinalNumero,
            observaciones: observaciones.trim() || null,
          }
        );

        if (!closeSessionResult.success) {
          throw new Error(closeSessionResult.error);
        }

        result = {
          success: true,
          cierre: closureResult.cierre,
          message: "Cierre guardado localmente",
        };

        dispatch({
          type: types.sesionCajaClosedOffline,
          payload: closeSessionResult.sesion,
        });

        dispatch({
          type: types.closureAddNewOffline,
          payload: closureResult.cierre,
        });
      }

      await Swal.fire({
        icon: "success",
        title: isOnline ? "Cierre Completado" : "Cierre Guardado",
        html: `
        <div style="text-align: left;">
          <p><strong>${
            isOnline
              ? "Sesión cerrada exitosamente"
              : "Cierre guardado localmente"
          }</strong></p>
          <p>Total Ventas: <strong>$${closureData.total_ventas.toFixed(
            2
          )}</strong></p>
          <p>Productos Vendidos: <strong>${
            closureData.productos_vendidos
          }</strong></p>
          <p>Unidades: <strong>${closureData.unidades_vendidas}</strong></p>
          ${
            productosAgrupados.length > 0
              ? `<p>Productos diferentes: <strong>${productosAgrupados.length}</strong></p>`
              : ""
          }
          ${
            pendientesTotals &&
            (pendientesTotals.cantidad_retiros > 0 ||
              pendientesTotals.cantidad_ingresos > 0 ||
              pendientesTotals.cantidad_pendientes > 0)
              ? `<p>Movimientos Pendientes: <strong>${
                  (pendientesTotals.cantidad_retiros || 0) +
                  (pendientesTotals.cantidad_ingresos || 0) +
                  (pendientesTotals.cantidad_pendientes || 0)
                }</strong></p>`
              : ""
          }
          ${
            !isOnline
              ? "<p>📱 Se sincronizará cuando recuperes conexión</p>"
              : ""
          }
        </div>
      `,
        confirmButtonText: "Aceptar",
      });

      if (user?.id) {
        setTimeout(() => {
          dispatch(loadOpenSesion(user.id));
        }, 1000);
      }

      handleCloseModal();
    } catch (error) {
      console.error("❌ Error en cierre:", error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Error al cerrar la caja",
        confirmButtonText: "Entendido",
      });
    } finally {
      setProcessing(false);
    }
  };
  // ✅ CERRAR MODAL
  const handleCloseModal = () => {
    setSaldoFinalReal("");
    setObservaciones("");
    setTotales(null);
    setDiferencia(0);
    setErrorCalculo(null);
    setProductosAgrupados([]);
    setVentasDelDia([]);
    setMostrarDetalleProductos(false);
    onClose();
  };

  const handleRetryCalculation = () => {
    calcularTotalesCompletos();
  };

  // ✅ RENDER RESUMEN DE VENTAS MEJORADO
  const renderResumenVentas = () => {
    if (calculating) {
      return (
        <div className={styles.calculating}>
          <div className={styles.spinner}></div>
          <p>Calculando ventas...</p>
        </div>
      );
    }

    if (errorCalculo) {
      return (
        <div className={styles.calculationError}>
          <FiAlertTriangle />
          <p>{errorCalculo}</p>
          <Button variant="secondary" onClick={handleRetryCalculation}>
            Reintentar
          </Button>
        </div>
      );
    }

    if (!totales) return null;

    return (
      <div className={styles.totalesGrid}>
        <div className={styles.totalItem}>
          <span>Total Ventas:</span>
          <span>${totales.total_ventas?.toFixed(2)}</span>
        </div>
        <div className={styles.totalItem}>
          <FiDollarSign />
          <span>Ventas Efectivo:</span>
          <span>${totales.total_efectivo?.toFixed(2)}</span>
        </div>
        <div className={styles.totalItem}>
          <FiCreditCard />
          <span>Ventas Tarjeta:</span>
          <span>${totales.total_tarjeta?.toFixed(2)}</span>
        </div>
        <div className={styles.totalItem}>
          <span>Cantidad Ventas:</span>
          <span>{totales.cantidad_ventas}</span>
        </div>
      </div>
    );
  };

  // ✅ RENDER RESUMEN DE PRODUCTOS MEJORADO
  const renderResumenProductos = () => {
    const totalUnidades = productosAgrupados.reduce(
      (sum, p) => sum + p.cantidad_total,
      0
    );

    return (
      <div className={styles.resumenProductos}>
        <div className={styles.resumenHeader}>
          <div className={styles.resumenTitle}>
            <FiPackage />
            <span>Productos Vendidos</span>
          </div>
          <button
            className={styles.toggleButton}
            onClick={() => setMostrarDetalleProductos(!mostrarDetalleProductos)}
          >
            {mostrarDetalleProductos ? <FiChevronUp /> : <FiChevronDown />}
            {mostrarDetalleProductos ? "Ocultar" : "Ver"} Detalles
          </button>
        </div>

        <div className={styles.resumenGrid}>
          <div className={styles.resumenItem}>
            <div className={styles.resumenValue}>
              {productosAgrupados.length}
            </div>
            <div className={styles.resumenLabel}>Productos Diferentes</div>
          </div>

          <div className={styles.resumenItem}>
            <div className={styles.resumenValue}>{totalUnidades}</div>
            <div className={styles.resumenLabel}>Unidades Totales</div>
          </div>

          <div className={styles.resumenItem}>
            <div className={styles.resumenValue}>
              $
              {productosAgrupados
                .reduce((sum, p) => sum + p.subtotal_total, 0)
                .toFixed(2)}
            </div>
            <div className={styles.resumenLabel}>Total Productos</div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ RENDER DETALLE DE PRODUCTOS MEJORADO
  const renderDetalleProductos = () => {
    if (!mostrarDetalleProductos || productosAgrupados.length === 0)
      return null;

    return (
      <div className={styles.productosSection}>
        <div className={styles.sectionHeader}>
          <FiBox />
          <span>Detalle de Productos Vendidos</span>
          <span className={styles.badge}>
            {productosAgrupados.length} productos
          </span>
        </div>

        <div className={styles.productosList}>
          {productosAgrupados
            .sort((a, b) => b.cantidad_total - a.cantidad_total)
            .map((producto) => (
              <div key={producto.producto_id} className={styles.productoItem}>
                <div className={styles.productoInfo}>
                  <span className={styles.productoNombre}>
                    {producto.nombre}
                  </span>
                  <div className={styles.productoDetalles}>
                    <span className={styles.productoCantidad}>
                      {producto.cantidad_total} unidades
                    </span>
                    <span className={styles.productoPrecioUnit}>
                      ${producto.precio_unitario?.toFixed(2)} c/u
                    </span>
                  </div>
                </div>
                <div className={styles.productoTotal}>
                  ${producto.subtotal_total.toFixed(2)}
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  if (!controllersLoaded) {
    return (
      <Modal isOpen={isOpen} onClose={handleCloseModal} title="Cerrar Sesión">
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Cargando controladores...</p>
        </div>
      </Modal>
    );
  }

  if (!sesion) {
    return (
      <Modal isOpen={isOpen} onClose={handleCloseModal} title="Cerrar Sesión">
        <div className={styles.errorState}>
          <p>No se encontró la sesión activa</p>
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
        {/* Estado de conexión */}
        <div
          className={`${styles.connectionStatus} ${
            isOnline ? styles.online : styles.offline
          }`}
        >
          {isOnline ? <FiWifi /> : <FiWifiOff />}
          <span>{isOnline ? "Conectado" : "Sin conexión"}</span>
        </div>

        {/* Información de la Sesión */}
        <div className={styles.sessionInfo}>
          <h4>
            <FiClock />
            Sesión Actual
          </h4>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span>Fecha Apertura:</span>
              <span>
                {new Date(sesion.fecha_apertura).toLocaleDateString()}{" "}
                {new Date(sesion.fecha_apertura).toLocaleTimeString()}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span>Saldo Inicial:</span>
              <span>${sesion.saldo_inicial?.toFixed(2)}</span>
            </div>
            <div className={styles.infoItem}>
              <span>ID Sesión:</span>
              <span className={styles.sessionId}>
                {sesion.id_local || sesion.id}
              </span>
            </div>
          </div>
        </div>

        {/* Resumen de Ventas */}
        <div className={styles.salesSummary}>
          <h4>
            <FiShoppingCart />
            Resumen de Ventas
          </h4>
          {renderResumenVentas()}
        </div>

        {/* Resumen de Pendientes */}
        <PendientesResumen
          pendientesTotals={pendientesTotals}
          onVerDetalles={handleVerDetallesPendientes}
        />

        {/* Resumen de Productos */}
        {renderResumenProductos()}

        {/* Detalle de Productos */}
        {renderDetalleProductos()}

        {/* Entrada de Saldo Final */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            <FiDollarSign />
            Saldo Final Real
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
          <div className={styles.helperText}>
            Saldo teórico: ${totales?.saldo_final_teorico?.toFixed(2) || "0.00"}
            {pendientesTotals &&
              (pendientesTotals.total_ingresos > 0 ||
                pendientesTotals.total_retiros > 0) &&
              ` (incluye ${pendientesTotals.total_ingresos > 0 ? "+" : ""}$${
                pendientesTotals.total_ingresos || 0
              } ingresos ${pendientesTotals.total_retiros > 0 ? "-" : ""}$${
                pendientesTotals.total_retiros || 0
              } retiros)`}
          </div>
        </div>

        {/* Diferencia */}
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
              <span>
                {diferencia > 0 ? "+" : ""}${Math.abs(diferencia).toFixed(2)}
                {diferencia !== 0 && (
                  <span className={styles.differenceIcon}>
                    {diferencia > 0 ? "⬆️" : "⬇️"}
                  </span>
                )}
              </span>
            </div>
            {diferencia !== 0 && (
              <div className={styles.differenceNote}>
                {diferencia > 0
                  ? "Hay más dinero del esperado"
                  : "Falta dinero en caja"}
              </div>
            )}
          </div>
        )}

        {/* Observaciones */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            <FiInfo />
            Observaciones
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas sobre el cierre, diferencias, incidencias..."
            rows="3"
            className={styles.textarea}
          />
        </div>

        {/* Acciones */}
        <div className={styles.actions}>
          <Button
            variant="outline"
            onClick={handleDiagnosticar}
            disabled={processing}
          >
            <FiList />
            Diagnosticar
          </Button>

          <div className={styles.mainActions}>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCerrarSesion}
              disabled={!saldoFinalReal || processing || calculating}
              loading={processing}
            >
              {processing ? "Procesando..." : "Confirmar Cierre"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CierreCajaModal;
