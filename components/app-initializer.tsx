"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function AppInitializer() {
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    async function initializeApp() {
      try {
        const response = await fetch("/api/init")

        // Check if the response is JSON
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          console.error("Non-JSON response from initialization endpoint:", await response.text())
          setError("Received non-JSON response from server. Please check server logs.")
          return
        }

        const data = await response.json()

        if (!data.success) {
          console.warn("Initialization warning:", data.message)
          if (data.status === "not_configured" || data.status === "connection_failed") {
            setError(data.message)
          }
        } else {
          setInitialized(true)
        }
      } catch (error) {
        console.error("Error initializing application:", error)
        setError("Failed to initialize application. Please check server logs.")
      }
    }

    initializeApp()
  }, [])

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-md">
        <Alert variant="destructive" className="bg-red-900/20 border-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return null
}
