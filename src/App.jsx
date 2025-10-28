import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import { store } from "./store/store";
import { startChecking } from "./actions/authActions";
import AppRouter from "./components/AppRouter";
import "./index.css";

// Componente que usa hooks
function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    console.log("🚀 App iniciando...");
    dispatch(startChecking());
  }, [dispatch]);

  return <AppRouter />;
}

// Componente principal
function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
