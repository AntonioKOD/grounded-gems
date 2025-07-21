"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EnhancedPostForm } from "./enhanced-post-form"

interface UserData {
  id: string
  name?: string
  email: string
  avatar?: string
  profileImage?: {
    url: string
  }
}

interface EnhancedPostFormWrapperProps {
  isEmbedded?: boolean
  onSuccess?: () => void
  className?: string
}

export default function EnhancedPostFormWrapper({ 
  isEmbedded = false, 
  onSuccess,
  className = "" 
}: EnhancedPostFormWrapperProps) {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!res.ok) {
          throw new Error("Failed to fetch user data")
        }

        const { user } = await res.json()
        setUser(user)
      } catch (error) {
        console.error("Error fetching user:", error)
        toast.error("Please log in to create a post")
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [router])

  if (isLoading) {
    return (
      <Card className={`${isEmbedded ? "border-0 shadow-none bg-transparent" : "shadow-sm"} ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card className={`${isEmbedded ? "border-0 shadow-none bg-transparent" : "shadow-sm"} ${className}`}>
        <CardContent className="p-4">
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Please log in to create a post</p>
            <Button onClick={() => router.push("/login")} size="sm">
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <EnhancedPostForm
      user={{
        id: user.id,
        name: user.name || 'Anonymous User',
        avatar: user.avatar,
        profileImage: user.profileImage
      }}
      onPostCreated={() => {
        console.log('📝 Post created successfully via enhanced form wrapper')
        onSuccess?.()
      }}
      className={className}
    />
  )
} 