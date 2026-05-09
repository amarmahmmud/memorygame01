/*
 * Solar Tracker ESP32 Firmware
 * Controls pan/tilt motors and reads LDR/IR sensors
 * Communicates via WiFi REST API
 */

#include <WiFi.h>
#include <WiFiClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURATION - Edit these for your setup
// ============================================================

// WiFi Settings
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* ESP_HOSTNAME = "solar-tracker-esp32";

// Motor Pins (adjust based on your motor driver)
#define PIN_PAN_STEP     25   // Step pin for pan motor
#define PIN_PAN_DIR      26   // Direction pin for pan motor
#define PIN_TILT_STEP    27   // Step pin for tilt motor
#define PIN_TILT_DIR     14   // Direction pin for tilt motor
#define PIN_CLEANER      32   // PWM pin for cleaning motor
#define PIN_IR_DUST      4    // Digital pin for IR dust sensor

// Sensor Pins (Analog)
#define PIN_LDR_TOP      34   // ADC1_CH6
#define PIN_LDR_BOTTOM   35   // ADC1_CH7
#define PIN_LDR_LEFT     33   // ADC1_CH5
#define PIN_LDR_RIGHT    39   // ADC1_CH3

// Motor Settings
#define STEPS_PER_DEGREE 20   // Adjust for your motor (e.g., 1.8deg step = 200 steps/360 = 0.55...)
#define MAX_PAN          360
#define MIN_PAN          0
#define MAX_TILT         80
#define MIN_TILT         0
#define MOTOR_SPEED      500  // Microseconds between steps (lower = faster)

// ============================================================
// GLOBALS
// ============================================================

WebServer server(80);

// Current motor positions (in degrees)
float currentPan = 180.0;
float currentTilt = 30.0;

// Target positions
float targetPan = 180.0;
float targetTilt = 30.0;

// Sensor values
int ldrTop = 0;
int ldrBottom = 0;
int ldrLeft = 0;
int ldrRight = 0;
int dustLevel = 0;
bool isCleaning = false;

unsigned long lastMotorMove = 0;
bool motorMoving = false;

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  
  // Initialize motor pins
  pinMode(PIN_PAN_STEP, OUTPUT);
  pinMode(PIN_PAN_DIR, OUTPUT);
  pinMode(PIN_TILT_STEP, OUTPUT);
  pinMode(PIN_TILT_DIR, OUTPUT);
  pinMode(PIN_CLEANER, OUTPUT);
  
  // Initialize sensor pins
  pinMode(PIN_LDR_TOP, INPUT);
  pinMode(PIN_LDR_BOTTOM, INPUT);
  pinMode(PIN_LDR_LEFT, INPUT);
  pinMode(PIN_LDR_RIGHT, INPUT);
  pinMode(PIN_IR_DUST, INPUT);
  
  // Set default motor direction
  digitalWrite(PIN_PAN_DIR, LOW);
  digitalWrite(PIN_TILT_DIR, LOW);
  digitalWrite(PIN_CLEANER, LOW);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup HTTP routes
  setupRoutes();
  
  Serial.println("ESP32 Solar Tracker Ready!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

// ============================================================
// WIFI CONNECTION
// ============================================================

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed! Starting AP mode...");
    startAccessPoint();
  }
}

void startAccessPoint() {
  WiFi.softAP("SolarTracker-AP", "12345678");
  Serial.print("AP IP: ");
  Serial.println(WiFi.softAPIP());
}

// ============================================================
// HTTP ROUTES
// ============================================================

void setupRoutes() {
  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/sensors", HTTP_GET, handleSensors);
  server.on("/control", HTTP_POST, handleControl);
  server.on("/motor", HTTP_POST, handleMotor);
  server.on("/clean", HTTP_POST, handleClean);
  server.on("/health", HTTP_GET, handleHealth);
  
  server.onNotFound(handleNotFound);
  
  server.begin();
  Serial.println("HTTP server started");
}

