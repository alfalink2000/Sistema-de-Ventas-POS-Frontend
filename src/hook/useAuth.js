// hooks/useAuth.js
import { useSelector } from "react-redux";

export const useAuth = () => {
  const authState = useSelector((state) => state.auth);

  return {
    checking: authState.checking,
    loading: authState.loading,
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    error: authState.error,
  };
};
