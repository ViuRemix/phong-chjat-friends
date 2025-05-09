import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { updateChatSettings } from "@/lib/chat"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const chatId = params.id
    const updates = await request.json()

    const result = await updateChatSettings(chatId, updates, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating chat settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
