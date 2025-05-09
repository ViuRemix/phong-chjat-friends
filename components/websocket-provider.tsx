"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { Message } from "@/lib/chat"

type WebSocketContextType = {
  connected: boolean
  usePolling: boolean
}

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  usePolling: true,
})

export function useWebSocket() {
  return useContext(WebSocketContext)
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [usePolling, setUsePolling] = useState(true)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: NodeJS.Timeout | null = null
    let pollingInterval: NodeJS.Timeout | null = null

    // Check if WebSockets are supported
    const isWebSocketSupported = typeof window !== "undefined" && "WebSocket" in window

    const setupPolling = () => {
      // Set up polling as a fallback
      if (!usePolling) {
        console.log("Switching to polling mode")
        setUsePolling(true)
      }

      if (!pollingInterval) {
        pollingInterval = setInterval(async () => {
          try {
            // Poll for new messages if we're in a chat
            if (pathname.startsWith("/chat/") && pathname !== "/chat") {
              const chatId = pathname.split("/").pop()
              if (chatId) {
                const response = await fetch(`/api/chats/${chatId}/messages`)
                if (response.ok) {
                  router.refresh()
                }
              }
            }
          } catch (error) {
            console.error("Polling error:", error)
          }
        }, 5000) // Poll every 5 seconds
      }
    }

    const connectWebSocket = () => {
      // If we've tried to connect more than 3 times, just use polling
      if (connectionAttempts >= 3) {
        console.log("Too many connection attempts, using polling")
        setupPolling()
        return
      }

      if (!isWebSocketSupported) {
        console.log("WebSockets not supported, using polling fallback")
        setupPolling()
        return
      }

      try {
        // Close existing connection if any
        if (ws) {
          try {
            ws.close()
          } catch (e) {
            console.error("Error closing existing WebSocket:", e)
          }
        }

        // Create WebSocket connection
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
        const host = window.location.host

        // Add a random query parameter to prevent caching
        const random = Math.random().toString(36).substring(2, 15)

        // In preview environments, use polling instead of WebSockets
        const isPreview = host.includes("vercel.app") || host.includes("localhost")
        if (isPreview) {
          console.log("Preview environment detected, using polling")
          setupPolling()
          return
        }

        console.log(`Attempting to connect to WebSocket: ${protocol}//${host}/api/ws?random=${random}`)
        ws = new WebSocket(`${protocol}//${host}/api/ws?random=${random}`)

        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          console.log("WebSocket connection timeout")
          if (ws && ws.readyState !== WebSocket.OPEN) {
            ws.close()
            setConnectionAttempts((prev) => prev + 1)
            setupPolling()
          }
        }, 5000)

        ws.onopen = () => {
          clearTimeout(connectionTimeout)
          console.log("WebSocket connected")
          setConnected(true)
          setUsePolling(false)
          setConnectionAttempts(0)

          // Clear polling interval if it exists
          if (pollingInterval) {
            clearInterval(pollingInterval)
            pollingInterval = null
          }
        }

        ws.onclose = (event) => {
          console.log("WebSocket disconnected", event)
          setConnected(false)

          // If the close was clean, try to reconnect
          // Otherwise, fall back to polling
          if (event.wasClean) {
            // Try to reconnect after 3 seconds
            reconnectTimer = setTimeout(() => {
              setConnectionAttempts((prev) => prev + 1)
              connectWebSocket()
            }, 3000)
          } else {
            setConnectionAttempts((prev) => prev + 1)
            setupPolling()
          }
        }

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout)
          console.error("WebSocket error:", error)
          // Fall back to polling on error
          setConnectionAttempts((prev) => prev + 1)
          setupPolling()

          // Close the socket to prevent further errors
          try {
            ws?.close()
          } catch (e) {
            console.error("Error closing WebSocket:", e)
          }
        }

        ws.onmessage = (event) => {
          try {
            // First check if the data is valid JSON
            let data
            try {
              data = JSON.parse(event.data)
            } catch (e) {
              console.error("Invalid WebSocket message format:", event.data)
              return
            }

            if (data.type === "new_message") {
              const message = data.message as Message

              // If we're currently in the chat where the message was sent, refresh the page
              if (pathname === `/chat/${message.chatId}`) {
                router.refresh()
              } else {
                // Otherwise, show a notification
                if (Notification.permission === "granted") {
                  new Notification(`New message from ${message.senderName}`, {
                    body: message.content,
                  })
                }
              }
            } else if (data.type === "presence_update") {
              // Handle presence updates
              router.refresh()
            }
          } catch (error) {
            console.error("Error handling WebSocket message:", error)
            // Continue even if one message fails to parse
          }
        }
      } catch (error) {
        console.error("Error setting up WebSocket:", error)
        setConnectionAttempts((prev) => prev + 1)
        setupPolling()
      }
    }

    // Only attempt to connect in the browser
    if (typeof window !== "undefined") {
      // First try WebSocket
      connectWebSocket()

      // Request notification permission
      if (Notification.permission === "default") {
        Notification.requestPermission()
      }
    }

    return () => {
      if (ws) {
        try {
          ws.close()
        } catch (e) {
          console.error("Error closing WebSocket:", e)
        }
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [router, pathname, connectionAttempts])

  return <WebSocketContext.Provider value={{ connected, usePolling }}>{children}</WebSocketContext.Provider>
}

export default WebSocketProvider
