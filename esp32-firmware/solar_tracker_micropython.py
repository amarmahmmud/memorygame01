# Solar Tracker ESP32 Firmware - MicroPython Version
# 
# This is the Python version for ESP32 using MicroPython
# Much easier to write and understand than Arduino C++!
#
# Setup:
# 1. Install Thonny IDE (https://thonny.org/)
# 2. Connect ESP32 via USB
# 3. Install MicroPython firmware on ESP32
# 4. Open this file in Thonny and upload to ESP32

import network
import socket
import machine
import time
import json
from machine import Pin, ADC, PWM

# ============================================================
# CONFIGURATION
# ============================================================

# WiFi Settings
WIFI_SSID = "YOUR_WIFI_SSID"
WIFI_PASS = "YOUR_WIFI_PASSWORD"

# Pin Definitions
PIN_PAN_STEP = machine.Pin(25, machine.Pin.OUT)      # Pan motor step
PIN_PAN_DIR = machine.Pin(26, machine.Pin.OUT)       # Pan motor direction
PIN_TILT_STEP = machine.Pin(27, machine.Pin.OUT)     # Tilt motor step
PIN_TILT_DIR = machine.Pin(14, machine.Pin.OUT)      # Tilt motor direction
PIN_CLEANER = machine.Pin(32, machine.Pin.OUT)       # Cleaner motor (PWM)
PIN_IR_DUST = machine.Pin(4, machine.Pin.IN)         # IR dust sensor

# Analog sensors (LDRs)
# Note: ESP32 ADC pins - some can only be input
ADC_LDR_TOP = ADC(machine.Pin(34))   # Top LDR
ADC_LDR_BOTTOM = ADC(machine.Pin(35)) # Bottom LDR
ADC_LDR_LEFT = ADC(machine.Pin(33))   # Left LDR
ADC_LDR_RIGHT = ADC(machine.Pin(39))  # Right LDR

# Configure ADC attenuation (0-11dB, higher = wider range)
ADC_LDR_TOP.atten(ADC.ATTN_11DB)   # 0-3.3V range
ADC_LDR_BOTTOM.atten(ADC.ATTN_11DB)
ADC_LDR_LEFT.atten(ADC.ATTN_11DB)
ADC_LDR_RIGHT.atten(ADC.ATTN_11DB)

# Motor Settings
STEPS_PER_DEGREE = 20  # Adjust for your motor
MOTOR_DELAY_US = 500   # Microseconds between steps (lower = faster)

# Tracking Settings
LIGHT_THRESHOLD = 0.15  # Minimum light to track
DEADBAND = 0.05         # Deadband for tracking

# ============================================================
# STATE VARIABLES
# ============================================================

# Current positions
current_pan = 180.0
current_tilt = 30.0
target_pan = 180.0
target_tilt = 30.0

# Sensor values
ldr_top = 0
ldr_bottom = 0
ldr_left = 0
ldr_right = 0
dust_level = 0
is_cleaning = False

# Timing
last_motor_move = 0
last_sensor_read = 0

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

def move_pan(degrees):
    """Move pan motor by specified degrees"""
    global current_pan
    steps = int(degrees * STEPS_PER_DEGREE)
    direction = 1 if steps > 0 else 0
    move_motor_step(PIN_PAN_STEP, PIN_PAN_DIR, abs(steps), direction)
    current_pan += degrees
    # Keep within 0-360
    current_pan = current_pan % 360

def move_tilt(degrees):
    """Move tilt motor by specified degrees"""
    global current_tilt
    steps = int(degrees * STEPS_PER_DEGREE)
    direction = 1 if steps > 0 else 0
    move_motor_step(PIN_TILT_STEP, PIN_TILT_DIR, abs(steps), direction)
    current_tilt += degrees
    # Keep within limits
    if current_tilt < 0:
        current_tilt = 0
    elif current_tilt > 80:
        current_tilt = 80

def set_pan(angle):
    """Set pan to absolute angle"""
    global target_pan
    target_pan = angle

def set_tilt(angle):
    """Set tilt to absolute angle"""
    global target_tilt
    target_tilt = max(0, min(80, angle))

def start_cleaning(duration_ms=5000):
    """Start cleaning cycle"""
    global is_cleaning
    is_cleaning = True
    PIN_CLEANER.value(1)
    time.sleep_ms(duration_ms)
    PIN_CLEANER.value(0)
    is_cleaning = False

def stop_cleaning():
    """Stop cleaning"""
    global is_cleaning
    is_cleaning = False
    PIN_CLEANER.value(0)

# ============================================================
# SENSOR FUNCTIONS
# ============================================================

def read_ldr(pin):
    """Read LDR value (0-4095)"""
    # Take multiple samples for stability
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
    
    # IR dust sensor: 0 = dusty, 1 = clean
    dust_level = 0 if PIN_IR_DUST.value() else 100

def get_sensor_voltages():
    """Convert LDR readings to voltages (0-3.3V)"""
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
    """Automatically track the sun based on LDR readings"""
    global target_pan, target_tilt
    
    # Calculate average intensity
    avg_intensity = (ldr_top + ldr_bottom + ldr_left + ldr_right) / 4 / 4095
    
    if avg_intensity < LIGHT_THRESHOLD:
        # Not enough light, park at default position
        target_pan = 180
        target_tilt = 30
        return
    
    # Calculate differences
    left_right_diff = (ldr_left - ldr_right) / 4095
    top_bottom_diff = (ldr_top - ldr_bottom) / 4095
    
    # Adjust pan (left/right)
    if abs(left_right_diff) > DEADBAND:
        target_pan -= left_right_diff * 10  # Adjust multiplier as needed
        target_pan = target_pan % 360
    
    # Adjust tilt (up/down)
    if abs(top_bottom_diff) > DEADBAND:
        target_tilt += top_bottom_diff * 10  # Adjust multiplier as needed
        target_tilt = max(0, min(80, target_tilt))

