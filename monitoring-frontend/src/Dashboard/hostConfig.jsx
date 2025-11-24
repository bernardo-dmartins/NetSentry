import React, { useState, useEffect } from "react";
import {
  Server,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Database,
  Wifi,
  Router,
  Monitor,
} from "lucide-react";
import { devicesAPI } from "../frontServices/api";

export default function AddHostModal({
  onClose,
  onSuccess,
  editDevice = null,
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [formData, setFormData] = useState({
    name: "",
    ip: "",
    type: "server",
    checkUrl: "",
    port: "",
    description: "",
  });

  useEffect(() => {
    if (editDevice) {
      setFormData({
        name: editDevice.name || "",
        ip: editDevice.ip || "",
        type: editDevice.type || "server",
        checkUrl: editDevice.checkUrl || "",
        port: editDevice.port || "",
        description: editDevice.description || "",
      });
    }
  }, [editDevice]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    // Validations
    if (!formData.name || !formData.ip || !formData.type) {
      setMessage({
        type: "error",
        text: "Please fill all required fields",
      });
      setLoading(false);
      return;
    }

    // Validar IP
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-zA-Z0-9.-]+$/;
    if (!ipRegex.test(formData.ip)) {
      setMessage({ type: "error", text: "Invalid IP or Hostname" });
      setLoading(false);
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        port: formData.port ? parseInt(formData.port) : null,
      };

      let response;
      if (editDevice) {
        response = await devicesAPI.update(editDevice.id, dataToSend);
      } else {
        response = await devicesAPI.create(dataToSend);
      }

      if (response.data.success) {
        setMessage({
          type: "success",
          text: editDevice
            ? "Host updated successfully!"
            : "Host added successfully!",
        });

        setTimeout(() => {
          onClose();
          onSuccess(); // sempre depois do close se você estiver usando timeout
        }, 1200);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Error saving host",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "server":
        return <Server className="w-5 h-5" />;
      case "database":
        return <Database className="w-5 h-5" />;
      case "switch":
        return <Wifi className="w-5 h-5" />;
      case "router":
        return <Router className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-400" />
            {editDevice ? "Edit Host" : "Add New Host"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Message */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Nome do Host */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hostname <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                placeholder="Ex: Web-Server-01"
              />
            </div>

            {/* IP ou Hostname */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                IP or Hostname <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="ip"
                value={formData.ip}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                placeholder="Ex: 192.168.1.10 or server.example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                It can be a valid IP address or a hostname
              </p>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Device type <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { value: "server", label: "Servidor", icon: "Server" },
                  {
                    value: "database",
                    label: "DataBase",
                    icon: "Database",
                  },
                  { value: "switch", label: "Switch", icon: "Wifi" },
                  { value: "router", label: "Router", icon: "Router" },
                  { value: "pc", label: "PC", icon: "Monitor" },
                  { value: "other", label: "Other", icon: "Monitor" },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, type: type.value })
                    }
                    className={`p-4 rounded-lg border transition-all ${
                      formData.type === type.value
                        ? "border-blue-500 bg-blue-500/10 text-blue-400"
                        : "border-gray-600 bg-gray-900/50 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {getTypeIcon(type.value)}
                      <span className="text-sm font-medium">{type.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* URL de Verificação (Opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                HTTP Check URL (Optional)
              </label>
              <input
                type="text"
                name="checkUrl"
                value={formData.checkUrl}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                placeholder="Ex: http://192.168.1.10 or https://server.example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                If provided, HTTP check will be used. Otherwise, PING will be
                used.
              </p>
            </div>

            {/* Porta (Opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Port (Optional)
              </label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                min="1"
                max="65535"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition"
                placeholder="Ex: 80, 443, 8080"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition resize-none"
                placeholder="Additional details about the host..."
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                <strong>Note:</strong> After adding the host, the system will
                automatically start monitoring it every{" "}
                {process.env.REACT_APP_MONITORING_INTERVAL || 30} seconds.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
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
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {editDevice ? "Update Host" : "Add Host"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
