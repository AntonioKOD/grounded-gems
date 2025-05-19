/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import MatchmakingForm from "@/components/matchmaking/create-matchmaking-form"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function CreateMatchmakingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include", // Include cookies for authentication
        })

        if (!response.ok) {
          throw new Error("Authentication failed")
        }

        const data = await response.json()

        if (!data.user) {
          throw new Error("No user data returned")
        }

        setUser(data.user)
      } catch (err) {
        console.error("Error fetching user:", err)
        setError("Failed to authenticate. Please log in.")

        // Optional: Auto-redirect to login after a short delay
        setTimeout(() => {
          router.push("/login?callbackUrl=/matchmaking/create")
        }, 3000)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUser()
  }, [router])

  // Loading state
  if (loading) {
    return (
      <div className="container py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Loading user data...</p>
      </div>
    )
  }

  // Error state
  if (error || !user) {
    return (
      <div className="container py-6 space-y-6">
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-4">
            <p>{error || "Authentication required"}</p>
            <Button onClick={() => router.push("/login?callbackUrl=/matchmaking/create")} className="w-full sm:w-auto">
              Go to Login
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Render form when user is available
  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        heading="Create Matchmaking Session"
        subheading="Set up a new matchmaking session for players to join"
      />

      <MatchmakingForm userId={user.id} />
    </div>
  )
}

