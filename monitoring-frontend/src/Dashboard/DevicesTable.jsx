import React, { useState } from 'react';
import { Server, Database, Wifi, Router, Monitor, CheckCircle, XCircle, AlertTriangle, Clock, Eye, Edit, Trash2, RefreshCw, AlertCircle as AlertIcon } from 'lucide-react';
import { devicesAPI } from '../frontServices/api';

export default function DevicesTable({ devices, setSelectedDevice, onEditDevice, onRefresh }) {
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'server':
        return <Server className="w-5 h-5 text-blue-400" />;
      case 'database':
        return <Database className="w-5 h-5 text-purple-400" />;
      case 'switch':
        return <Wifi className="w-5 h-5 text-green-400" />;
      case 'router':
        return <Router className="w-5 h-5 text-orange-400" />;
      default:
        return <Monitor className="w-5 h-5 text-gray-400" />;
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

  const getResponseColor = (time) => {
    if (time > 100) return 'text-red-400';
    if (time > 50) return 'text-yellow-400';
    return 'text-green-400';
  };

  const handleDeleteClick = (device, e) => {
    e.stopPropagation();
    setConfirmDelete({ id: device.id, name: device.name });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    const deviceId = confirmDelete.id;
    setDeletingId(deviceId);

    try {
      console.log('Deleting device ID:', deviceId);
      
      // Make delete request
      await devicesAPI.delete(deviceId);
      
      console.log('Device successfully deleted on backend');
      
      if (setSelectedDevice) {
        setSelectedDevice(null);
      }
      
      setConfirmDelete(null);
      setDeletingId(null);
      
      console.log('🔄 Refreshing device list...');
      if (onRefresh) {
        await onRefresh();
      }
      
      console.log('Device list refreshed!');
      
    } catch (error) {
      console.error('Error deleting:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Error deleting device. Please try again.';
      
      alert(`Delete error: ${errorMessage}`);
      
      setDeletingId(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  const handleCheckNow = async (device, e) => {
    e.stopPropagation();
    
    try {
      await devicesAPI.checkDevice(device.id);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error checking device:', error);
    }
  };

  return (
    <>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Monitor className="w-5 h-5 mr-2 text-red-400" />
            Host Monitoring
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Host</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Response</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Check</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <Monitor className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No hosts registered</p>
                    <p className="text-gray-500 text-sm mt-1">Click "Add Host" to get started</p>
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr 
                    key={device.id}
                    className="hover:bg-gray-700/50 cursor-pointer transition-colors duration-200"
                    onClick={() => setSelectedDevice(device)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getDeviceIcon(device.type)}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-white">{device.name}</div>
                          <div className="text-sm text-gray-400">{device.ip}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(device.status)}`}>
                        {getStatusIcon(device.status)}
                        <span className="ml-1 capitalize">{device.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${getResponseColor(device.responseTime || 0)}`}>
                        {device.status === 'online' && device.responseTime ? `${Math.round(device.responseTime)}ms` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {device.lastCheck ? new Date(device.lastCheck).toLocaleString('en-US') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDevice(device);
                          }}
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button 
                          className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-md transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditDevice(device);
                          }}
                          title="Edit host"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button 
                          className="p-2 text-green-400 hover:bg-green-500/10 rounded-md transition-colors"
                          onClick={(e) => handleCheckNow(device, e)}
                          title="Check now"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        
                        <button 
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={(e) => handleDeleteClick(device, e)}
                          disabled={deletingId === device.id}
                          title="Delete host"
                        >
                          {deletingId === device.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full border border-gray-700 animate-fade-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertIcon className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-gray-300 mb-2">
                Are you sure you want to delete the host:
              </p>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 mb-4">
                <p className="text-white font-semibold">{confirmDelete.name}</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-yellow-400 text-sm">
                  This action cannot be undone. All data and history for this host will be permanently removed.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={deletingId !== null}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingId !== null}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingId !== null ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Host
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
