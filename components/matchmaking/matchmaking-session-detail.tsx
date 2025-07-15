
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { MapPin, Users, Trophy, AlertCircle, X, CalendarIcon } from "lucide-react"
import type { MatchmakingSession } from "@/types/matchmaking"
import { format } from "date-fns"
import Link from "next/link"

interface MatchmakingSessionDetailProps {
  id: string
}

export function MatchmakingSessionDetail({ id }: MatchmakingSessionDetailProps) {
  const [session, setSession] = useState<MatchmakingSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  

  // Mock user ID for demonstration
  const currentUserId = "user1"

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true)
        // In a real app, this would be an API call
        // const response = await fetch(`/api/matchmaking-sessions/${id}`)
        // const data = await response.json()

        // Mock data for demonstration
        const mockSession: MatchmakingSession = {
          id,
          title: "Tennis Doubles Match",
          description:
            "Looking for players for a friendly doubles match. All skill levels welcome, but some experience is preferred. We'll play for about 2 hours with breaks in between sets. Please bring your own racket and water.",
          sportType: "tennis",
          skillLevel: "intermediate",
          location: {
            id: "loc1",
            name: "Central Tennis Club",
            address: "123 Main St, Anytown, USA",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          timeWindow: {
            start: new Date(Date.now() + 86400000).toISOString(), // tomorrow
            end: new Date(Date.now() + 90000000).toISOString(),
          },
          minPlayers: 4,
          maxPlayers: 4,
          participants: [
            { id: "user1", name: "John Doe" },
            { id: "user2", name: "Jane Smith" },
          ],
          preferences: {
            ageRange: { min: 18, max: 50 },
            gender: "any",
            availability: [
              { day: "monday", timeSlot: "Evening" },
              { day: "wednesday", timeSlot: "Evening" },
              { day: "saturday", timeSlot: "Morning" },
            ],
          },
          autoMatch: true,
          organizer: { id: "user2", name: "Jane Smith" },
          status: "open",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        setSession(mockSession)
        setLoading(false)
      } catch (err) {
        console.error("Error fetching matchmaking session:", err)
        setError("Failed to load matchmaking session. Please try again later.")
        setLoading(false)
        toast( "Error",{
         
          description: "Failed to load matchmaking session",
          
        })
      }
    }

    fetchSession()
  }, [id, toast])

  const handleJoin = async () => {
    setJoining(true)
    try {
      // In a real app, this would be an API call
      // await fetch(`/api/matchmaking-sessions/${id}/join`, { method: 'POST' })

      // Mock successful join
      setTimeout(() => {
        if (session) {
          const updatedSession = {
            ...session,
            participants: [...(session.participants || []), { id: currentUserId, name: "Current User" }],
          }
          setSession(updatedSession)
        }

        toast("Success", {
       
          description: "You've joined the matchmaking session",
        })
        setJoining(false)
      }, 1000)
    } catch (error) {
      console.error("Error joining session:", error)
      toast("Error",{
        
        description: "Failed to join the session. Please try again.",
        
      })
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    setLeaving(true)
    try {
      // In a real app, this would be an API call
      // await fetch(`/api/matchmaking-sessions/${id}/leave`, { method: 'POST' })

      // Mock successful leave
      setTimeout(() => {
        if (session) {
          const updatedSession = {
            ...session,
            participants: session.participants?.filter((p: any) => p.id !== currentUserId) || [],
          }
          setSession(updatedSession)
        }

        toast("Success", {
         
          description: "You've left the matchmaking session",
        })
        setLeaving(false)
      }, 1000)
    } catch (error) {
      console.error("Error leaving session:", error)
      toast("Error",{
        
        description: "Failed to leave the session. Please try again.",
        
      })
      setLeaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading session details...</div>
  }

  if (error || !session) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || "Session not found"}</AlertDescription>
      </Alert>
    )
  }

  const startDate = new Date(session.timeWindow.start)
  const endDate = new Date(session.timeWindow.end)

  const isOrganizer = session.organizer.id === currentUserId
  const isParticipant = session.participants?.some((p: any) => p.id === currentUserId) || false
  const isFull = session.participants && session.participants.length >= session.maxPlayers
  const spotsLeft = session.maxPlayers - (session.participants?.length || 0)

  const getStatusColor = () => {
    switch (session.status) {
      case "open":
        return "bg-green-500 text-white"
      case "in_progress":
        return "bg-blue-500 text-white"
      case "completed":
        return "bg-gray-500 text-white"
      case "cancelled":
        return "bg-red-500 text-white"
      default:
        return "bg-yellow-500 text-white" // draft
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{session.title}</h1>
          <div className="flex items-center mt-2">
            <Badge className={getStatusColor()}>{session.status.replace("_", " ")}</Badge>
            <span className="text-sm text-muted-foreground ml-2">Organized by {session.organizer.name}</span>
          </div>
        </div>

        {isOrganizer ? (
          <div className="flex gap-2">
            <Link href={`/matchmaking/${session.id}/edit`}>
              <Button variant="outline">Edit Session</Button>
            </Link>
            <Button variant="default">Manage Participants</Button>
          </div>
        ) : isParticipant ? (
          <Button variant="outline" onClick={handleLeave} disabled={leaving || session.status !== "open"}>
            {leaving ? "Leaving..." : "Leave Session"}
          </Button>
        ) : (
          <Button variant="default" onClick={handleJoin} disabled={joining || isFull || session.status !== "open"}>
            {joining
              ? "Joining..."
              : isFull
                ? "Session Full"
                : `Join Session (${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left)`}
          </Button>
        )}
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Session Details */}
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {session.description && <p>{session.description}</p>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <Trophy className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Sport</p>
                    <p className="text-muted-foreground capitalize">{session.sportType}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Users className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Skill Level</p>
                    <p className="text-muted-foreground capitalize">{session.skillLevel}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <CalendarIcon className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-muted-foreground">
                      {format(startDate, "MMMM d, yyyy")}
                      <br />
                      {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-2 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-muted-foreground">{session.location.name}</p>
                    <p className="text-xs text-muted-foreground">{typeof session.location.address === 'string' ? session.location.address : session.location.address.street}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle>
                Participants ({session.participants?.length || 0}/{session.maxPlayers})
              </CardTitle>
              <CardDescription>
                {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} remaining` : "This session is full"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.participants && session.participants.length > 0 ? (
                <div className="space-y-4">
                  {session.participants.map((participant: any) => (
                    <div key={participant.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage
                            src={`/abstract-geometric-shapes.png?height=32&width=32&query=${participant.name}`}
                          />
                          <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{participant.name}</p>
                          {participant.id === session.organizer.id && (
                            <Badge variant="outline" className="text-xs">
                              Organizer
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isOrganizer && participant.id !== session.organizer.id && (
                        <Button variant="ghost" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No participants have joined yet</div>
              )}
            </CardContent>
          </Card>

          {/* Matched Groups (if any) */}
          {session.matchedGroups && session.matchedGroups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Matched Groups</CardTitle>
                <CardDescription>Players have been matched into groups based on preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="group1">
                  <TabsList className="mb-4">
                    {session.matchedGroups.map((_: any, index:any) => (
                      <TabsTrigger key={index} value={`group${index + 1}`}>
                        Group {index + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {session.matchedGroups.map((matchedGroup:any, groupIndex:any) => (
                    <TabsContent key={groupIndex} value={`group${groupIndex + 1}`}>
                      <div className="space-y-4">
                        {matchedGroup.group.map((item:any) => (
                          <div key={item.user.id} className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarImage
                                src={`/abstract-geometric-shapes.png?height=32&width=32&query=${item.user.name}`}
                              />
                              <AvatarFallback>{item.user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium">{item.user.name}</p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {session.preferences ? (
                <>
                  {session.preferences.ageRange && (
                    <div>
                      <p className="font-medium">Age Range</p>
                      <p className="text-muted-foreground">
                        {session.preferences.ageRange.min} - {session.preferences.ageRange.max} years
                      </p>
                    </div>
                  )}

                  {session.preferences.gender && (
                    <div>
                      <p className="font-medium">Gender Preference</p>
                      <p className="text-muted-foreground capitalize">{session.preferences.gender}</p>
                    </div>
                  )}

                  {session.preferences.availability && session.preferences.availability.length > 0 && (
                    <div>
                      <p className="font-medium">Availability</p>
                      <div className="text-muted-foreground">
                        {session.preferences.availability.map((avail:any, index:any) => (
                          <p key={index} className="capitalize">
                            {avail.day}: {avail.timeSlot}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No specific preferences set</p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isOrganizer ? (
                <>
                  <Button className="w-full" variant="destructive">
                    Cancel Session
                  </Button>
                </>
              ) : (
                <>
                  <Button className="w-full" variant="outline">
                    Share Session
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
