# Solar Tracker ESP32 Firmware - Hotspot Mode (DC Motor Version)
# 
# This version uses DC motors via L298N driver for Pan and Tilt
# Creates a WiFi hotspot for local control - no internet required
#
# Hardware:
# - ESP32 WROOM-32 development board
# - L298N dual H-bridge motor driver (2 DC motors)
# - 4x LDR light sensors (voltage divider configuration)
# - 1x IR dust sensor module
# - 1x Relay module for wiper/cleaning motor
# - Battery power supply
#
# Setup:
# 1. Install Thonny IDE (https://thonny.org/)
# 2. Connect ESP32 via USB (Micro-USB)
# 3. Install MicroPython firmware on ESP32
# 4. Open this file in Thonny and upload to ESP32 as main.py

import network
import socket
import machine
import time
import json
from machine import Pin, ADC, PWM

# ============================================================
# CONFIGURATION
# ============================================================

# Hotspot Settings
HOTSPOT_SSID = "SolarTracker"
HOTSPOT_PASS = "solar1234"

# ============================================================
# PIN DEFINITIONS - ESP32 WROOM-32 Board
# ============================================================
# Based on the ESP32 WROOM-32 development board pinout:
# Top row:    VIN GND D13 D12 D14 D27 D26 D25 D33 D32 D35 D34 VN VP EN
# Bottom row: 3V3 GND D15 D2 D4 RX2 TX2 D5 D18 D13 D21 RX0 TX0 D22 D23

# --- L298N Motor Driver Connections ---
# Pan Motor (Left/Right rotation) - Connected to L298N OUT1/OUT2
PIN_PAN_IN1 = machine.Pin(25, machine.Pin.OUT)   # L298N IN1 - Pan forward
PIN_PAN_IN2 = machine.Pin(26, machine.Pin.OUT)   # L298N IN2 - Pan reverse
PIN_PAN_ENA = machine.Pin(27, machine.Pin.OUT)   # L298N ENA - Pan speed (PWM capable)

# Tilt Motor (Up/Down angle) - Connected to L298N OUT3/OUT4
PIN_TILT_IN3 = machine.Pin(14, machine.Pin.OUT)  # L298N IN3 - Tilt up
PIN_TILT_IN4 = machine.Pin(12, machine.Pin.OUT)  # L298N IN4 - Tilt down
PIN_TILT_ENB = machine.Pin(13, machine.Pin.OUT)  # L298N ENB - Tilt speed (PWM capable)

# --- Sensor Connections ---
PIN_CLEANER = machine.Pin(32, machine.Pin.OUT)   # Relay for wiper/cleaning motor
PIN_IR_DUST = machine.Pin(4, machine.Pin.IN, machine.Pin.PULL_UP)  # IR dust sensor (with pull-up)

# --- LDR Light Sensors (Analog Inputs - ADC) ---
# Note: GPIO 34, 35, 36, 39 are input-only pins, perfect for sensors
ADC_LDR_TOP = ADC(machine.Pin(34))
ADC_LDR_BOTTOM = ADC(machine.Pin(35))
ADC_LDR_LEFT = ADC(machine.Pin(33))
ADC_LDR_RIGHT = ADC(machine.Pin(39))

# Configure ADC attenuation for full range (0-3.3V)
ADC_LDR_TOP.atten(ADC.ATTN_11DB)
ADC_LDR_BOTTOM.atten(ADC.ATTN_11DB)
ADC_LDR_LEFT.atten(ADC.ATTN_11DB)
ADC_LDR_RIGHT.atten(ADC.ATTN_11DB)

# Configure PWM for motor speed control (optional - can tie ENA/ENB to 5V for full speed)
pwm_pan = PWM(PIN_PAN_ENA)
pwm_pan.freq(1000)  # 1kHz PWM frequency
pwm_pan.duty(512)   # 50% duty cycle (adjust as needed)

pwm_tilt = PWM(PIN_TILT_ENB)
pwm_tilt.freq(1000)
pwm_tilt.duty(512)

# ============================================================
# MOTOR SETTINGS
# ============================================================

# DC Motor timing (milliseconds per degree at current speed)
MS_PER_DEGREE_PAN = 50   # Adjust based on your motor speed
MS_PER_DEGREE_TILT = 50  # Adjust based on your motor speed

# Motor deadband - minimum movement to avoid jitter
DEADBAND_ANGLE = 1.0

