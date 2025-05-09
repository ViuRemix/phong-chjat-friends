"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"
import type { Chat } from "@/lib/chat"
import { Button } from "@/components/ui/button"
import { Info, Users } from "lucide-react"
import { ChatInfoDialog } from "@/components/chat-info-dialog"
import { ChatSettingsDialog } from "@/components/chat-settings-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ChatHeaderProps {
  chat: Chat
  onChatUpdated?: (chat: Chat) => void
}

export function ChatHeader({ chat, onChatUpdated }: ChatHeaderProps) {
  const [showInfo, setShowInfo] = useState(false)
  const [currentChat, setCurrentChat] = useState<Chat>(chat)

  const handleChatUpdated = (updatedChat: Chat) => {
    setCurrentChat(updatedChat)
    if (onChatUpdated) {
      onChatUpdated(updatedChat)
    }
  }

  return (
    <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900">
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          {chat.icon ? (
            <AvatarImage src={chat.icon || "/placeholder.svg"} alt={currentChat.name} />
          ) : (
            <AvatarFallback
              className={cn(
                currentChat.isGroup
                  ? "bg-gradient-to-r from-green-600 to-teal-600"
                  : "bg-gradient-to-r from-purple-600 to-blue-600",
              )}
            >
              {currentChat.isGroup ? (
                <Users className="h-5 w-5 text-white" />
              ) : (
                <span className="text-white font-bold">{currentChat.name.charAt(0).toUpperCase()}</span>
              )}
            </AvatarFallback>
          )}
        </Avatar>
        <div>
          <h2 className="text-lg font-medium text-white">{currentChat.name}</h2>
          <p className="text-xs text-gray-400">
            {currentChat.isGroup ? `${currentChat.members.length} members` : "Direct message"}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <ChatSettingsDialog chat={currentChat} onSettingsUpdated={handleChatUpdated} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowInfo(true)}
          className="text-gray-400 hover:text-white"
        >
          <Info className="h-5 w-5" />
          <span className="sr-only">Chat info</span>
        </Button>
      </div>

      {showInfo && <ChatInfoDialog chat={currentChat} onClose={() => setShowInfo(false)} />}
    </div>
  )
}
