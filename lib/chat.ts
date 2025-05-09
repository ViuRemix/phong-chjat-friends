import { redis } from "./redis"
import { generateId } from "./auth"

// Message type definition
export type Message = {
  id: string
  content: string
  senderId: string
  senderName: string
  chatId: string
  timestamp: number
  edited?: boolean
  deleted?: boolean
  fileUrl?: string
  fileName?: string
  fileType?: string
  readBy?: string[]
}

// Chat type definition
export type Chat = {
  id: string
  name: string
  isGroup: boolean
  createdBy: string
  members: string[]
  createdAt: number
  lastMessage?: Message
  theme?: string
  icon?: string
}

// Notification type definition
export type Notification = {
  id: string
  userId: string
  chatId: string
  messageId: string
  senderName: string
  content: string
  timestamp: number
  read: boolean
}

// Helper function to safely parse JSON
function safeJsonParse<T>(data: string | any, fallback: T): T {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as T
    } catch (e) {
      console.error("Error parsing JSON:", e)
      return fallback
    }
  }
  return data as T
}

// Send a message
export async function sendMessage(
  content: string,
  chatId: string,
  senderId: string,
  senderName: string,
  fileUrl?: string,
  fileName?: string,
  fileType?: string,
) {
  try {
    const messageId = generateId()

    const message: Message = {
      id: messageId,
      content,
      senderId,
      senderName,
      chatId,
      timestamp: Date.now(),
      readBy: [senderId], // Sender has read the message
      fileUrl,
      fileName,
      fileType,
    }

    // Store message in Redis
    await redis.lpush(`chat:${chatId}:messages`, JSON.stringify(message))

    // Update last message in chat
    const chatData = await redis.get(`chat:${chatId}`)
    if (chatData) {
      const chat = safeJsonParse<Chat>(chatData, {
        id: chatId,
        name: "",
        isGroup: false,
        createdBy: "",
        members: [],
        createdAt: Date.now(),
      })

      chat.lastMessage = message
      await redis.set(`chat:${chatId}`, JSON.stringify(chat))
    }

    // Create notifications for all members except sender
    const chat = safeJsonParse<Chat>(chatData || "", {
      id: chatId,
      name: "",
      isGroup: false,
      createdBy: "",
      members: [],
      createdAt: Date.now(),
    })

    for (const memberId of chat.members) {
      if (memberId !== senderId) {
        const notificationId = generateId()
        const notification: Notification = {
          id: notificationId,
          userId: memberId,
          chatId,
          messageId,
          senderName,
          content: fileUrl ? `${senderName} sent a file: ${fileName || "File"}` : content,
          timestamp: Date.now(),
          read: false,
        }
        await redis.lpush(`user:${memberId}:notifications`, JSON.stringify(notification))
      }
    }

    // Publish message to Redis channel for real-time updates
    try {
      await redis.publish("new_message", JSON.stringify(message))
    } catch (error) {
      console.error("Error publishing message:", error)
      // Continue even if publishing fails
    }

    return message
  } catch (error) {
    console.error("Error sending message:", error)
    throw error
  }
}

// Get messages for a chat
export async function getMessages(chatId: string, limit = 50) {
  try {
    const messagesData = await redis.lrange(`chat:${chatId}:messages`, 0, limit - 1)

    if (!messagesData || !Array.isArray(messagesData)) {
      console.error("Invalid messages data:", messagesData)
      return []
    }

    return messagesData
      .map((msg) => {
        try {
          // Safely parse message data
          if (typeof msg === "string") {
            return JSON.parse(msg) as Message
          } else {
            // If it's already an object, use it directly
            return msg as Message
          }
        } catch (error) {
          console.error("Error parsing message:", error)
          return {
            id: "error",
            content: "Error loading message",
            senderId: "",
            senderName: "Unknown",
            chatId,
            timestamp: Date.now(),
          } as Message
        }
      })
      .reverse()
  } catch (error) {
    console.error("Error getting messages:", error)
    return []
  }
}

