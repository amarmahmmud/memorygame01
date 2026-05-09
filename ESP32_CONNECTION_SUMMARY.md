# ESP32 Connection Summary for Solar Tracker Project

## Overview

Your solar tracker project has been fully configured to connect to a physical ESP32 processor! The system includes:

1. **ESP32 Firmware** - Python/MicroPython and Arduino C++ versions
2. **Bridge Server** - Node.js server for communication
3. **Frontend Integration** - React component with live controls
4. **Complete Documentation** - Setup guides and API references

## What's Been Created

### 1. ESP32 Firmware Files

#### MicroPython Version (Recommended)
- **File**: `esp32-firmware/solar_tracker_micropython.py`
- **Language**: Python (MicroPython)
- **Features**: 
  - WiFi connectivity
  - REST API server
  - Motor control (pan/tilt)
  - Sensor reading (LDRs, IR dust)
  - Auto-tracking algorithm
  - Cleaning system control

#### Arduino C++ Version
- **File**: `esp32-firmware/solar_tracker_firmware.ino`
- **Language**: C++ (Arduino)
- **Features**: Same as MicroPython, compiled version

### 2. Bridge Server

- **File**: `server/esp32-bridge-server.js`
- **Purpose**: Acts as intermediary between web app and ESP32
- **Features**:
  - REST API proxy
  - WebSocket support for real-time updates
  - Device status monitoring
  - Configuration management

### 3. Frontend Integration

- **File**: `components/solar-tracker/ESP32Connection.tsx`
- **Features**:
  - Connection management (direct or via bridge)
  - Real-time status display
  - Motor control interface
  - Sensor data visualization
  - Manual/auto mode switching

- **Modified**: `components/solar-tracker-scene.tsx`
  - Added ESP32 toggle (SIM/LIVE mode)
  - Integrated connection panel
  - Real-time state synchronization

### 4. Documentation

- `ESP32_SETUP_GUIDE.md` - Complete hardware/software setup
- `QUICKSTART_ESP32.md` - 5-minute quick start
- `ESP32_INTEGRATION_README.md` - Integration overview
- `esp32-firmware/README.md` - Firmware documentation
- `esp32-firmware/MICROPYTHON_SETUP.md` - MicroPython guide

## Hardware Pin Configuration

| Function | ESP32 Pin | Type |
|----------|-----------|------|
| Pan Motor Step | GPIO 25 | Output |
| Pan Motor Dir | GPIO 26 | Output |
| Tilt Motor Step | GPIO 27 | Output |
| Tilt Motor Dir | GPIO 14 | Output |
| Cleaner Motor | GPIO 32 | PWM Output |
| IR Dust Sensor | GPIO 4 | Digital Input |
| LDR Top | GPIO 34 | Analog Input |
| LDR Bottom | GPIO 35 | Analog Input |
| LDR Left | GPIO 33 | Analog Input |
| LDR Right | GPIO 39 | Analog Input |

## Quick Start Guide

### Step 1: Flash the ESP32

#### Option A: Using MicroPython (Easier)

