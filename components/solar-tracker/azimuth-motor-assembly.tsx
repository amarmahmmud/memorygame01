"use client"

export function AzimuthMotorAssembly() {
  return (
    <group position={[0, 0.1, 0]}>
      {/* Motor mounting bracket - thick steel plate */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.5, 0.55, 0.15, 24]} />
        <meshStandardMaterial color="#3a3a4a" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Mounting bolt holes on bracket */}
      {[0, 120, 240].map((angle, i) => {
        const rad = (angle * Math.PI) / 180
        const x = Math.cos(rad) * 0.45
        const z = Math.sin(rad) * 0.45
        return (
          <mesh key={`mount-bolt-${i}`} position={[x, 0.18, z]}>
            <cylinderGeometry args={[0.025, 0.025, 0.06, 6]} />
            <meshStandardMaterial color="#555566" metalness={0.95} roughness={0.1} />
          </mesh>
        )
      })}

      {/* Main azimuth motor housing */}
      <group position={[0, 0.35, 0]}>
        {/* Motor body - cylindrical */}
        <mesh>
          <cylinderGeometry args={[0.25, 0.25, 0.4, 24]} />
          <meshStandardMaterial color="#4a4a5a" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* Motor end cap (bottom) */}
        <mesh position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.27, 0.25, 0.05, 24]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Motor end cap (top) */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.25, 0.27, 0.05, 24]} />
          <meshStandardMaterial color="#3a3a4a" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Motor cooling fins */}
        {[0, 90, 180, 270].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          return (
            <mesh
              key={`fin-${i}`}
              position={[Math.cos(rad) * 0.26, 0, Math.sin(rad) * 0.26]}
              rotation={[0, -rad, 0]}
            >
              <boxGeometry args={[0.02, 0.35, 0.06]} />
              <meshStandardMaterial color="#5a5a6a" metalness={0.8} roughness={0.2} />
            </mesh>
          )
        })}

        {/* Motor shaft */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.35, 12]} />
          <meshStandardMaterial color="#888899" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Power cable exit */}
        <mesh position={[0.2, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.15, 8]} />
          <meshStandardMaterial color="#222233" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>

      {/* Slew bearing / Turntable bearing */}
      <group position={[0, 0.65, 0]}>
        {/* Outer race */}
        <mesh>
          <torusGeometry args={[0.35, 0.06, 12, 32]} />
          <meshStandardMaterial color="#555566" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Ball bearings visible detail */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180
          return (
            <mesh
              key={`bearing-ball-${i}`}
              position={[Math.cos(rad) * 0.35, 0, Math.sin(rad) * 0.35]}
            >
              <sphereGeometry args={[0.03, 8, 8]} />
              <meshStandardMaterial color="#aaaacc" metalness={0.98} roughness={0.05} />
            </mesh>
          )
        })}

        {/* Inner race */}
        <mesh>
          <cylinderGeometry args={[0.28, 0.28, 0.12, 24]} />
          <meshStandardMaterial color="#4a4a5a" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>

      {/* Rotary union / Slip ring */}
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 12]} />
        <meshStandardMaterial color="#333344" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Cable bundle going up */}
      <mesh position={[0.1, 0.85, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.2, 6]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
    </group>
  )
}
