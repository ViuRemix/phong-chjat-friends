import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // In a preview environment, WebSockets might not be fully supported
  // Return a simple JSON response to avoid errors
  return NextResponse.json({
    message: "WebSocket endpoint - connect via client",
    status: "ok",
    timestamp: new Date().toISOString(),
    info: "In preview environments, the application uses polling instead of WebSockets",
  })
}
