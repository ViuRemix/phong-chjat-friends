import { NextResponse } from "next/server"
import { ensureAdminExists } from "@/lib/auth"
import { checkRedisConnection, redisStatus } from "@/lib/redis"

export async function GET() {
  try {
    // Check if Redis is configured
    if (!redisStatus.isConfigured) {
      return NextResponse.json(
        {
          success: false,
          message: "Redis is not configured. Please set up the environment variables.",
          status: "not_configured",
        },
        { status: 200 },
      )
    }

    // Check Redis connection
    const isConnected = await checkRedisConnection()
    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not connect to Redis. Please check your configuration.",
          status: "connection_failed",
        },
        { status: 200 },
      )
    }

    // Try to create admin user
    await ensureAdminExists()

    return NextResponse.json({
      success: true,
      message: "Initialization complete",
      status: "initialized",
    })
  } catch (error) {
    console.error(
      "Initialization error:",
      error instanceof Error ? error.message : "Unknown error",
      error instanceof Error && error.stack ? error.stack : "",
    )
    return NextResponse.json(
      {
        success: false,
        message: "Initialization failed",
        error: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      },
      { status: 200 }, // Return 200 even for errors to avoid HTML error pages
    )
  }
}
