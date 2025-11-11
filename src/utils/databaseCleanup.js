// utils/databaseCleanup.js
import IndexedDBService from "../services/IndexedDBService";

export const cleanupCorruptedData = async () => {
  console.log("🧹 INICIANDO LIMPIEZA DE DATOS CORRUPTOS...");

  const storesToClean = ["sesiones_pendientes", "cierres_pendientes"];
  let cleanedCount = 0;

  for (const storeName of storesToClean) {
    try {
      console.log(`🔍 Limpiando store: ${storeName}`);

      const allRecords = await IndexedDBService.getAll(storeName);
      console.log(
        `📊 Encontrados ${allRecords.length} registros en ${storeName}`
      );

      for (const record of allRecords) {
        try {
          // ✅ VERIFICAR INTEGRIDAD DEL REGISTRO
          if (!record.id_local && !record.id) {
            console.log(`🗑️ Eliminando registro sin ID:`, record);
            await IndexedDBService.delete(
              storeName,
              record.id_local || record.id
            );
            cleanedCount++;
            continue;
          }

          // ✅ VERIFICAR ESTRUCTURA BÁSICA
          const requiredFields = ["timestamp", "sincronizado"];
          const hasRequiredFields = requiredFields.every(
            (field) => field in record
          );

          if (!hasRequiredFields) {
            console.log(
              `🗑️ Eliminando registro con estructura corrupta:`,
              record
            );
            await IndexedDBService.delete(
              storeName,
              record.id_local || record.id
            );
            cleanedCount++;
          }
        } catch (recordError) {
          console.error(`❌ Error procesando registro:`, recordError);
        }
      }
    } catch (storeError) {
      console.error(`❌ Error limpiando store ${storeName}:`, storeError);
    }
  }

  console.log(`🎉 LIMPIEZA COMPLETADA: ${cleanedCount} registros eliminados`);
  return cleanedCount;
};
