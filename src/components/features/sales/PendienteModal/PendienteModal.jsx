// import React, { useState } from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { createPendiente } from "../../../../actions/pendientesActions";
// import Modal from "../../../ui/Modal/Modal";
// import Button from "../../../ui/Button/Button";
// import {
//   FiDollarSign,
//   FiFileText,
//   FiTrendingUp,
//   FiTrendingDown,
//   FiClock,
// } from "react-icons/fi";
// import styles from "./PendienteModal.module.css";

// const PendienteModal = ({ isOpen, onClose }) => {
//   const [descripcion, setDescripcion] = useState("");
//   const [monto, setMonto] = useState("");
//   const [tipo, setTipo] = useState("retiro");
//   const [procesando, setProcesando] = useState(false);

//   const dispatch = useDispatch();
//   const { sesionAbierta } = useSelector((state) => state.sesionesCaja);

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!descripcion.trim() || !monto || parseFloat(monto) <= 0) {
//       Swal.fire({
//         icon: "error",
//         title: "Datos incompletos",
//         text: "Por favor, completa todos los campos correctamente",
//         confirmButtonText: "Entendido",
//       });
//       return;
//     }

//     if (!sesionAbierta) {
//       Swal.fire({
//         icon: "error",
//         title: "Sesión requerida",
//         text: "Debes tener una sesión de caja abierta para registrar pendientes",
//         confirmButtonText: "Entendido",
//       });
//       return;
//     }

//     setProcesando(true);

//     try {
//       const result = await dispatch(
//         createPendiente({
//           descripcion: descripcion.trim(),
//           monto: parseFloat(monto),
//           tipo,
//         })
//       );

//       if (result.success) {
//         // Limpiar formulario
//         setDescripcion("");
//         setMonto("");
//         setTipo("retiro");
//         onClose();
//       }
//     } catch (error) {
//       console.error("Error al crear pendiente:", error);
//     } finally {
//       setProcesando(false);
//     }
//   };

//   const handleClose = () => {
//     if (!procesando) {
//       setDescripcion("");
//       setMonto("");
//       setTipo("retiro");
//       onClose();
//     }
//   };

//   const getTipoConfig = (tipoSeleccionado) => {
//     const configs = {
//       retiro: {
//         icon: <FiTrendingDown className={styles.tipoIcon} />,
//         color: "#dc2626",
//         label: "Retiro de Efectivo",
//         description: "Salida de dinero de la caja (gastos, imprevistos, etc.)",
//       },
//       ingreso: {
//         icon: <FiTrendingUp className={styles.tipoIcon} />,
//         color: "#16a34a",
//         label: "Ingreso de Efectivo",
//         description:
//           "Entrada de dinero a la caja (depósitos, reintegros, etc.)",
//       },
//       pendiente: {
//         icon: <FiClock className={styles.tipoIcon} />,
//         color: "#d97706",
//         label: "Pendiente de Pago",
//         description: "Producto llevado con pago pendiente",
//       },
//     };
//     return configs[tipoSeleccionado] || configs.retiro;
//   };

//   const tipoConfig = getTipoConfig(tipo);

//   return (
//     <Modal
//       isOpen={isOpen}
//       onClose={handleClose}
//       title="Registrar Pendiente/Imprevisto"
//       size="medium"
//       overlayClassName={styles.modalOverlay}
//       className={styles.modalContent}
//     >
//       <div className={styles.pendienteModal}>
//         {/* Información de la Sesión */}
//         {sesionAbierta && (
//           <div className={styles.sessionInfo}>
//             <div className={styles.sessionBadge}>
//               <FiDollarSign className={styles.sessionIcon} />
//               <span>Sesión: {sesionAbierta.id || sesionAbierta.id_local}</span>
//             </div>
//             <div className={styles.sessionSaldo}>
//               Saldo Inicial: ${sesionAbierta.saldo_inicial?.toFixed(2)}
//             </div>
//           </div>
//         )}

//         {/* Selector de Tipo */}
//         <div className={styles.tipoSection}>
//           <label className={styles.label}>Tipo de Movimiento</label>
//           <div className={styles.tipoOptions}>
//             {["retiro", "ingreso", "pendiente"].map((tipoOption) => (
//               <div
//                 key={tipoOption}
//                 className={`${styles.tipoOption} ${
//                   tipo === tipoOption ? styles.tipoOptionSelected : ""
//                 }`}
//                 onClick={() => setTipo(tipoOption)}
//                 style={{
//                   borderColor: getTipoConfig(tipoOption).color,
//                 }}
//               >
//                 {getTipoConfig(tipoOption).icon}
//                 <div className={styles.tipoInfo}>
//                   <span className={styles.tipoLabel}>
//                     {getTipoConfig(tipoOption).label}
//                   </span>
//                   <span className={styles.tipoDescription}>
//                     {getTipoConfig(tipoOption).description}
//                   </span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         <form onSubmit={handleSubmit} className={styles.form}>
//           {/* Campo Descripción */}
//           <div className={styles.formGroup}>
//             <label className={styles.label}>
//               <FiFileText className={styles.labelIcon} />
//               Descripción
//               <small>Describe el motivo del movimiento</small>
//             </label>
//             <textarea
//               value={descripcion}
//               onChange={(e) => setDescripcion(e.target.value)}
//               placeholder={
//                 tipo === "retiro"
//                   ? "Ej: Retiro para gastos de transporte..."
//                   : tipo === "ingreso"
//                   ? "Ej: Ingreso por depósito de cliente..."
//                   : "Ej: Producto pendiente de pago: Laptop HP..."
//               }
//               rows="3"
//               className={styles.textarea}
//               disabled={procesando}
//               required
//             />
//           </div>

//           {/* Campo Monto */}
//           <div className={styles.formGroup}>
//             <label className={styles.label}>
//               <FiDollarSign className={styles.labelIcon} />
//               Monto
//               <small>Ingresa el monto del movimiento</small>
//             </label>
//             <input
//               type="number"
//               value={monto}
//               onChange={(e) => setMonto(e.target.value)}
//               placeholder="0.00"
//               step="0.01"
//               min="0.01"
//               className={styles.input}
//               disabled={procesando}
//               required
//             />
//           </div>

//           {/* Resumen del Movimiento */}
//           {monto && descripcion && (
//             <div className={styles.resumenSection}>
//               <div
//                 className={styles.resumenCard}
//                 style={{ borderLeftColor: tipoConfig.color }}
//               >
//                 <div className={styles.resumenHeader}>
//                   {tipoConfig.icon}
//                   <span className={styles.resumenTitle}>
//                     Resumen del Movimiento
//                   </span>
//                 </div>
//                 <div className={styles.resumenContent}>
//                   <div className={styles.resumenItem}>
//                     <span>Tipo:</span>
//                     <span
//                       className={styles.resumenValue}
//                       style={{ color: tipoConfig.color }}
//                     >
//                       {tipoConfig.label}
//                     </span>
//                   </div>
//                   <div className={styles.resumenItem}>
//                     <span>Monto:</span>
//                     <span className={styles.resumenValue}>
//                       ${parseFloat(monto).toFixed(2)}
//                     </span>
//                   </div>
//                   <div className={styles.resumenItem}>
//                     <span>Descripción:</span>
//                     <span className={styles.resumenDesc}>{descripcion}</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Acciones */}
//           <div className={styles.actions}>
//             <Button
//               type="button"
//               variant="secondary"
//               onClick={handleClose}
//               disabled={procesando}
//             >
//               Cancelar
//             </Button>
//             <Button
//               type="submit"
//               disabled={!descripcion.trim() || !monto || procesando}
//               loading={procesando}
//               style={{
//                 backgroundColor: tipoConfig.color,
//                 borderColor: tipoConfig.color,
//               }}
//             >
//               {procesando ? "Registrando..." : `Registrar ${tipoConfig.label}`}
//             </Button>
//           </div>

//           {/* Información de Conexión */}
//           {!navigator.onLine && (
//             <div className={styles.offlineWarning}>
//               <span>📱 Modo Offline</span>
//               <small>
//                 El pendiente se guardará localmente y se sincronizará cuando
//                 recuperes la conexión
//               </small>
//             </div>
//           )}
//         </form>
//       </div>
//     </Modal>
//   );
// };

// export default PendienteModal;
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPendiente } from "../../../../actions/pendientesActions";
import { updateProductStock } from "../../../../actions/productsActions";
import Modal from "../../../ui/Modal/Modal";
import Button from "../../../ui/Button/Button";
import {
  FiDollarSign,
  FiFileText,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiShoppingCart,
  FiPlus,
  FiMinus,
  FiTrash2,
  FiSearch,
} from "react-icons/fi";
import Swal from "sweetalert2"; // ✅ AÑADIR ESTA IMPORTACIÓN
import styles from "./PendienteModal.module.css";

