// src/hooks/useOfflineData.js - COMPLETAMENTE CORREGIDO
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import IndexedDBService from "../services/IndexedDBService";
import SyncService from "../services/SyncService";
import { loadProducts } from "../actions/productsActions";
import { loadCategories } from "../actions/categoriesActions";

export const useOfflineData = () => {
  // ✅ CORREGIDO: Nombres únicos para estados locales
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    loadInitialData();

    // Suscribirse a eventos de sincronización para actualizar datos
    const unsubscribe = SyncService.addSyncListener((event) => {
      if (event === "sync_complete") {
        loadInitialData();
      }
    });

    return unsubscribe;
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // ✅ CORREGIDO: Manejar caso donde cacheData puede ser undefined
      let cacheData;
      try {
        cacheData = await SyncService.loadMasterDataFromCache();
      } catch (error) {
        console.log("⚠️ No hay datos en cache:", error);
        cacheData = { productos: [], categorias: [] };
      }

      // ✅ CORREGIDO: Verificar que cacheData existe y tiene las propiedades
      if (
        cacheData &&
        cacheData.productos &&
        cacheData.categorias &&
        cacheData.productos.length > 0 &&
        cacheData.categorias.length > 0
      ) {
        // ✅ CORREGIDO: Usar los setters correctos
        setProductos(cacheData.productos);
        setCategorias(cacheData.categorias);
        setLastUpdate(new Date());

        // ✅ ACTUALIZADO: Usar las acciones que SÍ existen
        // Estas acciones harán fetch a la API y actualizarán Redux
        dispatch(loadProducts());
        dispatch(loadCategories());
      }

      // Si hay conexión, sincronizar datos maestros
      if (navigator.onLine) {
        await SyncService.syncMasterData();
        // Recargar datos después de sincronizar
        await loadFromIndexedDB();
      } else {
        // Cargar directamente desde IndexedDB
        await loadFromIndexedDB();
      }
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFromIndexedDB = async () => {
    try {
      const [productosData, categoriasData] = await Promise.all([
        IndexedDBService.getAll("productos"),
        IndexedDBService.getAll("categorias"),
      ]);

      // ✅ CORREGIDO: Usar setters consistentes
      setProductos(productosData || []);
      setCategorias(categoriasData || []);
      setLastUpdate(new Date());

      // ✅ ACTUALIZADO: Usar las acciones que SÍ existen
      // Estas cargarán desde IndexedDB al estado de Redux
      if (navigator.onLine) {
        // Si hay conexión, cargar desde API
        dispatch(loadProducts());
        dispatch(loadCategories());
      } else {
        // Si no hay conexión, podrías necesitar acciones diferentes
        // Por ahora, solo actualizamos el estado local del hook
        console.log("📱 Modo offline - usando datos locales");
      }
    } catch (error) {
      console.error("Error cargando desde IndexedDB:", error);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await loadInitialData();
  };

  return {
    productos,
    categorias,
    loading,
    lastUpdate,
    refreshData,
  };
};
