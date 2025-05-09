import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { createChat, getUserChats } from "@/lib/chat"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const chats = await getUserChats(user.id)
    return NextResponse.json(chats)
  } catch (error) {
    console.error("Error fetching chats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    let name, isGroup, members
    try {
      const body = await request.json()
      name = body.name
      isGroup = body.isGroup
      members = body.members
    } catch (error) {
      console.error("Error parsing request body:", error)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: "Chat name is required" }, { status: 400 })
    }

    const chat = await createChat(name, isGroup, user.id, members || [])
    return NextResponse.json(chat)
  } catch (error) {
    console.error("Error creating chat:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
