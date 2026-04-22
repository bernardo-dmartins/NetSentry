import React, { useMemo, useState, useEffect } from "react";
import { devicesAPI, alertsAPI, settingsAPI } from "../../src/frontServices/api";
import websocketService from "../../src/frontServices/websocket";
import StatsCards from "./StatsCards";
import DevicesTable from "./DevicesTable";
import Filters from "./Filters";
import AlertsList from "./AlertsList";
import DeviceDetails from "./DeviceDetails";
import AddHostModal from "./hostConfig";
import ChecksPanel from "./ChecksPanel";

export default function StyleDashboard() {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    warning: 0,
  });
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [refreshRate, setRefreshRate] = useState(10);
  const [notificationsSettings, setNotificationsSettings] = useState({
    quietHours: false,
    quietStart: "22:00",
    quietEnd: "08:00",
  });
  const useMocks = process.env.REACT_APP_USE_MOCKS === "true";

  const loadData = async () => {
    try {
      console.log("Loading data...");
      setError(null);

      const [devicesRes, alertsRes] = await Promise.all([
        devicesAPI.getAll({
          status: statusFilter !== "all" ? statusFilter : undefined,
        }),
        alertsAPI.getRecent(),
      ]);

      if (devicesRes.data.success) {
        const newDevices = devicesRes.data.data;
        console.log(` ${newDevices.length} devices received from the server`);
        setDevices(newDevices);
        setStats(devicesRes.data.stats);
      }

      if (alertsRes.data.success) {
        setAlerts(alertsRes.data.data);
      }

      setLoading(false);
      console.log("Data loaded successfully.");
    } catch (err) {
      console.error("Error loading data:", err);
      if (useMocks) {
        setError("Error connecting to the server. Using sample data.");
        setDevices([
          {
            id: 1,
            name: "Server 01",
            ip: "192.168.1.10",
            type: "server",
            status: "online",
            responseTime: 45,
            lastCheck: new Date().toISOString(),
          },
          {
            id: 2,
            name: "Database 01",
            ip: "192.168.1.20",
            type: "database",
            status: "warning",
            responseTime: 120,
            lastCheck: new Date().toISOString(),
          },
          {
            id: 3,
            name: "Router 01",
            ip: "192.168.1.1",
            type: "router",
            status: "offline",
            responseTime: 0,
            lastCheck: new Date().toISOString(),
          },
        ]);
        setStats({ total: 3, online: 1, offline: 1, warning: 1 });
        setAlerts([
          {
            id: 1,
            device: "Database 01",
            message: "High response time",
            level: "warning",
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setError("Error connecting to the server.");
      }

      setLoading(false);
    }
  };

  const handleAddHost = () => {
    setEditingDevice(null);
    setShowAddModal(true);
  };

  const handleEditHost = (device) => {
    setEditingDevice(device);
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingDevice(null);
  };

  const handleModalSuccess = async () => {
    console.log("Host added/edited — Reloading...");
    await loadData();
  };

  const setupWebSocket = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.warn("Token not found; the WebSocket will not connect");
      return;
    }

    try {
      websocketService.connect(token);

      websocketService.onStatsUpdate((newStats) => {
        console.log("Stats updated via WebSocket:", newStats);
        if (newStats.devices) {
          setStats(newStats.devices);
        }
      });

      websocketService.onDeviceStatus((device) => {
        console.log("Device updated via WebSocket:", device);
        setDevices((prev) =>
          prev.map((d) => (d.id === device.id ? { ...d, ...device } : d)),
        );
      });

      websocketService.onNewAlert((alert) => {
        if (isQuietHours && alert?.level !== "disaster") {
          return;
        }
        console.log("New alert received via WebSocket:", alert);
        setAlerts((prev) => [alert, ...prev].slice(0, 20));
      });

      websocketService.onDevicesList((devicesList) => {
        console.log("New WebSocket alert");
        setDevices(devicesList);
      });

      console.log("WebSocket configured");
    } catch (err) {
      console.error("Error configuring WebSocket:", err);
    }
  };

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
    setupWebSocket();

    return () => {
      websocketService.disconnect();
    };
  }, [isQuietHours]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await settingsAPI.getSystem();
        if (response.data?.success) {
          const dashboardSettings = response.data.data.dashboard || {};
          const notifications = response.data.data.notifications || {};
          setRefreshRate(dashboardSettings.refreshRate || 10);
          setNotificationsSettings((prev) => ({
            ...prev,
            ...notifications,
          }));
        }
      } catch (error) {
        // ignore settings load errors
      }
    };

    const handleSettingsUpdated = (event) => {
      const data = event?.detail;
      if (data?.dashboard?.refreshRate) {
        setRefreshRate(data.dashboard.refreshRate);
      }
      if (data?.notifications) {
        setNotificationsSettings((prev) => ({
          ...prev,
          ...data.notifications,
        }));
      }
    };

    loadSettings();
    window.addEventListener("systemSettings:updated", handleSettingsUpdated);

    return () => {
      window.removeEventListener("systemSettings:updated", handleSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    const handleSearchUpdated = (event) => {
      const term = event?.detail || "";
      setFilter(term);
    };

    window.addEventListener("globalSearch:updated", handleSearchUpdated);
    return () => {
      window.removeEventListener("globalSearch:updated", handleSearchUpdated);
    };
  }, []);

  useEffect(() => {
    loadData();
    if (!refreshRate) return undefined;
    const intervalMs = Math.max(5, refreshRate) * 1000;
    const intervalId = setInterval(loadData, intervalMs);
    return () => clearInterval(intervalId);
  }, [refreshRate, statusFilter]);

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(filter.toLowerCase()) ||
      device.ip.includes(filter);
    const matchesStatus =
      statusFilter === "all" || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading monitoring data...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {error && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-400 text-sm"> {error}</p>
        </div>
      )}

      <StatsCards
        upDevices={stats.online}
        downDevices={stats.offline}
        warningDevices={stats.warning}
        total={stats.total}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-6">
          <Filters
            filter={filter}
            setFilter={setFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            totalDevices={devices.length}
            filteredCount={filteredDevices.length}
            onAddHost={handleAddHost}
          />

          <DevicesTable
            devices={filteredDevices}
            setSelectedDevice={setSelectedDevice}
            onEditDevice={handleEditHost}
            onRefresh={loadData}
          />
        </div>

        <div className="space-y-6">
          <AlertsList alerts={alerts} />
          <DeviceDetails device={selectedDevice} />
          <ChecksPanel device={selectedDevice} />
        </div>
      </div>

      {showAddModal && (
        <AddHostModal
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          editDevice={editingDevice}
        />
      )}
    </div>
  );
}
