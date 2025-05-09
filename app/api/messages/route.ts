import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { sendMessage } from "@/lib/chat"
import { redis, safeRedisOperation } from "@/lib/redis"
import type { Chat } from "@/lib/chat"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    let content, chatId, fileUrl, fileName, fileType
    try {
      const body = await request.json()
      content = body.content
      chatId = body.chatId
      fileUrl = body.fileUrl
      fileName = body.fileName
      fileType = body.fileType
    } catch (error) {
      console.error("Error parsing request body:", error)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    if ((!content || content.trim() === "") && !fileUrl) {
      return NextResponse.json({ error: "Content or file is required" }, { status: 400 })
    }

    if (!chatId) {
      return NextResponse.json({ error: "ChatId is required" }, { status: 400 })
    }

    // Verify the chat exists and user is a member
    const chatData = await safeRedisOperation(async () => await redis.get(`chat:${chatId}`), null)
    if (!chatData) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    // Safely parse chat data
    let chat: Chat
    try {
      if (typeof chatData === "string") {
        chat = JSON.parse(chatData) as Chat
      } else if (chatData !== null) {
        // If it's already an object, use it directly
        chat = chatData as Chat
      } else {
        return NextResponse.json({ error: "Invalid chat data" }, { status: 500 })
      }
    } catch (error) {
      console.error("Error parsing chat data:", error)
      return NextResponse.json({ error: "Invalid chat data" }, { status: 500 })
    }

    // Check if user is a member of the chat
    if (!chat.members || !Array.isArray(chat.members)) {
      return NextResponse.json({ error: "Invalid chat members data" }, { status: 500 })
    }

    if (!chat.members.includes(user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const message = await sendMessage(content || "", chatId, user.id, user.username, fileUrl, fileName, fileType)
    return NextResponse.json(message)
  } catch (error) {
    console.error("Error sending message:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
