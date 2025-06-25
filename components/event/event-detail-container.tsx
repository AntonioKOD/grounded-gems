/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { isValid, parseISO } from "date-fns"
import { format, isPast, isFuture } from "date-fns"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  User,
  ChevronLeft,
  Share2,
  Tag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Mail,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  getEventById,
  removeEventParticipant,
  addEventParticipant,
  cancelEvent,
  getEventAttendees,
  isAttending,
} from "@/app/(frontend)/events/actions"
import type { Event } from "@/types/event"
import InviteUsersForm from "./invite-users-form"

interface EventDetailContainerProps {
  eventId: string
  initialEvent: Event | null
}

export default function EventDetailContainer({ eventId, initialEvent }: EventDetailContainerProps) {
  const router = useRouter()

  // State
  const [event, setEvent] = useState<Event | null>(initialEvent)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar?: string } | null>(null)
  const [userParticipationStatus, setUserParticipationStatus] = useState<string | null>(null)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [hasFetchedUser, setHasFetchedUser] = useState(false)
  const [attendees, setAttendees] = useState<any[]>([])
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false)

  // Helper function to safely get profile image URL
  const getProfileImageUrl = (profileImage: any): string | undefined => {
    if (!profileImage) return undefined

    try {
      if (typeof profileImage === "string") {
        return profileImage
      } else if (profileImage.url) {
        return profileImage.url
      } else if (profileImage.src) {
        return profileImage.src
      }
    } catch (error) {
      console.error("Error parsing profile image:", error)
    }

    return `/placeholder.svg`
  }

  // Fetch current user and refresh event data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user
        const userResponse = await fetch("/api/users/me")
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setCurrentUser(userData.user)

          // Check if user is attending using the new server action
          if (userData.user && userData.user.id) {
            const attendanceData = await isAttending(eventId, userData.user.id)
            if (attendanceData.success) {
              setUserParticipationStatus(attendanceData.isAttending ? "going" : null)

              // Update participant count without triggering a re-render of the entire event
              if (attendanceData.participantCount !== undefined) {
                setEvent((prev) =>
                  prev
                    ? {
                        ...prev,
                        participantCount: attendanceData.participantCount,
                      }
                    : null,
                )
              }
            }
          }
        }
        setHasFetchedUser(true)
      } catch (error) {
        console.error("Error fetching user data:", error)
      }

      // Refresh event data
      try {
        const refreshedEvent = await getEventById({ eventId })
        if (refreshedEvent) {
          setEvent(refreshedEvent as Event)
        }
      } catch (error) {
        console.error("Error fetching event data:", error)
      }
    }

    fetchData()
  }, [eventId]) // Remove 'event' from the dependency array

  // Fetch attendees
  useEffect(() => {
    const fetchAttendees = async () => {
      if (!event) return

      setIsLoadingAttendees(true)
      try {
        const result = await getEventAttendees(eventId)
        if (result.success) {
          setAttendees(result.attendees)
        }
      } catch (error) {
        console.error("Error fetching attendees:", error)
      } finally {
        setIsLoadingAttendees(false)
      }
    }

    fetchAttendees()
  }, [eventId, event])

  // Log attendee data for debugging
  useEffect(() => {
    if (attendees.length > 0) {
      console.log("Attendee data sample:", attendees[0])
    }
  }, [attendees])

  // Handle case where event is null
  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
          <p className="text-gray-500 mb-6">The event you&apos;re looking for could not be found or has been removed.</p>
          <Button onClick={() => router.push("/events")}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Events
          </Button>
        </div>
      </div>
    )
  }

  // Safely parse dates
  const parseEventDate = (dateValue: any): Date | null => {
    if (!dateValue) return null

    try {
      if (typeof dateValue === "string") {
        const parsedDate = parseISO(dateValue)
        return isValid(parsedDate) ? parsedDate : null
      } else {
        const date = new Date(dateValue)
        return isValid(date) ? date : null
      }
    } catch (error) {
      console.error("Error parsing date:", error)
      return null
    }
  }

  // Parse dates
  const startDate = parseEventDate(event?.startDate)
  const endDate = event?.endDate
    ? parseEventDate(event.endDate)
    : startDate
      ? new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
      : null

  // Determine event status
  const isEventPast = endDate ? isPast(endDate) : false
  const isEventFuture = startDate ? isFuture(startDate) : false
  const isEventOngoing = startDate && endDate ? isPast(startDate) && isFuture(endDate) : false

  // Check if user is the creator
  const isCreator = currentUser?.id === (
    typeof event?.organizer === "string" 
      ? event?.organizer 
      : typeof event?.organizer === "object" && event?.organizer?.id
        ? event.organizer.id
        : undefined
  )

  // Check if event is full
  const isEventFull =
    event?.capacity !== undefined && event.rsvps !== undefined && event.rsvps.length >= event?.capacity

  // Handle join event
  const handleJoinEvent = async (status: "interested" | "going" | "not_going") => {
    if (!currentUser) {
      toast.error("Please log in to join events")
      router.push("/login")
      return
    }

    setIsLoading(true)
    try {
      const result = await addEventParticipant({
        eventId,
        userId: currentUser.id,
        status,
      })

      if (result.success) {
        toast.success(status === "going" ? "You're now attending this event!" : "You might attend this event")
        setUserParticipationStatus(status)

        // Refresh event data
        const refreshedEvent = await getEventById({ eventId })
        if (refreshedEvent) {
          setEvent(refreshedEvent as Event)
        }

        // Refresh attendees if status is "going"
        if (status === "going") {
          const attendeesResult = await getEventAttendees(eventId)
          if (attendeesResult.success) {
            setAttendees(attendeesResult.attendees)
          }
        }
      } else {
        throw new Error(result.error || "Failed to join event")
      }
    } catch (error) {
      console.error("Error joining event:", error)
      toast.error("Failed to join event. Please try again.")
    } finally {
      setIsLoading(false)
      setShowJoinDialog(false)
    }
  }

  // Handle leave event
  const handleLeaveEvent = async () => {
    if (!currentUser) return

    setIsLoading(true)
    try {
      const result = await removeEventParticipant({ eventId, userId: currentUser.id })

      if (result.success) {
        toast.success("You've left this event")
        setUserParticipationStatus(null)

        // Refresh event data
        const refreshedEvent = await getEventById({ eventId })
        if (refreshedEvent) {
          setEvent(refreshedEvent as Event)
        }

        // Refresh attendees
        const attendeesResult = await getEventAttendees(eventId)
        if (attendeesResult.success) {
          setAttendees(attendeesResult.attendees)
        }
      } else {
        throw new Error("Failed to leave event")
      }
    } catch (error) {
      console.error("Error leaving event:", error)
      toast.error("Failed to leave event. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle cancel event
  const handleCancelEvent = async () => {
    if (!currentUser || !isCreator) return

    setIsLoading(true)
    try {
      const result = await cancelEvent({ eventId, userId: currentUser.id })

      if (result.success) {
        toast.success("Event cancelled successfully")

        // Refresh event data
        const refreshedEvent = await getEventById({ eventId })
        if (refreshedEvent) {
          setEvent(refreshedEvent as Event)
        }
      } else {
        throw new Error(result.error || "Failed to cancel event")
      }
    } catch (error) {
      console.error("Error cancelling event:", error)
      toast.error("Failed to cancel event. Please try again.")
    } finally {
      setIsLoading(false)
      setShowCancelDialog(false)
    }
  }

  // Handle share event
  const handleShareEvent = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: event.name,
          text: event.description,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success("Event link copied to clipboard")
      }
    } catch (error) {
      console.error("Error sharing event:", error)
    }
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "draft":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200"
      case "postponed":
        return "bg-orange-100 text-orange-800 border-orange-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Get organizer name
  const getOrganizerName = () => {
    if (typeof event?.organizer === "string") {
      return "Event Organizer"
    } else {
      return event?.organizer?.name || "Event Organizer"
    }
  }

  // Get organizer email
  const getOrganizerEmail = () => {
    if (typeof event?.organizer === "string") {
      return ""
    } else {
      return event?.organizer?.contactEmail || ""
    }
  }

  // Get location name
  const getLocationName = () => {
    if (typeof event?.location === "string") {
      return "Event Location"
    } else {
      return event?.location?.name || "Event Location"
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Events
      </Button>

      {/* Event header */}
      <div className="relative rounded-xl overflow-hidden">
        <div className="h-64 md:h-80 w-full relative">
          {event?.image ? (
            <Image
            unoptimized
              src={typeof event?.image === "string" ? event?.image : event.image.url}
              alt={event?.name}
              fill
              className="object-cover"
            />
          ) : (
            <Image
            unoptimized
              src={`/placeholder.svg`}
              alt={event?.name}
              fill
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

          {/* Status badge */}
          <div className="absolute top-4 right-4">
            <Badge variant="outline" className={cn("font-medium text-sm", getStatusColor(event?.status))}>
              {event?.status.charAt(0).toUpperCase() + event?.status.slice(1)}
            </Badge>
          </div>

          {/* Event title and badges */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{event?.name}</h1>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline" className={cn("text-white border-white/30 bg-white/10")}>
                {startDate ? format(startDate, "EEEE, MMMM d, yyyy") : "Date not available"}
              </Badge>
              <Badge variant="outline" className={cn("text-white border-white/30 bg-white/10")}>
                {startDate ? format(startDate, "h:mm a") : "N/A"} - {endDate ? format(endDate, "h:mm a") : "N/A"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Event details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About This Event</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{event?.description}</p>

              {/* Event organizer */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Organized by</h3>
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <Image  unoptimized src={getProfileImageUrl(event?.organizer.profileImage) || '/placeholder.svg'} fill alt="Image"/>
                  </Avatar>
                  <div>
                    <p className="font-medium">{getOrganizerName()}</p>
                    <p className="text-sm text-gray-500">{getOrganizerEmail()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for participants and details */}
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="participants">
                <Users className="h-4 w-4 mr-2" />
                Participants{" "}
                {attendees.length > 0 ? attendees.length : event?.participantCount || event?.rsvps?.length || 0}
              </TabsTrigger>
              <TabsTrigger value="details">
                <Tag className="h-4 w-4 mr-2" />
                Event Details
              </TabsTrigger>
            </TabsList>

            {/* Participants tab */}
            <TabsContent value="participants" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Attendees</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  {isLoadingAttendees ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : attendees.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-500 mb-4">
                        {attendees.length} {attendees.length === 1 ? "person" : "people"} attending
                      </p>

                      {/* Show attendee list */}
                      <div className="space-y-4">
                        {/* For event creator, show detailed attendee list */}
                        {isCreator ? (
                          <div className="space-y-4">
                            {attendees.map((attendee, index) => (
                              <div key={index} className="flex items-center justify-between border-b pb-3">
                                <div className="flex items-center">
                                  <Avatar className="h-10 w-10 mr-3">
                                    {attendee.profileImage ? (
                                      <AvatarImage
                                        src={getProfileImageUrl(attendee.profileImage) || "/placeholder.svg"}
                                        alt={attendee.name || "Attendee"}
                                      />
                                    ) : (
                                      <AvatarFallback>
                                        {attendee.name ? attendee.name.charAt(0).toUpperCase() : "U"}
                                      </AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{attendee.name || "Anonymous User"}</p>
                                    {attendee.email && (
                                      <p className="text-sm text-gray-500 flex items-center">
                                        <Mail className="h-3 w-3 mr-1" />
                                        {attendee.email}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/profile/${attendee.id}`)}
                                >
                                  View Profile
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // For regular users, show simplified attendee list
                          <div className="flex flex-wrap gap-2">
                            {attendees.map((attendee, index) => (
                              <Avatar key={index} className="h-10 w-10 border-2 border-white">
                                {attendee.profileImage ? (
                                  <AvatarImage
                                    src={getProfileImageUrl(attendee.profileImage) || "/placeholder.svg"}
                                    alt={attendee.name || "Attendee"}
                                  />
                                ) : (
                                  <AvatarFallback>
                                    {attendee.name ? attendee.name.charAt(0).toUpperCase() : "U"}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <User className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500">No participants yet. Be the first to join!</p>
                    </div>
                  )}

                  {event?.capacity && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500">
                        {attendees.length} of {event?.capacity} spots filled
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div
                          className="bg-[#FF6B6B] h-2.5 rounded-full"
                          style={{
                            width: `${(attendees.length / event?.capacity) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details tab */}
            <TabsContent value="details" className="mt-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  {/* Date and time */}
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Date and Time</p>
                      <p className="text-gray-600">
                        {startDate ? format(startDate, "EEEE, MMMM d, yyyy") : "Date not available"}
                      </p>
                      <p className="text-gray-600">
                        {startDate ? format(startDate, "h:mm a") : "N/A"} -{" "}
                        {endDate ? format(endDate, "h:mm a") : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-gray-600">{getLocationName()}</p>
                      {typeof event.location !== "string" && event.location?.address && (
                        <p className="text-gray-600">
                          {event.location.address.street}, {event.location.address.city}, {event.location.address.state}{" "}
                          {event.location.address.zip}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Capacity */}
                  {event?.capacity && (
                    <div className="flex items-start">
                      <Users className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Capacity</p>
                        <p className="text-gray-600">Maximum participants: {event?.capacity}</p>
                      </div>
                    </div>
                  )}

                  {/* Meta information */}
                  {event?.meta && (
                    <div className="flex items-start">
                      <Tag className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Additional Information</p>
                        {event?.meta.title && <p className="text-gray-600">Title: {event?.meta.title}</p>}
                        {event?.meta.description && (
                          <p className="text-gray-600">Description: {event?.meta.description}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column - Actions */}
        <div className="space-y-6">
          {/* Action card */}
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Status message */}
              {event?.status === "cancelled" ? (
                <div className="bg-red-50 text-red-800 p-4 rounded-md flex items-start">
                  <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">This event has been cancelled</p>
                    <p className="text-sm">The organizer has cancelled this event.</p>
                  </div>
                </div>
              ) : isEventPast ? (
                <div className="bg-gray-50 text-gray-800 p-4 rounded-md flex items-start">
                  <Clock className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">This event has ended</p>
                    <p className="text-sm">
                      This event took place on {startDate ? format(startDate, "MMMM d, yyyy") : "the scheduled date"}.
                    </p>
                  </div>
                </div>
              ) : isEventOngoing ? (
                <div className="bg-green-50 text-green-800 p-4 rounded-md flex items-start">
                  <Clock className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">This event is happening now!</p>
                    <p className="text-sm">
                      The event started at {startDate ? format(startDate, "h:mm a") : "the scheduled time"} and ends at{" "}
                      {endDate ? format(endDate, "h:mm a") : "the scheduled end time"}.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Action buttons */}
              <div className="space-y-3">
                {isEventFuture && event.status !== "cancelled" && (
                  <>
                    {userParticipationStatus ? (
                      <>
                        <div className="bg-gray-50 p-3 rounded-md text-center mb-3">
                          <p className="text-sm text-gray-600">You&apos;re attending this event</p>
                        </div>

                        <Button
                          variant="outline"
                          className="w-full border-red-200 text-red-600 hover:bg-red-50"
                          onClick={handleLeaveEvent}
                          disabled={isLoading || isCreator}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Leave Event
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                          onClick={() => setShowJoinDialog(true)}
                          disabled={isLoading || isEventFull || !hasFetchedUser}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : isEventFull ? (
                            <>
                              <Users className="h-4 w-4 mr-2" />
                              Event Full
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Join Event
                            </>
                          )}
                        </Button>

                        {isEventFull && (
                          <p className="text-sm text-center text-gray-500">
                            This event has reached its maximum capacity.
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Share button */}
                <Button variant="outline" className="w-full" onClick={handleShareEvent}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Event
                </Button>

                {/* Invite people button (for creator) */}
                {isCreator && isEventFuture && event.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    className="w-full border-[#4ECDC4] text-[#4ECDC4] hover:bg-[#4ECDC4]/10"
                    onClick={() => setShowInviteDialog(true)}
                    disabled={isLoading}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite People
                  </Button>
                )}

                {/* Cancel event button (for creator) */}
                {isCreator && isEventFuture && event.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    className="w-full border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Event
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Event metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Event Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span>
                  {event?.createdAt ? format(new Date(event?.createdAt), "MMM d, yyyy") : "Date not available"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last updated</span>
                <span>
                  {event?.updatedAt ? format(new Date(event?.updatedAt), "MMM d, yyyy") : "Date not available"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Event ID</span>
                <span className="font-mono text-xs">{event?.id.substring(0, 8)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Join dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join {event?.name}</DialogTitle>
            <DialogDescription>Confirm that you would like to join this event.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button
              className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 justify-start"
              onClick={() => handleJoinEvent("going")}
              disabled={isLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              I&apos;m going
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)} disabled={isLoading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel event dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-500">
              All participants will be notified that the event has been cancelled.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={isLoading}>
              Keep Event
            </Button>
            <Button variant="destructive" onClick={handleCancelEvent} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Event"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite users dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite People to {event?.name}</DialogTitle>
            <DialogDescription>
              Search for users and invite them to your event. They will receive a notification and email invitation.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <InviteUsersForm
              eventId={eventId}
              eventName={event?.name || "Event"}
              currentUserId={currentUser?.id}
              onInvited={() => {
                // Refresh attendees list after inviting
                fetchAttendees()
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
