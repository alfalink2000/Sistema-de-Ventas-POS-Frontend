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

  async generateLocalId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async validateRequiredFields(data, requiredFields) {
    const missing = requiredFields.filter((field) => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missing.join(", ")}`);
    }
    return true;
  }

  async markAsSynced(storeName, localId, serverData = {}) {
    try {
      const record = await IndexedDBService.get(storeName, localId);
      if (record) {
        await IndexedDBService.put(storeName, {
          ...record,
          ...serverData,
          sincronizado: true,
          fecha_sincronizacion: new Date().toISOString(),
          id_servidor: serverData.id || record.id_servidor,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error marcando como sincronizado:`, error);
      return false;
    }
  }
}

export default BaseOfflineController;
