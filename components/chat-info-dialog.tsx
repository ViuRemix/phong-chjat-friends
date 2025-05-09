"use client"

import { useState, useEffect } from "react"
import type { Chat } from "@/lib/chat"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users } from "lucide-react"
import { getAllUsersAction } from "@/app/actions"
import type { User } from "@/lib/auth"

interface ChatInfoDialogProps {
  chat: Chat
  onClose: () => void
}

export function ChatInfoDialog({ chat, onClose }: ChatInfoDialogProps) {
  const [users, setUsers] = useState<Record<string, Omit<User, "password">>>({})

  useEffect(() => {
    async function loadUsers() {
      const result = await getAllUsersAction()
      if (result.success) {
        const usersMap: Record<string, Omit<User, "password">> = {}
        result.users.forEach((user) => {
          usersMap[user.id] = user
        })
        setUsers(usersMap)
      }
    }

    loadUsers()
  }, [])

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>{chat.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Chat Type</h3>
            <div className="flex items-center space-x-2 text-white">
              {chat.isGroup ? (
                <>
                  <Users className="h-4 w-4" />
                  <span>Group Chat</span>
                </>
              ) : (
                <span>Direct Message</span>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Created</h3>
            <p className="text-white">
              {new Date(chat.createdAt).toLocaleDateString()} at {new Date(chat.createdAt).toLocaleTimeString()}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Members ({chat.members.length})</h3>
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {chat.members.map((memberId) => {
                  const user = users[memberId]
                  return (
                    <div key={memberId} className="flex items-center space-x-3 p-2 rounded-md">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {user?.username?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {user?.username || "Unknown User"}
                          {memberId === chat.createdBy && <span className="ml-2 text-xs text-gray-400">(Creator)</span>}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
