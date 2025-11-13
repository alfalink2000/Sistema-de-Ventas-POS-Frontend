// // components/features/caja/CierreCajaModal/CierreCajaModal.jsx
// import { useState, useEffect, useCallback } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useOfflineControllers } from "../../../../hooks/useOfflineControllers";
// import Modal from "../../../ui/Modal/Modal";
// import Button from "../../../ui/Button/Button";
// import Swal from "sweetalert2";
// import { types } from "../../../../types/types";
// import {
//   FiWifi,
//   FiWifiOff,
//   FiDollarSign,
//   FiClock,
//   FiShoppingCart,
//   FiBarChart2,
//   FiPackage,
//   FiList,
//   FiAlertTriangle,
// } from "react-icons/fi";
// import styles from "./CierreCajaModal.module.css";

// // ✅ IMPORTAR ACTIONS DIRECTAMENTE
// import {
//   closeSesionCaja,
//   loadOpenSesion,
// } from "../../../../actions/sesionesCajaActions";
// import {
//   createClosure,
//   calculateClosureTotals,
// } from "../../../../actions/closuresActions";

// const CierreCajaModal = ({ isOpen, onClose, sesion }) => {
//   const [saldoFinalReal, setSaldoFinalReal] = useState("");
//   const [observaciones, setObservaciones] = useState("");
//   const [processing, setProcessing] = useState(false);
//   const [calculating, setCalculating] = useState(false);
//   const [totales, setTotales] = useState(null);
//   const [diferencia, setDiferencia] = useState(0);
//   const [errorCalculo, setErrorCalculo] = useState(null);
//   const [productosAgrupados, setProductosAgrupados] = useState([]);
//   const [mostrarDetalleProductos, setMostrarDetalleProductos] = useState(false);

//   const dispatch = useDispatch();
//   const { user } = useSelector((state) => state.auth);
//   const isOnline = navigator.onLine;

//   // ✅ USAR HOOK PARA CONTROLADORES
//   const {
//     ClosuresOfflineController,
//     SessionsOfflineController,
//     SalesOfflineController,
//     loaded: controllersLoaded,
//   } = useOfflineControllers();

//   // ✅ CALCULAR TOTALES CON CONTROLADORES DINÁMICOS
//   const calcularTotalesCompletos = useCallback(async () => {
//     if (!sesion || !controllersLoaded) return;

//     setCalculating(true);
//     setErrorCalculo(null);

//     try {
//       let totals;
//       const sesionId = sesion.id || sesion.id_local;

//       console.log(`🔄 Calculando totales para sesión: ${sesionId}`);

//       if (isOnline && sesion.id) {
//         try {
//           // Intentar cálculo online primero
//           console.log("🌐 Intentando cálculo online...");
//           totals = await dispatch(calculateClosureTotals(sesion.id));
//         } catch (onlineError) {
//           console.warn(
//             "⚠️ Error en cálculo online, intentando offline:",
//             onlineError
//           );
//           // Fallback a cálculo offline
//           if (ClosuresOfflineController) {
//             console.log("📱 Usando cálculo offline...");
//             totals = await ClosuresOfflineController.calculateSessionTotals(
//               sesionId
//             );
//           } else {
//             throw new Error("Controlador offline no disponible");
//           }
//         }
//       } else {
//         // Cálculo offline directo
//         console.log("📱 Cálculo offline directo...");
//         if (ClosuresOfflineController) {
//           totals = await ClosuresOfflineController.calculateSessionTotals(
//             sesionId
//           );
//         } else {
//           throw new Error("Controlador offline no disponible");
//         }
//       }

//       const saldoInicial = sesion.saldo_inicial || 0;
//       const saldoFinalTeorico = saldoInicial + (totals.total_efectivo || 0);

//       const totalesCompletos = {
//         ...totals,
//         saldo_final_teorico: saldoFinalTeorico,
//         saldo_inicial: saldoInicial,
//       };

//       setTotales(totalesCompletos);

//       // Sugerir saldo final real basado en el teórico
//       if (!saldoFinalReal) {
//         setSaldoFinalReal(saldoFinalTeorico.toFixed(2));
//       }

//       console.log("✅ Totales calculados exitosamente:", totalesCompletos);
//     } catch (error) {
//       console.error("❌ Error calculando totales:", error);
//       setErrorCalculo(
//         error.message ||
//           "No se pudieron calcular los totales. Verifica las ventas."
//       );

//       // Datos por defecto en caso de error
//       setTotales({
//         total_ventas: 0,
//         total_efectivo: 0,
//         total_tarjeta: 0,
//         total_transferencia: 0,
//         ganancia_bruta: 0,
//         cantidad_ventas: 0,
//         saldo_final_teorico: sesion?.saldo_inicial || 0,
//         saldo_inicial: sesion?.saldo_inicial || 0,
//       });
//     } finally {
//       setCalculating(false);
//     }
//   }, [
//     sesion,
//     dispatch,
//     saldoFinalReal,
//     isOnline,
//     controllersLoaded,
//     ClosuresOfflineController,
//   ]);

//   // ✅ OBTENER PRODUCTOS AGRUPADOS
//   const obtenerProductosAgrupados = useCallback(async () => {
//     if (!sesion || !SalesOfflineController) return;

//     try {
//       const sesionId = sesion.id || sesion.id_local;
//       console.log(`📊 Obteniendo productos agrupados para sesión: ${sesionId}`);

//       const resumen = await SalesOfflineController.getSalesSummaryBySession(
//         sesionId
//       );
//       setProductosAgrupados(resumen.productosAgrupados || []);

//       console.log(
//         `✅ ${resumen.productosAgrupados.length} productos agrupados obtenidos`
//       );
//     } catch (error) {
//       console.error("❌ Error obteniendo productos agrupados:", error);
//       setProductosAgrupados([]);
//     }
//   }, [sesion, SalesOfflineController]);

//   // ✅ EFFECT PRINCIPAL
//   useEffect(() => {
//     if (isOpen && sesion && controllersLoaded) {
//       console.log("🔄 Inicializando modal de cierre...");
//       calcularTotalesCompletos();
//       obtenerProductosAgrupados();
//     }
//   }, [
//     isOpen,
//     sesion,
//     calcularTotalesCompletos,
//     obtenerProductosAgrupados,
//     controllersLoaded,
//   ]);

//   // ✅ EFFECT PARA DIFERENCIA
//   useEffect(() => {
//     if (totales && saldoFinalReal) {
//       const saldoRealNum = parseFloat(saldoFinalReal) || 0;
//       const diferenciaCalculada = saldoRealNum - totales.saldo_final_teorico;
//       setDiferencia(diferenciaCalculada);
//     } else {
//       setDiferencia(0);
//     }
//   }, [saldoFinalReal, totales]);

//   // ✅ FUNCIÓN DE DIAGNÓSTICO PRINCIPAL
//   const handleDiagnosticar = async () => {
//     if (!sesion || !SalesOfflineController) {
//       await Swal.fire({
//         icon: "error",
//         title: "Controlador no disponible",
//         text: "El controlador de ventas offline no está disponible",
//         confirmButtonText: "Entendido",
//       });
//       return;
//     }

//     const sesionId = sesion.id || sesion.id_local;

//     try {
//       console.log(`🔍 Iniciando diagnóstico para sesión: ${sesionId}`);

//       const resumen = await SalesOfflineController.getSalesSummaryBySession(
//         sesionId
//       );

//       // ✅ VERIFICAR SI HAY PRODUCTOS
//       if (
//         !resumen.productosAgrupados ||
//         resumen.productosAgrupados.length === 0
//       ) {
//         await Swal.fire({
//           title: "📊 Diagnóstico de Ventas",
//           html: `
//             <div style="text-align: left; font-size: 14px;">
//               <div style="margin-bottom: 15px; padding: 10px; background: #fff3cd; border-radius: 5px;">
//                 <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Sin Productos Vendidos</h4>
//                 <p>No se encontraron productos vendidos en esta sesión.</p>
//                 <p><strong>Ventas encontradas:</strong> ${
//                   resumen.ventas?.length || 0
//                 }</p>
//                 <p><strong>Detalles de venta:</strong> ${
//                   resumen.totales?.productos_vendidos || 0
//                 }</p>
//               </div>
//               <div style="color: #666; font-size: 12px;">
//                 <p><em>Posibles causas:</em></p>
//                 <ul>
//                   <li>Las ventas no tienen detalles asociados</li>
//                   <li>Los detalles de venta no se guardaron correctamente</li>
//                   <li>Problema de sincronización con la base de datos local</li>
//                 </ul>
//               </div>
//             </div>
//           `,
//           width: 600,
//           confirmButtonText: "Entendido",
//         });
//         return;
//       }

//       await Swal.fire({
//         title: "📊 Diagnóstico Detallado de Ventas",
//         html: `
//           <div style="text-align: left; font-size: 14px; max-height: 60vh; overflow-y: auto;">
//             <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
//               <h4 style="margin: 0 0 10px 0; color: #333;">📈 Resumen General</h4>
//               <p><strong>Total Ventas:</strong> ${
//                 resumen.totales.cantidad_ventas
//               }</p>
//               <p><strong>Productos Vendidos:</strong> ${
//                 resumen.totales.productos_vendidos
//               } unidades</p>
//               <p><strong>Ventas Totales:</strong> $${resumen.totales.total_ventas.toFixed(
//                 2
//               )}</p>
//               <p><strong>Ganancia Bruta:</strong> $${resumen.totales.ganancia_bruta.toFixed(
//                 2
//               )}</p>
//             </div>

//             <div style="margin-bottom: 15px;">
//               <h4 style="margin: 0 0 10px 0; color: #333;">💵 Por Método de Pago</h4>
//               <p><strong>Efectivo:</strong> $${resumen.totales.total_efectivo.toFixed(
//                 2
//               )}</p>
//               <p><strong>Tarjeta:</strong> $${resumen.totales.total_tarjeta.toFixed(
//                 2
//               )}</p>
//               <p><strong>Transferencia:</strong> $${resumen.totales.total_transferencia.toFixed(
//                 2
//               )}</p>
//             </div>

//             <div>
//               <h4 style="margin: 0 0 10px 0; color: #333;">🛍️ Productos Vendidos</h4>
//               <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
//                 ${resumen.productosAgrupados
//                   .map(
//                     (producto) => `
//                   <div style="padding: 5px; margin: 3px 0; background: #e8f5e8; border-radius: 3px; border-left: 4px solid #4caf50;">
//                     <strong>${producto.nombre}</strong><br/>
//                     <small>
//                       <strong>x${producto.cantidad_total}</strong> unidades |
//                       Precio: $${producto.precio_venta_unitario.toFixed(2)} |
//                       Costo: $${producto.precio_compra_unitario.toFixed(2)} |
//                       <strong> Ganancia: $${producto.ganancia_total.toFixed(
//                         2
//                       )}</strong>
//                     </small>
//                   </div>
//                 `
//                   )
//                   .join("")}
//               </div>
//             </div>
//           </div>
//         `,
//         width: 700,
//         confirmButtonText: "Entendido",
//       });

