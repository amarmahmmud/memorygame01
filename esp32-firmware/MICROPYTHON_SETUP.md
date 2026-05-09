# MicroPython Setup for ESP32 Solar Tracker

## Why MicroPython?

MicroPython is a **lean Python implementation** that runs on microcontrollers like the ESP32. It's:
- ✅ **Easier to learn** - Uses Python syntax you already know
- ✅ **Faster development** - No compilation needed, just upload and run
- ✅ **Interactive** - Test code in real-time with REPL
- ✅ **Great for prototyping** - Perfect for IoT projects

## Installation Steps

### Step 1: Install Thonny IDE (Recommended)

**Thonny** is the easiest IDE for MicroPython development:

1. Download from https://thonny.org/
2. Install for your OS (Windows/Mac/Linux)
3. Launch Thonny

### Step 2: Install MicroPython on ESP32

**Method A: Using Thonny (Easiest)**

1. Connect ESP32 to your computer via USB
2. Open Thonny
3. Go to **Run → Select Interpreter**
4. Choose **MicroPython (ESP32)**
5. Select your COM port (e.g., COM3, /dev/ttyUSB0)
6. Click **Install or update MicroPython**
7. Select your port and click **Install**

**Method B: Using esptool.py**

```bash
# Install esptool
pip install esptool

# Erase flash (optional)
esptool.py --port /dev/ttyUSB0 erase_flash

# Install MicroPython
esptool.py --chip esp32 --port /dev/ttyUSB0 write_flash -z 0x1000 esp32-20210902-v1.17.bin
```

Download firmware: https://micropython.org/download/esp32/

### Step 3: Verify Installation

In Thonny:
1. Open the **Shell** window at bottom
2. You should see `>>>` prompt
3. Type:
```python
>>> import machine
>>> machine.freq()  # Should show 240000000 (240MHz)
```

If it works, you're ready!

## Uploading the Solar Tracker Code

### Method 1: Using Thonny (Recommended)

1. Open `solar_tracker_micropython.py` in Thonny
2. **Save to ESP32**: File → Save as → MicroPython device
3. Name it `main.py` (runs automatically on boot)
4. Click the **Run** button (green ▶)

### Method 2: Using WebREPL

1. Connect via USB
2. Enable WebREPL:
```python
import webrepl
webrepl.start()
```
3. Connect to http://<ESP32_IP>:8266
4. Upload files via web interface

### Method 3: Using ampy

```bash
# Install ampy
pip install adafruit-ampy

# Upload file
ampy --port /dev/ttyUSB0 put solar_tracker_micropython.py main.py

# Reset ESP32
ampy --port /dev/ttyUSB0 reset
```

## Configuration

### Edit WiFi Settings

Open `main.py` on ESP32 and update:

```python
# WiFi Settings
WIFI_SSID = "YourWiFiName"
WIFI_PASS = "YourWiFiPassword"
```

### Find Your ESP32 IP

After uploading and running:
1. Open Thonny Shell
2. You'll see output:
```
Solar Tracker - MicroPython Edition
=====================================
Connecting to WiFi...
Connected!
IP: 192.168.1.100
Server started on port 80
```

Note this IP address!

## Testing Your Setup

### Test 1: Check Status

Open browser and go to:
```
http://<ESP32_IP>/status
```

You should see JSON like:
```json
{
  "pan": 180.0,
  "tilt": 30.0,
  "dustLevel": 0,
  "isCleaning": false,
  "ldrTop": 2048,
  "ldrBottom": 2048,
  "ldrLeft": 2048,
  "ldrRight": 2048
}
```

### Test 2: Control Motors

```bash
curl -X POST http://<ESP32_IP>/control \
  -H "Content-Type: application/json" \
  -d '{"pan": 90, "tilt": 45}'
```

### Test 3: Read Sensors

```bash
curl http://<ESP32_IP>/sensors
```

## Pin Connections (MicroPython)

### Motor Connections

