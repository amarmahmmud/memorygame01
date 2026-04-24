"use client"

import dynamic from "next/dynamic"

const SolarTrackerScene = dynamic(() => import("@/components/solar-tracker-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-black text-cyan-400 font-mono">
      Loading 3D Scene...
    </div>
  ),
})

export default function Page() {
  return <SolarTrackerScene />
}
