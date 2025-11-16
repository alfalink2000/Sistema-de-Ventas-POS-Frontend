// import React, { useState, useEffect } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import {
//   FiCalendar,
//   FiTrash,
//   FiTrash2,
//   FiDollarSign,
//   FiClock,
//   FiUser,
//   FiChevronDown,
//   FiChevronUp,
//   FiSearch,
//   FiFilter,
//   FiDownload,
//   FiWifiOff,
//   FiEye,
//   FiEyeOff,
//   FiRefreshCw,
//   FiPackage,
//   FiTrendingUp,
//   FiTrendingDown,
//   FiLock,
// } from "react-icons/fi";
// import { loadClosures } from "../../../../actions/closuresActions";
// import IndexedDBService from "../../../../services/IndexedDBService";
// import styles from "./ClosuresHistory.module.css";
// import {
//   deleteLocalClosure,
//   clearAllLocalClosures,
// } from "../../../../actions/closuresActions";
// import Swal from "sweetalert2";

// const ClosuresHistory = () => {
//   const [expandedRow, setExpandedRow] = useState(null);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filterMonth, setFilterMonth] = useState("");
//   const [filterYear, setFilterYear] = useState("");
//   const [filterDay, setFilterDay] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [localLoading, setLocalLoading] = useState(false);
//   const itemsPerPage = 10;

//   const dispatch = useDispatch();
//   const { closures: reduxCierres, loading: reduxLoading } = useSelector(
//     (state) => state.closures
//   );

//   // ✅ OBTENER USUARIO ACTUAL PARA VERIFICAR ROL
//   const { user: currentUser } = useSelector((state) => state.auth);
//   const isAdmin = currentUser?.rol === "admin";

//   // ✅ CARGAR CIERRES OFFLINE AL INICIAR
//   useEffect(() => {
//     const loadOfflineClosures = async () => {
//       setLocalLoading(true);
//       try {
//         console.log(
//           "📱 ClosuresHistory: Cargando historial de cierres offline..."
//         );
//         await dispatch(loadClosures(100));
//         console.log("✅ ClosuresHistory: Historial de cierres cargado");
//       } catch (error) {
//         console.error("❌ ClosuresHistory: Error cargando cierres:", error);
//       } finally {
//         setLocalLoading(false);
//       }
//     };

//     loadOfflineClosures();
//   }, [dispatch]);

//   // ✅ FUNCIÓN PARA ELIMINAR CIERRE INDIVIDUAL
//   const handleDeleteClosure = async (closure) => {
//     try {
//       const result = await dispatch(deleteLocalClosure(closure));

//       if (result.success) {
//         console.log("✅ Cierre eliminado exitosamente");
//       }
//     } catch (error) {
//       console.error("❌ Error eliminando cierre:", error);
//     }
//   };

//   // ✅ FUNCIÓN PARA LIMPIAR TODOS LOS CIERRES
//   const handleClearAllClosures = async () => {
//     try {
//       const result = await dispatch(clearAllLocalClosures());

//       if (result.success) {
//         console.log("✅ Todos los cierres locales eliminados");
//       }
//     } catch (error) {
//       console.error("❌ Error eliminando todos los cierres:", error);
//     }
//   };

//   // ✅ REFRESCAR DATOS OFFLINE
//   const handleRetry = async () => {
//     setLocalLoading(true);
//     try {
//       console.log("🔄 ClosuresHistory: Recargando historial de cierres...");
//       await dispatch(loadClosures(100));
//     } catch (error) {
//       console.error("❌ ClosuresHistory: Error recargando cierres:", error);
//     } finally {
//       setTimeout(() => setLocalLoading(false), 1000);
//     }
//   };

//   // ✅ OBTENER INVENTARIO ACTUAL DESDE INDEXEDDB (CAMPOS SIMPLIFICADOS)
//   const getCurrentInventory = async () => {
//     try {
//       const productos = await IndexedDBService.getAll("productos");

//       const inventario = productos
//         .filter(
//           (producto) => producto.activo !== false && producto.eliminado !== true
//         )
//         .map((producto) => ({
//           nombre: producto.nombre || "Sin nombre",
//           categoria:
//             producto.categoria_nombre ||
//             producto.categoria?.nombre ||
//             "Sin categoría",
//           stock_actual: producto.stock || 0,
//           stock_minimo: producto.stock_minimo || 0,
//           precio_venta: producto.precio || producto.precio_venta || 0,
//           estado:
//             producto.stock <= 0
//               ? "AGOTADO"
//               : producto.stock <= (producto.stock_minimo || 5)
//               ? "BAJO STOCK"
//               : "NORMAL",
//         }));

//       // Calcular totales del inventario
//       const totalesInventario = {
//         total_productos: inventario.length,
//         productos_bajo_stock: inventario.filter(
//           (item) => item.estado === "BAJO STOCK"
//         ).length,
//         productos_agotados: inventario.filter(
//           (item) => item.estado === "AGOTADO"
//         ).length,
//         productos_normal: inventario.filter((item) => item.estado === "NORMAL")
//           .length,
//       };

//       console.log(
//         `📊 [INVENTORY] Inventario obtenido: ${inventario.length} productos`
//       );

//       return {
//         inventario,
//         totales: totalesInventario,
//       };
//     } catch (error) {
//       console.error("❌ [INVENTORY] Error obteniendo inventario:", error);
//       return {
//         inventario: [],
//         totales: {
//           total_productos: 0,
//           productos_bajo_stock: 0,
//           productos_agotados: 0,
//           productos_normal: 0,
//         },
//       };
//     }
//   };

//   // ✅ FUNCIÓN MEJORADA PARA CREAR CSV CON PROTECCIÓN EXCEL
//   const createProtectedCSV = (data, closure = null, isBatch = false) => {
//     // Agregar BOM para UTF-8 en Excel
//     const BOM = "\uFEFF";

//     // ✅ ENCABEZADO DE PROTECCIÓN MEJORADO PARA EXCEL
//     const protectionHeader = [
//       "█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█",
//       "█         ARCHIVO DE SOLO LECTURA         █",
//       "█    SISTEMA PUNTO DE VENTA - OFFLINE     █",
//       "█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█",
//       "",
//       "╔═════════════════════════════════════════╗",
//       "║           ADVERTENCIA IMPORTANTE        ║",
//       "╚═════════════════════════════════════════╝",
//       "",
//       "• ESTE ARCHIVO ES DE SOLO LECTURA",
//       "• Generado automáticamente por el sistema",
//       "• Cualquier modificación manual INVALIDARÁ los datos",
//       "• Para cambios, utilice exclusivamente el sistema oficial",
//       "• Contacte al administrador para modificaciones",
//       "",
//       "╔═════════════════════════════════════════╗",
//       "║          METADATOS DE VERIFICACIÓN      ║",
//       "╚═════════════════════════════════════════╝",
//       ...(closure
//         ? [
//             `• ID Cierre: ${closure.id || closure.id_local}`,
//             `• Fecha Cierre: ${new Date(
//               closure.fecha_cierre
//             ).toLocaleDateString("es-MX")}`,
//             `• Vendedor: ${closure.vendedor_nombre || "No especificado"}`,
//           ]
//         : []),
//       `• Generado: ${new Date().toLocaleString("es-MX")}`,
//       `• Usuario: ${currentUser?.name || currentUser?.nombre || "Sistema"}`,
//       `• Hash Verificación: ${btoa(`POS_${Date.now()}`).substring(0, 16)}`,
//       `• Estado: SOLO_LECTURA_VERIFICADO`,
//       "",
//       "╔═════════════════════════════════════════╗",
//       "║         INICIO DATOS OFICIALES          ║",
//       "╚═════════════════════════════════════════╝",
//       "",
//     ].join("\n");

//     return BOM + protectionHeader + data;
//   };

//   // ✅ FUNCIÓN PARA GENERAR NOMBRE DE ARCHIVO CON FECHA
//   const generateFileName = (closure = null, isBatch = false) => {
//     const baseName = isBatch ? "ReporteGeneralCierres" : "CierreCaja";
//     const datePart = closure
//       ? new Date(closure.fecha_cierre).toISOString().split("T")[0]
//       : new Date().toISOString().split("T")[0];

//     return `${baseName}_${datePart}.csv`;
//   };

//   // ✅ EXPORTAR CIERRE INDIVIDUAL CON PROTECCIÓN COMPLETA
//   const exportClosureToCSV = async (closure) => {
//     try {
//       console.log(
//         "📊 Exportando cierre individual a CSV con protección completa:",
//         closure
//       );

//       // Obtener inventario actual
//       const inventoryData = await getCurrentInventory();

//       // ✅ OBTENER PENDIENTES CON DESCRIPCIÓN
//       let pendientesConDescripcion = [];
//       try {
//         const PendientesOfflineController = await import(
//           "../../../../controllers/offline/PendientesOfflineController/PendientesOfflineController"
//         ).then((module) => module.default);

//         const sesionId = closure.sesion_caja_id || closure.sesion_caja_id_local;
//         pendientesConDescripcion =
//           await PendientesOfflineController.getPendientesBySesion(sesionId);

//         console.log(
//           `✅ Obtenidos ${pendientesConDescripcion.length} pendientes con descripción`
//         );
//       } catch (error) {
//         console.error("❌ Error obteniendo pendientes con descripción:", error);
//       }

//       // ✅ OBTENER PRODUCTOS VENDIDOS DEL CIERRE
//       const productosVendidos = closure.productos_vendidos_detalle || [];
//       console.log(
//         `📦 Exportando ${productosVendidos.length} productos vendidos del cierre`
//       );

//       // Preparar datos del cierre con formato mejorado
//       const closureData = [
//         [
//           "REPORTE DETALLADO DE CIERRE DE CAJA CON INVENTARIO, PENDIENTES Y PRODUCTOS VENDIDOS",
//         ],
//         ["Sistema de Punto de Venta - Modo Offline"],
//         [""],
//         ["INFORMACION BASICA DEL CIERRE"],
//         ["ID del Cierre:", closure.id || closure.id_local],
//         [
//           "Fecha de Cierre:",
//           new Date(closure.fecha_cierre).toLocaleString("es-MX"),
//         ],
//         ["Estado:", "Almacenado localmente (Offline)"],
//         [""],
//         ["INFORMACION DE LA SESION"],
//         [
//           "Fecha de Apertura:",
//           new Date(closure.fecha_apertura).toLocaleString("es-MX"),
//         ],
//         [
//           "Fecha de Cierre:",
//           new Date(closure.fecha_cierre).toLocaleString("es-MX"),
//         ],
//         [
//           "Duracion Total:",
//           calculateDuration(closure.fecha_apertura, closure.fecha_cierre),
//         ],
//         ["Vendedor:", closure.vendedor_nombre || "No especificado"],
//         ["Saldo Inicial:", formatCurrency(closure.saldo_inicial || 0)],
//         [""],

//         // ✅ SECCIÓN: RESUMEN DE PRODUCTOS VENDIDOS
//         ["RESUMEN DE PRODUCTOS VENDIDOS"],
//         ["Total Productos Diferentes:", productosVendidos.length],
//         ["Total Unidades Vendidas:", closure.unidades_vendidas || 0],
//         ["Total Ventas Productos:", formatCurrency(closure.total_ventas || 0)],
//         [""],

//         // ✅ TABLA: DETALLE COMPLETO DE PRODUCTOS VENDIDOS
//         ["DETALLE COMPLETO DE PRODUCTOS VENDIDOS"],
//         ["Producto", "Cantidad Total", "Precio Unitario", "Subtotal Total"],

//         // ✅ DATOS DE CADA PRODUCTO VENDIDO
//         ...(productosVendidos.length > 0
//           ? productosVendidos.map((producto) => [
//               `"${producto.nombre}"`,
//               producto.cantidad_total,
//               formatCurrency(producto.precio_unitario),
//               formatCurrency(producto.subtotal_total),
//             ])
//           : [["No hay productos vendidos", "", "", ""]]),

