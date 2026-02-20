using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Microsoft.Toolkit.Uwp.Notifications;

namespace BluetoothBatteryMonitor.Services
{
    public class NotificationSettings
    {
        public bool Enabled { get; set; } = true;
        public int DefaultThreshold { get; set; } = 20;
        public Dictionary<string, int> DeviceThresholds { get; set; } = new();
        public int SnoozeDurationMinutes { get; set; } = 30;
    }

    public class NotificationService
    {
        private readonly string _settingsPath;
        private NotificationSettings _settings;
        private readonly Dictionary<string, DateTime> _lastNotificationTime = new();
        private readonly object _lock = new();

        public NotificationService()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var appFolder = Path.Combine(appData, "BluetoothBatteryMonitor");
            Directory.CreateDirectory(appFolder);
            _settingsPath = Path.Combine(appFolder, "notification-settings.json");
            _settings = LoadSettings();
        }

        private NotificationSettings LoadSettings()
        {
            try
            {
                if (File.Exists(_settingsPath))
                {
                    var json = File.ReadAllText(_settingsPath);
                    return JsonSerializer.Deserialize<NotificationSettings>(json) ?? new NotificationSettings();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading notification settings: {ex.Message}");
            }
            return new NotificationSettings();
        }

        private void SaveSettings()
        {
            try
            {
                var json = JsonSerializer.Serialize(_settings, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(_settingsPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving notification settings: {ex.Message}");
            }
        }

        public NotificationSettings GetSettings()
        {
            return new NotificationSettings
            {
                Enabled = _settings.Enabled,
                DefaultThreshold = _settings.DefaultThreshold,
                SnoozeDurationMinutes = _settings.SnoozeDurationMinutes,
                DeviceThresholds = new Dictionary<string, int>(_settings.DeviceThresholds)
            };
        }

        public void UpdateSettings(NotificationSettings settings)
        {
            _settings = settings;
            SaveSettings();
        }

        public void SetEnabled(bool enabled)
        {
            _settings.Enabled = enabled;
            SaveSettings();
        }

        public void SetDefaultThreshold(int threshold)
        {
            _settings.DefaultThreshold = Math.Clamp(threshold, 5, 50);
            SaveSettings();
        }

        public void SetDeviceThreshold(string deviceId, int threshold)
        {
            _settings.DeviceThresholds[deviceId] = Math.Clamp(threshold, 5, 50);
            SaveSettings();
        }

        public void RemoveDeviceThreshold(string deviceId)
        {
            _settings.DeviceThresholds.Remove(deviceId);
            SaveSettings();
        }

        public int GetThresholdForDevice(string deviceId)
        {
            return _settings.DeviceThresholds.TryGetValue(deviceId, out var threshold)
                ? threshold
                : _settings.DefaultThreshold;
        }

        public void SetSnoozeDuration(int minutes)
        {
            _settings.SnoozeDurationMinutes = Math.Clamp(minutes, 5, 120);
            SaveSettings();
        }

        public void CheckAndNotify(BluetoothDeviceModel device)
        {
            if (!_settings.Enabled || !device.IsConnected || !device.BatteryLevel.HasValue)
                return;

            var threshold = GetThresholdForDevice(device.Id);

            if (device.BatteryLevel.Value <= threshold)
            {
                lock (_lock)
                {
                    // Check if we've already notified recently (snooze period)
                    if (_lastNotificationTime.TryGetValue(device.Id, out var lastTime))
                    {
                        if (DateTime.Now - lastTime < TimeSpan.FromMinutes(_settings.SnoozeDurationMinutes))
                        {
                            return; // Still in snooze period
                        }
                    }

                    // Send notification
                    SendLowBatteryNotification(device);
                    _lastNotificationTime[device.Id] = DateTime.Now;
                }
            }
            else
            {
                // Battery is above threshold, clear the snooze timer
                lock (_lock)
                {
                    _lastNotificationTime.Remove(device.Id);
                }
            }
        }

        public void CheckAndNotifyAll(IEnumerable<BluetoothDeviceModel> devices)
        {
            foreach (var device in devices)
            {
                CheckAndNotify(device);
            }
        }

        private void SendLowBatteryNotification(BluetoothDeviceModel device)
        {
            try
            {
                var iconEmoji = device.Icon switch
                {
                    "headphones" => "🎧",
                    "monitor" => "🖥️",
                    "smartphone" => "📱",
                    "mouse" => "🖱️",
                    _ => "📶"
                };

                new ToastContentBuilder()
                    .AddText($"{iconEmoji} Low Battery: {device.Name}")
                    .AddText($"Battery level is at {device.BatteryLevel}%")
                    .AddText($"Please charge your device soon.")
                    .SetToastScenario(ToastScenario.Default)
                    .Show();

                Console.WriteLine($"Low battery notification sent for {device.Name} ({device.BatteryLevel}%)");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending notification: {ex.Message}");
            }
        }

        public void SnoozeDevice(string deviceId)
        {
            lock (_lock)
            {
                _lastNotificationTime[deviceId] = DateTime.Now;
            }
        }

        public void ClearSnooze(string deviceId)
        {
            lock (_lock)
            {
                _lastNotificationTime.Remove(deviceId);
            }
        }
    }
}