//       // Actualizar el estado local con los productos agrupados
//       setProductosAgrupados(resumen.productosAgrupados);
//     } catch (error) {
//       console.error("❌ Error en diagnóstico:", error);
//       await Swal.fire({
//         icon: "error",
//         title: "Error en diagnóstico",
//         text: error.message || "No se pudieron obtener los datos de ventas",
//         confirmButtonText: "Entendido",
//       });
//     }
//   };

//   // ✅ FUNCIÓN DE DIAGNÓSTICO DETALLADO (DEBUG)
//   const handleDiagnosticarDetallado = async () => {
//     if (!sesion || !SalesOfflineController) return;

//     const sesionId = sesion.id || sesion.id_local;

//     try {
//       console.log(
//         `🔍 Iniciando diagnóstico DETALLADO para sesión: ${sesionId}`
//       );

//       // 1. Obtener ventas de la sesión
//       const ventas = await SalesOfflineController.getSalesBySession(sesionId);
//       console.log(`📊 ${ventas.length} ventas encontradas:`, ventas);

//       // 2. Obtener detalles de cada venta
//       let todosLosDetalles = [];
//       for (const venta of ventas) {
//         const detalles = await SalesOfflineController.getSaleDetails(
//           venta.id_local
//         );
//         console.log(
//           `📦 Venta ${venta.id_local} tiene ${detalles.length} detalles:`,
//           detalles
//         );
//         todosLosDetalles = [...todosLosDetalles, ...detalles];
//       }

//       // 3. Agrupar productos manualmente para diagnóstico
//       const productosAgrupadosManual = {};
//       todosLosDetalles.forEach((detalle) => {
//         const key = detalle.producto_id;
//         if (!productosAgrupadosManual[key]) {
//           productosAgrupadosManual[key] = {
//             producto_id: detalle.producto_id,
//             nombre:
//               detalle.producto_nombre || `Producto ${detalle.producto_id}`,
//             cantidad_total: 0,
//             precio_venta_unitario: detalle.precio_unitario,
//             subtotal_total: 0,
//           };
//         }
//         productosAgrupadosManual[key].cantidad_total += detalle.cantidad;
//         productosAgrupadosManual[key].subtotal_total += detalle.subtotal;
//       });

//       const productosAgrupadosArray = Object.values(productosAgrupadosManual);

//       // 4. Mostrar diagnóstico detallado
//       await Swal.fire({
//         title: "🔍 Diagnóstico Detallado de Datos",
//         html: `
//           <div style="text-align: left; font-size: 14px; max-height: 70vh; overflow-y: auto;">
//             <div style="margin-bottom: 15px; padding: 10px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
//               <h4 style="margin: 0 0 10px 0; color: #856404;">📊 Resumen de Datos Encontrados</h4>
//               <p><strong>Ventas en la sesión:</strong> ${ventas.length}</p>
//               <p><strong>Total detalles de venta:</strong> ${
//                 todosLosDetalles.length
//               }</p>
//               <p><strong>Productos únicos vendidos:</strong> ${
//                 productosAgrupadosArray.length
//               }</p>
//             </div>

//             <div style="margin-bottom: 15px;">
//               <h4 style="margin: 0 0 10px 0; color: #333;">🛒 Ventas Encontradas</h4>
//               ${ventas
//                 .map(
//                   (venta) => `
//                 <div style="padding: 8px; margin: 5px 0; background: #e9ecef; border-radius: 4px;">
//                   <strong>${venta.id_local}</strong> - $${
//                     venta.total?.toFixed(2) || "0.00"
//                   }
//                   (${venta.metodo_pago || "efectivo"})<br/>
//                   <small>ID: ${venta.id_local} | Sesión: ${
//                     venta.sesion_caja_id
//                   }</small>
//                 </div>
//               `
//                 )
//                 .join("")}
//             </div>

//             <div style="margin-bottom: 15px;">
//               <h4 style="margin: 0 0 10px 0; color: #333;">📦 Detalles de Ventas</h4>
//               ${
//                 todosLosDetalles.length > 0
//                   ? todosLosDetalles
//                       .map(
//                         (detalle) => `
//                 <div style="padding: 6px; margin: 3px 0; background: #d1ecf1; border-radius: 3px; font-size: 12px;">
//                   <strong>${
//                     detalle.producto_nombre || `Producto ${detalle.producto_id}`
//                   }</strong><br/>
//                   <small>
//                     Venta: ${detalle.venta_id_local} |
//                     Cantidad: ${detalle.cantidad} |
//                     Precio: $${detalle.precio_unitario?.toFixed(2)} |
//                     Subtotal: $${detalle.subtotal?.toFixed(2)}
//                   </small>
//                 </div>
//               `
//                       )
//                       .join("")
//                   : '<p style="color: #dc3545; font-style: italic;">No se encontraron detalles de venta</p>'
//               }
//             </div>

//             <div>
//               <h4 style="margin: 0 0 10px 0; color: #333;">📋 Productos Agrupados</h4>
//               ${
//                 productosAgrupadosArray.length > 0
//                   ? productosAgrupadosArray
//                       .map(
//                         (producto) => `
//                 <div style="padding: 8px; margin: 5px 0; background: #d4edda; border-radius: 4px; border-left: 4px solid #28a745;">
//                   <strong>${producto.nombre}</strong><br/>
//                   <small>
//                     <strong>x${producto.cantidad_total}</strong> unidades |
//                     Total: $${producto.subtotal_total.toFixed(2)} |
//                     Precio unitario: $${producto.precio_venta_unitario.toFixed(
//                       2
//                     )}
//                   </small>
//                 </div>
//               `
//                       )
//                       .join("")
//                   : '<p style="color: #dc3545; font-style: italic;">No se pudieron agrupar productos</p>'
//               }
//             </div>
//           </div>
//         `,
//         width: 800,
//         confirmButtonText: "Entendido",
//       });
//     } catch (error) {
//       console.error("❌ Error en diagnóstico detallado:", error);
//       await Swal.fire({
//         icon: "error",
//         title: "Error en diagnóstico",
//         text: error.message,
//         confirmButtonText: "Entendido",
//       });
//     }
//   };

//   // ✅ RENDER DETALLE DE PRODUCTOS
//   const renderDetalleProductos = () => {
//     if (!mostrarDetalleProductos || productosAgrupados.length === 0)
//       return null;

//     return (
//       <div className={styles.productosSection}>
//         <h4>
//           <FiPackage className={styles.sectionIcon} />
//           Detalle de Productos Vendidos
//           <span className={styles.productCount}>
//             {productosAgrupados.length} productos
//           </span>
//         </h4>

//         <div className={styles.productosGrid}>
//           {productosAgrupados.map((producto) => (
//             <div key={producto.producto_id} className={styles.productoCard}>
//               <div className={styles.productoHeader}>
//                 <span className={styles.productoNombre}>{producto.nombre}</span>
//                 <span className={styles.productoCantidad}>
//                   x{producto.cantidad_total}
//                 </span>
//               </div>

//               <div className={styles.productoDetalles}>
//                 <div className={styles.detalleRow}>
//                   <span>Precio Venta:</span>
//                   <span>${producto.precio_venta_unitario.toFixed(2)}</span>
//                 </div>
//                 <div className={styles.detalleRow}>
//                   <span>Costo Unitario:</span>
//                   <span>${producto.precio_compra_unitario.toFixed(2)}</span>
//                 </div>
//                 <div className={styles.detalleRow}>
//                   <span>Subtotal:</span>
//                   <span>${producto.subtotal_total.toFixed(2)}</span>
//                 </div>
//                 <div className={`${styles.detalleRow} ${styles.gananciaRow}`}>
//                   <span>Ganancia:</span>
//                   <span className={styles.gananciaValue}>
//                     +${producto.ganancia_total.toFixed(2)}
//                   </span>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   };

//   // ✅ MANEJAR CIERRE DE SESIÓN
//   const handleCerrarSesion = async () => {
//     const saldoFinalNumero = parseFloat(saldoFinalReal);

//     if (!saldoFinalReal || isNaN(saldoFinalNumero) || saldoFinalNumero < 0) {
//       await Swal.fire({
//         icon: "error",
//         title: "Saldo inválido",
//         text: "Ingresa un saldo final válido (número positivo)",
//         confirmButtonText: "Entendido",
//       });
//       return;
//     }

//     if (!sesion) {
//       await Swal.fire({
//         icon: "error",
//         title: "Sesión no válida",
//         text: "No se encontró la sesión de caja",
//         confirmButtonText: "Entendido",
//       });
//       return;
//     }

//     setProcessing(true);

//     try {
//       const sesionId = sesion.id || sesion.id_local;
//       const closureData = {
//         sesion_caja_id: sesion.id || sesion.id_local,
//         sesion_caja_id_local: sesion.id_local || sesionId,
//         vendedor_id: user.id,
//         vendedor_nombre: user.nombre || user.username,
//         total_ventas: totales?.total_ventas || 0,
//         total_efectivo: totales?.total_efectivo || 0,
//         total_tarjeta: totales?.total_tarjeta || 0,
//         total_transferencia: totales?.total_transferencia || 0,
//         ganancia_bruta: totales?.ganancia_bruta || 0,
//         saldo_inicial: totales?.saldo_inicial || sesion.saldo_inicial || 0,
//         saldo_final_teorico: totales?.saldo_final_teorico || 0,
//         saldo_final_real: saldoFinalNumero,
//         diferencia: diferencia,
//         observaciones: observaciones.trim() || null,
//         fecha_apertura: sesion.fecha_apertura,
//       };

//       let result;

//       if (isOnline && sesion.id) {
//         // ✅ MODO ONLINE - Usar actions de Redux
//         result = await dispatch(createClosure(closureData));

//         if (result && result.success !== false) {
//           // Cerrar sesión en servidor
//           const closeResult = await dispatch(
//             closeSesionCaja(sesion.id, {
//               saldo_final: saldoFinalNumero,
//               observaciones: observaciones.trim() || null,
//             })
//           );

//           if (!closeResult || closeResult.success === false) {
//             throw new Error(
//               closeResult?.error || "Error al cerrar sesión online"
//             );
//           }
//         } else {
//           throw new Error(
//             result?.error || "Error al crear cierre de caja online"
//           );
//         }
//       } else {
//         // ✅ MODO OFFLINE - Usar controladores offline
//         console.log("📱 Creando cierre offline...");

//         if (!ClosuresOfflineController || !SessionsOfflineController) {
//           throw new Error("Controladores offline no disponibles");
//         }

//         // 1. Crear cierre offline
//         const closureResult = await ClosuresOfflineController.createClosure(
//           closureData
//         );

//         if (!closureResult.success) {
//           throw new Error(closureResult.error);
//         }

