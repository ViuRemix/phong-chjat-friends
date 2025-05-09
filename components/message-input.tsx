"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, Send, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface MessageInputProps {
  chatId: string
  onMessageSent?: () => void
  chatTheme?: string
}

export function MessageInput({ chatId, onMessageSent, chatTheme = "default" }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  // Clear error when message or file changes
  useEffect(() => {
    if (error) setError(null)
  }, [message, file, error])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Check file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB")
      toast({
        title: "File too large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      })
      return
    }

    setFile(selectedFile)

    // Create preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setFilePreview(null)
    }
  }

  const clearFile = () => {
    setFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if ((!message.trim() && !file) || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      let fileUrl = null
      let fileName = null
      let fileType = null

      // Upload file if present
      if (file) {
        try {
          const formData = new FormData()
          formData.append("file", file)

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          })

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text()
            throw new Error(`Failed to upload file: ${errorText}`)
          }

          const uploadData = await uploadResponse.json()
          fileUrl = uploadData.url
          fileName = file.name
          fileType = file.type
        } catch (uploadError) {
          console.error("Error uploading file:", uploadError)
          setError("Failed to upload file. Please try again.")
          toast({
            title: "Upload Error",
            description: "Failed to upload file. Please try again.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: message,
          chatId,
          fileUrl,
          fileName,
          fileType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        let errorMessage = "Failed to send message"

        try {
          // Try to parse as JSON
          const jsonError = JSON.parse(errorData)
          errorMessage = jsonError.error || errorMessage
        } catch (e) {
          // If not JSON, use the text as is
          errorMessage = errorData || errorMessage
        }

        throw new Error(errorMessage)
      }

      setMessage("")
      setFile(null)
      setFilePreview(null)
      // Call the callback to refresh messages
      if (onMessageSent) {
        onMessageSent()
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setError(errorMessage)
      toast({
        title: "Message Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 border-t border-gray-800 bg-gray-900">
      {error && (
        <div className="mb-2 p-2 bg-red-900/50 text-white rounded-md flex items-center space-x-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {file && (
        <div className="mb-2 p-2 bg-gray-800 rounded-md flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-hidden">
            {filePreview ? (
              <img src={filePreview || "/placeholder.svg"} alt="Preview" className="h-10 w-10 object-cover rounded" />
            ) : (
              <div className="h-10 w-10 bg-gray-700 rounded flex items-center justify-center">
                <Paperclip className="h-5 w-5 text-gray-400" />
              </div>
            )}
            <span className="text-sm text-white truncate">{file.name}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={clearFile} className="h-7 w-7 text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleAttachClick}
          className="h-9 w-9 text-gray-400 hover:text-white"
        >
          <Paperclip className="h-5 w-5" />
          <span className="sr-only">Attach file</span>
        </Button>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="min-h-[60px] max-h-[120px] bg-gray-800 border-gray-700 text-white resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <Button
          type="submit"
          disabled={(!message.trim() && !file) || isSubmitting}
          className={cn(
            "text-white",
            chatTheme === "blue"
              ? "bg-blue-600 hover:bg-blue-700"
              : chatTheme === "purple"
                ? "bg-purple-600 hover:bg-purple-700"
                : chatTheme === "green"
                  ? "bg-green-600 hover:bg-green-700"
                  : chatTheme === "red"
                    ? "bg-red-600 hover:bg-red-700"
                    : chatTheme === "yellow"
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : chatTheme === "pink"
                        ? "bg-pink-600 hover:bg-pink-700"
                        : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
          )}
        >
          <Send className="h-5 w-5" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  )
}
