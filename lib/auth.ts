import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { redis, safeRedisOperation, redisStatus } from "./redis"
import crypto from "crypto"

// User type definition
export type User = {
  id: string
  username: string
  password: string
  createdAt: number
  avatar?: string
  role?: "user" | "admin"
  profileColor?: string
}

// Generate a unique ID
export function generateId() {
  return crypto.randomBytes(16).toString("hex")
}

// Hash password
export function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex")
}

// Register a new user
export async function registerUser(username: string, password: string) {
  try {
    if (!redisStatus.isConfigured) {
      return { success: false, message: "Database is not configured. Please contact the administrator." }
    }

    // Check if username already exists
    const existingUser = await safeRedisOperation(async () => await redis.hget("users", username), null)
    if (existingUser) {
      return { success: false, message: "Username already exists" }
    }

    const userId = generateId()
    const hashedPassword = hashPassword(password)

    const user: User = {
      id: userId,
      username,
      password: hashedPassword,
      createdAt: Date.now(),
      role: "user",
      profileColor: getRandomColor(),
    }

    // Store user in Redis
    await redis.hset("users", { [username]: JSON.stringify(user) })

    // Create session
    const sessionId = generateId()
    await redis.set(`session:${sessionId}`, userId, { ex: 60 * 60 * 24 * 7 }) // 7 days

    // Set cookie
    cookies().set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "lax",
    })

    return { success: true, user }
  } catch (error) {
    console.error("Registration error:", error)
    return { success: false, message: "An error occurred during registration" }
  }
}

// Login user
export async function loginUser(username: string, password: string) {
  try {
    if (!redisStatus.isConfigured) {
      return { success: false, message: "Database is not configured. Please contact the administrator." }
    }

    // Get user from Redis
    const userData = await safeRedisOperation(async () => await redis.hget("users", username), null)
    if (!userData) {
      return { success: false, message: "Invalid username or password" }
    }

    // Make sure userData is a string before parsing
    let user: User
    if (typeof userData === "string") {
      try {
        user = JSON.parse(userData) as User
      } catch (e) {
        console.error("Error parsing user data:", e)
        return { success: false, message: "Invalid user data" }
      }
    } else if (userData !== null) {
      // If it's already an object, use it directly
      user = userData as User
    } else {
      return { success: false, message: "Invalid username or password" }
    }

    const hashedPassword = hashPassword(password)

    if (user.password !== hashedPassword) {
      return { success: false, message: "Invalid username or password" }
    }

    // Create session
    const sessionId = generateId()
    await redis.set(`session:${sessionId}`, user.id, { ex: 60 * 60 * 24 * 7 }) // 7 days

    // Set cookie
    cookies().set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "lax",
    })

    return { success: true, user }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, message: "An error occurred during login" }
  }
}

// Logout user
export async function logoutUser() {
  try {
    // Kiểm tra sessionId từ cookies
    const sessionId = cookies().get("session_id")?.value;
    if (!sessionId) {
      console.log("No session_id found, user already logged out.");
      return; // Nếu không có session_id, bỏ qua việc logout
    }

    // Xóa session trong Redis
    await safeRedisOperation(async () => {
      console.log("Deleting session:", `session:${sessionId}`);
      await redis.del(`session:${sessionId}`);
    }, null);

    // Xóa cookie session_id
    cookies().delete("session_id");
    console.log("User logged out successfully.");

  } catch (error) {
    console.error("Logout error:", error);
  }
}


