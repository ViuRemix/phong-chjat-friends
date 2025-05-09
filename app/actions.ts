"use server"

import { revalidatePath } from "next/cache"
import { registerUser, loginUser, logoutUser, getCurrentUser } from "@/lib/auth"
import { sendMessage, createChat, updateUserPresence, getUserChats, getAllUsers } from "@/lib/chat"
import { redisStatus } from "@/lib/redis"

// Register action
export async function register(formData: FormData) {
  try {
    if (!redisStatus.isConfigured) {
      return { success: false, message: "Database is not configured. Please contact the administrator." }
    }

    const username = formData.get("username") as string
    const password = formData.get("password") as string

    if (!username || !password) {
      return { success: false, message: "Username and password are required" }
    }

    const result = await registerUser(username, password)

    if (result.success) {
      // Set user as online
      try {
        await updateUserPresence(result.user.id, true)
      } catch (error) {
        console.error("Error updating user presence:", error)
        // Continue even if presence update fails
      }

      revalidatePath("/")
      // Instead of redirecting here, we'll return success and let the client handle the redirect
      return { success: true, redirect: "/chat" }
    }

    return result
  } catch (error) {
    console.error("Registration error:", error)
    return { success: false, message: String(error) || "An error occurred during registration" }
  }
}

// Login action
export async function login(formData: FormData) {
  try {
    if (!redisStatus.isConfigured) {
      return { success: false, message: "Database is not configured. Please contact the administrator." }
    }

    const username = formData.get("username") as string
    const password = formData.get("password") as string

    if (!username || !password) {
      return { success: false, message: "Username and password are required" }
    }

    const result = await loginUser(username, password)

    if (result.success) {
      // Set user as online
      try {
        await updateUserPresence(result.user.id, true)
      } catch (error) {
        console.error("Error updating user presence:", error)
        // Continue even if presence update fails
      }

      revalidatePath("/")
      // Instead of redirecting here, we'll return success and let the client handle the redirect
      return { success: true, redirect: "/chat" }
    }

    return result
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, message: String(error) || "An error occurred during login" }
  }
}

// Logout action
export async function logout() {
  try {
    if (!redisStatus.isConfigured) {
      return { success: false, message: "Database is not configured. Please contact the administrator." }
    }

    const user = await getCurrentUser()
    if (user) {
      // Set user as offline
      try {
        await updateUserPresence(user.id, false)
      } catch (error) {
        console.error("Error updating user presence:", error)
        // Continue even if presence update fails
      }
    }

    await logoutUser()
    revalidatePath("/")
    return { success: true, redirect: "/login" }
  } catch (error) {
    console.error("Logout error:", error)
    return { success: false, message: String(error) || "An error occurred during logout" }
  }
}

// Send message action
export async function sendMessageAction(formData: FormData) {
  try {
    if (!redisStatus.isConfigured) {
      return { success: false, message: "Database is not configured. Please contact the administrator." }
    }

    const content = formData.get("content") as string
    const chatId = formData.get("chatId") as string

    if (!content || !chatId) {
      return { success: false, message: "Message content and chat ID are required" }
    }

    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "You must be logged in to send messages" }
    }

    const message = await sendMessage(content, chatId, user.id, user.username)

    revalidatePath(`/chat/${chatId}`)
    return { success: true, message }
  } catch (error) {
    console.error("Send message error:", error)
    return { success: false, message: String(error) || "An error occurred while sending the message" }
  }
}

// Create chat action
export async function createChatAction(formData: FormData) {
  try {
    if (!redisStatus.isConfigured) {
      return { success: false, message: "Database is not configured. Please contact the administrator." }
    }

    const name = formData.get("name") as string
    const isGroup = formData.get("isGroup") === "true"
    const membersInput = formData.get("members") as string

    if (!name) {
      return { success: false, message: "Chat name is required" }
    }

    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "You must be logged in to create a chat" }
    }

    let members: string[] = []
    if (membersInput) {
      members = membersInput.split(",").map((id) => id.trim())
    }

    const chat = await createChat(name, isGroup, user.id, members)

    revalidatePath("/chat")
    return { success: true, chat }
  } catch (error) {
    console.error("Create chat error:", error)
    return { success: false, message: String(error) || "An error occurred while creating the chat" }
  }
}

// Get user chats action
export async function getUserChatsAction() {
  try {
    if (!redisStatus.isConfigured) {
      return { success: false, message: "Database is not configured. Please contact the administrator.", chats: [] }
    }

    const user = await getCurrentUser()
    if (!user) {
      return { success: false, message: "You must be logged in to view chats", chats: [] }
    }

    const chats = await getUserChats(user.id)
    return { success: true, chats }
  } catch (error) {
    console.error("Get user chats error:", error)
    return { success: false, message: String(error) || "An error occurred while fetching chats", chats: [] }
  }
}

// Get all users action
export async function getAllUsersAction() {
  try {
    if (!redisStatus.isConfigured) {
      return { success: false, message: "Database is not configured. Please contact the administrator.", users: [] }
    }

    const users = await getAllUsers()
    return { success: true, users }
  } catch (error) {
    console.error("Get all users error:", error)
    return { success: false, message: String(error) || "An error occurred while fetching users", users: [] }
  }
}
