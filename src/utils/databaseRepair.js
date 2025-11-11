// utils/databaseRepair.js - AGREGAR esta función
export const repairSyncIndexes = async () => {
  console.log("🔧 REPARANDO ÍNDICES DE SINCRONIZACIÓN...");

  const storesToRepair = ["sesiones_pendientes", "cierres_pendientes"];
  let repairedCount = 0;

  for (const storeName of storesToRepair) {
    try {
      console.log(`🔄 Reparando store: ${storeName}`);

      const allRecords = await IndexedDBService.getAll(storeName);
      console.log(`📊 ${allRecords.length} registros en ${storeName}`);

      for (const record of allRecords) {
        // ✅ NORMALIZAR CAMPO sincronizado
        if (record.sincronizado === undefined) {
          record.sincronizado = false;
          repairedCount++;
        }

        // ✅ CONVERTIR BOOLEANOS A NÚMEROS PARA COMPATIBILIDAD
        if (typeof record.sincronizado === "boolean") {
          record.sincronizado = record.sincronizado ? 1 : 0;
          repairedCount++;
        }

        // ✅ GUARDAR CAMBIOS
        await IndexedDBService.put(storeName, record);
      }

      console.log(
        `✅ ${storeName} reparado. ${repairedCount} registros normalizados`
      );
    } catch (error) {
      console.error(`❌ Error reparando ${storeName}:`, error);
    }
  }

  console.log(`🎉 REPARACIÓN COMPLETADA: ${repairedCount} registros reparados`);
  return repairedCount;
};
