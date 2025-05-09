import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { getAllUsers } from "@/lib/chat"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const users = await getAllUsers()

    // Filter out the current user
    const filteredUsers = users.filter((u) => u.id !== user.id)

    return NextResponse.json(filteredUsers)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
