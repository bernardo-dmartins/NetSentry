import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function AlertsList({ alerts }) {
  const getAlertColor = (level) => {
    switch (level) {
      case 'disaster':
        return 'bg-red-500/20 border-red-500/30 text-red-300';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300';
      case 'information':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
      default:
        return 'bg-gray-500/20 border-gray-500/30 text-gray-300';
    }
  };

  const getBadgeColor = (level) => {
    switch (level) {
      case 'disaster':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-black';
      case 'information':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-red-400" />
          Recent Problems
        </h2>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {alerts && alerts.length > 0 ? (
          alerts.map((alert) => (
            <div key={alert.id} className="p-4 border-b border-gray-700 last:border-b-0">
              <div className={`p-3 rounded-lg border ${getAlertColor(alert.level)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.device}</p>
                    <p className="text-xs mt-1 opacity-90">{alert.message}</p>
                    <p className="text-xs mt-2 opacity-70">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded font-medium uppercase ${getBadgeColor(alert.level)}`}>
                    {alert.level}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No recent problems</p>
          </div>
        )}
      </div>
    </div>
  );
}