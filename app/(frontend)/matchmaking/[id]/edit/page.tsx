/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { PageHeader } from "@/components/page-header"
import MatchmakingForm from "@/components/matchmaking/create-matchmaking-form"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function EditMatchmakingPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch current user
        const userResponse = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
        })

        if (!userResponse.ok) {
          throw new Error("Authentication failed")
        }

        const userData = await userResponse.json()

        if (!userData.user) {
          throw new Error("No user data returned")
        }

        setUser(userData.user)

        // Fetch matchmaking session
        const sessionResponse = await fetch(`/api/matchmaking-sessions/${id}`, {
          method: "GET",
          credentials: "include",
        })

        if (!sessionResponse.ok) {
          if (sessionResponse.status === 404) {
            throw new Error("Matchmaking session not found")
          }
          throw new Error("Failed to load matchmaking session")
        }

        const sessionData = await sessionResponse.json()
        setSession(sessionData)

        // Check permissions
        const isOrganizer = sessionData.organizer?.id === userData.user.id
        const isAdmin = userData.user.roles?.includes("admin")

        if (!isOrganizer && !isAdmin) {
          throw new Error("You don't have permission to edit this session")
        }
      } catch (err: any) {
        console.error("Error:", err)
        setError(err.message || "An error occurred")

        // Handle different error types
        if (err.message === "Authentication failed" || err.message === "No user data returned") {
          setTimeout(() => {
            router.push(`/login?callbackUrl=/matchmaking/${id}/edit`)
          }, 3000)
        } else if (err.message === "Matchmaking session not found") {
          setTimeout(() => {
            router.push("/matchmaking")
          }, 3000)
        }
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id, router])

  // Loading state
  if (loading) {
    return (
      <div className="container py-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Error state
  if (error || !user || !session) {
    return (
      <div className="container py-6 space-y-6">
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-4">
            <p>{error || "Failed to load required data"}</p>
            {error === "Authentication failed" || error === "No user data returned" ? (
              <Button
                onClick={() => router.push(`/login?callbackUrl=/matchmaking/${id}/edit`)}
                className="w-full sm:w-auto"
              >
                Go to Login
              </Button>
            ) : error === "Matchmaking session not found" ? (
              <Button onClick={() => router.push("/matchmaking")} className="w-full sm:w-auto">
                View All Sessions
              </Button>
            ) : error === "You don't have permission to edit this session" ? (
              <Button onClick={() => router.push(`/matchmaking/${id}`)} className="w-full sm:w-auto">
                View Session
              </Button>
            ) : (
              <Button onClick={() => router.back()} className="w-full sm:w-auto">
                Go Back
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Render form when all data is available
  return (
    <div className="container py-6 space-y-6">
      <PageHeader heading="Edit Matchmaking Session" subheading="Update your matchmaking session details" />

      <MatchmakingForm initialData={session} userId={user.id} isAdmin={user.roles?.includes("admin")} />
    </div>
  )
}