// Edit a message
export async function editMessage(messageId: string, chatId: string, newContent: string, userId: string) {
  try {
    // Get all messages for the chat
    const messagesData = await redis.lrange(`chat:${chatId}:messages`, 0, -1)

    if (!messagesData || !Array.isArray(messagesData)) {
      return { success: false, message: "Messages not found" }
    }

    let messageIndex = -1
    let messageToEdit: Message | null = null

    // Find the message to edit
    for (let i = 0; i < messagesData.length; i++) {
      try {
        const msg = safeJsonParse<Message>(messagesData[i], {} as Message)
        if (msg.id === messageId) {
          messageToEdit = msg
          messageIndex = i
          break
        }
      } catch (error) {
        console.error("Error parsing message:", error)
      }
    }

    if (!messageToEdit || messageIndex === -1) {
      return { success: false, message: "Message not found" }
    }

    // Check if the user is the sender of the message
    if (messageToEdit.senderId !== userId) {
      return { success: false, message: "You can only edit your own messages" }
    }

    // Update the message
    messageToEdit.content = newContent
    messageToEdit.edited = true

    // Save the updated message
    await redis.lset(`chat:${chatId}:messages`, messageIndex, JSON.stringify(messageToEdit))

    // Update last message if this was the last message
    const chatData = await redis.get(`chat:${chatId}`)
    if (chatData) {
      const chat = safeJsonParse<Chat>(chatData, {} as Chat)
      if (chat.lastMessage?.id === messageId) {
        chat.lastMessage = messageToEdit
        await redis.set(`chat:${chatId}`, JSON.stringify(chat))
      }
    }

    // Publish message update to Redis channel for real-time updates
    try {
      await redis.publish(
        "message_updated",
        JSON.stringify({
          type: "edit",
          message: messageToEdit,
        }),
      )
    } catch (error) {
      console.error("Error publishing message update:", error)
    }

    return { success: true, message: messageToEdit }
  } catch (error) {
    console.error("Error editing message:", error)
    return { success: false, message: "An error occurred while editing the message" }
  }
}

// Delete a message
export async function deleteMessage(messageId: string, chatId: string, userId: string) {
  try {
    // Get all messages for the chat
    const messagesData = await redis.lrange(`chat:${chatId}:messages`, 0, -1)

    if (!messagesData || !Array.isArray(messagesData)) {
      return { success: false, message: "Messages not found" }
    }

    let messageIndex = -1
    let messageToDelete: Message | null = null

    // Find the message to delete
    for (let i = 0; i < messagesData.length; i++) {
      try {
        const msg = safeJsonParse<Message>(messagesData[i], {} as Message)
        if (msg.id === messageId) {
          messageToDelete = msg
          messageIndex = i
          break
        }
      } catch (error) {
        console.error("Error parsing message:", error)
      }
    }

    if (!messageToDelete || messageIndex === -1) {
      return { success: false, message: "Message not found" }
    }

    // Check if the user is the sender of the message
    if (messageToDelete.senderId !== userId) {
      return { success: false, message: "You can only delete your own messages" }
    }

    // Mark the message as deleted (we don't actually remove it)
    messageToDelete.deleted = true
    messageToDelete.content = "This message has been deleted"
    messageToDelete.fileUrl = undefined
    messageToDelete.fileName = undefined
    messageToDelete.fileType = undefined

    // Save the updated message
    await redis.lset(`chat:${chatId}:messages`, messageIndex, JSON.stringify(messageToDelete))

    // Update last message if this was the last message
    const chatData = await redis.get(`chat:${chatId}`)
    if (chatData) {
      const chat = safeJsonParse<Chat>(chatData, {} as Chat)
      if (chat.lastMessage?.id === messageId) {
        chat.lastMessage = messageToDelete
        await redis.set(`chat:${chatId}`, JSON.stringify(chat))
      }
    }

    // Publish message update to Redis channel for real-time updates
    try {
      await redis.publish(
        "message_updated",
        JSON.stringify({
          type: "delete",
          message: messageToDelete,
        }),
      )
    } catch (error) {
      console.error("Error publishing message update:", error)
    }

    return { success: true, message: messageToDelete }
  } catch (error) {
    console.error("Error deleting message:", error)
    return { success: false, message: "An error occurred while deleting the message" }
  }
}

