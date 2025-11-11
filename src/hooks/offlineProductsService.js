// services/offlineProductsService.js
export class OfflineProductsService {
  static async getProductsOffline(filters = {}) {
    try {
      const productos = await IndexedDBService.getAll("productos");

      // Aplicar filtros
      let filtered = productos;

      if (filters.categoria_id) {
        filtered = filtered.filter(
          (p) => p.categoria_id === filters.categoria_id
        );
      }

      if (filters.activo !== undefined) {
        filtered = filtered.filter((p) => p.activo === filters.activo);
      }

      return filtered;
    } catch (error) {
      console.error("❌ [OFFLINE SERVICE] Error obteniendo productos:", error);
      return [];
    }
  }

  static async syncProductsOffline() {
    try {
      if (!navigator.onLine) {
        return { success: false, error: "Sin conexión" };
      }

      const productosLocales = await IndexedDBService.getAll("productos");
      const productosNoSincronizados = productosLocales.filter(
        (p) => !p.sincronizado
      );

      let sincronizados = 0;

      for (const producto of productosNoSincronizados) {
        try {
          if (producto.id_local) {
            // Crear nuevo producto en servidor
            const response = await fetchConToken("productos", producto, "POST");
            if (response.ok) {
              // Actualizar en IndexedDB con ID real
              await IndexedDBService.delete("productos", producto.id);
              await IndexedDBService.add("productos", {
                ...response.producto,
                sincronizado: true,
              });
              sincronizados++;
            }
          } else {
            // Actualizar producto existente
            const response = await fetchConToken(
              `productos/${producto.id}`,
              producto,
              "PUT"
            );
            if (response.ok) {
              await IndexedDBService.put("productos", {
                ...producto,
                sincronizado: true,
              });
              sincronizados++;
            }
          }
        } catch (error) {
          console.error(`Error sincronizando producto ${producto.id}:`, error);
        }
      }

      return {
        success: true,
        count: sincronizados,
        message: `${sincronizados} productos sincronizados`,
      };
    } catch (error) {
      console.error(
        "❌ [OFFLINE SERVICE] Error sincronizando productos:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  static async searchProductsOffline(searchTerm, categoriaId = null) {
    try {
      const productos = await IndexedDBService.getAll("productos");

      let filtered = productos.filter(
        (producto) =>
          producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          producto.codigo_barras?.includes(searchTerm) ||
          producto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (categoriaId) {
        filtered = filtered.filter((p) => p.categoria_id === categoriaId);
      }

      return filtered;
    } catch (error) {
      console.error("❌ [OFFLINE SERVICE] Error buscando productos:", error);
      return [];
    }
  }

  static async getProductByIdOffline(productId) {
    try {
      return await IndexedDBService.get("productos", productId);
    } catch (error) {
      console.error("❌ [OFFLINE SERVICE] Error obteniendo producto:", error);
      return null;
    }
  }

  static async getLowStockProductsOffline(limite = 10) {
    try {
      const productos = await IndexedDBService.getAll("productos");
      return productos
        .filter((p) => p.stock > 0 && p.stock <= p.stock_minimo)
        .slice(0, limite);
    } catch (error) {
      console.error(
        "❌ [OFFLINE SERVICE] Error obteniendo productos bajo stock:",
        error
      );
      return [];
    }
  }
}
