using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Windows.Devices.Bluetooth;
using Windows.Devices.Bluetooth.GenericAttributeProfile;
using Windows.Devices.Enumeration;
using Windows.Devices.Power;

namespace BluetoothBatteryMonitor.Services
{
    public class BluetoothDeviceModel
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int? BatteryLevel { get; set; }
        public bool IsConnected { get; set; }
        public string Icon { get; set; } = "bluetooth"; // Default icon
        public string? BluetoothVersion { get; set; } // BLE, Classic, or version number
    }

    public class BluetoothService
    {
        public async Task<List<BluetoothDeviceModel>> GetConnectedDevicesAsync()
        {
            var devices = new List<BluetoothDeviceModel>();

            // Find all PAIRED Bluetooth devices
            // We use the AQS selector for Bluetooth devices
            try
            {
                string aqs = BluetoothDevice.GetDeviceSelector();
                var deviceCollection = await DeviceInformation.FindAllAsync(aqs);

                foreach (var devInfo in deviceCollection)
                {
                    try
                    {
                        var device = await BluetoothDevice.FromIdAsync(devInfo.Id);
                        if (device == null) continue;

                        bool isConnected = device.ConnectionStatus == BluetoothConnectionStatus.Connected;
                        int? battery = null;

                        if (isConnected)
                        {
                            battery = await GetBatteryLevelAsync(device);
                        }

                        devices.Add(new BluetoothDeviceModel
                        {
                            Id = devInfo.Id,
                            Name = devInfo.Name,
                            IsConnected = isConnected,
                            BatteryLevel = battery,
                            Icon = GetIconForDevice(device.ClassOfDevice),
                            BluetoothVersion = await GetBluetoothVersionAsync(device, devInfo)
                        });
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error processing device {devInfo.Name}: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error finding devices: {ex.Message}");
            }

            return devices;
        }

        private async Task<int?> GetBatteryLevelAsync(BluetoothDevice device)
        {
            // Method 1: Try Windows Device Properties first (most reliable for many devices)
            try
            {
                var deviceInfo = await DeviceInformation.CreateFromIdAsync(device.DeviceId);
                if (deviceInfo != null)
                {
                    // Try multiple battery-related properties
                    var batteryProperties = new[]
                    {
                        "System.Devices.BatteryLevel",
                        "System.Devices.Battery.Level",
                        "System.Devices.Aep.IsBatteryLevelAvailable",
                        "System.Devices.Aep.BatteryLevel"
                    };

                    foreach (var prop in batteryProperties)
                    {
                        if (deviceInfo.Properties.ContainsKey(prop))
                        {
                            var value = deviceInfo.Properties[prop];
                            if (value != null)
                            {
                                if (int.TryParse(value.ToString(), out int level) && level >= 0 && level <= 100)
                                {
                                    Console.WriteLine($"Battery level for {device.Name} from {prop}: {level}%");
                                    return level;
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error reading device properties: {ex.Message}");
            }

            // Method 2: Try Windows.Devices.Power.Battery API
            try
            {
                // Query for battery devices associated with this Bluetooth device
                var batterySelector = Battery.GetDeviceSelector();
                var batteries = await DeviceInformation.FindAllAsync(batterySelector);

                foreach (var batteryDevInfo in batteries)
                {
                    // Check if this battery is associated with our Bluetooth device
                    if (batteryDevInfo.Id.Contains(device.DeviceId.Split('#').LastOrDefault() ?? "") ||
                        batteryDevInfo.Name.Contains(device.Name, StringComparison.OrdinalIgnoreCase))
                    {
                        var battery = await Battery.FromIdAsync(batteryDevInfo.Id);
                        if (battery != null)
                        {
                            var report = battery.GetReport();
                            if (report != null && report.FullChargeCapacityInMilliwattHours.HasValue &&
                                report.RemainingCapacityInMilliwattHours.HasValue &&
                                report.FullChargeCapacityInMilliwattHours.Value > 0)
                            {
                                int level = (int)((double)report.RemainingCapacityInMilliwattHours.Value /
                                                 report.FullChargeCapacityInMilliwattHours.Value * 100);
                                Console.WriteLine($"Battery level for {device.Name} from Battery API: {level}%");
                                return level;
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Battery API read failed for {device.Name}: {ex.Message}");
            }

            // Method 3: Try GATT for Bluetooth LE devices
            try
            {
                var bleDevice = await BluetoothLEDevice.FromIdAsync(device.DeviceId);
                if (bleDevice != null)
                {
                    Console.WriteLine($"Attempting GATT read for {device.Name} (BLE device)");
                    var gattResult = await bleDevice.GetGattServicesForUuidAsync(GattServiceUuids.Battery);
                    if (gattResult.Status == GattCommunicationStatus.Success && gattResult.Services.Count > 0)
                    {
                        var batteryService = gattResult.Services[0];
                        var charResult = await batteryService.GetCharacteristicsForUuidAsync(GattCharacteristicUuids.BatteryLevel);

                        if (charResult.Status == GattCommunicationStatus.Success && charResult.Characteristics.Count > 0)
                        {
                            var batteryChar = charResult.Characteristics[0];
                            var valueResult = await batteryChar.ReadValueAsync();

                            if (valueResult.Status == GattCommunicationStatus.Success)
                            {
                                var reader = Windows.Storage.Streams.DataReader.FromBuffer(valueResult.Value);
                                byte level = reader.ReadByte();
                                bleDevice.Dispose();
                                Console.WriteLine($"Battery level for {device.Name} from GATT: {level}%");
                                return (int)level;
                            }
                        }
                    }
                    bleDevice.Dispose();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GATT read failed for {device.Name}: {ex.Message}");
            }

            Console.WriteLine($"No battery info available for {device.Name}");
            return null;
        }



        private async Task<string> GetBluetoothVersionAsync(BluetoothDevice device, DeviceInformation devInfo)
        {
            try
            {
                // Check if it's a Bluetooth LE device
                var bleDevice = await BluetoothLEDevice.FromIdAsync(device.DeviceId);
                if (bleDevice != null)
                {
                    bleDevice.Dispose();
                    return "BLE (4.0+)";
                }
            }
            catch
            {
                // Not a BLE device
            }

            // Check device properties for Bluetooth version
            try
            {
                if (devInfo.Properties.ContainsKey("System.Devices.Aep.Bluetooth.Le.IsConnectable"))
                {
                    var isLE = devInfo.Properties["System.Devices.Aep.Bluetooth.Le.IsConnectable"];
                    if (isLE != null && (bool)isLE)
                    {
                        return "BLE (4.0+)";
                    }
                }

                // Check for protocol properties
                if (devInfo.Properties.ContainsKey("System.Devices.Aep.ProtocolId"))
                {
                    var protocolId = devInfo.Properties["System.Devices.Aep.ProtocolId"]?.ToString();
                    if (protocolId != null && protocolId.Contains("Bluetooth", StringComparison.OrdinalIgnoreCase))
                    {
                        return "Classic (2.0/3.0)";
                    }
                }
            }
            catch { }

            return "Classic";
        }

        private string GetIconForDevice(BluetoothClassOfDevice classOfDevice)
        {
            // Simple mapping based on Major class
            // https://learn.microsoft.com/en-us/uwp/api/windows.devices.bluetooth.bluetoothmajorclass
            if (classOfDevice == null) return "bluetooth";

            return classOfDevice.MajorClass switch
            {
                BluetoothMajorClass.AudioVideo => "headphones",
                BluetoothMajorClass.Computer => "monitor",
                BluetoothMajorClass.Phone => "smartphone",
                BluetoothMajorClass.Peripheral => "mouse", // or keyboard
                _ => "bluetooth"
            };
        }
    }
}
