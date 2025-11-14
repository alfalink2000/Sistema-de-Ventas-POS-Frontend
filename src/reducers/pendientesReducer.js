// src/reducers/pendientesReducer.js
import { types } from "../types/types";

const initialState = {
  pendientes: [],
  pendientesTotals: {
    total_retiros: 0,
    total_ingresos: 0,
    total_pendientes: 0,
    cantidad_retiros: 0,
    cantidad_ingresos: 0,
    cantidad_pendientes: 0,
  },
  loading: false,
  error: null,
};

export const pendientesReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.pendienteAdd:
      const nuevoPendiente = action.payload;
      const nuevosPendientes = [nuevoPendiente, ...state.pendientes];

      // Calcular nuevos totales
      const nuevosTotales = calcularTotalesPendientes(nuevosPendientes);

      return {
        ...state,
        pendientes: nuevosPendientes,
        pendientesTotals: nuevosTotales,
      };

    case types.pendientesLoad:
      const pendientesCargados = Array.isArray(action.payload)
        ? action.payload
        : [];
      return {
        ...state,
        pendientes: pendientesCargados,
        pendientesTotals: calcularTotalesPendientes(pendientesCargados),
      };

    case types.pendienteUpdate:
      const pendienteActualizado = action.payload;
      const pendientesActualizados = state.pendientes.map((p) =>
        p.id === pendienteActualizado.id ||
        p.id_local === pendienteActualizado.id_local
          ? pendienteActualizado
          : p
      );

      return {
        ...state,
        pendientes: pendientesActualizados,
        pendientesTotals: calcularTotalesPendientes(pendientesActualizados),
      };

    case types.pendienteDelete:
      const idEliminar = action.payload;
      const pendientesFiltrados = state.pendientes.filter(
        (p) => p.id !== idEliminar && p.id_local !== idEliminar
      );

      return {
        ...state,
        pendientes: pendientesFiltrados,
        pendientesTotals: calcularTotalesPendientes(pendientesFiltrados),
      };

    default:
      return state;
  }
};

// Función auxiliar para calcular totales
const calcularTotalesPendientes = (pendientes) => {
  const totals = {
    total_retiros: 0,
    total_ingresos: 0,
    total_pendientes: 0,
    cantidad_retiros: 0,
    cantidad_ingresos: 0,
    cantidad_pendientes: 0,
  };

  pendientes.forEach((pendiente) => {
    const monto = parseFloat(pendiente.monto) || 0;

    switch (pendiente.tipo) {
      case "retiro":
        totals.total_retiros += monto;
        totals.cantidad_retiros++;
        break;
      case "ingreso":
        totals.total_ingresos += monto;
        totals.cantidad_ingresos++;
        break;
      case "pendiente":
        totals.total_pendientes += monto;
        totals.cantidad_pendientes++;
        break;
    }
  });

  return totals;
};
