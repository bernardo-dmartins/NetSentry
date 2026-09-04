import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Monitor } from 'lucide-react';

export default function StatsCards({ upDevices, downDevices, warningDevices, total }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-gray-800 border border-green-500/30 rounded-lg p-6 shadow-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-3 bg-green-500/20 rounded-lg">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">Online</p>
            <p className="text-3xl font-bold text-green-400">{upDevices}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border border-red-500/30 rounded-lg p-6 shadow-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-3 bg-red-500/20 rounded-lg">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">Offline</p>
            <p className="text-3xl font-bold text-red-400">{downDevices}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border border-yellow-500/30 rounded-lg p-6 shadow-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-3 bg-yellow-500/20 rounded-lg">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">Problems</p>
            <p className="text-3xl font-bold text-yellow-400">{warningDevices}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 border border-blue-500/30 rounded-lg p-6 shadow-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-3 bg-blue-500/20 rounded-lg">
            <Monitor className="w-8 h-8 text-blue-400" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wide">Total Hosts</p>
            <p className="text-3xl font-bold text-blue-400">{total}</p>
          </div>
        </div>
      </div>
    </div>
  );
}