# ============================================================
# TRACKING SETTINGS
# ============================================================

# Light threshold for night/low light mode (0-1 range, normalized ADC)
LIGHT_THRESHOLD = 0.15

# Tracking deadband - minimum LDR difference to trigger movement
TRACKING_DEADBAND = 0.05

# Home position (used for night mode and startup)
HOME_PAN = 180.0
HOME_TILT = 30.0

# ============================================================
# STATE VARIABLES
# ============================================================

current_pan = HOME_PAN
current_tilt = HOME_TILT
target_pan = HOME_PAN
target_tilt = HOME_TILT

ldr_top = 0
ldr_bottom = 0
ldr_left = 0
ldr_right = 0
dust_level = 0
is_cleaning = False
cleaning_progress = 0.0
cleaning_start_time = 0
cleaning_duration = 5000

# Motor state tracking (for non-blocking control)
pan_motor_active = False
tilt_motor_active = False
pan_motor_start_time = 0
tilt_motor_start_time = 0
pan_motor_duration = 0
tilt_motor_duration = 0
pan_motor_direction = 0  # 0=stop, 1=forward, 2=reverse
tilt_motor_direction = 0  # 0=stop, 1=up, 2=down

# Timing
last_motor_update = 0
last_sensor_read = 0
is_homed = False
is_night_mode = False

# Hotspot interface (global for access in handle_request)
ap = None

# ============================================================
# MOTOR FUNCTIONS - DC Motor Control via L298N
# ============================================================

def stop_all_motors():
    """Stop all motors immediately"""
    global pan_motor_active, tilt_motor_active, pan_motor_direction, tilt_motor_direction
    
    # Stop Pan motor
    PIN_PAN_IN1.value(0)
    PIN_PAN_IN2.value(0)
    pan_motor_active = False
    pan_motor_direction = 0
    
    # Stop Tilt motor
    PIN_TILT_IN3.value(0)
    PIN_TILT_IN4.value(0)
    tilt_motor_active = False
    tilt_motor_direction = 0

def start_pan_motor(direction, duration_ms):
    """Start pan motor in given direction for specified duration (non-blocking)"""
    global pan_motor_active, pan_motor_start_time, pan_motor_duration, pan_motor_direction
    
    stop_pan_motor()  # Stop current movement first
    
    if direction == 1:  # Forward (e.g., clockwise/right)
        PIN_PAN_IN1.value(1)
        PIN_PAN_IN2.value(0)
    elif direction == 2:  # Reverse (e.g., counter-clockwise/left)
        PIN_PAN_IN1.value(0)
        PIN_PAN_IN2.value(1)
    else:
        return  # direction 0 = stop
    
    pan_motor_active = True
    pan_motor_start_time = time.ticks_ms()
    pan_motor_duration = duration_ms
    pan_motor_direction = direction

def stop_pan_motor():
    """Stop pan motor"""
    PIN_PAN_IN1.value(0)
    PIN_PAN_IN2.value(0)
    pan_motor_active = False
    pan_motor_direction = 0

def start_tilt_motor(direction, duration_ms):
    """Start tilt motor in given direction for specified duration (non-blocking)"""
    global tilt_motor_active, tilt_motor_start_time, tilt_motor_duration, tilt_motor_direction
    
    stop_tilt_motor()  # Stop current movement first
    
    if direction == 1:  # Up
        PIN_TILT_IN3.value(1)
        PIN_TILT_IN4.value(0)
    elif direction == 2:  # Down
        PIN_TILT_IN3.value(0)
        PIN_TILT_IN4.value(1)
    else:
        return  # direction 0 = stop
    
    tilt_motor_active = True
    tilt_motor_start_time = time.ticks_ms()
    tilt_motor_duration = duration_ms
    tilt_motor_direction = direction

def stop_tilt_motor():
    """Stop tilt motor"""
    PIN_TILT_IN3.value(0)
    PIN_TILT_IN4.value(0)
    tilt_motor_active = False
    tilt_motor_direction = 0

