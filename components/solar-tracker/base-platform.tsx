"use client"

export function BasePlatform() {
  return (
    <group>
      {/* Main base plate - heavy steel foundation */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[3, 0.1, 3]} />
        <meshStandardMaterial color="#2a2a3a" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Corner reinforcement plates */}
      {[
        [-1.3, 0.1, -1.3],
        [1.3, 0.1, -1.3],
        [-1.3, 0.1, 1.3],
        [1.3, 0.1, 1.3],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[0.4, 0.08, 0.4]} />
          <meshStandardMaterial color="#1a1a2a" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* Mounting bolts on corners */}
      {[
        [-1.3, 0.15, -1.3],
        [1.3, 0.15, -1.3],
        [-1.3, 0.15, 1.3],
        [1.3, 0.15, 1.3],
      ].map((pos, i) => (
        <mesh key={`bolt-${i}`} position={pos as [number, number, number]}>
          <cylinderGeometry args={[0.04, 0.04, 0.08, 6]} />
          <meshStandardMaterial color="#444455" metalness={0.95} roughness={0.1} />
        </mesh>
      ))}

      {/* Battery enclosures - 4 units */}
      {[
        [-0.9, 0.25, -0.9],
        [0.9, 0.25, -0.9],
        [-0.9, 0.25, 0.9],
        [0.9, 0.25, 0.9],
      ].map((pos, i) => (
        <group key={`battery-${i}`} position={pos as [number, number, number]}>
          {/* Battery box */}
          <mesh>
            <boxGeometry args={[0.5, 0.35, 0.4]} />
            <meshStandardMaterial color="#8B8000" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Battery terminals */}
          <mesh position={[-0.15, 0.2, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
            <meshStandardMaterial color="#cc0000" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0.15, 0.2, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.08, 8]} />
            <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Battery label */}
          <mesh position={[0, 0, 0.201]}>
            <planeGeometry args={[0.3, 0.15]} />
            <meshStandardMaterial color="#ffcc00" />
          </mesh>
        </group>
      ))}

      {/* Cable conduits connecting batteries */}
      {[
        { from: [-0.9, 0.25, -0.9], to: [0.9, 0.25, -0.9] },
        { from: [-0.9, 0.25, 0.9], to: [0.9, 0.25, 0.9] },
        { from: [-0.9, 0.25, -0.9], to: [-0.9, 0.25, 0.9] },
        { from: [0.9, 0.25, -0.9], to: [0.9, 0.25, 0.9] },
      ].map(({ from, to }, i) => {
        const midX = (from[0] + to[0]) / 2
        const midZ = (from[2] + to[2]) / 2
        const length = Math.sqrt((to[0] - from[0]) ** 2 + (to[2] - from[2]) ** 2)
        const angle = Math.atan2(to[2] - from[2], to[0] - from[0])

        return (
          <mesh
            key={`conduit-${i}`}
            position={[midX, 0.12, midZ]}
            rotation={[0, -angle + Math.PI / 2, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.03, 0.03, length - 0.5, 8]} />
            <meshStandardMaterial color="#333344" metalness={0.7} roughness={0.3} />
          </mesh>
        )
      })}

      {/* Control box / ESP32 enclosure */}
      <group position={[-0.2, 0.35, 0]}>
        <mesh>
          <boxGeometry args={[0.35, 0.2, 0.25]} />
          <meshStandardMaterial color="#2d4a2d" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* LED indicators */}
        <mesh position={[0.1, 0.05, 0.126]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={2} />
        </mesh>
        <mesh position={[0.05, 0.05, 0.126]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={1} />
        </mesh>
        {/* Antenna */}
        <mesh position={[0.15, 0.15, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
          <meshStandardMaterial color="#111111" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    </group>
  )
}
