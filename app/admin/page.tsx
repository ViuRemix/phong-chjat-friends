import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllUsers } from "@/lib/chat"
import { Users, MessageSquare, UserPlus } from "lucide-react"

export default async function AdminDashboard() {
  // Check if user is admin
  try {
    const admin = await requireAdmin()
    if (!admin) {
      redirect("/login")
    }
  } catch (error) {
    redirect("/login")
  }

  // Get stats
  const users = await getAllUsers()
  const userCount = users.length

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-400">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500 mr-3" />
              <span className="text-3xl font-bold">{userCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-400">Active Chats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-green-500 mr-3" />
              <span className="text-3xl font-bold">-</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-gray-400">New Users (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <UserPlus className="h-8 w-8 text-purple-500 mr-3" />
              <span className="text-3xl font-bold">-</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription className="text-gray-400">Recent user and system activity</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-8">No recent activity to display</p>
        </CardContent>
      </Card>
    </div>
  )
}
