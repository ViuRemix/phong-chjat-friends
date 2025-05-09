import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { ensureAdminExists } from "./lib/auth"

export async function middleware(request: NextRequest) {
  // Initialize admin user on application startup
  try {
    await ensureAdminExists()
  } catch (error) {
    console.error("Error initializing admin user:", error)
  }

  // Continue with the request
  return NextResponse.next()
}

// Only run the middleware on specific paths to avoid unnecessary executions
export const config = {
  matcher: ["/api/admin/:path*", "/admin/:path*"],
}
