"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useState, useRef, useMemo, useCallback } from "react"
import * as THREE from "three"

// Constants matching the HTML exactly (scaled by 0.01)
const PANEL_BASE_Y = 1.6 // 160 in original
const PANEL_LENGTH = 1.0 // pL = 100 in original

// Material colors - Clean/Modern style
const COLORS = {
  basePlate: "#2a2a35",
  motor: "#3d3d4a",
  motorAccent: "#5a5a6a",
  shaft: "#6a6a7a",
  battery: "#4a5a3a",
  batteryTerminal: "#c0c0c0",
  chassis: "#3a3a45",
  elevationShaft: "#d4a056",
  panelFrame: "#4a5a6a",
  panelSurface: "#1a3a6a",
  panelCell: "#0a2a5a",
  bolt: "#8a8a9a",
  cable: "#2a2a2a",
  bearing: "#5a5a6a",
  bearingInner: "#3a3a4a",
  wormGear: "#c9a050",
  slider: "#e0e0e0",
  brush: "#cc3333",
  brushActive: "#33cccc",
  brushMotor: "#d08030",
}

interface TrackerState {
  pan: number
  tilt: number
  targetPan: number
  targetTilt: number
  sunAzimuth: number
  sunElevation: number
  dustLevel: number
  isCleaning: boolean
  cleaningProgress: number
}

// Bolt component
function Bolt({ position, rotation = [0, 0, 0] as [number, number, number], scale = 1 }: {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Bolt head */}
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 6]} />
        <meshStandardMaterial color={COLORS.bolt} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Bolt shaft */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
        <meshStandardMaterial color={COLORS.bolt} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

// Cable component - curved wire routing
function Cable({ start, end, color = COLORS.cable, segments = 8 }: {
  start: [number, number, number]
  end: [number, number, number]
  color?: string
  segments?: number
}) {
  const curve = useMemo(() => {
    const midY = Math.min(start[1], end[1]) - 0.1
    const midX = (start[0] + end[0]) / 2
    const midZ = (start[2] + end[2]) / 2

    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(...start),
      new THREE.Vector3(start[0], midY, start[2]),
      new THREE.Vector3(midX, midY - 0.05, midZ),
      new THREE.Vector3(end[0], midY, end[2]),
      new THREE.Vector3(...end),
    ])
  }, [start, end])

  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, segments, 0.008, 6, false)
  }, [curve, segments])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  )
}

// Bearing housing component
function BearingHousing({ position, rotation = [0, 0, 0] as [number, number, number], innerRadius = 0.05, outerRadius = 0.1, height = 0.06 }: {
  position: [number, number, number]
  rotation?: [number, number, number]
  innerRadius?: number
  outerRadius?: number
  height?: number
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Outer housing */}
      <mesh>
        <cylinderGeometry args={[outerRadius, outerRadius * 1.1, height, 16]} />
        <meshStandardMaterial color={COLORS.bearing} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Inner race */}
      <mesh position={[0, height * 0.1, 0]}>
        <torusGeometry args={[(innerRadius + outerRadius) / 2, 0.012, 8, 24]} />
        <meshStandardMaterial color={COLORS.bearingInner} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Mounting flange */}
      <mesh position={[0, -height / 2 + 0.005, 0]}>
        <cylinderGeometry args={[outerRadius * 1.3, outerRadius * 1.3, 0.015, 16]} />
        <meshStandardMaterial color={COLORS.bearing} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Mounting bolts on flange */}
      {[0, 90, 180, 270].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const boltR = outerRadius * 1.15
        return (
          <Bolt
            key={i}
            position={[Math.cos(rad) * boltR, -height / 2 - 0.01, Math.sin(rad) * boltR]}
            scale={0.5}
          />
        )
      })}
    </group>
  )
}

