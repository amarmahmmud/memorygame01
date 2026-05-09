# ESP32 Solar Tracker Firmware

## Overview
This firmware runs on the ESP32 microcontroller to control a physical solar panel tracking system.

## Hardware Connections

### Motors
- **Pan Motor (Azimuth)**: Stepper or Servo on GPIO 25, 26 (step, dir) or PWM pin
- **Tilt Motor (Elevation)**: Stepper or Servo on GPIO 27, 14 (step, dir) or PWM pin
- **Cleaning Motor**: DC motor driver on GPIO 32

### Sensors
- **LDR Top**: Analog pin GPIO 34 (ADC1_CH6)
- **LDR Bottom**: Analog pin GPIO 35 (ADC1_CH7)
- **LDR Left**: Analog pin GPIO 32 (if available) or GPIO 33 (ADC1_CH5)
- **LDR Right**: Analog pin GPIO 39 (ADC1_CH3)
- **IR Dust Sensor**: Digital pin GPIO 4

### Power
- ESP32 powered via USB or external 5V supply
- Motors may require external power supply

## Pin Configuration

```
#define PIN_PAN_STEP      25
#define PIN_PAN_DIR       26
#define PIN_TILT_STEP     27
#define PIN_TILT_DIR      14
#define PIN_CLEANER_MOTOR 32
#define PIN_IR_DUST       4
#define PIN_LDR_TOP       34
#define PIN_LDR_BOTTOM    35
#define PIN_LDR_LEFT      33
#define PIN_LDR_RIGHT     39
```

## WiFi Configuration

The ESP32 creates an access point or connects to your WiFi network.
Edit `wifi_config.h` to set your network credentials.

## API Endpoints

The ESP32 runs a web server with these endpoints:

- `GET /status` - Get current sensor readings and motor positions
- `POST /control` - Send control commands
  - Body: `{"pan": 180, "tilt": 45, "clean": false}`
- `GET /sensors` - Get raw LDR and IR sensor values
- `POST /motor` - Control motors directly
  - Body: `{"pan_delta": 10, "tilt_delta": 5}`
- `POST /clean` - Start cleaning cycle
  - Body: `{"duration": 5000}`

## Installation

1. Install Arduino IDE or PlatformIO
2. Install ESP32 board support
3. Install required libraries:
   - WiFi
   - WebServer
   - ESPmDNS (optional)
4. Upload this firmware to your ESP32
5. Connect via USB or WiFi

## Serial Monitor

Baud rate: 115200
Monitor for debug output and connection status.
