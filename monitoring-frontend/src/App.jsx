import React, { useState, useEffect } from "react";
import Login from "./Auth/Login";
import StyleDashboard from "./Dashboard/StyleDashboard";
import UserSettings from "./Settings/UserSettings";
import { LogOut, User, Activity, Settings } from "lucide-react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  const handleLoginSuccess = (data) => {
    setIsAuthenticated(true);
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-8 h-8 text-blue-500" />
                <h1 className="text-2xl font-bold text-white">NetSentry</h1>
              </div>
              <div className="text-sm text-gray-400">
                Network Monitoring System
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Info do Usuário - Melhor Alinhado */}
              <div className="hidden md:flex items-center gap-3 bg-gray-700/50 px-4 py-2.5 rounded-lg border border-gray-600">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-full border border-blue-500/30">
                  <User className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-white leading-tight">{user?.username}</p>
                  <p className="text-xs text-gray-400 leading-tight">
                    {user?.role === 'admin' ? 'Administrator' : 'User'}
                  </p>
                </div>
              </div>

              {/* Botão Configurações */}
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2.5 rounded-lg transition-colors border border-gray-600"
                title="Configurações"
              >
                <Settings className="w-5 h-5" />
                <span className="hidden md:inline">Settings</span>
              </button>
              
              {/* Botão Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-lg transition-colors border border-red-500/30"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard */}
      <StyleDashboard />

      {/* Modal de Configurações */}
      {showSettings && (
        <UserSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}