def update_motor_state():
    """Check if timed motors should stop (non-blocking)"""
    global pan_motor_active, tilt_motor_active, current_pan, current_tilt
    
    current_time = time.ticks_ms()
    
    # Check Pan motor timeout
    if pan_motor_active:
        elapsed = time.ticks_diff(current_time, pan_motor_start_time)
        if elapsed >= pan_motor_duration:
            stop_pan_motor()
            # Update position based on direction and duration
            degrees_moved = (pan_motor_duration / MS_PER_DEGREE_PAN)
            if pan_motor_direction == 1:
                current_pan = (current_pan + degrees_moved) % 360
            elif pan_motor_direction == 2:
                current_pan = (current_pan - degrees_moved) % 360
    
    # Check Tilt motor timeout
    if tilt_motor_active:
        elapsed = time.ticks_diff(current_time, tilt_motor_start_time)
        if elapsed >= tilt_motor_duration:
            stop_tilt_motor()
            # Update position based on direction and duration
            degrees_moved = (tilt_motor_duration / MS_PER_DEGREE_TILT)
            if tilt_motor_direction == 1:
                current_tilt = min(80, current_tilt + degrees_moved)
            elif tilt_motor_direction == 2:
                current_tilt = max(0, current_tilt - degrees_moved)

def move_to_target():
    """Move motors towards target position (non-blocking, one step at a time)"""
    global current_pan, current_tilt
    
    # Don't move if any motor is already active
    if pan_motor_active or tilt_motor_active:
        return
    
    # Calculate pan difference (handle 360 wraparound)
    pan_diff = target_pan - current_pan
    if pan_diff > 180:
        pan_diff -= 360
    elif pan_diff < -180:
        pan_diff += 360
    
    # Calculate tilt difference
    tilt_diff = target_tilt - current_tilt
    
    # Move pan motor if needed
    if abs(pan_diff) > DEADBAND_ANGLE:
        direction = 1 if pan_diff > 0 else 2
        # Move in small increments (5 degrees at a time)
        move_degrees = min(abs(pan_diff), 5)
        duration = int(move_degrees * MS_PER_DEGREE_PAN)
        start_pan_motor(direction, duration)
        return  # Only move one motor at a time
    
    # Move tilt motor if needed
    if abs(tilt_diff) > DEADBAND_ANGLE:
        direction = 1 if tilt_diff > 0 else 2
        # Move in small increments (5 degrees at a time)
        move_degrees = min(abs(tilt_diff), 5)
        duration = int(move_degrees * MS_PER_DEGREE_TILT)
        start_tilt_motor(direction, duration)

def set_pan(angle):
    """Set target pan angle"""
    global target_pan
    target_pan = angle % 360

def set_tilt(angle):
    """Set target tilt angle"""
    global target_tilt
    target_tilt = max(0, min(80, angle))

# ============================================================
# HOMING FUNCTION
# ============================================================

def home_motors():
    """Move to home position at startup"""
    global current_pan, current_tilt, target_pan, target_tilt, is_homed
    
    print("Homing: Moving to home position...")
    
    # Set target to home position
    target_pan = HOME_PAN
    target_tilt = HOME_TILT
    
    # Wait until motors reach home position
    timeout = time.ticks_ms() + 30000  # 30 second timeout
    while time.ticks_ms() < timeout:
        update_motor_state()
        move_to_target()
        
        # Check if we've reached the target
        pan_diff = target_pan - current_pan
        if pan_diff > 180:
            pan_diff -= 360
        elif pan_diff < -180:
            pan_diff += 360
        
        if abs(pan_diff) < DEADBAND_ANGLE and abs(target_tilt - current_tilt) < DEADBAND_ANGLE:
            break
        
        time.sleep_ms(50)
    
    stop_all_motors()
    is_homed = True
    print(f"Homing complete: Pan={current_pan:.1f}°, Tilt={current_tilt:.1f}°")

# ============================================================
# SENSOR FUNCTIONS
# ============================================================

def read_ldr(pin):
    """Read LDR sensor with averaging"""
    samples = 5
    total = 0
    for _ in range(samples):
        total += pin.read()
        time.sleep_ms(10)
    return total // samples

def read_sensors():
    """Read all sensors"""
    global ldr_top, ldr_bottom, ldr_left, ldr_right, dust_level
    
    ldr_top = read_ldr(ADC_LDR_TOP)
    ldr_bottom = read_ldr(ADC_LDR_BOTTOM)
    ldr_left = read_ldr(ADC_LDR_LEFT)
    ldr_right = read_ldr(ADC_LDR_RIGHT)
    
    # IR dust sensor: PULL_UP means HIGH=1 (no dust), LOW=0 (dust detected)
    dust_level = 0 if PIN_IR_DUST.value() else 100

