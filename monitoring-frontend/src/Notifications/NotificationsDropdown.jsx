import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Trash2, Settings, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import websocketService from '../frontServices/websocket';

const NotificationsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const interval = setInterval(loadUnreadCount, 30000);
    loadUnreadCount();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
      setUnreadCount((prev) => prev + 1);
    };

    websocketService.on('new-notification', handleNewNotification);

    return () => {
      websocketService.off('new-notification');
    };
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      
      setNotifications([
        {
          id: 1,
          type: 'alert',
          severity: 'critical',
          title: 'Device Offline',
          message: 'Server-01 is offline',
          timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
          read: false,
          deviceName: 'Server-01'
        },
        {
          id: 2,
          type: 'recovery',
          severity: 'info',
          title: 'Device Recovered',
          message: 'Database-01 is back online',
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          read: false,
          deviceName: 'Database-01'
        },
        {
          id: 3,
          type: 'warning',
          severity: 'warning',
          title: 'High Response Time',
          message: 'API-Gateway response time is high (250ms)',
          timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
          read: true,
          deviceName: 'API-Gateway'
        }
      ]);
      setUnreadCount(2);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL}/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL}/notifications/mark-all-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAll = async () => {
    if (window.confirm('Clear all notifications?')) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${process.env.REACT_APP_API_URL}/notifications/clear-all`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });

        setNotifications([]);
        setUnreadCount(0);
      } catch (error) {
        console.error('Error clearing notifications:', error);
      }
    }
  };

  const getIcon = (type, severity) => {
    if (type === 'recovery' || severity === 'info') {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    if (severity === 'critical') {
      return <XCircle className="w-5 h-5 text-red-400" />;
    }
    if (severity === 'warning') {
      return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    }
    return <Info className="w-5 h-5 text-blue-400" />;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 z-50 max-h-[600px] flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              {['all', 'unread', 'read'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`
                    px-3 py-1 text-xs rounded-lg transition-colors capitalize
                    ${filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                  `}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-400">Loading...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      p-4 hover:bg-gray-750 transition-colors cursor-pointer group
                      ${!notification.read ? 'bg-gray-800/50' : ''}
                    `}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notification.type, notification.severity)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-white">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>

                        <p className="text-sm text-gray-300 mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(notification.createdAt || notification.timestamp)}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-700 flex items-center justify-between">
              <button
                onClick={clearAll}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Clear all
              </button>
              <button className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Settings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;