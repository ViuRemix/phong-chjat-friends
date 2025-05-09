import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { redis } from "@/lib/redis"
import { hashPassword } from "@/lib/auth"
import type { User } from "@/lib/auth"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.id
    const { username, password, role } = await request.json()

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Get all users
    const usersData = await redis.hgetall("users")
    if (!usersData) {
      return NextResponse.json({ error: "No users found" }, { status: 404 })
    }

    // Find the user to update
    let userToUpdate: User | null = null
    let currentUsername: string | null = null

    for (const [uname, userData] of Object.entries(usersData)) {
      try {
        const user = typeof userData === "string" ? JSON.parse(userData) : userData
        if (user.id === userId) {
          userToUpdate = user
          currentUsername = uname
          break
        }
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }

    if (!userToUpdate || !currentUsername) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if new username already exists (if it's different from current)
    if (username !== currentUsername) {
      const existingUser = await redis.hget("users", username)
      if (existingUser) {
        return NextResponse.json({ error: "Username already exists" }, { status: 400 })
      }
    }

    // Update user data
    const updatedUser: User = {
      ...userToUpdate,
      username,
      role: role || userToUpdate.role || "user",
    }

    // Update password if provided
    if (password) {
      updatedUser.password = hashPassword(password)
    }

    // If username is being changed, delete the old entry and create a new one
    if (username !== currentUsername) {
      await redis.hdel("users", currentUsername)
    }

    // Store updated user
    await redis.hset("users", { [username]: JSON.stringify(updatedUser) })

    // Don't return password
    const { password: _, ...userWithoutPassword } = updatedUser

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.id

    // Don't allow deleting the current user
    if (userId === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Get all users
    const usersData = await redis.hgetall("users")
    if (!usersData) {
      return NextResponse.json({ error: "No users found" }, { status: 404 })
    }

    // Find the user to delete
    let usernameToDelete: string | null = null

    for (const [username, userData] of Object.entries(usersData)) {
      try {
        const user = typeof userData === "string" ? JSON.parse(userData) : userData
        if (user.id === userId) {
          usernameToDelete = username
          break
        }
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }

    if (!usernameToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete user
    await redis.hdel("users", usernameToDelete)

    // TODO: Delete user's chats, messages, etc.

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