def get_sensor_voltages():
    """Get LDR voltages"""
    return {
        'top': round(ldr_top * 3.3 / 4095, 2),
        'bottom': round(ldr_bottom * 3.3 / 4095, 2),
        'left': round(ldr_left * 3.3 / 4095, 2),
        'right': round(ldr_right * 3.3 / 4095, 2)
    }

# ============================================================
# AUTO-TRACKING WITH NIGHT MODE
# ============================================================

def auto_track():
    """Auto-track the sun based on LDR readings"""
    global target_pan, target_tilt, is_night_mode
    
    # Calculate average light intensity (normalized 0-1)
    avg_intensity = (ldr_top + ldr_bottom + ldr_left + ldr_right) / 4 / 4095
    
    # Night / Low Light Mode
    if avg_intensity < LIGHT_THRESHOLD:
        if not is_night_mode:
            print("Night mode: Moving to home position")
            is_night_mode = True
        target_pan = HOME_PAN
        target_tilt = HOME_TILT
        return
    
    # Day mode - track the sun
    is_night_mode = False
    
    # Calculate differences
    left_right_diff = (ldr_left - ldr_right) / 4095
    top_bottom_diff = (ldr_top - ldr_bottom) / 4095
    
    # Adjust pan based on left-right difference
    if abs(left_right_diff) > TRACKING_DEADBAND:
        target_pan -= left_right_diff * 10
        target_pan = target_pan % 360
    
    # Adjust tilt based on top-bottom difference
    if abs(top_bottom_diff) > TRACKING_DEADBAND:
        target_tilt += top_bottom_diff * 10
        target_tilt = max(0, min(80, target_tilt))

# ============================================================
# CLEANING FUNCTIONS
# ============================================================

def start_cleaning(duration_ms=5000):
    """Start the cleaning/wiper motor"""
    global is_cleaning, cleaning_progress, cleaning_start_time, cleaning_duration
    is_cleaning = True
    cleaning_progress = 0.0
    cleaning_start_time = time.ticks_ms()
    cleaning_duration = duration_ms
    PIN_CLEANER.value(1)

def stop_cleaning():
    """Stop the cleaning/wiper motor"""
    global is_cleaning
    is_cleaning = False
    PIN_CLEANER.value(0)

# ============================================================
# HTML CONTROL PAGE
# ============================================================

HTML_PAGE = """<!DOCTYPE html>
<html>
<head>
    <title>Solar Tracker Control</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a2e; color: #eee; }
        .card { background: #16213e; padding: 20px; margin: 10px 0; border-radius: 10px; }
        h1 { color: #00d4ff; text-align: center; }
        .status { display: flex; justify-content: space-between; }
        .sensor { text-align: center; padding: 10px; }
        .sensor-value { font-size: 2em; color: #00d4ff; }
        button { background: #00d4ff; color: #000; border: none; padding: 15px; margin: 5px; border-radius: 5px; font-size: 16px; width: 100%; }
        button:hover { background: #00a8cc; }
        input { width: 100%; padding: 10px; margin: 5px 0; background: #0f3460; color: #fff; border: none; border-radius: 5px; }
        .position { font-size: 1.5em; text-align: center; }
        .mode { font-size: 0.9em; padding: 5px 10px; border-radius: 5px; display: inline-block; }
        .mode-day { background: #ff9800; color: #000; }
        .mode-night { background: #2196f3; color: #fff; }
    </style>
</head>
<body>
    <h1>🌞 Solar Tracker</h1>
    
    <div class="card">
        <h2>Status</h2>
        <div class="position">Pan: <span id="pan">180</span>°</div>
        <div class="position">Tilt: <span id="tilt">30</span>°</div>
        <div style="text-align: center; margin-top: 10px;">
            Mode: <span id="mode" class="mode mode-day">DAY</span>
        </div>
    </div>
    
    <div class="card">
        <h2>Control</h2>
        <button onclick="goHome()">Go Home</button>
        <button onclick="startClean()">Start Cleaning</button>
    </div>
    
    <div class="card">
        <h2>Sensors</h2>
        <div class="status">
            <div class="sensor">Top: <div class="sensor-value" id="top">0</div></div>
            <div class="sensor">Bottom: <div class="sensor-value" id="bottom">0</div></div>
        </div>
        <div class="status">
            <div class="sensor">Left: <div class="sensor-value" id="left">0</div></div>
            <div class="sensor">Right: <div class="sensor-value" id="right">0</div></div>
        </div>
        <div class="sensor">Dust: <span id="dust">0</span>%</div>
    </div>
    
    <script>
        async function updateStatus() {
            try {
                const res = await fetch('/status');
                const data = await res.json();
                document.getElementById('pan').textContent = data.pan.toFixed(1);
                document.getElementById('tilt').textContent = data.tilt.toFixed(1);
                document.getElementById('top').textContent = data.ldrTop;
                document.getElementById('bottom').textContent = data.ldrBottom;
                document.getElementById('left').textContent = data.ldrLeft;
                document.getElementById('right').textContent = data.ldrRight;
                document.getElementById('dust').textContent = data.dustLevel;
                
                // Update mode indicator
                const modeEl = document.getElementById('mode');
                if (data.nightMode) {
                    modeEl.textContent = 'NIGHT';
                    modeEl.className = 'mode mode-night';
                } else {
                    modeEl.textContent = 'DAY';
                    modeEl.className = 'mode mode-day';
                }
            } catch(e) { console.log('Update error:', e); }
        }
        
        async function goHome() {
            await fetch('/control', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({home: true})
            });
        }
        
        async function startClean() {
            await fetch('/control', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({clean: true})
            });
        }
        
        setInterval(updateStatus, 1000);
        updateStatus();
    </script>
</body>
</html>
"""

