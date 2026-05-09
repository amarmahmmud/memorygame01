# ESP32 Integration Guide for Solar Tracker

## Quick Start

### 1. Flash ESP32
```bash
# Open Arduino IDE
# Load: esp32-firmware/solar_tracker_firmware.ino
# Configure WiFi settings
# Upload to ESP32
```

### 2. Start Bridge Server (Recommended)
```bash
cd memorygame01/server
npm install
npm start
```

### 3. Connect Web App
- Open the solar tracker web app
- Click the ESP32 Connection panel (top-right)
- Enter ESP32 IP or bridge URL
- Click "Connect"

## What's Included

### Files Created

1. **`esp32-firmware/solar_tracker_firmware.ino`**
   - ESP32 firmware for motor control and sensor reading
   - WiFi connectivity
   - REST API endpoints

2. **`esp32-firmware/README.md`**
   - Firmware-specific documentation
   - Pin configurations
   - API reference

3. **`server/esp32-bridge-server.js`**
   - Node.js bridge server
   - WebSocket support
   - ESP32 proxy

4. **`server/package.json`**
   - Bridge server dependencies

5. **`components/solar-tracker/ESP32Connection.tsx`**
   - React component for ESP32 connection UI
   - Real-time status display
   - Control interface

6. **`ESP32_SETUP_GUIDE.md`**
   - Complete setup instructions
   - Troubleshooting guide
   - API reference

## Architecture

```

  Web Browser    
  (Next.js App)  

         
         
                   
          Direct    Bridge Server   
          HTTP      (Node.js)       
                    
                                         
                                         
                               
                                ESP32    
                                Device   
                               
                                         
                                         
                               
                                Motors   
                                Sensors  
                               
```

## Connection Methods

### Method 1: Bridge Server (Recommended)

**Pros:**
- WebSocket support for real-time updates
- Better error handling
- Multiple client support
- CORS handled properly

**Setup:**
1. Start bridge server: `node server/esp32-bridge-server.js`
2. Configure ESP32 IP in server settings
3. Connect web app to `http://localhost:3001`

### Method 2: Direct Connection

**Pros:**
- No additional server needed
- Lower latency

**Cons:**
- CORS issues may occur
- No WebSocket support
- Limited error handling

**Setup:**
1. Find ESP32 IP address
2. Connect web app directly to `http://<ESP32_IP>`

## Hardware Setup

### Minimal Configuration

```
ESP32 Pinout:
- GPIO 25, 26 → Pan Motor (Step, Dir)
- GPIO 27, 14 → Tilt Motor (Step, Dir)
- GPIO 32 → Cleaner Motor (PWM)
- GPIO 4 → IR Dust Sensor (Digital)
- GPIO 34 → LDR Top (Analog)
- GPIO 35 → LDR Bottom (Analog)
- GPIO 33 → LDR Left (Analog)
- GPIO 39 → LDR Right (Analog)
```

### Motor Driver Examples

**Stepper Motor (A4988 Driver):**
```
ESP32 GPIO 25 → A4988 STEP
ESP32 GPIO 26 → A4988 DIR
A4988 VDD → 5V
A4988 GND → GND
A4988 VMOT → 12V Supply
A4988 1A,1B → Stepper Coil A
A4988 2A,2B → Stepper Coil B
```

**Servo Motor:**
```
ESP32 GPIO 25 → Servo Signal
Servo VCC → 5V
Servo GND → GND
```

### LDR Circuit

```
3.3V ──┬── LDR ──┬── Analog Pin
       │         │
      10kΩ       │
       │         │
      GND ───────┘
```

## API Usage

### From Web App

```javascript
// Connect to ESP32
const response = await fetch('http://localhost:3001/api/esp32/control', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pan: 180,
    tilt: 45,
    clean: false
  })
});

// Get sensor data
const sensors = await fetch('http://localhost:3001/api/esp32/sensors');
const data = await sensors.json();
```

### From ESP32