// Get current user
export async function getCurrentUser() {
  try {
    if (!redisStatus.isConfigured) {
      console.warn("Redis is not configured. Cannot get current user.")
      return null
    }

    // Giả sử cookies() là một phương thức bất đồng bộ, bạn cần sử dụng await
    const sessionId = (await cookies().get("session_id"))?.value;

    if (!sessionId) {
      console.log("No session cookie found");
      return null;  // Nếu không có session cookie, dừng lại và trả về null
    }

    // Nếu có sessionId, tiếp tục thực hiện các thao tác khác


    console.log("Session ID found:", sessionId)

    const userId = await safeRedisOperation(async () => await redis.get(`session:${sessionId}`), null)
    if (!userId) {
      console.log("No user ID found for session:", sessionId)
      cookies().delete("session_id")
      return null
    }

    console.log("User ID found:", userId)

    // Find user by ID using a safer approach
    const users = await safeRedisOperation(async () => await redis.hgetall("users"), {})
    if (!users || Object.keys(users).length === 0) {
      console.log("No users found in database")
      return null
    }

    // Iterate through users to find the one with matching ID
    for (const username in users) {
      try {
        const userData = users[username]
        let user: User

        if (typeof userData === "string") {
          user = JSON.parse(userData) as User
        } else if (userData !== null) {
          user = userData as User
        } else {
          continue
        }

        if (user.id === userId) {
          console.log("User found:", user.username)
          return user
        }
      } catch (error) {
        console.error("Error parsing user data for username:", username, error)
        // Continue to next user
      }
    }

    console.log("No user found with ID:", userId)
    return null
  } catch (error) {
    console.error("Error getting current user:", error instanceof Error ? error.message : "Unknown error")
    return null
  }
}

// Middleware to check if user is authenticated
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  return user
}

// Middleware to check if user is admin
export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    redirect("/login")
  }
  return user
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<Omit<User, "id" | "password">>) {
  try {
    if (!redisStatus.isConfigured) {
      return { success: false, message: "Database is not configured. Please contact the administrator." }
    }

    // Get all users
    const users = await safeRedisOperation(async () => await redis.hgetall("users"), {})
    if (!users || Object.keys(users).length === 0) return { success: false, message: "No users found" }

    // Find the user to update
    let userToUpdate: User | null = null
    let username: string | null = null

    for (const uname in users) {
      try {
        const userData = users[uname]
        let user: User

        if (typeof userData === "string") {
          user = JSON.parse(userData) as User
        } else if (userData !== null) {
          user = userData as User
        } else {
          continue
        }

        if (user.id === userId) {
          userToUpdate = user
          username = uname
          break
        }
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }

    if (!userToUpdate || !username) {
      return { success: false, message: "User not found" }
    }

    // Update user data
    const updatedUser = { ...userToUpdate, ...updates }

    // If username is being changed, we need to delete the old entry and create a new one
    if (updates.username && updates.username !== username) {
      await redis.hdel("users", username)
      await redis.hset("users", { [updates.username]: JSON.stringify(updatedUser) })
    } else {
      // Otherwise just update the existing entry
      await redis.hset("users", { [username]: JSON.stringify(updatedUser) })
    }

    return { success: true, user: updatedUser }
  } catch (error) {
    console.error("Error updating user profile:", error)
    return { success: false, message: "An error occurred while updating profile" }
  }
}

// Get random color for user profile
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

// Create admin user if it doesn't exist
export async function ensureAdminExists() {
  try {
    // Check if Redis is configured
    if (!redisStatus.isConfigured) {
      console.warn("Redis is not configured. Cannot create admin user.")
      return
    }

    const adminUsername = "admin"
    const adminPassword = "admin123" // Default password, should be changed

    // Check if admin exists
    const existingAdmin = await safeRedisOperation(async () => await redis.hget("users", adminUsername), null)
    if (existingAdmin) {
      // Admin already exists
      console.log("Admin user already exists")
      return
    }

    // Create admin user
    const adminId = generateId()
    const hashedPassword = hashPassword(adminPassword)

    const admin: User = {
      id: adminId,
      username: adminUsername,
      password: hashedPassword,
      createdAt: Date.now(),
      role: "admin",
      profileColor: "bg-red-600",
    }

    // Store admin in Redis
    await redis.hset("users", { [adminUsername]: JSON.stringify(admin) })
    console.log("Admin user created successfully")
  } catch (error) {
    console.error(
      "Error creating admin user:",
      error instanceof Error ? error.message : "Unknown error",
      error instanceof Error && error.stack ? error.stack : "",
    )
    // Don't throw the error, just log it
  }
}
