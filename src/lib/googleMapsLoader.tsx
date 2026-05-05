"use client"
import { createContext, useContext } from "react"
import { useJsApiLoader } from "@react-google-maps/api"

const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"]

const GoogleMapsContext = createContext(false)

export function GoogleMapsLoader({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: LIBRARIES,
  })

  return (
    <GoogleMapsContext.Provider value={isLoaded}>
      {children}
    </GoogleMapsContext.Provider>
  )
}

export function useGoogleMapsLoaded(): boolean {
  return useContext(GoogleMapsContext)
}
