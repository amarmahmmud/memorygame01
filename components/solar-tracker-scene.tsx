"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useState, useRef, useMemo, useCallback } from "react"
import * as THREE from "three"

const PANEL_BASE_Y = 1.05 
const PANEL_LENGTH = 1.0 
const LEG_HEIGHT = 1.5 

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

function Bolt({ position, rotation = [0, 0, 0] as [number, number, number], scale = 1 }: {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.02, 6]} />
        <meshStandardMaterial color={COLORS.bolt} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
        <meshStandardMaterial color={COLORS.bolt} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

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

function BearingHousing({ position, rotation = [0, 0, 0] as [number, number, number], innerRadius = 0.05, outerRadius = 0.1, height = 0.06 }: {
  position: [number, number, number]
  rotation?: [number, number, number]
  innerRadius?: number
  outerRadius?: number
  height?: number
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[outerRadius, outerRadius * 1.1, height, 16]} />
        <meshStandardMaterial color={COLORS.bearing} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, height * 0.1, 0]}>
        <torusGeometry args={[(innerRadius + outerRadius) / 2, 0.012, 8, 24]} />
        <meshStandardMaterial color={COLORS.bearingInner} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, -height / 2 + 0.005, 0]}>
        <cylinderGeometry args={[outerRadius * 1.3, outerRadius * 1.3, 0.015, 16]} />
        <meshStandardMaterial color={COLORS.bearing} metalness={0.5} roughness={0.4} />
      </mesh>
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

function Motor({ position, radius, height, horizontal = false }: {
  position: [number, number, number]
  radius: number
  height: number
  horizontal?: boolean
}) {
  const rotation: [number, number, number] = horizontal ? [0, 0, Math.PI / 2] : [0, 0, 0]

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius, height, 16]} />
        <meshStandardMaterial color={COLORS.motor} metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, height + 0.02, 0]}>
        <cylinderGeometry args={[radius * 0.9, radius * 0.9, 0.04, 16]} />
        <meshStandardMaterial color={COLORS.motorAccent} metalness={0.5} roughness={0.4} />
      </mesh>
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
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[radius * 1.15, radius * 1.15, 0.025, 16]} />
        <meshStandardMaterial color={COLORS.motorAccent} metalness={0.4} roughness={0.5} />
      </mesh>
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

function LDRSensor({ position, intensity }: {
  position: [number, number, number]
  intensity: number
}) {
  const r = Math.min(255, 180 + Math.floor(75 * intensity))
  const g = Math.min(255, 100 + Math.floor(155 * intensity))
  const color = new THREE.Color(`rgb(${r}, ${g}, 0)`)

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.035, 0.03, 8]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.03, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} transparent opacity={0.9} emissive={color} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

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

function SolarPanel({ tilt, dustLevel, isCleaning, cleaningProgress }: {
  tilt: number
  dustLevel: number
  isCleaning: boolean
  cleaningProgress: number
}) {
  const tRad = (tilt * Math.PI) / 180
  const pL = PANEL_LENGTH

  const midX = Math.cos(tRad) * pL
  const midY = Math.sin(tRad) * pL
  const topX = Math.cos(tRad) * (pL * 2)
  const topY = Math.sin(tRad) * (pL * 2)
  const extX = Math.cos(tRad) * (-pL * 0.5)
  const extY = Math.sin(tRad) * (-pL * 0.5)

  const bTravel = isCleaning ? cleaningProgress * 2 : 0
  const bX = Math.cos(tRad) * (pL * bTravel)
  const bY = Math.sin(tRad) * (pL * bTravel)

  return (
    <group position={[0, PANEL_BASE_Y, 0]}>
      <group>
        <mesh position={[(extX + topX) / 2, (extY + topY) / 2, -0.58]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[pL * 2.5, 0.04, 0.04]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[(extX + topX) / 2, (extY + topY) / 2, 0.58]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[pL * 2.5, 0.04, 0.04]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[extX, extY, 0]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[0.04, 0.04, 1.2]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[midX, midY, 0]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[0.04, 0.04, 1.2]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[topX, topY, 0]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[0.04, 0.04, 1.2]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[0, 0, tRad]}>
          <boxGeometry args={[0.05, 0.05, 1.2]} />
          <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      <mesh
        position={[(topX + extX * 0.5) / 2, (topY + extY * 0.5) / 2, 0]}
        rotation={[0, 0, tRad]}
      >
        <boxGeometry args={[pL * 2.3, 0.02, 1.1]} />
        <meshStandardMaterial color={COLORS.panelSurface} metalness={0.3} roughness={0.4} />
      </mesh>

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

      <group position={[extX - 0.15, extY, 0]} rotation={[0, 0, tRad]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.15, 12]} />
          <meshStandardMaterial color={COLORS.brushMotor} metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.08]}>
          <boxGeometry args={[0.1, 0.08, 0.02]} />
          <meshStandardMaterial color={COLORS.panelFrame} metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      <group position={[bX, bY, 0]} rotation={[0, 0, tRad]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.1, 8]} />
          <meshStandardMaterial
            color={isCleaning ? COLORS.brushActive : COLORS.brush}
            emissive={isCleaning ? COLORS.brushActive : "#000000"}
            emissiveIntensity={isCleaning ? 0.3 : 0}
          />
        </mesh>
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

      <mesh position={[(extX + bX) / 2, (extY + bY) / 2, 0]} rotation={[0, 0, tRad]}>
        <boxGeometry args={[Math.max(0.05, Math.sqrt((bX - extX) ** 2 + (bY - extY) ** 2)), 0.015, 0.015]} />
        <meshStandardMaterial color="#44aa44" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  )
}

