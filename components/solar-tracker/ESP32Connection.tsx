"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ESP32ConnectionProps {
  onStatusChange?: (connected: boolean) => void
  onSensorData?: (data: any) => void
}

interface ESP32Status {
  pan: number
  tilt: number
  targetPan: number
  targetTilt: number
  dustLevel: number
  isCleaning: boolean
  ldrTop: number
  ldrBottom: number
  ldrLeft: number
  ldrRight: number
  ip: string
}

interface SensorData {
  ldrTop: number
  ldrBottom: number
  ldrLeft: number
  ldrRight: number
  ldrTopV: number
  ldrBottomV: number
  ldrLeftV: number
  ldrRightV: number
  dustLevel: number
  irDust: number
}

export function ESP32Connection({ onStatusChange, onSensorData }: ESP32ConnectionProps) {
  const [esp32Host, setEsp32Host] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('esp32_host') || '192.168.1.100' : '192.168.1.100'
  )
  const [esp32Port, setEsp32Port] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('esp32_port') || '80' : '80'
  )
  const [bridgeUrl, setBridgeUrl] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('bridge_url') || 'http://localhost:3001' : 'http://localhost:3001'
  )
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const [esp32Status, setEsp32Status] = useState<ESP32Status | null>(null)
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [useBridge, setUseBridge] = useState<boolean>(true)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('esp32_host', esp32Host)
      localStorage.setItem('esp32_port', esp32Port)
      localStorage.setItem('bridge_url', bridgeUrl)
      localStorage.setItem('use_bridge', String(useBridge))
    }
  }, [esp32Host, esp32Port, bridgeUrl, useBridge])

  // Get API base URL
  const getApiBaseUrl = useCallback(() => {
    return useBridge ? bridgeUrl : `http://${esp32Host}:${esp32Port}`
  }, [useBridge, bridgeUrl, esp32Host, esp32Port])

  // Make API request
  const makeRequest = useCallback(async (method: string, endpoint: string, data?: any) => {
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (err) {
      throw new Error(`Request failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [getApiBaseUrl])

  // Connect to ESP32
  const connect = useCallback(async () => {
    setConnectionStatus('connecting')
    setError(null)
    
    try {
      // Test connection
      const health = await makeRequest('GET', useBridge ? '/api/esp32/health' : '/health')
      
      setIsConnected(true)
      setConnectionStatus('connected')
      onStatusChange?.(true)
      
      // Start polling
      if (pollingInterval) clearInterval(pollingInterval)
      const interval = setInterval(fetchStatus, 2000)
      setPollingInterval(interval)
      
      saveSettings()
    } catch (err) {
      setConnectionStatus('error')
      setError(err instanceof Error ? err.message : 'Connection failed')
      onStatusChange?.(false)
    }
  }, [useBridge, pollingInterval, onStatusChange, saveSettings, makeRequest])

  // Disconnect
  const disconnect = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setEsp32Status(null)
    setSensorData(null)
    onStatusChange?.(false)
  }, [pollingInterval, onStatusChange])

  // Fetch status
  const fetchStatus = useCallback(async () => {
    if (!isConnected) return
    
    try {
      const status = await makeRequest('GET', useBridge ? '/api/esp32/status' : '/status')
      setEsp32Status(status)
    } catch (err) {
      // Connection lost
      disconnect()
    }
  }, [isConnected, useBridge, makeRequest, disconnect])

  // Fetch sensors
  const fetchSensors = useCallback(async () => {
    if (!isConnected) return
    
    try {
      const sensors = await makeRequest('GET', useBridge ? '/api/esp32/sensors' : '/sensors')
      setSensorData(sensors)
      onSensorData?.(sensors)
    } catch (err) {
      // Ignore sensor errors
    }
  }, [isConnected, useBridge, makeRequest, onSensorData])

  // Send control command
  const sendControl = useCallback(async (pan?: number, tilt?: number, clean?: boolean) => {
    if (!isConnected) return
    
    setIsSyncing(true)
    try {
      await makeRequest('POST', useBridge ? '/api/esp32/control' : '/control', {
        pan,
        tilt,
        clean,
      })
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Control command failed')
    } finally {
      setIsSyncing(false)
    }
  }, [isConnected, useBridge, makeRequest, fetchStatus])

  // Start cleaning
  const startCleaning = useCallback(async (duration: number = 5000) => {
    if (!isConnected) return
    
    try {
      await makeRequest('POST', useBridge ? '/api/esp32/clean' : '/clean', { duration })
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clean command failed')
    }
  }, [isConnected, useBridge, makeRequest, fetchStatus])

  // Sync from ESP32 to scene
  const syncFromESP32 = useCallback(async () => {
    if (!isConnected || !esp32Status) return
    
    setIsSyncing(true)
    // This would emit an event or call a callback to update the 3D scene
    // Implementation depends on how the parent component handles state
    setIsSyncing(false)
  }, [isConnected, esp32Status])

  // Sync to ESP32 from scene
  const syncToESP32 = useCallback(async (pan: number, tilt: number) => {
    await sendControl(pan, tilt, undefined)
  }, [sendControl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
    }
  }, [pollingInterval])

  return (
    <Card className="w-full max-w-md p-4 bg-black/90 border-cyan-400/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-cyan-400">🔌 ESP32 Connection</h3>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "CONNECTED" : "DISCONNECTED"}
          </Badge>
        </div>

        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="control">Control</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="use-bridge"
                  checked={useBridge}
                  onCheckedChange={setUseBridge}
                />
                <Label htmlFor="use-bridge" className="text-sm">
                  Use Bridge Server
                </Label>
              </div>

              {useBridge ? (
                <div className="space-y-2">
                  <Label>Bridge Server URL</Label>
                  <Input
                    value={bridgeUrl}
                    onChange={(e) => setBridgeUrl(e.target.value)}
                    placeholder="http://localhost:3001"
                    className="font-mono text-sm"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>ESP32 IP Address</Label>
                    <Input
                      value={esp32Host}
                      onChange={(e) => setEsp32Host(e.target.value)}
                      placeholder="192.168.1.100"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ESP32 Port</Label>
                    <Input
                      value={esp32Port}
                      onChange={(e) => setEsp32Port(e.target.value)}
                      placeholder="80"
                      className="font-mono text-sm"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2">
                {!isConnected ? (
                  <Button
                    onClick={connect}
                    disabled={connectionStatus === 'connecting'}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                  >
                    {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
                  </Button>
                ) : (
                  <Button
                    onClick={disconnect}
                    variant="destructive"
                    className="flex-1"
                  >
                    Disconnect
                  </Button>
                )}
              </div>

              {error && (
                <div className="p-2 text-xs text-red-400 bg-red-400/10 rounded border border-red-400/30">
                  {error}
                </div>
              )}

              {isConnected && esp32Status && (
                <div className="p-3 rounded bg-cyan-400/10 border border-cyan-400/30">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-cyan-400/70">Pan:</span>
                      <span className="float-right text-cyan-400">{esp32Status.pan.toFixed(1)}°</span>
                    </div>
                    <div>
                      <span className="text-cyan-400/70">Tilt:</span>
                      <span className="float-right text-cyan-400">{esp32Status.tilt.toFixed(1)}°</span>
                    </div>
                    <div>
                      <span className="text-cyan-400/70">IP:</span>
                      <span className="float-right text-cyan-400 font-mono">
                        {esp32Status.ip || `${esp32Host}:${esp32Port}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-cyan-400/70">Cleaning:</span>
                      <span className="float-right">
                        {esp32Status.isCleaning ? (
                          <span className="text-green-400">ACTIVE</span>
                        ) : (
                          <span className="text-cyan-400/70">IDLE</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="control" className="space-y-4">
            {isConnected ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={() => sendControl(undefined, undefined, true)}
                    disabled={isSyncing || esp32Status?.isCleaning}
                    className="flex-1 bg-green-600 hover:bg-green-500"
                  >
                    🧹 Clean
                  </Button>
                  <Button
                    onClick={fetchSensors}
                    disabled={isSyncing}
                    variant="outline"
                    className="flex-1 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10"
                  >
                    🔄 Refresh
                  </Button>
                </div>

                <Button
                  onClick={syncFromESP32}
                  disabled={isSyncing}
                  variant="outline"
                  className="w-full border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10"
                >
                  ⬇️ Sync from ESP32
                </Button>

                {sensorData && (
                  <div className="p-3 rounded bg-black/50 border border-cyan-400/30">
                    <div className="text-xs text-cyan-400/70 mb-2">LDR Voltages</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-yellow-400">Top: {sensorData.ldrTopV}V</div>
                      <div className="text-yellow-400">Bot: {sensorData.ldrBottomV}V</div>
                      <div className="text-blue-400">Left: {sensorData.ldrLeftV}V</div>
                      <div className="text-blue-400">Right: {sensorData.ldrRightV}V</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-cyan-400/50 py-8 text-sm">
                Connect to ESP32 first
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  )
}
