# Solar Tracker ESP32 Firmware - Hotspot Mode
# 
# This version creates a WiFi hotspot for local control
# No internet required - perfect for field testing
#
# Setup:
# 1. Install Thonny IDE (https://thonny.org/)
# 2. Connect ESP32 via USB
# 3. Install MicroPython firmware on ESP32
# 4. Open this file in Thonny and upload to ESP32 as main.py

import network
import socket
import machine
import time
import json
from machine import Pin, ADC

# ============================================================
# CONFIGURATION
# ============================================================

# Hotspot Settings
HOTSPOT_SSID = "SolarTracker"
HOTSPOT_PASS = "solar1234"

# Pin Definitions
PIN_PAN_STEP = machine.Pin(25, machine.Pin.OUT)
PIN_PAN_DIR = machine.Pin(26, machine.Pin.OUT)
PIN_TILT_STEP = machine.Pin(27, machine.Pin.OUT)
PIN_TILT_DIR = machine.Pin(14, machine.Pin.OUT)
PIN_CLEANER = machine.Pin(32, machine.Pin.OUT)
PIN_IR_DUST = machine.Pin(4, machine.Pin.IN)

# Analog sensors (LDRs)
ADC_LDR_TOP = ADC(machine.Pin(34))
ADC_LDR_BOTTOM = ADC(machine.Pin(35))
ADC_LDR_LEFT = ADC(machine.Pin(33))
ADC_LDR_RIGHT = ADC(machine.Pin(39))

# Configure ADC
ADC_LDR_TOP.atten(ADC.ATTN_11DB)
ADC_LDR_BOTTOM.atten(ADC.ATTN_11DB)
ADC_LDR_LEFT.atten(ADC.ATTN_11DB)
ADC_LDR_RIGHT.atten(ADC.ATTN_11DB)

# Motor Settings
STEPS_PER_DEGREE = 20
MOTOR_DELAY_US = 500

# Tracking Settings
LIGHT_THRESHOLD = 0.15
DEADBAND = 0.05

# ============================================================
# STATE VARIABLES
# ============================================================

current_pan = 180.0
current_tilt = 30.0
target_pan = 180.0
target_tilt = 30.0

ldr_top = 0
ldr_bottom = 0
ldr_left = 0
ldr_right = 0
dust_level = 0
is_cleaning = False
cleaning_progress = 0.0
cleaning_start_time = 0
cleaning_duration = 5000

last_motor_move = 0
last_sensor_read = 0
cleaning_timer = 0

# ============================================================
# MOTOR FUNCTIONS
# ============================================================

def move_motor_step(pin_step, pin_dir, steps, direction):
    """Move a stepper motor by specified steps"""
    pin_dir.value(direction)
    for _ in range(abs(steps)):
        pin_step.value(1)
        time.sleep_us(MOTOR_DELAY_US)
        pin_step.value(0)
        time.sleep_us(MOTOR_DELAY_US)

def set_pan(angle):
    global target_pan
    target_pan = angle % 360

def set_tilt(angle):
    global target_tilt
    target_tilt = max(0, min(80, angle))

def start_cleaning(duration_ms=5000):
    global is_cleaning, cleaning_progress, cleaning_start_time, cleaning_duration
    is_cleaning = True
    cleaning_progress = 0.0
    cleaning_start_time = time.ticks_ms()
    cleaning_duration = duration_ms
    PIN_CLEANER.value(1)

def stop_cleaning():
    global is_cleaning
    is_cleaning = False
    PIN_CLEANER.value(0)

# ============================================================
# SENSOR FUNCTIONS
# ============================================================

def read_ldr(pin):
    samples = 5
    total = 0
    for _ in range(samples):
        total += pin.read()
        time.sleep_ms(10)
    return total // samples

def read_sensors():
    global ldr_top, ldr_bottom, ldr_left, ldr_right, dust_level
    ldr_top = read_ldr(ADC_LDR_TOP)
    ldr_bottom = read_ldr(ADC_LDR_BOTTOM)
    ldr_left = read_ldr(ADC_LDR_LEFT)
    ldr_right = read_ldr(ADC_LDR_RIGHT)
    dust_level = 0 if PIN_IR_DUST.value() else 100

