# ESP32 Solar Tracker - Complete Setup Guide

## Overview

This guide explains how to connect your physical ESP32 processor to the solar tracker web application. The system consists of three parts:

1. **ESP32 Firmware** - Runs on the physical ESP32, controls motors and reads sensors
2. **Bridge Server** (optional) - Node.js server that relays commands between web app and ESP32
3. **Web Frontend** - 3D solar tracker visualization with ESP32 control panel

## Hardware Requirements

### Required Components
- ESP32 development board (any variant)
- USB data cable (for programming and power)
- 2x Stepper motors or servo motors (for pan/tilt)
- Motor driver (if using stepper motors)
- 4x LDR (Light Dependent Resistors) for sun tracking
- IR dust sensor module
- DC motor for cleaning system (optional)
- External power supply for motors (recommended)

### Pin Connections

| Function | ESP32 Pin | Notes |
|----------|-----------|-------|
| Pan Motor Step | GPIO 25 | Stepper step pin |
| Pan Motor Dir | GPIO 26 | Stepper direction pin |
| Tilt Motor Step | GPIO 27 | Stepper step pin |
| Tilt Motor Dir | GPIO 14 | Stepper direction pin |
| Cleaner Motor | GPIO 32 | PWM output |
| IR Dust Sensor | GPIO 4 | Digital input |
| LDR Top | GPIO 34 | Analog input (ADC1_CH6) |
| LDR Bottom | GPIO 35 | Analog input (ADC1_CH7) |
| LDR Left | GPIO 33 | Analog input (ADC1_CH5) |
| LDR Right | GPIO 39 | Analog input (ADC1_CH3) |

### Wiring Notes

1. **LDR Sensors**: Connect one leg to 3.3V, other leg to analog pin + 10kΩ pull-down resistor to GND
2. **Motors**: Use appropriate motor driver (A4988 for stepper, L298N for DC)
3. **Power**: Motors may require external 12V supply. Use separate power for ESP32 (USB) and motors
4. **Ground**: Connect all grounds together (ESP32, motor driver, external power)

## Software Setup

### Step 1: Install ESP32 Firmware

#### Using Arduino IDE

