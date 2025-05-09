"use client"

import { cn } from "@/lib/utils"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Settings } from "lucide-react"
import type { Chat } from "@/lib/chat"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ChatSettingsDialogProps {
  chat: Chat
  onSettingsUpdated: (chat: Chat) => void
}

export function ChatSettingsDialog({ chat, onSettingsUpdated }: ChatSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(chat.name)
  const [theme, setTheme] = useState(chat.theme || "default")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(chat.name)
      setTheme(chat.theme || "default")
      setError(null)
      setSuccess(null)
    }
  }, [open, chat])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      if (!name.trim()) {
        setError("Chat name is required")
        setIsSubmitting(false)
        return
      }

      const response = await fetch(`/api/chats/${chat.id}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          theme,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update chat settings")
      }

      const data = await response.json()
      onSettingsUpdated(data.chat)
      setSuccess("Chat settings updated successfully")

      // Close dialog after a short delay
      setTimeout(() => {
        setOpen(false)
      }, 1500)
    } catch (error) {
      console.error("Error updating chat settings:", error)
      setError(error instanceof Error ? error.message : "Failed to update chat settings")
    } finally {
      setIsSubmitting(false)
    }
  }

  const themes = [
    { value: "default", label: "Default" },
    { value: "blue", label: "Blue" },
    { value: "purple", label: "Purple" },
    { value: "green", label: "Green" },
    { value: "red", label: "Red" },
    { value: "yellow", label: "Yellow" },
    { value: "pink", label: "Pink" },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Chat Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-900/20 border-green-800 text-green-300">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Chat Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label>Chat Theme</Label>
            <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2">
              {themes.map((t) => (
                <div key={t.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={t.value} id={`theme-${t.value}`} className="peer sr-only" />
                  <Label
                    htmlFor={`theme-${t.value}`}
                    className="flex flex-col items-center justify-between rounded-md border-2 border-gray-700 p-2 hover:border-gray-500 peer-data-[state=checked]:border-white cursor-pointer"
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full",
                        t.value === "default"
                          ? "bg-gradient-to-r from-purple-600 to-blue-600"
                          : t.value === "blue"
                            ? "bg-blue-600"
                            : t.value === "purple"
                              ? "bg-purple-600"
                              : t.value === "green"
                                ? "bg-green-600"
                                : t.value === "red"
                                  ? "bg-red-600"
                                  : t.value === "yellow"
                                    ? "bg-yellow-600"
                                    : "bg-pink-600",
                      )}
                    ></div>
                    <span className="mt-1 text-xs text-gray-400">{t.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
