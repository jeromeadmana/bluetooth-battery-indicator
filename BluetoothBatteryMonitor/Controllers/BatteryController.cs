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

        public BatteryController(BluetoothService bluetoothService, DeviceNameService nameService)
        {
            _bluetoothService = bluetoothService;
            _nameService = nameService;
        }

        [HttpGet]
        public async Task<IActionResult> GetDevices()
        {
            var devices = await _bluetoothService.GetConnectedDevicesAsync();
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
    }

    public class RenameDeviceRequest
    {
        public string DeviceId { get; set; } = string.Empty;
        public string NewName { get; set; } = string.Empty;
    }
}
