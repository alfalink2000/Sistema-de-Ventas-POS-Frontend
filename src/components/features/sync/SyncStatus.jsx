// src/components/features/sync/SyncStatus.jsx
import React from "react";
import { useSyncStatus } from "../../../hooks/useSyncStatus";

export const SyncStatus = () => {
  const { status, isOnline, isSyncing, pendingCount, lastSync, forceSync } =
    useSyncStatus();

  const getStatusColor = () => {
    if (!isOnline) return "bg-gray-500";
    if (isSyncing) return "bg-blue-500";
    if (pendingCount > 0) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusText = () => {
    if (!isOnline) return "Offline";
    if (isSyncing) return "Sincronizando...";
    if (pendingCount > 0) return `${pendingCount} pendientes`;
    return "Sincronizado";
  };

  return (
    <div className="flex items-center space-x-2 p-2 bg-white rounded-lg shadow-sm border">
      <div
        className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}
      />
      <span className="text-sm font-medium">{getStatusText()}</span>

      {pendingCount > 0 && isOnline && !isSyncing && (
        <button
          onClick={forceSync}
          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sincronizar
        </button>
      )}

      <div className="text-xs text-gray-500">Última sync: {lastSync}</div>
    </div>
  );
};
