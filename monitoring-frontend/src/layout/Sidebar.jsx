import React from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Bell, 
  Settings, 
  User, 
  ChevronLeft,
  Activity,
  BarChart3
} from 'lucide-react';

const Sidebar = ({ currentPage, onNavigate, isCollapsed, onToggleCollapse, user }) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/analytics',
      badge: 'New',
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: Bell,
      path: '/alerts',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/settings',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
    },
  ];

  const getUserInitial = () => {
    return user?.username?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div
      className={`
        fixed left-0 top-0 h-screen bg-gray-900 border-r border-gray-800 
        transition-all duration-300 ease-in-out z-50
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="relative">
            <Activity className="w-8 h-8 text-blue-500" strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-white">NetSentry</h1>
              <p className="text-xs text-gray-400">Network Monitor</p>
            </div>
          )}
        </div>
        
        {!isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Collapsed Toggle Button */}
      {isCollapsed && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-20 bg-gray-800 rounded-full p-1.5 border border-gray-700 hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400 rotate-180" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
              
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                  {item.badge && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer - User info */}
      <div className="absolute bottom-16 left-0 right-0 p-4 border-t border-gray-800">
        <div className={`flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
          onClick={() => onNavigate('profile')}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {getUserInitial()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username || 'User'}</p>
              <p className="text-xs text-gray-400 truncate">
                {user?.role === 'admin' ? 'Administrator' : 'User'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status Indicator */}
      {!isCollapsed && (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/30">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-400 font-medium">All Systems Operational</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;