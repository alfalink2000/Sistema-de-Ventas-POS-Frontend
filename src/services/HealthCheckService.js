// src/services/HealthCheckService.js
class HealthCheckService {
  static async checkOfflineReadiness() {
    const checks = {
      indexedDB: await this.checkIndexedDB(),
      serviceWorker: await this.checkServiceWorker(),
      storage: await this.checkStorage(),
      masterData: await this.checkMasterData(),
    };

    return checks;
  }

  static async checkIndexedDB() {
    try {
      await IndexedDBService.init();
      const stores = await IndexedDBService.getDBInfo();
      return {
        status: "healthy",
        stores: stores.objectStores,
        size: stores.size,
      };
    } catch (error) {
      return { status: "error", error: error.message };
    }
  }
}
