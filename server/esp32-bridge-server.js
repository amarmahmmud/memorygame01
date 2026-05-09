/**
 * ESP32 Bridge Server
 * 
 * This Node.js/Express server acts as a bridge between the web frontend
 * and the physical ESP32 device. It provides:
 * 1. REST API for the frontend to send commands
 * 2. WebSocket support for real-time updates
 * 3. ESP32 device management (auto-discovery, connection pooling)
 * 
 * Run with: node esp32-bridge-server.js
 * or: npm run start:server
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = process.env.PORT || 3001;

// ESP32 device configuration
// Can be set via environment variable or discovered automatically
const ESP32_CONFIG = {
  host: process.env.ESP32_HOST || '192.168.1.100',  // ESP32 IP address
  port: process.env.ESP32_PORT || 80,               // ESP32 web server port
  timeout: 5000,                                    // Request timeout in ms
  pollInterval: 2000                                // Status polling interval
};

console.log('ESP32 Bridge Server Configuration:');
console.log('  ESP32 Host:', ESP32_CONFIG.host);
console.log('  ESP32 Port:', ESP32_CONFIG.port);
console.log('  Server Port:', PORT);

// ============================================================
// STATE MANAGEMENT
// ============================================================

let esp32State = {
  connected: false,
  lastSeen: null,
  status: {},
  sensors: {},
  error: null
};

let connectedClients = new Set();

// ============================================================
// ESP32 COMMUNICATION
// ============================================================

/**
 * Build ESP32 API URL
 */
function getEsp32Url(path) {
  return `http://${ESP32_CONFIG.host}:${ESP32_CONFIG.port}${path}`;
}

/**
 * Make request to ESP32 with timeout and error handling
 */
async function requestEsp32(method, path, data = null) {
  try {
    const url = getEsp32Url(path);
    const config = {
      method,
      url,
      timeout: ESP32_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    // Update connection status
    esp32State.connected = true;
    esp32State.lastSeen = new Date().toISOString();
    esp32State.error = null;
    
    return response.data;
  } catch (error) {
    console.error('ESP32 Request Error:', error.message);
    
    esp32State.connected = false;
    esp32State.error = error.message;
    
    throw error;
  }
}

/**
 * Poll ESP32 for status updates
 */
async function pollEsp32Status() {
  try {
    const status = await requestEsp32('GET', '/status');
    esp32State.status = status;
    
    // Broadcast to all connected WebSocket clients
    broadcast({
      type: 'status_update',
      data: status
    });
  } catch (error) {
    // Device might be offline, that's okay
    broadcast({
      type: 'status_update',
      data: { connected: false, error: error.message }
    });
  }
  
  try {
    const sensors = await requestEsp32('GET', '/sensors');
    esp32State.sensors = sensors;
    
    broadcast({
      type: 'sensors_update',
      data: sensors
    });
  } catch (error) {
    // Ignore sensor errors
  }
}

// ============================================================
// WEBSOCKET MANAGEMENT
// ============================================================

function broadcast(message) {
  const data = JSON.stringify(message);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  connectedClients.add(ws);
  
  // Send current state immediately
  ws.send(JSON.stringify({
    type: 'initial_state',
    data: {
      esp32State,
      config: ESP32_CONFIG
    }
  }));
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    connectedClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// ============================================================
// HTTP API ROUTES
// ============================================================

/**
 * GET /api/status - Get bridge and ESP32 status
 */
app.get('/api/status', async (req, res) => {
  res.json({
    bridge: {
      connected: esp32State.connected,
      lastSeen: esp32State.lastSeen,
      error: esp32State.error,
      uptime: process.uptime()
    },
    esp32: esp32State
  });
});

/**
 * GET /api/esp32/status - Get ESP32 status (proxied)
 */
app.get('/api/esp32/status', async (req, res) => {
  try {
    const data = await requestEsp32('GET', '/status');
    res.json(data);
  } catch (error) {
    res.status(503).json({
      error: 'ESP32 unavailable',
      message: error.message
    });
  }
});

/**
 * GET /api/esp32/sensors - Get ESP32 sensor data
 */
app.get('/api/esp32/sensors', async (req, res) => {
  try {
    const data = await requestEsp32('GET', '/sensors');
    res.json(data);
  } catch (error) {
    res.status(503).json({
      error: 'ESP32 unavailable',
      message: error.message
    });
  }
});

/**
 * POST /api/esp32/control - Control ESP32
 */
app.post('/api/esp32/control', async (req, res) => {
  try {
    const data = await requestEsp32('POST', '/control', req.body);
    res.json(data);
  } catch (error) {
    res.status(503).json({
      error: 'ESP32 unavailable',
      message: error.message
    });
  }
});

/**
 * POST /api/esp32/motor - Control motors
 */
app.post('/api/esp32/motor', async (req, res) => {
  try {
    const data = await requestEsp32('POST', '/motor', req.body);
    res.json(data);
  } catch (error) {
    res.status(503).json({
      error: 'ESP32 unavailable',
      message: error.message
    });
  }
});

/**
 * POST /api/esp32/clean - Start cleaning
 */
app.post('/api/esp32/clean', async (req, res) => {
  try {
    const data = await requestEsp32('POST', '/clean', req.body);
    res.json(data);
  } catch (error) {
    res.status(503).json({
      error: 'ESP32 unavailable',
      message: error.message
    });
  }
});

/**
 * POST /api/esp32/health - Check ESP32 health
 */
app.post('/api/esp32/health', async (req, res) => {
  try {
    const data = await requestEsp32('GET', '/health');
    res.json(data);
  } catch (error) {
    res.status(503).json({
      error: 'ESP32 unavailable',
      message: error.message
    });
  }
});

/**
 * GET /api/config - Get current configuration
 */
app.get('/api/config', (req, res) => {
  res.json({
    esp32: ESP32_CONFIG,
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * POST /api/config - Update ESP32 configuration
 */
app.post('/api/config', (req, res) => {
  const { host, port } = req.body;
  
  if (host) ESP32_CONFIG.host = host;
  if (port) ESP32_CONFIG.port = port;
  
  console.log('Configuration updated:', ESP32_CONFIG);
  
  res.json({
    message: 'Configuration updated',
    config: ESP32_CONFIG
  });
});

/**
 * GET /api/discover - Discover ESP32 on local network
 */
app.get('/api/discover', async (req, res) => {
  // This is a simplified discovery
  // In production, you might use mDNS, UDP broadcast, or scan common IPs
  res.json({
    message: 'Discovery not implemented',
    hint: 'Set ESP32_HOST environment variable or use /api/config',
    currentHost: ESP32_CONFIG.host
  });
});

// ============================================================
// START SERVER
// ============================================================

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(` ESP32 Bridge Server Running`);
  console(` Port: ${PORT}`);
  console(` ESP32 Target: ${ESP32_CONFIG.host}:${ESP32_CONFIG.port}`);
  console(`========================================\n`);
  
  // Start polling ESP32
  pollEsp32Status();
  setInterval(pollEsp32Status, ESP32_CONFIG.pollInterval);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };
