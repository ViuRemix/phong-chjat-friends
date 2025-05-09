import { NextResponse } from "next/server"
import { checkRedisConnection, redisStatus } from "@/lib/redis"

export async function GET() {
  try {
    const isConnected = redisStatus.isConfigured ? await checkRedisConnection() : false

    return NextResponse.json({
      configured: redisStatus.isConfigured,
      connected: isConnected,
    })
  } catch (error) {
    console.error("Error checking status:", error)
    return NextResponse.json({
      configured: redisStatus.isConfigured,
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
