// src/controllers/offline/ProductsOfflineController/ProductsOfflineController.js
import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class ProductsOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "productos_pendientes";
    this.cacheStore = "productos";
  }

  // ✅ CREAR PRODUCTO PENDIENTE
  async createProductPending(productData) {
    try {
      console.log("🔄 [PRODUCTS OFFLINE] Creando producto pendiente...");

      const idLocal = await this.generateLocalId("producto");

      const pendingProduct = {
        id_local: idLocal,
        operacion: "crear",
        datos: {
          ...productData,
          id_local: idLocal,
          sincronizado: false,
          fecha_creacion: new Date().toISOString(),
        },
        sincronizado: false,
        timestamp: new Date().toISOString(),
        intentos: 0,
        ultimo_error: null,
      };

      await IndexedDBService.add(this.storeName, pendingProduct);

      // También guardar en cache para uso inmediato
      await IndexedDBService.add(this.cacheStore, {
        ...productData,
        id: idLocal,
        id_local: idLocal,
        sincronizado: false,
      });

      console.log("✅ Producto pendiente creado:", idLocal);
      return { success: true, id_local: idLocal };
    } catch (error) {
      console.error("❌ Error creando producto pendiente:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ ACTUALIZAR PRODUCTO PENDIENTE
  async updateProductPending(productId, productData) {
    try {
      console.log(
        `🔄 [PRODUCTS OFFLINE] Actualizando producto pendiente: ${productId}`
      );

      const idLocal = await this.generateLocalId("producto_update");

      const pendingUpdate = {
        id_local: idLocal,
        operacion: "actualizar",
        producto_id: productId,
        datos: productData,
        sincronizado: false,
        timestamp: new Date().toISOString(),
        intentos: 0,
        ultimo_error: null,
      };

      await IndexedDBService.add(this.storeName, pendingUpdate);

      // Actualizar cache local inmediatamente
      const productoExistente = await IndexedDBService.get(
        this.cacheStore,
        productId
      );
      if (productoExistente) {
        await IndexedDBService.put(this.cacheStore, {
          ...productoExistente,
          ...productData,
          sincronizado: false,
          fecha_actualizacion: new Date().toISOString(),
        });
      }

      console.log("✅ Actualización pendiente creada:", idLocal);
      return { success: true, id_local: idLocal };
    } catch (error) {
      console.error("❌ Error creando actualización pendiente:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ ELIMINAR PRODUCTO PENDIENTE
  async deleteProductPending(productId) {
    try {
      console.log(
        `🔄 [PRODUCTS OFFLINE] Eliminando producto pendiente: ${productId}`
      );

      const idLocal = await this.generateLocalId("producto_delete");

      const pendingDelete = {
        id_local: idLocal,
        operacion: "eliminar",
        producto_id: productId,
        sincronizado: false,
        timestamp: new Date().toISOString(),
        intentos: 0,
        ultimo_error: null,
      };

      await IndexedDBService.add(this.storeName, pendingDelete);

      // Marcar como eliminado en cache local
      const productoExistente = await IndexedDBService.get(
        this.cacheStore,
        productId
      );
      if (productoExistente) {
        await IndexedDBService.put(this.cacheStore, {
          ...productoExistente,
          activo: false,
          eliminado: true,
          sincronizado: false,
          fecha_eliminacion: new Date().toISOString(),
        });
      }

      console.log("✅ Eliminación pendiente creada:", idLocal);
      return { success: true, id_local: idLocal };
    } catch (error) {
      console.error("❌ Error creando eliminación pendiente:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ OBTENER PRODUCTOS PENDIENTES
  async getPendingProducts() {
    try {
      const pendientes = await IndexedDBService.getPendingRecords(
        this.storeName
      );
      console.log(
        `📦 [PRODUCTS OFFLINE] ${pendientes.length} operaciones pendientes`
      );
      return pendientes;
    } catch (error) {
      console.error("❌ Error obteniendo productos pendientes:", error);
      return [];
    }
  }

  // ✅ MARCAR COMO SINCRONIZADO
  async markAsSynced(localId, serverData = {}) {
    try {
      const pendiente = await IndexedDBService.get(this.storeName, localId);
      if (!pendiente) {
        console.warn(`⚠️ Pendiente no encontrado: ${localId}`);
        return false;
      }

      const actualizado = {
        ...pendiente,
        ...serverData,
        sincronizado: true,
        fecha_sincronizacion: new Date().toISOString(),
      };

      await IndexedDBService.put(this.storeName, actualizado);

      // Si es una creación, actualizar el ID en cache
      if (pendiente.operacion === "crear" && serverData.id) {
        const productoCache = await IndexedDBService.get(
          this.cacheStore,
          pendiente.datos.id_local
        );
        if (productoCache) {
          await IndexedDBService.put(this.cacheStore, {
            ...productoCache,
            id: serverData.id,
            sincronizado: true,
          });
        }
      }

      console.log(`✅ Producto pendiente sincronizado: ${localId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error marcando como sincronizado:`, error);
      return false;
    }
  }

  // ✅ SINCRONIZAR PRODUCTOS PENDIENTES
  async syncPendingProducts() {
    if (!this.isOnline) {
      return { success: false, error: "Sin conexión a internet" };
    }

    try {
      const pendientes = await this.getPendingProducts();
      const resultados = {
        total: pendientes.length,
        exitosas: 0,
        fallidas: 0,
        detalles: [],
      };

      console.log(
        `🔄 [PRODUCTS OFFLINE] Sincronizando ${pendientes.length} operaciones...`
      );

      for (const pendiente of pendientes) {
        try {
          let resultadoSync;

          switch (pendiente.operacion) {
            case "crear":
              resultadoSync = await this.syncCreateOperation(pendiente);
              break;
            case "actualizar":
              resultadoSync = await this.syncUpdateOperation(pendiente);
              break;
            case "eliminar":
              resultadoSync = await this.syncDeleteOperation(pendiente);
              break;
            default:
              throw new Error(`Operación desconocida: ${pendiente.operacion}`);
          }

          if (resultadoSync.success) {
            await this.markAsSynced(
              pendiente.id_local,
              resultadoSync.serverData
            );
            resultados.exitosas++;
            resultados.detalles.push({
              id_local: pendiente.id_local,
              operacion: pendiente.operacion,
              status: "success",
              message: resultadoSync.message,
            });
          } else {
            resultados.fallidas++;
            resultados.detalles.push({
              id_local: pendiente.id_local,
              operacion: pendiente.operacion,
              status: "failed",
              message: resultadoSync.error,
            });
          }
        } catch (error) {
          resultados.fallidas++;
          resultados.detalles.push({
            id_local: pendiente.id_local,
            operacion: pendiente.operacion,
            status: "error",
            message: error.message,
          });
        }
      }

      return resultados;
    } catch (error) {
      console.error("❌ Error en syncPendingProducts:", error);
      return {
        total: 0,
        exitosas: 0,
        fallidas: 0,
        detalles: [],
        error: error.message,
      };
    }
  }

  // ✅ SINCRONIZAR OPERACIÓN DE CREACIÓN
  async syncCreateOperation(pendiente) {
    try {
      console.log(`🔄 Sincronizando creación: ${pendiente.id_local}`);

      const response = await fetch(`${process.env.VITE_API_URL}/productos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(pendiente.datos),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          serverData: { id: data.producto?.id || data.product?.id },
          message: "Producto creado en servidor",
        };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error del servidor");
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ✅ SINCRONIZAR OPERACIÓN DE ACTUALIZACIÓN
  async syncUpdateOperation(pendiente) {
    try {
      console.log(`🔄 Sincronizando actualización: ${pendiente.id_local}`);

      // Verificar si el producto existe en el servidor
      const productoServer = await this.verifyProductExists(
        pendiente.producto_id
      );

      if (!productoServer) {
        return {
          success: false,
          error: `Producto ${pendiente.producto_id} no existe en servidor`,
        };
      }

      const response = await fetch(
        `${process.env.VITE_API_URL}/productos/${pendiente.producto_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-token": localStorage.getItem("token"),
          },
          body: JSON.stringify(pendiente.datos),
        }
      );

      if (response.ok) {
        return {
          success: true,
          message: "Producto actualizado en servidor",
        };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error del servidor");
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ✅ SINCRONIZAR OPERACIÓN DE ELIMINACIÓN
  async syncDeleteOperation(pendiente) {
    try {
      console.log(`🔄 Sincronizando eliminación: ${pendiente.id_local}`);

      // Verificar si el producto existe en el servidor
      const productoServer = await this.verifyProductExists(
        pendiente.producto_id
      );

      if (!productoServer) {
        // Si no existe, considerar éxito (ya está eliminado)
        return {
          success: true,
          message: "Producto ya eliminado en servidor",
        };
      }

      const response = await fetch(
        `${process.env.VITE_API_URL}/productos/${pendiente.producto_id}`,
        {
          method: "DELETE",
          headers: {
            "x-token": localStorage.getItem("token"),
          },
        }
      );

      if (response.ok) {
        return {
          success: true,
          message: "Producto eliminado en servidor",
        };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error del servidor");
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ✅ VERIFICAR SI PRODUCTO EXISTE EN SERVIDOR
  async verifyProductExists(productoId) {
    try {
      const response = await fetch(
        `${process.env.VITE_API_URL}/productos/${productoId}`,
        {
          headers: {
            "x-token": localStorage.getItem("token"),
          },
        }
      );
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // ✅ OBTENER ESTADÍSTICAS DE PENDIENTES
  async getPendingStats() {
    try {
      const pendientes = await this.getPendingProducts();

      const stats = {
        total: pendientes.length,
        crear: pendientes.filter((p) => p.operacion === "crear").length,
        actualizar: pendientes.filter((p) => p.operacion === "actualizar")
          .length,
        eliminar: pendientes.filter((p) => p.operacion === "eliminar").length,
      };

      return stats;
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      return { total: 0, crear: 0, actualizar: 0, eliminar: 0 };
    }
  }
}

export default new ProductsOfflineController();
