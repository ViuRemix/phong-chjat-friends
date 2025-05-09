"use client"

import { useEffect, useState } from "react"
import { MessageCircle } from "lucide-react"
import { getCurrentUser } from "@/lib/auth-client"
import { useWebSocket } from "@/components/websocket-provider"

export default function ChatHomePage() {
  const { usePolling } = useWebSocket()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        setError(null)
        const userData = await getCurrentUser()
        setUser(userData)
      } catch (error) {
        console.error("Error loading user:", error)
        setError("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-red-400">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400">
      {/* Ẩn trên mobile, hiện trên desktop */}
      <MessageCircle className="hidden lg:block h-16 w-16 mb-4 text-gray-500" />
      <h2 className="text-2xl font-bold text-white mb-2">Welcome, {user?.username}!</h2>
      <p className="max-w-md mb-4">Select a chat from the sidebar or create a new one to start messaging.</p>
      <p className="text-sm text-gray-500">
        {usePolling ? "Using polling mode (WebSockets not available)" : "Using real-time mode"}
      </p>
    </div>
  )

}
