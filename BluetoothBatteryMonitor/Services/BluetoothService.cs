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
                            Icon = GetIconForDevice(device.ClassOfDevice) 
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
            // For Bluetooth LE devices, try to read battery via GATT
            try
            {
                // Try to get the device as a Bluetooth LE device
                var bleDevice = await BluetoothLEDevice.FromIdAsync(device.DeviceId);
                if (bleDevice != null)
                {
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
                                return (int)level;
                            }
                        }
                    }
                    bleDevice.Dispose();
                }
            }
            catch
            {
                // Device might not be BLE or doesn't support battery service
            }

            // Fallback: Try to get battery info from device properties
            try
            {
                var deviceInfo = await DeviceInformation.CreateFromIdAsync(device.DeviceId);
                if (deviceInfo != null && deviceInfo.Properties.ContainsKey("System.Devices.BatteryLevel"))
                {
                    var batteryLevel = deviceInfo.Properties["System.Devices.BatteryLevel"];
                    if (batteryLevel != null && int.TryParse(batteryLevel.ToString(), out int level))
                    {
                        return level;
                    }
                }
            }
            catch
            {
                // Property might not exist
            }

            return null; // Battery level not available
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
