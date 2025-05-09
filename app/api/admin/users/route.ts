import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { redis } from "@/lib/redis"
import { generateId, hashPassword } from "@/lib/auth"
import type { User } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const usersData = await redis.hgetall("users")
    if (!usersData) return NextResponse.json([])

    const users = []
    for (const [username, userData] of Object.entries(usersData)) {
      try {
        const user = typeof userData === "string" ? JSON.parse(userData) : userData
        // Don't return password
        const { password, ...userWithoutPassword } = user
        users.push(userWithoutPassword)
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error getting users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { username, password, role } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    // Check if username already exists
    const existingUser = await redis.hget("users", username)
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    const userId = generateId()
    const hashedPassword = hashPassword(password)

    const newUser: User = {
      id: userId,
      username,
      password: hashedPassword,
      createdAt: Date.now(),
      role: role || "user",
      profileColor: getRandomColor(),
    }

    // Store user in Redis
    await redis.hset("users", { [username]: JSON.stringify(newUser) })

    // Don't return password
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to get a random color
function getRandomColor() {
  const colors = [
    "bg-blue-600",
    "bg-purple-600",
    "bg-green-600",
    "bg-red-600",
    "bg-yellow-600",
    "bg-pink-600",
    "bg-indigo-600",
    "bg-teal-600",
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
