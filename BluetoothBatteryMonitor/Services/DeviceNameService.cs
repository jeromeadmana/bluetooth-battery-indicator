using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

namespace BluetoothBatteryMonitor.Services
{
    public class DeviceNameService
    {
        private readonly string _settingsPath;
        private Dictionary<string, string> _customNames;

        public DeviceNameService()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var appFolder = Path.Combine(appData, "BluetoothBatteryMonitor");
            Directory.CreateDirectory(appFolder);
            _settingsPath = Path.Combine(appFolder, "device-names.json");
            _customNames = LoadCustomNames();
        }

        private Dictionary<string, string> LoadCustomNames()
        {
            try
            {
                if (File.Exists(_settingsPath))
                {
                    var json = File.ReadAllText(_settingsPath);
                    return JsonSerializer.Deserialize<Dictionary<string, string>>(json) ?? new Dictionary<string, string>();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading custom names: {ex.Message}");
            }
            return new Dictionary<string, string>();
        }

        private void SaveCustomNames()
        {
            try
            {
                var json = JsonSerializer.Serialize(_customNames, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(_settingsPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving custom names: {ex.Message}");
            }
        }

        public string GetDisplayName(string deviceId, string originalName)
        {
            return _customNames.TryGetValue(deviceId, out var customName) ? customName : originalName;
        }

        public void SetCustomName(string deviceId, string customName)
        {
            _customNames[deviceId] = customName;
            SaveCustomNames();
        }

        public void RemoveCustomName(string deviceId)
        {
            _customNames.Remove(deviceId);
            SaveCustomNames();
        }
    }
}
