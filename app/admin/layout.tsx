import type React from "react"
import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin-sidebar"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if user is admin
  try {
    await requireAdmin()
  } catch (error) {
    redirect("/login")
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