function SolarTracker3D({ state }: { state: TrackerState }) {
  const { pan, tilt, dustLevel, isCleaning, cleaningProgress, sunAzimuth, sunElevation } = state

  const pivotX = -1.3
  const tRad = (tilt * Math.PI) / 180
  const pL = PANEL_LENGTH
  
  const midX = pivotX + Math.cos(tRad) * pL
  const midY = PANEL_BASE_Y + Math.sin(tRad) * pL
  const topX = pivotX + Math.cos(tRad) * (pL * 2)
  const topY = PANEL_BASE_Y + Math.sin(tRad) * (pL * 2)
  
  const sunRadAz = (sunAzimuth * Math.PI) / 180
  const sunRadEl = (sunElevation * Math.PI) / 180
  const sunDir = {
    x: Math.cos(sunRadEl) * Math.sin(sunRadAz),
    y: Math.sin(sunRadEl),
    z: Math.cos(sunRadEl) * Math.cos(sunRadAz)
  }

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

  return (
    <group>
      <Sun azimuth={sunAzimuth} elevation={sunElevation} />

      <group>
        <mesh position={[0, LEG_HEIGHT - 0.2, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.4, 16]} />
          <meshStandardMaterial color={COLORS.motorAccent} metalness={0.6} roughness={0.4} />
        </mesh>
        {[45, 135, 225, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          return <Bolt key={i} position={[Math.cos(rad) * 0.4, LEG_HEIGHT, Math.sin(rad) * 0.4]} scale={1.2} />
        })}
        {[0, 90, 180, 270].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const outwardAngle = 25 * Math.PI / 180;
          const legLen = (LEG_HEIGHT - 0.2) / Math.cos(outwardAngle);
          return (
            <group key={i} position={[0, LEG_HEIGHT - 0.2, 0]} rotation={[0, -rad, 0]}>
              <mesh position={[0.4, 0, 0]}>
                <boxGeometry args={[0.4, 0.25, 0.25]} />
                <meshStandardMaterial color={COLORS.panelFrame} metalness={0.6} roughness={0.4} />
              </mesh>
              <mesh position={[0.6 + Math.sin(outwardAngle) * (legLen / 2), -Math.cos(outwardAngle) * (legLen / 2), 0]} rotation={[0, 0, outwardAngle]}>
                <boxGeometry args={[0.18, legLen, 0.18]} />
                <meshStandardMaterial color={COLORS.chassis} metalness={0.5} roughness={0.6} />
              </mesh>
              <mesh position={[0.6 + Math.sin(outwardAngle) * legLen, -(LEG_HEIGHT - 0.2) + 0.05, 0]}>
                <boxGeometry args={[0.4, 0.1, 0.3]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
              </mesh>
            </group>
          )
        })}
      </group>

      <group position={[0, LEG_HEIGHT, 0]}>
        <group rotation={[0, (pan * Math.PI) / 180, 0]} position={[0, -0.85, 0]}>
          <BearingHousing position={[0, 0.85, 0]} innerRadius={0.1} outerRadius={0.18} height={0.08} />

          <mesh position={[0, 0.92, 0]}>
            <boxGeometry args={[2.8, 0.04, 1.0]} />
            <meshStandardMaterial color={COLORS.chassis} metalness={0.4} roughness={0.6} />
          </mesh>

          <mesh position={[0, 0.92, -0.35]}>
            <boxGeometry args={[2.6, 0.03, 0.06]} />
            <meshStandardMaterial color={COLORS.chassis} metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.92, 0.35]}>
            <boxGeometry args={[2.6, 0.03, 0.06]} />
            <meshStandardMaterial color={COLORS.chassis} metalness={0.4} roughness={0.5} />
          </mesh>

          <BearingHousing position={[pivotX, 0.94, -0.4]} rotation={[Math.PI / 2, 0, 0]} innerRadius={0.04} outerRadius={0.07} height={0.05} />
          <BearingHousing position={[pivotX, 0.94, 0.4]} rotation={[Math.PI / 2, 0, 0]} innerRadius={0.04} outerRadius={0.07} height={0.05} />

          <mesh position={[pivotX, PANEL_BASE_Y - 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.9, 12]} />
            <meshStandardMaterial color={COLORS.elevationShaft} metalness={0.6} roughness={0.3} />
          </mesh>

          <Motor position={[1.2, 0.85, 0]} radius={0.15} height={0.2} horizontal />
          <mesh position={[0.05, 0.95, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 2.2, 8]} />
            <meshStandardMaterial color={COLORS.wormGear} metalness={0.7} roughness={0.2} />
          </mesh>

          {/* ========== RIGID INVERSE KINEMATICS LINKAGE BLOCK ========== */}
          {(() => {
            // 1. FIXED PHYSICAL DIMENSIONS (Natural Kinematics)
            const L_conn = 0.5;       // Rigid Connector Rod (Lever Tip to Panel)
            
            // UPDATED: Shifted chassis anchor backward (pivotX + L_conn)
            const aX = pivotX + L_conn; 
            const aY = 0.96; 
            const sY = 1.07;          // Slider Y level (locked on gear)
            const pX = midX;          // Moving Panel Pivot
            const pY = midY;

            const L_main = 1.0;       // Rigid Main Lever
            
            // MODIFIED: Shortened the driver rod by half (1.4 -> 0.7)
            const L_driver = 0.7;     // Rigid Driver Rod (Slider to Lever Midpoint)

            // 2. FIND LEVER TIP (Circle-Circle Intersection)
            const dx = pX - aX;
            const dy = pY - aY;
            let d = Math.sqrt(dx * dx + dy * dy);
            
            d = Math.max(Math.abs(L_main - L_conn) + 0.001, Math.min(L_main + L_conn - 0.001, d));

            const a = (L_main * L_main - L_conn * L_conn + d * d) / (2 * d);
            const h = Math.sqrt(Math.max(0, L_main * L_main - a * a));

            const x2 = aX + (a * dx) / d;
            const y2 = aY + (a * dy) / d;

            const tipX = x2 + (h * dy) / d;
            const tipY = y2 - (h * dx) / d;

            // 3. FIND LINKAGE MIDPOINT (Where driver rod attaches)
            const mainAng = Math.atan2(tipY - aY, tipX - aX);
            const cX = aX + Math.cos(mainAng) * (L_main * 0.5);
            const cY = aY + Math.sin(mainAng) * (L_main * 0.5);

            // 4. FIND SLIDER X (Fixed Length Driver Force)
            let yDiff = sY - cY;
            yDiff = Math.max(-L_driver + 0.001, Math.min(L_driver - 0.001, yDiff));
            const sX = cX + Math.sqrt(L_driver * L_driver - yDiff * yDiff);

            // 5. RENDERING ANGLES
            const driverAng = Math.atan2(cY - sY, cX - sX);
            const connAng = Math.atan2(pY - tipY, pX - tipX);

            return (
              <group>
                <group position={[sX, 0.95, 0]}>
                  <mesh><boxGeometry args={[0.12, 0.1, 0.08]} /><meshStandardMaterial color={COLORS.slider} /></mesh>
                  <mesh position={[0, 0.08, 0]}>
                    <boxGeometry args={[0.06, 0.08, 0.04]} /><meshStandardMaterial color={COLORS.slider} metalness={0.5} roughness={0.4} />
                  </mesh>
                </group>

                <mesh position={[(aX + tipX) / 2, (aY + tipY) / 2, 0]} rotation={[0, 0, mainAng - Math.PI / 2]}>
                  <cylinderGeometry args={[0.025, 0.025, L_main, 12]} />
                  <meshStandardMaterial color="#d0d0d0" metalness={0.7} roughness={0.2} />
                </mesh>

                <mesh position={[(tipX + pX) / 2, (tipY + pY) / 2, -0.03]} rotation={[0, 0, connAng - Math.PI / 2]}>
                  <cylinderGeometry args={[0.018, 0.018, L_conn, 12]} />
                  <meshStandardMaterial color="#88aacc" metalness={0.8} />
                </mesh>

                <mesh position={[(sX + cX) / 2, (sY + cY) / 2, 0.03]} rotation={[0, 0, driverAng - Math.PI / 2]}>
                  <cylinderGeometry args={[0.02, 0.02, L_driver, 12]} />
                  <meshStandardMaterial color="#e8e8e8" metalness={0.6} roughness={0.3} />
                </mesh>

                <mesh position={[aX, aY, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.12]} /><meshStandardMaterial color={COLORS.bearing} /></mesh>
                <mesh position={[tipX, tipY, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.025, 0.025, 0.1]} /><meshStandardMaterial color="#444" /></mesh>
                <mesh position={[cX, cY, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 0.14]} /><meshStandardMaterial color="#333" /></mesh>
                <mesh position={[sX, sY, 0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 0.08]} /><meshStandardMaterial color="#333" /></mesh>
                <mesh position={[pX, pY, -0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.04, 0.04, 0.1]} /><meshStandardMaterial color="#222" /></mesh>
              </group>
            )
          })()}

          <group position={[pivotX, 0, 0]}>
            <SolarPanel tilt={tilt} dustLevel={dustLevel} isCleaning={isCleaning} cleaningProgress={cleaningProgress} />
          </group>

          <LDRSensor position={[topX, topY + 0.03, 0]} intensity={topInt} />
          <LDRSensor position={[pivotX, PANEL_BASE_Y + 0.03, 0]} intensity={bottomInt} />
          <LDRSensor position={[midX, midY + 0.03, -0.58]} intensity={leftInt} />
          <LDRSensor position={[midX, midY + 0.03, 0.58]} intensity={rightInt} />
        </group>
      </group>
    </group>
  )
}

