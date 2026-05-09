# Quick Start: Connect ESP32 to Solar Tracker

## What You Need

✅ ESP32 development board  
✅ USB cable for programming  
✅ Motor driver (A4988, L298N, etc.)  
✅ 2x stepper/servo motors  
✅ 4x LDR sensors + 10kΩ resistors  
✅ IR dust sensor  
✅ External power supply for motors (12V recommended)  

## 5-Minute Setup

### Step 1: Flash the ESP32 (2 minutes)

1. Open Arduino IDE
2. Install ESP32 board support (File → Preferences → Additional Boards Manager)
3. Open `esp32-firmware/solar_tracker_firmware.ino`
4. Update WiFi credentials:
   ```cpp
   const char* WIFI_SSID = "YourWiFiName";
   const char* WIFI_PASS = "YourWiFiPassword";
   ```
5. Select: Tools → Board → ESP32 Dev Module
6. Select your USB port
7. Click **Upload**

### Step 2: Find ESP32 IP (30 seconds)

Open Serial Monitor (115200 baud):
```
Connecting to WiFi...
Connected!
IP: 192.168.1.100
```

Note this IP address!

### Step 3: Start Bridge Server (1 minute)

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

### Step 4: Configure Bridge (30 seconds)

Edit `server/esp32-bridge-server.js`:
```javascript
const ESP32_CONFIG = {
  host: '192.168.1.100',  // Your ESP32 IP
  port: 80,
  timeout: 5000,
  pollInterval: 2000
};
```

Restart the server.

### Step 5: Connect Web App (30 seconds)

1. Open the solar tracker web app
2. Click **SIM** button (top-left) to switch to **LIVE** mode
3. ESP32 Connection panel appears
4. Enter bridge URL: `http://localhost:3001`
5. Click **Connect**

✅ **Done!** Your physical ESP32 is now controlling the solar tracker!

## Wiring Guide

### Minimal Setup

```
ESP32              Motor Driver
─────────────────────────────────
GPIO 25  ────────> STEP (Pan)
GPIO 26  ────────> DIR  (Pan)
GPIO 27  ────────> STEP (Tilt)
GPIO 14  ────────> DIR  (Tilt)
GPIO 32  ────────> PWM  (Cleaner)
GPIO 4   ────────> IN   (IR Dust)
GPIO 34  ────────> A0   (LDR Top)
GPIO 35  ────────> A1   (LDR Bottom)
GPIO 33  ────────> A2   (LDR Left)
GPIO 39  ────────> A3   (LDR Right)
```

### LDR Circuit (repeat for each)

```
3.3V ──┬── LDR ──┬── ESP32 Analog Pin
       │         │
      10kΩ       │
       │         │
      GND ───────┘
```

## Test Commands

### Test ESP32 Direct
```bash
curl http://192.168.1.100/status
```

### Test Bridge Server
```bash
curl http://localhost:3001/api/status
```

### Control via Web App
- Use sliders in Sun Controller panel
- Click "Clean Now" button
- Watch motors move!

## Troubleshooting

| Issue | Solution |
|-------|----------|
| ESP32 won't upload | Hold BOOT button during upload |
| Can't connect to WiFi | Check SSID/password, use 2.4GHz |
| Motors not moving | Check external power supply |
| Web app can't connect | Verify bridge server is running |
| Sensors reading 0 | Check LDR wiring (pull-down resistor) |
| CORS errors | Use bridge server, not direct connection |

## Next Steps

1. **Calibrate motors**: Adjust `STEPS_PER_DEGREE` in firmware
2. **Tune tracking**: Modify thresholds in `AnimationController`
3. **Add features**: Implement sunrise/sunset tracking
4. **Secure**: Add authentication to ESP32 web server

## Files Overview

```
memorygame01/
├── esp32-firmware/
│   ├── solar_tracker_firmware.ino  # ESP32 code
│   └── README.md                    # Firmware docs
├── server/
│   ├── esp32-bridge-server.js       # Bridge server
│   └── package.json                 # Dependencies
├── components/solar-tracker/
│   ├── ESP32Connection.tsx          # Connection UI
│   └── solar-tracker-scene.tsx      # Main scene (modified)
├── ESP32_SETUP_GUIDE.md             # Detailed setup
├── ESP32_INTEGRATION_README.md      # Integration guide
└── QUICKSTART_ESP32.md              # This file
```

## Support

For detailed instructions, see:
- **ESP32_SETUP_GUIDE.md** - Complete setup with troubleshooting
- **ESP32_INTEGRATION_README.md** - Architecture and API reference
- **esp32-firmware/README.md** - Firmware-specific details

## Demo Video

Watch your solar tracker come to life! The 3D model will mirror your physical device's movements in real-time. ☀️🔄
