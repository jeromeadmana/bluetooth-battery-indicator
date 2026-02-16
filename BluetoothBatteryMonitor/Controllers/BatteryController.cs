using Microsoft.AspNetCore.Mvc;
using BluetoothBatteryMonitor.Services;
using System.Threading.Tasks;

namespace BluetoothBatteryMonitor.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BatteryController : ControllerBase
    {
        private readonly BluetoothService _bluetoothService;
        private readonly DeviceNameService _nameService;
        private readonly NotificationService _notificationService;

        public BatteryController(BluetoothService bluetoothService, DeviceNameService nameService, NotificationService notificationService)
        {
            _bluetoothService = bluetoothService;
            _nameService = nameService;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetDevices()
        {
            var devices = await _bluetoothService.GetConnectedDevicesAsync();

            // Check for low battery and send notifications
            _notificationService.CheckAndNotifyAll(devices);

            return Ok(devices);
        }

        [HttpPost("rename")]
        public IActionResult RenameDevice([FromBody] RenameDeviceRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.DeviceId))
            {
                return BadRequest("Device ID is required");
            }

            if (string.IsNullOrWhiteSpace(request.NewName))
            {
                _nameService.RemoveCustomName(request.DeviceId);
            }
            else
            {
                _nameService.SetCustomName(request.DeviceId, request.NewName);
            }

            return Ok(new { success = true });
        }

        [HttpGet("notifications/settings")]
        public IActionResult GetNotificationSettings()
        {
            var settings = _notificationService.GetSettings();
            return Ok(settings);
        }

        [HttpPost("notifications/settings")]
        public IActionResult UpdateNotificationSettings([FromBody] NotificationSettingsRequest request)
        {
            var settings = new NotificationSettings
            {
                Enabled = request.Enabled,
                DefaultThreshold = request.DefaultThreshold,
                SnoozeDurationMinutes = request.SnoozeDurationMinutes,
                DeviceThresholds = request.DeviceThresholds ?? new Dictionary<string, int>()
            };
            _notificationService.UpdateSettings(settings);
            return Ok(new { success = true });
        }

        [HttpPost("notifications/threshold")]
        public IActionResult SetDeviceThreshold([FromBody] DeviceThresholdRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.DeviceId))
            {
                return BadRequest("Device ID is required");
            }

            if (request.Threshold.HasValue)
            {
                _notificationService.SetDeviceThreshold(request.DeviceId, request.Threshold.Value);
            }
            else
            {
                _notificationService.RemoveDeviceThreshold(request.DeviceId);
            }

            return Ok(new { success = true });
        }

        [HttpPost("notifications/snooze")]
        public IActionResult SnoozeDevice([FromBody] SnoozeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.DeviceId))
            {
                return BadRequest("Device ID is required");
            }

            _notificationService.SnoozeDevice(request.DeviceId);
            return Ok(new { success = true });
        }
    }

    public class RenameDeviceRequest
    {
        public string DeviceId { get; set; } = string.Empty;
        public string NewName { get; set; } = string.Empty;
    }

    public class NotificationSettingsRequest
    {
        public bool Enabled { get; set; } = true;
        public int DefaultThreshold { get; set; } = 20;
        public int SnoozeDurationMinutes { get; set; } = 30;
        public Dictionary<string, int>? DeviceThresholds { get; set; }
    }

    public class DeviceThresholdRequest
    {
        public string DeviceId { get; set; } = string.Empty;
        public int? Threshold { get; set; }
    }

    public class SnoozeRequest
    {
        public string DeviceId { get; set; } = string.Empty;
    }
}