def get_sensor_voltages():
    return {
        'top': round(ldr_top * 3.3 / 4095, 2),
        'bottom': round(ldr_bottom * 3.3 / 4095, 2),
        'left': round(ldr_left * 3.3 / 4095, 2),
        'right': round(ldr_right * 3.3 / 4095, 2)
    }

# ============================================================
# AUTO-TRACKING
# ============================================================

def auto_track():
    global target_pan, target_tilt
    avg_intensity = (ldr_top + ldr_bottom + ldr_left + ldr_right) / 4 / 4095
    
    if avg_intensity < LIGHT_THRESHOLD:
        target_pan = 180
        target_tilt = 30
        return
    
    left_right_diff = (ldr_left - ldr_right) / 4095
    top_bottom_diff = (ldr_top - ldr_bottom) / 4095
    
    if abs(left_right_diff) > DEADBAND:
        target_pan -= left_right_diff * 10
        target_pan = target_pan % 360
    
    if abs(top_bottom_diff) > DEADBAND:
        target_tilt += top_bottom_diff * 10
        target_tilt = max(0, min(80, target_tilt))

# ============================================================
# MOTOR CONTROL LOOP
# ============================================================

def update_motors():
    global current_pan, current_tilt, last_motor_move
    
    current_time = time.ticks_ms()
    if time.ticks_diff(current_time, last_motor_move) < MOTOR_DELAY_US:
        return
    
    pan_diff = target_pan - current_pan
    if pan_diff > 180:
        pan_diff -= 360
    elif pan_diff < -180:
        pan_diff += 360
    
    tilt_diff = target_tilt - current_tilt
    
    if abs(pan_diff) > 0.5:
        direction = 1 if pan_diff > 0 else 0
        PIN_PAN_DIR.value(direction)
        PIN_PAN_STEP.value(1)
        time.sleep_us(10)
        PIN_PAN_STEP.value(0)
        step_size = 360 / STEPS_PER_DEGREE
        current_pan += (step_size if pan_diff > 0 else -step_size)
        current_pan = current_pan % 360
    
    if abs(tilt_diff) > 0.5:
        direction = 1 if tilt_diff > 0 else 0
        PIN_TILT_DIR.value(direction)
        PIN_TILT_STEP.value(1)
        time.sleep_us(10)
        PIN_TILT_STEP.value(0)
        step_size = 360 / STEPS_PER_DEGREE
        current_tilt += (step_size if tilt_diff > 0 else -step_size)
        current_tilt = max(0, min(80, current_tilt))
    
    last_motor_move = current_time

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
    </style>
</head>
<body>
    <h1>🌞 Solar Tracker</h1>
    
    <div class="card">
        <h2>Status</h2>
        <div class="position">Pan: <span id="pan">180</span>°</div>
        <div class="position">Tilt: <span id="tilt">30</span>°</div>
    </div>
    
    <div class="card">
        <h2>Control</h2>
        <input type="number" id="panInput" placeholder="Pan (0-360)" min="0" max="360">
        <input type="number" id="tiltInput" placeholder="Tilt (0-80)" min="0" max="80">
        <button onclick="setPosition()">Set Position</button>
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
            } catch(e) { console.log('Update error:', e); }
        }
        
        async function setPosition() {
            const pan = document.getElementById('panInput').value;
            const tilt = document.getElementById('tiltInput').value;
            await fetch('/control', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({pan: pan || undefined, tilt: tilt || undefined})
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
            'ldrRight': ldr_right
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
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind(('', 80))
    server_socket.listen(5)
    
    print('Server started on port 80')
    
    global last_motor_move, last_sensor_read
    
    while True:
        try:
            server_socket.settimeout(0.1)
            client_socket, addr = server_socket.accept()
            request = client_socket.recv(1024).decode('utf-8')
            handle_request(client_socket, request)
        except OSError:
            pass
        
        current_time = time.ticks_ms()
        if time.ticks_diff(current_time, last_motor_move) > 50:
            update_motors()
            last_motor_move = current_time
        
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
# MAIN
# ============================================================

if __name__ == '__main__':
    print('Solar Tracker - Hotspot Mode')
    print('============================')
    
    ap = start_hotspot()
    run_server()