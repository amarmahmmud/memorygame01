"use client"

import { useMemo } from "react"

interface WormGearMechanismProps {
  tilt: number
}

export function WormGearMechanism({ tilt }: WormGearMechanismProps) {
  // Calculate actuator extension based on tilt
  const actuatorExtension = useMemo(() => {
    const minLength = 0.6
    const maxLength = 1.2
    const normalizedTilt = tilt / 80
    return minLength + normalizedTilt * (maxLength - minLength)
  }, [tilt])

  // Calculate actuator angle based on geometry
  const actuatorAngle = useMemo(() => {
    return Math.atan2(0.3 + tilt * 0.008, 0.5) - Math.PI / 6
  }, [tilt])

  return (
    <group position={[0.7, 1.25, 0]}>
      {/* Linear actuator base mount / clevis */}
      <group position={[0.2, -0.15, 0]}>
        {/* Clevis bracket */}
        <mesh>
          <boxGeometry args={[0.12, 0.15, 0.18]} />
          <meshStandardMaterial color="red" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* Clevis pin */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.22, 8]} />
          <meshStandardMaterial color="#888899" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Pin retaining clips */}
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 8]} />
          <meshStandardMaterial color="#666677" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 8]} />
          <meshStandardMaterial color="#666677" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>

      {/* Linear actuator body */}
      <group position={[0.2, -0.15, 0]} rotation={[0, 0, actuatorAngle]}>
        {/* Outer cylinder (motor housing) */}
        <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 0.3, 16]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.75} roughness={0.3} />
        </mesh>

        {/* Motor end cap */}
        <mesh position={[0.31, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.085, 0.08, 0.02, 16]} />
          <meshStandardMaterial color="#2a2a3a" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* Inner tube (extends) */}
        <mesh
          position={[-0.1 - actuatorExtension / 2, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.05, 0.05, actuatorExtension, 12]} />
          <meshStandardMaterial color="#888899" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Actuator rod end / clevis */}
        <group position={[-0.1 - actuatorExtension, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.08, 0.1, 0.12]} />
            <meshStandardMaterial color="#4a4a5a" metalness={0.8} roughness={0.25} />
          </mesh>

          {/* Rod end pin hole */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.03, 0.015, 8, 12]} />
            <meshStandardMaterial color="#666677" metalness={0.9} roughness={0.15} />
          </mesh>
        </group>

        {/* Wiper seal at tube junction */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.06, 0.012, 8, 16]} />
          <meshStandardMaterial color="#222222" metalness={0.3} roughness={0.8} />
        </mesh>
      </group>

      {/* Push rod connecting to panel frame */}
      <group>
        {/* Connection arm to panel pivot */}
        <mesh position={[-0.3, 0.6, 0]} rotation={[0, 0, -Math.PI / 4 + tilt * 0.008]}>
          <boxGeometry args={[0.08, 0.5, 0.06]} />
          <meshStandardMaterial color="#5a5a6a" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* Pivot pin at panel connection */}
        <mesh position={[-0.45, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.15, 8]} />
          <meshStandardMaterial color="#888899" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Limit switches bracket */}
      <group position={[0.35, -0.1, 0.12]}>
        <mesh>
          <boxGeometry args={[0.06, 0.08, 0.04]} />
          <meshStandardMaterial color="#2d4a2d" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* Switch lever */}
        <mesh position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
          <boxGeometry args={[0.04, 0.015, 0.02]} />
          <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Second limit switch */}
      <group position={[0.35, -0.1, -0.12]}>
        <mesh>
          <boxGeometry args={[0.06, 0.08, 0.04]} />
          <meshStandardMaterial color="#2d4a2d" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
          <boxGeometry args={[0.04, 0.015, 0.02]} />
          <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}
