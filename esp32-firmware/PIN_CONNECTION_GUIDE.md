# ESP32 Solar Tracker - Pin Connection Guide

## Hardware Components
- **ESP32 WROOM-32** development board (Micro-USB)
- **L298N** dual H-bridge motor driver
- **2x DC Motors** (Pan rotation + Tilt angle)
- **4x LDR** light sensors (with 10kΩ resistors)
- **1x IR Dust Sensor** module
- **1x Relay Module** (for wiper/cleaning motor)
- **Battery** power supply

---

## ESP32 WROOM-32 Pin Layout

```
┌─────────────────────────────────────────────────────────┐
│  VIN  GND  D13  D12  D14  D27  D26  D25  D33  D32  D35  D34  VN  VP  EN  │  ← TOP ROW
│                                                          │
│  [Micro-USB]    [ESP32 Module]    [BOOT]  [EN]          │
│                                                          │
│  3V3  GND  D15  D2  D4  RX2  TX2  D5  D18  D13  D21  RX0  TX0  D22  D23  │  ← BOTTOM ROW
─────────────────────────────────────────────────────────┘
```

---

## Complete Wiring Guide

### 1. L298N Motor Driver Connections

The L298N driver controls both DC motors. It has 6 control pins and 4 motor output terminals.

#### L298N → ESP32 Control Pins

| L298N Pin | ESP32 GPIO | Function | Description |
|-----------|------------|----------|-------------|
| **IN1** | GPIO 25 (D25) | Pan Motor Forward | Controls pan motor direction (forward/right) |
| **IN2** | GPIO 26 (D26) | Pan Motor Reverse | Controls pan motor direction (reverse/left) |
| **ENA** | GPIO 27 (D27) | Pan Motor Speed | PWM speed control for pan motor (optional) |
| **IN3** | GPIO 14 (D14) | Tilt Motor Up | Controls tilt motor direction (up) |
| **IN4** | GPIO 12 (D12) | Tilt Motor Down | Controls tilt motor direction (down) |
| **ENB** | GPIO 13 (D13) | Tilt Motor Speed | PWM speed control for tilt motor (optional) |

#### L298N → DC Motor Connections

| L298N Terminal | Connection | Description |
|----------------|------------|-------------|
| **OUT1** | Pan Motor (+) | Pan motor positive terminal |
| **OUT2** | Pan Motor (-) | Pan motor negative terminal |
| **OUT3** | Tilt Motor (+) | Tilt motor positive terminal |
| **OUT4** | Tilt Motor (-) | Tilt motor negative terminal |

#### L298N Power Connections

| L298N Pin | Connection | Description |
|-----------|------------|-------------|
| **+12V** | Battery (+) | Motor power supply (7-12V) |
| **GND** | Battery (-) AND ESP32 GND | Common ground (MUST connect all grounds together) |
| **+5V** | Can power ESP32 VIN | Optional: L298N 5V regulator can power ESP32 |

> **Important:** If using ENA/ENB jumpers on L298N, remove them and connect to ESP32 GPIO pins for PWM speed control. If you want full speed always, connect ENA/ENB to +5V on L298N.

---

### 2. LDR Light Sensor Connections

Each LDR needs a 10kΩ resistor to form a voltage divider.

#### LDR → ESP32 Connections

| LDR Sensor | ESP32 GPIO | Resistor | Description |
|------------|------------|----------|-------------|
| **LDR Top** | GPIO 34 (D34) | 10kΩ to GND | Measures light from top |
| **LDR Bottom** | GPIO 35 (D35) | 10kΩ to GND | Measures light from bottom |
| **LDR Left** | GPIO 33 (D33) | 10kΩ to GND | Measures light from left |
| **LDR Right** | GPIO 39 (D39) | 10kΩ to GND | Measures light from right |

#### LDR Voltage Divider Circuit

```
3.3V ───┬──── LDR Sensor ────┬──── GPIO Pin (to ESP32)
         │                    │
         │               10kΩ Resistor
         │                    │
        GND ──────────────────┘
```

**Wiring Steps for Each LDR:**
1. Connect one LDR leg to **3.3V** on ESP32
2. Connect the other LDR leg to the **GPIO pin** (34, 35, 33, or 39)
3. Connect a **10kΩ resistor** from the GPIO pin to **GND**

---

### 3. IR Dust Sensor Connection

| IR Sensor Pin | ESP32 GPIO | Description |
|---------------|------------|-------------|
| **VCC** | 3.3V or 5V | Power supply |
| **GND** | GND | Ground |
| **OUT** | GPIO 4 (D4) | Digital output (HIGH=no dust, LOW=dust detected) |

> **Note:** The firmware uses internal pull-up resistor on GPIO 4, so the sensor reads HIGH (no dust) when not connected.

---

### 4. Relay Module (Cleaning/Wiper Motor)

| Relay Pin | ESP32 GPIO | Description |
|-----------|------------|-------------|
| **VCC** | 5V (or 3.3V depending on relay) | Power supply |
| **GND** | GND | Ground |
| **IN** | GPIO 32 (D32) | Control signal (HIGH=relay on) |