function AnimationController({ state, setState }: {
  state: TrackerState
  setState: React.Dispatch<React.SetStateAction<TrackerState>>
}) {
  useFrame(() => {
    setState(prev => {
      const newState = { ...prev }

      if (!prev.isCleaning) {
        newState.dustLevel = Math.min(100, prev.dustLevel + 0.002)
      }
      if (prev.dustLevel > 70 && !prev.isCleaning) {
        newState.isCleaning = true
        newState.cleaningProgress = 0
      }
      if (prev.isCleaning) {
        newState.cleaningProgress = prev.cleaningProgress + 0.008
        newState.dustLevel = Math.max(0, prev.dustLevel - 0.8)

        if (newState.cleaningProgress >= 1) {
          newState.isCleaning = false
          newState.cleaningProgress = 0
        }
      }

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

      <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 p-3 text-center text-zinc-500 backdrop-blur">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  )
}

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
        camera={{ position: [5, 4, 6], fov: 50 }}
        gl={{ antialias: true, powerPreference: "default" }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={["#d8e2eb"]} />
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
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#cccccc" roughness={0.8} />
        </mesh>
        <gridHelper args={[20, 40, "#888888", "#aaaaaa"]} position={[0, -0.04, 0]} />
      </Canvas>
      <ControlPanel state={state} setState={setState} />
    </div>
  )
}
