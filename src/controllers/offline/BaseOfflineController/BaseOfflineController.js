// src/controllers/offline/BaseOfflineController.js
import IndexedDBService from "../../../services/IndexedDBService";

class BaseOfflineController {
  constructor() {
    this.isOnline = navigator.onLine;
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.onConnectionRestored();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.onConnectionLost();
    });
  }

  onConnectionRestored() {
    console.log("🌐 Conexión restaurada - BaseOfflineController");
  }

  onConnectionLost() {
    console.log("📴 Conexión perdida - BaseOfflineController");
  }

  // ✅ GENERAR ID LOCAL MEJORADO
  async generateLocalId(prefix) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${prefix}_${timestamp}_${random}`;
  }

  async validateRequiredFields(data, requiredFields) {
    const missing = requiredFields.filter((field) => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missing.join(", ")}`);
    }
    return true;
  }

  // ✅ MARCAR COMO SINCRONIZADO - VERSIÓN MEJORADA
  // EN SessionsOfflineController.js - VERIFICAR que markAsSynced funcione correctamente
  async markAsSynced(sessionLocalId, serverData = {}) {
    try {
      console.log(`🔄 Marcando sesión como sincronizada: ${sessionLocalId}`);

      const session = await this.getSessionById(sessionLocalId);
      if (!session) {
        console.error(`❌ Sesión no encontrada: ${sessionLocalId}`);
        return false;
      }

      const updatedSession = {
        ...session,
        ...serverData,
        sincronizado: true,
        fecha_sincronizacion: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // ✅ PRESERVAR EL id_local SIEMPRE
      if (session.id_local) {
        updatedSession.id_local = session.id_local;
      }

      console.log("💾 Actualizando sesión sincronizada:", {
        id_local: updatedSession.id_local,
        id: updatedSession.id,
        sincronizado: updatedSession.sincronizado,
      });

      const result = await IndexedDBService.put(this.storeName, updatedSession);

      if (result) {
        console.log(
          `✅ Sesión marcada como sincronizada: ${sessionLocalId} -> ${serverData.id}`
        );

        // ✅ VERIFICAR QUE REALMENTE SE GUARDÓ
        const verified = await this.getSessionById(sessionLocalId);
        console.log(
          `🔍 Verificación: ${verified ? "SÍ" : "NO"} se guardó correctamente`
        );

        return true;
      } else {
        console.error(
          `❌ Error guardando sesión sincronizada: ${sessionLocalId}`
        );
        return false;
      }
    } catch (error) {
      console.error(`❌ Error en markAsSynced:`, error);
      return false;
    }
  }
  // ✅ NOTIFICAR COMPLETACIÓN DE SINCRONIZACIÓN
  notifySyncCompletion(storeName, localId, serverData) {
    const event = new CustomEvent("syncCompleted", {
      detail: {
        storeName,
        localId,
        serverId: serverData.id,
        timestamp: new Date().toISOString(),
      },
    });
    window.dispatchEvent(event);
  }

  // ✅ VERIFICAR ESTADO DE SINCRONIZACIÓN
  async getSyncStatus(storeName, localId) {
    try {
      const record = await IndexedDBService.get(storeName, localId);
      if (!record) {
        return { exists: false, synced: false };
      }

      return {
        exists: true,
        synced: record.sincronizado === true,
        syncDate: record.fecha_sincronizacion,
        attempts: record.intentos_sincronizacion || 0,
        serverId: record.id_servidor || null,
      };
    } catch (error) {
      console.error(`❌ Error obteniendo estado de sync:`, error);
      return { exists: false, synced: false, error: error.message };
    }
  }

  // ✅ REINTENTAR SINCRONIZACIÓN FALLIDA
  async retryFailedSync(storeName, localId, maxAttempts = 3) {
    try {
      const record = await IndexedDBService.get(storeName, localId);
      if (!record) {
        return { success: false, error: "Registro no encontrado" };
      }

      const attempts = record.intentos_sincronizacion || 0;
      if (attempts >= maxAttempts) {
        return {
          success: false,
          error: "Límite de reintentos alcanzado",
          attempts,
        };
      }

      // Marcar para reintento
      const updatedRecord = {
        ...record,
        sincronizado: false,
        ultimo_error: null,
        fecha_ultimo_intento: new Date().toISOString(),
      };

      await IndexedDBService.put(storeName, updatedRecord);

      return {
        success: true,
        message: "Registro marcado para reintento",
        attempts: attempts + 1,
      };
    } catch (error) {
      console.error(`❌ Error en reintento de sync:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ LIMPIAR REGISTROS SINCRONIZADOS ANTIGUOS
  async cleanupSyncedRecords(storeName, olderThanDays = 30) {
    try {
      const allRecords = await IndexedDBService.getAll(storeName);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;

      for (const record of allRecords) {
        if (record.sincronizado && record.fecha_sincronizacion) {
          const syncDate = new Date(record.fecha_sincronizacion);
          if (syncDate < cutoffDate) {
            await IndexedDBService.delete(
              storeName,
              record.id_local || record.id
            );
            deletedCount++;
          }
        }
      }

      console.log(
        `🧹 Limpiados ${deletedCount} registros sincronizados antiguos de ${storeName}`
      );
      return { success: true, deletedCount };
    } catch (error) {
      console.error(`❌ Error limpiando registros:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ OBTENER ID DE SERVIDOR DESDE ID LOCAL
  async getServerIdFromLocal(localId, storeName) {
    try {
      const mappings = await IndexedDBService.getAll("id_mappings");
      const mapping = mappings.find(
        (m) => m.localId === localId && m.storeName === storeName
      );
      return mapping?.serverId || null;
    } catch (error) {
      console.error("❌ Error obteniendo mapeo:", error);
      return null;
    }
  }

  // ✅ VALIDAR ESTRUCTURA DE DATOS PARA SINCRONIZACIÓN
  async validateDataForSync(data, requiredFields = []) {
    const errors = [];

    // Validar campos requeridos
    requiredFields.forEach((field) => {
      if (!data[field] && data[field] !== 0) {
        errors.push(`Campo requerido faltante: ${field}`);
      }
    });

    // Validar que tenga ID local
    if (!data.id_local) {
      errors.push("Datos sin ID local - no se puede sincronizar");
    }

    // Validar tipos de datos
    if (data.total && typeof data.total !== "number") {
      errors.push("Campo 'total' debe ser numérico");
    }

    if (data.fecha_venta && !this.isValidDate(data.fecha_venta)) {
      errors.push("Fecha inválida");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  // ✅ PREPARAR DATOS PARA ENVÍO AL SERVIDOR
  prepareDataForServer(localData, idMappings = {}) {
    const serverData = { ...localData };

    // Remover campos locales
    delete serverData.id_local;
    delete serverData.sincronizado;
    delete serverData.es_local;
    delete serverData.fecha_creacion;

    // Mapear IDs locales a IDs de servidor si es necesario
    Object.keys(idMappings).forEach((localKey) => {
      if (serverData[localKey] && idMappings[localKey]) {
        serverData[localKey] = idMappings[localKey];
      }
    });

    return serverData;
  }
}

export default BaseOfflineController;
