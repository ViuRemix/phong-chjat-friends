import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getMessages } from "@/lib/chat"
import { redis, safeRedisOperation } from "@/lib/redis"
import type { Chat } from "@/lib/chat"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Get the current user
    const user = await getCurrentUser()

    // If no user is found, check if there's a session cookie
    if (!user) {
      console.error("Unauthorized: No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("User authenticated:", user.id, user.username)

    const chatId = params.id

    // Get chat data with safe operation
    const chatData = await safeRedisOperation(async () => await redis.get(`chat:${chatId}`), null)

    if (!chatData) {
      console.error("Chat not found:", chatId)
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
        throw new Error("Invalid chat data")
      }
    } catch (error) {
      console.error("Error parsing chat data:", error)
      return NextResponse.json({ error: "Invalid chat data" }, { status: 500 })
    }

    // Check if members exists and is an array
    if (!chat.members || !Array.isArray(chat.members)) {
      console.error("Chat has no valid members array:", chat)
      return NextResponse.json({ error: "Invalid chat data: no members array" }, { status: 500 })
    }

    // Check if user is a member of this chat
    if (!chat.members.includes(user.id)) {
      console.error("User not a member of chat:", user.id, chatId)
      return NextResponse.json({ error: "Unauthorized: Not a member of this chat" }, { status: 403 })
    }

    console.log("Fetching messages for chat:", chatId)
    const messages = await getMessages(chatId)
    return NextResponse.json(messages)
  } catch (error) {
    console.error(
      "Error fetching messages:",
      error instanceof Error ? error.message : "Unknown error",
      error instanceof Error && error.stack ? error.stack : "",
    )
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