```cpp
// Read sensors
int ldrValue = analogRead(PIN_LDR_TOP);

// Move motor
digitalWrite(PIN_PAN_DIR, HIGH);
digitalWrite(PIN_PAN_STEP, HIGH);
delayMicroseconds(10);
digitalWrite(PIN_PAN_STEP, LOW);
```

## Testing

### Test ESP32 Directly

```bash
# Check status
curl http://192.168.1.100/status

# Control pan/tilt
curl -X POST http://192.168.1.100/control \
  -H "Content-Type: application/json" \
  -d '{"pan": 90, "tilt": 60}'

# Get sensors
curl http://192.168.1.100/sensors
```

### Test Bridge Server

```bash
# Check bridge status
curl http://localhost:3001/api/status

# Control via bridge
curl -X POST http://localhost:3001/api/esp32/control \
  -H "Content-Type: application/json" \
  -d '{"pan": 90, "tilt": 60}'
```

## Troubleshooting

### ESP32 Not Connecting to WiFi

1. Verify SSID and password
2. Check 2.4GHz network (not 5GHz)
3. Monitor serial output
4. Try static IP configuration

### Motors Not Moving

1. Check external power supply
2. Verify motor driver connections
3. Test with simple Arduino sketch
4. Adjust `MOTOR_SPEED` in firmware

### Web App Can't Connect

1. Verify ESP32 IP address
2. Check firewall settings
3. Try bridge server mode
4. Check browser console for CORS errors

### Sensors Reading Incorrectly

1. Check LDR wiring (pull-down resistor)
2. Verify analog pin assignments
3. Add filtering capacitor
4. Calibrate thresholds

## Customization

### Modify Tracking Algorithm

Edit `solar_tracker_firmware.ino`:

```cpp
// In loop() function
if (trackingActive) {
  // Your custom tracking logic
  int panDiff = rightInt - leftInt;
  if (abs(panDiff) > DEADBAND) {
    targetPan += panDiff * 0.8;
  }
}
```

### Add New Sensors

1. Define pin in firmware
2. Add to `readSensors()` function
3. Add to `handleSensors()` response
4. Update web app UI

### Change Motor Type

**For Servo Motors:**
```cpp
#include <Servo.h>
Servo panServo, tiltServo;

void setup() {
  panServo.attach(PIN_PAN_SERVO);
  tiltServo.attach(PIN_TILT_SERVO);
}

void loop() {
  panServo.write(targetPan);
  tiltServo.write(targetTilt);
}
```

## Performance Optimization

- Reduce `pollInterval` for faster updates
- Increase `MOTOR_SPEED` for faster movement
- Optimize sensor sampling rate
- Use hardware PWM for motors
- Implement interrupt-based motor control

## Security

### Current State

⚠️ **No authentication** - Anyone on the network can control the system

### Recommended Improvements

1. Add HTTP Basic Auth to ESP32
2. Use HTTPS for bridge server
3. Implement API key authentication
4. Add IP whitelisting
5. Enable CORS restrictions

## Production Deployment

### Checklist

- [ ] Change default WiFi credentials
- [ ] Set static IP for ESP32
- [ ] Add authentication
- [ ] Configure firewall rules
- [ ] Set up monitoring/logging
- [ ] Implement auto-reconnection
- [ ] Add error recovery
- [ ] Test failover scenarios
- [ ] Document maintenance procedures

## Support & Resources

### Documentation

- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
- [Arduino ESP32 Reference](https://docs.espressif.com/projects/arduino-esp32/)
- [PlatformIO ESP32](https://docs.platformio.org/en/latest/boards/espressif32/esp32.html)

### Community

- ESP32 Forum: https://esp32.com/
- Arduino Forum: https://forum.arduino.cc/
- Stack Overflow: https://stackoverflow.com/questions/tagged/esp32

## License

MIT License - See individual files for details

## Version History

- v1.0.0 - Initial release
  - ESP32 firmware
  - Bridge server
  - Web UI integration
  - Complete documentation
