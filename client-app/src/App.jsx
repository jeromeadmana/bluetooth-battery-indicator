import { useState, useEffect } from 'react'
import './index.css'

function App() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingDevice, setEditingDevice] = useState(null)
  const [newName, setNewName] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    if (saved !== null) return JSON.parse(saved)
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    defaultThreshold: 20,
    snoozeDurationMinutes: 30,
    deviceThresholds: {}
  })

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/battery');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setDevices(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!editingDevice) return;

    try {
      const response = await fetch('/api/battery/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: editingDevice.id,
          newName: newName.trim()
        })
      });

      if (response.ok) {
        await fetchDevices();
        setEditingDevice(null);
        setNewName('');
      }
    } catch (err) {
      console.error('Failed to rename device:', err);
    }
  };

  const startEdit = (device) => {
    setEditingDevice(device);
    setNewName(device.name);
  };

  const cancelEdit = () => {
    setEditingDevice(null);
    setNewName('');
  };

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch('/api/battery/notifications/settings');
      if (response.ok) {
        const data = await response.json();
        setNotificationSettings(data);
      }
    } catch (err) {
      console.error('Failed to fetch notification settings:', err);
    }
  };

  const updateNotificationSettings = async (newSettings) => {
    try {
      const response = await fetch('/api/battery/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        setNotificationSettings(newSettings);
      }
    } catch (err) {
      console.error('Failed to update notification settings:', err);
    }
  };

  const snoozeDevice = async (deviceId) => {
    try {
      await fetch('/api/battery/notifications/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });
    } catch (err) {
      console.error('Failed to snooze device:', err);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchNotificationSettings();
    const interval = setInterval(fetchDevices, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`min-h-screen py-8 px-4 transition-colors duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-gray-900 to-slate-800'
        : 'bg-gradient-to-br from-blue-50 to-indigo-100'
    }`}>
      <div className="max-w-5xl mx-auto">
        <div className={`rounded-xl shadow-2xl overflow-hidden transition-colors duration-300 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white text-center">Bluetooth Battery Monitor</h1>
                <p className="text-blue-100 text-center mt-2">Real-time battery levels for your devices</p>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="ml-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="ml-2 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Notification Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            </div>
          </div>

          {showSettings && (
            <div className={`border-b px-6 py-4 transition-colors duration-300 ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Notification Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationSettings.enabled}
                      onChange={(e) => updateNotificationSettings({
                        ...notificationSettings,
                        enabled: e.target.checked
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {notificationSettings.enabled ? 'Notifications On' : 'Notifications Off'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <label className={`text-sm font-medium whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Alert at:
                  </label>
                  <select
                    value={notificationSettings.defaultThreshold}
                    onChange={(e) => updateNotificationSettings({
                      ...notificationSettings,
                      defaultThreshold: parseInt(e.target.value)
                    })}
                    className={`px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'
                    }`}
                  >
                    <option value={5}>5%</option>
                    <option value={10}>10%</option>
                    <option value={15}>15%</option>
                    <option value={20}>20%</option>
                    <option value={25}>25%</option>
                    <option value={30}>30%</option>
                    <option value={40}>40%</option>
                    <option value={50}>50%</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className={`text-sm font-medium whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Snooze:
                  </label>
                  <select
                    value={notificationSettings.snoozeDurationMinutes}
                    onChange={(e) => updateNotificationSettings({
                      ...notificationSettings,
                      snoozeDurationMinutes: parseInt(e.target.value)
                    })}
                    className={`px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-300'
                    }`}
                  >
                    <option value={5}>5 min</option>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>

              <p className={`text-xs mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                You'll receive a Windows notification when any device's battery drops below the threshold.
              </p>
            </div>
          )}

          <div className="p-6">
            {loading && <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading devices...</p>}
            {error && <p className="text-center text-red-500 py-8">Error: {error}</p>}

            {!loading && !error && devices.length === 0 && (
              <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No Bluetooth devices found.</p>
            )}

            {!loading && !error && devices.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className={`border-b-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                      <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Device
                      </th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Status
                      </th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Battery Level
                      </th>
                      <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Progress
                      </th>
                      <th className={`px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device, index) => (
                      <tr
                        key={device.id}
                        className={`border-b transition-colors ${
                          darkMode
                            ? `border-gray-700 hover:bg-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}`
                            : `border-gray-100 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
                        }`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-md text-2xl">
                              {getIcon(device.icon)}
                            </div>
                            <div className="flex flex-col">
                              <div className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {device.name}
                              </div>
                              <div className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {device.icon.charAt(0).toUpperCase() + device.icon.slice(1)}
                                {device.bluetoothVersion && (
                                  <span className={`ml-2 px-2 py-0.5 rounded-md font-medium ${
                                    darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {device.bluetoothVersion}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`px-3 py-1.5 inline-flex text-xs font-semibold rounded-lg ${
                            device.isConnected
                              ? darkMode
                                ? 'bg-green-900 text-green-300 border border-green-700'
                                : 'bg-green-100 text-green-700 border border-green-200'
                              : darkMode
                                ? 'bg-gray-700 text-gray-400 border border-gray-600'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                            <span className={`w-2 h-2 rounded-full mr-2 self-center ${
                              device.isConnected ? 'bg-green-500' : 'bg-gray-400'
                            }`}></span>
                            {device.isConnected ? 'Connected' : 'Disconnected'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {device.batteryLevel !== null ? (
                            <div className="flex flex-col items-center">
                              <span className={`text-2xl font-bold ${getBatteryColor(device.batteryLevel)}`}>
                                {device.batteryLevel}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className={`text-sm font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Not Available</span>
                              <span className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>GATT unsupported</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`flex-1 rounded-full h-3 overflow-hidden shadow-inner ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} style={{ minWidth: '180px' }}>
                              <div
                                className={`h-full rounded-full transition-all duration-500 ease-out ${getBatteryBgColor(device.batteryLevel)} ${
                                  device.batteryLevel !== null && device.batteryLevel > 0 ? 'shadow-sm' : ''
                                }`}
                                style={{ width: `${device.batteryLevel || 0}%` }}
                              ></div>
                            </div>
                            {device.batteryLevel !== null && (
                              <span className={`text-xs font-medium min-w-[35px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {device.batteryLevel}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => startEdit(device)}
                              disabled={!device.isConnected}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                device.isConnected
                                  ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              Rename
                            </button>
                            {device.batteryLevel !== null && device.batteryLevel <= notificationSettings.defaultThreshold && device.isConnected && (
                              <button
                                onClick={() => snoozeDevice(device.id)}
                                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                                title="Snooze notifications for this device"
                              >
                                Snooze
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {editingDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Rename Device</h2>

            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Current Name
              </label>
              <p className={`px-3 py-2 rounded-lg ${darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-50'}`}>
                {editingDevice.originalName}
              </p>
            </div>

            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                New Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`}
                placeholder="Enter new name"
                autoFocus
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Leave empty to reset to original name
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRename}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Save
              </button>
              <button
                onClick={cancelEdit}
                className={`flex-1 px-4 py-2 font-medium rounded-lg transition-colors ${
                  darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getIcon(type) {
  switch (type) {
    case 'headphones': return '🎧';
    case 'mouse': return '🖱️';
    case 'keyboard': return '⌨️';
    case 'phone': return '📱';
    default: return '🔋';
  }
}

function getBatteryColor(level) {
  if (level === null) return 'text-gray-400';
  if (level > 50) return 'text-green-600';
  if (level > 20) return 'text-orange-600';
  return 'text-red-600';
}

function getBatteryBgColor(level) {
  if (level === null) return 'bg-gray-300';
  if (level > 50) return 'bg-gradient-to-r from-green-400 to-green-600';
  if (level > 20) return 'bg-gradient-to-r from-yellow-400 to-orange-500';
  return 'bg-gradient-to-r from-red-400 to-red-600';
}

export default App