// Motor with cooling fins and mounting
function Motor({ position, radius, height, horizontal = false }: {
  position: [number, number, number]
  radius: number
  height: number
  horizontal?: boolean
}) {
  const rotation: [number, number, number] = horizontal ? [0, 0, Math.PI / 2] : [0, 0, 0]

  return (
    <group position={position} rotation={rotation}>
      {/* Main motor body */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius, height, 16]} />
        <meshStandardMaterial color={COLORS.motor} metalness={0.4} roughness={0.6} />
      </mesh>
      {/* End cap */}
      <mesh position={[0, height + 0.02, 0]}>
        <cylinderGeometry args={[radius * 0.9, radius * 0.9, 0.04, 16]} />
        <meshStandardMaterial color={COLORS.motorAccent} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Cooling fins */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        return (
          <mesh
            key={i}
            position={[Math.cos(rad) * radius, height / 2, Math.sin(rad) * radius]}
            rotation={[0, -rad, 0]}
          >
            <boxGeometry args={[0.01, height * 0.7, 0.03]} />
            <meshStandardMaterial color={COLORS.motorAccent} metalness={0.3} roughness={0.7} />
          </mesh>
        )
      })}
      {/* Mounting base */}
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[radius * 1.15, radius * 1.15, 0.025, 16]} />
        <meshStandardMaterial color={COLORS.motorAccent} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Mounting bolts */}
      {[45, 135, 225, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const boltR = radius * 1.05
        return (
          <Bolt
            key={i}
            position={[Math.cos(rad) * boltR, 0.02, Math.sin(rad) * boltR]}
            scale={0.6}
          />
        )
      })}
    </group>
  )
}

// Battery with terminals
function Battery({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Battery body */}
      <mesh position={[0, 0.125, 0]}>
        <boxGeometry args={[0.35, 0.25, 0.3]} />
        <meshStandardMaterial color={COLORS.battery} roughness={0.7} />
      </mesh>
      {/* Positive terminal */}
      <mesh position={[0.1, 0.26, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.03, 8]} />
        <meshStandardMaterial color={COLORS.batteryTerminal} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Negative terminal */}
      <mesh position={[-0.1, 0.26, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.03, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Terminal labels */}
      <mesh position={[0.1, 0.28, 0]}>
        <boxGeometry args={[0.03, 0.005, 0.03]} />
        <meshStandardMaterial color="#cc3333" />
      </mesh>
      <mesh position={[-0.1, 0.28, 0]}>
        <boxGeometry args={[0.03, 0.005, 0.03]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  )
}

