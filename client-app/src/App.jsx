import { useState, useEffect } from 'react'
import './index.css'

function App() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingDevice, setEditingDevice] = useState(null)
  const [newName, setNewName] = useState('')

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

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
            <h1 className="text-4xl font-bold text-white text-center">Bluetooth Battery Monitor</h1>
            <p className="text-blue-100 text-center mt-2">Real-time battery levels for your devices</p>
          </div>

          <div className="p-6">
            {loading && <p className="text-center text-gray-600 py-8">Loading devices...</p>}
            {error && <p className="text-center text-red-500 py-8">Error: {error}</p>}

            {!loading && !error && devices.length === 0 && (
              <p className="text-center text-gray-500 py-8">No Bluetooth devices found.</p>
            )}

            {!loading && !error && devices.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Device
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Battery Level
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device, index) => (
                      <tr
                        key={device.id}
                        className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-md text-2xl">
                              {getIcon(device.icon)}
                            </div>
                            <div className="flex flex-col">
                              <div className="text-base font-semibold text-gray-900">
                                {device.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {device.icon.charAt(0).toUpperCase() + device.icon.slice(1)}
                                {device.bluetoothVersion && (
                                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-medium">
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
                              ? 'bg-green-100 text-green-700 border border-green-200'
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
                              <span className="text-sm font-medium text-gray-400">Not Available</span>
                              <span className="text-xs text-gray-400 mt-1">GATT unsupported</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner" style={{ minWidth: '180px' }}>
                              <div
                                className={`h-full rounded-full transition-all duration-500 ease-out ${getBatteryBgColor(device.batteryLevel)} ${
                                  device.batteryLevel !== null && device.batteryLevel > 0 ? 'shadow-sm' : ''
                                }`}
                                style={{ width: `${device.batteryLevel || 0}%` }}
                              ></div>
                            </div>
                            {device.batteryLevel !== null && (
                              <span className="text-xs font-medium text-gray-500 min-w-[35px]">
                                {device.batteryLevel}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
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
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Rename Device</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Name
              </label>
              <p className="text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                {editingDevice.originalName}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new name"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
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
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition-colors"
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
