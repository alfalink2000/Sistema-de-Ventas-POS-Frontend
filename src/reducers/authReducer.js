// reducers/authReducer.js - VERSIÓN CORREGIDA
import { types } from "../types/types";

const initialState = {
  checking: true,
  loading: false,
  uid: null,
  name: null,
  username: null,
  rol: null,
  user: null,
  isAuthenticated: false,
  error: null,
};

// ✅ LISTA DE ACCIONES QUE DEBE MANEJAR ESTE REDUCER
const authActions = [
  types.authStartLoading,
  types.authFinishLoading,
  types.authLogin,
  types.authLogout,
  types.authCheckingFinish,
  types.authError,
  types.authClearError,
];

export const authReducer = (state = initialState, action) => {
  if (!action || !action.type) {
    return state;
  }

  // ✅ FILTRAR SOLO ACCIONES DE AUTH
  if (!authActions.includes(action.type)) {
    return state;
  }

  console.log("🔐 authReducer - Procesando:", action.type);

  switch (action.type) {
    case types.authStartLoading:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case types.authFinishLoading:
      return {
        ...state,
        loading: false,
      };

    case types.authLogin:
      const loginState = {
        ...state,
        checking: false,
        loading: false,
        uid: action.payload?.id || null,
        name: action.payload?.nombre || null,
        username: action.payload?.username || null,
        rol: action.payload?.rol || null,
        user: action.payload,
        isAuthenticated: true,
        error: null,
      };
      console.log("✅ authLogin - Usuario autenticado:", loginState.username);
      return loginState;

    case types.authCheckingFinish:
      console.log("✅ authCheckingFinish - Terminando verificación");
      return {
        ...state,
        checking: false,
      };

    case types.authLogout:
      console.log("✅ authLogout - Cerrando sesión");
      return {
        ...initialState,
        checking: false,
      };

    case types.authError:
      return {
        ...state,
        loading: false,
        checking: false,
        error: action.payload,
      };

    case types.authClearError:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};