#### Relay → Wiper Motor Connection

```
Battery (+) ──── Relay COM terminal
Relay NO terminal ──── Wiper Motor (+)
Wiper Motor (-) ──── Battery (-)
```

---

### 5. Power Supply Connections

#### Option A: Battery → L298N → ESP32 (Recommended)
```
Battery (+) ──── L298N +12V
Battery (-) ──── L298N GND ──── ESP32 GND
L298N +5V ──── ESP32 VIN (optional, if L298N has 5V regulator)
```

#### Option B: Separate Power Supplies
```
Battery 1 (+) ──── L298N +12V (motors)
Battery 1 (-) ──── L298N GND

Battery 2 (+) ──── ESP32 VIN or USB power
Battery 2 (-) ──── ESP32 GND

⚠️ IMPORTANT: Connect L298N GND to ESP32 GND (common ground)
```

---

## Complete Pin Summary Table

| Component | ESP32 Pin | Pin Label on Board | Type |
|-----------|-----------|-------------------|------|
| Pan Motor Forward | GPIO 25 | D25 | Digital OUT |
| Pan Motor Reverse | GPIO 26 | D26 | Digital OUT |
| Pan Motor Speed (PWM) | GPIO 27 | D27 | PWM OUT |
| Tilt Motor Up | GPIO 14 | D14 | Digital OUT |
| Tilt Motor Down | GPIO 12 | D12 | Digital OUT |
| Tilt Motor Speed (PWM) | GPIO 13 | D13 | PWM OUT |
| LDR Top | GPIO 34 | D34 | Analog IN |
| LDR Bottom | GPIO 35 | D35 | Analog IN |
| LDR Left | GPIO 33 | D33 | Analog IN |
| LDR Right | GPIO 39 | D39 | Analog IN |
| IR Dust Sensor | GPIO 4 | D4 | Digital IN |
| Relay (Wiper) | GPIO 32 | D32 | Digital OUT |
| Power | 3.3V | 3V3 | Power OUT |
| Power | 5V | VIN | Power IN |
| Ground | GND | GND | Ground |

---

## Wiring Checklist

- [ ] L298N IN1 → ESP32 GPIO 25 (D25)
- [ ] L298N IN2 → ESP32 GPIO 26 (D26)
- [ ] L298N ENA → ESP32 GPIO 27 (D27) [or +5V for full speed]
- [ ] L298N IN3 → ESP32 GPIO 14 (D14)
- [ ] L298N IN4 → ESP32 GPIO 12 (D12)
- [ ] L298N ENB → ESP32 GPIO 13 (D13) [or +5V for full speed]
- [ ] L298N OUT1 → Pan Motor (+)
- [ ] L298N OUT2 → Pan Motor (-)
- [ ] L298N OUT3 → Tilt Motor (+)
- [ ] L298N OUT4 → Tilt Motor (-)
- [ ] L298N +12V → Battery (+)
- [ ] L298N GND → Battery (-) AND ESP32 GND
- [ ] LDR Top → GPIO 34 (D34) with 10kΩ to GND
- [ ] LDR Bottom → GPIO 35 (D35) with 10kΩ to GND
- [ ] LDR Left → GPIO 33 (D33) with 10kΩ to GND
- [ ] LDR Right → GPIO 39 (D39) with 10kΩ to GND
- [ ] IR Sensor OUT → GPIO 4 (D4)
- [ ] IR Sensor VCC → 3.3V or 5V
- [ ] IR Sensor GND → GND
- [ ] Relay IN → GPIO 32 (D32)
- [ ] Relay VCC → 5V or 3.3V
- [ ] Relay GND → GND
- [ ] **ALL GROUNDS CONNECTED TOGETHER**

---

## Troubleshooting

### Motors Not Moving
1. Check L298N power supply (7-12V to +12V terminal)
2. Verify IN1/IN2 or IN3/IN4 signals with multimeter
3. Ensure ENA/ENB are connected (to GPIO or +5V)
4. Check motor connections to OUT1-OUT4

### LDR Readings Always 0 or 4095
1. Verify 10kΩ resistor is connected to GND
2. Check LDR is connected to 3.3V
3. Verify GPIO pin is correct (34, 35, 33, 39 are input-only)

### IR Sensor Not Working
1. Check VCC connection (3.3V or 5V)
2. Verify OUT is connected to GPIO 4
3. Firmware uses pull-up, so unconnected pin reads HIGH (no dust)

### ESP32 Not Booting
1. Check USB connection or VIN power
2. Press EN button to reset
3. Hold BOOT button while pressing EN to enter flash mode

---

## Firmware Upload Instructions

1. Install **Thonny IDE** from https://thonny.org/
2. Connect ESP32 via Micro-USB cable
3. Open Thonny → Tools → Options → Interpreter
4. Select "MicroPython (ESP32)" and correct COM port
5. Open `solar_tracker_hotspot.py` in Thonny
6. File → Save As → Select "MicroPython device" → Name it `main.py`
7. Press the EN button on ESP32 to restart
8. Watch the serial console for startup messages