1. Install [Arduino IDE](https://www.arduino.cc/en/software)
2. Add ESP32 board support:
   - File → Preferences → Additional Board Manager URLs:
     ```
     https://dl.espressif.com/dl/package_esp32_index.json
     ```
   - Tools → Board → Boards Manager → Search "esp32" → Install
3. Open `esp32-firmware/solar_tracker_firmware.ino`
4. Configure WiFi settings:
   ```cpp
   const char* WIFI_SSID = "YOUR_WIFI_SSID";
   const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
   ```
5. Select board: Tools → Board → ESP32 Dev Module
6. Select port: Tools → Port → (your USB port)
7. Upload the sketch

#### Using PlatformIO (Recommended)

1. Install [VSCode PlatformIO extension](https://platformio.org/)
2. Create new project or use existing `esp32-firmware/platformio.ini`
3. Build and upload

### Step 2: Find ESP32 IP Address

After uploading, open Serial Monitor (115200 baud):
```
Connecting to WiFi...
Connected!
IP: 192.168.1.100
HTTP server started
```

Note this IP address (e.g., `192.168.1.100`)

### Step 3: Test ESP32 Direct Connection

Open browser and navigate to:
```
http://<ESP32_IP>/status
```

You should see JSON response:
```json
{
  "pan": 180.0,
  "tilt": 30.0,
  "dustLevel": 0,
  "isCleaning": false,
  "ldrTop": 0,
  "ldrBottom": 0,
  "ldrLeft": 0,
  "ldrRight": 0,
  "ip": "192.168.1.100"
}
```

### Step 4: Setup Bridge Server (Optional but Recommended)

The bridge server provides:
- WebSocket support for real-time updates
- Multiple client support
- Connection pooling
- Error handling and reconnection

#### Install Dependencies

```bash
cd memorygame01
npm install express cors axios ws
```

#### Configure Bridge Server

Edit `server/esp32-bridge-server.js`:

```javascript
const ESP32_CONFIG = {
  host: '192.168.1.100',  // Your ESP32 IP
  port: 80,               // ESP32 web server port
  timeout: 5000,
  pollInterval: 2000
};
```

Or set environment variables:
```bash
export ESP32_HOST=192.168.1.100
export ESP32_PORT=80
```

#### Start Bridge Server

```bash
node server/esp32-bridge-server.js
```

You should see:
```
========================================
 ESP32 Bridge Server Running
 Port: 3001
 ESP32 Target: 192.168.1.100:80
========================================
```

### Step 5: Configure Web Application

#### Using Bridge Server (Recommended)

1. Open the web app in browser
2. Click the ESP32 Connection panel (top-right)
3. Select "Use Bridge Server"
4. Enter bridge URL (default: `http://localhost:3001`)
5. Click "Connect"

#### Direct Connection (No Bridge)

1. Open ESP32 Connection panel
2. Uncheck "Use Bridge Server"
3. Enter ESP32 IP and port
4. Click "Connect"

**Note**: Direct connection may have CORS issues. Bridge server is recommended.

## API Reference

### ESP32 Endpoints

#### GET /status
Get current status
```bash
curl http://<ESP32_IP>/status
```

#### GET /sensors
Get sensor readings
```bash
curl http://<ESP32_IP>/sensors
```

#### POST /control
Control pan/tilt/clean
```bash
curl -X POST http://<ESP32_IP>/control \
  -H "Content-Type: application/json" \
  -d '{"pan": 180, "tilt": 45, "clean": false}'
```

#### POST /motor
Control motors directly
```bash
curl -X POST http://<ESP32_IP>/motor \
  -H "Content-Type: application/json" \
  -d '{"pan_delta": 10, "tilt_delta": 5}'
```

#### POST /clean
Start cleaning cycle
```bash
curl -X POST http://<ESP32_IP>/clean \
  -H "Content-Type: application/json" \
  -d '{"duration": 5000}'
```

#### GET /health
Health check
```bash
curl http://<ESP32_IP>/health
```

### Bridge Server Endpoints

#### GET /api/status
Get bridge and ESP32 status

#### GET /api/esp32/status
Get ESP32 status (proxied)

#### GET /api/esp32/sensors
Get ESP32 sensors (proxied)

#### POST /api/esp32/control
Control ESP32 (proxied)

#### POST /api/esp32/config
Update ESP32 configuration
```bash
curl -X POST http://localhost:3001/api/esp32/config \
  -H "Content-Type: application/json" \
  -d '{"host": "192.168.1.100", "port": 80}'
```

## Calibration

### Motor Steps per Degree

Edit `solar_tracker_firmware.ino`:

```cpp
#define STEPS_PER_DEGREE 20  // Adjust for your motor
```

For stepper motors:
- 1.8° step angle = 200 steps/revolution = 0.55 steps/degree
- With 1:10 gear ratio = 5.5 steps/degree

For servo motors:
- Use servo.write(angle) instead of step/dir

### LDR Calibration

LDR values depend on ambient light. The firmware reads raw ADC values (0-4095 for ESP32).

Typical values:
- Direct sunlight: 3000-4000
- Indoor lighting: 1000-2000
- Dark: 0-500

### Auto-Tracking Thresholds

Edit in firmware:
```cpp
#define LIGHT_THRESHOLD 0.15  // Minimum light to track
#define DEADBAND 0.05         // Deadband for tracking
```

## Troubleshooting

### ESP32 Won't Connect to WiFi

1. Check SSID and password
2. Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
3. Check serial monitor for error messages
4. Try closer to router

### Motors Not Moving

1. Check power supply (motors need separate power)
2. Verify pin connections
3. Check motor driver enable pins
4. Reduce `MOTOR_SPEED` value (increase speed)

### Sensors Reading Incorrectly

1. Check wiring (LDRs need pull-down resistors)
2. Verify analog pins (some ESP32 pins can't be analog)
3. Add capacitor across LDR for noise reduction
4. Calibrate thresholds

### Web App Can't Connect

1. Verify ESP32 IP address hasn't changed
2. Check firewall settings
3. Try bridge server instead of direct connection
4. Check CORS settings

### Connection Drops

1. Add WiFi reconnection logic
2. Use static IP for ESP32
3. Check power supply stability
4. Reduce polling frequency

## Advanced Configuration

### Static IP for ESP32

Edit firmware:
```cpp
#include <WiFi.h>

IPAddress staticIP(192, 168, 1, 100);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);

void setup() {
  WiFi.config(staticIP, gateway, subnet);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}
```

### mDNS (Easy Access)

Add to firmware:
```cpp
#include <ESPmDNS.h>

void setup() {
  if (MDNS.begin("solar-tracker")) {
    Serial.println("mDNS responder started");
  }
}
```

Access via: `http://solar-tracker.local`

### OTA Updates

Add to firmware:
```cpp
#include <ArduinoOTA.h>

void setup() {
  ArduinoOTA.begin();
}

void loop() {
  ArduinoOTA.handle();
}
```

## Security Considerations

1. **No Authentication**: Current implementation has no auth. Add for production
2. **Local Network Only**: Keep ESP32 on local network
3. **Firewall**: Block external access to ESP32 port
4. **HTTPS**: Use HTTPS for bridge server in production

## Performance Tuning

- Reduce `pollInterval` for faster updates (increases network load)
- Adjust `MOTOR_SPEED` for smoother/faster movement
- Modify tracking algorithm in `AnimationController`
- Optimize sensor sampling rate

## Next Steps

1. Add authentication to ESP32 web server
2. Implement MQTT for better scalability
3. Add data logging to SD card
4. Implement weather API integration
5. Add manual override switches
6. Implement sunrise/sunset tracking

## Support

For issues or questions:
1. Check serial monitor output
2. Verify all connections
3. Test endpoints with curl/Postman
4. Review browser console for errors
