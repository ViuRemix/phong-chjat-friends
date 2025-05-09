import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get("username")

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    const existingUser = await redis.hget("users", username)

    return NextResponse.json({ exists: !!existingUser })
  } catch (error) {
    console.error("Error checking username:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
