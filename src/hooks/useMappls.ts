"use client"
import { useEffect, useState } from "react"

declare global {
  interface Window {
    mappls: any
    mapplsAuthSuccess?: () => void
    mapplsAuthFailure?: () => void
  }
}

function isSdkReady(): boolean {
  const sdk = window.mappls
  if (!sdk) return false
  // Mappls SDK sets window.mappls before auth completes.
  // The Map constructor being a function is the reliable signal that
  // the SDK has fully initialized and auth tokens are loaded.
  return typeof sdk.Map === "function"
}

export function useMappls(): { isReady: boolean; mappls: any } {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isSdkReady()) { setIsReady(true); return }

    const interval = setInterval(() => {
      if (isSdkReady()) {
        setIsReady(true)
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return { isReady, mappls: isReady ? window.mappls : null }
}
