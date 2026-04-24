"use client"

interface ControlPanelProps {
  sunAzimuth: number
  sunElevation: number
  onAzimuthChange: (value: number) => void
  onElevationChange: (value: number) => void
  dustLevel: number
  isCleaning: boolean
  cleaningProgress: number
  ldrValues: { top: number; bottom: number; left: number; right: number }
  onStartCleaning: () => void
  onSimulateDust: () => void
  onMovePan: (delta: number) => void
  onMoveTilt: (delta: number) => void
}

export function ControlPanel({
  sunAzimuth,
  sunElevation,
  onAzimuthChange,
  onElevationChange,
  dustLevel,
  isCleaning,
  cleaningProgress,
  ldrValues,
  onStartCleaning,
  onSimulateDust,
  onMovePan,
  onMoveTilt,
}: ControlPanelProps) {
  return (
    <>
      {/* ESP32 Panel */}
      <div className="absolute top-20 right-5 bg-black/90 border border-cyan-400 rounded-lg p-4 text-xs z-20 min-w-[250px] text-gray-400 backdrop-blur-sm">
        <div className="text-center mb-3 text-cyan-400 text-sm">🔬 ESP32 WEB INTERFACE</div>

        <div className="text-cyan-400 mb-2 border-b border-gray-700 pb-1">📊 LDR SENSORS</div>
        <div className="flex justify-between mb-1">
          <span>TOP:</span>
          <span>{(ldrValues.top * 3.3).toFixed(2)} V</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>BOTTOM:</span>
          <span>{(ldrValues.bottom * 3.3).toFixed(2)} V</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>LEFT:</span>
          <span>{(ldrValues.left * 3.3).toFixed(2)} V</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>RIGHT:</span>
          <span>{(ldrValues.right * 3.3).toFixed(2)} V</span>
        </div>

        <div className="text-cyan-400 mt-4 mb-2 border-b border-gray-700 pb-1">💨 CLEANING SYSTEM</div>
        <div className="flex justify-between mb-1">
          <span>IR Dust Sensor:</span>
          <span>{Math.round(dustLevel)}%</span>
        </div>
        <div className="w-full h-5 bg-gray-800 rounded-lg overflow-hidden my-2">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${dustLevel}%`,
              background: "linear-gradient(90deg, #8B8000, #ffaa00, #ff6666)",
            }}
          />
        </div>
        <div className="flex justify-between mb-1">
          <span>Auto-clean threshold:</span>
          <span>70%</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Status:</span>
          <span className={isCleaning ? "text-cyan-400 animate-pulse" : ""}>
            {isCleaning ? "CLEANING..." : "IDLE"}
          </span>
        </div>

        <button
          onClick={onStartCleaning}
          disabled={isCleaning}
          className="w-full mt-2 bg-[#1a3a3a] text-cyan-400 border-2 border-cyan-400 py-2 px-4 rounded-lg font-bold cursor-pointer transition-all hover:bg-cyan-400 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🧹 START CLEANING
        </button>
        <button
          onClick={onSimulateDust}
          className="w-full mt-2 bg-[#1a3a3a] text-cyan-400 border-2 border-cyan-400 py-2 px-4 rounded-lg font-bold cursor-pointer transition-all hover:bg-cyan-400 hover:text-black"
        >
          🌫️ SIMULATE DUST
        </button>

        <div className="text-cyan-400 mt-4 mb-2 border-b border-gray-700 pb-1">🎮 MANUAL OVERRIDE</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onMovePan(-10)}
            className="bg-[#1a3a3a] text-cyan-400 border border-cyan-400 py-1 px-2 rounded text-xs cursor-pointer transition-all hover:bg-cyan-400 hover:text-black"
          >
            ◀ PAN -10°
          </button>
          <button
            onClick={() => onMovePan(10)}
            className="bg-[#1a3a3a] text-cyan-400 border border-cyan-400 py-1 px-2 rounded text-xs cursor-pointer transition-all hover:bg-cyan-400 hover:text-black"
          >
            PAN +10° ▶
          </button>
          <button
            onClick={() => onMoveTilt(-5)}
            className="bg-[#1a3a3a] text-cyan-400 border border-cyan-400 py-1 px-2 rounded text-xs cursor-pointer transition-all hover:bg-cyan-400 hover:text-black"
          >
            ▼ TILT -5°
          </button>
          <button
            onClick={() => onMoveTilt(5)}
            className="bg-[#1a3a3a] text-cyan-400 border border-cyan-400 py-1 px-2 rounded text-xs cursor-pointer transition-all hover:bg-cyan-400 hover:text-black"
          >
            ▲ TILT +5°
          </button>
        </div>
      </div>

      {/* Sun Controller */}
      <div className="absolute bottom-5 right-5 bg-black/90 border-2 border-cyan-400 rounded-2xl p-5 text-cyan-400 z-20 min-w-[300px] backdrop-blur-sm">
        <h3 className="text-center text-yellow-400 mb-4 font-bold">☀️ SUN CONTROLLER</h3>

        <div className="mb-5">
          <label className="flex justify-between mb-2">
            <span>🌅 AZIMUTH</span>
            <span className="text-yellow-400 font-bold">{Math.round(sunAzimuth)}°</span>
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={sunAzimuth}
            onChange={(e) => onAzimuthChange(parseFloat(e.target.value))}
            className="w-full h-2 appearance-none bg-gray-700 rounded-lg cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>

        <div className="mb-5">
          <label className="flex justify-between mb-2">
            <span>⬆️ ELEVATION (20°-80°)</span>
            <span className="text-yellow-400 font-bold">{Math.round(sunElevation)}°</span>
          </label>
          <input
            type="range"
            min="20"
            max="80"
            value={sunElevation}
            onChange={(e) => onElevationChange(parseFloat(e.target.value))}
            className="w-full h-2 appearance-none bg-gray-700 rounded-lg cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>

        <div className="text-center text-gray-500 text-xs">
          Sun: {Math.round(sunAzimuth)}°, {Math.round(sunElevation)}°
        </div>
      </div>
    </>
  )
}
