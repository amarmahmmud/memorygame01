"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface SunProps {
  azimuth: number
  elevation: number
}

export function Sun({ azimuth, elevation }: SunProps) {
  const glowRef = useRef<THREE.Mesh>(null)

  // Calculate sun position
  const sunDistance = 15
  const sunRadAz = (azimuth * Math.PI) / 180
  const sunRadEl = (elevation * Math.PI) / 180

  const sunX = Math.cos(sunRadEl) * Math.sin(sunRadAz) * sunDistance
  const sunY = Math.sin(sunRadEl) * sunDistance
  const sunZ = Math.cos(sunRadEl) * Math.cos(sunRadAz) * sunDistance

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 2) * 0.05
      glowRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group position={[sunX, sunY, sunZ]}>
      {/* Sun core */}
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ffff88" transparent opacity={0.8} />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial color="#ffff00" transparent opacity={0.3} />
      </mesh>

      {/* Point light to illuminate scene */}
      <pointLight
        color="#ffff99"
        intensity={50}
        distance={50}
        decay={2}
      />
    </group>
  )
}
