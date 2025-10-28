// store/store.js
import { createStore, applyMiddleware, combineReducers, compose } from "redux";
import { thunk } from "redux-thunk";
import {
  authReducer,
  productsReducer,
  cartReducer,
  categoriesReducer,
  salesReducer,
  inventoryReducer,
  closuresReducer,
  detallesVentaReducer,
  sesionesCajaReducer,
  usersReducer,
} from "../reducers/index";

const rootReducer = combineReducers({
  auth: authReducer,
  products: productsReducer,
  cart: cartReducer,
  categories: categoriesReducer,
  sales: salesReducer,
  inventory: inventoryReducer,
  closures: closuresReducer,
  detallesVenta: detallesVentaReducer,
  sesionesCaja: sesionesCajaReducer,
  users: usersReducer,
});

const composeEnhancers =
  (typeof window !== "undefined" &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
  compose;

export const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk))
);