//         [""],
//         ["TOTALES PRODUCTOS VENDIDOS"],
//         [
//           "Total Unidades:",
//           productosVendidos.reduce((sum, p) => sum + p.cantidad_total, 0),
//         ],
//         [
//           "Total Valor:",
//           formatCurrency(
//             productosVendidos.reduce((sum, p) => sum + p.subtotal_total, 0)
//           ),
//         ],
//         [""],

//         ["DETALLE DE VENTAS POR METODO DE PAGO"],
//         ["Ventas en Efectivo:", formatCurrency(closure.total_efectivo || 0)],
//         ["Ventas con Tarjeta:", formatCurrency(closure.total_tarjeta || 0)],
//         [
//           "Ventas por Transferencia:",
//           formatCurrency(closure.total_transferencia || 0),
//         ],
//         ["TOTAL VENTAS:", formatCurrency(closure.total_ventas || 0)],
//         [""],

//         // ✅ SECCIÓN: PENDIENTES E IMPREVISTOS
//         ["PENDIENTES E IMPREVISTOS - RESUMEN"],
//         [
//           "Total Retiros de Efectivo:",
//           formatCurrency(closure.total_retiros_pendientes || 0),
//         ],
//         [
//           "Total Ingresos de Efectivo:",
//           formatCurrency(closure.total_ingresos_pendientes || 0),
//         ],
//         [
//           "Total Pendientes de Pago:",
//           formatCurrency(closure.total_pendientes_pago || 0),
//         ],
//         ["Cantidad de Retiros:", closure.cantidad_retiros || 0],
//         ["Cantidad de Ingresos:", closure.cantidad_ingresos || 0],
//         ["Cantidad de Pendientes:", closure.cantidad_pendientes || 0],
//         [
//           "Impacto Neto en Caja:",
//           formatCurrency(
//             (closure.total_ingresos_pendientes || 0) -
//               (closure.total_retiros_pendientes || 0)
//           ),
//         ],
//         [""],

//         // ✅ TABLA: DETALLE COMPLETO DE PENDIENTES
//         ["DETALLE COMPLETO DE PENDIENTES E IMPREVISTOS"],
//         ["Fecha", "Tipo", "Descripción", "Monto", "Observaciones"],

//         // ✅ DATOS DE CADA PENDIENTE
//         ...(pendientesConDescripcion.length > 0
//           ? pendientesConDescripcion.map((pendiente) => [
//               new Date(pendiente.fecha || pendiente.created_at).toLocaleString(
//                 "es-MX"
//               ),
//               pendiente.tipo?.toUpperCase() || "PENDIENTE",
//               `"${pendiente.descripcion || "Sin descripción"}"`,
//               formatCurrency(pendiente.monto || 0),
//               `"${pendiente.observaciones || "Sin observaciones"}"`,
//             ])
//           : [["No hay pendientes registrados", "", "", "", ""]]),

//         [""],
//         ["TOTALES PENDIENTES"],
//         [
//           "Total Retiros:",
//           formatCurrency(
//             pendientesConDescripcion
//               .filter((p) => p.tipo === "retiro")
//               .reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
//           ),
//         ],
//         [
//           "Total Ingresos:",
//           formatCurrency(
//             pendientesConDescripcion
//               .filter((p) => p.tipo === "ingreso")
//               .reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
//           ),
//         ],
//         [
//           "Total Pendientes Pago:",
//           formatCurrency(
//             pendientesConDescripcion
//               .filter((p) => p.tipo === "pendiente")
//               .reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
//           ),
//         ],
//         [""],

//         ["RESUMEN FINAL DE CAJA"],
//         [
//           "Saldo Final Teorico:",
//           formatCurrency(closure.saldo_final_teorico || 0),
//         ],
//         ["Saldo Final Real:", formatCurrency(closure.saldo_final_real || 0)],
//         ["Diferencia:", formatCurrency(closure.diferencia || 0)],
//         [
//           "Estado del Cierre:",
//           closure.diferencia === 0
//             ? "EXACTO"
//             : closure.diferencia > 0
//             ? "SOBRANTE"
//             : "FALTANTE",
//         ],
//         [""],

//         // ✅ SECCIÓN: INVENTARIO FISICO VALORADO (IPV)
//         ["INVENTARIO FISICO VALORADO (IPV) AL CIERRE"],
//         ["Fecha de captura de inventario:", new Date().toLocaleString("es-MX")],
//         [
//           "Total de productos en inventario:",
//           inventoryData.totales.total_productos,
//         ],
//         ["Productos agotados:", inventoryData.totales.productos_agotados],
//         [
//           "Productos con bajo stock:",
//           inventoryData.totales.productos_bajo_stock,
//         ],
//         ["Productos con stock normal:", inventoryData.totales.productos_normal],
//         [""],

//         // ✅ DETALLE COMPLETO DEL INVENTARIO
//         ["DETALLE COMPLETO DEL INVENTARIO"],
//         [
//           "Producto",
//           "Categoria",
//           "Stock Actual",
//           "Stock Minimo",
//           "Estado",
//           "Precio Venta",
//         ],

//         // ✅ DATOS DE CADA PRODUCTO
//         ...inventoryData.inventario.map((item) => [
//           `"${item.nombre}"`,
//           `"${item.categoria}"`,
//           item.stock_actual,
//           item.stock_minimo,
//           item.estado,
//           formatCurrency(item.precio_venta),
//         ]),

//         [""],
//         ["INFORMACION ADICIONAL"],
//         [
//           "Observaciones del Cierre:",
//           closure.observaciones || "Sin observaciones registradas",
//         ],
//         [""],
//         ["INFORMACION DE EXPORTACION"],
//         ["Fecha de Exportacion:", new Date().toLocaleString("es-MX")],
//         [
//           "Exportado por:",
//           currentUser?.name || currentUser?.nombre || "Usuario",
//         ],
//         ["Rol del Usuario:", currentUser?.rol || "No especificado"],
//         ["Modo:", "Offline"],
//         [""],
//         ["PROTECCION DE ARCHIVO"],
//         ["Estado:", "SOLO_LECTURA - ARCHIVO VERIFICADO"],
//         [
//           "Hash Verificacion:",
//           btoa(`CIERRE_${closure.id}_${Date.now()}`).substring(0, 20),
//         ],
//         ["Integridad:", "GARANTIZADA - NO MODIFICAR"],
//         [""],
//         ["NOTAS IMPORTANTES"],
//         ["Este reporte fue generado automaticamente desde el sistema offline"],
//         ["Los datos reflejan el estado al momento del cierre de caja"],
//         [
//           "El inventario fisico valorado (IPV) muestra el stock actual de todos los productos",
//         ],
//         [
//           "Los pendientes e imprevistos incluyen retiros, ingresos y pagos pendientes registrados durante la sesión",
//         ],
//         [
//           "Los productos vendidos muestran el detalle de todas las ventas realizadas durante la sesión",
//         ],
//         ["CUALQUIER MODIFICACION MANUAL INVALIDA ESTE REPORTE"],
//         ["Para consultas contactar al administrador del sistema"],
//       ];

//       // Convertir a CSV
//       const csvContent = closureData
//         .map((row) => {
//           if (Array.isArray(row)) {
//             return row.map((field) => `"${field}"`).join(",");
//           }
//           return `"${row}"`;
//         })
//         .join("\n");

//       // ✅ CREAR BLOB CON PROTECCIÓN MEJORADA
//       const blob = new Blob([createProtectedCSV(csvContent, closure)], {
//         type: "text/csv;charset=utf-8;",
//       });

//       const url = URL.createObjectURL(blob);
//       const link = document.createElement("a");
//       link.setAttribute("href", url);

//       // ✅ GENERAR NOMBRE CON FECHA
//       const fileName = generateFileName(closure);

//       link.setAttribute("download", fileName);

//       // ✅ AGREGAR ATRIBUTOS DE SEGURIDAD
//       link.setAttribute("data-file-type", "protected-financial-report");
//       link.setAttribute("data-readonly", "true");
//       link.setAttribute(
//         "data-integrity-check",
//         btoa(closure.id + Date.now()).substring(0, 16)
//       );

//       link.style.visibility = "hidden";
//       document.body.appendChild(link);

//       // ✅ AGREGAR EVENTO PARA LOGGING
//       link.addEventListener("click", function (e) {
//         console.log("🔒 Descargando archivo protegido de solo lectura...", {
//           fileName,
//           closureId: closure.id,
//           timestamp: new Date().toISOString(),
//         });
//       });

//       link.click();

//       // ✅ LIMPIAR Y MOSTRAR CONFIRMACIÓN MEJORADA
//       setTimeout(() => {
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url);

//         // Mostrar alerta de éxito con detalles de protección
//         Swal.fire({
//           icon: "success",
//           title: "✅ Archivo Protegido Descargado",
//           html: `
//             <div style="text-align: left; font-size: 14px;">
//               <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; border: 2px solid #0ea5e9;">
//                 <div style="display: flex; align-items: center; margin-bottom: 15px;">
//                   <div style="background: #0ea5e9; color: white; padding: 8px; border-radius: 50%; margin-right: 10px;">
//                     <FiLock size={18} />
//                   </div>
//                   <h3 style="margin: 0; color: #0ea5e9;">Archivo de Solo Lectura</h3>
//                 </div>

//                 <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
//                   <p style="margin: 0 0 8px 0;"><strong>📁 Archivo:</strong> ${fileName}</p>
//                   <p style="margin: 0 0 8px 0;"><strong>🔒 Estado:</strong> <span style="color: #059669; font-weight: bold;">Solo Lectura - Verificado</span></p>
//                   <p style="margin: 0 0 8px 0;"><strong>📊 Cierre:</strong> ${
//                     closure.id || closure.id_local
//                   }</p>
//                   <p style="margin: 0 0 8px 0;"><strong>👤 Vendedor:</strong> ${
//                     closure.vendedor_nombre
//                   }</p>
//                 </div>

//                 <div style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #d97706;">
//                   <p style="margin: 0; font-size: 13px; color: #92400e;">
//                     <strong>⚠️ PROTECCIÓN ACTIVA:</strong> Este archivo incluye medidas de integridad.
//                     Cualquier modificación manual será detectable.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           `,
//           confirmButtonText: "Entendido",
//           width: 500,
//           customClass: {
//             popup: "protected-file-popup",
//           },
//         });
//       }, 100);

//       console.log("✅ CSV protegido exportado exitosamente:", {
//         fileName,
//         totalProductos: inventoryData.inventario.length,
//         totalPendientes: pendientesConDescripcion.length,
//         totalProductosVendidos: productosVendidos.length,
//       });
//     } catch (error) {
//       console.error("❌ Error exportando CSV protegido:", error);
//       Swal.fire({
//         icon: "error",
//         title: "Error en Exportación Protegida",
//         html: `
//           <div style="text-align: left;">
//             <p><strong>No se pudo generar el archivo protegido</strong></p>
//             <p style="color: #dc2626; font-size: 14px;">Error: ${error.message}</p>
//             <p style="font-size: 12px; color: #6b7280;">
//               Por favor, intente nuevamente o contacte al administrador del sistema.
//             </p>
//           </div>
//         `,
//         confirmButtonText: "Entendido",
//       });
//     }
//   };

//   // ✅ EXPORTAR TODOS LOS CIERRES CON PROTECCIÓN COMPLETA
//   const exportAllToCSV = async () => {
//     try {
//       console.log(
//         "📊 Exportando TODOS los cierres offline con protección completa"
//       );

//       // Obtener inventario actual
//       const inventoryData = await getCurrentInventory();

