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
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);

  // Dados simulados para os gráficos
  const uptimeData24h = [
    { time: '00:00', uptime: 98, devices: 15 },
    { time: '04:00', uptime: 97, devices: 15 },
    { time: '08:00', uptime: 99, devices: 16 },
    { time: '12:00', uptime: 96, devices: 15 },
    { time: '16:00', uptime: 98, devices: 16 },
    { time: '20:00', uptime: 99, devices: 16 },
    { time: 'Now', uptime: 100, devices: 16 },
  ];

  const uptimeData7d = [
    { day: 'Mon', uptime: 98.5, incidents: 2 },
    { day: 'Tue', uptime: 99.2, incidents: 1 },
    { day: 'Wed', uptime: 97.8, incidents: 3 },
    { day: 'Thu', uptime: 99.8, incidents: 0 },
    { day: 'Fri', uptime: 98.9, incidents: 1 },
    { day: 'Sat', uptime: 99.5, incidents: 1 },
    { day: 'Sun', uptime: 100, incidents: 0 },
  ];

  const responseTimeData = [
    { time: '00:00', avg: 45, max: 120, min: 12 },
    { time: '04:00', avg: 38, max: 95, min: 15 },
    { time: '08:00', avg: 52, max: 145, min: 18 },
    { time: '12:00', avg: 48, max: 110, min: 20 },
    { time: '16:00', avg: 42, max: 98, min: 16 },
    { time: '20:00', avg: 40, max: 88, min: 14 },
    { time: 'Now', avg: 35, max: 75, min: 12 },
  ];

  const deviceStatusData = [
    { name: 'Database-01', uptime: 99.8, downtime: 0.2 },
    { name: 'Server-01', uptime: 98.5, downtime: 1.5 },
    { name: 'Router-01', uptime: 99.9, downtime: 0.1 },
    { name: 'Local-PC', uptime: 97.2, downtime: 2.8 },
    { name: 'API-Gateway', uptime: 99.5, downtime: 0.5 },
  ];

  useEffect(() => {
    // Simular carregamento
    setTimeout(() => setLoading(false), 800);
  }, [timeRange]);

  const currentData = timeRange === '24h' ? uptimeData24h : uptimeData7d;

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
          value="99.2%"
          change="+0.8%"
          trend="up"
          color="bg-green-500/10 text-green-400"
        />
        <StatCard
          icon={Activity}
          label="Avg Response Time"
          value="42ms"
          change="-8ms"
          trend="up"
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Total Incidents"
          value="8"
          change="-3"
          trend="up"
          color="bg-yellow-500/10 text-yellow-400"
        />
        <StatCard
          icon={XCircle}
          label="Total Downtime"
          value="12m"
          change="-5m"
          trend="up"
          color="bg-red-500/10 text-red-400"
        />
      </div>


      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-1">Network Uptime Trend</h2>
          <p className="text-sm text-gray-400">Overall availability percentage over time</p>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={currentData}>
            <defs>
              <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey={timeRange === '24h' ? 'time' : 'day'} 
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
            <LineChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" style={{ fontSize: '12px' }} />
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
            <p className="text-sm text-gray-400 mb-2">Router-01 maintains 99.9% uptime</p>
            <p className="text-xs text-green-400">Excellent reliability</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="font-semibold text-white">Needs Attention</h3>
            </div>
            <p className="text-sm text-gray-400 mb-2">Local-PC has 97.2% uptime</p>
            <p className="text-xs text-yellow-400">Consider investigating</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">Fastest Response</h3>
            </div>
            <p className="text-sm text-gray-400 mb-2">Average response time: 35ms</p>
            <p className="text-xs text-blue-400">Optimal performance</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;