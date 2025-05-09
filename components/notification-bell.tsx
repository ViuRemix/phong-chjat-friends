"use client"

import { cn } from "@/lib/utils"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

type Notification = {
  id: string
  userId: string
  chatId: string
  messageId: string
  senderName: string
  content: string
  timestamp: number
  read: boolean
}

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications
    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/notifications")

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Failed to fetch notifications:", errorText)
        setError("Failed to load notifications")
        return
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.read).length)
      } else {
        console.error("Invalid notifications data format:", data)
        setError("Invalid notification data")
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setError("Error loading notifications")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      setError(null)
      const response = await fetch("/api/notifications?countOnly=true")

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Failed to fetch unread count:", errorText)
        return
      }

      const data = await response.json()

      if (data && typeof data.count === "number") {
        setUnreadCount(data.count)
      } else {
        console.error("Invalid unread count data format:", data)
      }
    } catch (error) {
      console.error("Error fetching unread count:", error)
      // Don't set error state here to avoid UI disruption
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    router.push(`/chat/${notification.chatId}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-gray-800 border-gray-700 text-white">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-400">
            <p>{error}</p>
          </div>
        ) : notifications.length > 0 ? (
          <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start p-3 cursor-pointer hover:bg-gray-700",
                  !notification.read && "bg-gray-700/50",
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{notification.senderName}</span>
                  <span className="text-xs text-gray-400">
                    {notification.timestamp ? format(new Date(notification.timestamp), "HH:mm") : "Unknown time"}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1 truncate w-full">{notification.content}</p>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ) : (
          <div className="p-4 text-center text-gray-400">No notifications</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
