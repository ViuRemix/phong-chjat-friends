import { Redis } from "@upstash/redis"

// Create a more resilient Redis client with proper environment variables
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  retry: {
    retries: 3,
    backoff: (retryCount) => Math.min(Math.exp(retryCount) * 50, 1000),
  },
})

// Check if Redis environment variables are set
const isRedisConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

// If you're using NEXT_PUBLIC_API_KEY for client-side functionality, add it here
export const publicApiKey = process.env.NEXT_PUBLIC_API_KEY || ""

// Helper function to safely execute Redis operations
export async function safeRedisOperation<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  if (!isRedisConfigured) {
    console.warn("Redis is not configured. Using fallback value.")
    return fallback
  }

  try {
    return await operation()
  } catch (error) {
    console.error("Redis operation failed:", error instanceof Error ? error.message : "Unknown error")
    return fallback
  }
}

// Function to check if Redis is connected
export async function checkRedisConnection(): Promise<boolean> {
  if (!isRedisConfigured) {
    console.warn("Redis is not configured. Connection check failed.")
    return false
  }

  try {
    // Try a simple ping operation
    await redis.ping()
    return true
  } catch (error) {
    console.error("Redis connection check failed:", error instanceof Error ? error.message : "Unknown error")
    return false
  }
}

// Export Redis configuration status
export const redisStatus = {
  isConfigured: isRedisConfigured,
}
