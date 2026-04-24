"use client"

export function ElevationAssembly() {
  return (
    <group position={[0, 0.95, 0]}>
      {/* Main rotating platform / yoke base */}
      <mesh>
        <boxGeometry args={[2.2, 0.12, 1.2]} />
        <meshStandardMaterial color="#3a3a4a" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Reinforcement ribs on platform */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={`rib-${i}`} position={[x, -0.05, 0]}>
          <boxGeometry args={[0.05, 0.08, 1.1]} />
          <meshStandardMaterial color="#2a2a3a" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}

      {/* Left pillar / bearing support */}
      <group position={[0, 0.65, -0.5]}>
        {/* Main pillar structure */}
        <mesh>
          <boxGeometry args={[0.25, 1.2, 0.15]} />
          <meshStandardMaterial color="#4a4a5a" metalness={0.75} roughness={0.3} />
        </mesh>

        {/* Gusset plate - triangular support */}
        <mesh position={[0, -0.5, 0.15]} rotation={[Math.PI / 4, 0, 0]}>
          <boxGeometry args={[0.2, 0.4, 0.05]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* Bearing housing */}
        <mesh position={[0, 0.55, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.15, 16]} />
          <meshStandardMaterial color="#5a5a6a" metalness={0.85} roughness={0.2} />
        </mesh>

        {/* Bearing flange */}
        <mesh position={[0, 0.55, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.03, 16]} />
          <meshStandardMaterial color="#4a4a5a" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* Bearing shaft (tilt axis) */}
        <mesh position={[0, 0.55, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4, 12]} />
          <meshStandardMaterial color="#888899" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Right pillar / bearing support (mirrored) */}
      <group position={[0, 0.65, 0.5]}>
        {/* Main pillar structure */}
        <mesh>
          <boxGeometry args={[0.25, 1.2, 0.15]} />
          <meshStandardMaterial color="#4a4a5a" metalness={0.75} roughness={0.3} />
        </mesh>

        {/* Gusset plate */}
        <mesh position={[0, -0.5, -0.15]} rotation={[-Math.PI / 4, 0, 0]}>
          <boxGeometry args={[0.2, 0.4, 0.05]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* Bearing housing */}
        <mesh position={[0, 0.55, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.15, 16]} />
          <meshStandardMaterial color="#5a5a6a" metalness={0.85} roughness={0.2} />
        </mesh>

        {/* Bearing flange */}
        <mesh position={[0, 0.55, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.03, 16]} />
          <meshStandardMaterial color="#4a4a5a" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* Bearing shaft (tilt axis) */}
        <mesh position={[0, 0.55, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.4, 12]} />
          <meshStandardMaterial color="#888899" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Elevation motor mount bracket */}
      <group position={[0.9, 0.3, 0]}>
        {/* Motor mounting plate */}
        <mesh>
          <boxGeometry args={[0.35, 0.5, 0.6]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.8} roughness={0.25} />
        </mesh>

        {/* Motor housing */}
        <mesh position={[0.22, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.15, 0.15, 0.25, 16]} />
          <meshStandardMaterial color="#4a4a5a" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Motor end cap */}
        <mesh position={[0.35, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.15, 0.03, 16]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Gearbox housing */}
        <mesh position={[0.05, 0.1, 0]}>
          <boxGeometry args={[0.15, 0.25, 0.35]} />
          <meshStandardMaterial color="#5a5a6a" metalness={0.75} roughness={0.3} />
        </mesh>

        {/* Worm gear output shaft */}
        <mesh position={[-0.15, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 12]} />
          <meshStandardMaterial color="#888899" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Cable tray running along platform */}
      <mesh position={[0, 0.08, 0.4]}>
        <boxGeometry args={[2, 0.05, 0.1]} />
        <meshStandardMaterial color="#2a2a3a" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  )
}