# ============================================================
# WEB SERVER
# ============================================================

def start_hotspot():
    """Create WiFi hotspot"""
    global ap
    ap = network.WLAN(network.AP_IF)
    ap.active(True)
    ap.config(essid=HOTSPOT_SSID, password=HOTSPOT_PASS)
    
    while not ap.active():
        time.sleep(0.1)
    
    print('Hotspot created!')
    print('SSID:', HOTSPOT_SSID)
    print('IP:', ap.ifconfig()[0])
    return ap

def handle_request(client_socket, request):
    """Handle HTTP requests"""
    try:
        method = request.split(' ')[0]
        path = request.split(' ')[1]
    except:
        return
    
    if path == '/' or path == '/index.html':
        client_socket.send('HTTP/1.1 200 OK\r\n')
        client_socket.send('Content-Type: text/html\r\n')
        client_socket.send('Connection: close\r\n')
        client_socket.send('\r\n')
        client_socket.send(HTML_PAGE)
    
    elif path == '/status' and method == 'GET':
        response_data = {
            'pan': round(current_pan, 1),
            'tilt': round(current_tilt, 1),
            'targetPan': round(target_pan, 1),
            'targetTilt': round(target_tilt, 1),
            'dustLevel': dust_level,
            'isCleaning': is_cleaning,
            'cleaningProgress': round(cleaning_progress, 1),
            'ldrTop': ldr_top,
            'ldrBottom': ldr_bottom,
            'ldrLeft': ldr_left,
            'ldrRight': ldr_right,
            'nightMode': is_night_mode,
            'homed': is_homed,
            'ip': ap.ifconfig()[0] if ap else '192.168.4.1'
        }
        response = json.dumps(response_data)
        client_socket.send('HTTP/1.1 200 OK\r\n')
        client_socket.send('Content-Type: application/json\r\n')
        client_socket.send('Connection: close\r\n')
        client_socket.send('\r\n')
        client_socket.send(response)
    
    elif path == '/sensors' and method == 'GET':
        read_sensors()
        voltages = get_sensor_voltages()
        response_data = {
            'ldrTop': ldr_top,
            'ldrBottom': ldr_bottom,
            'ldrLeft': ldr_left,
            'ldrRight': ldr_right,
            'dustLevel': dust_level,
            'ldrTopV': voltages['top'],
            'ldrBottomV': voltages['bottom'],
            'ldrLeftV': voltages['left'],
            'ldrRightV': voltages['right']
        }
        response = json.dumps(response_data)
        client_socket.send('HTTP/1.1 200 OK\r\n')
        client_socket.send('Content-Type: application/json\r\n')
        client_socket.send('Connection: close\r\n')
        client_socket.send('\r\n')
        client_socket.send(response)
    
    elif path == '/control' and method == 'POST':
        try:
            body_start = request.index('\r\n\r\n') + 4
            body = request[body_start:]
            data = json.loads(body)
            
            if 'pan' in data:
                set_pan(float(data['pan']))
            if 'tilt' in data:
                set_tilt(float(data['tilt']))
            if 'home' in data and data['home']:
                set_pan(HOME_PAN)
                set_tilt(HOME_TILT)
            if 'clean' in data:
                if data['clean']:
                    start_cleaning()
                else:
                    stop_cleaning()
            
            response_data = {'success': True, 'pan': round(current_pan, 1), 'tilt': round(current_tilt, 1)}
            response = json.dumps(response_data)
            client_socket.send('HTTP/1.1 200 OK\r\n')
            client_socket.send('Content-Type: application/json\r\n')
            client_socket.send('Connection: close\r\n')
            client_socket.send('\r\n')
            client_socket.send(response)
        except Exception as e:
            client_socket.send('HTTP/1.1 400 Bad Request\r\n\r\n' + str(e))
    
    elif path == '/clean' and method == 'POST':
        try:
            body_start = request.index('\r\n\r\n') + 4
            body = request[body_start:]
            data = json.loads(body)
            
            duration = data.get('duration', 5000)
            start_cleaning(duration)
            
            response_data = {'success': True, 'isCleaning': True}
            response = json.dumps(response_data)
            client_socket.send('HTTP/1.1 200 OK\r\n')
            client_socket.send('Content-Type: application/json\r\n')
            client_socket.send('Connection: close\r\n')
            client_socket.send('\r\n')
            client_socket.send(response)
        except Exception as e:
            client_socket.send('HTTP/1.1 400 Bad Request\r\n\r\n' + str(e))
    
    elif path == '/health' and method == 'GET':
        response = json.dumps({'status': 'ok', 'uptime': time.ticks_ms()})
        client_socket.send('HTTP/1.1 200 OK\r\n')
        client_socket.send('Content-Type: application/json\r\n')
        client_socket.send('Connection: close\r\n')
        client_socket.send('\r\n')
        client_socket.send(response)
    
    else:
        client_socket.send('HTTP/1.1 404 Not Found\r\n\r\n')
    
    client_socket.close()