//         // 2. Cerrar sesión offline
//         const closeSessionResult = await SessionsOfflineController.closeSession(
//           sesionId,
//           {
//             saldo_final: saldoFinalNumero,
//             observaciones: observaciones.trim() || null,
//           }
//         );

//         if (!closeSessionResult.success) {
//           throw new Error(closeSessionResult.error);
//         }

//         result = {
//           success: true,
//           cierre: closureResult.cierre,
//           message:
//             "Cierre guardado localmente. Se sincronizará cuando haya conexión.",
//         };

//         // ✅ DISPATCH PARA ACTUALIZAR ESTADO LOCAL
//         dispatch({
//           type: types.sesionCajaClosedOffline,
//           payload: closeSessionResult.sesion,
//         });

//         dispatch({
//           type: types.closureAddNewOffline,
//           payload: closureResult.cierre,
//         });

//         console.log("✅ Cierre y sesión cerrados localmente");
//       }

//       // ✅ MOSTRAR CONFIRMACIÓN
//       await Swal.fire({
//         icon: "success",
//         title: isOnline ? "Cierre Completado" : "Cierre Guardado (Offline)",
//         text: isOnline
//           ? "La sesión de caja ha sido cerrada exitosamente"
//           : "El cierre se guardó localmente y se sincronizará cuando haya conexión",
//         confirmButtonText: "Aceptar",
//       });

//       // ✅ FORZAR RECARGA DE SESIÓN ABIERTA
//       if (user?.id) {
//         setTimeout(() => {
//           dispatch(loadOpenSesion(user.id));
//         }, 1000);
//       }

//       handleCloseModal();
//     } catch (error) {
//       console.error("❌ Error en cierre de caja:", error);

//       await Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: error.message || "Ocurrió un error al cerrar la caja",
//         confirmButtonText: "Entendido",
//       });
//     } finally {
//       setProcessing(false);
//     }
//   };

//   // ✅ CERRAR MODAL
//   const handleCloseModal = () => {
//     setSaldoFinalReal("");
//     setObservaciones("");
//     setTotales(null);
//     setDiferencia(0);
//     setErrorCalculo(null);
//     setProductosAgrupados([]);
//     setMostrarDetalleProductos(false);
//     onClose();
//   };

//   const handleRetryCalculation = () => {
//     calcularTotalesCompletos();
//   };

//   // ✅ LOADING MIENTRAS CARGAN CONTROLADORES
//   if (!controllersLoaded) {
//     return (
//       <Modal
//         isOpen={isOpen}
//         onClose={handleCloseModal}
//         title="Cerrar Sesión de Caja"
//       >
//         <div className={styles.loadingState}>
//           <div className={styles.spinner}></div>
//           <p>Cargando controladores offline...</p>
//           <small>Esperando que los módulos se carguen completamente</small>
//         </div>
//       </Modal>
//     );
//   }

//   if (!sesion) {
//     return (
//       <Modal
//         isOpen={isOpen}
//         onClose={handleCloseModal}
//         title="Cerrar Sesión de Caja"
//       >
//         <div className={styles.errorState}>
//           <p>No se encontró la sesión de caja</p>
//           <Button variant="secondary" onClick={handleCloseModal}>
//             Cerrar
//           </Button>
//         </div>
//       </Modal>
//     );
//   }

//   return (
//     <Modal
//       isOpen={isOpen}
//       onClose={handleCloseModal}
//       title="Cerrar Sesión de Caja"
//       size="large"
//     >
//       <div className={styles.modalContent}>
//         {/* Indicador de estado de conexión */}
//         <div
//           className={`${styles.connectionStatus} ${
//             isOnline ? styles.online : styles.offline
//           }`}
//         >
//           {isOnline ? (
//             <>
//               <FiWifi className={styles.connectionIcon} />
//               <span>Conectado - Los datos se guardarán en el servidor</span>
//             </>
//           ) : (
//             <>
//               <FiWifiOff className={styles.connectionIcon} />
//               <span>Sin conexión - Los datos se guardarán localmente</span>
//             </>
//           )}
//         </div>

//         {/* Información de la Sesión */}
//         <div className={styles.sessionInfo}>
//           <h4>
//             <FiClock className={styles.sectionIcon} />
//             Información de la Sesión
//           </h4>
//           <div className={styles.infoGrid}>
//             <div className={styles.infoItem}>
//               <span>Fecha Apertura:</span>
//               <span>
//                 {new Date(sesion.fecha_apertura).toLocaleString("es-MX")}
//               </span>
//             </div>
//             <div className={styles.infoItem}>
//               <span>Saldo Inicial:</span>
//               <span className={styles.highlight}>
//                 ${sesion.saldo_inicial?.toFixed(2)}
//               </span>
//             </div>
//             <div className={styles.infoItem}>
//               <span>Estado:</span>
//               <span
//                 className={isOnline ? styles.onlineBadge : styles.localBadge}
//               >
//                 {isOnline ? "Sincronizada" : "Sesión Local"}
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* Resumen de Ventas */}
//         <div className={styles.salesSummary}>
//           <h4>
//             <FiShoppingCart className={styles.sectionIcon} />
//             Resumen de Ventas
//             {!isOnline && <span className={styles.offlineBadge}>Local</span>}
//           </h4>

//           {calculating ? (
//             <div className={styles.calculating}>
//               <div className={styles.spinner}></div>
//               <p>
//                 {isOnline
//                   ? "Calculando totales de ventas..."
//                   : "Calculando totales localmente..."}
//               </p>
//             </div>
//           ) : errorCalculo ? (
//             <div className={styles.calculationError}>
//               <FiAlertTriangle className={styles.errorIcon} />
//               <p>{errorCalculo}</p>
//               <div className={styles.errorActions}>
//                 <Button variant="secondary" onClick={handleRetryCalculation}>
//                   Reintentar Cálculo
//                 </Button>
//                 <Button variant="outline" onClick={handleDiagnosticarDetallado}>
//                   <FiList style={{ marginRight: "4px" }} />
//                   Diagnóstico Avanzado
//                 </Button>
//               </div>
//             </div>
//           ) : (
//             totales && (
//               <>
//                 <div className={styles.totalesGrid}>
//                   <div className={styles.totalItem}>
//                     <span>Total Ventas:</span>
//                     <span>${totales.total_ventas?.toFixed(2)}</span>
//                   </div>
//                   <div className={styles.totalItem}>
//                     <span>Ventas Efectivo:</span>
//                     <span>${totales.total_efectivo?.toFixed(2)}</span>
//                   </div>
//                   <div className={styles.totalItem}>
//                     <span>Ventas Tarjeta:</span>
//                     <span>${totales.total_tarjeta?.toFixed(2)}</span>
//                   </div>
//                   <div className={styles.totalItem}>
//                     <span>Cantidad Ventas:</span>
//                     <span>
//                       <FiPackage style={{ marginRight: "4px" }} />
//                       {totales.cantidad_ventas}
//                     </span>
//                   </div>
//                 </div>

//                 {/* Cálculos de Caja */}
//                 <div className={styles.cashCalculations}>
//                   <h5>
//                     <FiBarChart2 className={styles.sectionIcon} />
//                     Cálculos de Caja
//                   </h5>
//                   <div className={styles.calculationGrid}>
//                     <div className={styles.calcItem}>
//                       <span>Saldo Inicial:</span>
//                       <span>${totales.saldo_inicial?.toFixed(2)}</span>
//                     </div>
//                     <div className={styles.calcItem}>
//                       <span>+ Ventas Efectivo:</span>
//                       <span>+${totales.total_efectivo?.toFixed(2)}</span>
//                     </div>
//                     <div className={styles.calcItem}>
//                       <span>Saldo Final Teórico:</span>
//                       <span className={styles.theoreticalHighlight}>
//                         ${totales.saldo_final_teorico?.toFixed(2)}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               </>
//             )
//           )}
//         </div>

//         {/* Entrada de Saldo Final Real */}
//         <div className={styles.formGroup}>
//           <label className={styles.label}>
//             <FiDollarSign className={styles.labelIcon} />
//             Saldo Final Real (Contado Físicamente)
//             <small>Ingresa el monto real que cuentas en caja</small>
//           </label>
//           <input
//             type="number"
//             value={saldoFinalReal}
//             onChange={(e) => setSaldoFinalReal(e.target.value)}
//             placeholder={totales?.saldo_final_teorico?.toFixed(2) || "0.00"}
//             step="0.01"
//             min="0"
//             className={styles.input}
//             disabled={calculating}
//           />
//         </div>

//         {/* Diferencia Automática */}
//         {saldoFinalReal && (
//           <div className={styles.differenceSection}>
//             <div
//               className={`${styles.difference} ${
//                 diferencia === 0
//                   ? styles.exact
//                   : diferencia > 0
//                   ? styles.surplus
//                   : styles.shortage
//               }`}
//             >
//               <span>Diferencia:</span>
//               <span className={styles.differenceAmount}>
//                 {diferencia > 0 ? "+" : ""}${Math.abs(diferencia).toFixed(2)}
//               </span>
//             </div>
//             <small className={styles.differenceHelp}>
//               {diferencia === 0
//                 ? "✅ Perfecto, la caja cuadra exactamente"
//                 : diferencia > 0
//                 ? "📈 Hay sobrante en caja"
//                 : "📉 Hay faltante en caja"}
//             </small>
//           </div>
//         )}

//         {/* Observaciones */}
//         <div className={styles.formGroup}>
//           <label className={styles.label}>
//             📝 Observaciones (Opcional)
//             <small>Notas sobre el cierre, diferencias, etc...</small>
//           </label>
//           <textarea
//             value={observaciones}
//             onChange={(e) => setObservaciones(e.target.value)}
//             placeholder="Ej: Cierre normal, sin novedades..."
//             rows="3"
//             className={styles.textarea}
//             disabled={processing}
//           />
//         </div>

//         {!isOnline && (
//           <div className={styles.offlineWarning}>
//             <strong>⚠️ Modo Offline</strong>
//             <p>
//               El cierre se guardará localmente y se sincronizará automáticamente
//               cuando recuperes la conexión a internet.
//             </p>
//           </div>
//         )}

//         {/* ✅ SECCIÓN: BOTÓN PARA MOSTRAR/OCULTAR DETALLE DE PRODUCTOS */}
//         {productosAgrupados.length > 0 && (
//           <div className={styles.productosToggle}>
//             <Button
//               variant="outline"
//               onClick={() =>
//                 setMostrarDetalleProductos(!mostrarDetalleProductos)
//               }
//               style={{ width: "100%", marginBottom: "10px" }}
//             >
//               <FiPackage style={{ marginRight: "8px" }} />
//               {mostrarDetalleProductos ? "Ocultar" : "Mostrar"} Detalle de
//               Productos ({productosAgrupados.length} productos,{" "}
//               {productosAgrupados.reduce((sum, p) => sum + p.cantidad_total, 0)}{" "}
//               unidades)
//             </Button>
//           </div>
//         )}

