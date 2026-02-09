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

        public BatteryController(BluetoothService bluetoothService)
        {
            _bluetoothService = bluetoothService;
        }

        [HttpGet]
        public async Task<IActionResult> GetDevices()
        {
            var devices = await _bluetoothService.GetConnectedDevicesAsync();
            return Ok(devices);
        }
    }
}
