import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import websocketService from "../../frontServices/websocket";
import { settingsAPI } from "../../frontServices/api";

const Layout = ({
  children,
  currentPage,
  onNavigate,
  user,
  onLogout,
  onOpenSettings,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState([]);

  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const [notificationsSettings, setNotificationsSettings] = useState({
    quietHours: false,
    quietStart: "22:00",
    quietEnd: "08:00",
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Verificar se está em quiet hours
  const isQuietHours = useMemo(() => {
    if (!notificationsSettings.quietHours) return false;
    const [startH, startM] = (notificationsSettings.quietStart || "22:00")
      .split(":")
      .map(Number);
    const [endH, endM] = (notificationsSettings.quietEnd || "08:00")
      .split(":")
      .map(Number);

    if ([startH, startM, endH, endM].some((n) => Number.isNaN(n))) {
      return false;
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes <= endMinutes;
    }

    return nowMinutes >= startMinutes || nowMinutes <= endMinutes;
  }, [notificationsSettings]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      websocketService.connect(token);
    }

    const handleAlertNew = (alert) => {
      if (isQuietHours && alert?.level !== "disaster") {
        return;
      }
      setRecentAlerts((prev) => [alert, ...prev].slice(0, 10));
      setUnreadAlertsCount((prev) => prev + 1);
    };

    const handleAlertsList = (alerts) => {
      if (Array.isArray(alerts)) {
        setRecentAlerts(alerts.slice(0, 10));
      }
    };

    websocketService.onNewAlert(handleAlertNew);
    websocketService.onAlertsList(handleAlertsList);

    const handleNewNotification = (notification) => {
      // Respeitar quiet hours (exceto critical)
      if (isQuietHours && notification?.severity !== "critical") {
        return;
      }

      setUnreadNotificationsCount((prev) => prev + 1);

      // Notificação do navegador (se permitido)
      if (Notification.permission === "granted" && !isQuietHours) {
        new Notification("NetSentry Alert", {
          body: notification.message,
          icon: "/logo.png",
          badge: "/logo.png",
        });
      }
    };

    // Listener para novas notificações
    if (websocketService.socket) {
      websocketService.socket.on("new-notification", handleNewNotification);
    }

    return () => {
      websocketService.off("alert:new");
      websocketService.off("alerts:list");

      if (websocketService.socket) {
        websocketService.socket.off("new-notification");
      }
    };
  }, [isQuietHours]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await settingsAPI.getSystem();
        if (response.data?.success) {
          setNotificationsSettings(response.data.data.notifications || {});
        }
      } catch (error) {
        console.warn("Failed to load notification settings:", error);
      }
    };

    const handleSettingsUpdated = (event) => {
      const next = event?.detail?.notifications;
      if (next) {
        setNotificationsSettings(next);
      }
    };

    loadSettings();
    window.addEventListener("systemSettings:updated", handleSettingsUpdated);

    return () => {
      window.removeEventListener(
        "systemSettings:updated",
        handleSettingsUpdated,
      );
    };
  }, []);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/notifications/unread-count`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        const data = await response.json();
        if (data.success) {
          setUnreadNotificationsCount(data.count);
        }
      } catch (error) {
        console.warn("Failed to load unread notifications count:", error);
      }
    };

    loadUnreadCount();
  }, []);

  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  const handleNotificationsOpen = () => {
    setUnreadAlertsCount(0);
    websocketService.emit("alerts:request");
  };

  const handleNotificationsRead = (count) => {
    setUnreadNotificationsCount((prev) => Math.max(0, prev - count));
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        user={user}
      />

      <div
        className={`
          transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? "ml-20" : "ml-64"}
        `}
      >
        <Header
          user={user}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
          unreadAlertsCount={unreadAlertsCount}
          recentAlerts={recentAlerts}
          onNotificationsOpen={handleNotificationsOpen}
          onNavigate={onNavigate}
          unreadNotificationsCount={unreadNotificationsCount}
          onNotificationsRead={handleNotificationsRead}
        />

        <main className="min-h-[calc(100vh-64px)]">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
