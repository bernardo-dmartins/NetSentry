import React, { useState } from 'react';
import { Search, Bell, Settings, LogOut, User } from 'lucide-react';

const Header = ({ user, onLogout, onOpenSettings }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getUserInitial = () => {
    return user?.username?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search hosts, alerts, or settings..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Settings */}
        <button 
          onClick={onOpenSettings}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-700"></div>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{user?.username || 'User'}</p>
            <p className="text-xs text-gray-400">
              {user?.role === 'admin' ? 'Administrator' : 'User'}
            </p>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold hover:ring-2 hover:ring-blue-500 transition-all"
            >
              {getUserInitial()}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowUserMenu(false)}
                ></div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-20">
                  <div className="p-2">
                    <div className="px-3 py-2 border-b border-gray-700 mb-2">
                      <p className="text-sm font-medium text-white">{user?.username || 'User'}</p>
                      <p className="text-xs text-gray-400">{user?.email || 'user@netsentry.com'}</p>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setShowUserMenu(false);
                        // Navegar para profile (você pode adicionar essa função)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    
                    <button 
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSettings();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    
                    <div className="my-1 border-t border-gray-700"></div>
                    
                    <button 
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;