const PendienteModal = ({ isOpen, onClose }) => {
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [tipo, setTipo] = useState("retiro");
  const [procesando, setProcesando] = useState(false);

  // Nuevos estados para pendientes de pago
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [mostrarSelectorProductos, setMostrarSelectorProductos] =
    useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");

  const dispatch = useDispatch();
  const { sesionAbierta } = useSelector((state) => state.sesionesCaja);
  const { products: productos } = useSelector((state) => state.products);

  // Filtrar productos disponibles (con stock)
  const productosDisponibles =
    productos?.filter(
      (producto) =>
        producto.stock > 0 &&
        producto.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
    ) || [];

  // Calcular total automáticamente para pendientes de pago
  useEffect(() => {
    if (tipo === "pendiente") {
      const total = productosSeleccionados.reduce(
        (sum, item) => sum + item.precio * item.cantidad,
        0
      );
      setMonto(total.toFixed(2));

      // Generar descripción automática
      const descAutomatica = productosSeleccionados
        .map((item) => `${item.nombre} x${item.cantidad}`)
        .join(", ");
      setDescripcion(descAutomatica || "Pendiente de pago");
    }
  }, [productosSeleccionados, tipo]);

  // Agregar producto al pendiente
  const agregarProducto = (producto) => {
    const existente = productosSeleccionados.find(
      (item) => item.id === producto.id
    );

    if (existente) {
      // Si ya existe, aumentar cantidad si hay stock disponible
      if (existente.cantidad < producto.stock) {
        setProductosSeleccionados((prev) =>
          prev.map((item) =>
            item.id === producto.id
              ? { ...item, cantidad: item.cantidad + 1 }
              : item
          )
        );
      }
    } else {
      // Agregar nuevo producto (máximo 1 inicialmente)
      setProductosSeleccionados((prev) => [
        ...prev,
        {
          ...producto,
          cantidad: 1,
          precio_unitario: producto.precio,
        },
      ]);
    }
    setMostrarSelectorProductos(false);
    setBusquedaProducto("");
  };

  // Actualizar cantidad de producto
  const actualizarCantidad = (productoId, nuevaCantidad) => {
    const producto = productosSeleccionados.find(
      (item) => item.id === productoId
    );
    const productoOriginal = productos.find((p) => p.id === productoId);

    if (
      productoOriginal &&
      nuevaCantidad <= productoOriginal.stock &&
      nuevaCantidad > 0
    ) {
      setProductosSeleccionados((prev) =>
        prev.map((item) =>
          item.id === productoId ? { ...item, cantidad: nuevaCantidad } : item
        )
      );
    }
  };

  // Remover producto
  const removerProducto = (productoId) => {
    setProductosSeleccionados((prev) =>
      prev.filter((item) => item.id !== productoId)
    );
  };

  // Limpiar formulario cuando cambie el tipo
  useEffect(() => {
    if (tipo !== "pendiente") {
      setProductosSeleccionados([]);
    }
  }, [tipo]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (tipo === "pendiente") {
      if (productosSeleccionados.length === 0) {
        Swal.fire({
          icon: "error",
          title: "Productos requeridos",
          text: "Debes seleccionar al menos un producto para pendiente de pago",
          confirmButtonText: "Entendido",
        });
        return;
      }
    } else {
      if (!descripcion.trim() || !monto || parseFloat(monto) <= 0) {
        Swal.fire({
          icon: "error",
          title: "Datos incompletos",
          text: "Por favor, completa todos los campos correctamente",
          confirmButtonText: "Entendido",
        });
        return;
      }
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
      const pendienteData = {
        descripcion: descripcion.trim(),
        monto: parseFloat(monto),
        tipo,
        ...(tipo === "pendiente" && {
          productos: productosSeleccionados,
          total: parseFloat(monto),
        }),
      };

      const result = await dispatch(createPendiente(pendienteData));

      if (result.success) {
        // ✅ CORREGIDO: Eliminar la dependencia del usuario para actualizar stock
        if (tipo === "pendiente") {
          productosSeleccionados.forEach((producto) => {
            dispatch(
              updateProductStock(producto.id, {
                nuevo_stock: producto.stock - producto.cantidad,
                motivo: "Venta pendiente",
                // ✅ ELIMINAR la referencia a usuario que causa el error
                usuario: "Sistema", // Usar valor fijo en lugar de user?.nombre
              })
            );
          });

          window.dispatchEvent(new CustomEvent("stock_changes_updated"));
        }

        // Limpiar formulario
        setDescripcion("");
        setMonto("");
        setTipo("retiro");
        setProductosSeleccionados([]);
        onClose();

        await Swal.fire({
          icon: "success",
          title: "¡Éxito!",
          text:
            tipo === "pendiente"
              ? `Pendiente de pago registrado por $${parseFloat(monto).toFixed(
                  2
                )}`
              : `${tipoConfig.label} registrado correctamente`,
          confirmButtonText: "Aceptar",
        });
      } else {
        throw new Error(result.error || "Error al crear pendiente");
      }
    } catch (error) {
      console.error("Error al crear pendiente:", error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudo registrar el pendiente",
        confirmButtonText: "Entendido",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleClose = () => {
    if (!procesando) {
      setDescripcion("");
      setMonto("");
      setTipo("retiro");
      setProductosSeleccionados([]);
      setBusquedaProducto("");
      setMostrarSelectorProductos(false);
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
      overlayClassName={styles.modalOverlay}
      className={styles.modalContent}
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
          {/* Para Pendientes de Pago: Selector de Productos */}
          {tipo === "pendiente" && (
            <div className={styles.productosSection}>
              <label className={styles.label}>
                <FiShoppingCart className={styles.labelIcon} />
                Productos Pendientes
                <small>Selecciona los productos con pago pendiente</small>
              </label>

              {/* Botón para agregar productos */}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMostrarSelectorProductos(true)}
                className={styles.agregarProductoBtn}
              >
                <FiPlus className={styles.btnIcon} />
                Agregar Producto
              </Button>

              {/* Lista de productos seleccionados */}
              {productosSeleccionados.length > 0 && (
                <div className={styles.listaProductos}>
                  <h4>Productos Seleccionados:</h4>
                  {productosSeleccionados.map((producto) => (
                    <div key={producto.id} className={styles.productoItem}>
                      <div className={styles.productoInfo}>
                        <span className={styles.productoNombre}>
                          {producto.nombre}
                        </span>
                        <span className={styles.productoPrecio}>
                          ${producto.precio.toFixed(2)} c/u
                        </span>
                      </div>
                      <div className={styles.productoControles}>
                        <div className={styles.cantidadControls}>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() =>
                              actualizarCantidad(
                                producto.id,
                                producto.cantidad - 1
                              )
                            }
                            disabled={producto.cantidad <= 1}
                          >
                            <FiMinus />
                          </Button>
                          <span className={styles.cantidad}>
                            {producto.cantidad}
                          </span>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() =>
                              actualizarCantidad(
                                producto.id,
                                producto.cantidad + 1
                              )
                            }
                            disabled={producto.cantidad >= producto.stock}
                          >
                            <FiPlus />
                          </Button>
                        </div>
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => removerProducto(producto.id)}
                        >
                          <FiTrash2 />
                        </Button>
                      </div>
                      <div className={styles.productoSubtotal}>
                        ${(producto.precio * producto.cantidad).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Campo Descripción (no editable para pendientes) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <FiFileText className={styles.labelIcon} />
              Descripción
              <small>
                {tipo === "pendiente"
                  ? "Descripción automática generada"
                  : "Describe el motivo del movimiento"}
              </small>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={
                tipo === "retiro"
                  ? "Ej: Retiro para gastos de transporte..."
                  : tipo === "ingreso"
                  ? "Ej: Ingreso por depósito de cliente..."
                  : "Descripción automática de productos..."
              }
              rows="3"
              className={styles.textarea}
              disabled={procesando || tipo === "pendiente"}
              required
            />
          </div>

          {/* Campo Monto (no editable para pendientes) */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <FiDollarSign className={styles.labelIcon} />
              Monto Total
              <small>
                {tipo === "pendiente"
                  ? "Calculado automáticamente"
                  : "Ingresa el monto del movimiento"}
              </small>
            </label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              className={styles.input}
              disabled={procesando || tipo === "pendiente"}
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
                  {tipo === "pendiente" &&
                    productosSeleccionados.length > 0 && (
                      <div className={styles.resumenItem}>
                        <span>Productos:</span>
                        <span className={styles.resumenDesc}>
                          {productosSeleccionados.length} productos
                        </span>
                      </div>
                    )}
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
              disabled={
                procesando ||
                (tipo === "pendiente"
                  ? productosSeleccionados.length === 0
                  : !descripcion.trim() || !monto)
              }
              loading={procesando}
              style={{
                backgroundColor: tipoConfig.color,
                borderColor: tipoConfig.color,
              }}
            >
              {procesando ? "Registrando..." : `Registrar ${tipoConfig.label}`}
            </Button>
          </div>
        </form>

        {/* Modal de Selección de Productos */}
        {mostrarSelectorProductos && (
          <Modal
            isOpen={mostrarSelectorProductos}
            onClose={() => {
              setMostrarSelectorProductos(false);
              setBusquedaProducto("");
            }}
            title="Seleccionar Productos"
            size="large"
          >
            <div className={styles.selectorProductos}>
              {/* Barra de búsqueda */}
              <div className={styles.busquedaProducto}>
                <FiSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  className={styles.busquedaInput}
                />
              </div>

              {/* Lista de productos disponibles */}
              <div className={styles.listaDisponibles}>
                {productosDisponibles.map((producto) => (
                  <div
                    key={producto.id}
                    className={styles.productoDisponible}
                    onClick={() => agregarProducto(producto)}
                  >
                    <div className={styles.productoInfoDisponible}>
                      <span className={styles.productoNombreDisponible}>
                        {producto.nombre}
                      </span>
                      <span className={styles.productoStock}>
                        Stock: {producto.stock}
                      </span>
                    </div>
                    <div className={styles.productoPrecioDisponible}>
                      ${producto.precio.toFixed(2)}
                    </div>
                    <Button size="small">
                      <FiPlus />
                    </Button>
                  </div>
                ))}
              </div>

              {productosDisponibles.length === 0 && (
                <div className={styles.sinProductos}>
                  {busquedaProducto
                    ? "No se encontraron productos con ese nombre"
                    : "No hay productos disponibles con stock"}
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  );
};

export default PendienteModal;
