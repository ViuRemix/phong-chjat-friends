import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { redis } from "@/lib/redis"
import type { Chat } from "@/lib/chat"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const chatId = params.id
    const chatData = await redis.get(`chat:${chatId}`)

    if (!chatData) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    // Safely parse chat data
    let chat: Chat
    try {
      if (typeof chatData === "string") {
        chat = JSON.parse(chatData) as Chat
      } else {
        // If it's already an object, use it directly
        chat = chatData as Chat
      }
    } catch (error) {
      console.error("Error parsing chat data:", error)
      return NextResponse.json({ error: "Invalid chat data" }, { status: 500 })
    }

    // Check if user is a member of this chat
    if (!chat.members.includes(user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json(chat)
  } catch (error) {
    console.error("Error fetching chat:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
