// src/reducers/closuresReducer.js - VERSIÓN COMPLETA CON EL NUEVO CASE
import { types } from "../types/types";

const initialState = {
  closures: [],
  todayClosure: {
    existe: false,
    cierre: null,
    fecha: null,
    error: null,
  },
  loading: false,
  error: null,
  activeClosure: null,
  stats: {},
  syncStatus: {
    pendingClosures: 0,
    lastSync: null,
    isSyncing: false,
    syncError: null,
  },
};

export const closuresReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.closuresStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
      };
    // ✅ ELIMINAR CIERRE LOCAL
    case types.closureDeleteLocal:
      return {
        ...state,
        closures: state.closures.filter(
          (closure) =>
            closure.id !== action.payload && closure.id_local !== action.payload
        ),
      };

    // ✅ LIMPIAR TODOS LOS CIERRES LOCALES
    case types.closuresClearAllLocal:
      return {
        ...state,
        closures: [],
      };
    case types.closuresFinishLoading:
      return {
        ...state,
        loading: false,
      };

    case types.closuresLoad:
      return {
        ...state,
        closures: Array.isArray(action.payload)
          ? action.payload.map(enrichClosureData)
          : [],
        loading: false,
        error: null,
      };

    case types.closureAddNew:
      const newClosure = action.payload.cierre
        ? enrichClosureData(action.payload.cierre)
        : enrichClosureData(action.payload);

      // ✅ EVITAR DUPLICADOS
      const existingIndex = state.closures.findIndex(
        (c) => c.id === newClosure.id || c.id_local === newClosure.id_local
      );

      let updatedClosures;
      if (existingIndex >= 0) {
        updatedClosures = [...state.closures];
        updatedClosures[existingIndex] = newClosure;
      } else {
        updatedClosures = [newClosure, ...state.closures];
      }

      return {
        ...state,
        closures: updatedClosures,
        // ✅ ACTUALIZAR SYNC STATUS SI ES OFFLINE
        syncStatus:
          newClosure.sincronizado === false
            ? {
                ...state.syncStatus,
                pendingClosures: state.syncStatus.pendingClosures + 1,
              }
            : state.syncStatus,
      };

    // ✅ NUEVO CASE PARA CIERRES OFFLINE - AGREGAR ESTO
    case types.closureAddNewOffline:
      const nuevoCierreOffline = enrichClosureData(action.payload);

      // ✅ EVITAR DUPLICADOS TAMBIÉN PARA OFFLINE
      const existingOfflineIndex = state.closures.findIndex(
        (c) =>
          c.id === nuevoCierreOffline.id ||
          c.id_local === nuevoCierreOffline.id_local
      );

      let updatedClosuresOffline;
      if (existingOfflineIndex >= 0) {
        updatedClosuresOffline = [...state.closures];
        updatedClosuresOffline[existingOfflineIndex] = nuevoCierreOffline;
      } else {
        updatedClosuresOffline = [nuevoCierreOffline, ...state.closures];
      }

      return {
        ...state,
        closures: updatedClosuresOffline,
        syncStatus: {
          ...state.syncStatus,
          pendingClosures: (state.syncStatus.pendingClosures || 0) + 1,
        },
      };

    case types.closureLoadToday:
      return {
        ...state,
        todayClosure: {
          existe: action.payload.existe || false,
          cierre: action.payload.cierre
            ? enrichClosureData(action.payload.cierre)
            : null,
          fecha: action.payload.fecha || null,
          error: action.payload.error || null,
        },
      };

    case types.closureSetActive:
      return {
        ...state,
        activeClosure: action.payload
          ? enrichClosureData(action.payload)
          : null,
      };

    case types.statsLoadDashboard:
      return {
        ...state,
        stats: action.payload || {},
      };

    // ✅ NUEVOS TYPES PARA CONTROL ONLINE/OFFLINE
    case types.syncStart:
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          isSyncing: true,
          syncError: null,
        },
      };

    case types.syncFinish:
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          isSyncing: false,
          lastSync: new Date().toISOString(),
          pendingClosures: 0, // Reset después de sync exitoso
          syncError: null,
        },
        // ✅ ACTUALIZAR CIERRES DESPUÉS DE SINCRONIZAR
        closures: state.closures.map((c) => ({
          ...c,
          sincronizado: true, // Marcar como sincronizados
        })),
      };

    case types.syncError:
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          isSyncing: false,
          syncError: action.payload,
        },
      };

    case types.syncProgress:
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          ...action.payload,
        },
      };

    // ✅ PARA ACTUALIZAR ESTADO DE CONEXIÓN
    case types.connectionStatusUpdate:
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          isOnline: action.payload,
        },
      };

    default:
      return state;
  }
};

// ✅ FUNCIÓN AUXILIAR PARA ENRIQUECER DATOS (EVITA DUPLICACIÓN)
const enrichClosureData = (cierre) => {
  if (!cierre) return cierre;

  return {
    ...cierre,
    estado_diferencia:
      cierre.diferencia === 0
        ? "exacto"
        : cierre.diferencia > 0
        ? "sobrante"
        : "faltante",
    diferencia_absoluta: Math.abs(cierre.diferencia || 0),
    eficiencia:
      cierre.total_ventas > 0
        ? ((cierre.ganancia_bruta / cierre.total_ventas) * 100).toFixed(1) + "%"
        : "0%",
    // ✅ IDENTIFICADOR ÚNICO PARA MANEJO OFFLINE
    uniqueId: cierre.id || cierre.id_local,
  };
};
