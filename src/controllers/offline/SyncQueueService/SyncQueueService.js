// controllers/offline/SyncQueueService/SyncQueueService.js
import IndexedDBService from "../../../services/IndexedDBService";

class SyncQueueService {
  constructor() {
    this.queueStoreName = "sync_queue";
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 segundos
  }

  // ➕ AGREGAR OPERACIÓN A LA COLA
  async addOperation(operation) {
    try {
      const queueItem = {
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: operation.type, // 'create', 'update', 'delete'
        entity: operation.entity, // 'product', 'sale', 'session', etc.
        data: operation.data,
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
        priority: operation.priority || "normal", // 'high', 'normal', 'low'
      };

      await IndexedDBService.add(this.queueStoreName, queueItem);
      console.log(
        `📝 Operación agregada a la cola: ${queueItem.id}`,
        queueItem
      );

      return queueItem.id;
    } catch (error) {
      console.error("❌ Error agregando operación a la cola:", error);
      throw error;
    }
  }

  // 📋 OBTENER OPERACIONES PENDIENTES
  async getPendingOperations(limit = 50) {
    try {
      const allOperations = await IndexedDBService.getAll(this.queueStoreName);
      const pending = allOperations
        .filter((op) => op.status === "pending")
        .sort((a, b) => {
          // Ordenar por prioridad y luego por timestamp
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          return (
            (priorityOrder[b.priority] || 1) -
              (priorityOrder[a.priority] || 1) ||
            new Date(a.timestamp) - new Date(b.timestamp)
          );
        })
        .slice(0, limit);

      return pending;
    } catch (error) {
      console.error("❌ Error obteniendo operaciones pendientes:", error);
      return [];
    }
  }

  // 🔄 PROCESAR COLA DE SINCRONIZACIÓN
  async processQueue() {
    if (!navigator.onLine) {
      console.log("📴 Sin conexión - No se puede procesar la cola");
      return { processed: 0, failed: 0 };
    }

    try {
      const pendingOperations = await this.getPendingOperations(20); // Procesar máximo 20 a la vez

      if (pendingOperations.length === 0) {
        return {
          processed: 0,
          failed: 0,
          message: "No hay operaciones pendientes",
        };
      }

      console.log(
        `🔄 Procesando ${pendingOperations.length} operaciones de la cola...`
      );

      let processed = 0;
      let failed = 0;
      const results = [];

      for (const operation of pendingOperations) {
        try {
          // Aquí se ejecutaría la lógica específica para cada tipo de operación
          const success = await this.executeOperation(operation);

          if (success) {
            // Marcar como completada
            await IndexedDBService.put(this.queueStoreName, {
              ...operation,
              status: "completed",
              completedAt: new Date().toISOString(),
            });
            processed++;
            results.push({ id: operation.id, status: "success" });
          } else {
            await this.handleOperationFailure(operation);
            failed++;
            results.push({ id: operation.id, status: "failed" });
          }
        } catch (error) {
          await this.handleOperationFailure(operation, error);
          failed++;
          results.push({
            id: operation.id,
            status: "error",
            error: error.message,
          });
        }
      }

      console.log(
        `✅ Cola procesada: ${processed} exitosas, ${failed} fallidas`
      );

      return {
        processed,
        failed,
        total: pendingOperations.length,
        results,
      };
    } catch (error) {
      console.error("❌ Error procesando cola de sincronización:", error);
      return { processed: 0, failed: 0, error: error.message };
    }
  }

  // ⚡ EJECUTAR OPERACIÓN ESPECÍFICA
  async executeOperation(operation) {
    try {
      // Esta función sería implementada con la lógica específica para cada tipo de operación
      // Por ahora es un placeholder
      console.log(
        `⚡ Ejecutando operación: ${operation.type} ${operation.entity}`,
        operation.data
      );

      // Simular procesamiento
      await new Promise((resolve) => setTimeout(resolve, 100));

      return true;
    } catch (error) {
      console.error(`❌ Error ejecutando operación ${operation.id}:`, error);
      return false;
    }
  }

  // ❌ MANEJAR FALLO DE OPERACIÓN
  async handleOperationFailure(operation, error = null) {
    try {
      const newRetryCount = operation.retryCount + 1;

      if (newRetryCount >= this.maxRetries) {
        // Marcar como fallida permanentemente
        await IndexedDBService.put(this.queueStoreName, {
          ...operation,
          status: "failed",
          lastError: error?.message || "Unknown error",
          failedAt: new Date().toISOString(),
        });
        console.log(
          `🛑 Operación ${operation.id} marcada como fallida después de ${this.maxRetries} intentos`
        );
      } else {
        // Reintentar más tarde
        await IndexedDBService.put(this.queueStoreName, {
          ...operation,
          retryCount: newRetryCount,
          lastError: error?.message,
          nextRetry: new Date(Date.now() + this.retryDelay).toISOString(),
        });
        console.log(
          `🔄 Operación ${operation.id} programada para reintento ${newRetryCount}`
        );
      }
    } catch (dbError) {
      console.error("❌ Error actualizando operación fallida:", dbError);
    }
  }

  // 🧹 LIMPIAR COLA
  async cleanupQueue() {
    try {
      const allOperations = await IndexedDBService.getAll(this.queueStoreName);
      const completedOrFailed = allOperations.filter(
        (op) => op.status === "completed" || op.status === "failed"
      );

      let deleted = 0;

      for (const operation of completedOrFailed) {
        // Mantener solo las operaciones de los últimos 7 días
        const operationDate = new Date(operation.timestamp);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        if (operationDate < sevenDaysAgo) {
          await IndexedDBService.delete(this.queueStoreName, operation.id);
          deleted++;
        }
      }

      console.log(
        `🧹 Cola limpiada: ${deleted} operaciones antiguas eliminadas`
      );
      return { deleted, remaining: allOperations.length - deleted };
    } catch (error) {
      console.error("❌ Error limpiando cola:", error);
      return { error: error.message };
    }
  }

  // 📊 OBTENER ESTADÍSTICAS DE LA COLA
  async getQueueStats() {
    try {
      const allOperations = await IndexedDBService.getAll(this.queueStoreName);

      const stats = {
        total: allOperations.length,
        byStatus: {
          pending: allOperations.filter((op) => op.status === "pending").length,
          completed: allOperations.filter((op) => op.status === "completed")
            .length,
          failed: allOperations.filter((op) => op.status === "failed").length,
        },
        byEntity: {},
        byPriority: {
          high: allOperations.filter((op) => op.priority === "high").length,
          normal: allOperations.filter((op) => op.priority === "normal").length,
          low: allOperations.filter((op) => op.priority === "low").length,
        },
      };

      // Agrupar por entidad
      allOperations.forEach((op) => {
        stats.byEntity[op.entity] = (stats.byEntity[op.entity] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas de la cola:", error);
      return { error: error.message };
    }
  }
}

export default SyncQueueService;
