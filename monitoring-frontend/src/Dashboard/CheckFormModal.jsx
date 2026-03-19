import React, { useEffect, useState } from "react";
import { X, Save, AlertCircle, CheckCircle } from "lucide-react";
import { checksAPI } from "../frontServices/api";

const CHECK_TYPES = [
  "ping",
  "tcp_port",
  "http",
  "ssl_certificate",
  "dns",
  "keyword_match",
];

const buildDefaultConfig = (type) => {
  switch (type) {
    case "tcp_port":
      return { port: 80 };
    case "http":
      return { method: "GET" };
    case "dns":
      return { recordType: "A" };
    case "ssl_certificate":
      return { port: 443 };
    default:
      return {};
  }
};

const safeJsonParse = (value) => {
  if (!value) return {};
  return JSON.parse(value);
};

export default function CheckFormModal({ device, onClose, onSuccess, editCheck = null }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [formData, setFormData] = useState({
    name: "",
    type: "ping",
    isActive: true,
    intervalSeconds: 30,
    timeoutMs: 5000,
    warningThreshold: "",
    criticalThreshold: "",
    config: "{}",
    expected: "{}",
  });

  useEffect(() => {
    if (editCheck) {
      setFormData({
        name: editCheck.name || "",
        type: editCheck.type || "ping",
        isActive: editCheck.isActive ?? true,
        intervalSeconds: editCheck.intervalSeconds ?? 30,
        timeoutMs: editCheck.timeoutMs ?? 5000,
        warningThreshold:
          editCheck.warningThreshold !== null && editCheck.warningThreshold !== undefined
            ? editCheck.warningThreshold
            : "",
        criticalThreshold:
          editCheck.criticalThreshold !== null && editCheck.criticalThreshold !== undefined
            ? editCheck.criticalThreshold
            : "",
        config: JSON.stringify(editCheck.config || {}, null, 2),
        expected: JSON.stringify(editCheck.expected || {}, null, 2),
      });
    }
  }, [editCheck]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setMessage({ type: "", text: "" });
  };

  const handleTypeChange = (e) => {
    const nextType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      type: nextType,
      config: JSON.stringify(buildDefaultConfig(nextType), null, 2),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    if (!formData.name || !formData.type) {
      setMessage({ type: "error", text: "Name and type are required" });
      setLoading(false);
      return;
    }

    let parsedConfig;
    let parsedExpected;

    try {
      parsedConfig = safeJsonParse(formData.config);
      parsedExpected = safeJsonParse(formData.expected);
    } catch (error) {
      setMessage({ type: "error", text: "Invalid JSON in config/expected" });
      setLoading(false);
      return;
    }

    const payload = {
      name: formData.name,
      type: formData.type,
      isActive: formData.isActive === "true" || formData.isActive === true,
      intervalSeconds: parseInt(formData.intervalSeconds, 10),
      timeoutMs: parseInt(formData.timeoutMs, 10),
      warningThreshold:
        formData.warningThreshold === "" ? null : parseInt(formData.warningThreshold, 10),
      criticalThreshold:
        formData.criticalThreshold === "" ? null : parseInt(formData.criticalThreshold, 10),
      config: parsedConfig,
      expected: parsedExpected,
    };

    try {
      if (editCheck) {
        await checksAPI.update(editCheck.id, payload);
      } else {
        await checksAPI.createForDevice(device.id, payload);
      }

      setMessage({
        type: "success",
        text: editCheck ? "Check updated successfully" : "Check created successfully",
      });

      setTimeout(() => {
        onClose();
        onSuccess();
      }, 600);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Error saving check",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {editCheck ? "Edit Check" : "Add Check"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {message.text && (
            <div
              className={`mx-6 mt-6 p-4 rounded-lg flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-green-500/10 border border-green-500/30 text-green-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white"
                placeholder="Ex: HTTP Homepage"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleTypeChange}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white"
              >
                {CHECK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Interval (s)
                </label>
                <input
                  type="number"
                  name="intervalSeconds"
                  value={formData.intervalSeconds}
                  onChange={handleChange}
                  min="10"
                  max="86400"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  name="timeoutMs"
                  value={formData.timeoutMs}
                  onChange={handleChange}
                  min="1000"
                  max="120000"
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Warning Threshold
                </label>
                <input
                  type="number"
                  name="warningThreshold"
                  value={formData.warningThreshold}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Critical Threshold
                </label>
                <input
                  type="number"
                  name="criticalThreshold"
                  value={formData.criticalThreshold}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Config (JSON)
              </label>
              <textarea
                name="config"
                value={formData.config}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expected (JSON)
              </label>
              <textarea
                name="expected"
                value={formData.expected}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Active
              </label>
              <select
                name="isActive"
                value={formData.isActive}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white"
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </form>
        </div>

        <div className="bg-gray-800 border-t border-gray-700 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-semibold"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
          >
            {loading ? "Saving..." : editCheck ? "Update Check" : "Create Check"}
          </button>
        </div>
      </div>
    </div>
  );
}
