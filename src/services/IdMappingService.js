// src/services/IdMappingService.js
import IndexedDBService from "./IndexedDBService";

class IdMappingService {
  constructor() {
    this.storeName = "id_mappings";
  }

  // ✅ AGREGAR MAPEO DE ID
  async addMapping(localId, serverId, entityType) {
    try {
      const mapping = {
        id: `${entityType}_${localId}`,
        localId,
        serverId,
        entityType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await IndexedDBService.add(this.storeName, mapping);
      console.log(
        `✅ Mapeo agregado: ${localId} -> ${serverId} (${entityType})`
      );
      return true;
    } catch (error) {
      console.error("❌ Error agregando mapeo:", error);
      return false;
    }
  }

  // ✅ OBTENER ID DE SERVIDOR DESDE ID LOCAL
  async getServerId(localId, entityType) {
    try {
      const mappingId = `${entityType}_${localId}`;
      const mapping = await IndexedDBService.get(this.storeName, mappingId);
      return mapping?.serverId || null;
    } catch (error) {
      console.error("❌ Error obteniendo serverId:", error);
      return null;
    }
  }

  // ✅ OBTENER ID LOCAL DESDE ID DE SERVIDOR
  async getLocalId(serverId, entityType) {
    try {
      const mappings = await IndexedDBService.getAll(this.storeName);
      const mapping = mappings.find(
        (m) => m.serverId === serverId && m.entityType === entityType
      );
      return mapping?.localId || null;
    } catch (error) {
      console.error("❌ Error obteniendo localId:", error);
      return null;
    }
  }

  // ✅ ACTUALIZAR MAPEO
  async updateMapping(localId, serverId, entityType) {
    try {
      const mappingId = `${entityType}_${localId}`;
      const existing = await IndexedDBService.get(this.storeName, mappingId);

      if (existing) {
        const updated = {
          ...existing,
          serverId,
          updatedAt: new Date().toISOString(),
        };
        await IndexedDBService.put(this.storeName, updated);
      } else {
        await this.addMapping(localId, serverId, entityType);
      }

      return true;
    } catch (error) {
      console.error("❌ Error actualizando mapeo:", error);
      return false;
    }
  }

  // ✅ ELIMINAR MAPEO
  async removeMapping(localId, entityType) {
    try {
      const mappingId = `${entityType}_${localId}`;
      await IndexedDBService.delete(this.storeName, mappingId);
      return true;
    } catch (error) {
      console.error("❌ Error eliminando mapeo:", error);
      return false;
    }
  }

  // ✅ OBTENER TODOS LOS MAPEOS POR TIPO
  async getMappingsByType(entityType) {
    try {
      const mappings = await IndexedDBService.getAll(this.storeName);
      return mappings.filter((m) => m.entityType === entityType);
    } catch (error) {
      console.error("❌ Error obteniendo mapeos por tipo:", error);
      return [];
    }
  }

  // ✅ LIMPIAR MAPEOS ANTIGUOS
  async cleanupOldMappings(daysOld = 30) {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysOld);

      const mappings = await IndexedDBService.getAll(this.storeName);
      let deleted = 0;

      for (const mapping of mappings) {
        const created = new Date(mapping.createdAt);
        if (created < cutoff) {
          await IndexedDBService.delete(this.storeName, mapping.id);
          deleted++;
        }
      }

      console.log(`🧹 Limpiados ${deleted} mapeos antiguos`);
      return deleted;
    } catch (error) {
      console.error("❌ Error limpiando mapeos:", error);
      return 0;
    }
  }
}

export default new IdMappingService();