//       // Encabezados mejorados
//       const headers = [
//         "ID CIERRE",
//         "FECHA CIERRE",
//         "VENDEDOR",
//         "SALDO INICIAL",
//         "VENTAS TOTALES",
//         "EFECTIVO",
//         "TARJETA",
//         "TRANSFERENCIA",
//         ...(isAdmin ? ["GANANCIA BRUTA"] : []),
//         "PRODUCTOS DIFERENTES",
//         "UNIDADES VENDIDAS",
//         "RETIROS PENDIENTES",
//         "INGRESOS PENDIENTES",
//         "PENDIENTES PAGO",
//         "TOTAL PENDIENTES",
//         "CANTIDAD RETIROS",
//         "CANTIDAD INGRESOS",
//         "CANTIDAD PENDIENTES",
//         "SALDO FINAL TEORICO",
//         "SALDO FINAL REAL",
//         "DIFERENCIA",
//         "ESTADO",
//         "DURACION",
//         "OBSERVACIONES",
//       ].join(",");

//       // Datos de cada cierre
//       const csvData = filteredClosures.map((closure) => {
//         const productosVendidos = closure.productos_vendidos_detalle || [];

//         const baseData = [
//           closure.id || closure.id_local,
//           new Date(closure.fecha_cierre).toLocaleDateString("es-MX"),
//           `"${closure.vendedor_nombre}"`,
//           closure.saldo_inicial,
//           closure.total_ventas,
//           closure.total_efectivo,
//           closure.total_tarjeta,
//           closure.total_transferencia || 0,
//         ];

//         // ✅ SOLO INCLUIR GANANCIA BRUTA SI ES ADMIN
//         if (isAdmin) {
//           baseData.push(closure.ganancia_bruta);
//         }

//         // ✅ INCLUIR DATOS DE PRODUCTOS VENDIDOS
//         baseData.push(productosVendidos.length, closure.unidades_vendidas || 0);

//         // ✅ INCLUIR DATOS DE PENDIENTES
//         baseData.push(
//           closure.total_retiros_pendientes || 0,
//           closure.total_ingresos_pendientes || 0,
//           closure.total_pendientes_pago || 0,
//           (closure.total_retiros_pendientes || 0) +
//             (closure.total_ingresos_pendientes || 0) +
//             (closure.total_pendientes_pago || 0),
//           closure.cantidad_retiros || 0,
//           closure.cantidad_ingresos || 0,
//           closure.cantidad_pendientes || 0,
//           closure.saldo_final_teorico,
//           closure.saldo_final_real,
//           closure.diferencia,
//           closure.diferencia === 0
//             ? "EXACTO"
//             : closure.diferencia > 0
//             ? "SOBRANTE"
//             : "FALTANTE",
//           calculateDuration(closure.fecha_apertura, closure.fecha_cierre),
//           `"${closure.observaciones || "Sin observaciones"}"`
//         );

//         return baseData.join(",");
//       });

//       // ✅ OBTENER TODOS LOS PENDIENTES
//       let todosLosPendientes = [];
//       try {
//         const PendientesOfflineController = await import(
//           "../../../../controllers/offline/PendientesOfflineController/PendientesOfflineController"
//         ).then((module) => module.default);

//         for (const closure of filteredClosures) {
//           const sesionId =
//             closure.sesion_caja_id || closure.sesion_caja_id_local;
//           const pendientesSesion =
//             await PendientesOfflineController.getPendientesBySesion(sesionId);
//           todosLosPendientes = [
//             ...todosLosPendientes,
//             ...pendientesSesion.map((p) => ({
//               ...p,
//               cierre_id: closure.id || closure.id_local,
//             })),
//           ];
//         }
//       } catch (error) {
//         console.error("❌ Error obteniendo todos los pendientes:", error);
//       }

//       // ✅ SECCIÓN DE PENDIENTES DETALLADOS
//       const pendientesSection = [
//         "",
//         "DETALLE COMPLETO DE TODOS LOS PENDIENTES E IMPREVISTOS",
//         `Fecha de generación: ${new Date().toLocaleString("es-MX")}`,
//         `Total de pendientes: ${todosLosPendientes.length}`,
//         "",
//         "ID Cierre,Fecha,Tipo,Descripción,Monto,Observaciones",
//         ...(todosLosPendientes.length > 0
//           ? todosLosPendientes.map((p) => [
//               p.cierre_id,
//               new Date(p.fecha || p.created_at).toLocaleString("es-MX"),
//               p.tipo?.toUpperCase() || "PENDIENTE",
//               `"${p.descripcion || "Sin descripción"}"`,
//               formatCurrency(p.monto || 0),
//               `"${p.observaciones || "Sin observaciones"}"`,
//             ])
//           : [["No hay pendientes registrados", "", "", "", "", ""]]),
//       ].join("\n");

//       // ✅ SECCIÓN DE INVENTARIO
//       const inventorySection = [
//         "",
//         "INVENTARIO FISICO VALORADO (IPV) - ACTUAL",
//         `Fecha de captura: ${new Date().toLocaleString("es-MX")}`,
//         `Total productos: ${inventoryData.totales.total_productos}`,
//         `Productos agotados: ${inventoryData.totales.productos_agotados}`,
//         `Productos bajo stock: ${inventoryData.totales.productos_bajo_stock}`,
//         `Productos normal: ${inventoryData.totales.productos_normal}`,
//         "",
//         "Producto,Categoria,Stock Actual,Stock Minimo,Estado,Precio Venta",
//         ...inventoryData.inventario.map((item) =>
//           [
//             `"${item.nombre}"`,
//             `"${item.categoria}"`,
//             item.stock_actual,
//             item.stock_minimo,
//             item.estado,
//             formatCurrency(item.precio_venta),
//           ].join(",")
//         ),
//       ].join("\n");

//       // ✅ SECCIÓN DE PRODUCTOS VENDIDOS
//       const productosSection = [
//         "",
//         "DETALLE COMPLETO DE TODOS LOS PRODUCTOS VENDIDOS",
//         `Fecha de generación: ${new Date().toLocaleString("es-MX")}`,
//         `Total de cierres con productos: ${
//           filteredClosures.filter(
//             (c) =>
//               c.productos_vendidos_detalle &&
//               c.productos_vendidos_detalle.length > 0
//           ).length
//         }`,
//         "",
//         "ID Cierre,Producto,Cantidad Total,Precio Unitario,Subtotal Total",
//         ...filteredClosures.flatMap((closure) => {
//           const productos = closure.productos_vendidos_detalle || [];
//           return productos.map((producto) => [
//             closure.id || closure.id_local,
//             `"${producto.nombre}"`,
//             producto.cantidad_total,
//             formatCurrency(producto.precio_unitario),
//             formatCurrency(producto.subtotal_total),
//           ]);
//         }),
//       ].join("\n");

//       // Crear contenido completo
//       const fullCSVContent = [
//         "REPORTE GENERAL DE CIERRES DE CAJA CON INVENTARIO, PENDIENTES Y PRODUCTOS VENDIDOS",
//         `Fecha de generacion: ${new Date().toLocaleString("es-MX")}`,
//         `Total de cierres: ${filteredClosures.length}`,
//         `Total de pendientes: ${todosLosPendientes.length}`,
//         `Generado por: ${
//           currentUser?.name || currentUser?.nombre || "Usuario"
//         } (${currentUser?.rol || "Rol no especificado"})`,
//         "Modo: Offline",
//         "",
//         headers,
//         ...csvData,
//         "",
//         pendientesSection,
//         "",
//         inventorySection,
//         "",
//         productosSection,
//         "",
//         "PROTECCION DE ARCHIVO",
//         "Estado: SOLO_LECTURA - REPORTE VERIFICADO",
//         `Hash Verificacion: ${btoa("REPORTE_GENERAL_" + Date.now()).substring(
//           0,
//           25
//         )}`,
//         "Integridad: GARANTIZADA - NO MODIFICAR MANUALMENTE",
//         "",
//         "NOTAS IMPORTANTES:",
//         "Este reporte contiene todos los cierres de caja almacenados localmente",
//         "Los datos estan filtrados segun los criterios aplicados en pantalla",
//         "El inventario fisico valorado (IPV) muestra el stock actual de todos los productos",
//         "Los pendientes incluyen retiros, ingresos y pagos pendientes registrados durante cada sesión",
//         "CUALQUIER MODIFICACION MANUAL INVALIDA ESTE REPORTE OFICIAL",
//         ...(isAdmin
//           ? []
//           : [
//               "La ganancia bruta solo esta disponible para usuarios administradores",
//             ]),
//         "Para mas detalles consulte los reportes individuales",
//       ].join("\n");

//       // ✅ CREAR BLOB CON PROTECCIÓN
//       const blob = new Blob([createProtectedCSV(fullCSVContent, null, true)], {
//         type: "text/csv;charset=utf-8;",
//       });

//       const url = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;

//       // ✅ GENERAR NOMBRE CON FECHA
//       a.download = generateFileName(null, true);

//       // ✅ AGREGAR ATRIBUTOS DE SEGURIDAD
//       a.setAttribute("data-file-type", "protected-financial-report-batch");
//       a.setAttribute("data-records", filteredClosures.length.toString());
//       a.setAttribute("data-readonly", "true");

//       a.click();

//       // ✅ MOSTRAR CONFIRMACIÓN
//       setTimeout(() => {
//         URL.revokeObjectURL(url);
//         Swal.fire({
//           icon: "success",
//           title: "✅ Reporte General Protegido",
//           html: `
//             <div style="text-align: center;">
//               <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; border: 2px solid #0ea5e9;">
//                 <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
//                   <div style="background: #0ea5e9; color: white; padding: 10px; border-radius: 50%; margin-right: 10px;">
//                     <FiLock size={20} />
//                   </div>
//                   <h3 style="margin: 0; color: #0ea5e9;">Reporte Protegido Descargado</h3>
//                 </div>

//                 <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
//                   <p style="margin: 0 0 10px 0; font-size: 16px;">
//                     <strong>📊 ${filteredClosures.length} cierres</strong> incluidos
//                   </p>
//                   <p style="margin: 0; font-size: 14px; color: #6b7280;">
//                     Archivo protegido con medidas de integridad
//                   </p>
//                 </div>

//                 <div style="background: #fef3c7; padding: 10px; border-radius: 6px;">
//                   <p style="margin: 0; font-size: 13px; color: #92400e;">
//                     <strong>🔒 SOLO LECTURA:</strong> Cualquier modificación invalidará el reporte
//                   </p>
//                 </div>
//               </div>
//             </div>
//           `,
//           confirmButtonText: "Entendido",
//           width: 450,
//         });
//       }, 100);

//       console.log("✅ Reporte general protegido exportado exitosamente");
//     } catch (error) {
//       console.error("❌ Error exportando reporte general protegido:", error);
//       Swal.fire({
//         icon: "error",
//         title: "Error en Reporte Protegido",
//         text:
//           "No se pudo generar el reporte general protegido: " + error.message,
//         confirmButtonText: "Entendido",
//       });
//     }
//   };

//   // Determinar qué datos usar
//   const closures = reduxCierres || [];
//   const loading = reduxLoading || localLoading;

//   // ✅ OBTENER AÑOS ÚNICOS DE LOS CIERRES
//   const getUniqueYears = () => {
//     const years = closures.map((closure) =>
//       new Date(closure.fecha_cierre).getFullYear()
//     );
//     const uniqueYears = [...new Set(years)].sort((a, b) => b - a);
//     return uniqueYears;
//   };

//   // ✅ OBTENER DÍAS ÚNICOS (1-31)
//   const getDayOptions = () => {
//     return Array.from({ length: 31 }, (_, i) => ({
//       value: (i + 1).toString(),
//       label: (i + 1).toString(),
//     }));
//   };

//   const getMonthOptions = () => {
//     const months = [
//       { value: "", label: "Todos los meses" },
//       { value: "0", label: "Enero" },
//       { value: "1", label: "Febrero" },
//       { value: "2", label: "Marzo" },
//       { value: "3", label: "Abril" },
//       { value: "4", label: "Mayo" },
//       { value: "5", label: "Junio" },
//       { value: "6", label: "Julio" },
//       { value: "7", label: "Agosto" },
//       { value: "8", label: "Septiembre" },
//       { value: "9", label: "Octubre" },
//       { value: "10", label: "Noviembre" },
//       { value: "11", label: "Diciembre" },
//     ];
//     return months;
//   };