// LDR Sensor
function LDRSensor({ position, intensity }: {
  position: [number, number, number]
  intensity: number
}) {
  const r = Math.min(255, 180 + Math.floor(75 * intensity))
  const g = Math.min(255, 100 + Math.floor(155 * intensity))
  const color = new THREE.Color(`rgb(${r}, ${g}, 0)`)

  return (
    <group position={position}>
      {/* Sensor housing */}
      <mesh>
        <cylinderGeometry args={[0.04, 0.035, 0.03, 8]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
      </mesh>
      {/* Sensor lens */}
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.03, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} transparent opacity={0.9} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

// Sun component
function Sun({ azimuth, elevation }: { azimuth: number; elevation: number }) {
  const sunDist = 5
  const radAz = (azimuth * Math.PI) / 180
  const radEl = (elevation * Math.PI) / 180

  const x = Math.cos(radEl) * Math.sin(radAz) * sunDist
  const y = Math.sin(radEl) * sunDist
  const z = Math.cos(radEl) * Math.cos(radAz) * sunDist

  return (
    <group position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color="#ffdd44" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight color="#ffffcc" intensity={3} distance={25} />
    </group>
  )
}

// Solar Panel with cells
function SolarPanel({ tilt, dustLevel, isCleaning, cleaningProgress }: {
  tilt: number
  dustLevel: number
  isCleaning: boolean
  cleaningProgress: number
}) {
  const tRad = (tilt * Math.PI) / 180
  const pL = PANEL_LENGTH

  // Panel geometry - matches HTML exactly
  const midX = Math.cos(tRad) * pL
  const midY = Math.sin(tRad) * pL
  const topX = Math.cos(tRad) * (pL * 2)
  const topY = Math.sin(tRad) * (pL * 2)
  const extX = Math.cos(tRad) * (-pL * 0.5)
  const extY = Math.sin(tRad) * (-pL * 0.5)

  // Brush position
  const bTravel = isCleaning ? cleaningProgress * 2 : 0
  const bX = Math.cos(tRad) * (pL * bTravel)
  const bY = Math.sin(tRad) * (pL * bTravel)

  // Panel normal direction for cell alignment
  const normalX = -Math.sin(tRad)
  const normalY = Math.cos(tRad)

  return (
    <group position={[0, PANEL_BASE_Y, 0]}>
      {/* Main panel frame - aluminum extrusion style */}
      <group>
        {/* Left rail */}
        <mesh position={[(extX + topX) / 2, (extY + topY) / 2, -0.58]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[pL * 2.5, 0.04, 0.04]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Right rail */}
        <mesh position={[(extX + topX) / 2, (extY + topY) / 2, 0.58]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[pL * 2.5, 0.04, 0.04]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Bottom cross bar */}
        <mesh position={[extX, extY, 0]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[0.04, 0.04, 1.2]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Middle cross bar */}
        <mesh position={[midX, midY, 0]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[0.04, 0.04, 1.2]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Top cross bar */}
        <mesh position={[topX, topY, 0]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[0.04, 0.04, 1.2]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Pivot cross bar */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[0.05, 0.05, 1.2]} />
          <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      {/* Panel surface with solar cells */}
      <mesh
        position={[(topX + extX * 0.5) / 2, (topY + extY * 0.5) / 2, 0]}
        rotation={[0, 0, tRad]}
      >
        <boxGeometry args={[pL * 2.3, 0.02, 1.1]} />
        <meshStandardMaterial color={COLORS.panelSurface} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Solar cells grid */}
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 3 }).map((_, col) => {
          const cellX = extX * 0.3 + (row + 0.5) * (pL * 2.2 / 6) * Math.cos(tRad)
          const cellY = extY * 0.3 + (row + 0.5) * (pL * 2.2 / 6) * Math.sin(tRad)
          const cellZ = (col - 1) * 0.32
          return (
            <mesh
              key={`${row}-${col}`}
              position={[cellX, cellY + 0.015, cellZ]}
              rotation={[0, 0, tRad]}
            >
              <boxGeometry args={[0.3, 0.005, 0.28]} />
              <meshStandardMaterial color={COLORS.panelCell} metalness={0.5} roughness={0.2} />
            </mesh>
          )
        })
      )}

      {/* Dust layer */}
      {dustLevel > 10 && !isCleaning && (
        <mesh
          position={[(topX + extX * 0.5) / 2, (topY + extY * 0.5) / 2 + 0.02, 0]}
          rotation={[0, 0, tRad]}
        >
          <boxGeometry args={[pL * 2.3, 0.005, 1.1]} />
          <meshStandardMaterial
            color="#8B8000"
            transparent
            opacity={dustLevel / 150}
          />
        </mesh>
      )}

      {/* Brush motor - at extension position */}
      <group position={[extX - 0.15, extY, 0]} rotation={[0, 0, tRad]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.15, 12]} />
          <meshStandardMaterial color={COLORS.brushMotor} metalness={0.4} roughness={0.5} />
        </mesh>
        {/* Motor mount */}
        <mesh position={[0, 0, 0.08]}>
          <boxGeometry args={[0.1, 0.08, 0.02]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      {/* Cleaning brush */}
      <group position={[bX, bY, 0]} rotation={[0, 0, tRad]}>
        {/* Brush body */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
          <meshStandardMaterial
            color={isCleaning ? COLORS.brushActive : COLORS.brush}
            emissive={isCleaning ? COLORS.brushActive : "#000000"}
            emissiveIntensity={isCleaning ? 0.3 : 0}
          />
        </mesh>
        {/* Brush bristles */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * Math.PI * 2) / 8
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.05, 0, Math.sin(angle) * 0.5]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.015, 0.015, 0.06, 4]} />
              <meshStandardMaterial color="#666666" />
            </mesh>
          )
        })}
      </group>

      {/* Drive rod from motor to brush */}
      <mesh position={[(extX + bX) / 2, (extY + bY) / 2, 0]} rotation={[0, 0, tRad]}>
        <boxGeometry args={[Math.max(0.05, Math.sqrt((bX - extX) ** 2 + (bY - extY) ** 2)), 0.015, 0.015]} />
        <meshStandardMaterial color="#44aa44" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

