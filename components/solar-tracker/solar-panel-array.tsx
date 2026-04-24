"use client"

import { useMemo } from "react"

interface SolarPanelArrayProps {
  dustLevel: number
  isCleaning: boolean
  cleaningProgress: number
}

export function SolarPanelArray({ dustLevel, isCleaning, cleaningProgress }: SolarPanelArrayProps) {
  const panelWidth = 1.8
  const panelHeight = 1.2
  const frameThickness = 0.08

  const brushPosition = useMemo(() => {
    if (isCleaning) {
      return -panelHeight / 2 + cleaningProgress * panelHeight
    }
    return -panelHeight / 2
  }, [isCleaning, cleaningProgress, panelHeight])

  return (
    <group>
      {/* Main panel frame - aluminum extrusion profile */}
      <group>
        {/* Bottom frame rail */}
        <mesh position={[0, -panelHeight / 2, 0]}>
          <boxGeometry args={[panelWidth + 0.1, frameThickness, 0.06]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Top frame rail */}
        <mesh position={[0, panelHeight / 2, 0]}>
          <boxGeometry args={[panelWidth + 0.1, frameThickness, 0.06]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Left frame rail */}
        <mesh position={[-panelWidth / 2, 0, 0]}>
          <boxGeometry args={[frameThickness, panelHeight, 0.06]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Right frame rail */}
        <mesh position={[panelWidth / 2, 0, 0]}>
          <boxGeometry args={[frameThickness, panelHeight, 0.06]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Center support rail */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[frameThickness * 0.8, panelHeight, 0.05]} />
          <meshStandardMaterial color="#a0a0a0" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>

      {/* Solar cells - dark blue with grid pattern */}
      <group position={[0, 0, 0.03]}>
        {/* Left panel section */}
        <mesh position={[-panelWidth / 4 - 0.02, 0, 0]}>
          <planeGeometry args={[panelWidth / 2 - 0.12, panelHeight - 0.12]} />
          <meshStandardMaterial color="#1a237e" metalness={0.4} roughness={0.6} />
        </mesh>

        {/* Right panel section */}
        <mesh position={[panelWidth / 4 + 0.02, 0, 0]}>
          <planeGeometry args={[panelWidth / 2 - 0.12, panelHeight - 0.12]} />
          <meshStandardMaterial color="#1a237e" metalness={0.4} roughness={0.6} />
        </mesh>

        {/* Cell grid lines - horizontal */}
        {[-0.45, -0.15, 0.15, 0.45].map((y, i) => (
          <mesh key={`hline-${i}`} position={[0, y, 0.001]}>
            <planeGeometry args={[panelWidth - 0.15, 0.008]} />
            <meshStandardMaterial color="#0d1547" />
          </mesh>
        ))}

        {/* Cell grid lines - vertical */}
        {[-0.7, -0.3, 0.1, 0.5].map((x, i) => (
          <mesh key={`vline-${i}`} position={[x, 0, 0.001]}>
            <planeGeometry args={[0.008, panelHeight - 0.15]} />
            <meshStandardMaterial color="#0d1547" />
          </mesh>
        ))}

        {/* Dust overlay */}
        {dustLevel > 5 && !isCleaning && (
          <mesh position={[0, 0, 0.005]}>
            <planeGeometry args={[panelWidth - 0.1, panelHeight - 0.1]} />
            <meshStandardMaterial
              color="#8b7355"
              transparent
              opacity={dustLevel / 200}
            />
          </mesh>
        )}
      </group>

      {/* Back of panel - junction box */}
      <group position={[0, -0.3, -0.05]}>
        <mesh>
          <boxGeometry args={[0.2, 0.12, 0.06]} />
          <meshStandardMaterial color="#2a2a3a" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Cable exits */}
        <mesh position={[-0.06, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.08, 6]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
        <mesh position={[0.06, 0, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.08, 6]} />
          <meshStandardMaterial color="#cc0000" />
        </mesh>
      </group>

      {/* Mounting bracket connection points */}
      {[
        [-0.6, 0, -0.04],
        [0.6, 0, -0.04],
      ].map((pos, i) => (
        <group key={`mount-${i}`} position={pos as [number, number, number]}>
          <mesh>
            <boxGeometry args={[0.15, 0.08, 0.1]} />
            <meshStandardMaterial color="#4a4a5a" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* Bolt holes */}
          <mesh position={[-0.04, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
            <meshStandardMaterial color="#666677" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[0.04, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
            <meshStandardMaterial color="#666677" metalness={0.95} roughness={0.1} />
          </mesh>
        </group>
      ))}

      {/* LDR sensors at corners */}
      {/* Top sensor */}
      <group position={[0, panelHeight / 2 + 0.1, 0.02]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
          <meshStandardMaterial color="#3a5a3a" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial
            color="#ffcc00"
            emissive="#ffaa00"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>

      {/* Bottom sensor */}
      <group position={[0, -panelHeight / 2 - 0.1, 0.02]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
          <meshStandardMaterial color="#3a5a3a" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial
            color="#ffcc00"
            emissive="#ffaa00"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>

      {/* Left sensor */}
      <group position={[-panelWidth / 2 - 0.1, 0, 0.02]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
          <meshStandardMaterial color="#3a5a3a" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial
            color="#ffcc00"
            emissive="#ffaa00"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>

      {/* Right sensor */}
      <group position={[panelWidth / 2 + 0.1, 0, 0.02]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
          <meshStandardMaterial color="#3a5a3a" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial
            color="#ffcc00"
            emissive="#ffaa00"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>

      {/* Cleaning system */}
      <group>
        {/* Brush motor housing */}
        <group position={[-panelWidth / 2 - 0.15, -panelHeight / 2, 0]}>
          <mesh>
            <boxGeometry args={[0.12, 0.12, 0.15]} />
            <meshStandardMaterial color="#ff6600" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Motor shaft */}
          <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.1, 8]} />
            <meshStandardMaterial color="#888899" metalness={0.95} roughness={0.1} />
          </mesh>
        </group>

        {/* Guide rails */}
        <mesh position={[-panelWidth / 2 - 0.05, 0, 0.04]}>
          <boxGeometry args={[0.03, panelHeight, 0.02]} />
          <meshStandardMaterial color="#666677" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[panelWidth / 2 + 0.05, 0, 0.04]}>
          <boxGeometry args={[0.03, panelHeight, 0.02]} />
          <meshStandardMaterial color="#666677" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Cleaning brush */}
        <group position={[0, brushPosition, 0.05]}>
          {/* Brush bar */}
          <mesh>
            <boxGeometry args={[panelWidth + 0.1, 0.06, 0.04]} />
            <meshStandardMaterial
              color={isCleaning ? "#00ffff" : "#ff4444"}
              emissive={isCleaning ? "#00ffff" : "#ff0000"}
              emissiveIntensity={isCleaning ? 0.5 : 0.2}
            />
          </mesh>

          {/* Brush bristles */}
          {Array.from({ length: 10 }).map((_, i) => (
            <mesh
              key={`bristle-${i}`}
              position={[-panelWidth / 2 + 0.1 + i * 0.19, -0.05, 0]}
            >
              <cylinderGeometry args={[0.015, 0.01, 0.08, 4]} />
              <meshStandardMaterial color="#444444" />
            </mesh>
          ))}

          {/* Belt connection */}
          <mesh position={[-panelWidth / 2 - 0.05, 0, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.03]} />
            <meshStandardMaterial color="#222222" />
          </mesh>
        </group>

        {/* Drive belt (simplified) */}
        <mesh position={[-panelWidth / 2 - 0.05, 0, 0.04]}>
          <boxGeometry args={[0.015, panelHeight, 0.01]} />
          <meshStandardMaterial color="#00ff00" metalness={0.3} roughness={0.7} />
        </mesh>
      </group>
    </group>
  )
}
