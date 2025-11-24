import { CheckCircle, XCircle, AlertTriangle, Clock, Server, Database, Wifi, Router, Monitor } from 'lucide-react';

export const getStatusIcon = (status) => {
  switch (status) {
    case 'up':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'down':
      return <XCircle className="w-4 h-4 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

export const getDeviceIcon = (type) => {
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

export const getStatusColor = (status) => {
  switch (status) {
    case 'up':
      return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'down':
      return 'text-red-400 bg-red-400/10 border-red-400/20';
    case 'warning':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
};

export const getAlertColor = (level) => {
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