// Main Solar Tracker 3D component
function SolarTracker3D({ state }: { state: TrackerState }) {
  const { pan, tilt, dustLevel, isCleaning, cleaningProgress, sunAzimuth, sunElevation } = state

  const tRad = (tilt * Math.PI) / 180
  const pL = PANEL_LENGTH
  const midX = Math.cos(tRad) * pL
  const midY = PANEL_BASE_Y + Math.sin(tRad) * pL

  // Worm gear position (exactly like HTML)
  const wormX = 1.1 - (tilt * 0.011)

  // Sun direction for LDR intensity
  const sunRadAz = (sunAzimuth * Math.PI) / 180
  const sunRadEl = (sunElevation * Math.PI) / 180
  const sunDir = {
    x: Math.cos(sunRadEl) * Math.sin(sunRadAz),
    y: Math.sin(sunRadEl),
    z: Math.cos(sunRadEl) * Math.cos(sunRadAz)
  }

  // Calculate LDR intensities
  const getLDRIntensity = useCallback((sensorType: string) => {
    const angleOffset = (30 * Math.PI) / 180
    let localNormal: { x: number; y: number; z: number }

    switch (sensorType) {
      case 'top':
        localNormal = { x: Math.sin(tRad + angleOffset), y: Math.cos(tRad + angleOffset), z: 0 }
        break
      case 'bottom':
        localNormal = { x: Math.sin(tRad - angleOffset), y: Math.cos(tRad - angleOffset), z: 0 }
        break
      case 'left':
        localNormal = {
          x: Math.sin(tRad) * Math.cos(angleOffset),
          y: Math.cos(tRad) * Math.cos(angleOffset),
          z: -Math.sin(angleOffset)
        }
        break
      case 'right':
        localNormal = {
          x: Math.sin(tRad) * Math.cos(angleOffset),
          y: Math.cos(tRad) * Math.cos(angleOffset),
          z: Math.sin(angleOffset)
        }
        break
      default:
        localNormal = { x: Math.sin(tRad), y: Math.cos(tRad), z: 0 }
    }

    const pRad = (pan * Math.PI) / 180
    const worldNormal = {
      x: localNormal.x * Math.cos(pRad) - localNormal.z * Math.sin(pRad),
      y: localNormal.y,
      z: localNormal.x * Math.sin(pRad) + localNormal.z * Math.cos(pRad)
    }

    const len = Math.sqrt(worldNormal.x ** 2 + worldNormal.y ** 2 + worldNormal.z ** 2)
    worldNormal.x /= len
    worldNormal.y /= len
    worldNormal.z /= len

    const dot = worldNormal.x * sunDir.x + worldNormal.y * sunDir.y + worldNormal.z * sunDir.z
    let intensity = Math.max(0, dot)
    intensity *= 1 - dustLevel / 150

    return intensity
  }, [tRad, pan, sunDir, dustLevel])

  const topInt = getLDRIntensity('top')
  const bottomInt = getLDRIntensity('bottom')
  const leftInt = getLDRIntensity('left')
  const rightInt = getLDRIntensity('right')

  const topX = Math.cos(tRad) * (pL * 2)
  const topY = PANEL_BASE_Y + Math.sin(tRad) * (pL * 2)

  return (
    <group>
      {/* Sun */}
      <Sun azimuth={sunAzimuth} elevation={sunElevation} />

      {/* ========== STATIC BASE (not rotating) ========== */}
      <group>
        {/* Base plate */}
        <mesh position={[0, -0.025, 0]}>
          <boxGeometry args={[2.2, 0.05, 2.2]} />
          <meshStandardMaterial color={COLORS.basePlate} metalness={0.3} roughness={0.7} />
        </mesh>

        {/* Corner mounting bolts */}
        {[[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]].map(([x, z], i) => (
          <Bolt key={i} position={[x, 0, z]} scale={0.8} />
        ))}

        {/* Base motor */}
        <Motor position={[0, 0, 0]} radius={0.4} height={0.45} />

        {/* Motor output shaft (to Y=0.9) */}
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.35, 12]} />
          <meshStandardMaterial color={COLORS.shaft} metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Batteries at corners */}
        <Battery position={[-0.7, 0, -0.7]} />
        <Battery position={[0.7, 0, -0.7]} />
        <Battery position={[-0.7, 0, 0.7]} />
        <Battery position={[0.7, 0, 0.7]} />

        {/* Cable routing from batteries to motor */}
        <Cable start={[-0.6, 0.26, -0.7]} end={[-0.2, 0.1, -0.2]} />
        <Cable start={[0.6, 0.26, -0.7]} end={[0.2, 0.1, -0.2]} />
        <Cable start={[-0.6, 0.26, 0.7]} end={[-0.2, 0.1, 0.2]} />
        <Cable start={[0.6, 0.26, 0.7]} end={[0.2, 0.1, 0.2]} />
      </group>

      {/* ========== ROTATING ASSEMBLY (rotates with pan) ========== */}
      <group rotation={[0, (pan * Math.PI) / 180, 0]}>
        {/* Slew bearing at Y=0.85 */}
        <BearingHousing position={[0, 0.85, 0]} innerRadius={0.1} outerRadius={0.18} height={0.08} />

        {/* Rotating chassis plate */}
        <mesh position={[0, 0.92, 0]}>
          <boxGeometry args={[2.8, 0.04, 1.0]} />
          <meshStandardMaterial color={COLORS.chassis} metalness={0.4} roughness={0.6} />
        </mesh>

        {/* Chassis cross members */}
        <mesh position={[0, 0.92, -0.35]}>
          <boxGeometry args={[2.6, 0.03, 0.06]} />
          <meshStandardMaterial color={COLORS.chassis} metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.92, 0.35]}>
          <boxGeometry args={[2.6, 0.03, 0.06]} />
          <meshStandardMaterial color={COLORS.chassis} metalness={0.4} roughness={0.5} />
        </mesh>

        {/* Elevation bearing pillar - left */}
        <group position={[0, 0.94, -0.4]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.12, 0.6, 0.08]} />
            <meshStandardMaterial color={COLORS.chassis} metalness={0.4} roughness={0.6} />
          </mesh>
          <BearingHousing position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} innerRadius={0.04} outerRadius={0.07} height={0.05} />
        </group>

        {/* Elevation bearing pillar - right */}
        <group position={[0, 0.94, 0.4]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.12, 0.6, 0.08]} />
            <meshStandardMaterial color={COLORS.chassis} metalness={0.4} roughness={0.6} />
          </mesh>
          <BearingHousing position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} innerRadius={0.04} outerRadius={0.07} height={0.05} />
        </group>

        {/* Elevation shaft (horizontal pivot axis at Y=1.54-1.6) */}
        <mesh position={[0, PANEL_BASE_Y - 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.9, 12]} />
          <meshStandardMaterial color={COLORS.elevationShaft} metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Worm gear motor (at right side) */}
        <Motor position={[1.2, 0.85, 0]} radius={0.15} height={0.2} horizontal />
        <mesh position={[1.25, 0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
          <meshStandardMaterial color={COLORS.shaft} metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Worm gear threaded rod */}
        <mesh position={[0.05, 0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 2.2, 8]} />
          <meshStandardMaterial color={COLORS.wormGear} metalness={0.7} roughness={0.2} />
        </mesh>

        {/* Worm gear slider/carriage */}
        <group position={[wormX, 0.95, 0]}>
          <mesh>
            <boxGeometry args={[0.12, 0.1, 0.08]} />
            <meshStandardMaterial color={COLORS.slider} metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Clevis/attachment point */}
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.06, 0.08, 0.04]} />
            <meshStandardMaterial color={COLORS.slider} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>

        {/* Push rod from slider to panel mid-point */}
        {(() => {
          const rodStartX = wormX
          const rodStartY = 0.95 + 0.12
          const rodEndX = midX
          const rodEndY = midY
          const rodLength = Math.sqrt((rodEndX - rodStartX) ** 2 + (rodEndY - rodStartY) ** 2)
          const rodAngle = Math.atan2(rodEndY - rodStartY, rodEndX - rodStartX)
          const rodMidX = (rodStartX + rodEndX) / 2
          const rodMidY = (rodStartY + rodEndY) / 2

          return (
            <mesh position={[rodMidX, rodMidY, 0]} rotation={[0, 0, rodAngle - Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, rodLength, 8]} />
              <meshStandardMaterial color="#e8e8e8" metalness={0.6} roughness={0.3} />
            </mesh>
          )
        })()}

        {/* Cable from worm motor up to panel area */}
        <Cable start={[1.1, 0.85, 0.1]} end={[0.3, 1.4, 0.3]} color="#333333" />

        {/* Solar Panel Assembly */}
        <SolarPanel
          tilt={tilt}
          dustLevel={dustLevel}
          isCleaning={isCleaning}
          cleaningProgress={cleaningProgress}
        />

        {/* LDR sensors on panel */}
        <LDRSensor position={[topX, topY + 0.03, 0]} intensity={topInt} />
        <LDRSensor position={[0, PANEL_BASE_Y + 0.03, 0]} intensity={bottomInt} />
        <LDRSensor position={[midX, midY + 0.03, -0.58]} intensity={leftInt} />
        <LDRSensor position={[midX, midY + 0.03, 0.58]} intensity={rightInt} />
      </group>
    </group>
  )
}