//         {/* ✅ SECCIÓN DE DETALLE DE PRODUCTOS */}
//         {renderDetalleProductos()}

//         {/* Acciones */}
//         <div className={styles.actions}>
//           <div className={styles.diagnosticButtons}>
//             <Button
//               variant="outline"
//               onClick={handleDiagnosticar}
//               disabled={processing}
//               style={{
//                 backgroundColor: "#f0f9ff",
//                 borderColor: "#0ea5e9",
//                 color: "#0369a1",
//               }}
//             >
//               <FiList style={{ marginRight: "4px" }} />
//               Diagnosticar Ventas
//             </Button>

//             <Button
//               variant="outline"
//               onClick={handleDiagnosticarDetallado}
//               disabled={processing}
//               style={{
//                 backgroundColor: "#fff3cd",
//                 borderColor: "#ffc107",
//                 color: "#856404",
//               }}
//             >
//               <FiAlertTriangle style={{ marginRight: "4px" }} />
//               Diagnóstico Avanzado
//             </Button>
//           </div>

//           <div className={styles.mainActions}>
//             <Button
//               variant="secondary"
//               onClick={handleCloseModal}
//               disabled={processing}
//             >
//               Cancelar
//             </Button>
//             <Button
//               variant="primary"
//               onClick={handleCerrarSesion}
//               disabled={
//                 !saldoFinalReal || processing || calculating || !!errorCalculo
//               }
//               loading={processing}
//             >
//               {processing
//                 ? "Procesando..."
//                 : isOnline
//                 ? "Confirmar Cierre"
//                 : "Guardar Cierre (Offline)"}
//             </Button>
//           </div>
//         </div>
//       </div>
//     </Modal>
//   );
// };

// export default CierreCajaModal;
// components/features/caja/CierreCajaModal/CierreCajaModal.jsx - VERSIÓN MEJORADA
// components/features/caja/CierreCajaModal/CierreCajaModal.jsx - VERSIÓN COMPLETA MEJORADA
// components/features/caja/CierreCajaModal/CierreCajaModal.jsx - VERSIÓN COMPLETA MEJORADA
// import { useState, useEffect, useCallback } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { useOfflineControllers } from "../../../../hooks/useOfflineControllers";
// import Modal from "../../../ui/Modal/Modal";
// import Button from "../../../ui/Button/Button";
// import Swal from "sweetalert2";
// import { types } from "../../../../types/types";
// import {
//   FiWifi,
//   FiWifiOff,
//   FiDollarSign,
//   FiClock,
//   FiShoppingCart,
//   FiBarChart2,
//   FiPackage,
//   FiList,
//   FiAlertTriangle,
//   FiChevronDown,
//   FiChevronUp,
//   FiTrendingUp,
//   FiBox,
//   FiPercent,
//   FiCheckCircle,
//   FiXCircle,
//   FiInfo,
// } from "react-icons/fi";
// import styles from "./CierreCajaModal.module.css";

// // ✅ IMPORTAR ACTIONS DIRECTAMENTE
// import {
//   closeSesionCaja,
//   loadOpenSesion,
// } from "../../../../actions/sesionesCajaActions";
// import {
//   createClosure,
//   calculateClosureTotals,
// } from "../../../../actions/closuresActions";

// const CierreCajaModal = ({ isOpen, onClose, sesion }) => {
//   const [saldoFinalReal, setSaldoFinalReal] = useState("");
//   const [observaciones, setObservaciones] = useState("");
//   const [processing, setProcessing] = useState(false);
//   const [calculating, setCalculating] = useState(false);
//   const [totales, setTotales] = useState(null);
//   const [diferencia, setDiferencia] = useState(0);
//   const [errorCalculo, setErrorCalculo] = useState(null);
//   const [productosAgrupados, setProductosAgrupados] = useState([]);
//   const [mostrarDetalleProductos, setMostrarDetalleProductos] = useState(false);
//   const [resumenProductos, setResumenProductos] = useState({
//     totalProductos: 0,
//     totalUnidades: 0,
//     gananciaTotal: 0,
//     productoMasVendido: null,
//     productoMayorGanancia: null,
//   });

//   const dispatch = useDispatch();
//   const { user } = useSelector((state) => state.auth);
//   const isOnline = navigator.onLine;

//   // ✅ USAR HOOK PARA CONTROLADORES
//   const {
//     ClosuresOfflineController,
//     SessionsOfflineController,
//     SalesOfflineController,
//     loaded: controllersLoaded,
//   } = useOfflineControllers();

//   // ✅ CALCULAR RESUMEN DE PRODUCTOS
//   const calcularResumenProductos = useCallback((productos) => {
//     if (!productos || productos.length === 0) {
//       setResumenProductos({
//         totalProductos: 0,
//         totalUnidades: 0,
//         gananciaTotal: 0,
//         productoMasVendido: null,
//         productoMayorGanancia: null,
//       });
//       return;
//     }

//     const totalUnidades = productos.reduce(
//       (sum, p) => sum + p.cantidad_total,
//       0
//     );
//     const gananciaTotal = productos.reduce(
//       (sum, p) => sum + p.ganancia_total,
//       0
//     );

//     const productoMasVendido = productos.reduce(
//       (max, p) => (p.cantidad_total > (max?.cantidad_total || 0) ? p : max),
//       null
//     );

//     const productoMayorGanancia = productos.reduce(
//       (max, p) => (p.ganancia_total > (max?.ganancia_total || 0) ? p : max),
//       null
//     );

//     setResumenProductos({
//       totalProductos: productos.length,
//       totalUnidades,
//       gananciaTotal,
//       productoMasVendido,
//       productoMayorGanancia,
//     });
//   }, []);

//   // ✅ CALCULAR TOTALES CON CONTROLADORES DINÁMICOS
//   const calcularTotalesCompletos = useCallback(async () => {
//     if (!sesion || !controllersLoaded) return;

//     setCalculating(true);
//     setErrorCalculo(null);

//     try {
//       let totals;
//       const sesionId = sesion.id || sesion.id_local;

//       console.log(`🔄 Calculando totales para sesión: ${sesionId}`);

//       if (isOnline && sesion.id) {
//         try {
//           // Intentar cálculo online primero
//           console.log("🌐 Intentando cálculo online...");
//           totals = await dispatch(calculateClosureTotals(sesion.id));
//         } catch (onlineError) {
//           console.warn(
//             "⚠️ Error en cálculo online, intentando offline:",
//             onlineError
//           );
//           // Fallback a cálculo offline
//           if (ClosuresOfflineController) {
//             console.log("📱 Usando cálculo offline...");
//             totals = await ClosuresOfflineController.calculateSessionTotals(
//               sesionId
//             );
//           } else {
//             throw new Error("Controlador offline no disponible");
//           }
//         }
//       } else {
//         // Cálculo offline directo
//         console.log("📱 Cálculo offline directo...");
//         if (ClosuresOfflineController) {
//           totals = await ClosuresOfflineController.calculateSessionTotals(
//             sesionId
//           );
//         } else {
//           throw new Error("Controlador offline no disponible");
//         }
//       }

//       const saldoInicial = sesion.saldo_inicial || 0;
//       const saldoFinalTeorico = saldoInicial + (totals.total_efectivo || 0);

//       const totalesCompletos = {
//         ...totals,
//         saldo_final_teorico: saldoFinalTeorico,
//         saldo_inicial: saldoInicial,
//       };

//       setTotales(totalesCompletos);

//       // Sugerir saldo final real basado en el teórico
//       if (!saldoFinalReal) {
//         setSaldoFinalReal(saldoFinalTeorico.toFixed(2));
//       }

//       console.log("✅ Totales calculados exitosamente:", totalesCompletos);
//     } catch (error) {
//       console.error("❌ Error calculando totales:", error);
//       setErrorCalculo(
//         error.message ||
//           "No se pudieron calcular los totales. Verifica las ventas."
//       );

//       // Datos por defecto en caso de error
//       setTotales({
//         total_ventas: 0,
//         total_efectivo: 0,
//         total_tarjeta: 0,
//         total_transferencia: 0,
//         ganancia_bruta: 0,
//         cantidad_ventas: 0,
//         saldo_final_teorico: sesion?.saldo_inicial || 0,
//         saldo_inicial: sesion?.saldo_inicial || 0,
//       });
//     } finally {
//       setCalculating(false);
//     }
//   }, [
//     sesion,
//     dispatch,
//     saldoFinalReal,
//     isOnline,
//     controllersLoaded,
//     ClosuresOfflineController,
//   ]);

//   // ✅ OBTENER PRODUCTOS AGRUPADOS
//   const obtenerProductosAgrupados = useCallback(async () => {
//     if (!sesion || !SalesOfflineController) return;

//     try {
//       const sesionId = sesion.id || sesion.id_local;
//       console.log(`📊 Obteniendo productos agrupados para sesión: ${sesionId}`);

//       const resumen = await SalesOfflineController.getSalesSummaryBySession(
//         sesionId
//       );
//       const productos = resumen.productosAgrupados || [];
//       setProductosAgrupados(productos);
//       calcularResumenProductos(productos);

//       console.log(`✅ ${productos.length} productos agrupados obtenidos`);
//     } catch (error) {
//       console.error("❌ Error obteniendo productos agrupados:", error);
//       setProductosAgrupados([]);
//       calcularResumenProductos([]);
//     }
//   }, [sesion, SalesOfflineController, calcularResumenProductos]);

//   // ✅ EFFECT PRINCIPAL
//   useEffect(() => {
//     if (isOpen && sesion && controllersLoaded) {
//       console.log("🔄 Inicializando modal de cierre...");
//       calcularTotalesCompletos();
//       obtenerProductosAgrupados();
//     }
//   }, [
//     isOpen,
//     sesion,
//     calcularTotalesCompletos,
//     obtenerProductosAgrupados,
//     controllersLoaded,
//   ]);

//   // ✅ EFFECT PARA DIFERENCIA
//   useEffect(() => {
//     if (totales && saldoFinalReal) {
//       const saldoRealNum = parseFloat(saldoFinalReal) || 0;
//       const diferenciaCalculada = saldoRealNum - totales.saldo_final_teorico;
//       setDiferencia(diferenciaCalculada);
//     } else {
//       setDiferencia(0);
//     }
//   }, [saldoFinalReal, totales]);

//   // ✅ RENDER RESUMEN DE PRODUCTOS (NUEVO)
//   const renderResumenProductos = () => {
//     if (productosAgrupados.length === 0) {
//       return (
//         <div className={styles.resumenProductosEmpty}>
//           <FiInfo className={styles.resumenIcon} />
//           <span>No hay productos vendidos en esta sesión</span>
//         </div>
//       );
//     }

