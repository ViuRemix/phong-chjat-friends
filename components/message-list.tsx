"use client"

import { useEffect, useRef, useState } from "react"
import type { Message } from "@/lib/chat"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Check, Edit, FileIcon, MoreVertical, Trash, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog } from "@/components/ui/dialog"

interface MessageListProps {
  className?: string
  messages: Message[]
  currentUserId: string
  chatTheme?: string
  onMessageRead?: (messageId: string) => void
  users?: Record<string, any>
}

export function MessageList({
  messages,
  currentUserId,
  chatTheme = "default",
  onMessageRead,
  users = {},
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }

    // Mark messages as read
    if (onMessageRead) {
      messages.forEach((message) => {
        if (message.senderId !== currentUserId && (!message.readBy || !message.readBy.includes(currentUserId))) {
          onMessageRead(message.id)
        }
      })
    }
  }, [messages, currentUserId, onMessageRead])

  // Ensure messages is an array
  const validMessages = Array.isArray(messages) ? messages : []

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id)
    setEditContent(message.content)
  }

  const handleSaveEdit = async (messageId: string, chatId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: editContent,
          chatId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to edit message")
      }

      setEditingMessageId(null)
      setEditContent("")
    } catch (error) {
      console.error("Error editing message:", error)
    }
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent("")
  }

  const handleDeleteMessage = async (messageId: string, chatId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}?chatId=${chatId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete message")
      }
    } catch (error) {
      console.error("Error deleting message:", error)
    }
  }

  const getMessageBackground = (isCurrentUser: boolean) => {
    if (isCurrentUser) {
      switch (chatTheme) {
        case "blue":
          return "bg-blue-600"
        case "purple":
          return "bg-purple-600"
        case "green":
          return "bg-green-600"
        case "red":
          return "bg-red-600"
        case "yellow":
          return "bg-yellow-600"
        case "pink":
          return "bg-pink-600"
        default:
          return "bg-gradient-to-r from-blue-600 to-purple-600"
      }
    } else {
      return "bg-gray-800"
    }
  }

  return (
    <>
      {/* Modal preview ảnh */}
      {previewImageUrl && (
        <Dialog open={!!previewImageUrl} onOpenChange={() => setPreviewImageUrl(null)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setPreviewImageUrl(null)}>
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-h-[80vh] max-w-[90vw] rounded-lg shadow-lg border-4 border-white"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </Dialog>
      )}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {validMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            validMessages.map((message) => {
              if (!message || typeof message !== "object") {
                return null // Skip invalid messages
              }

              const isCurrentUser = message.senderId === currentUserId
              const user = users[message.senderId] || {}
              const profileColor = user.profileColor || "bg-blue-600"

              return (
                <div key={message.id} className={cn("flex", isCurrentUser ? "justify-end" : "justify-start")}>
                  <div className="flex flex-col space-y-1 max-w-[70%]">
                    <div className="flex items-end space-x-2">
                      {!isCurrentUser && (
                        <Avatar className="h-8 w-8">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={message.senderName} />
                          ) : (
                            <AvatarFallback className={profileColor}>
                              {message.senderName?.charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "px-4 py-2 rounded-2xl",
                          message.deleted ? "bg-gray-700 text-gray-400" : getMessageBackground(isCurrentUser),
                          "text-white",
                        )}
                      >
                        {!isCurrentUser && !message.deleted && (
                          <p className="text-xs font-medium text-gray-300 mb-1">{message.senderName || "Unknown"}</p>
                        )}

                        {editingMessageId === message.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="min-h-[60px] bg-gray-700 border-gray-600 text-white resize-none text-sm"
                            />
                            <div className="flex justify-end space-x-2">
                              <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 px-2 text-xs">
                                <X className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(message.id, message.chatId)}
                                className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {message.fileUrl ? (
                              <div>
                                {message.fileType && message.fileType.startsWith("image/") ? (
                                  <div
                                    className="inline-block cursor-pointer"
                                    onClick={() => setPreviewImageUrl(message.fileUrl!)}
                                  >
                                    <img
                                      src={message.fileUrl!}
                                      alt={message.fileName || "Image"}
                                      className="max-h-40 max-w-xs rounded-lg border-2 border-gray-700 hover:border-blue-500 transition-shadow shadow-lg"
                                    />
                                  </div>
                                ) : (
                                  <a
                                    href={message.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                                  >
                                    <FileIcon className="h-5 w-5" />
                                    <div className="overflow-hidden">
                                      <p className="text-sm truncate">{message.fileName || "File"}</p>
                                      <p className="text-xs text-gray-400">{message.fileType || "Unknown type"}</p>
                                    </div>
                                  </a>
                                )}
                                {message.content && <p className="text-sm mt-2">{message.content}</p>}
                              </div>
                            ) : (
                              <p className="text-sm">{message.content || "Empty message"}</p>
                            )}
                          </>
                        )}
                      </div>

                      {isCurrentUser && !message.deleted && !editingMessageId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white">
                            <DropdownMenuItem
                              onClick={() => handleEditMessage(message)}
                              className="flex items-center cursor-pointer hover:bg-gray-700"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteMessage(message.id, message.chatId)}
                              className="flex items-center cursor-pointer text-red-400 hover:bg-gray-700 hover:text-red-300"
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="flex items-center px-2 space-x-2">
                      <span className="text-xs text-gray-500">
                        {message.timestamp ? format(new Date(message.timestamp), "HH:mm") : "Unknown time"}
                      </span>
                      {message.edited && <span className="text-xs text-gray-500">(edited)</span>}
                      {isCurrentUser && message.readBy && message.readBy.length > 1 && (
                        <span className="text-xs text-blue-400">
                          <Check className="h-3 w-3 inline" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </>
  )
}
