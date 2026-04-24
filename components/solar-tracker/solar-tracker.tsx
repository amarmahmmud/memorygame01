"use client"

import { useFrame } from "@react-three/fiber"
import { useRef, useMemo } from "react"
import * as THREE from "three"
import { BasePlatform } from "./base-platform"
import { AzimuthMotorAssembly } from "./azimuth-motor-assembly"
import { ElevationAssembly } from "./elevation-assembly"
import { SolarPanelArray } from "./solar-panel-array"
import { WormGearMechanism } from "./worm-gear-mechanism"

interface SolarTrackerProps {
  sunAzimuth: number
  sunElevation: number
  pan: number
  setPan: (pan: number) => void
  tilt: number
  setTilt: (tilt: number) => void
  targetPanRef: React.MutableRefObject<number>
  targetTiltRef: React.MutableRefObject<number>
  dustLevel: number
  isCleaning: boolean
  cleaningProgress: number
  setLdrValues: (values: { top: number; bottom: number; left: number; right: number }) => void
  setTrackingActive: (active: boolean) => void
}

export function SolarTracker({
  sunAzimuth,
  sunElevation,
  pan,
  setPan,
  tilt,
  setTilt,
  targetPanRef,
  targetTiltRef,
  dustLevel,
  isCleaning,
  cleaningProgress,
  setLdrValues,
  setTrackingActive,
}: SolarTrackerProps) {
  const rotatingGroupRef = useRef<THREE.Group>(null)
  const panelGroupRef = useRef<THREE.Group>(null)

  // Calculate LDR intensities based on sun position
  const calculateLDRIntensity = (sensorType: string, sunDir: THREE.Vector3, panRad: number, tiltRad: number) => {
    const angleOffset = (30 * Math.PI) / 180
    let localNormal: THREE.Vector3

    switch (sensorType) {
      case "top":
        localNormal = new THREE.Vector3(
          Math.sin(tiltRad + angleOffset),
          Math.cos(tiltRad + angleOffset),
          0
        )
        break
      case "bottom":
        localNormal = new THREE.Vector3(
          Math.sin(tiltRad - angleOffset),
          Math.cos(tiltRad - angleOffset),
          0
        )
        break
      case "left":
        localNormal = new THREE.Vector3(
          Math.sin(tiltRad) * Math.cos(angleOffset),
          Math.cos(tiltRad) * Math.cos(angleOffset),
          -Math.sin(angleOffset)
        )
        break
      case "right":
        localNormal = new THREE.Vector3(
          Math.sin(tiltRad) * Math.cos(angleOffset),
          Math.cos(tiltRad) * Math.cos(angleOffset),
          Math.sin(angleOffset)
        )
        break
      default:
        localNormal = new THREE.Vector3(Math.sin(tiltRad), Math.cos(tiltRad), 0)
    }

    // Rotate by pan angle
    const worldNormal = localNormal.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), panRad)
    worldNormal.normalize()

    let intensity = Math.max(0, worldNormal.dot(sunDir))
    // Dust reduces intensity
    intensity *= 1 - dustLevel / 150

    return intensity
  }

  useFrame(() => {
    // Calculate sun direction
    const sunRadAz = (sunAzimuth * Math.PI) / 180
    const sunRadEl = (sunElevation * Math.PI) / 180
    const sunDir = new THREE.Vector3(
      Math.cos(sunRadEl) * Math.sin(sunRadAz),
      Math.sin(sunRadEl),
      Math.cos(sunRadEl) * Math.cos(sunRadAz)
    )

    const panRad = (pan * Math.PI) / 180
    const tiltRad = (tilt * Math.PI) / 180

    // Calculate LDR values
    const topInt = calculateLDRIntensity("top", sunDir, panRad, tiltRad)
    const bottomInt = calculateLDRIntensity("bottom", sunDir, panRad, tiltRad)
    const leftInt = calculateLDRIntensity("left", sunDir, panRad, tiltRad)
    const rightInt = calculateLDRIntensity("right", sunDir, panRad, tiltRad)
    const avgIntensity = (topInt + bottomInt + leftInt + rightInt) / 4

    setLdrValues({ top: topInt, bottom: bottomInt, left: leftInt, right: rightInt })

    const LIGHT_THRESHOLD = 0.15
    const DEADBAND = 0.05
    const trackingActive = avgIntensity > LIGHT_THRESHOLD

    setTrackingActive(trackingActive)

    if (trackingActive) {
      const panDiff = rightInt - leftInt
      if (Math.abs(panDiff) > DEADBAND) {
        targetPanRef.current = (targetPanRef.current + panDiff * 0.8 + 360) % 360
      }

      const tiltDiff = topInt - bottomInt
      if (Math.abs(tiltDiff) > DEADBAND) {
        targetTiltRef.current = Math.max(0, Math.min(80, targetTiltRef.current + tiltDiff * 0.4))
      }
    } else {
      // Park position
      targetPanRef.current = 180
      targetTiltRef.current = 30
    }

    // Smooth movement
    let panError = targetPanRef.current - pan
    if (panError > 180) panError -= 360
    if (panError < -180) panError += 360
    const newPan = ((pan + panError * 0.03) % 360 + 360) % 360
    setPan(newPan)

    const newTilt = tilt + (targetTiltRef.current - tilt) * 0.04
    setTilt(newTilt)

    // Apply rotations
    if (rotatingGroupRef.current) {
      rotatingGroupRef.current.rotation.y = -(newPan * Math.PI) / 180
    }

    if (panelGroupRef.current) {
      panelGroupRef.current.rotation.z = -(newTilt * Math.PI) / 180
    }
  })

  return (
    <group>
      {/* Static base platform */}
      <BasePlatform />

      {/* Azimuth motor assembly (static) */}
      <AzimuthMotorAssembly />

      {/* Rotating group (everything that rotates with pan) */}
      <group ref={rotatingGroupRef}>
        {/* Elevation assembly with motor, worm gear, bearings */}
        <ElevationAssembly />

        {/* Worm gear mechanism */}
        <WormGearMechanism tilt={tilt} />

        {/* Panel assembly (rotates with tilt) */}
        <group ref={panelGroupRef} position={[0, 2.2, 0]}>
          <SolarPanelArray
            dustLevel={dustLevel}
            isCleaning={isCleaning}
            cleaningProgress={cleaningProgress}
          />
        </group>
      </group>
    </group>
  )
}
