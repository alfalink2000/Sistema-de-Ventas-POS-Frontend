import IndexedDBService from "../../../services/IndexedDBService";
import { fetchConToken } from "../../../helpers/fetch";

class ClosuresSyncController {
  constructor() {
    this.storeName = "cierres_pendientes";
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      console.log(
        `🔄 Inicializando ClosuresSyncController para store: ${this.storeName}`
      );

      await IndexedDBService.init();
      const exists = await IndexedDBService.storeExists(this.storeName);

      if (!exists) {
        console.error(
          `❌ Store ${this.storeName} NO EXISTE. Se necesita recargar la aplicación.`
        );
        return false;
      }

      this.initialized = true;
      console.log(`✅ ClosuresSyncController inicializado correctamente`);
      return true;
    } catch (error) {
      console.error("❌ Error inicializando ClosuresSyncController:", error);
      return false;
    }
  }

  // ✅ REGISTRAR CIERRE PENDIENTE DE SINCRONIZACIÓN
  async registerClosure(closureData) {
    try {
      console.log(
        `📝 [CLOSURES SYNC] Intentando registrar cierre pendiente:`,
        closureData
      );

      if (!this.initialized) {
        const initResult = await this.init();
        if (!initResult) {
          throw new Error("No se pudo inicializar ClosuresSyncController");
        }
      }

      // ✅ CREAR OBJETO DE CIERRE COMPLETO
      const cierrePendiente = {
        id: `cierre_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...closureData,
        timestamp: new Date().toISOString(),
        sincronizado: false,
        intentos: 0,
        ultimo_error: null,
        fecha_creacion: new Date().toISOString(),
      };

      console.log(`💾 Preparando para guardar cierre:`, cierrePendiente);

      // ✅ VERIFICAR QUE EL STORE EXISTE ANTES DE GUARDAR
      const storeExists = await IndexedDBService.storeExists(this.storeName);
      if (!storeExists) {
        console.error(`❌ Store ${this.storeName} no existe para guardar`);
        throw new Error(`Store ${this.storeName} no disponible`);
      }

      // ✅ USAR PUT (más seguro que add)
      console.log(`📤 Guardando en store: ${this.storeName}`);
      const result = await IndexedDBService.put(
        this.storeName,
        cierrePendiente
      );

      if (result) {
        console.log(`✅ Cierre REGISTRADO EXITOSAMENTE: ${cierrePendiente.id}`);

        // ✅ VERIFICAR QUE REALMENTE SE GUARDÓ
        const verificado = await IndexedDBService.get(
          this.storeName,
          cierrePendiente.id
        );
        if (verificado) {
          console.log(
            `✅ Verificación exitosa - Cierre guardado correctamente`
          );
        }

        // ✅ DISPARAR EVENTO PARA ACTUALIZAR HEADER
        window.dispatchEvent(
          new CustomEvent("closures_changes_updated", {
            detail: {
              cierreId: cierrePendiente.id,
              timestamp: new Date().toISOString(),
            },
          })
        );

        return {
          success: true,
          id: cierrePendiente.id,
          message: "Cierre registrado para sincronización",
        };
      } else {
        throw new Error("No se pudo guardar el cierre en IndexedDB");
      }
    } catch (error) {
      console.error("❌ Error CRÍTICO registrando cierre:", error);
      return {
        success: false,
        error: error.message,
        details: `Error en registerClosure: ${error.message}`,
      };
    }
  }

  // ✅ OBTENER TODOS LOS CIERRES PENDIENTES
  async getPendingClosures() {
    try {
      if (!this.initialized) await this.init();

      const cierres = await IndexedDBService.getAll(this.storeName);
      const pendientes = cierres.filter((c) => !c.sincronizado);

      console.log(
        `📊 [CLOSURES SYNC] ${pendientes.length} cierres pendientes de ${cierres.length} totales`
      );
      return pendientes;
    } catch (error) {
      console.error("❌ Error obteniendo cierres pendientes:", error);
      return [];
    }
  }

  // ✅ SINCRONIZAR CIERRES PENDIENTES
  async syncPendingClosures() {
    try {
      if (!navigator.onLine) {
        console.log("📴 No hay conexión, no se puede sincronizar cierres");
        return { success: false, error: "Sin conexión a internet" };
      }

      if (!this.initialized) await this.init();

      console.log(
        "🔄 [CLOSURES SYNC] Iniciando sincronización de cierres pendientes..."
      );

      // Obtener cierres pendientes
      const cierresPendientes = await this.getPendingClosures();

      console.log(
        `📦 Encontrados ${cierresPendientes.length} cierres pendientes`
      );

      if (cierresPendientes.length === 0) {
        console.log("✅ No hay cierres pendientes");
        return {
          success: true,
          message: "No hay cierres pendientes",
          sincronizados: 0,
          fallidos: 0,
          total: 0,
        };
      }

      let sincronizados = 0;
      let fallidos = 0;
      const resultados = [];

      // ✅ SINCRONIZAR EN SERIE
      for (const cierre of cierresPendientes) {
        try {
          console.log(`🔄 Sincronizando cierre: ${cierre.id}`);

          // Preparar datos para el servidor (eliminar campos internos)
          const {
            id,
            sincronizado,
            intentos,
            ultimo_error,
            fecha_creacion,
            timestamp,
            ...cierreData
          } = cierre;

          console.log(`🌐 Enviando al servidor:`, cierreData);

          // ✅ ENVIAR AL SERVIDOR
          const response = await fetchConToken("cierres", cierreData, "POST");

          console.log(`📥 Respuesta del servidor:`, response);

          if (response && response.ok === true) {
            // ✅ MARCAR COMO SINCRONIZADO
            await IndexedDBService.put(this.storeName, {
              ...cierre,
              sincronizado: true,
              fecha_sincronizacion: new Date().toISOString(),
              id_servidor: response.cierre?.id, // Guardar ID del servidor si viene en la respuesta
            });

            sincronizados++;
            resultados.push({
              cierre_id: cierre.id,
              status: "success",
              message: "Cierre sincronizado",
              id_servidor: response.cierre?.id,
            });

            console.log(`✅ Cierre sincronizado exitosamente: ${cierre.id}`);
          } else {
            throw new Error(
              response?.msg || response?.error || "Error del servidor"
            );
          }
        } catch (error) {
          console.error(`❌ Error sincronizando cierre ${cierre.id}:`, error);

          fallidos++;
          resultados.push({
            cierre_id: cierre.id,
            status: "failed",
            error: error.message,
          });

          // ✅ INCREMENTAR INTENTOS
          await IndexedDBService.put(this.storeName, {
            ...cierre,
            intentos: (cierre.intentos || 0) + 1,
            ultimo_error: error.message,
            ultimo_intento: new Date().toISOString(),
          });
        }
      }

      // ✅ ACTUALIZAR HEADER
      window.dispatchEvent(new CustomEvent("closures_changes_updated"));

      const result = {
        success: fallidos === 0,
        sincronizados,
        fallidos,
        total: cierresPendientes.length,
        resultados,
      };

      console.log(`🎉 Sincronización de cierres completada:`, result);
      return result;
    } catch (error) {
      console.error("❌ Error en syncPendingClosures:", error);
      return { success: false, error: error.message };
    }
  }

  // ✅ OBTENER ESTADÍSTICAS DE PENDIENTES
  async getPendingStats() {
    try {
      if (!this.initialized) await this.init();

      const cierresPendientes = await this.getPendingClosures();

      return {
        total: cierresPendientes.length,
        con_errores: cierresPendientes.filter((c) => c.intentos > 0).length,
        ultima_actualizacion: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      return {
        total: 0,
        con_errores: 0,
      };
    }
  }

  // ✅ VERIFICAR SI HAY CIERRES PENDIENTES
  async hasPendingClosures() {
    try {
      if (!this.initialized) await this.init();
      const pendientes = await this.getPendingClosures();
      const tienePendientes = pendientes.length > 0;
      console.log(
        `📊 Tiene cierres pendientes: ${tienePendientes} (${pendientes.length} total)`
      );
      return tienePendientes;
    } catch (error) {
      console.error("❌ Error verificando pendientes:", error);
      return false;
    }
  }

  // ✅ LIMPIAR CIERRES ANTIGUOS SINCRONIZADOS
  async cleanupOldSyncedClosures() {
    try {
      if (!this.initialized) await this.init();

      const todosCierres = await IndexedDBService.getAll(this.storeName);
      const fechaLimite = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 días

      let eliminados = 0;
      for (const cierre of todosCierres) {
        const fechaCierre = new Date(cierre.timestamp);
        if (cierre.sincronizado && fechaCierre < fechaLimite) {
          await IndexedDBService.delete(this.storeName, cierre.id);
          eliminados++;
          console.log(`🧹 Limpiado cierre antiguo: ${cierre.id}`);
        }
      }

      console.log(`✅ Limpieza completada: ${eliminados} cierres eliminados`);
      return eliminados;
    } catch (error) {
      console.error("❌ Error limpiando cierres antiguos:", error);
      return 0;
    }
  }

  // ✅ FORZAR INICIALIZACIÓN
  async forceInit() {
    console.log("🚀 Forzando reinicialización de ClosuresSyncController...");
    this.initialized = false;
    const result = await this.init();
    console.log(`✅ Reinicialización: ${result ? "ÉXITO" : "FALLO"}`);
    return result;
  }
}

// ✅ EXPORTAR COMO INSTANCIA ÚNICA
export default new ClosuresSyncController();