//     return (
//       <div className={styles.resumenProductos}>
//         <div className={styles.resumenHeader}>
//           <div className={styles.resumenTitle}>
//             <FiPackage className={styles.resumenIcon} />
//             <span>Resumen de Productos Vendidos</span>
//           </div>
//           <button
//             className={styles.toggleButton}
//             onClick={() => setMostrarDetalleProductos(!mostrarDetalleProductos)}
//           >
//             {mostrarDetalleProductos ? <FiChevronUp /> : <FiChevronDown />}
//             {mostrarDetalleProductos ? "Ocultar" : "Ver"} Detalles
//           </button>
//         </div>

//         <div className={styles.resumenGrid}>
//           <div className={styles.resumenItem}>
//             <div className={styles.resumenValue}>
//               {resumenProductos.totalProductos}
//             </div>
//             <div className={styles.resumenLabel}>Productos Diferentes</div>
//           </div>

//           <div className={styles.resumenItem}>
//             <div className={styles.resumenValue}>
//               {resumenProductos.totalUnidades}
//             </div>
//             <div className={styles.resumenLabel}>Unidades Totales</div>
//           </div>

//           <div className={styles.resumenItem}>
//             <div className={styles.resumenValue}>
//               ${resumenProductos.gananciaTotal.toFixed(2)}
//             </div>
//             <div className={styles.resumenLabel}>Ganancia en Productos</div>
//           </div>

//           {resumenProductos.productoMasVendido && (
//             <div className={styles.resumenItem}>
//               <div className={styles.resumenValue}>
//                 {resumenProductos.productoMasVendido.cantidad_total}u
//               </div>
//               <div className={styles.resumenLabel}>
//                 Más vendido: {resumenProductos.productoMasVendido.nombre}
//               </div>
//             </div>
//           )}
//         </div>

//         {resumenProductos.productoMayorGanancia && (
//           <div className={styles.destacadoSection}>
//             <FiTrendingUp className={styles.destacadoIcon} />
//             <div className={styles.destacadoContent}>
//               <span className={styles.destacadoTitle}>
//                 Producto con Mayor Ganancia
//               </span>
//               <span className={styles.destacadoDesc}>
//                 {resumenProductos.productoMayorGanancia.nombre} - $
//                 {resumenProductos.productoMayorGanancia.ganancia_total.toFixed(
//                   2
//                 )}
//               </span>
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   };

//   // ✅ RENDER DETALLE DE PRODUCTOS MEJORADO
//   const renderDetalleProductos = () => {
//     if (!mostrarDetalleProductos || productosAgrupados.length === 0)
//       return null;

//     return (
//       <div className={styles.productosSection}>
//         <div className={styles.sectionHeader}>
//           <FiBox className={styles.sectionIcon} />
//           <span>Detalle de Productos Vendidos</span>
//           <span className={styles.productCount}>
//             {productosAgrupados.length} productos
//           </span>
//         </div>

//         <div className={styles.productosTableContainer}>
//           <table className={styles.productosTable}>
//             <thead>
//               <tr>
//                 <th>Producto</th>
//                 <th className={styles.textCenter}>Cantidad</th>
//                 <th className={styles.textRight}>Precio Unit.</th>
//                 <th className={styles.textRight}>Costo Unit.</th>
//                 <th className={styles.textRight}>Subtotal</th>
//                 <th className={styles.textRight}>Ganancia</th>
//                 <th className={styles.textCenter}>Margen</th>
//               </tr>
//             </thead>
//             <tbody>
//               {productosAgrupados.map((producto, index) => {
//                 const margen =
//                   producto.precio_compra_unitario > 0
//                     ? (producto.ganancia_total /
//                         (producto.precio_compra_unitario *
//                           producto.cantidad_total)) *
//                       100
//                     : 0;

//                 return (
//                   <tr
//                     key={producto.producto_id}
//                     className={index % 2 === 0 ? styles.evenRow : styles.oddRow}
//                   >
//                     <td className={styles.productName}>
//                       <span className={styles.productNameText}>
//                         {producto.nombre}
//                       </span>
//                     </td>
//                     <td className={styles.textCenter}>
//                       <span className={styles.cantidadBadge}>
//                         {producto.cantidad_total}u
//                       </span>
//                     </td>
//                     <td className={styles.textRight}>
//                       ${producto.precio_venta_unitario.toFixed(2)}
//                     </td>
//                     <td className={styles.textRight}>
//                       ${producto.precio_compra_unitario.toFixed(2)}
//                     </td>
//                     <td className={styles.textRight}>
//                       <strong>${producto.subtotal_total.toFixed(2)}</strong>
//                     </td>
//                     <td className={styles.textRight}>
//                       <span className={styles.gananciaValue}>
//                         +${producto.ganancia_total.toFixed(2)}
//                       </span>
//                     </td>
//                     <td className={styles.textCenter}>
//                       <span
//                         className={`${styles.margenBadge} ${
//                           margen >= 50
//                             ? styles.highMargin
//                             : margen >= 30
//                             ? styles.mediumMargin
//                             : styles.lowMargin
//                         }`}
//                       >
//                         <FiPercent size={12} />
//                         {margen.toFixed(1)}%
//                       </span>
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//             <tfoot>
//               <tr>
//                 <td colSpan="4" className={styles.textRight}>
//                   <strong>Totales:</strong>
//                 </td>
//                 <td className={styles.textRight}>
//                   <strong>
//                     $
//                     {productosAgrupados
//                       .reduce((sum, p) => sum + p.subtotal_total, 0)
//                       .toFixed(2)}
//                   </strong>
//                 </td>
//                 <td className={styles.textRight}>
//                   <strong className={styles.totalGanancia}>
//                     +$
//                     {productosAgrupados
//                       .reduce((sum, p) => sum + p.ganancia_total, 0)
//                       .toFixed(2)}
//                   </strong>
//                 </td>
//                 <td></td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>

//         <div className={styles.tableSummary}>
//           <div className={styles.summaryItem}>
//             <span>Productos únicos:</span>
//             <span>{productosAgrupados.length}</span>
//           </div>
//           <div className={styles.summaryItem}>
//             <span>Unidades totales:</span>
//             <span>{resumenProductos.totalUnidades}</span>
//           </div>
//           <div className={styles.summaryItem}>
//             <span>Ganancia total productos:</span>
//             <span className={styles.totalGanancia}>
//               +${resumenProductos.gananciaTotal.toFixed(2)}
//             </span>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // ✅ FUNCIÓN DE DIAGNÓSTICO PRINCIPAL
//   const handleDiagnosticar = async () => {
//     if (!sesion || !SalesOfflineController) {
//       await Swal.fire({
//         icon: "error",
//         title: "Controlador no disponible",
//         text: "El controlador de ventas offline no está disponible",
//         confirmButtonText: "Entendido",
//       });
//       return;
//     }

//     const sesionId = sesion.id || sesion.id_local;

//     try {
//       console.log(`🔍 Iniciando diagnóstico para sesión: ${sesionId}`);

//       const resumen = await SalesOfflineController.getSalesSummaryBySession(
//         sesionId
//       );

//       // ✅ VERIFICAR SI HAY PRODUCTOS
//       if (
//         !resumen.productosAgrupados ||
//         resumen.productosAgrupados.length === 0
//       ) {
//         await Swal.fire({
//           title: "📊 Diagnóstico de Ventas",
//           html: `
//             <div style="text-align: left; font-size: 14px;">
//               <div style="margin-bottom: 15px; padding: 10px; background: #fff3cd; border-radius: 5px;">
//                 <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Sin Productos Vendidos</h4>
//                 <p>No se encontraron productos vendidos en esta sesión.</p>
//                 <p><strong>Ventas encontradas:</strong> ${
//                   resumen.ventas?.length || 0
//                 }</p>
//                 <p><strong>Detalles de venta:</strong> ${
//                   resumen.totales?.productos_vendidos || 0
//                 }</p>
//               </div>
//               <div style="color: #666; font-size: 12px;">
//                 <p><em>Posibles causas:</em></p>
//                 <ul>
//                   <li>Las ventas no tienen detalles asociados</li>
//                   <li>Los detalles de venta no se guardaron correctamente</li>
//                   <li>Problema de sincronización con la base de datos local</li>
//                 </ul>
//               </div>
//             </div>
//           `,
//           width: 600,
//           confirmButtonText: "Entendido",
//         });
//         return;
//       }

//       await Swal.fire({
//         title: "📊 Diagnóstico Detallado de Ventas",
//         html: `
//           <div style="text-align: left; font-size: 14px; max-height: 60vh; overflow-y: auto;">
//             <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
//               <h4 style="margin: 0 0 10px 0; color: #333;">📈 Resumen General</h4>
//               <p><strong>Total Ventas:</strong> ${
//                 resumen.totales.cantidad_ventas
//               }</p>
//               <p><strong>Productos Vendidos:</strong> ${
//                 resumen.totales.productos_vendidos
//               } unidades</p>
//               <p><strong>Ventas Totales:</strong> $${resumen.totales.total_ventas.toFixed(
//                 2
//               )}</p>
//               <p><strong>Ganancia Bruta:</strong> $${resumen.totales.ganancia_bruta.toFixed(
//                 2
//               )}</p>
//             </div>

//             <div style="margin-bottom: 15px;">
//               <h4 style="margin: 0 0 10px 0; color: #333;">💵 Por Método de Pago</h4>
//               <p><strong>Efectivo:</strong> $${resumen.totales.total_efectivo.toFixed(
//                 2
//               )}</p>
//               <p><strong>Tarjeta:</strong> $${resumen.totales.total_tarjeta.toFixed(
//                 2
//               )}</p>
//               <p><strong>Transferencia:</strong> $${resumen.totales.total_transferencia.toFixed(
//                 2
//               )}</p>
//             </div>

//             <div>
//               <h4 style="margin: 0 0 10px 0; color: #333;">🛍️ Productos Vendidos</h4>
//               <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
//                 ${resumen.productosAgrupados
//                   .map(
//                     (producto) => `
//                   <div style="padding: 5px; margin: 3px 0; background: #e8f5e8; border-radius: 3px; border-left: 4px solid #4caf50;">
//                     <strong>${producto.nombre}</strong><br/>
//                     <small>
//                       <strong>x${producto.cantidad_total}</strong> unidades |
//                       Precio: $${producto.precio_venta_unitario.toFixed(2)} |
//                       Costo: $${producto.precio_compra_unitario.toFixed(2)} |
//                       <strong> Ganancia: $${producto.ganancia_total.toFixed(
//                         2
//                       )}</strong>
//                     </small>
//                   </div>
//                 `
//                   )
//                   .join("")}
//               </div>
//             </div>
//           </div>
//         `,
//         width: 700,
//         confirmButtonText: "Entendido",
//       });

