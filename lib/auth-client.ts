// Client-side auth utilities

export async function getCurrentUser() {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include", // Important: include cookies in the request
      cache: "no-store", // Don't cache the response
      next: { revalidate: 0 }, // Revalidate on every request
    })

    if (!response.ok) {
      console.error("Error getting current user:", await response.text())
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error getting current user:", error instanceof Error ? error.message : "Unknown error")
    return null
  }
}
