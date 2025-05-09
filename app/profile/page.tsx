"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, Camera, Check, Loader2 } from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState("")
  const [avatar, setAvatar] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const profileColors = [
    { value: "bg-blue-600", label: "Blue" },
    { value: "bg-purple-600", label: "Purple" },
    { value: "bg-green-600", label: "Green" },
    { value: "bg-red-600", label: "Red" },
    { value: "bg-yellow-600", label: "Yellow" },
    { value: "bg-pink-600", label: "Pink" },
    { value: "bg-indigo-600", label: "Indigo" },
    { value: "bg-teal-600", label: "Teal" },
  ]

  useEffect(() => {
    async function loadUser() {
      try {
        setError(null)
        const userData = await getCurrentUser()
        if (!userData) {
          router.push("/login")
          return
        }
        setUser(userData)
        setUsername(userData.username)
        setAvatar(userData.avatar || null)
        setSelectedColor(userData.profileColor || "bg-blue-600")
      } catch (error) {
        console.error("Error loading user:", error)
        setError("Failed to load user data")
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [router])

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB")
      return
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("File must be an image")
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      // Create form data
      const formData = new FormData()
      formData.append("file", file)

      // Upload file
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload file")
      }

      const data = await response.json()
      setAvatar(data.url)
    } catch (error) {
      console.error("Error uploading file:", error)
      setError("Failed to upload file")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!username.trim()) {
        setError("Username is required")
        setIsSaving(false)
        return
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          avatar,
          profileColor: selectedColor,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update profile")
      }

      const data = await response.json()
      setUser(data.user)
      setSuccess("Profile updated successfully")

      // Refresh the page after a short delay
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (error) {
      console.error("Error updating profile:", error)
      setError(error instanceof Error ? error.message : "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="border-b border-gray-800 p-4">
        <div className="container max-w-3xl mx-auto flex items-center">
          <Link href="/chat" className="text-white hover:text-gray-300 flex items-center">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Chat
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto p-4">
        <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white">Your Profile</CardTitle>
            <CardDescription className="text-gray-400">Update your profile information</CardDescription>
          </CardHeader>

          {error && (
            <div className="px-6">
              <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-300">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {success && (
            <div className="px-6">
              <Alert className="bg-green-900/20 border-green-800 text-green-300">
                <Check className="h-4 w-4 mr-2" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                  <Avatar className="h-24 w-24 border-2 border-gray-700">
                    {avatar ? (
                      <AvatarImage src={avatar || "/placeholder.svg"} alt={username} />
                    ) : (
                      <AvatarFallback className={`text-2xl ${selectedColor}`}>
                        {username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                <p className="mt-2 text-sm text-gray-400">Click to change avatar</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-300">
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Your username"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Profile Color</Label>
                <RadioGroup value={selectedColor} onValueChange={setSelectedColor} className="grid grid-cols-4 gap-2">
                  {profileColors.map((color) => (
                    <div key={color.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={color.value} id={color.value} className="peer sr-only" />
                      <Label
                        htmlFor={color.value}
                        className="flex flex-col items-center justify-between rounded-md border-2 border-gray-700 p-2 hover:border-gray-500 peer-data-[state=checked]:border-white cursor-pointer"
                      >
                        <div className={`w-8 h-8 rounded-full ${color.value}`}></div>
                        <span className="mt-1 text-xs text-gray-400">{color.label}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  )
}