//       // Actualizar el estado local con los productos agrupados
//       setProductosAgrupados(resumen.productosAgrupados);
//       calcularResumenProductos(resumen.productosAgrupados);
//     } catch (error) {
//       console.error("❌ Error en diagnóstico:", error);
//       await Swal.fire({
//         icon: "error",
//         title: "Error en diagnóstico",
//         text: error.message || "No se pudieron obtener los datos de ventas",
//         confirmButtonText: "Entendido",
//       });
//     }
//   };

//   // ✅ FUNCIÓN DE DIAGNÓSTICO DETALLADO (DEBUG)
//   const handleDiagnosticarDetallado = async () => {
//     if (!sesion || !SalesOfflineController) return;

//     const sesionId = sesion.id || sesion.id_local;

//     try {
//       console.log(
//         `🔍 Iniciando diagnóstico DETALLADO para sesión: ${sesionId}`
//       );

//       // 1. Obtener ventas de la sesión
//       const ventas = await SalesOfflineController.getSalesBySession(sesionId);
//       console.log(`📊 ${ventas.length} ventas encontradas:`, ventas);

//       // 2. Obtener detalles de cada venta
//       let todosLosDetalles = [];
//       for (const venta of ventas) {
//         const detalles = await SalesOfflineController.getSaleDetails(
//           venta.id_local
//         );
//         console.log(
//           `📦 Venta ${venta.id_local} tiene ${detalles.length} detalles:`,
//           detalles
//         );
//         todosLosDetalles = [...todosLosDetalles, ...detalles];
//       }

//       // 3. Agrupar productos manualmente para diagnóstico
//       const productosAgrupadosManual = {};
//       todosLosDetalles.forEach((detalle) => {
//         const key = detalle.producto_id;
//         if (!productosAgrupadosManual[key]) {
//           productosAgrupadosManual[key] = {
//             producto_id: detalle.producto_id,
//             nombre:
//               detalle.producto_nombre || `Producto ${detalle.producto_id}`,
//             cantidad_total: 0,
//             precio_venta_unitario: detalle.precio_unitario,
//             subtotal_total: 0,
//           };
//         }
//         productosAgrupadosManual[key].cantidad_total += detalle.cantidad;
//         productosAgrupadosManual[key].subtotal_total += detalle.subtotal;
//       });

//       const productosAgrupadosArray = Object.values(productosAgrupadosManual);

//       // 4. Mostrar diagnóstico detallado
//       await Swal.fire({
//         title: "🔍 Diagnóstico Detallado de Datos",
//         html: `
//           <div style="text-align: left; font-size: 14px; max-height: 70vh; overflow-y: auto;">
//             <div style="margin-bottom: 15px; padding: 10px; background: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
//               <h4 style="margin: 0 0 10px 0; color: #856404;">📊 Resumen de Datos Encontrados</h4>
//               <p><strong>Ventas en la sesión:</strong> ${ventas.length}</p>
//               <p><strong>Total detalles de venta:</strong> ${
//                 todosLosDetalles.length
//               }</p>
//               <p><strong>Productos únicos vendidos:</strong> ${
//                 productosAgrupadosArray.length
//               }</p>
//             </div>

//             <div style="margin-bottom: 15px;">
//               <h4 style="margin: 0 0 10px 0; color: #333;">🛒 Ventas Encontradas</h4>
//               ${ventas
//                 .map(
//                   (venta) => `
//                 <div style="padding: 8px; margin: 5px 0; background: #e9ecef; border-radius: 4px;">
//                   <strong>${venta.id_local}</strong> - $${
//                     venta.total?.toFixed(2) || "0.00"
//                   }
//                   (${venta.metodo_pago || "efectivo"})<br/>
//                   <small>ID: ${venta.id_local} | Sesión: ${
//                     venta.sesion_caja_id
//                   }</small>
//                 </div>
//               `
//                 )
//                 .join("")}
//             </div>

//             <div style="margin-bottom: 15px;">
//               <h4 style="margin: 0 0 10px 0; color: #333;">📦 Detalles de Ventas</h4>
//               ${
//                 todosLosDetalles.length > 0
//                   ? todosLosDetalles
//                       .map(
//                         (detalle) => `
//                 <div style="padding: 6px; margin: 3px 0; background: #d1ecf1; border-radius: 3px; font-size: 12px;">
//                   <strong>${
//                     detalle.producto_nombre || `Producto ${detalle.producto_id}`
//                   }</strong><br/>
//                   <small>
//                     Venta: ${detalle.venta_id_local} |
//                     Cantidad: ${detalle.cantidad} |
//                     Precio: $${detalle.precio_unitario?.toFixed(2)} |
//                     Subtotal: $${detalle.subtotal?.toFixed(2)}
//                   </small>
//                 </div>
//               `
//                       )
//                       .join("")
//                   : '<p style="color: #dc3545; font-style: italic;">No se encontraron detalles de venta</p>'
//               }
//             </div>

//             <div>
//               <h4 style="margin: 0 0 10px 0; color: #333;">📋 Productos Agrupados</h4>
//               ${
//                 productosAgrupadosArray.length > 0
//                   ? productosAgrupadosArray
//                       .map(
//                         (producto) => `
//                 <div style="padding: 8px; margin: 5px 0; background: #d4edda; border-radius: 4px; border-left: 4px solid #28a745;">
//                   <strong>${producto.nombre}</strong><br/>
//                   <small>
//                     <strong>x${producto.cantidad_total}</strong> unidades |
//                     Total: $${producto.subtotal_total.toFixed(2)} |
//                     Precio unitario: $${producto.precio_venta_unitario.toFixed(
//                       2
//                     )}
//                   </small>
//                 </div>
//               `
//                       )
//                       .join("")
//                   : '<p style="color: #dc3545; font-style: italic;">No se pudieron agrupar productos</p>'
//               }
//             </div>
//           </div>
//         `,
//         width: 800,
//         confirmButtonText: "Entendido",
//       });
//     } catch (error) {
//       console.error("❌ Error en diagnóstico detallado:", error);
//       await Swal.fire({
//         icon: "error",
//         title: "Error en diagnóstico",
//         text: error.message,
//         confirmButtonText: "Entendido",
//       });
//     }
//   };

//   // ✅ MANEJAR CIERRE DE SESIÓN
//   const handleCerrarSesion = async () => {
//     const saldoFinalNumero = parseFloat(saldoFinalReal);

//     if (!saldoFinalReal || isNaN(saldoFinalNumero) || saldoFinalNumero < 0) {
//       await Swal.fire({
//         icon: "error",
//         title: "Saldo inválido",
//         text: "Ingresa un saldo final válido (número positivo)",
//         confirmButtonText: "Entendido",
//       });
//       return;
//     }

//     if (!sesion) {
//       await Swal.fire({
//         icon: "error",
//         title: "Sesión no válida",
//         text: "No se encontró la sesión de caja",
//         confirmButtonText: "Entendido",
//       });
//       return;
//     }

//     setProcessing(true);

//     try {
//       const sesionId = sesion.id || sesion.id_local;
//       const closureData = {
//         sesion_caja_id: sesion.id || sesion.id_local,
//         sesion_caja_id_local: sesion.id_local || sesionId,
//         vendedor_id: user.id,
//         vendedor_nombre: user.nombre || user.username,
//         total_ventas: totales?.total_ventas || 0,
//         total_efectivo: totales?.total_efectivo || 0,
//         total_tarjeta: totales?.total_tarjeta || 0,
//         total_transferencia: totales?.total_transferencia || 0,
//         ganancia_bruta: totales?.ganancia_bruta || 0,
//         saldo_inicial: totales?.saldo_inicial || sesion.saldo_inicial || 0,
//         saldo_final_teorico: totales?.saldo_final_teorico || 0,
//         saldo_final_real: saldoFinalNumero,
//         diferencia: diferencia,
//         observaciones: observaciones.trim() || null,
//         fecha_apertura: sesion.fecha_apertura,
//         productos_vendidos: productosAgrupados.length,
//         unidades_vendidas: resumenProductos.totalUnidades,
//         ganancia_productos: resumenProductos.gananciaTotal,
//       };

//       let result;

//       if (isOnline && sesion.id) {
//         // ✅ MODO ONLINE - Usar actions de Redux
//         result = await dispatch(createClosure(closureData));

//         if (result && result.success !== false) {
//           // Cerrar sesión en servidor
//           const closeResult = await dispatch(
//             closeSesionCaja(sesion.id, {
//               saldo_final: saldoFinalNumero,
//               observaciones: observaciones.trim() || null,
//             })
//           );

//           if (!closeResult || closeResult.success === false) {
//             throw new Error(
//               closeResult?.error || "Error al cerrar sesión online"
//             );
//           }
//         } else {
//           throw new Error(
//             result?.error || "Error al crear cierre de caja online"
//           );
//         }
//       } else {
//         // ✅ MODO OFFLINE - Usar controladores offline
//         console.log("📱 Creando cierre offline...");

//         if (!ClosuresOfflineController || !SessionsOfflineController) {
//           throw new Error("Controladores offline no disponibles");
//         }

//         // 1. Crear cierre offline
//         const closureResult = await ClosuresOfflineController.createClosure(
//           closureData
//         );

//         if (!closureResult.success) {
//           throw new Error(closureResult.error);
//         }

//         // 2. Cerrar sesión offline
//         const closeSessionResult = await SessionsOfflineController.closeSession(
//           sesionId,
//           {
//             saldo_final: saldoFinalNumero,
//             observaciones: observaciones.trim() || null,
//           }
//         );

//         if (!closeSessionResult.success) {
//           throw new Error(closeSessionResult.error);
//         }

//         result = {
//           success: true,
//           cierre: closureResult.cierre,
//           message:
//             "Cierre guardado localmente. Se sincronizará cuando haya conexión.",
//         };

//         // ✅ DISPATCH PARA ACTUALIZAR ESTADO LOCAL
//         dispatch({
//           type: types.sesionCajaClosedOffline,
//           payload: closeSessionResult.sesion,
//         });

//         dispatch({
//           type: types.closureAddNewOffline,
//           payload: closureResult.cierre,
//         });

//         console.log("✅ Cierre y sesión cerrados localmente");
//       }

//       // ✅ MOSTRAR CONFIRMACIÓN
//       await Swal.fire({
//         icon: "success",
//         title: isOnline ? "Cierre Completado" : "Cierre Guardado (Offline)",
//         html: `
//           <div style="text-align: left; font-size: 14px;">
//             <p><strong>${
//               isOnline
//                 ? "La sesión de caja ha sido cerrada exitosamente"
//                 : "El cierre se guardó localmente y se sincronizará cuando haya conexión"
//             }</strong></p>
//             <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
//               <p><strong>Resumen de la sesión:</strong></p>
//               <p>• ${
//                 resumenProductos.totalProductos
//               } productos diferentes vendidos</p>
//               <p>• ${resumenProductos.totalUnidades} unidades totales</p>
//               <p>• $${resumenProductos.gananciaTotal.toFixed(
//                 2
//               )} en ganancia de productos</p>
//               <p>• $${totales?.total_ventas?.toFixed(2)} en ventas totales</p>
//             </div>
//           </div>
//         `,
//         confirmButtonText: "Aceptar",
//       });

