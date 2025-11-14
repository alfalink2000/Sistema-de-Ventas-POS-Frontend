import { createStore, applyMiddleware, combineReducers, compose } from "redux";
import { thunk } from "redux-thunk";
import {
  authReducer,
  productsReducer,
  cartReducer,
  categoriesReducer,
  salesReducer,
  closuresReducer,
  detallesVentaReducer,
  sesionesCajaReducer,
  usersReducer,
  pendientesReducer,
} from "../reducers/index";

const rootReducer = combineReducers({
  auth: authReducer,
  products: productsReducer,
  cart: cartReducer,
  categories: categoriesReducer,
  sales: salesReducer,
  closures: closuresReducer,
  detallesVenta: detallesVentaReducer,
  sesionesCaja: sesionesCajaReducer,
  users: usersReducer,
  pendientes: pendientesReducer,
});

const composeEnhancers =
  (typeof window !== "undefined" &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
  compose;

export const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk))
);
