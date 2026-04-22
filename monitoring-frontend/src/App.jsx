
import React, { useState, useEffect, lazy, Suspense } from "react";
import Layout from "./layout/Layout";

// ===== LAZY LOADING - Componentes carregados sob demanda =====
const Login = lazy(() => import("./Auth/Login"));
const StyleDashboard = lazy(() => import("./Dashboard/StyleDashboard"));
const UserSettings = lazy(() => import("./Settings/UserSettings"));
const AnalyticsPage = lazy(() => import("./Analytics/AnalyticsPage"));
const SystemSettings = lazy(() => import("./Settings/SystemSettings"));
const AlertsPage = lazy(() => import("./Alerts/AlertsPage"));
const ProfilePage = lazy(() => import("./Profile/ProfilePage"));

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
  const [showAccountSettings, setShowAccountSettings] = useState(false);
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
    setCurrentPage(pageId);
  };
    
  const handleOpenAccountSettings = () => {
    setShowAccountSettings(true);
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

      case 'settings':
        return (
          <Suspense fallback={<PageLoader />}> 
           <SystemSettings/>
          </Suspense>
        );  

      case "alerts":
        return (
          <Suspense fallback={<PageLoader />}>
            <AlertsPage />
          </Suspense>
        );

      case "profile":
        return (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
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
        onOpenSettings={handleOpenAccountSettings}
      >
        {renderPage()}
      </Layout>

      {showAccountSettings && (
        <Suspense fallback={<ModalLoader />}>
          <UserSettings onClose={() => setShowAccountSettings(false)} />
        </Suspense>
      )}
    </>
  );
}
