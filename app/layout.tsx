import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Chat Application",
  description: "A beautiful real-time chat application with authentication and group chat",
    generator: 'v0.dev'
}

// Function to initialize the application
async function initializeApp() {
  try {
    // Call the initialization endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_KEY ? process.env.NEXT_PUBLIC_API_KEY : ""}/api/init`)
    if (!response.ok) {
      console.error("Failed to initialize application:", await response.text())
    }
  } catch (error) {
    console.error("Error initializing application:", error)
  }
}

// Initialize the application on the server side
if (typeof window === "undefined") {
  initializeApp()
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