1. Install [Thonny IDE](https://thonny.org/)
2. Connect ESP32 via USB
3. Open Thonny → Run → Select Interpreter
4. Choose "MicroPython (ESP32)"
5. Select your COM port
6. Click "Install or update MicroPython"
7. Open `esp32-firmware/solar_tracker_micropython.py`
8. Update WiFi credentials (lines 24-25)
9. Save as `main.py` on ESP32

#### Option B: Using Arduino IDE

1. Install Arduino IDE
2. Add ESP32 board support:
   - File → Preferences
   - Additional Boards Manager: `https://dl.espressif.com/dl/package_esp32_index.json`
3. Install ESP32 board
4. Open `esp32-firmware/solar_tracker_firmware.ino`
5. Update WiFi credentials (lines 17-18)
6. Select: Tools → Board → ESP32 Dev Module
7. Select your USB port
8. Click Upload

### Step 2: Find ESP32 IP Address

Open Serial Monitor (115200 baud):
```
Connecting to WiFi...
Connected!
IP: 192.168.1.100
Server started on port 80
```

Note this IP address!

### Step 3: Start Bridge Server (Optional but Recommended)

```bash
cd memorygame01/server
npm install
npm start
```

Output:
```
 ESP32 Bridge Server Running
 Port: 3001
 ESP32 Target: 192.168.1.100:80
```

### Step 4: Connect Web App

1. Start the Next.js app:
```bash
cd memorygame01
npm run dev
```

2. Open browser to `http://localhost:3000`

3. Click the **SIM/LIVE** toggle (top-left) to switch to LIVE mode

4. ESP32 Connection panel appears (top-left)

5. Configure connection:
   - **Bridge Mode** (recommended):
     - Toggle "Use Bridge Server" ON
     - Enter bridge URL: `http://localhost:3001`
   - **Direct Mode**:
     - Toggle "Use Bridge Server" OFF
     - Enter ESP32 IP: `192.168.1.100`
     - Port: `80`

6. Click **Connect**

7. Status should show: **CONNECTED**

## API Endpoints

### ESP32 Direct API

- `GET /status` - Get motor positions and sensor data
- `GET /sensors` - Get LDR and dust sensor readings
- `POST /control` - Control motors
  - Body: `{"pan": 180, "tilt": 45, "clean": false}`
- `POST /clean` - Start cleaning cycle
- `GET /health` - Health check

### Bridge Server API

- `GET /api/status` - Bridge and ESP32 status
- `GET /api/esp32/status` - ESP32 status (proxied)
- `GET /api/esp32/sensors` - ESP32 sensors (proxied)
- `POST /api/esp32/control` - Control ESP32 (proxied)
- `POST /api/esp32/clean` - Start cleaning (proxied)
- `GET /api/config` - Get configuration
- `POST /api/config` - Update configuration

## Features

### Motor Control
- **Pan**: 0-360° continuous rotation
- **Tilt**: 0-80° (limited by physical structure)
- Smooth stepping with configurable speed
- Absolute positioning

### Auto-Tracking
- Reads 4 LDR sensors (top, bottom, left, right)
- Calculates sun position based on light intensity
- Automatically adjusts pan/tilt to maximize light
- Deadband filtering to prevent oscillation
- Parks at default position when light is low

### Cleaning System
- IR dust sensor detects panel dirt
- Automatic cleaning when dust > 70%
- Manual clean button
- Visual feedback during cleaning

### Sensor Monitoring
- Real-time LDR voltage readings
- Dust level percentage
- Connection status
- Motor positions

## Troubleshooting

### ESP32 Won't Connect to WiFi
- Check SSID and password
- Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
- Check serial monitor for error messages
- Try closer to router

### Motors Not Moving
- Check motor driver power supply
- Verify pin connections
- Check motor driver enable pins
- Ensure external power for motors (if required)

### Web App Can't Connect
- Verify ESP32 IP address
- Check firewall settings
- Ensure bridge server is running (if using)
- Check browser console for errors

### Sensors Reading Incorrectly
- Check LDR wiring (voltage divider)
- Verify analog pin connections
- Check IR sensor power (3.3V or 5V)
- Calibrate thresholds in firmware

## Customization

### Adjust Tracking Sensitivity
Edit in firmware:
```cpp
#define DEADBAND 0.05  // Increase for less sensitivity
#define LIGHT_THRESHOLD 0.15  // Minimum light to track
```

### Change Motor Speed
```cpp
#define MOTOR_SPEED 500  // Lower = faster (microseconds)
#define STEPS_PER_DEGREE 20  // Adjust for your motor
```

### Modify Pin Configuration
```cpp
#define PIN_PAN_STEP 25
#define PIN_PAN_DIR 26
// etc.
```

## Safety Notes

1. **Power**: Motors may require external power supply
2. **Ground**: Connect all grounds together
3. **Current**: Don't exceed ESP32 pin current limits (40mA per pin)
4. **Voltage**: Use level shifters if needed for 5V devices
5. **Heat**: Motor drivers may need heatsinks

## Next Steps

- [ ] Calibrate motor steps per degree
- [ ] Tune tracking algorithm for your location
- [ ] Add weatherproofing for outdoor use
- [ ] Implement time-based positioning (solar calculations)
- [ ] Add data logging
- [ ] Create mobile app interface
- [ ] Implement MQTT for IoT integration

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review serial monitor output
3. Verify all connections
4. Test components individually

## License

MIT License - Feel free to modify and distribute!