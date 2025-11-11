// hooks/useSmartDataLoader.js - NUEVO ARCHIVO
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

export const useSmartDataLoader = (action, selector, options = {}) => {
  const dispatch = useDispatch();
  const data = useSelector(selector);
  const loadedRef = useRef(false);

  const { enabled = true, forceRefresh = false, dependency = [] } = options;

  useEffect(() => {
    if (!enabled) return;

    const shouldLoad =
      (!data || data.length === 0 || forceRefresh) && !loadedRef.current;

    if (shouldLoad) {
      console.log(`🔄 useSmartDataLoader: Ejecutando ${action.name}`);
      loadedRef.current = true;

      dispatch(action(forceRefresh)).finally(() => {
        if (forceRefresh) {
          loadedRef.current = false; // Permitir recargas forzadas futuras
        }
      });
    } else {
      console.log(
        `✅ useSmartDataLoader: ${action.name} ya cargado, omitiendo`
      );
    }
  }, [dispatch, action, data, enabled, forceRefresh, ...dependency]);

  return { data, loading: !data };
};