def run_server():
    """Main server loop"""
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind(('', 80))
    server_socket.listen(5)
    
    print('Server started on port 80')
    
    global last_motor_update, last_sensor_read
    
    while True:
        try:
            server_socket.settimeout(0.1)
            client_socket, addr = server_socket.accept()
            request = client_socket.recv(1024).decode('utf-8')
            handle_request(client_socket, request)
        except OSError:
            pass
        
        current_time = time.ticks_ms()
        
        # Update motor state (check timeouts) - every 10ms
        if time.ticks_diff(current_time, last_motor_update) > 10:
            update_motor_state()
            move_to_target()
            last_motor_update = current_time
        
        # Read sensors and auto-track - every 2 seconds
        if time.ticks_diff(current_time, last_sensor_read) > 2000:
            read_sensors()
            auto_track()
            last_sensor_read = current_time
            
        # Update cleaning progress
        if is_cleaning:
            elapsed = time.ticks_diff(current_time, cleaning_start_time)
            if elapsed >= cleaning_duration:
                cleaning_progress = 100.0
                stop_cleaning()
            else:
                cleaning_progress = (elapsed / cleaning_duration) * 100.0

# ============================================================
# MAIN - STARTUP SEQUENCE
# ============================================================

if __name__ == '__main__':
    print('========================================')
    print('  Solar Tracker - DC Motor Version')
    print('  ESP32 WROOM-32 + L298N Driver')
    print('========================================')
    print()
    
    # Step 1: Full reset - stop all motors
    print('[1/4] Resetting motors...')
    stop_all_motors()
    time.sleep(0.5)
    
    # Step 2: Initialize sensors
    print('[2/4] Initializing sensors...')
    read_sensors()
    print(f'  LDR Top: {ldr_top}, Bottom: {ldr_bottom}, Left: {ldr_left}, Right: {ldr_right}')
    print(f'  Dust Level: {dust_level}%')
    
    # Step 3: Create WiFi hotspot
    print('[3/4] Creating WiFi hotspot...')
    ap = start_hotspot()
    
    # Step 4: Home motors (move to home position)
    print('[4/4] Homing motors...')
    home_motors()
    
    print()
    print('========================================')
    print('  System Ready!')
    print(f'  Connect to WiFi: {HOTSPOT_SSID}')
    print(f'  Password: {HOTSPOT_PASS}')
    print(f'  Open browser: http://{ap.ifconfig()[0]}')
    print('========================================')
    print()
    
    # Start the web server
    run_server()
