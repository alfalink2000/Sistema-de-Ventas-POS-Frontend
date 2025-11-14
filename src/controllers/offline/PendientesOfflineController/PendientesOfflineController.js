import BaseOfflineController from "../BaseOfflineController/BaseOfflineController";
import IndexedDBService from "../../../services/IndexedDBService";

class PendientesOfflineController extends BaseOfflineController {
  constructor() {
    super();
    this.storeName = "pendientes";
  }

  // ✅ CREAR PENDIENTE
  async createPendiente(pendienteData) {
    try {
      console.log("🔄 [PENDIENTES] Creando pendiente...", pendienteData);

      // Validar campos requeridos
      await this.validateRequiredFields(pendienteData, [
        "descripcion",
        "monto",
        "tipo",
      ]);

      const idLocal = await this.generateLocalId("pendiente");

      const pendienteCompleto = {
        ...pendienteData,
        id_local: idLocal,
        fecha: new Date().toISOString(),
        sincronizado: navigator.onLine,
        estado: "pendiente",
        fecha_creacion: new Date().toISOString(),
      };

      const success = await IndexedDBService.add(
        this.storeName,
        pendienteCompleto
      );

      if (success) {
        console.log("✅ Pendiente creado:", idLocal);

        // Notificar cambio
        window.dispatchEvent(new CustomEvent("pendientesChanged"));

        return {
          success: true,
          id_local: idLocal,
          pendiente: pendienteCompleto,
        };
      } else {
        throw new Error("No se pudo guardar el pendiente");
      }
    } catch (error) {
      console.error("❌ Error creando pendiente:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ✅ OBTENER PENDIENTES POR SESIÓN
  async getPendientesBySesion(sesionId) {
    try {
      const allPendientes = await IndexedDBService.getAll(this.storeName);

      const pendientesSesion = allPendientes.filter(
        (p) =>
          p.sesion_caja_id === sesionId || p.sesion_caja_id_local === sesionId
      );

      console.log(
        `📊 [PENDIENTES] ${pendientesSesion.length} pendientes para sesión ${sesionId}`
      );

      return pendientesSesion;
    } catch (error) {
      console.error("❌ Error obteniendo pendientes:", error);
      return [];
    }
  }

  // ✅ OBTENER PENDIENTES PENDIENTES DE SINCRONIZACIÓN
  async getPendingPendientes() {
    try {
      return await IndexedDBService.getByIndex(
        this.storeName,
        "sincronizado",
        false
      );
    } catch (error) {
      console.error("❌ Error obteniendo pendientes pendientes:", error);
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
      console.log(`✅ Pendiente marcado como sincronizado: ${localId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error marcando pendiente como sincronizado:`, error);
      return false;
    }
  }

  // ✅ CALCULAR TOTALES DE PENDIENTES POR SESIÓN
  async calculatePendientesTotals(sesionId) {
    try {
      const pendientes = await this.getPendientesBySesion(sesionId);

      const totales = {
        total_retiros: 0,
        total_ingresos: 0,
        total_pendientes: 0,
        cantidad_retiros: 0,
        cantidad_ingresos: 0,
        cantidad_pendientes: 0,
      };

      pendientes.forEach((pendiente) => {
        const monto = parseFloat(pendiente.monto) || 0;

        switch (pendiente.tipo) {
          case "retiro":
            totales.total_retiros += monto;
            totales.cantidad_retiros++;
            break;
          case "ingreso":
            totales.total_ingresos += monto;
            totales.cantidad_ingresos++;
            break;
          case "pendiente":
            totales.total_pendientes += monto;
            totales.cantidad_pendientes++;
            break;
        }
      });

      return totales;
    } catch (error) {
      console.error("❌ Error calculando totales de pendientes:", error);
      return {
        total_retiros: 0,
        total_ingresos: 0,
        total_pendientes: 0,
        cantidad_retiros: 0,
        cantidad_ingresos: 0,
        cantidad_pendientes: 0,
      };
    }
  }

  // ✅ SINCRONIZAR PENDIENTES PENDIENTES
  async syncPendingPendientes() {
    if (!navigator.onLine) {
      return { success: false, error: "Sin conexión a internet" };
    }

    try {
      const pendientesPendientes = await this.getPendingPendientes();

      if (pendientesPendientes.length === 0) {
        return { success: true, message: "No hay pendientes por sincronizar" };
      }

      console.log(
        `🔄 Sincronizando ${pendientesPendientes.length} pendientes...`
      );

      const resultados = {
        total: pendientesPendientes.length,
        exitosos: 0,
        fallidos: 0,
        errores: [],
      };

      for (const pendiente of pendientesPendientes) {
        try {
          // Preparar datos para servidor (remover campos locales)
          const { id_local, sincronizado, fecha_creacion, ...datosServidor } =
            pendiente;

          const response = await fetchConToken(
            "pendientes",
            datosServidor,
            "POST"
          );

          if (response && response.ok === true) {
            await this.markAsSynced(pendiente.id_local, {
              id: response.pendiente?.id,
            });
            resultados.exitosos++;
          } else {
            throw new Error(response?.error || "Error del servidor");
          }
        } catch (error) {
          resultados.fallidos++;
          resultados.errores.push({
            id_local: pendiente.id_local,
            error: error.message,
          });
        }
      }

      return {
        success: resultados.fallidos === 0,
        ...resultados,
      };
    } catch (error) {
      console.error("❌ Error sincronizando pendientes:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new PendientesOfflineController();