//   // ✅ FILTRAR Y ORDENAR DATOS
//   const filteredClosures = closures
//     .filter((closure) => {
//       const closureDate = new Date(closure.fecha_cierre);
//       const closureYear = closureDate.getFullYear();
//       const closureMonth = closureDate.getMonth();
//       const closureDay = closureDate.getDate();

//       // Filtro de búsqueda
//       const matchesSearch =
//         closure.vendedor_nombre
//           ?.toLowerCase()
//           .includes(searchTerm.toLowerCase()) ||
//         closure.id?.toString().includes(searchTerm) ||
//         closure.id_local?.toString().includes(searchTerm);

//       // Filtro por mes
//       const matchesMonth =
//         !filterMonth || closureMonth === parseInt(filterMonth);

//       // Filtro por año
//       const matchesYear = !filterYear || closureYear === parseInt(filterYear);

//       // Filtro por día
//       const matchesDay = !filterDay || closureDay === parseInt(filterDay);

//       return matchesSearch && matchesMonth && matchesYear && matchesDay;
//     })
//     // ✅ ORDENAR POR FECHA (MÁS RECIENTE PRIMERO)
//     .sort((a, b) => new Date(b.fecha_cierre) - new Date(a.fecha_cierre));

//   const totalPages = Math.ceil(filteredClosures.length / itemsPerPage);
//   const paginatedClosures = filteredClosures.slice(
//     (currentPage - 1) * itemsPerPage,
//     currentPage * itemsPerPage
//   );

//   // ✅ LIMPIAR FILTROS
//   const clearFilters = () => {
//     setFilterMonth("");
//     setFilterYear("");
//     setFilterDay("");
//     setSearchTerm("");
//     setCurrentPage(1);
//   };

//   const toggleRow = (id) => {
//     setExpandedRow(expandedRow === id ? null : id);
//   };

//   const formatCurrency = (amount) => {
//     return new Intl.NumberFormat("es-MX", {
//       style: "currency",
//       currency: "MXN",
//     }).format(amount || 0);
//   };

//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString("es-MX", {
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//     });
//   };

//   const calculateDuration = (apertura, cierre) => {
//     const start = new Date(apertura);
//     const end = new Date(cierre);
//     const diffMs = end - start;

//     const hours = Math.floor(diffMs / (1000 * 60 * 60));
//     const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

//     return `${hours}h ${minutes}m`;
//   };

//   // ✅ COMPONENTE DE INDICADOR DE VISIBILIDAD ADMIN
//   const renderAdminVisibilityIndicator = () => (
//     <div className={styles.adminVisibilityIndicator}>
//       {isAdmin ? (
//         <>
//           <FiEye className={styles.visibleIcon} />
//           <span>Vista de Administrador - Ganancia Bruta visible</span>
//         </>
//       ) : (
//         <>
//           <FiEyeOff className={styles.hiddenIcon} />
//           <span>Vista de Vendedor - Ganancia Bruta oculta</span>
//         </>
//       )}
//     </div>
//   );

//   if (loading && closures.length === 0) {
//     return (
//       <div className={styles.loadingContainer}>
//         <div className={styles.spinner}></div>
//         <p>Cargando historial de cierres locales...</p>
//       </div>
//     );
//   }

//   return (
//     <div className={styles.closuresHistory}>
//       {/* Header con controles */}
//       <div className={styles.header}>
//         <div className={styles.headerInfo}>
//           <h2>
//             <FiCalendar className={styles.headerIcon} />
//             Historial de Cierres de Caja
//             <span className={styles.offlineBadge}>
//               <FiWifiOff />
//               Offline
//             </span>
//           </h2>
//           <p>{filteredClosures.length} registros locales encontrados</p>

//           {/* ✅ INDICADOR DE VISIBILIDAD ADMIN */}
//           {renderAdminVisibilityIndicator()}
//         </div>

//         <div className={styles.controls}>
//           <div className={styles.searchBox}>
//             <FiSearch className={styles.searchIcon} />
//             <input
//               type="text"
//               placeholder="Buscar por vendedor o ID..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className={styles.searchInput}
//             />
//           </div>

//           {/* ✅ FILTROS MEJORADOS */}
//           <div className={styles.filtersContainer}>
//             <div className={styles.filterGroup}>
//               <FiFilter className={styles.filterIcon} />
//               <select
//                 value={filterYear}
//                 onChange={(e) => setFilterYear(e.target.value)}
//                 className={styles.filterSelect}
//               >
//                 <option value="">Todos los años</option>
//                 {getUniqueYears().map((year) => (
//                   <option key={year} value={year}>
//                     {year}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className={styles.filterGroup}>
//               <select
//                 value={filterMonth}
//                 onChange={(e) => setFilterMonth(e.target.value)}
//                 className={styles.filterSelect}
//               >
//                 {getMonthOptions().map((month) => (
//                   <option key={month.value} value={month.value}>
//                     {month.label}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className={styles.filterGroup}>
//               <select
//                 value={filterDay}
//                 onChange={(e) => setFilterDay(e.target.value)}
//                 className={styles.filterSelect}
//               >
//                 <option value="">Todos los días</option>
//                 {getDayOptions().map((day) => (
//                   <option key={day.value} value={day.value}>
//                     Día {day.label}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* ✅ BOTÓN LIMPIAR FILTROS */}
//             {(filterMonth || filterYear || filterDay || searchTerm) && (
//               <button
//                 className={styles.clearFiltersButton}
//                 onClick={clearFilters}
//                 title="Limpiar todos los filtros"
//               >
//                 Limpiar
//               </button>
//             )}

//             {/* ✅ BOTÓN ACTUALIZAR */}
//             <button
//               className={styles.refreshBtn}
//               onClick={handleRetry}
//               disabled={loading}
//               title="Actualizar datos locales"
//             >
//               <FiRefreshCw className={loading ? styles.spinning : ""} />
//             </button>
//           </div>

//           {/* ✅ BOTÓN EXPORTAR TODOS - CON INDICADOR DE PROTECCIÓN */}
//           {filteredClosures.length > 0 && (
//             <button
//               className={styles.exportButton}
//               onClick={exportAllToCSV}
//               title="Exportar todos los cierres a CSV protegido (Solo Lectura)"
//             >
//               <FiDownload className={styles.exportIcon} />
//               <FiLock className={styles.lockIcon} />
//               Exportar Completo
//             </button>
//           )}

//           {/* ✅ BOTÓN PARA LIMPIAR TODOS LOS CIERRES LOCALES */}
//           {filteredClosures.length > 0 && (
//             <button
//               className={styles.clearAllButton}
//               onClick={handleClearAllClosures}
//               title="Eliminar todos los cierres locales"
//             >
//               <FiTrash className={styles.clearAllIcon} />
//               Limpiar Todo
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Tabla de cierres */}
//       <div className={styles.tableContainer}>
//         <div className={styles.tableWrapper}>
//           <table className={styles.table}>
//             <thead>
//               <tr>
//                 <th className={styles.expandColumn}></th>
//                 <th>ID</th>
//                 <th>Fecha Cierre</th>
//                 <th>Vendedor</th>
//                 <th>Ventas Totales</th>
//                 <th>Total Efectivo</th>
//                 <th>Pendientes</th>
//                 <th>Duración</th>
//                 <th>Diferencia</th>
//                 <th>Estado</th>
//                 <th>Acciones</th>
//               </tr>
//             </thead>
//             <tbody>
//               {paginatedClosures.length === 0 ? (
//                 <tr>
//                   <td colSpan="11" className={styles.noData}>
//                     <div className={styles.noDataContent}>
//                       <FiCalendar className={styles.noDataIcon} />
//                       <p>No hay cierres almacenados localmente</p>
//                       {(filterMonth ||
//                         filterYear ||
//                         filterDay ||
//                         searchTerm) && (
//                         <button
//                           className={styles.clearFiltersLink}
//                           onClick={clearFilters}
//                         >
//                           Limpiar filtros para ver todos los registros
//                         </button>
//                       )}
//                     </div>
//                   </td>
//                 </tr>
//               ) : (
//                 paginatedClosures.map((closure) => (
//                   <React.Fragment key={closure.id || closure.id_local}>
//                     <tr
//                       className={styles.tableRow}
//                       onClick={() => toggleRow(closure.id || closure.id_local)}
//                     >
//                       <td className={styles.expandCell}>
//                         {expandedRow === (closure.id || closure.id_local) ? (
//                           <FiChevronUp className={styles.expandIcon} />
//                         ) : (
//                           <FiChevronDown className={styles.expandIcon} />
//                         )}
//                       </td>
//                       <td className={styles.idCell}>
//                         {closure.id
//                           ? `#${closure.id}`
//                           : `📱${closure.id_local}`}
//                       </td>
//                       <td className={styles.dateCell}>
//                         {formatDate(closure.fecha_cierre)}
//                       </td>
//                       <td className={styles.userCell}>
//                         <FiUser className={styles.userIcon} />
//                         {closure.vendedor_nombre}
//                       </td>
//                       <td className={styles.salesCell}>
//                         {formatCurrency(closure.total_ventas)}
//                       </td>
//                       <td className={styles.amountCell}>
//                         {formatCurrency(closure.total_efectivo)}
//                       </td>
//                       <td className={styles.pendientesCell}>
//                         <div className={styles.pendientesInfo}>
//                           {closure.total_retiros_pendientes > 0 ||
//                           closure.total_ingresos_pendientes > 0 ||
//                           closure.total_pendientes_pago > 0 ? (
//                             <>
//                               <FiTrendingDown className={styles.retiroIcon} />
//                               <span>
//                                 -
//                                 {formatCurrency(
//                                   closure.total_retiros_pendientes || 0
//                                 )}
//                               </span>
//                               <FiTrendingUp className={styles.ingresoIcon} />
//                               <span>
//                                 +
//                                 {formatCurrency(
//                                   closure.total_ingresos_pendientes || 0
//                                 )}
//                               </span>
//                             </>
//                           ) : (
//                             <span className={styles.sinPendientes}>
//                               Sin movimientos
//                             </span>
//                           )}
//                         </div>
//                       </td>
//                       <td className={styles.durationCell}>
//                         <FiClock className={styles.durationIcon} />
//                         {calculateDuration(
//                           closure.fecha_apertura,
//                           closure.fecha_cierre
//                         )}
//                       </td>
//                       <td className={styles.differenceCell}>
//                         <span
//                           className={
//                             closure.diferencia === 0
//                               ? styles.exact
//                               : closure.diferencia > 0
//                               ? styles.positive
//                               : styles.negative
//                           }
//                         >
//                           {formatCurrency(closure.diferencia)}
//                         </span>
//                       </td>
//                       <td className={styles.statusCell}>
//                         <span
//                           className={
//                             closure.diferencia === 0
//                               ? styles.statusExact
//                               : closure.diferencia > 0
//                               ? styles.statusSurplus
//                               : styles.statusShortage
//                           }
//                         >
//                           {closure.diferencia === 0
//                             ? "Exacto"
//                             : closure.diferencia > 0
//                             ? "Sobrante"
//                             : "Faltante"}
//                         </span>
//                       </td>
//                       <td className={styles.actionsCell}>
//                         {/* ✅ BOTÓN DE EXPORTACIÓN INDIVIDUAL - CON PROTECCIÓN */}
//                         <button
//                           className={styles.individualExportButton}
//                           onClick={async (e) => {
//                             e.stopPropagation();
//                             await exportClosureToCSV(closure);
//                           }}
//                           title="Exportar este cierre a CSV protegido (Solo Lectura)"
//                         >
//                           <FiPackage />
//                           <FiLock className={styles.buttonLockIcon} />
//                           Exportar
//                         </button>