// Animation loop component
function AnimationController({ state, setState }: {
  state: TrackerState
  setState: React.Dispatch<React.SetStateAction<TrackerState>>
}) {
  useFrame(() => {
    setState(prev => {
      const newState = { ...prev }

      // Auto dust accumulation
      if (!prev.isCleaning) {
        newState.dustLevel = Math.min(100, prev.dustLevel + 0.002)
      }

      // Auto clean trigger at 70%
      if (prev.dustLevel > 70 && !prev.isCleaning) {
        newState.isCleaning = true
        newState.cleaningProgress = 0
      }

      // Cleaning animation
      if (prev.isCleaning) {
        newState.cleaningProgress = prev.cleaningProgress + 0.008
        newState.dustLevel = Math.max(0, prev.dustLevel - 0.8)

        if (newState.cleaningProgress >= 1) {
          newState.isCleaning = false
          newState.cleaningProgress = 0
        }
      }

      // Sun tracking logic (exactly like HTML)
      const tRad = (prev.tilt * Math.PI) / 180
      const sunRadAz = (prev.sunAzimuth * Math.PI) / 180
      const sunRadEl = (prev.sunElevation * Math.PI) / 180
      const sunDir = {
        x: Math.cos(sunRadEl) * Math.sin(sunRadAz),
        y: Math.sin(sunRadEl),
        z: Math.cos(sunRadEl) * Math.cos(sunRadAz)
      }

      const getLDRIntensity = (sensorType: string) => {
        const angleOffset = (30 * Math.PI) / 180
        let localNormal: { x: number; y: number; z: number }

        switch (sensorType) {
          case 'top':
            localNormal = { x: Math.sin(tRad + angleOffset), y: Math.cos(tRad + angleOffset), z: 0 }
            break
          case 'bottom':
            localNormal = { x: Math.sin(tRad - angleOffset), y: Math.cos(tRad - angleOffset), z: 0 }
            break
          case 'left':
            localNormal = {
              x: Math.sin(tRad) * Math.cos(angleOffset),
              y: Math.cos(tRad) * Math.cos(angleOffset),
              z: -Math.sin(angleOffset)
            }
            break
          case 'right':
            localNormal = {
              x: Math.sin(tRad) * Math.cos(angleOffset),
              y: Math.cos(tRad) * Math.cos(angleOffset),
              z: Math.sin(angleOffset)
            }
            break
          default:
            localNormal = { x: Math.sin(tRad), y: Math.cos(tRad), z: 0 }
        }

        const pRad = (prev.pan * Math.PI) / 180
        const worldNormal = {
          x: localNormal.x * Math.cos(pRad) - localNormal.z * Math.sin(pRad),
          y: localNormal.y,
          z: localNormal.x * Math.sin(pRad) + localNormal.z * Math.cos(pRad)
        }

        const len = Math.sqrt(worldNormal.x ** 2 + worldNormal.y ** 2 + worldNormal.z ** 2)
        worldNormal.x /= len
        worldNormal.y /= len
        worldNormal.z /= len

        const dot = worldNormal.x * sunDir.x + worldNormal.y * sunDir.y + worldNormal.z * sunDir.z
        let intensity = Math.max(0, dot)
        intensity *= 1 - prev.dustLevel / 150

        return intensity
      }

      const topInt = getLDRIntensity('top')
      const bottomInt = getLDRIntensity('bottom')
      const leftInt = getLDRIntensity('left')
      const rightInt = getLDRIntensity('right')
      const avgIntensity = (topInt + bottomInt + leftInt + rightInt) / 4

      const LIGHT_THRESHOLD = 0.15
      const DEADBAND = 0.05
      const trackingActive = avgIntensity > LIGHT_THRESHOLD

      if (trackingActive) {
        const panDiff = rightInt - leftInt
        if (Math.abs(panDiff) > DEADBAND) {
          newState.targetPan = (prev.targetPan + panDiff * 0.8) % 360
          if (newState.targetPan < 0) newState.targetPan += 360
        }

        const tiltDiff = topInt - bottomInt
        if (Math.abs(tiltDiff) > DEADBAND) {
          newState.targetTilt = Math.max(0, Math.min(80, prev.targetTilt + tiltDiff * 0.4))
        }
      } else {
        newState.targetPan = 180
        newState.targetTilt = 30
      }

      // Smooth movement
      let panError = newState.targetPan - prev.pan
      if (panError > 180) panError -= 360
      if (panError < -180) panError += 360
      newState.pan = prev.pan + panError * 0.03
      newState.tilt = prev.tilt + (newState.targetTilt - prev.tilt) * 0.04
      newState.pan = ((newState.pan % 360) + 360) % 360

      return newState
    })
  })

  return null
}

