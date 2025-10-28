// reducers/authReducer.js
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

export const authReducer = (state = initialState, action) => {
  if (!action || !action.type) {
    console.warn("⚠️ Action inválida:", action);
    return state;
  }

  console.log("🔄 authReducer:", action.type, action.payload);

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
        uid: action.payload.id,
        name: action.payload.nombre,
        username: action.payload.username,
        rol: action.payload.rol,
        user: action.payload,
        isAuthenticated: true,
        error: null,
      };
      console.log("✅ authLogin - Nuevo estado:", loginState);
      return loginState;

    case types.authCheckingFinish:
      return {
        ...state,
        checking: false,
      };

    case types.authLogout:
      return {
        ...initialState,
        checking: false,
      };

    case types.authError:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    default:
      return state;
  }
};
