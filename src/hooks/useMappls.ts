"use client"
import { useEffect, useState } from "react"

declare global {
  interface Window {
    mappls: any
  }
}

export function useMappls(): { isReady: boolean; mappls: any } {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.mappls) { setIsReady(true); return }

    const interval = setInterval(() => {
      if (window.mappls) {
        setIsReady(true)
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return { isReady, mappls: isReady ? window.mappls : null }
}