//       // ✅ FORZAR RECARGA DE SESIÓN ABIERTA
//       if (user?.id) {
//         setTimeout(() => {
//           dispatch(loadOpenSesion(user.id));
//         }, 1000);
//       }

//       handleCloseModal();
//     } catch (error) {
//       console.error("❌ Error en cierre de caja:", error);

//       await Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: error.message || "Ocurrió un error al cerrar la caja",
//         confirmButtonText: "Entendido",
//       });
//     } finally {
//       setProcessing(false);
//     }
//   };

//   // ✅ CERRAR MODAL
//   const handleCloseModal = () => {
//     setSaldoFinalReal("");
//     setObservaciones("");
//     setTotales(null);
//     setDiferencia(0);
//     setErrorCalculo(null);
//     setProductosAgrupados([]);
//     setMostrarDetalleProductos(false);
//     setResumenProductos({
//       totalProductos: 0,
//       totalUnidades: 0,
//       gananciaTotal: 0,
//       productoMasVendido: null,
//       productoMayorGanancia: null,
//     });
//     onClose();
//   };

//   const handleRetryCalculation = () => {
//     calcularTotalesCompletos();
//   };

//   // ✅ RENDER INDICADOR DE ESTADO
//   const renderEstadoCierre = () => {
//     if (!totales) return null;

//     const ventasRealizadas = totales.cantidad_ventas > 0;
//     const productosVendidos = resumenProductos.totalProductos > 0;
//     const gananciaPositiva = resumenProductos.gananciaTotal > 0;

//     return (
//       <div className={styles.estadoCierre}>
//         <h5>
//           <FiCheckCircle className={styles.estadoIcon} />
//           Estado del Cierre
//         </h5>
//         <div className={styles.estadoItems}>
//           <div
//             className={`${styles.estadoItem} ${
//               ventasRealizadas ? styles.estadoOk : styles.estadoError
//             }`}
//           >
//             {ventasRealizadas ? <FiCheckCircle /> : <FiXCircle />}
//             <span>
//               {ventasRealizadas
//                 ? `${totales.cantidad_ventas} ventas realizadas`
//                 : "Sin ventas registradas"}
//             </span>
//           </div>
//           <div
//             className={`${styles.estadoItem} ${
//               productosVendidos ? styles.estadoOk : styles.estadoWarning
//             }`}
//           >
//             {productosVendidos ? <FiCheckCircle /> : <FiAlertTriangle />}
//             <span>
//               {productosVendidos
//                 ? `${resumenProductos.totalProductos} productos vendidos`
//                 : "Sin productos vendidos"}
//             </span>
//           </div>
//           <div
//             className={`${styles.estadoItem} ${
//               gananciaPositiva ? styles.estadoOk : styles.estadoWarning
//             }`}
//           >
//             {gananciaPositiva ? <FiCheckCircle /> : <FiTrendingUp />}
//             <span>
//               {gananciaPositiva
//                 ? `Ganancia: $${resumenProductos.gananciaTotal.toFixed(2)}`
//                 : "Sin ganancia registrada"}
//             </span>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   // ✅ LOADING MIENTRAS CARGAN CONTROLADORES
//   if (!controllersLoaded) {
//     return (
//       <Modal
//         isOpen={isOpen}
//         onClose={handleCloseModal}
//         title="Cerrar Sesión de Caja"
//       >
//         <div className={styles.loadingState}>
//           <div className={styles.spinner}></div>
//           <p>Cargando controladores offline...</p>
//           <small>Esperando que los módulos se carguen completamente</small>
//         </div>
//       </Modal>
//     );
//   }

//   if (!sesion) {
//     return (
//       <Modal
//         isOpen={isOpen}
//         onClose={handleCloseModal}
//         title="Cerrar Sesión de Caja"
//       >
//         <div className={styles.errorState}>
//           <p>No se encontró la sesión de caja</p>
//           <Button variant="secondary" onClick={handleCloseModal}>
//             Cerrar
//           </Button>
//         </div>
//       </Modal>
//     );
//   }

//   return (
//     <Modal
//       isOpen={isOpen}
//       onClose={handleCloseModal}
//       title="Cerrar Sesión de Caja"
//       size="large"
//     >
//       <div className={styles.modalContent}>
//         {/* Indicador de estado de conexión */}
//         <div
//           className={`${styles.connectionStatus} ${
//             isOnline ? styles.online : styles.offline
//           }`}
//         >
//           {isOnline ? (
//             <>
//               <FiWifi className={styles.connectionIcon} />
//               <span>Conectado - Los datos se guardarán en el servidor</span>
//             </>
//           ) : (
//             <>
//               <FiWifiOff className={styles.connectionIcon} />
//               <span>Sin conexión - Los datos se guardarán localmente</span>
//             </>
//           )}
//         </div>

//         {/* Información de la Sesión */}
//         <div className={styles.sessionInfo}>
//           <h4>
//             <FiClock className={styles.sectionIcon} />
//             Información de la Sesión
//           </h4>
//           <div className={styles.infoGrid}>
//             <div className={styles.infoItem}>
//               <span>Fecha Apertura:</span>
//               <span>
//                 {new Date(sesion.fecha_apertura).toLocaleString("es-MX")}
//               </span>
//             </div>
//             <div className={styles.infoItem}>
//               <span>Saldo Inicial:</span>
//               <span className={styles.highlight}>
//                 ${sesion.saldo_inicial?.toFixed(2)}
//               </span>
//             </div>
//             <div className={styles.infoItem}>
//               <span>Estado:</span>
//               <span
//                 className={isOnline ? styles.onlineBadge : styles.localBadge}
//               >
//                 {isOnline ? "Sincronizada" : "Sesión Local"}
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* Resumen de Ventas */}
//         <div className={styles.salesSummary}>
//           <h4>
//             <FiShoppingCart className={styles.sectionIcon} />
//             Resumen de Ventas
//             {!isOnline && <span className={styles.offlineBadge}>Local</span>}
//           </h4>

//           {calculating ? (
//             <div className={styles.calculating}>
//               <div className={styles.spinner}></div>
//               <p>
//                 {isOnline
//                   ? "Calculando totales de ventas..."
//                   : "Calculando totales localmente..."}
//               </p>
//             </div>
//           ) : errorCalculo ? (
//             <div className={styles.calculationError}>
//               <FiAlertTriangle className={styles.errorIcon} />
//               <p>{errorCalculo}</p>
//               <div className={styles.errorActions}>
//                 <Button variant="secondary" onClick={handleRetryCalculation}>
//                   Reintentar Cálculo
//                 </Button>
//                 <Button variant="outline" onClick={handleDiagnosticarDetallado}>
//                   <FiList style={{ marginRight: "4px" }} />
//                   Diagnóstico Avanzado
//                 </Button>
//               </div>
//             </div>
//           ) : (
//             totales && (
//               <>
//                 <div className={styles.totalesGrid}>
//                   <div className={styles.totalItem}>
//                     <span>Total Ventas:</span>
//                     <span>${totales.total_ventas?.toFixed(2)}</span>
//                   </div>
//                   <div className={styles.totalItem}>
//                     <span>Ventas Efectivo:</span>
//                     <span>${totales.total_efectivo?.toFixed(2)}</span>
//                   </div>
//                   <div className={styles.totalItem}>
//                     <span>Ventas Tarjeta:</span>
//                     <span>${totales.total_tarjeta?.toFixed(2)}</span>
//                   </div>
//                   <div className={styles.totalItem}>
//                     <span>Cantidad Ventas:</span>
//                     <span>
//                       <FiPackage style={{ marginRight: "4px" }} />
//                       {totales.cantidad_ventas}
//                     </span>
//                   </div>
//                 </div>

//                 {/* Cálculos de Caja */}
//                 <div className={styles.cashCalculations}>
//                   <h5>
//                     <FiBarChart2 className={styles.sectionIcon} />
//                     Cálculos de Caja
//                   </h5>
//                   <div className={styles.calculationGrid}>
//                     <div className={styles.calcItem}>
//                       <span>Saldo Inicial:</span>
//                       <span>${totales.saldo_inicial?.toFixed(2)}</span>
//                     </div>
//                     <div className={styles.calcItem}>
//                       <span>+ Ventas Efectivo:</span>
//                       <span>+${totales.total_efectivo?.toFixed(2)}</span>
//                     </div>
//                     <div className={styles.calcItem}>
//                       <span>Saldo Final Teórico:</span>
//                       <span className={styles.theoreticalHighlight}>
//                         ${totales.saldo_final_teorico?.toFixed(2)}
//                       </span>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Estado del Cierre */}
//                 {renderEstadoCierre()}
//               </>
//             )
//           )}
//         </div>

//         {/* ✅ NUEVO: RESUMEN DE PRODUCTOS VENDIDOS */}
//         {renderResumenProductos()}

//         {/* ✅ DETALLE DE PRODUCTOS VENDIDOS */}
//         {renderDetalleProductos()}

//         {/* Entrada de Saldo Final Real */}
//         <div className={styles.formGroup}>
//           <label className={styles.label}>
//             <FiDollarSign className={styles.labelIcon} />
//             Saldo Final Real (Contado Físicamente)
//             <small>Ingresa el monto real que cuentas en caja</small>
//           </label>
//           <input
//             type="number"
//             value={saldoFinalReal}
//             onChange={(e) => setSaldoFinalReal(e.target.value)}
//             placeholder={totales?.saldo_final_teorico?.toFixed(2) || "0.00"}
//             step="0.01"
//             min="0"
//             className={styles.input}
//             disabled={calculating}
//           />
//         </div>

//         {/* Diferencia Automática */}
//         {saldoFinalReal && (
//           <div className={styles.differenceSection}>
//             <div
//               className={`${styles.difference} ${
//                 diferencia === 0
//                   ? styles.exact
//                   : diferencia > 0
//                   ? styles.surplus
//                   : styles.shortage
//               }`}
//             >
//               <span>Diferencia:</span>
//               <span className={styles.differenceAmount}>
//                 {diferencia > 0 ? "+" : ""}${Math.abs(diferencia).toFixed(2)}
//               </span>
//             </div>
//             <small className={styles.differenceHelp}>
//               {diferencia === 0
//                 ? "✅ Perfecto, la caja cuadra exactamente"
//                 : diferencia > 0
//                 ? "📈 Hay sobrante en caja"
//                 : "📉 Hay faltante en caja"}
//             </small>
//           </div>
//         )}

//         {/* Observaciones */}
//         <div className={styles.formGroup}>
//           <label className={styles.label}>
//             📝 Observaciones (Opcional)
//             <small>Notas sobre el cierre, diferencias, etc...</small>
//           </label>
//           <textarea
//             value={observaciones}
//             onChange={(e) => setObservaciones(e.target.value)}
//             placeholder="Ej: Cierre normal, sin novedades..."
//             rows="3"
//             className={styles.textarea}
//             disabled={processing}
//           />
//         </div>