// Mark message as read
export async function markMessageAsRead(messageId: string, chatId: string, userId: string) {
  try {
    // Get all messages for the chat
    const messagesData = await redis.lrange(`chat:${chatId}:messages`, 0, -1)

    if (!messagesData || !Array.isArray(messagesData)) {
      return { success: false, message: "Messages not found" }
    }

    let messageIndex = -1
    let messageToUpdate: Message | null = null

    // Find the message to update
    for (let i = 0; i < messagesData.length; i++) {
      try {
        const msg = safeJsonParse<Message>(messagesData[i], {} as Message)
        if (msg.id === messageId) {
          messageToUpdate = msg
          messageIndex = i
          break
        }
      } catch (error) {
        console.error("Error parsing message:", error)
      }
    }

    if (!messageToUpdate || messageIndex === -1) {
      return { success: false, message: "Message not found" }
    }

    // Initialize readBy array if it doesn't exist
    if (!messageToUpdate.readBy) {
      messageToUpdate.readBy = []
    }

    // Add user to readBy if not already there
    if (!messageToUpdate.readBy.includes(userId)) {
      messageToUpdate.readBy.push(userId)

      // Save the updated message
      await redis.lset(`chat:${chatId}:messages`, messageIndex, JSON.stringify(messageToUpdate))

      // Mark notification as read
      await markNotificationAsRead(userId, messageId)
    }

    return { success: true, message: messageToUpdate }
  } catch (error) {
    console.error("Error marking message as read:", error)
    return { success: false, message: "An error occurred while marking the message as read" }
  }
}

// Mark notification as read
export async function markNotificationAsRead(userId: string, messageId: string) {
  try {
    // Check if userId and messageId are valid
    if (!userId || !messageId) {
      console.error("Invalid userId or messageId provided to markNotificationAsRead")
      return { success: false, message: "Invalid parameters" }
    }

    const notificationsData = await safeRedisOperation(
      async () => await redis.lrange(`user:${userId}:notifications`, 0, -1),
      [],
    )

    if (!notificationsData || !Array.isArray(notificationsData)) {
      console.log("No notifications found or invalid data format:", notificationsData)
      return { success: false, message: "Notifications not found" }
    }

    let updated = false

    // Find and update notifications related to this message
    for (let i = 0; i < notificationsData.length; i++) {
      try {
        let notification: Notification

        if (typeof notificationsData[i] === "string") {
          notification = JSON.parse(notificationsData[i]) as Notification
        } else if (typeof notificationsData[i] === "object" && notificationsData[i] !== null) {
          notification = notificationsData[i] as Notification
        } else {
          console.error("Invalid notification data format at index", i, notificationsData[i])
          continue
        }

        if (notification.messageId === messageId && !notification.read) {
          notification.read = true
          await redis.lset(`user:${userId}:notifications`, i, JSON.stringify(notification))
          updated = true
        }
      } catch (error) {
        console.error("Error processing notification at index", i, ":", error)
      }
    }

    return { success: updated }
  } catch (error) {
    console.error("Error marking notification as read:", error instanceof Error ? error.message : "Unknown error")
    return { success: false, message: "An error occurred while marking the notification as read" }
  }
}

