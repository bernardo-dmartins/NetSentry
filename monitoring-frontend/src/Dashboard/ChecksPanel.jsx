import React, { useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { checksAPI } from "../frontServices/api";
import CheckFormModal from "./CheckFormModal";

const statusBadge = (status) => {
  switch (status) {
    case "online":
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-400" />,
        cls: "text-green-400 bg-green-400/10 border-green-400/20",
      };
    case "offline":
      return {
        icon: <XCircle className="w-4 h-4 text-red-400" />,
        cls: "text-red-400 bg-red-400/10 border-red-400/20",
      };
    case "warning":
      return {
        icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
        cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
      };
    default:
      return {
        icon: <Clock className="w-4 h-4 text-gray-400" />,
        cls: "text-gray-400 bg-gray-400/10 border-gray-400/20",
      };
  }
};

export default function ChecksPanel({ device }) {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCheck, setEditingCheck] = useState(null);

  const loadChecks = async () => {
    if (!device) return;
    setLoading(true);
    setError(null);
    try {
      const res = await checksAPI.listByDevice(device.id);
      if (res.data.success) {
        setChecks(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error loading checks");
    } finally {
      setLoading(false);
    }
  };

  const loadCheckDetails = async (checkId) => {
    if (!checkId) return;
    try {
      const [historyRes, statsRes] = await Promise.all([
        checksAPI.history(checkId, { days: 7, limit: 50 }),
        checksAPI.stats(checkId, { days: 7 }),
      ]);

      if (historyRes.data.success) {
        setHistory(historyRes.data.data);
      }

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error loading check details");
    }
  };

  useEffect(() => {
    setSelectedCheck(null);
    setHistory([]);
    setStats(null);
    loadChecks();
  }, [device?.id]);

  const handleRun = async (check, e) => {
    e.stopPropagation();
    try {
      await checksAPI.run(check.id);
      await loadChecks();
      if (selectedCheck?.id === check.id) {
        await loadCheckDetails(check.id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error running check");
    }
  };

  const handleDelete = async (check, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete check "${check.name}"?`)) return;
    try {
      await checksAPI.delete(check.id);
      if (selectedCheck?.id === check.id) {
        setSelectedCheck(null);
        setHistory([]);
        setStats(null);
      }
      await loadChecks();
    } catch (err) {
      setError(err.response?.data?.message || "Error deleting check");
    }
  };

  const handleSelect = async (check) => {
    setSelectedCheck(check);
    await loadCheckDetails(check.id);
  };

  const handleAdd = () => {
    setEditingCheck(null);
    setShowModal(true);
  };

  const handleEdit = (check, e) => {
    e.stopPropagation();
    setEditingCheck(check);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingCheck(null);
  };

  const handleModalSuccess = async () => {
    await loadChecks();
    if (selectedCheck) {
      await loadCheckDetails(selectedCheck.id);
    }
  };

  if (!device) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-6">
        <p className="text-gray-400 text-center">Select a device to view checks</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
      <div className="px-6 py-4 border-b border-gray-700 bg-gray-800/50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-400" />
          Checks
        </h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-400">Loading checks...</div>
        ) : checks.length === 0 ? (
          <div className="text-center text-gray-400">No checks configured</div>
        ) : (
          <div className="space-y-2">
            {checks.map((check) => {
              const badge = statusBadge(check.lastStatus);
              return (
                <div
                  key={check.id}
                  className={`p-3 rounded-lg border border-gray-700 cursor-pointer ${
                    selectedCheck?.id === check.id ? "bg-gray-700/50" : "bg-gray-900/40"
                  }`}
                  onClick={() => handleSelect(check)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {check.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {check.type} • every {check.intervalSeconds}s
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${badge.cls}`}>
                        {badge.icon}
                        <span className="ml-1 capitalize">{check.lastStatus}</span>
                      </span>
                      <button
                        className="p-2 text-green-400 hover:bg-green-500/10 rounded-md"
                        onClick={(e) => handleRun(check, e)}
                        title="Run check"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-md"
                        onClick={(e) => handleEdit(check, e)}
                        title="Edit check"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-md"
                        onClick={(e) => handleDelete(check, e)}
                        title="Delete check"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedCheck && (
          <div className="border-t border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Last 7 days</h3>
            {stats ? (
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                  <p className="text-gray-400">Uptime</p>
                  <p className="text-lg text-white">
                    {stats.uptime !== null ? `${stats.uptime.toFixed(2)}%` : "N/A"}
                  </p>
                </div>
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
                  <p className="text-gray-400">Avg Response</p>
                  <p className="text-lg text-white">
                    {stats.responseTime?.average || 0} ms
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No stats available</p>
            )}

            <div className="mt-3">
              <h4 className="text-xs text-gray-400 mb-2">Recent results</h4>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-gray-500 text-sm">No results yet</p>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs bg-gray-900/50 border border-gray-700 rounded-lg p-2"
                    >
                      <span className="text-gray-300">
                        {new Date(item.checkedAt).toLocaleString()}
                      </span>
                      <span className="text-gray-400">
                        {item.responseTime !== null ? `${item.responseTime} ms` : "N/A"}
                      </span>
                      <span className="text-gray-300 capitalize">{item.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <CheckFormModal
          device={device}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          editCheck={editingCheck}
        />
      )}
    </div>
  );
}