// ============================================================
// HANDLERS
// ============================================================

void handleRoot() {
  String html = "<html><body>";
  html += "<h1>Solar Tracker ESP32</h1>";
  html += "<p>Pan: " + String(currentPan) + "°</p>";
  html += "<p>Tilt: " + String(currentTilt) + "°</p>";
  html += "<p><a href='/status'>Status JSON</a></p>";
  html += "<p><a href='/sensors'>Sensors JSON</a></p>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleStatus() {
  StaticJsonDocument<512> doc;
  
  doc["pan"] = currentPan;
  doc["tilt"] = currentTilt;
  doc["targetPan"] = targetPan;
  doc["targetTilt"] = targetTilt;
  doc["dustLevel"] = dustLevel;
  doc["isCleaning"] = isCleaning;
  doc["ldrTop"] = ldrTop;
  doc["ldrBottom"] = ldrBottom;
  doc["ldrLeft"] = ldrLeft;
  doc["ldrRight"] = ldrRight;
  doc["ip"] = WiFi.localIP().toString();
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleSensors() {
  // Read sensors
  readSensors();
  
  StaticJsonDocument<512> doc;
  
  doc["ldrTop"] = ldrTop;
  doc["ldrBottom"] = ldrBottom;
  doc["ldrLeft"] = ldrLeft;
  doc["ldrRight"] = ldrRight;
  doc["dustLevel"] = dustLevel;
  doc["irDust"] = digitalRead(PIN_IR_DUST);
  
  // Convert to voltage (assuming 3.3V reference)
  doc["ldrTopV"] = round(ldrTop * 3.3 / 4095.0 * 100) / 100.0;
  doc["ldrBottomV"] = round(ldrBottom * 3.3 / 4095.0 * 100) / 100.0;
  doc["ldrLeftV"] = round(ldrLeft * 3.3 / 4095.0 * 100) / 100.0;
  doc["ldrRightV"] = round(ldrRight * 3.3 / 4095.0 * 100) / 100.0;
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleControl() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }
  
  String body = server.arg("plain");
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    server.send(400, "text/plain", "Invalid JSON");
    return;
  }
  
  if (doc.containsKey("pan")) {
    targetPan = constrain(doc["pan"], MIN_PAN, MAX_PAN);
  }
  if (doc.containsKey("tilt")) {
    targetTilt = constrain(doc["tilt"], MIN_TILT, MAX_TILT);
  }
  if (doc.containsKey("clean")) {
    isCleaning = doc["clean"];
    analogWrite(PIN_CLEANER, isCleaning ? 200 : 0);
  }
  
  // Send back updated status
  handleStatus();
}

void handleMotor() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }
  
  String body = server.arg("plain");
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    server.send(400, "text/plain", "Invalid JSON");
    return;
  }
  
  if (doc.containsKey("pan_delta")) {
    targetPan = constrain(currentPan + doc["pan_delta"], MIN_PAN, MAX_PAN);
  }
  if (doc.containsKey("tilt_delta")) {
    targetTilt = constrain(currentTilt + doc["tilt_delta"], MIN_TILT, MAX_TILT);
  }
  
  handleStatus();
}

void handleClean() {
  if (server.method() != HTTP_POST) {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }
  
  String body = server.arg("plain");
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, body);
  
  int duration = 5000; // default 5 seconds
  if (doc.containsKey("duration")) {
    duration = doc["duration"];
  }
  
  isCleaning = true;
  analogWrite(PIN_CLEANER, 200);
  
  StaticJsonDocument<128> responseDoc;
  responseDoc["cleaning"] = true;
  responseDoc["duration"] = duration;
  
  String response;
  serializeJson(responseDoc, response);
  server.send(200, "application/json", response);
  
  // Stop cleaning after duration
  delay(duration);
  isCleaning = false;
  analogWrite(PIN_CLEANER, 0);
}