// Get user notifications
export async function getUserNotifications(userId: string) {
  try {
    // Check if userId is valid
    if (!userId) {
      console.error("Invalid userId provided to getUserNotifications")
      return []
    }

    // Use safeRedisOperation to handle Redis errors gracefully
    const notificationsData = await safeRedisOperation(
      async () => await redis.lrange(`user:${userId}:notifications`, 0, 19), // Get last 20 notifications
      [],
    )

    if (!notificationsData || !Array.isArray(notificationsData)) {
      console.log("No notifications found or invalid data format:", notificationsData)
      return []
    }

    // Safely parse each notification
    return notificationsData
      .map((data) => {
        try {
          if (typeof data === "string") {
            return JSON.parse(data)
          } else if (typeof data === "object" && data !== null) {
            return data
          }
          return null
        } catch (error) {
          console.error("Error parsing notification data:", error)
          return null
        }
      })
      .filter(Boolean) as Notification[]
  } catch (error) {
    // Improved error logging
    console.error(
      "Error getting user notifications:",
      error instanceof Error ? error.message : "Unknown error",
      error instanceof Error && error.stack ? error.stack : "",
    )
    return []
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string) {
  try {
    // Check if userId is valid
    if (!userId) {
      console.error("Invalid userId provided to getUnreadNotificationCount")
      return 0
    }

    const notifications = await getUserNotifications(userId)
    return Array.isArray(notifications) ? notifications.filter((n) => n && !n.read).length : 0
  } catch (error) {
    // Improved error logging
    console.error("Error getting unread notification count:", error instanceof Error ? error.message : "Unknown error")
    return 0
  }
}

// Create a new chat
export async function createChat(name: string, isGroup: boolean, createdBy: string, members: string[], icon?: string) {
  try {
    const chatId = generateId()

    const chat: Chat = {
      id: chatId,
      name,
      isGroup,
      createdBy,
      members: [createdBy, ...members.filter((id) => id !== createdBy)],
      createdAt: Date.now(),
      theme: "default",
      icon,
    }

    // Store chat in Redis
    await redis.set(`chat:${chatId}`, JSON.stringify(chat))

    // Add chat to each member's chat list
    for (const memberId of chat.members) {
      await redis.sadd(`user:${memberId}:chats`, chatId)
    }

    return chat
  } catch (error) {
    console.error("Error creating chat:", error)
    throw error
  }
}

// Update chat settings
export async function updateChatSettings(chatId: string, updates: Partial<Chat>, userId: string) {
  try {
    const chatData = await redis.get(`chat:${chatId}`)
    if (!chatData) {
      return { success: false, message: "Chat not found" }
    }

    const chat = safeJsonParse<Chat>(chatData, {} as Chat)

    // Check if user is a member of the chat
    if (!chat.members.includes(userId)) {
      return { success: false, message: "You are not a member of this chat" }
    }

    // For group chats, only creator can update settings
    if (chat.isGroup && chat.createdBy !== userId) {
      return { success: false, message: "Only the chat creator can update group settings" }
    }

    // Update chat settings
    const updatedChat = { ...chat, ...updates }
    await redis.set(`chat:${chatId}`, JSON.stringify(updatedChat))

    return { success: true, chat: updatedChat }
  } catch (error) {
    console.error("Error updating chat settings:", error)
    return { success: false, message: "An error occurred while updating chat settings" }
  }
}

// Get chats for a user
export async function getUserChats(userId: string) {
  try {
    const chatIds = await redis.smembers(`user:${userId}:chats`)
    const chats: Chat[] = []

    for (const chatId of chatIds) {
      const chatData = await redis.get(`chat:${chatId}`)
      if (chatData) {
        chats.push(
          safeJsonParse<Chat>(chatData, {
            id: chatId,
            name: "Unknown Chat",
            isGroup: false,
            createdBy: "",
            members: [],
            createdAt: Date.now(),
          }),
        )
      }
    }

    // Sort by last message timestamp or creation date
    return chats.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || a.createdAt
      const bTime = b.lastMessage?.timestamp || b.createdAt
      return bTime - aTime
    })
  } catch (error) {
    console.error("Error getting user chats:", error)
    return []
  }
}

// Get all users
export async function getAllUsers() {
  try {
    const usersData = await redis.hgetall("users")
    if (!usersData) return []

    const users = []
    for (const [username, userData] of Object.entries(usersData)) {
      try {
        const user = safeJsonParse(userData, { id: "", username: "Unknown", password: "", createdAt: Date.now() })
        // Don't return password
        const { password, ...userWithoutPassword } = user
        users.push(userWithoutPassword)
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }
    return users
  } catch (error) {
    console.error("Error getting all users:", error)
    return []
  }
}

// Update user presence
export async function updateUserPresence(userId: string, isOnline: boolean) {
  try {
    await redis.hset("user_presence", { [userId]: isOnline ? "online" : "offline" })
    // Publish presence update to Redis channel
    try {
      await redis.publish("presence_update", JSON.stringify({ userId, status: isOnline ? "online" : "offline" }))
    } catch (error) {
      console.error("Error publishing presence update:", error)
      // Continue even if publishing fails
    }
  } catch (error) {
    console.error("Error updating user presence:", error)
    throw error
  }
}

// Get user presence
export async function getUserPresence(userId: string) {
  try {
    const status = await redis.hget("user_presence", userId)
    return status === "online"
  } catch (error) {
    console.error("Error getting user presence:", error)
    return false
  }
}

// Get multiple users' presence
export async function getUsersPresence(userIds: string[]) {
  try {
    const presence: Record<string, boolean> = {}

    for (const userId of userIds) {
      presence[userId] = await getUserPresence(userId)
    }

    return presence
  } catch (error) {
    console.error("Error getting users presence:", error)
    return {}
  }
}

// Add this helper function if it doesn't exist already
export async function safeRedisOperation<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error("Redis operation failed:", error instanceof Error ? error.message : "Unknown error")
    return fallback
  }
}