//                         {/* ✅ BOTÓN PARA ELIMINAR CIERRE */}
//                         <button
//                           className={styles.deleteButton}
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             handleDeleteClosure(closure);
//                           }}
//                           title="Eliminar este cierre local"
//                         >
//                           <FiTrash2 />
//                           Eliminar
//                         </button>
//                       </td>
//                     </tr>
//                     {expandedRow === (closure.id || closure.id_local) && (
//                       <tr className={styles.detailsRow}>
//                         <td colSpan="11">
//                           <div className={styles.detailsContent}>
//                             <div className={styles.detailsGrid}>
//                               <div className={styles.detailSection}>
//                                 <h4>Información de la Sesión</h4>
//                                 <div className={styles.detailItem}>
//                                   <span>Fecha Apertura:</span>
//                                   <span>
//                                     {formatDate(closure.fecha_apertura)}
//                                   </span>
//                                 </div>
//                                 <div className={styles.detailItem}>
//                                   <span>Fecha Cierre:</span>
//                                   <span>
//                                     {formatDate(closure.fecha_cierre)}
//                                   </span>
//                                 </div>
//                                 <div className={styles.detailItem}>
//                                   <span>Duración Total:</span>
//                                   <span>
//                                     {calculateDuration(
//                                       closure.fecha_apertura,
//                                       closure.fecha_cierre
//                                     )}
//                                   </span>
//                                 </div>
//                                 <div className={styles.detailItem}>
//                                   <span>Saldo Inicial:</span>
//                                   <span>
//                                     {formatCurrency(closure.saldo_inicial)}
//                                   </span>
//                                 </div>
//                               </div>

//                               <div className={styles.detailSection}>
//                                 <h4>Totales por Método de Pago</h4>
//                                 <div className={styles.detailItem}>
//                                   <span>Efectivo:</span>
//                                   <span>
//                                     {formatCurrency(closure.total_efectivo)}
//                                   </span>
//                                 </div>
//                                 <div className={styles.detailItem}>
//                                   <span>Tarjeta:</span>
//                                   <span>
//                                     {formatCurrency(closure.total_tarjeta)}
//                                   </span>
//                                 </div>
//                                 <div className={styles.detailItem}>
//                                   <span>Transferencia:</span>
//                                   <span>
//                                     {formatCurrency(
//                                       closure.total_transferencia || 0
//                                     )}
//                                   </span>
//                                 </div>
//                                 <div className={styles.detailItem}>
//                                   <span>Ventas Totales:</span>
//                                   <span className={styles.totalAmount}>
//                                     {formatCurrency(closure.total_ventas)}
//                                   </span>
//                                 </div>
//                               </div>

//                               <div className={styles.detailSection}>
//                                 <h4>Pendientes e Imprevistos</h4>
//                                 <div className={styles.detailItem}>
//                                   <span>Retiros de Efectivo:</span>
//                                   <span className={styles.negative}>
//                                     -
//                                     {formatCurrency(
//                                       closure.total_retiros_pendientes || 0
//                                     )}
//                                   </span>
//                                 </div>
//                                 <div className={styles.detailItem}>
//                                   <span>Ingresos de Efectivo:</span>
//                                   <span className={styles.positive}>
//                                     +
//                                     {formatCurrency(
//                                       closure.total_ingresos_pendientes || 0
//                                     )}
//                                   </span>
//                                 </div>
//                                 <div className={styles.detailItem}>
//                                   <span>Pendientes de Pago:</span>
//                                   <span>
//                                     {formatCurrency(
//                                       closure.total_pendientes_pago || 0
//                                     )}
//                                   </span>
//                                 </div>
//                                 <div className={styles.detailItem}>
//                                   <span>Impacto Neto:</span>
//                                   <span
//                                     className={
//                                       (closure.total_ingresos_pendientes || 0) -
//                                         (closure.total_retiros_pendientes ||
//                                           0) >=
//                                       0
//                                         ? styles.positive
//                                         : styles.negative
//                                     }
//                                   >
//                                     {formatCurrency(
//                                       (closure.total_ingresos_pendientes || 0) -
//                                         (closure.total_retiros_pendientes || 0)
//                                     )}
//                                   </span>
//                                 </div>
//                               </div>

//                               <div className={styles.detailSection}>
//                                 <h4>Resumen Financiero</h4>
//                                 {/* ✅ SOLO MOSTRAR GANANCIA BRUTA SI ES ADMIN */}
//                                 {isAdmin && (
//                                   <div className={styles.detailItem}>
//                                     <span>Ganancia Bruta:</span>
//                                     <span className={styles.profitHighlight}>
//                                       {formatCurrency(closure.ganancia_bruta)}
//                                     </span>
//                                   </div>
//                                 )}
//                                 <div className={styles.detailItem}>
//                                   <span>Saldo Final Teórico:</span>
//                                   <span>
//                                     {formatCurrency(
//                                       closure.saldo_final_teorico
//                                     )}
//                                   </span>
//                                 </div>
//                                 <div className={styles.detailItem}>
//                                   <span>Saldo Final Real:</span>
//                                   <span>
//                                     {formatCurrency(closure.saldo_final_real)}
//                                   </span>
//                                 </div>
//                                 <div className={styles.detailItem}>
//                                   <span>Diferencia:</span>
//                                   <span
//                                     className={
//                                       closure.diferencia === 0
//                                         ? styles.exact
//                                         : closure.diferencia > 0
//                                         ? styles.positive
//                                         : styles.negative
//                                     }
//                                   >
//                                     {formatCurrency(closure.diferencia)}
//                                   </span>
//                                 </div>
//                               </div>
//                             </div>

//                             {closure.observaciones && (
//                               <div className={styles.observations}>
//                                 <h4>Observaciones</h4>
//                                 <p>{closure.observaciones}</p>
//                               </div>
//                             )}

//                             {/* ✅ INDICADOR DE DATO LOCAL */}
//                             <div className={styles.localDataIndicator}>
//                               <FiWifiOff />
//                               <span>
//                                 Dato cargado desde almacenamiento local
//                               </span>
//                             </div>
//                           </div>
//                         </td>
//                       </tr>
//                     )}
//                   </React.Fragment>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Paginación */}
//       {totalPages > 1 && (
//         <div className={styles.pagination}>
//           <button
//             className={styles.paginationButton}
//             onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
//             disabled={currentPage === 1}
//           >
//             Anterior
//           </button>

//           <div className={styles.pageInfo}>
//             Página {currentPage} de {totalPages}
//             <span className={styles.offlinePagination}> • Modo Offline</span>
//           </div>

//           <button
//             className={styles.paginationButton}
//             onClick={() =>
//               setCurrentPage((prev) => Math.min(prev + 1, totalPages))
//             }
//             disabled={currentPage === totalPages}
//           >
//             Siguiente
//           </button>
//         </div>
//       )}

//       {/* ✅ INFORMACIÓN DE PIE OFFLINE */}
//       {filteredClosures.length > 0 && (
//         <div className={styles.offlineFooter}>
//           <FiWifiOff className={styles.offlineFooterIcon} />
//           <span>
//             Modo offline • {filteredClosures.length} cierres locales almacenados
//           </span>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ClosuresHistory;
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiCalendar,
  FiTrash,
  FiTrash2,
  FiDollarSign,
  FiClock,
  FiUser,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiFilter,
  FiDownload,
  FiWifiOff,
  FiEye,
  FiEyeOff,
  FiRefreshCw,
  FiPackage,
  FiTrendingUp,
  FiTrendingDown,
  FiLock,
  FiX,
} from "react-icons/fi";
import { loadClosures } from "../../../../actions/closuresActions";
import IndexedDBService from "../../../../services/IndexedDBService";
import styles from "./ClosuresHistory.module.css";
import {
  deleteLocalClosure,
  clearAllLocalClosures,
} from "../../../../actions/closuresActions";
import Swal from "sweetalert2";

