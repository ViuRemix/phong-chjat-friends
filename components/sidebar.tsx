"use client"

import { Button } from "@/components/ui/button"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useWebSocket } from "@/components/websocket-provider"
import type { User } from "@/lib/auth"
import type { Chat } from "@/lib/chat"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreateChatDialog } from "@/components/create-chat-dialog"
import { LogoutButton } from "@/components/logout-button"
import { NotificationBell } from "@/components/notification-bell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquarePlus, Settings, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  user: User
}

export function Sidebar({ user }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { usePolling } = useWebSocket()
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchChats = useCallback(async () => {
    try {
      const response = await fetch("/api/chats")

      if (response.ok) {
        const data = await response.json()
        setChats(data)
      } else {
        console.error("Failed to load chats:", await response.text())
      }
    } catch (error) {
      console.error("Error loading chats:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChats()

    // Set up polling for new chats
    const interval = setInterval(fetchChats, usePolling ? 3000 : 10000)
    return () => clearInterval(interval)
  }, [fetchChats, usePolling])

  return (
    <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Chat App</h1>
          <div className="flex items-center space-x-1">
            <NotificationBell />
            <Link href="/profile">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Profile</span>
              </Button>
            </Link>
            <LogoutButton />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Avatar className="h-10 w-10 cursor-pointer" onClick={() => router.push("/profile")}>
            {user.avatar ? (
              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.username} />
            ) : (
              <AvatarFallback className={user.profileColor || "bg-blue-600"}>
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="text-sm font-medium text-white">{user.username}</p>
            <p className="text-xs text-gray-400">{usePolling ? "Polling mode" : "Real-time mode"}</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-800">
        <CreateChatDialog
          onChatCreated={(chat) => {
            setChats((prev) => [chat, ...prev])
            fetchChats() // Refresh chats after creating a new one
          }}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : chats.length > 0 ? (
            <div className="space-y-1">
              {chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/chat/${chat.id}`}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                    pathname === `/chat/${chat.id}`
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50",
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      chat.isGroup
                        ? "bg-gradient-to-r from-green-600 to-teal-600"
                        : "bg-gradient-to-r from-purple-600 to-blue-600",
                    )}
                  >
                    {chat.isGroup ? (
                      <Users className="h-5 w-5 text-white" />
                    ) : (
                      <span className="text-white font-bold">{chat.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.name}</p>
                    {chat.lastMessage && (
                      <p className="text-xs truncate opacity-70">
                        {chat.lastMessage.senderName}:{" "}
                        {chat.lastMessage.deleted
                          ? "This message was deleted"
                          : chat.lastMessage.fileUrl
                            ? "Sent a file"
                            : chat.lastMessage.content}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <MessageSquarePlus className="h-8 w-8 mx-auto mb-2" />
              <p>No chats yet</p>
              <p className="text-xs">Create a new chat to get started</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
