import React, { useState, useEffect, lazy, Suspense } from "react";
import Layout from "./components/Layout/Layout";

const Login = lazy(() => import("./Auth/Login"));
const StyleDashboard = lazy(() => import("./Dashboard/StyleDashboard"));
const UserSettings = lazy(() => import("./Settings/UserSettings"));
const AnalyticsPage = lazy(
  () => import("./components/Analytics/AnalyticsPage"),
);

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-400">Loading...</p>
    </div>
  </div>
);

const FullScreenLoader = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-400 text-lg">Loading NetSentry...</p>
    </div>
  </div>
);

const ModalLoader = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-400">Opening settings...</p>
    </div>
  </div>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
  };

  const handleNavigate = (pageId) => {
    if (pageId === "settings") {
      setShowSettings(true);
      return;
    }
    setCurrentPage(pageId);
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <Login onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
      case "hosts":
        return (
          <Suspense fallback={<PageLoader />}>
            <StyleDashboard />
          </Suspense>
        );

      case "analytics":
        return (
          <Suspense fallback={<PageLoader />}>
            <AnalyticsPage />
          </Suspense>
        );

      case "alerts":
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-4">Alerts</h1>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-400">Alerts page coming soon...</p>
            </div>
          </div>
        );

      case "profile":
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-4">Profile</h1>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {user?.username}
                  </h2>
                  <p className="text-gray-400">
                    {user?.email || "user@netsentry.com"}
                  </p>
                  <p className="text-sm text-blue-400 mt-1">
                    {user?.role === "admin" ? "Administrator" : "User"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Username</p>
                  <p className="text-white font-medium">{user?.username}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Role</p>
                  <p className="text-white font-medium">
                    {user?.role === "admin" ? "Administrator" : "User"}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Account Status</p>
                  <p className="text-green-400 font-medium">Active</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-1">Member Since</p>
                  <p className="text-white font-medium">January 2026</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <Suspense fallback={<PageLoader />}>
            <StyleDashboard />
          </Suspense>
        );
    }
  };

  return (
    <>
      <Layout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        onOpenSettings={handleOpenSettings}
      >
        {renderPage()}
      </Layout>

      {showSettings && (
        <Suspense fallback={<ModalLoader />}>
          <UserSettings onClose={() => setShowSettings(false)} />
        </Suspense>
      )}
    </>
  );
}