void handleHealth() {
  StaticJsonDocument<128> doc;
  doc["status"] = "ok";
  doc["uptime"] = millis();
  doc["wifi"] = WiFi.status() == WL_CONNECTED ? "connected" : "disconnected";
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleNotFound() {
  server.send(404, "text/plain", "Not Found");
}

// ============================================================
// MOTOR CONTROL
// ============================================================

void moveMotors() {
  if (millis() - lastMotorMove < MOTOR_SPEED) {
    return;
  }
  
  bool moved = false;
  
  // Move pan motor
  if (abs(targetPan - currentPan) > 0.5) {
    float diff = targetPan - currentPan;
    
    // Handle wraparound
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    if (abs(diff) > 1.0) {
      digitalWrite(PIN_PAN_DIR, diff > 0 ? HIGH : LOW);
      digitalWrite(PIN_PAN_STEP, HIGH);
      delayMicroseconds(10);
      digitalWrite(PIN_PAN_STEP, LOW);
      
      currentPan += (diff > 0 ? 360.0 / STEPS_PER_DEGREE : -360.0 / STEPS_PER_DEGREE);
      currentPan = fmod(currentPan, 360.0);
      if (currentPan < 0) currentPan += 360.0;
      
      moved = true;
    }
  }
  
  // Move tilt motor
  if (abs(targetTilt - currentTilt) > 0.5) {
    float diff = targetTilt - currentTilt;
    
    if (abs(diff) > 0.5) {
      digitalWrite(PIN_TILT_DIR, diff > 0 ? HIGH : LOW);
      digitalWrite(PIN_TILT_STEP, HIGH);
      delayMicroseconds(10);
      digitalWrite(PIN_TILT_STEP, LOW);
      
      currentTilt += (diff > 0 ? 360.0 / STEPS_PER_DEGREE : -360.0 / STEPS_PER_DEGREE);
      currentTilt = constrain(currentTilt, MIN_TILT, MAX_TILT);
      
      moved = true;
    }
  }
  
  if (moved) {
    lastMotorMove = millis();
  }
}

// ============================================================
// SENSOR READING
// ============================================================

void readSensors() {
  // Read LDRs (average multiple samples for stability)
  int samples = 5;
  ldrTop = 0;
  ldrBottom = 0;
  ldrLeft = 0;
  ldrRight = 0;
  
  for (int i = 0; i < samples; i++) {
    ldrTop += analogRead(PIN_LDR_TOP);
    ldrBottom += analogRead(PIN_LDR_BOTTOM);
    ldrLeft += analogRead(PIN_LDR_LEFT);
    ldrRight += analogRead(PIN_LDR_RIGHT);
    delay(10);
  }
  
  ldrTop /= samples;
  ldrBottom /= samples;
  ldrLeft /= samples;
  ldrRight /= samples;
  
  // Read IR dust sensor (0 = dusty, 1 = clean)
  dustLevel = digitalRead(PIN_IR_DUST) ? 0 : 100;
}

// ============================================================
// MAIN LOOP
// ============================================================

void loop() {
  server.handleClient();
  moveMotors();
  readSensors();
  
  // Auto-tracking mode (optional)
  // If enabled, adjust pan/tilt based on LDR readings
  static unsigned long lastAutoTrack = 0;
  if (millis() - lastAutoTrack > 5000) { // Every 5 seconds
    lastAutoTrack = millis();
    
    // Simple auto-tracking: move towards brightest direction
    // This can be enabled/disabled via API
    // int leftRightDiff = ldrLeft - ldrRight;
    // int topBottomDiff = ldrTop - ldrBottom;
    // if (abs(leftRightDiff) > 100) targetPan += (leftRightDiff > 0 ? -5 : 5);
    // if (abs(topBottomDiff) > 100) targetTilt += (topBottomDiff > 0 ? 5 : -5);
  }
  
  delay(10);
}