```
ESP32              Motor Driver
─────────────────────────────────
GPIO 25  ────────> STEP (Pan motor)
GPIO 26  ────────> DIR  (Pan motor)
GPIO 27  ────────> STEP (Tilt motor)
GPIO 14  ────────> DIR  (Tilt motor)
GPIO 32  ────────> PWM  (Cleaner motor)
```

### Sensor Connections

```
ESP32              Sensors
─────────────────────────────────
GPIO 4   ────────> IR Dust Sensor (Digital)
GPIO 34  ────────> LDR Top (Analog)
GPIO 35  ────────> LDR Bottom (Analog)
GPIO 33  ────────> LDR Left (Analog)
GPIO 39  ────────> LDR Right (Analog)
```

### LDR Circuit (Same for all LDRs)

```
3.3V ──┬── LDR ──┬── ESP32 Analog Pin
       │         │
      10kΩ       │
       │         │
      GND ───────┘
```

## Troubleshooting

### "Port not found" Error

**Windows:**
- Check Device Manager for COM port
- Install CH340/CP210x drivers if needed

**Mac:**
```bash
ls /dev/tty.*
# Look for /dev/tty.usbserial or /dev/tty.SLAB_USBtoUART
```

**Linux:**
```bash
ls /dev/ttyUSB*
# or
ls /dev/ttyACM*
```

### "Failed to connect to WiFi"

1. Verify SSID and password
2. Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
3. Check router DHCP settings
4. Try closer to router

### "Brownout detector triggered"

- USB cable can't supply enough power
- Use external power for motors
- Disconnect motors during programming

### Motors Not Moving

1. Check external power supply (motors need separate power!)
2. Verify motor driver connections
3. Check `STEPS_PER_DEGREE` setting
4. Reduce `MOTOR_DELAY_US` for faster movement

### Sensors Reading 0 or 4095

1. Check LDR wiring (pull-down resistor needed)
2. Verify analog pins (some ESP32 pins can't be analog)
3. Add 0.1µF capacitor across LDR for noise reduction

## MicroPython Tips

### Interactive Testing

In Thonny Shell, test code interactively:

```python
>>> import machine
>>> led = machine.Pin(2, machine.Pin.OUT)  # Built-in LED
>>> led.value(1)  # Turn on
>>> led.value(0)  # Turn off
```

### View ESP32 Files

In Thonny:
- **View → Files** to see files on ESP32
- Right-click → "Upload to" / "Download from" device

### Reset ESP32

```python
>>> import machine
>>> machine.reset()
```

### Read Analog Pin

```python
>>> import machine
>>> adc = machine.ADC(machine.Pin(34))
>>> adc.read()  # Returns 0-4095
```

## Differences from Arduino Version

| Feature | Arduino C++ | MicroPython |
|---------|-----------|-------------|
| Syntax | C++ | Python |
| Compilation | Required | Not needed |
| Speed | Faster | Slower (but fine for this) |
| Development | Slower (compile/upload) | Faster (edit/run) |
| Libraries | More available | Fewer but growing |
| Learning curve | Steeper | Gentle |

## Performance Notes

- **Motor speed**: MicroPython is slower than C++, but motors won't notice
- **Sensor reading**: Perfectly adequate for solar tracking
- **Web server**: Handles requests fine for this use case
- **Memory**: Uses ~50% of ESP32 RAM (plenty of room)

## Next Steps

1. **Calibrate motors**: Adjust `STEPS_PER_DEGREE`
2. **Tune tracking**: Modify `LIGHT_THRESHOLD` and `DEADBAND`
3. **Add features**: Sunrise/sunset tracking, weather API
4. **Secure**: Add authentication to web server
5. **Monitor**: Add logging to SD card

## Resources

- [MicroPython Official Site](https://micropython.org/)
- [ESP32 MicroPython Docs](https://docs.micropython.org/en/latest/esp32/)
- [Thonny IDE](https://thonny.org/)
- [MicroPython Forum](https://forum.micropython.org/)

## Support

Having issues?
1. Check Thonny Shell for error messages
2. Verify all pin connections
3. Test with simple LED blink first
4. Ask in MicroPython forums

Happy coding! 🐍⚡