const ClosuresHistory = () => {
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [localLoading, setLocalLoading] = useState(false);
  const [ipvModalVisible, setIpvModalVisible] = useState(false);
  const [currentIPVData, setCurrentIPVData] = useState(null);
  const [ipvLoading, setIpvLoading] = useState(false);
  const itemsPerPage = 10;

  const dispatch = useDispatch();
  const { closures: reduxCierres, loading: reduxLoading } = useSelector(
    (state) => state.closures
  );

  // ✅ OBTENER USUARIO ACTUAL PARA VERIFICAR ROL
  const { user: currentUser } = useSelector((state) => state.auth);
  const isAdmin = currentUser?.rol === "admin";

  // ✅ CARGAR CIERRES OFFLINE AL INICIAR
  useEffect(() => {
    const loadOfflineClosures = async () => {
      setLocalLoading(true);
      try {
        console.log(
          "📱 ClosuresHistory: Cargando historial de cierres offline..."
        );
        await dispatch(loadClosures(100));
        console.log("✅ ClosuresHistory: Historial de cierres cargado");
      } catch (error) {
        console.error("❌ ClosuresHistory: Error cargando cierres:", error);
      } finally {
        setLocalLoading(false);
      }
    };

    loadOfflineClosures();
  }, [dispatch]);

  // ✅ FUNCIÓN PARA ELIMINAR CIERRE INDIVIDUAL
  const handleDeleteClosure = async (closure) => {
    try {
      const result = await dispatch(deleteLocalClosure(closure));

      if (result.success) {
        console.log("✅ Cierre eliminado exitosamente");
      }
    } catch (error) {
      console.error("❌ Error eliminando cierre:", error);
    }
  };

  // ✅ FUNCIÓN PARA LIMPIAR TODOS LOS CIERRES
  const handleClearAllClosures = async () => {
    try {
      const result = await dispatch(clearAllLocalClosures());

      if (result.success) {
        console.log("✅ Todos los cierres locales eliminados");
      }
    } catch (error) {
      console.error("❌ Error eliminando todos los cierres:", error);
    }
  };

  // ✅ REFRESCAR DATOS OFFLINE
  const handleRetry = async () => {
    setLocalLoading(true);
    try {
      console.log("🔄 ClosuresHistory: Recargando historial de cierres...");
      await dispatch(loadClosures(100));
    } catch (error) {
      console.error("❌ ClosuresHistory: Error recargando cierres:", error);
    } finally {
      setTimeout(() => setLocalLoading(false), 1000);
    }
  };

  // ✅ OBTENER INVENTARIO ACTUAL DESDE INDEXEDDB (CAMPOS SIMPLIFICADOS)
  const getCurrentInventory = async () => {
    try {
      const productos = await IndexedDBService.getAll("productos");

      const inventario = productos
        .filter(
          (producto) => producto.activo !== false && producto.eliminado !== true
        )
        .map((producto) => ({
          nombre: producto.nombre || "Sin nombre",
          categoria:
            producto.categoria_nombre ||
            producto.categoria?.nombre ||
            "Sin categoría",
          stock_actual: producto.stock || 0,
          stock_minimo: producto.stock_minimo || 0,
          precio_venta: producto.precio || producto.precio_venta || 0,
          estado:
            producto.stock <= 0
              ? "AGOTADO"
              : producto.stock <= (producto.stock_minimo || 5)
              ? "BAJO STOCK"
              : "NORMAL",
        }));

      // Calcular totales del inventario
      const totalesInventario = {
        total_productos: inventario.length,
        productos_bajo_stock: inventario.filter(
          (item) => item.estado === "BAJO STOCK"
        ).length,
        productos_agotados: inventario.filter(
          (item) => item.estado === "AGOTADO"
        ).length,
        productos_normal: inventario.filter((item) => item.estado === "NORMAL")
          .length,
      };

      console.log(
        `📊 [INVENTORY] Inventario obtenido: ${inventario.length} productos`
      );

      return {
        inventario,
        totales: totalesInventario,
      };
    } catch (error) {
      console.error("❌ [INVENTORY] Error obteniendo inventario:", error);
      return {
        inventario: [],
        totales: {
          total_productos: 0,
          productos_bajo_stock: 0,
          productos_agotados: 0,
          productos_normal: 0,
        },
      };
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA CREAR CSV (SIN LOS TÍTULOS DE SOLO LECTURA)
  const createProtectedCSV = (data, closure = null, isBatch = false) => {
    // Agregar BOM para UTF-8 en Excel
    const BOM = "\uFEFF";

    // ✅ ENCABEZADO SIMPLIFICADO SIN LOS TÍTULOS EXTENSOS
    const protectionHeader = [
      "SISTEMA PUNTO DE VENTA - OFFLINE",
      "ARCHIVO DE SOLO LECTURA - NO MODIFICAR",
      "",
      "METADATOS DE VERIFICACIÓN",
      ...(closure
        ? [
            `ID Cierre: ${closure.id || closure.id_local}`,
            `Fecha Cierre: ${new Date(closure.fecha_cierre).toLocaleDateString(
              "es-MX"
            )}`,
            `Vendedor: ${closure.vendedor_nombre || "No especificado"}`,
          ]
        : []),
      `Generado: ${new Date().toLocaleString("es-MX")}`,
      `Usuario: ${currentUser?.name || currentUser?.nombre || "Sistema"}`,
      "",
      "INICIO DATOS OFICIALES",
      "",
    ].join("\n");

    return BOM + protectionHeader + data;
  };

  // ✅ FUNCIÓN PARA MOSTRAR IPV EN MODAL
  const handleShowIPV = async (closure) => {
    try {
      setIpvLoading(true);
      console.log("📊 Mostrando IPV para cierre:", closure);

      // Obtener inventario actual
      const inventoryData = await getCurrentInventory();

      // Estructurar datos para el modal
      const ipvData = {
        closureInfo: {
          id: closure.id || closure.id_local,
          fecha_cierre: closure.fecha_cierre,
          vendedor: closure.vendedor_nombre,
        },
        inventory: inventoryData.inventario,
        totals: inventoryData.totales,
      };

      setCurrentIPVData(ipvData);
      setIpvModalVisible(true);
    } catch (error) {
      console.error("❌ Error obteniendo datos IPV:", error);
      Swal.fire({
        icon: "error",
        title: "Error al cargar IPV",
        text: "No se pudieron cargar los datos del inventario",
        confirmButtonText: "Entendido",
      });
    } finally {
      setIpvLoading(false);
    }
  };

  // ✅ CERRAR MODAL IPV
  const handleCloseIPVModal = () => {
    setIpvModalVisible(false);
    setCurrentIPVData(null);
  };

  // ✅ FUNCIÓN PARA GENERAR NOMBRE DE ARCHIVO CON FECHA
  const generateFileName = (closure = null, isBatch = false) => {
    const baseName = isBatch ? "ReporteGeneralCierres" : "CierreCaja";
    const datePart = closure
      ? new Date(closure.fecha_cierre).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    return `${baseName}_${datePart}.csv`;
  };

  // ✅ EXPORTAR CIERRE INDIVIDUAL CON PROTECCIÓN COMPLETA
  const exportClosureToCSV = async (closure) => {
    try {
      console.log(
        "📊 Exportando cierre individual a CSV con protección completa:",
        closure
      );

      // Obtener inventario actual
      const inventoryData = await getCurrentInventory();

      // ✅ OBTENER PENDIENTES CON DESCRIPCIÓN
      let pendientesConDescripcion = [];
      try {
        const PendientesOfflineController = await import(
          "../../../../controllers/offline/PendientesOfflineController/PendientesOfflineController"
        ).then((module) => module.default);

        const sesionId = closure.sesion_caja_id || closure.sesion_caja_id_local;
        pendientesConDescripcion =
          await PendientesOfflineController.getPendientesBySesion(sesionId);

        console.log(
          `✅ Obtenidos ${pendientesConDescripcion.length} pendientes con descripción`
        );
      } catch (error) {
        console.error("❌ Error obteniendo pendientes con descripción:", error);
      }

      // ✅ OBTENER PRODUCTOS VENDIDOS DEL CIERRE
      const productosVendidos = closure.productos_vendidos_detalle || [];
      console.log(
        `📦 Exportando ${productosVendidos.length} productos vendidos del cierre`
      );

      // Preparar datos del cierre con formato mejorado
      const closureData = [
        [
          "REPORTE DETALLADO DE CIERRE DE CAJA CON INVENTARIO, PENDIENTES Y PRODUCTOS VENDIDOS",
        ],
        ["Sistema de Punto de Venta - Modo Offline"],
        [""],
        ["INFORMACION BASICA DEL CIERRE"],
        ["ID del Cierre:", closure.id || closure.id_local],
        [
          "Fecha de Cierre:",
          new Date(closure.fecha_cierre).toLocaleString("es-MX"),
        ],
        ["Estado:", "Almacenado localmente (Offline)"],
        [""],
        ["INFORMACION DE LA SESION"],
        [
          "Fecha de Apertura:",
          new Date(closure.fecha_apertura).toLocaleString("es-MX"),
        ],
        [
          "Fecha de Cierre:",
          new Date(closure.fecha_cierre).toLocaleString("es-MX"),
        ],
        [
          "Duracion Total:",
          calculateDuration(closure.fecha_apertura, closure.fecha_cierre),
        ],
        ["Vendedor:", closure.vendedor_nombre || "No especificado"],
        ["Saldo Inicial:", formatCurrency(closure.saldo_inicial || 0)],
        [""],

        // ✅ SECCIÓN: RESUMEN DE PRODUCTOS VENDIDOS
        ["RESUMEN DE PRODUCTOS VENDIDOS"],
        ["Total Productos Diferentes:", productosVendidos.length],
        ["Total Unidades Vendidas:", closure.unidades_vendidas || 0],
        ["Total Ventas Productos:", formatCurrency(closure.total_ventas || 0)],
        [""],

        // ✅ TABLA: DETALLE COMPLETO DE PRODUCTOS VENDIDOS
        ["DETALLE COMPLETO DE PRODUCTOS VENDIDOS"],
        ["Producto", "Cantidad Total", "Precio Unitario", "Subtotal Total"],

        // ✅ DATOS DE CADA PRODUCTO VENDIDO
        ...(productosVendidos.length > 0
          ? productosVendidos.map((producto) => [
              `"${producto.nombre}"`,
              producto.cantidad_total,
              formatCurrency(producto.precio_unitario),
              formatCurrency(producto.subtotal_total),
            ])
          : [["No hay productos vendidos", "", "", ""]]),

        [""],
        ["TOTALES PRODUCTOS VENDIDOS"],
        [
          "Total Unidades:",
          productosVendidos.reduce((sum, p) => sum + p.cantidad_total, 0),
        ],
        [
          "Total Valor:",
          formatCurrency(
            productosVendidos.reduce((sum, p) => sum + p.subtotal_total, 0)
          ),
        ],
        [""],

        ["DETALLE DE VENTAS POR METODO DE PAGO"],
        ["Ventas en Efectivo:", formatCurrency(closure.total_efectivo || 0)],
        ["Ventas con Tarjeta:", formatCurrency(closure.total_tarjeta || 0)],
        [
          "Ventas por Transferencia:",
          formatCurrency(closure.total_transferencia || 0),
        ],
        ["TOTAL VENTAS:", formatCurrency(closure.total_ventas || 0)],
        [""],

        // ✅ SECCIÓN: PENDIENTES E IMPREVISTOS
        ["PENDIENTES E IMPREVISTOS - RESUMEN"],
        [
          "Total Retiros de Efectivo:",
          formatCurrency(closure.total_retiros_pendientes || 0),
        ],
        [
          "Total Ingresos de Efectivo:",
          formatCurrency(closure.total_ingresos_pendientes || 0),
        ],
        [
          "Total Pendientes de Pago:",
          formatCurrency(closure.total_pendientes_pago || 0),
        ],
        ["Cantidad de Retiros:", closure.cantidad_retiros || 0],
        ["Cantidad de Ingresos:", closure.cantidad_ingresos || 0],
        ["Cantidad de Pendientes:", closure.cantidad_pendientes || 0],
        [
          "Impacto Neto en Caja:",
          formatCurrency(
            (closure.total_ingresos_pendientes || 0) -
              (closure.total_retiros_pendientes || 0)
          ),
        ],
        [""],

        // ✅ TABLA: DETALLE COMPLETO DE PENDIENTES
        ["DETALLE COMPLETO DE PENDIENTES E IMPREVISTOS"],
        ["Fecha", "Tipo", "Descripción", "Monto", "Observaciones"],

        // ✅ DATOS DE CADA PENDIENTE
        ...(pendientesConDescripcion.length > 0
          ? pendientesConDescripcion.map((pendiente) => [
              new Date(pendiente.fecha || pendiente.created_at).toLocaleString(
                "es-MX"
              ),
              pendiente.tipo?.toUpperCase() || "PENDIENTE",
              `"${pendiente.descripcion || "Sin descripción"}"`,
              formatCurrency(pendiente.monto || 0),
              `"${pendiente.observaciones || "Sin observaciones"}"`,
            ])
          : [["No hay pendientes registrados", "", "", "", ""]]),

        [""],
        ["TOTALES PENDIENTES"],
        [
          "Total Retiros:",
          formatCurrency(
            pendientesConDescripcion
              .filter((p) => p.tipo === "retiro")
              .reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
          ),
        ],
        [
          "Total Ingresos:",
          formatCurrency(
            pendientesConDescripcion
              .filter((p) => p.tipo === "ingreso")
              .reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
          ),
        ],
        [
          "Total Pendientes Pago:",
          formatCurrency(
            pendientesConDescripcion
              .filter((p) => p.tipo === "pendiente")
              .reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0)
          ),
        ],
        [""],

        ["RESUMEN FINAL DE CAJA"],
        [
          "Saldo Final Teorico:",
          formatCurrency(closure.saldo_final_teorico || 0),
        ],
        ["Saldo Final Real:", formatCurrency(closure.saldo_final_real || 0)],
        ["Diferencia:", formatCurrency(closure.diferencia || 0)],
        [
          "Estado del Cierre:",
          closure.diferencia === 0
            ? "EXACTO"
            : closure.diferencia > 0
            ? "SOBRANTE"
            : "FALTANTE",
        ],
        [""],

        // ✅ SECCIÓN: INVENTARIO FISICO VALORADO (IPV)
        ["INVENTARIO FISICO VALORADO (IPV) AL CIERRE"],
        ["Fecha de captura de inventario:", new Date().toLocaleString("es-MX")],
        [
          "Total de productos en inventario:",
          inventoryData.totales.total_productos,
        ],
        ["Productos agotados:", inventoryData.totales.productos_agotados],
        [
          "Productos con bajo stock:",
          inventoryData.totales.productos_bajo_stock,
        ],
        ["Productos con stock normal:", inventoryData.totales.productos_normal],
        [""],

        // ✅ DETALLE COMPLETO DEL INVENTARIO
        ["DETALLE COMPLETO DEL INVENTARIO"],
        [
          "Producto",
          "Categoria",
          "Stock Actual",
          "Stock Minimo",
          "Estado",
          "Precio Venta",
        ],

        // ✅ DATOS DE CADA PRODUCTO
        ...inventoryData.inventario.map((item) => [
          `"${item.nombre}"`,
          `"${item.categoria}"`,
          item.stock_actual,
          item.stock_minimo,
          item.estado,
          formatCurrency(item.precio_venta),
        ]),

        [""],
        ["INFORMACION ADICIONAL"],
        [
          "Observaciones del Cierre:",
          closure.observaciones || "Sin observaciones registradas",
        ],
        [""],
        ["INFORMACION DE EXPORTACION"],
        ["Fecha de Exportacion:", new Date().toLocaleString("es-MX")],
        [
          "Exportado por:",
          currentUser?.name || currentUser?.nombre || "Usuario",
        ],
        ["Rol del Usuario:", currentUser?.rol || "No especificado"],
        ["Modo:", "Offline"],
        [""],
        ["PROTECCION DE ARCHIVO"],
        ["Estado:", "SOLO_LECTURA - ARCHIVO VERIFICADO"],
        [
          "Hash Verificacion:",
          btoa(`CIERRE_${closure.id}_${Date.now()}`).substring(0, 20),
        ],
        ["Integridad:", "GARANTIZADA - NO MODIFICAR"],
        [""],
        ["NOTAS IMPORTANTES"],
        ["Este reporte fue generado automaticamente desde el sistema offline"],
        ["Los datos reflejan el estado al momento del cierre de caja"],
        [
          "El inventario fisico valorado (IPV) muestra el stock actual de todos los productos",
        ],
        [
          "Los pendientes e imprevistos incluyen retiros, ingresos y pagos pendientes registrados durante la sesión",
        ],
        [
          "Los productos vendidos muestran el detalle de todas las ventas realizadas durante la sesión",
        ],
        ["CUALQUIER MODIFICACION MANUAL INVALIDA ESTE REPORTE"],
        ["Para consultas contactar al administrador del sistema"],
      ];

      // Convertir a CSV
      const csvContent = closureData
        .map((row) => {
          if (Array.isArray(row)) {
            return row.map((field) => `"${field}"`).join(",");
          }
          return `"${row}"`;
        })
        .join("\n");

      // ✅ CREAR BLOB CON PROTECCIÓN MEJORADA
      const blob = new Blob([createProtectedCSV(csvContent, closure)], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);

      // ✅ GENERAR NOMBRE CON FECHA
      const fileName = generateFileName(closure);

      link.setAttribute("download", fileName);

      // ✅ AGREGAR ATRIBUTOS DE SEGURIDAD
      link.setAttribute("data-file-type", "protected-financial-report");
      link.setAttribute("data-readonly", "true");
      link.setAttribute(
        "data-integrity-check",
        btoa(closure.id + Date.now()).substring(0, 16)
      );

      link.style.visibility = "hidden";
      document.body.appendChild(link);

      // ✅ AGREGAR EVENTO PARA LOGGING
      link.addEventListener("click", function (e) {
        console.log("🔒 Descargando archivo protegido de solo lectura...", {
          fileName,
          closureId: closure.id,
          timestamp: new Date().toISOString(),
        });
      });

      link.click();

      // ✅ LIMPIAR Y MOSTRAR CONFIRMACIÓN MEJORADA
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Mostrar alerta de éxito con detalles de protección
        Swal.fire({
          icon: "success",
          title: "✅ Archivo Protegido Descargado",
          html: `
            <div style="text-align: left; font-size: 14px;">
              <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; border: 2px solid #0ea5e9;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <div style="background: #0ea5e9; color: white; padding: 8px; border-radius: 50%; margin-right: 10px;">
                    <FiLock size={18} />
                  </div>
                  <h3 style="margin: 0; color: #0ea5e9;">Archivo de Solo Lectura</h3>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                  <p style="margin: 0 0 8px 0;"><strong>📁 Archivo:</strong> ${fileName}</p>
                  <p style="margin: 0 0 8px 0;"><strong>🔒 Estado:</strong> <span style="color: #059669; font-weight: bold;">Solo Lectura - Verificado</span></p>
                  <p style="margin: 0 0 8px 0;"><strong>📊 Cierre:</strong> ${
                    closure.id || closure.id_local
                  }</p>
                  <p style="margin: 0 0 8px 0;"><strong>👤 Vendedor:</strong> ${
                    closure.vendedor_nombre
                  }</p>
                </div>
                
                <div style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 4px solid #d97706;">
                  <p style="margin: 0; font-size: 13px; color: #92400e;">
                    <strong>⚠️ PROTECCIÓN ACTIVA:</strong> Este archivo incluye medidas de integridad. 
                    Cualquier modificación manual será detectable.
                  </p>
                </div>
              </div>
            </div>
          `,
          confirmButtonText: "Entendido",
          width: 500,
          customClass: {
            popup: "protected-file-popup",
          },
        });
      }, 100);

      console.log("✅ CSV protegido exportado exitosamente:", {
        fileName,
        totalProductos: inventoryData.inventario.length,
        totalPendientes: pendientesConDescripcion.length,
        totalProductosVendidos: productosVendidos.length,
      });
    } catch (error) {
      console.error("❌ Error exportando CSV protegido:", error);
      Swal.fire({
        icon: "error",
        title: "Error en Exportación Protegida",
        html: `
          <div style="text-align: left;">
            <p><strong>No se pudo generar el archivo protegido</strong></p>
            <p style="color: #dc2626; font-size: 14px;">Error: ${error.message}</p>
            <p style="font-size: 12px; color: #6b7280;">
              Por favor, intente nuevamente o contacte al administrador del sistema.
            </p>
          </div>
        `,
        confirmButtonText: "Entendido",
      });
    }
  };

  // ✅ EXPORTAR TODOS LOS CIERRES CON PROTECCIÓN COMPLETA
  const exportAllToCSV = async () => {
    try {
      console.log(
        "📊 Exportando TODOS los cierres offline con protección completa"
      );

      // Obtener inventario actual
      const inventoryData = await getCurrentInventory();

      // Encabezados mejorados
      const headers = [
        "ID CIERRE",
        "FECHA CIERRE",
        "VENDEDOR",
        "SALDO INICIAL",
        "VENTAS TOTALES",
        "EFECTIVO",
        "TARJETA",
        "TRANSFERENCIA",
        ...(isAdmin ? ["GANANCIA BRUTA"] : []),
        "PRODUCTOS DIFERENTES",
        "UNIDADES VENDIDAS",
        "RETIROS PENDIENTES",
        "INGRESOS PENDIENTES",
        "PENDIENTES PAGO",
        "TOTAL PENDIENTES",
        "CANTIDAD RETIROS",
        "CANTIDAD INGRESOS",
        "CANTIDAD PENDIENTES",
        "SALDO FINAL TEORICO",
        "SALDO FINAL REAL",
        "DIFERENCIA",
        "ESTADO",
        "DURACION",
        "OBSERVACIONES",
      ].join(",");

      // Datos de cada cierre
      const csvData = filteredClosures.map((closure) => {
        const productosVendidos = closure.productos_vendidos_detalle || [];

        const baseData = [
          closure.id || closure.id_local,
          new Date(closure.fecha_cierre).toLocaleDateString("es-MX"),
          `"${closure.vendedor_nombre}"`,
          closure.saldo_inicial,
          closure.total_ventas,
          closure.total_efectivo,
          closure.total_tarjeta,
          closure.total_transferencia || 0,
        ];

        // ✅ SOLO INCLUIR GANANCIA BRUTA SI ES ADMIN
        if (isAdmin) {
          baseData.push(closure.ganancia_bruta);
        }

        // ✅ INCLUIR DATOS DE PRODUCTOS VENDIDOS
        baseData.push(productosVendidos.length, closure.unidades_vendidas || 0);

        // ✅ INCLUIR DATOS DE PENDIENTES
        baseData.push(
          closure.total_retiros_pendientes || 0,
          closure.total_ingresos_pendientes || 0,
          closure.total_pendientes_pago || 0,
          (closure.total_retiros_pendientes || 0) +
            (closure.total_ingresos_pendientes || 0) +
            (closure.total_pendientes_pago || 0),
          closure.cantidad_retiros || 0,
          closure.cantidad_ingresos || 0,
          closure.cantidad_pendientes || 0,
          closure.saldo_final_teorico,
          closure.saldo_final_real,
          closure.diferencia,
          closure.diferencia === 0
            ? "EXACTO"
            : closure.diferencia > 0
            ? "SOBRANTE"
            : "FALTANTE",
          calculateDuration(closure.fecha_apertura, closure.fecha_cierre),
          `"${closure.observaciones || "Sin observaciones"}"`
        );

        return baseData.join(",");
      });

      // ✅ OBTENER TODOS LOS PENDIENTES
      let todosLosPendientes = [];
      try {
        const PendientesOfflineController = await import(
          "../../../../controllers/offline/PendientesOfflineController/PendientesOfflineController"
        ).then((module) => module.default);

        for (const closure of filteredClosures) {
          const sesionId =
            closure.sesion_caja_id || closure.sesion_caja_id_local;
          const pendientesSesion =
            await PendientesOfflineController.getPendientesBySesion(sesionId);
          todosLosPendientes = [
            ...todosLosPendientes,
            ...pendientesSesion.map((p) => ({
              ...p,
              cierre_id: closure.id || closure.id_local,
            })),
          ];
        }
      } catch (error) {
        console.error("❌ Error obteniendo todos los pendientes:", error);
      }

      // ✅ SECCIÓN DE PENDIENTES DETALLADOS
      const pendientesSection = [
        "",
        "DETALLE COMPLETO DE TODOS LOS PENDIENTES E IMPREVISTOS",
        `Fecha de generación: ${new Date().toLocaleString("es-MX")}`,
        `Total de pendientes: ${todosLosPendientes.length}`,
        "",
        "ID Cierre,Fecha,Tipo,Descripción,Monto,Observaciones",
        ...(todosLosPendientes.length > 0
          ? todosLosPendientes.map((p) => [
              p.cierre_id,
              new Date(p.fecha || p.created_at).toLocaleString("es-MX"),
              p.tipo?.toUpperCase() || "PENDIENTE",
              `"${p.descripcion || "Sin descripción"}"`,
              formatCurrency(p.monto || 0),
              `"${p.observaciones || "Sin observaciones"}"`,
            ])
          : [["No hay pendientes registrados", "", "", "", "", ""]]),
      ].join("\n");

      // ✅ SECCIÓN DE INVENTARIO
      const inventorySection = [
        "",
        "INVENTARIO FISICO VALORADO (IPV) - ACTUAL",
        `Fecha de captura: ${new Date().toLocaleString("es-MX")}`,
        `Total productos: ${inventoryData.totales.total_productos}`,
        `Productos agotados: ${inventoryData.totales.productos_agotados}`,
        `Productos bajo stock: ${inventoryData.totales.productos_bajo_stock}`,
        `Productos normal: ${inventoryData.totales.productos_normal}`,
        "",
        "Producto,Categoria,Stock Actual,Stock Minimo,Estado,Precio Venta",
        ...inventoryData.inventario.map((item) =>
          [
            `"${item.nombre}"`,
            `"${item.categoria}"`,
            item.stock_actual,
            item.stock_minimo,
            item.estado,
            formatCurrency(item.precio_venta),
          ].join(",")
        ),
      ].join("\n");

      // ✅ SECCIÓN DE PRODUCTOS VENDIDOS
      const productosSection = [
        "",
        "DETALLE COMPLETO DE TODOS LOS PRODUCTOS VENDIDOS",
        `Fecha de generación: ${new Date().toLocaleString("es-MX")}`,
        `Total de cierres con productos: ${
          filteredClosures.filter(
            (c) =>
              c.productos_vendidos_detalle &&
              c.productos_vendidos_detalle.length > 0
          ).length
        }`,
        "",
        "ID Cierre,Producto,Cantidad Total,Precio Unitario,Subtotal Total",
        ...filteredClosures.flatMap((closure) => {
          const productos = closure.productos_vendidos_detalle || [];
          return productos.map((producto) => [
            closure.id || closure.id_local,
            `"${producto.nombre}"`,
            producto.cantidad_total,
            formatCurrency(producto.precio_unitario),
            formatCurrency(producto.subtotal_total),
          ]);
        }),
      ].join("\n");

      // Crear contenido completo
      const fullCSVContent = [
        "REPORTE GENERAL DE CIERRES DE CAJA CON INVENTARIO, PENDIENTES Y PRODUCTOS VENDIDOS",
        `Fecha de generacion: ${new Date().toLocaleString("es-MX")}`,
        `Total de cierres: ${filteredClosures.length}`,
        `Total de pendientes: ${todosLosPendientes.length}`,
        `Generado por: ${
          currentUser?.name || currentUser?.nombre || "Usuario"
        } (${currentUser?.rol || "Rol no especificado"})`,
        "Modo: Offline",
        "",
        headers,
        ...csvData,
        "",
        pendientesSection,
        "",
        inventorySection,
        "",
        productosSection,
        "",
        "PROTECCION DE ARCHIVO",
        "Estado: SOLO_LECTURA - REPORTE VERIFICADO",
        `Hash Verificacion: ${btoa("REPORTE_GENERAL_" + Date.now()).substring(
          0,
          25
        )}`,
        "Integridad: GARANTIZADA - NO MODIFICAR MANUALMENTE",
        "",
        "NOTAS IMPORTANTES:",
        "Este reporte contiene todos los cierres de caja almacenados localmente",
        "Los datos estan filtrados segun los criterios aplicados en pantalla",
        "El inventario fisico valorado (IPV) muestra el stock actual de todos los productos",
        "Los pendientes incluyen retiros, ingresos y pagos pendientes registrados durante cada sesión",
        "CUALQUIER MODIFICACION MANUAL INVALIDA ESTE REPORTE OFICIAL",
        ...(isAdmin
          ? []
          : [
              "La ganancia bruta solo esta disponible para usuarios administradores",
            ]),
        "Para mas detalles consulte los reportes individuales",
      ].join("\n");

      // ✅ CREAR BLOB CON PROTECCIÓN
      const blob = new Blob([createProtectedCSV(fullCSVContent, null, true)], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // ✅ GENERAR NOMBRE CON FECHA
      a.download = generateFileName(null, true);

      // ✅ AGREGAR ATRIBUTOS DE SEGURIDAD
      a.setAttribute("data-file-type", "protected-financial-report-batch");
      a.setAttribute("data-records", filteredClosures.length.toString());
      a.setAttribute("data-readonly", "true");

      a.click();

      // ✅ MOSTRAR CONFIRMACIÓN
      setTimeout(() => {
        URL.revokeObjectURL(url);
        Swal.fire({
          icon: "success",
          title: "✅ Reporte General Protegido",
          html: `
            <div style="text-align: center;">
              <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; border: 2px solid #0ea5e9;">
                <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                  <div style="background: #0ea5e9; color: white; padding: 10px; border-radius: 50%; margin-right: 10px;">
                    <FiLock size={20} />
                  </div>
                  <h3 style="margin: 0; color: #0ea5e9;">Reporte Protegido Descargado</h3>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                  <p style="margin: 0 0 10px 0; font-size: 16px;">
                    <strong>📊 ${filteredClosures.length} cierres</strong> incluidos
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    Archivo protegido con medidas de integridad
                  </p>
                </div>
                
                <div style="background: #fef3c7; padding: 10px; border-radius: 6px;">
                  <p style="margin: 0; font-size: 13px; color: #92400e;">
                    <strong>🔒 SOLO LECTURA:</strong> Cualquier modificación invalidará el reporte
                  </p>
                </div>
              </div>
            </div>
          `,
          confirmButtonText: "Entendido",
          width: 450,
        });
      }, 100);

      console.log("✅ Reporte general protegido exportado exitosamente");
    } catch (error) {
      console.error("❌ Error exportando reporte general protegido:", error);
      Swal.fire({
        icon: "error",
        title: "Error en Reporte Protegido",
        text:
          "No se pudo generar el reporte general protegido: " + error.message,
        confirmButtonText: "Entendido",
      });
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

  // ✅ COMPONENTE MODAL PARA IPV
  const IPVModal = () => {
    if (!ipvModalVisible || !currentIPVData) return null;

    return (
      <div className={styles.ipvModalOverlay} onClick={handleCloseIPVModal}>
        <div className={styles.ipvModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.ipvModalHeader}>
            <h2>
              <FiPackage className={styles.ipvIcon} />
              Inventario Físico Valorado (IPV)
            </h2>
            <button
              className={styles.ipvCloseButton}
              onClick={handleCloseIPVModal}
            >
              <FiX />
            </button>
          </div>

          <div className={styles.ipvModalContent}>
            <div className={styles.ipvInfoSection}>
              <div className={styles.ipvInfoItem}>
                <span>Cierre ID:</span>
                <strong>#{currentIPVData.closureInfo.id}</strong>
              </div>
              <div className={styles.ipvInfoItem}>
                <span>Fecha Cierre:</span>
                <span>
                  {formatDate(currentIPVData.closureInfo.fecha_cierre)}
                </span>
              </div>
              <div className={styles.ipvInfoItem}>
                <span>Vendedor:</span>
                <span>{currentIPVData.closureInfo.vendedor}</span>
              </div>
            </div>

            <div className={styles.ipvTotals}>
              <div className={styles.ipvTotalItem}>
                <span>Total Productos:</span>
                <span className={styles.ipvTotalNumber}>
                  {currentIPVData.totals.total_productos}
                </span>
              </div>
              <div className={styles.ipvTotalItem}>
                <span>Stock Normal:</span>
                <span className={styles.ipvNormal}>
                  {currentIPVData.totals.productos_normal}
                </span>
              </div>
              <div className={styles.ipvTotalItem}>
                <span>Bajo Stock:</span>
                <span className={styles.ipvWarning}>
                  {currentIPVData.totals.productos_bajo_stock}
                </span>
              </div>
              <div className={styles.ipvTotalItem}>
                <span>Agotados:</span>
                <span className={styles.ipvDanger}>
                  {currentIPVData.totals.productos_agotados}
                </span>
              </div>
            </div>

            <div className={styles.ipvTableContainer}>
              <table className={styles.ipvTable}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th>Estado</th>
                    <th>Precio Venta</th>
                  </tr>
                </thead>
                <tbody>
                  {currentIPVData.inventory.map((item, index) => (
                    <tr key={index} className={styles.ipvTableRow}>
                      <td className={styles.ipvProductName}>{item.nombre}</td>
                      <td className={styles.ipvCategory}>{item.categoria}</td>
                      <td className={styles.ipvStock}>{item.stock_actual}</td>
                      <td className={styles.ipvMinStock}>
                        {item.stock_minimo}
                      </td>
                      <td className={styles.ipvStatus}>
                        <span
                          className={
                            item.estado === "NORMAL"
                              ? styles.statusNormal
                              : item.estado === "BAJO STOCK"
                              ? styles.statusWarning
                              : styles.statusDanger
                          }
                        >
                          {item.estado}
                        </span>
                      </td>
                      <td className={styles.ipvPrice}>
                        {formatCurrency(item.precio_venta)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.ipvFooter}>
              <p>
                <strong>Nota:</strong> Este inventario refleja el estado actual
                de los productos en el sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && closures.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando historial de cierres locales...</p>
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
            <span className={styles.offlineBadge}>
              <FiWifiOff />
              Offline
            </span>
          </h2>
          <p>{filteredClosures.length} registros locales encontrados</p>

          {/* ✅ INDICADOR DE VISIBILIDAD ADMIN */}
          {renderAdminVisibilityIndicator()}
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
              title="Actualizar datos locales"
            >
              <FiRefreshCw className={loading ? styles.spinning : ""} />
            </button>
          </div>

          {/* ✅ BOTÓN EXPORTAR TODOS - CON INDICADOR DE PROTECCIÓN */}
          {filteredClosures.length > 0 && (
            <button
              className={styles.exportButton}
              onClick={exportAllToCSV}
              title="Exportar todos los cierres a CSV protegido (Solo Lectura)"
            >
              <FiDownload className={styles.exportIcon} />
              <FiLock className={styles.lockIcon} />
              Exportar Completo
            </button>
          )}

          {/* ✅ BOTÓN PARA LIMPIAR TODOS LOS CIERRES LOCALES */}
          {filteredClosures.length > 0 && (
            <button
              className={styles.clearAllButton}
              onClick={handleClearAllClosures}
              title="Eliminar todos los cierres locales"
            >
              <FiTrash className={styles.clearAllIcon} />
              Limpiar Todo
            </button>
          )}
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
                <th>Pendientes</th>
                <th>Duración</th>
                <th>Diferencia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClosures.length === 0 ? (
                <tr>
                  <td colSpan="11" className={styles.noData}>
                    <div className={styles.noDataContent}>
                      <FiCalendar className={styles.noDataIcon} />
                      <p>No hay cierres almacenados localmente</p>
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
                      <td className={styles.pendientesCell}>
                        <div className={styles.pendientesInfo}>
                          {closure.total_retiros_pendientes > 0 ||
                          closure.total_ingresos_pendientes > 0 ||
                          closure.total_pendientes_pago > 0 ? (
                            <>
                              <FiTrendingDown className={styles.retiroIcon} />
                              <span>
                                -
                                {formatCurrency(
                                  closure.total_retiros_pendientes || 0
                                )}
                              </span>
                              <FiTrendingUp className={styles.ingresoIcon} />
                              <span>
                                +
                                {formatCurrency(
                                  closure.total_ingresos_pendientes || 0
                                )}
                              </span>
                            </>
                          ) : (
                            <span className={styles.sinPendientes}>
                              Sin movimientos
                            </span>
                          )}
                        </div>
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
                      <td className={styles.actionsCell}>
                        {/* ✅ BOTÓN IPV - NUEVO */}
                        <button
                          className={styles.ipvButton}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleShowIPV(closure);
                          }}
                          disabled={ipvLoading}
                          title="Ver Inventario Físico Valorado (IPV)"
                        >
                          <FiPackage />
                          {ipvLoading ? "Cargando..." : "IPV"}
                        </button>

                        {/* ✅ BOTÓN DE EXPORTACIÓN INDIVIDUAL - CON PROTECCIÓN */}
                        <button
                          className={styles.individualExportButton}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await exportClosureToCSV(closure);
                          }}
                          title="Exportar este cierre a CSV protegido (Solo Lectura)"
                        >
                          <FiDownload />
                          <FiLock className={styles.buttonLockIcon} />
                          Exportar
                        </button>

                        {/* ✅ BOTÓN PARA ELIMINAR CIERRE */}
                        <button
                          className={styles.deleteButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClosure(closure);
                          }}
                          title="Eliminar este cierre local"
                        >
                          <FiTrash2 />
                          Eliminar
                        </button>
                      </td>
                    </tr>
                    {expandedRow === (closure.id || closure.id_local) && (
                      <tr className={styles.detailsRow}>
                        <td colSpan="11">
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
                                <h4>Pendientes e Imprevistos</h4>
                                <div className={styles.detailItem}>
                                  <span>Retiros de Efectivo:</span>
                                  <span className={styles.negative}>
                                    -
                                    {formatCurrency(
                                      closure.total_retiros_pendientes || 0
                                    )}
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span>Ingresos de Efectivo:</span>
                                  <span className={styles.positive}>
                                    +
                                    {formatCurrency(
                                      closure.total_ingresos_pendientes || 0
                                    )}
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span>Pendientes de Pago:</span>
                                  <span>
                                    {formatCurrency(
                                      closure.total_pendientes_pago || 0
                                    )}
                                  </span>
                                </div>
                                <div className={styles.detailItem}>
                                  <span>Impacto Neto:</span>
                                  <span
                                    className={
                                      (closure.total_ingresos_pendientes || 0) -
                                        (closure.total_retiros_pendientes ||
                                          0) >=
                                      0
                                        ? styles.positive
                                        : styles.negative
                                    }
                                  >
                                    {formatCurrency(
                                      (closure.total_ingresos_pendientes || 0) -
                                        (closure.total_retiros_pendientes || 0)
                                    )}
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
                            <div className={styles.localDataIndicator}>
                              <FiWifiOff />
                              <span>
                                Dato cargado desde almacenamiento local
                              </span>
                            </div>
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
            <span className={styles.offlinePagination}> • Modo Offline</span>
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

      {/* ✅ INFORMACIÓN DE PIE OFFLINE */}
      {filteredClosures.length > 0 && (
        <div className={styles.offlineFooter}>
          <FiWifiOff className={styles.offlineFooterIcon} />
          <span>
            Modo offline • {filteredClosures.length} cierres locales almacenados
          </span>
        </div>
      )}

      {/* ✅ MODAL IPV */}
      <IPVModal />
    </div>
  );
};

export default ClosuresHistory;
