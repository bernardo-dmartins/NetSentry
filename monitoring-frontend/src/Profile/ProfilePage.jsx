import React, { useEffect, useState } from "react";
import { Mail, User, Shield, Calendar, RefreshCw } from "lucide-react";
import { authAPI } from "../frontServices/api";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await authAPI.getMe();
      if (response.data?.success) {
        setUser(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error loading profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Profile</h1>
          <p className="text-gray-400">Account details and basic information</p>
        </div>
        <button
          onClick={loadProfile}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-600 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{user?.username}</h2>
            <p className="text-gray-400">{user?.email}</p>
            <p className="text-sm text-blue-400 mt-1">
              {user?.role === "admin" ? "Administrator" : "User"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
            <User className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-gray-400 text-sm">Username</p>
              <p className="text-white font-medium">{user?.username}</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
            <Mail className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white font-medium">{user?.email}</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-gray-400 text-sm">Role</p>
              <p className="text-white font-medium">
                {user?.role === "admin" ? "Administrator" : "User"}
              </p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-gray-400 text-sm">Member Since</p>
              <p className="text-white font-medium">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("pt-BR")
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