# ============================================================
# MOTOR CONTROL LOOP
# ============================================================

def update_motors():
    """Move motors towards target positions"""
    global current_pan, current_tilt
    
    current_time = time.ticks_ms()
    if time.ticks_diff(current_time, last_motor_move) < MOTOR_DELAY_US:
        return
    
    # Calculate differences
    pan_diff = target_pan - current_pan
    
    # Handle wraparound for pan (0-360)
    if pan_diff > 180:
        pan_diff -= 360
    elif pan_diff < -180:
        pan_diff += 360
    
    tilt_diff = target_tilt - current_tilt
    
    # Move pan motor
    if abs(pan_diff) > 0.5:
        direction = 1 if pan_diff > 0 else 0
        PIN_PAN_DIR.value(direction)
        PIN_PAN_STEP.value(1)
        time.sleep_us(10)
        PIN_PAN_STEP.value(0)
        
        step_size = 360 / STEPS_PER_DEGREE
        current_pan += (step_size if pan_diff > 0 else -step_size)
        current_pan = current_pan % 360
    
    # Move tilt motor
    if abs(tilt_diff) > 0.5:
        direction = 1 if tilt_diff > 0 else 0
        PIN_TILT_DIR.value(direction)
        PIN_TILT_STEP.value(1)
        time.sleep_us(10)
        PIN_TILT_STEP.value(0)
        
        step_size = 360 / STEPS_PER_DEGREE
        current_tilt += (step_size if tilt_diff > 0 else -step_size)
        current_tilt = max(0, min(80, current_tilt))

# ============================================================
# WEB SERVER
# ============================================================

def connect_wifi():
    """Connect to WiFi network"""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    
    if not wlan.isconnected():
        print('Connecting to WiFi...')
        wlan.connect(WIFI_SSID, WIFI_PASS)
        
        # Wait for connection
        for _ in range(20):  # 10 second timeout
            if wlan.isconnected():
                break
            time.sleep(0.5)
    
    if wlan.isconnected():
        print('Connected!')
        print('IP:', wlan.ifconfig()[0])
        return True
    else:
        print('Failed to connect!')
        return False

def handle_request(client_socket, request):
    """Handle HTTP request from client"""
    # Parse request
    try:
        method = request.split(' ')[0]
        path = request.split(' ')[1]
    except:
        return
    
    # Route requests
    if path == '/status' and method == 'GET':
        response_data = {
            'pan': round(current_pan, 1),
            'tilt': round(current_tilt, 1),
            'targetPan': round(target_pan, 1),
            'targetTilt': round(target_tilt, 1),
            'dustLevel': dust_level,
            'isCleaning': is_cleaning,
            'ldrTop': ldr_top,
            'ldrBottom': ldr_bottom,
            'ldrLeft': ldr_left,
            'ldrRight': ldr_right,
            'ip': wlan.ifconfig()[0] if 'wlan' in locals() else '0.0.0.0'
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
            'irDust': PIN_IR_DUST.value(),
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
        # Extract JSON body
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
            
            # Return updated status
            response_data = {
                'pan': round(current_pan, 1),
                'tilt': round(current_tilt, 1),
                'success': True
            }
            response = json.dumps(response_data)
            client_socket.send('HTTP/1.1 200 OK\r\n')
            client_socket.send('Content-Type: application/json\r\n')
            client_socket.send('Connection: close\r\n')
            client_socket.send('\r\n')
            client_socket.send(response)
        except Exception as e:
            client_socket.send('HTTP/1.1 400 Bad Request\r\n')
            client_socket.send('\r\n')
            client_socket.send(str(e))
    
    elif path == '/health' and method == 'GET':
        response_data = {
            'status': 'ok',
            'uptime': time.ticks_ms()
        }
        response = json.dumps(response_data)
        client_socket.send('HTTP/1.1 200 OK\r\n')
        client_socket.send('Content-Type: application/json\r\n')
        client_socket.send('Connection: close\r\n')
        client_socket.send('\r\n')
        client_socket.send(response)
    
    else:
        # Not found
        client_socket.send('HTTP/1.1 404 Not Found\r\n')
        client_socket.send('\r\n')
    
    client_socket.close()

def run_server():
    """Main server loop"""
    # Create socket
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind(('', 80))
    server_socket.listen(5)
    
    print('Server started on port 80')
    print('Visit http://<ESP32_IP>/status')
    
    global last_motor_move, last_sensor_read
    
    while True:
        # Accept connections
        try:
            server_socket.settimeout(0.1)  # Short timeout for non-blocking
            client_socket, addr = server_socket.accept()
            request = client_socket.recv(1024).decode('utf-8')
            handle_request(client_socket, request)
        except OSError:
            pass  # No connection
        
        # Update motors
        current_time = time.ticks_ms()
        if time.ticks_diff(current_time, last_motor_move) > 50:  # 20Hz update
            update_motors()
            last_motor_move = current_time
        
        # Read sensors periodically
        if time.ticks_diff(current_time, last_sensor_read) > 2000:  # Every 2 seconds
            read_sensors()
            auto_track()
            last_sensor_read = current_time

# ============================================================
# MAIN
# ============================================================

if __name__ == '__main__':
    print('Solar Tracker - MicroPython Edition')
    print('=====================================')
    
    # Connect to WiFi
    if connect_wifi():
        # Start the server
        run_server()
    else:
        print('Could not connect to WiFi')
        # Could start AP mode here as fallback