//         {!isOnline && (
//           <div className={styles.offlineWarning}>
//             <strong>⚠️ Modo Offline</strong>
//             <p>
//               El cierre se guardará localmente y se sincronizará automáticamente
//               cuando recuperes la conexión a internet.
//             </p>
//           </div>
//         )}

//         {/* Acciones */}
//         <div className={styles.actions}>
//           <div className={styles.diagnosticButtons}>
//             <Button
//               variant="outline"
//               onClick={handleDiagnosticar}
//               disabled={processing}
//               style={{
//                 backgroundColor: "#f0f9ff",
//                 borderColor: "#0ea5e9",
//                 color: "#0369a1",
//               }}
//             >
//               <FiList style={{ marginRight: "4px" }} />
//               Diagnosticar Ventas
//             </Button>

//             <Button
//               variant="outline"
//               onClick={handleDiagnosticarDetallado}
//               disabled={processing}
//               style={{
//                 backgroundColor: "#fff3cd",
//                 borderColor: "#ffc107",
//                 color: "#856404",
//               }}
//             >
//               <FiAlertTriangle style={{ marginRight: "4px" }} />
//               Diagnóstico Avanzado
//             </Button>
//           </div>

//           <div className={styles.mainActions}>
//             <Button
//               variant="secondary"
//               onClick={handleCloseModal}
//               disabled={processing}
//             >
//               Cancelar
//             </Button>
//             <Button
//               variant="primary"
//               onClick={handleCerrarSesion}
//               disabled={
//                 !saldoFinalReal || processing || calculating || !!errorCalculo
//               }
//               loading={processing}
//             >
//               {processing
//                 ? "Procesando..."
//                 : isOnline
//                 ? "Confirmar Cierre"
//                 : "Guardar Cierre (Offline)"}
//             </Button>
//           </div>
//         </div>
//       </div>
//     </Modal>
//   );
// };

// export default CierreCajaModal;
// CierreCajaModal.js - VERSIÓN SIMPLIFICADA Y MEJORADA
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
  FiBarChart2,
  FiPackage,
  FiList,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiTrendingUp,
  FiBox,
  FiPercent,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
} from "react-icons/fi";
import styles from "./CierreCajaModal.module.css";

// ✅ IMPORTAR ACTIONS
import {
  closeSesionCaja,
  loadOpenSesion,
} from "../../../../actions/sesionesCajaActions";
import {
  createClosure,
  calculateClosureTotals,
} from "../../../../actions/closuresActions";

const CierreCajaModal = ({ isOpen, onClose, sesion }) => {
  const [saldoFinalReal, setSaldoFinalReal] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [processing, setProcessing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [totales, setTotales] = useState(null);
  const [diferencia, setDiferencia] = useState(0);
  const [errorCalculo, setErrorCalculo] = useState(null);
  const [productosAgrupados, setProductosAgrupados] = useState([]);
  const [mostrarDetalleProductos, setMostrarDetalleProductos] = useState(false);

  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const isOnline = navigator.onLine;

  // ✅ USAR HOOK PARA CONTROLADORES
  const {
    ClosuresOfflineController,
    SessionsOfflineController,
    SalesOfflineController,
    loaded: controllersLoaded,
  } = useOfflineControllers();

  // ✅ CALCULAR TOTALES
  const calcularTotalesCompletos = useCallback(async () => {
    if (!sesion || !controllersLoaded) return;

    setCalculating(true);
    setErrorCalculo(null);

    try {
      let totals;
      const sesionId = sesion.id || sesion.id_local;

      console.log(`🔄 Calculando totales para sesión: ${sesionId}`);

      if (isOnline && sesion.id) {
        try {
          totals = await dispatch(calculateClosureTotals(sesion.id));
        } catch (onlineError) {
          console.warn("⚠️ Error en cálculo online:", onlineError);
          if (ClosuresOfflineController) {
            totals = await ClosuresOfflineController.calculateSessionTotals(
              sesionId
            );
          } else {
            throw new Error("Controlador offline no disponible");
          }
        }
      } else {
        if (ClosuresOfflineController) {
          totals = await ClosuresOfflineController.calculateSessionTotals(
            sesionId
          );
        } else {
          throw new Error("Controlador offline no disponible");
        }
      }

      const saldoInicial = sesion.saldo_inicial || 0;
      const saldoFinalTeorico = saldoInicial + (totals.total_efectivo || 0);

      const totalesCompletos = {
        ...totals,
        saldo_final_teorico: saldoFinalTeorico,
        saldo_inicial: saldoInicial,
      };

      setTotales(totalesCompletos);

      if (!saldoFinalReal) {
        setSaldoFinalReal(saldoFinalTeorico.toFixed(2));
      }

      console.log("✅ Totales calculados:", totalesCompletos);
    } catch (error) {
      console.error("❌ Error calculando totales:", error);
      setErrorCalculo(error.message || "No se pudieron calcular los totales.");

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
  }, [
    sesion,
    dispatch,
    saldoFinalReal,
    isOnline,
    controllersLoaded,
    ClosuresOfflineController,
  ]);

  // ✅ OBTENER PRODUCTOS AGRUPADOS
  const obtenerProductosAgrupados = useCallback(async () => {
    if (!sesion || !SalesOfflineController) return;

    try {
      const sesionId = sesion.id || sesion.id_local;
      const resumen = await SalesOfflineController.getSalesSummaryBySession(
        sesionId
      );
      const productos = resumen.productosAgrupados || [];
      setProductosAgrupados(productos);
    } catch (error) {
      console.error("❌ Error obteniendo productos:", error);
      setProductosAgrupados([]);
    }
  }, [sesion, SalesOfflineController]);

  // ✅ EFFECT PRINCIPAL
  useEffect(() => {
    if (isOpen && sesion && controllersLoaded) {
      calcularTotalesCompletos();
      obtenerProductosAgrupados();
    }
  }, [isOpen, sesion, controllersLoaded]);

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

  // ✅ DIAGNÓSTICO SIMPLIFICADO
  const handleDiagnosticar = async () => {
    if (!sesion || !SalesOfflineController) {
      await Swal.fire({
        icon: "error",
        title: "Controlador no disponible",
        text: "No se puede realizar el diagnóstico",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const sesionId = sesion.id || sesion.id_local;

    try {
      const resumen = await SalesOfflineController.getSalesSummaryBySession(
        sesionId
      );

      await Swal.fire({
        title: "📊 Diagnóstico de Ventas",
        html: `
          <div style="text-align: left; font-size: 14px;">
            <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
              <h4 style="margin: 0 0 10px 0; color: #333;">Resumen General</h4>
              <p><strong>Total Ventas:</strong> ${
                resumen.totales?.cantidad_ventas || 0
              }</p>
              <p><strong>Productos Vendidos:</strong> ${
                resumen.totales?.productos_vendidos || 0
              } unidades</p>
              <p><strong>Ventas Totales:</strong> $${(
                resumen.totales?.total_ventas || 0
              ).toFixed(2)}</p>
            </div>
            <div style="margin-bottom: 15px;">
              <h4 style="margin: 0 0 10px 0; color: #333;">Productos Vendidos</h4>
              <div style="max-height: 200px; overflow-y: auto;">
                ${(resumen.productosAgrupados || [])
                  .map(
                    (producto) => `
                  <div style="padding: 5px; margin: 3px 0; background: #e8f5e8; border-radius: 3px;">
                    <strong>${producto.nombre}</strong> - 
                    <strong>x${producto.cantidad_total}</strong> unidades
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          </div>
        `,
        width: 500,
        confirmButtonText: "Entendido",
      });

      setProductosAgrupados(resumen.productosAgrupados || []);
    } catch (error) {
      console.error("❌ Error en diagnóstico:", error);
      await Swal.fire({
        icon: "error",
        title: "Error en diagnóstico",
        text: "No se pudieron obtener los datos",
        confirmButtonText: "Entendido",
      });
    }
  };

  // ✅ MANEJAR CIERRE DE SESIÓN
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
        productos_vendidos: productosAgrupados.length,
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
        text: isOnline
          ? "La sesión ha sido cerrada exitosamente"
          : "El cierre se guardó localmente",
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
    setMostrarDetalleProductos(false);
    onClose();
  };

  const handleRetryCalculation = () => {
    calcularTotalesCompletos();
  };

  // ✅ RENDER RESUMEN DE PRODUCTOS
  const renderResumenProductos = () => {
    if (productosAgrupados.length === 0) {
      return (
        <div className={styles.resumenProductosEmpty}>
          <FiInfo />
          <span>No hay productos vendidos</span>
        </div>
      );
    }

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
        </div>
      </div>
    );
  };

  // ✅ RENDER DETALLE DE PRODUCTOS
  const renderDetalleProductos = () => {
    if (!mostrarDetalleProductos || productosAgrupados.length === 0)
      return null;

    return (
      <div className={styles.productosSection}>
        <div className={styles.sectionHeader}>
          <FiBox />
          <span>Detalle de Productos</span>
        </div>

        <div className={styles.productosList}>
          {productosAgrupados.map((producto, index) => (
            <div key={producto.producto_id} className={styles.productoItem}>
              <div className={styles.productoInfo}>
                <span className={styles.productoNombre}>{producto.nombre}</span>
                <span className={styles.productoCantidad}>
                  {producto.cantidad_total} unidades
                </span>
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
          <p>Cargando...</p>
        </div>
      </Modal>
    );
  }

  if (!sesion) {
    return (
      <Modal isOpen={isOpen} onClose={handleCloseModal} title="Cerrar Sesión">
        <div className={styles.errorState}>
          <p>No se encontró la sesión</p>
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
              <span>Fecha:</span>
              <span>
                {new Date(sesion.fecha_apertura).toLocaleDateString()}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span>Saldo Inicial:</span>
              <span>${sesion.saldo_inicial?.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Resumen de Ventas */}
        <div className={styles.salesSummary}>
          <h4>
            <FiShoppingCart />
            Resumen de Ventas
          </h4>

          {calculating ? (
            <div className={styles.calculating}>
              <div className={styles.spinner}></div>
              <p>Calculando...</p>
            </div>
          ) : errorCalculo ? (
            <div className={styles.calculationError}>
              <FiAlertTriangle />
              <p>{errorCalculo}</p>
              <Button variant="secondary" onClick={handleRetryCalculation}>
                Reintentar
              </Button>
            </div>
          ) : (
            totales && (
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
                  <span>Cantidad Ventas:</span>
                  <span>{totales.cantidad_ventas}</span>
                </div>
              </div>
            )
          )}
        </div>

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
              <span>${Math.abs(diferencia).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Observaciones */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Observaciones</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Notas sobre el cierre..."
            rows="2"
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
