import React from 'react';
import { Monitor, Server, Database, Wifi, Router, CheckCircle, XCircle, AlertTriangle, Clock,} from 'lucide-react';

export default function DeviceDetails({ device }) {
  if (!device) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6">
        <p className="text-gray-400 text-center">Select a device to see details</p>
      </div>
    );
  }

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'server':
        return <Server className="w-6 h-6 text-blue-400" />;
      case 'database':
        return <Database className="w-6 h-6 text-purple-400" />;
      case 'switch':
        return <Wifi className="w-6 h-6 text-green-400" />;
      case 'router':
        return <Router className="w-6 h-6 text-orange-400" />;
      default:
        return <Monitor className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'offline':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'warning':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <Monitor className="w-5 h-5 mr-2 text-blue-400" />
          Host Details
        </h2>
      </div>
      <div className="p-6">
        <div className="flex items-center mb-6">
          {getDeviceIcon(device.type)}
          <div className="ml-3">
            <h3 className="text-lg font-medium text-white">{device.name}</h3>
            <p className="text-sm text-gray-400">{device.ip}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
            <span className="text-sm font-medium text-gray-300">Status:</span>
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(device.status)}`}>
              {getStatusIcon(device.status)}
              <span className="ml-1 capitalize">{device.status}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
            <span className="text-sm font-medium text-gray-300">Type:</span>
            <span className="text-sm text-white capitalize flex items-center">
              {getDeviceIcon(device.type)}
              <span className="ml-2">{device.type}</span>
            </span>
          </div>
          
          {device.status === 'online' && device.responseTime && (
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
              <span className="text-sm font-medium text-gray-300">Response Time:</span>
              <span className="text-sm font-medium text-green-400">
                {Math.round(device.responseTime)}ms
              </span>
            </div>
          )}
          
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
            <span className="text-sm font-medium text-gray-300">Last Check:</span>
            <span className="text-sm text-gray-300">
              {device.lastCheck ? new Date(device.lastCheck).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}