// Control Panel UI
function ControlPanel({ state, setState }: {
  state: TrackerState
  setState: React.Dispatch<React.SetStateAction<TrackerState>>
}) {
  const startManualClean = () => {
    if (!state.isCleaning) {
      setState(s => ({ ...s, isCleaning: true, cleaningProgress: 0 }))
    }
  }

  const simulateDust = () => {
    setState(s => ({ ...s, dustLevel: Math.min(100, s.dustLevel + 15) }))
  }

  // Calculate LDR voltages for display
  const tRad = (state.tilt * Math.PI) / 180
  const sunRadAz = (state.sunAzimuth * Math.PI) / 180
  const sunRadEl = (state.sunElevation * Math.PI) / 180
  const sunDir = {
    x: Math.cos(sunRadEl) * Math.sin(sunRadAz),
    y: Math.sin(sunRadEl),
    z: Math.cos(sunRadEl) * Math.cos(sunRadAz)
  }

  const getLDRVoltage = (sensorType: string) => {
    const angleOffset = (30 * Math.PI) / 180
    let localNormal: { x: number; y: number; z: number }

    switch (sensorType) {
      case 'top':
        localNormal = { x: Math.sin(tRad + angleOffset), y: Math.cos(tRad + angleOffset), z: 0 }
        break
      case 'bottom':
        localNormal = { x: Math.sin(tRad - angleOffset), y: Math.cos(tRad - angleOffset), z: 0 }
        break
      case 'left':
        localNormal = {
          x: Math.sin(tRad) * Math.cos(angleOffset),
          y: Math.cos(tRad) * Math.cos(angleOffset),
          z: -Math.sin(angleOffset)
        }
        break
      case 'right':
        localNormal = {
          x: Math.sin(tRad) * Math.cos(angleOffset),
          y: Math.cos(tRad) * Math.cos(angleOffset),
          z: Math.sin(angleOffset)
        }
        break
      default:
        localNormal = { x: Math.sin(tRad), y: Math.cos(tRad), z: 0 }
    }

    const pRad = (state.pan * Math.PI) / 180
    const worldNormal = {
      x: localNormal.x * Math.cos(pRad) - localNormal.z * Math.sin(pRad),
      y: localNormal.y,
      z: localNormal.x * Math.sin(pRad) + localNormal.z * Math.cos(pRad)
    }

    const len = Math.sqrt(worldNormal.x ** 2 + worldNormal.y ** 2 + worldNormal.z ** 2)
    worldNormal.x /= len
    worldNormal.y /= len
    worldNormal.z /= len

    const dot = worldNormal.x * sunDir.x + worldNormal.y * sunDir.y + worldNormal.z * sunDir.z
    let intensity = Math.max(0, dot)
    intensity *= 1 - state.dustLevel / 150

    return (intensity * 3.3).toFixed(2)
  }

  const avgIntensity = (
    parseFloat(getLDRVoltage('top')) +
    parseFloat(getLDRVoltage('bottom')) +
    parseFloat(getLDRVoltage('left')) +
    parseFloat(getLDRVoltage('right'))
  ) / 4 / 3.3

  const trackingActive = avgIntensity > 0.15

  return (
    <div className="absolute right-4 top-4 w-72 space-y-3 font-mono text-xs">
      {/* Status Panel */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 backdrop-blur">
        <h3 className="mb-2 border-b border-zinc-700 pb-1 font-semibold text-zinc-300">System Status</h3>
        <div className="space-y-1 text-zinc-400">
          <div className="flex justify-between">
            <span>Tracking:</span>
            <span className={trackingActive ? "text-green-400" : "text-yellow-400"}>
              {trackingActive ? "ACTIVE" : "PARKED"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Pan Angle:</span>
            <span className="text-cyan-400">{state.pan.toFixed(1)}°</span>
          </div>
          <div className="flex justify-between">
            <span>Tilt Angle:</span>
            <span className="text-cyan-400">{state.tilt.toFixed(1)}°</span>
          </div>
        </div>
      </div>

      {/* Sun Control */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 backdrop-blur">
        <h3 className="mb-2 border-b border-zinc-700 pb-1 font-semibold text-zinc-300">Sun Position</h3>
        <div className="space-y-2">
          <div>
            <label className="mb-1 flex justify-between text-zinc-400">
              <span>Azimuth</span>
              <span className="text-yellow-400">{state.sunAzimuth}°</span>
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={state.sunAzimuth}
              onChange={(e) => setState(s => ({ ...s, sunAzimuth: Number(e.target.value) }))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700"
            />
          </div>
          <div>
            <label className="mb-1 flex justify-between text-zinc-400">
              <span>Elevation</span>
              <span className="text-orange-400">{state.sunElevation}°</span>
            </label>
            <input
              type="range"
              min="0"
              max="90"
              value={state.sunElevation}
              onChange={(e) => setState(s => ({ ...s, sunElevation: Number(e.target.value) }))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-700"
            />
          </div>
        </div>
      </div>

      {/* LDR Readings */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 backdrop-blur">
        <h3 className="mb-2 border-b border-zinc-700 pb-1 font-semibold text-zinc-300">LDR Sensors (V)</h3>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded bg-zinc-800 p-1">
            <div className="text-zinc-500">Top</div>
            <div className="text-green-400">{getLDRVoltage('top')}</div>
          </div>
          <div className="rounded bg-zinc-800 p-1">
            <div className="text-zinc-500">Bottom</div>
            <div className="text-green-400">{getLDRVoltage('bottom')}</div>
          </div>
          <div className="rounded bg-zinc-800 p-1">
            <div className="text-zinc-500">Left</div>
            <div className="text-blue-400">{getLDRVoltage('left')}</div>
          </div>
          <div className="rounded bg-zinc-800 p-1">
            <div className="text-zinc-500">Right</div>
            <div className="text-blue-400">{getLDRVoltage('right')}</div>
          </div>
        </div>
      </div>

      {/* Dust & Cleaning */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 backdrop-blur">
        <h3 className="mb-2 border-b border-zinc-700 pb-1 font-semibold text-zinc-300">Cleaning System</h3>
        <div className="mb-2 space-y-1 text-zinc-400">
          <div className="flex justify-between">
            <span>Dust Level:</span>
            <span className={state.dustLevel > 70 ? "text-red-400" : state.dustLevel > 40 ? "text-yellow-400" : "text-green-400"}>
              {state.dustLevel.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-700">
            <div
              className={`h-full transition-all ${state.dustLevel > 70 ? "bg-red-500" : state.dustLevel > 40 ? "bg-yellow-500" : "bg-green-500"}`}
              style={{ width: `${state.dustLevel}%` }}
            />
          </div>
          {state.isCleaning && (
            <div className="mt-1 text-cyan-400">
              Cleaning: {(state.cleaningProgress * 100).toFixed(0)}%
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={startManualClean}
            disabled={state.isCleaning}
            className="flex-1 rounded bg-cyan-600 px-2 py-1.5 text-white transition hover:bg-cyan-500 disabled:opacity-50"
          >
            {state.isCleaning ? "Cleaning..." : "Clean Now"}
          </button>
          <button
            onClick={simulateDust}
            className="flex-1 rounded bg-amber-600 px-2 py-1.5 text-white transition hover:bg-amber-500"
          >
            Add Dust
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 text-center text-zinc-500 backdrop-blur">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  )
}

// Main Scene Export
export default function SolarTrackerScene() {
  const [state, setState] = useState<TrackerState>({
    pan: 180,
    tilt: 30,
    targetPan: 180,
    targetTilt: 30,
    sunAzimuth: 135,
    sunElevation: 45,
    dustLevel: 15,
    isCleaning: false,
    cleaningProgress: 0,
  })

  return (
    <div className="relative h-screen w-full bg-zinc-950">
      <Canvas
        camera={{ position: [4, 3, 4], fov: 50 }}
        gl={{ antialias: true, powerPreference: "default" }}
        dpr={[1, 1.5]}
      >
        {/* 1. Change to a soft sky/studio blue background */}
        <color attach="background" args={["#d8e2eb"]} />

        {/* 2. Boost ambient light slightly so the dark metals show their detail */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 15, 10]} intensity={0.8} />
        <directionalLight position={[-5, 10, -5]} intensity={0.3} />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={15}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />

        <AnimationController state={state} setState={setState} />
        <SolarTracker3D state={state} />

        {/* 3. Lighten the ground plane to a concrete/light grey */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#cccccc" roughness={0.8} />
        </mesh>

        {/* 4. Adjust the grid helper to contrast against the new light ground */}
        <gridHelper args={[20, 40, "#888888", "#aaaaaa"]} position={[0, -0.04, 0]} />
      </Canvas>

      <ControlPanel state={state} setState={setState} />
    </div>
  )
}
