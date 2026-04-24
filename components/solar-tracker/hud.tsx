"use client"

interface HUDProps {
  pan: number
  tilt: number
  ldrAvg: number
  trackingActive: boolean
}

export function HUD({ pan, tilt, ldrAvg, trackingActive }: HUDProps) {
  return (
    <div className="absolute top-0 w-full flex justify-around bg-cyan-400/20 p-4 border-b border-cyan-400 z-10 font-mono text-cyan-400">
      <div>
        PAN: <span className="text-white font-bold">{Math.round(pan)}</span>°
      </div>
      <div>
        TILT: <span className="text-white font-bold">{Math.round(tilt)}</span>°
      </div>
      <div>
        LDR AVG: <span className="text-white font-bold">{ldrAvg}</span>%
      </div>
      <div>
        STATUS:{" "}
        <span
          className={`font-bold ${
            trackingActive ? "text-green-400" : "text-red-400"
          }`}
        >
          {trackingActive ? "ACTIVE" : "INACTIVE"}
        </span>
      </div>
    </div>
  )
}
