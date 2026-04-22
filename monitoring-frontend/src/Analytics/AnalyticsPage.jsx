import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { analyticsAPI } from '../frontServices/api';

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await analyticsAPI.overview({ range: timeRange });
        if (response.data?.success) {
          setOverview(response.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error loading analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, [timeRange]);

  const formatBucketLabel = (iso) => {
    const date = new Date(iso);
    if (timeRange === '24h') {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const uptimeSeries = (overview?.uptimeSeries || []).map((item) => ({
    ...item,
    label: formatBucketLabel(item.time),
  }));

  const responseSeries = (overview?.responseTimeSeries || []).map((item) => ({
    ...item,
    label: formatBucketLabel(item.time),
  }));

  const deviceStatusData = overview?.deviceUptime || [];
  const stats = overview?.stats || {
    averageUptime: 0,
    avgResponseTime: 0,
    totalIncidents: 0,
    totalDowntimeMinutes: 0,
  };

  const StatCard = ({ icon: Icon, label, value, change, trend, color }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-green-400' : 'text-red-400'
          }`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {change}
          </div>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-gray-400 text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.name.includes('uptime') ? '%' : 'ms'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-800 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-800 rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-800 rounded-xl"></div>
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-gray-400">Comprehensive network performance insights</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg p-1">
          {['24h', '7d', '30d'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={CheckCircle}
          label="Average Uptime"
          value={`${stats.averageUptime.toFixed(2)}%`}
          color="bg-green-500/10 text-green-400"
        />
        <StatCard
          icon={Activity}
          label="Avg Response Time"
          value={`${Math.round(stats.avgResponseTime || 0)}ms`}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Total Incidents"
          value={`${stats.totalIncidents}`}
          color="bg-yellow-500/10 text-yellow-400"
        />
        <StatCard
          icon={XCircle}
          label="Total Downtime"
          value={`${Math.round(stats.totalDowntimeMinutes || 0)}m`}
          color="bg-red-500/10 text-red-400"
        />
      </div>


      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-1">Network Uptime Trend</h2>
          <p className="text-sm text-gray-400">Overall availability percentage over time</p>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={uptimeSeries}>
            <defs>
              <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="label"
              stroke="#9ca3af" 
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#9ca3af" 
              style={{ fontSize: '12px' }}
              domain={[90, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="uptime" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fill="url(#colorUptime)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Response Time Analysis</h2>
            <p className="text-sm text-gray-400">Average, max, and min response times</p>
          </div>
          
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={responseSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="label" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2} name="Average" />
              <Line type="monotone" dataKey="max" stroke="#ef4444" strokeWidth={2} name="Max" />
              <Line type="monotone" dataKey="min" stroke="#10b981" strokeWidth={2} name="Min" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Device Status Comparison */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Device Status Comparison</h2>
            <p className="text-sm text-gray-400">Uptime vs downtime by device</p>
          </div>
          
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={deviceStatusData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" style={{ fontSize: '12px' }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="uptime" stackId="a" fill="#10b981" name="Uptime %" />
              <Bar dataKey="downtime" stackId="a" fill="#ef4444" name="Downtime %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Performance Insights</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-semibold text-white">Best Performance</h3>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              {deviceStatusData[0]
                ? `${deviceStatusData[0].name} maintains ${deviceStatusData[0].uptime.toFixed(1)}% uptime`
                : 'No device data available'}
            </p>
            <p className="text-xs text-green-400">Excellent reliability</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="font-semibold text-white">Needs Attention</h3>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              {deviceStatusData[deviceStatusData.length - 1]
                ? `${deviceStatusData[deviceStatusData.length - 1].name} has ${deviceStatusData[deviceStatusData.length - 1].uptime.toFixed(1)}% uptime`
                : 'No device data available'}
            </p>
            <p className="text-xs text-yellow-400">Consider investigating</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">Fastest Response</h3>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              Average response time: {Math.round(stats.avgResponseTime || 0)}ms
            </p>
            <p className="text-xs text-blue-400">Optimal performance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
