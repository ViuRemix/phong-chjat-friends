import { NextResponse } from "next/server"
import { getCurrentUser, updateUserProfile } from "@/lib/auth"

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { username, avatar, profileColor } = body

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Check if username is already taken (if it's different from current username)
    if (username !== user.username) {
      const existingUser = await fetch(`/api/users/check?username=${encodeURIComponent(username)}`)
      if (existingUser.ok) {
        const data = await existingUser.json()
        if (data.exists) {
          return NextResponse.json({ error: "Username is already taken" }, { status: 400 })
        }
      }
    }

    // Update user profile
    const result = await updateUserProfile(user.id, {
      username,
      avatar,
      profileColor,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: result.user })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
