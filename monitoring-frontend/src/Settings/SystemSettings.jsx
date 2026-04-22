import React, { useEffect, useState } from 'react';
import {
  Settings,
  Bell,
  Clock,
  Mail,
  Zap,
  Shield,
  Database,
  Smartphone,
  Moon,
  Sun,
  Monitor,
  Activity,
  AlertTriangle,
  CheckCircle,
  Save,
  RotateCcw,
  Icon
} from 'lucide-react';
import { settingsAPI } from '../frontServices/api';

const SystemSettings = () => {
  const defaultSettings = {
    // Monitoramento
    monitoring: {
      interval: 30,
      timeout: 5,
      retries: 3,
      autoRestart: true,
    },
    
    // Notificações
    notifications: {
      emailAlerts: true,
      criticalOnly: false,
      pushNotifications: false,
      alertSound: true,
      quietHours: false,
      quietStart: '22:00',
      quietEnd: '08:00',
    },
    
    // Email
    email: {
      fromAddress: 'alerts@netsentry.com',
      smtpServer: 'smtp.gmail.com',
      smtpPort: 587,
      useTLS: true,
    },
    
    // Dashboard
    dashboard: {
      theme: 'dark',
      refreshRate: 10,
      showCharts: true,
      compactMode: false,
      animationsEnabled: true,
    },
    
    // Segurança
    security: {
      sessionTimeout: 60,
      requireStrongPassword: true,
      twoFactorAuth: false,
      loginNotifications: true,
    },
    
    // Retenção de Dados
    dataRetention: {
      keepLogs: 30,
      keepAlerts: 90,
      keepMetrics: 365,
      autoCleanup: true,
    },
  };

  // Estado das configurações
  const [settings, setSettings] = useState(defaultSettings);

  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const normalizeSettings = (data) => ({
    ...defaultSettings,
    ...data,
    email: {
      ...defaultSettings.email,
      ...(data?.email || {})
    }
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await settingsAPI.getSystem();
      if (response.data?.success) {
        setSettings(normalizeSettings(response.data.data));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading system settings');
    } finally {
      setLoading(false);
      setHasChanges(false);
      setSaveSuccess(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (category, field, value) => {
    setSettings(prev => ({
        ...prev,
        [category]: {
            ...prev[category],
            [field]: value
        }
    }));
    setHasChanges(true);
    setSaveSuccess(false);
    setError('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const payload = {
        monitoring: settings.monitoring,
        notifications: settings.notifications,
        dashboard: settings.dashboard,
        security: settings.security,
        dataRetention: settings.dataRetention
      };
      const response = await settingsAPI.updateSystem(payload);
      if (response.data?.success) {
        setSettings(normalizeSettings(response.data.data));
        window.dispatchEvent(
          new CustomEvent("systemSettings:updated", {
            detail: response.data.data,
          })
        );
        setSaveSuccess(true);
        setHasChanges(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all settings to default values?')) {
      try {
        setSaving(true);
        setError('');
        const response = await settingsAPI.resetSystem();
        if (response.data?.success) {
          setSettings(normalizeSettings(response.data.data));
          window.dispatchEvent(
            new CustomEvent("systemSettings:updated", {
              detail: response.data.data,
            })
          );
          setHasChanges(false);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error resetting settings');
      } finally {
        setSaving(false);
      }
    }
  };

  const SettingSection = ({ icon: Icon, title, children }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  const SettingItem = ({ label, description, children }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
      <div className="flex-1">
        <p className="text-white font-medium">{label}</p>
        {description && (
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        )}
      </div>
      <div className="ml-4">
        {children}
      </div>
    </div>
  );

  const Toggle = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`
        relative w-12 h-6 rounded-full transition-colors
        ${checked ? 'bg-blue-600' : 'bg-gray-700'}
      `}
    >
      <div
        className={`
          absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-0.5'}
        `}
      />
    </button>
  );

  const Select = ({ value, onChange, options }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );

  const Input = ({ type = "text", value, onChange, ...props }) => (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
      {...props}
    />
  );

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <p className="text-gray-400">Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">System Settings</h1>
        <p className="text-gray-400">Configure monitoring behavior, notifications, and system preferences</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Save Bar */}
      {(hasChanges || saveSuccess) && (
        <div className={`
          fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-50
          ${saveSuccess ? 'bg-green-500/10 border-green-500/30' : 'bg-blue-500/10 border-blue-500/30'}
          border rounded-lg p-4 shadow-lg backdrop-blur-sm
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {saveSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Settings saved successfully!</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-blue-400" />
                  <span className="text-blue-400 font-medium">You have unsaved changes</span>
                </>
              )}
            </div>
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Monitoring Settings */}
      <SettingSection icon={Activity} title="Monitoring Configuration">
        <SettingItem
          label="Check Interval"
          description="How often to check device status (in seconds)"
        >
          <Input
            type="number"
            value={settings.monitoring.interval}
            onChange={(val) => handleChange('monitoring', 'interval', parseInt(val))}
            min="10"
            max="300"
          />
        </SettingItem>

        <SettingItem
          label="Connection Timeout"
          description="Maximum time to wait for response (in seconds)"
        >
          <Input
            type="number"
            value={settings.monitoring.timeout}
            onChange={(val) => handleChange('monitoring', 'timeout', parseInt(val))}
            min="1"
            max="30"
          />
        </SettingItem>

        <SettingItem
          label="Max Retries"
          description="Number of retry attempts before marking as offline"
        >
          <Input
            type="number"
            value={settings.monitoring.retries}
            onChange={(val) => handleChange('monitoring', 'retries', parseInt(val))}
            min="1"
            max="10"
          />
        </SettingItem>

        <SettingItem
          label="Auto-restart Monitoring"
          description="Automatically restart monitoring if it crashes"
        >
          <Toggle
            checked={settings.monitoring.autoRestart}
            onChange={(val) => handleChange('monitoring', 'autoRestart', val)}
          />
        </SettingItem>
      </SettingSection>

      {/* Notification Settings */}
      <SettingSection icon={Bell} title="Notifications">
        <SettingItem
          label="Email Alerts"
          description="Send email notifications for device status changes"
        >
          <Toggle
            checked={settings.notifications.emailAlerts}
            onChange={(val) => handleChange('notifications', 'emailAlerts', val)}
          />
        </SettingItem>

        <SettingItem
          label="Critical Alerts Only"
          description="Only notify for critical events (offline, high response time)"
        >
          <Toggle
            checked={settings.notifications.criticalOnly}
            onChange={(val) => handleChange('notifications', 'criticalOnly', val)}
          />
        </SettingItem>

        <SettingItem
          label="Push Notifications"
          description="Browser push notifications for real-time alerts"
        >
          <Toggle
            checked={settings.notifications.pushNotifications}
            onChange={(val) => handleChange('notifications', 'pushNotifications', val)}
          />
        </SettingItem>

        <SettingItem
          label="Alert Sound"
          description="Play sound when new alert is received"
        >
          <Toggle
            checked={settings.notifications.alertSound}
            onChange={(val) => handleChange('notifications', 'alertSound', val)}
          />
        </SettingItem>

        <SettingItem
          label="Quiet Hours"
          description="Mute non-critical notifications during specific hours"
        >
          <Toggle
            checked={settings.notifications.quietHours}
            onChange={(val) => handleChange('notifications', 'quietHours', val)}
          />
        </SettingItem>

        {settings.notifications.quietHours && (
          <div className="ml-4 pl-4 border-l-2 border-gray-700 space-y-4">
            <SettingItem label="Start Time">
              <Input
                type="time"
                value={settings.notifications.quietStart}
                onChange={(val) => handleChange('notifications', 'quietStart', val)}
              />
            </SettingItem>
            <SettingItem label="End Time">
              <Input
                type="time"
                value={settings.notifications.quietEnd}
                onChange={(val) => handleChange('notifications', 'quietEnd', val)}
              />
            </SettingItem>
          </div>
        )}
      </SettingSection>

      {/* Dashboard Settings */}
      <SettingSection icon={Monitor} title="Dashboard Preferences">
        <SettingItem
          label="Theme"
          description="Choose your preferred color theme"
        >
          <Select
            value={settings.dashboard.theme}
            onChange={(val) => handleChange('dashboard', 'theme', val)}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'auto', label: 'Auto' },
            ]}
          />
        </SettingItem>

        <SettingItem
          label="Auto-refresh Rate"
          description="How often to refresh dashboard data (in seconds)"
        >
          <Input
            type="number"
            value={settings.dashboard.refreshRate}
            onChange={(val) => handleChange('dashboard', 'refreshRate', parseInt(val))}
            min="5"
            max="60"
          />
        </SettingItem>

        <SettingItem
          label="Show Charts"
          description="Display performance charts on dashboard"
        >
          <Toggle
            checked={settings.dashboard.showCharts}
            onChange={(val) => handleChange('dashboard', 'showCharts', val)}
          />
        </SettingItem>

        <SettingItem
          label="Compact Mode"
          description="Use smaller cards and tighter spacing"
        >
          <Toggle
            checked={settings.dashboard.compactMode}
            onChange={(val) => handleChange('dashboard', 'compactMode', val)}
          />
        </SettingItem>

        <SettingItem
          label="Animations"
          description="Enable smooth transitions and animations"
        >
          <Toggle
            checked={settings.dashboard.animationsEnabled}
            onChange={(val) => handleChange('dashboard', 'animationsEnabled', val)}
          />
        </SettingItem>
      </SettingSection>

      {/* Security Settings */}
      <SettingSection icon={Shield} title="Security">
        <SettingItem
          label="Session Timeout"
          description="Automatically logout after inactivity (in minutes)"
        >
          <Input
            type="number"
            value={settings.security.sessionTimeout}
            onChange={(val) => handleChange('security', 'sessionTimeout', parseInt(val))}
            min="5"
            max="1440"
          />
        </SettingItem>

        <SettingItem
          label="Strong Password Required"
          description="Enforce password complexity requirements"
        >
          <Toggle
            checked={settings.security.requireStrongPassword}
            onChange={(val) => handleChange('security', 'requireStrongPassword', val)}
          />
        </SettingItem>

        <SettingItem
          label="Two-Factor Authentication"
          description="Require 2FA for all user logins"
        >
          <Toggle
            checked={settings.security.twoFactorAuth}
            onChange={(val) => handleChange('security', 'twoFactorAuth', val)}
          />
        </SettingItem>

        <SettingItem
          label="Login Notifications"
          description="Send email when new login is detected"
        >
          <Toggle
            checked={settings.security.loginNotifications}
            onChange={(val) => handleChange('security', 'loginNotifications', val)}
          />
        </SettingItem>
      </SettingSection>

      {/* Data Retention */}
      <SettingSection icon={Database} title="Data Retention">
        <SettingItem
          label="Keep Logs (days)"
          description="How long to retain system logs"
        >
          <Input
            type="number"
            value={settings.dataRetention.keepLogs}
            onChange={(val) => handleChange('dataRetention', 'keepLogs', parseInt(val))}
            min="7"
            max="365"
          />
        </SettingItem>

        <SettingItem
          label="Keep Alerts (days)"
          description="How long to retain alert history"
        >
          <Input
            type="number"
            value={settings.dataRetention.keepAlerts}
            onChange={(val) => handleChange('dataRetention', 'keepAlerts', parseInt(val))}
            min="30"
            max="730"
          />
        </SettingItem>

        <SettingItem
          label="Keep Metrics (days)"
          description="How long to retain performance metrics"
        >
          <Input
            type="number"
            value={settings.dataRetention.keepMetrics}
            onChange={(val) => handleChange('dataRetention', 'keepMetrics', parseInt(val))}
            min="90"
            max="1825"
          />
        </SettingItem>

        <SettingItem
          label="Auto-cleanup"
          description="Automatically delete old data based on retention policy"
        >
          <Toggle
            checked={settings.dataRetention.autoCleanup}
            onChange={(val) => handleChange('dataRetention', 'autoCleanup', val)}
          />
        </SettingItem>
      </SettingSection>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-8 p-6 bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-3 text-gray-400">
          <Settings className="w-5 h-5" />
          <span className="text-sm">Configure system behavior and preferences</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all
              ${hasChanges && !saving
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
  
