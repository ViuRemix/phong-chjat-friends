"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import dynamic from "next/dynamic"
import { getCurrentUser } from "@/lib/auth-client"

// Dynamically import the WebSocketProvider with no SSR
const WebSocketProvider = dynamic(
  () => import("@/components/websocket-provider").then((mod) => mod.WebSocketProvider),
  { ssr: false },
)

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        setError(null)
        const userData = await getCurrentUser()
        if (!userData) {
          router.push("/login")
          return
        }
        setUser(userData)
      } catch (error) {
        console.error("Error loading user:", error)
        setError("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()

    // Set up a heartbeat to keep the session alive
    const heartbeatInterval = setInterval(async () => {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })
      } catch (error) {
        console.error("Heartbeat error:", error)
      }
    }, 60000) // Every minute

    return () => {
      clearInterval(heartbeatInterval)
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-6 rounded-lg max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in the useEffect
  }

  return (
    <WebSocketProvider>
      <div className="flex h-screen bg-gray-900">
        <Sidebar user={user} />
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    </WebSocketProvider>
  )
}
