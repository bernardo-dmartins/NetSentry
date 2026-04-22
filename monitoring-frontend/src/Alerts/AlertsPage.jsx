import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Filter,
  Clock,
} from "lucide-react";
import { alertsAPI } from "../frontServices/api";

const levelStyles = {
  disaster: "bg-red-500/10 text-red-400 border-red-500/30",
  warning: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
  information: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  default: "bg-gray-500/10 text-gray-300 border-gray-500/30",
};

const statusBadge = (alert) => {
  if (alert.resolved) return "resolved";
  if (alert.acknowledged) return "acknowledged";
  return "open";
};

const statusStyles = {
  open: "bg-red-500/10 text-red-300 border-red-500/30",
  acknowledged: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
  resolved: "bg-green-500/10 text-green-300 border-green-500/30",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [meta, setMeta] = useState({ total: 0, resolved: 0, unresolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cleaning, setCleaning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await alertsAPI.getAll();
      const data = response.data?.data || [];
      const stats = response.data?.meta || {
        total: data.length,
        resolved: data.filter((a) => a.resolved).length,
        unresolved: data.filter((a) => !a.resolved).length,
      };
      setAlerts(data);
      setMeta(stats);
    } catch (err) {
      setError(err.response?.data?.message || "Error loading alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  useEffect(() => {
    const handleSearchUpdated = (event) => {
      const term = event?.detail || "";
      setSearch(term);
    };

    window.addEventListener("alertsSearch:updated", handleSearchUpdated);
    return () => {
      window.removeEventListener("alertsSearch:updated", handleSearchUpdated);
    };
  }, []);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch =
        !search ||
        alert.device?.toLowerCase().includes(search.toLowerCase()) ||
        alert.message?.toLowerCase().includes(search.toLowerCase()) ||
        alert.deviceInfo?.ip?.includes(search);

      const matchesLevel =
        levelFilter === "all" || alert.level === levelFilter;

      const currentStatus = statusBadge(alert);
      const matchesStatus =
        statusFilter === "all" || currentStatus === statusFilter;

      return matchesSearch && matchesLevel && matchesStatus;
    });
  }, [alerts, search, levelFilter, statusFilter]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadAlerts();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await alertsAPI.acknowledge(alertId);
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? { ...alert, acknowledged: true, acknowledgedAt: new Date().toISOString() }
            : alert
        )
      );
    } catch (err) {
      setError(err.response?.data?.error?.message || "Error acknowledging alert");
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await alertsAPI.resolve(alertId);
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? { ...alert, resolved: true, resolvedAt: new Date().toISOString() }
            : alert
        )
      );
    } catch (err) {
      setError(err.response?.data?.error?.message || "Error resolving alert");
    }
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm("Delete this alert?")) return;
    try {
      await alertsAPI.delete(alertId);
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    } catch (err) {
      setError(err.response?.data?.error?.message || "Error deleting alert");
    }
  };

  const handleCleanup = async () => {
    const days = window.prompt("Remove resolved alerts older than how many days?", "30");
    if (!days) return;
    try {
      setCleaning(true);
      await alertsAPI.cleanup(Number(days));
      await loadAlerts();
    } catch (err) {
      setError(err.response?.data?.error?.message || "Error cleaning alerts");
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Alerts</h1>
          <p className="text-gray-400">Track incidents, acknowledgements, and resolutions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {cleaning ? "Cleaning..." : "Cleanup"}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Alerts</p>
          <p className="text-2xl font-semibold text-white">{meta.total}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Resolved</p>
          <p className="text-2xl font-semibold text-green-400">{meta.resolved}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Unresolved</p>
          <p className="text-2xl font-semibold text-red-400">{meta.unresolved}</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-gray-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filters</span>
        </div>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-white outline-none w-56"
              placeholder="Search by device, IP, or message"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="all">All levels</option>
            <option value="disaster">Disaster</option>
            <option value="warning">Warning</option>
            <option value="information">Information</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="all">All status</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">All Alerts</h2>
            <span className="text-sm text-gray-400">{filteredAlerts.length} items</span>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-400">Loading alerts...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-6 text-center text-gray-400 flex flex-col items-center gap-2">
            <AlertTriangle className="w-6 h-6 opacity-60" />
            No alerts found with current filters
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredAlerts.map((alert) => {
              const levelClass = levelStyles[alert.level] || levelStyles.default;
              const status = statusBadge(alert);
              const statusClass = statusStyles[status];
              return (
                <div key={alert.id} className="p-5 hover:bg-gray-800/40 transition">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-1 text-xs border rounded-full ${levelClass}`}>
                          {alert.level}
                        </span>
                        <span className={`px-2 py-1 text-xs border rounded-full ${statusClass}`}>
                          {status}
                        </span>
                        {alert.deviceInfo?.ip && (
                          <span className="text-xs text-gray-400">
                            {alert.deviceInfo.ip}
                          </span>
                        )}
                      </div>
                      <div className="text-white font-medium">{alert.device}</div>
                      <div className="text-sm text-gray-300">{alert.message}</div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(alert.timestamp).toLocaleString("pt-BR")}
                        </span>
                        {alert.acknowledged && alert.acknowledgedAt && (
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Ack {new Date(alert.acknowledgedAt).toLocaleString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="flex items-center gap-2 px-3 py-2 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-200 hover:border-gray-500"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Acknowledge
                        </button>
                      )}
                      {!alert.resolved && (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="flex items-center gap-2 px-3 py-2 text-xs bg-green-600/20 border border-green-600/40 rounded-lg text-green-300 hover:border-green-400"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(alert.id)}
                        className="flex items-center gap-2 px-3 py-2 text-xs bg-red-600/10 border border-red-500/30 rounded-lg text-red-300 hover:border-red-400"
                      >
                        <XCircle className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
