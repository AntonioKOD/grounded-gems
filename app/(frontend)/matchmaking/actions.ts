/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { getPayload } from "payload"
import config from "@payload-config"
import { revalidatePath } from "next/cache"

/**
 * Create a new matchmaking session
 */
export async function createMatchmakingSession(data: any, userId: string) {
  try {
    const payload = await getPayload({ config })

    // Prepare the data for Payload CMS
    const sessionData = {
      title: data.title,
      description: data.description,
      sportType: data.sportType,
      skillLevel: data.skillLevel,
      location: data.location,
      virtualUrl: data.virtualUrl,
      timeWindow: {
        start: data.timeWindow.start,
        end: data.timeWindow.end,
      },
      minPlayers: data.minPlayers,
      maxPlayers: data.maxPlayers,
      preferences: data.preferences,
      autoMatch: data.autoMatch,
      status: data.status,
      organizer: userId,
    }

    // Create the session in Payload CMS
    const session = await payload.create({
      collection: "matchmakingSessions",
      data: sessionData,
    })

    console.log(`Matchmaking session created successfully: ${session.id}`)

    // Revalidate relevant paths
    revalidatePath("/matchmaking")
    revalidatePath(`/matchmaking/${session.id}`)

    return {
      success: true,
      sessionId: session.id,
    }
  } catch (error) {
    console.error("Error creating matchmaking session:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create matchmaking session",
    }
  }
}

/**
 * Update an existing matchmaking session
 */
export async function updateMatchmakingSession(sessionId: string, data: any, userId: string) {
  try {
    const payload = await getPayload({ config })

    // Check if user has permission to update this session
    const session = await payload.findByID({
      collection: "matchmakingSessions",
      id: sessionId,
    })

    if (!session) {
      return {
        success: false,
        error: "Matchmaking session not found",
      }
    }

    // Only allow the organizer or an admin to update the session
    if (session.organizer !== userId) {
      // In a real app, you would check if the user is an admin here
      return {
        success: false,
        error: "You don't have permission to update this session",
      }
    }

    // Update the session
    const updatedSession = await payload.update({
      collection: "matchmakingSessions",
      id: sessionId,
      data,
    })

    // Revalidate paths
    revalidatePath("/matchmaking")
    revalidatePath(`/matchmaking/${sessionId}`)

    return {
      success: true,
      sessionId: updatedSession.id,
    }
  } catch (error) {
    console.error("Error updating matchmaking session:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update matchmaking session",
    }
  }
}

/**
 * Join a matchmaking session
 */
export async function joinMatchmakingSession(sessionId: string, userId: string) {
  try {
    const payload = await getPayload({ config })

    // Get the current session
    const session = await payload.findByID({
      collection: "matchmakingSessions",
      id: sessionId,
    })

    if (!session) {
      return {
        success: false,
        error: "Matchmaking session not found",
      }
    }

    // Check if the session is open for joining
    if (session.status !== "open") {
      return {
        success: false,
        error: "This session is not open for joining",
      }
    }

    // Check if the user is already a participant
    const participants = session.participants || []
    if (participants.some((p: any) => p === userId || p.id === userId)) {
      return {
        success: false,
        error: "You are already a participant in this session",
      }
    }

    // Check if the session is at capacity
    if (participants.length >= session.maxPlayers) {
      return {
        success: false,
        error: "This session is already at maximum capacity",
      }
    }

    // Add the user to participants
    const updatedParticipants = [...participants, userId]

    // Update the session
    await payload.update({
      collection: "matchmakingSessions",
      id: sessionId,
      data: {
        participants: updatedParticipants,
      },
    })

    // Revalidate paths
    revalidatePath("/matchmaking")
    revalidatePath(`/matchmaking/${sessionId}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error joining matchmaking session:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to join matchmaking session",
    }
  }
}

/**
 * Leave a matchmaking session
 */
export async function leaveMatchmakingSession(sessionId: string, userId: string) {
  try {
    const payload = await getPayload({ config })

    // Get the current session
    const session = await payload.findByID({
      collection: "matchmakingSessions",
      id: sessionId,
    })

    if (!session) {
      return {
        success: false,
        error: "Matchmaking session not found",
      }
    }

    // Check if the user is a participant
    const participants = session.participants || []
    if (!participants.some((p: any) => p === userId || p.id === userId)) {
      return {
        success: false,
        error: "You are not a participant in this session",
      }
    }

    // Remove the user from participants
    const updatedParticipants = participants.filter((p: any) => p !== userId && p.id !== userId)

    // Update the session
    await payload.update({
      collection: "matchmakingSessions",
      id: sessionId,
      data: {
        participants: updatedParticipants,
      },
    })

    // Revalidate paths
    revalidatePath("/matchmaking")
    revalidatePath(`/matchmaking/${sessionId}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error leaving matchmaking session:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to leave matchmaking session",
    }
  }
}

/**
 * Get all matchmaking sessions with optional filtering
 */
export async function getMatchmakingSessions(filters: any = {}) {
  try {
    const payload = await getPayload({ config })

    // Build query for Payload
    const query: any = {}

    // Basic filters
    if (filters.sportType) {
      query.sportType = { equals: filters.sportType }
    }

    if (filters.skillLevel) {
      query.skillLevel = { equals: filters.skillLevel }
    }

    // Status filter
    if (filters.status) {
      query.status = { equals: filters.status }
    } else {
      // Default to open sessions if not specified
      query.status = { equals: "open" }
    }

    // Time frame filter
    if (filters.timeFrame === "upcoming") {
      const today = new Date().toISOString()
      query["timeWindow.start"] = { greater_than_equal: today }
    } else if (filters.timeFrame === "past") {
      const today = new Date().toISOString()
      query["timeWindow.end"] = { less_than: today }
    }

    // User-specific filters
    if (filters.userId && filters.isOrganizer) {
      query.organizer = { equals: filters.userId }
    }

    // Execute query with Payload
    const result = await payload.find({
      collection: "matchmakingSessions",
      where: query,
      sort: filters.sort || "timeWindow.start",
      page: filters.page || 1,
      limit: filters.limit || 10,
      depth: 1, // Include relationships with depth of 1
    })

    // Handle isParticipant filter
    let filteredDocs = result.docs

    if (filters.userId && filters.isParticipant) {
      // Filter to only include sessions where the user is a participant
      filteredDocs = filteredDocs.filter((session) => {
        const participants = session.participants || []
        return participants.some((p: any) => p === filters.userId || p.id === filters.userId)
      })
    }

    return {
      docs: filteredDocs || [],
      totalDocs: filters.isParticipant ? filteredDocs.length : result.totalDocs || 0,
      page: result.page || 1,
      totalPages: result.totalPages || 1,
      hasNextPage: result.hasNextPage || false,
      hasPrevPage: result.hasPrevPage || false,
    }
  } catch (error) {
    console.error("Error fetching matchmaking sessions:", error)
    return {
      docs: [],
      totalDocs: 0,
      page: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    }
  }
}

/**
 * Get a single matchmaking session by ID
 */
export async function getMatchmakingSession(id: string) {
  try {
    const payload = await getPayload({ config })

    return await payload.findByID({
      collection: "matchmakingSessions",
      id,
      depth: 2, // Load relationships
    })
  } catch (error) {
    console.error(`Error fetching matchmaking session by ID ${id}:`, error)
    return null
  }
}

/**
 * Cancel a matchmaking session
 */
export async function cancelMatchmakingSession(sessionId: string, userId: string) {
  try {
    const payload = await getPayload({ config })

    // Get the current session
    const session = await payload.findByID({
      collection: "matchmakingSessions",
      id: sessionId,
    })

    if (!session) {
      return {
        success: false,
        error: "Matchmaking session not found",
      }
    }

    // Check if the user is the organizer
    if (session.organizer !== userId) {
      return {
        success: false,
        error: "Only the organizer can cancel this session",
      }
    }

    // Update the session status to cancelled
    await payload.update({
      collection: "matchmakingSessions",
      id: sessionId,
      data: {
        status: "cancelled",
      },
    })

    // Revalidate paths
    revalidatePath("/matchmaking")
    revalidatePath(`/matchmaking/${sessionId}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error cancelling matchmaking session:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel matchmaking session",
    }
  }
}


export type SessionData = {
    id: string
    title: string
    description?: string
    image?: string
    // …add any fields your “matchmakingSessions” collection defines…
  }
  
  export async function getSessionById({
    sessionId,
  }: {
    sessionId: string
  }): Promise<SessionData | null> {
    const payload = await getPayload({ config })
    try {
      // If you’re on Payload ≥1.19 you can use findByID:
      const session = await payload.findByID({
        collection: "matchmakingSessions",
        id: sessionId,
        depth: 2,
      })
  
      // If using an older Payload version, you can do:
      // const { docs } = await payload.find({
      //   collection: "matchmakingSessions",
      //   where: { id: { equals: sessionId } },
      //   depth: DEFAULT_DEPTH,
      //   limit: 1,
      // })
      // const session = docs[0] || null
  
      return session as SessionData
    } catch (err) {
      // optional: log error or handle 404
      console.error("getSessionById error:", err)
      return null
    }
  }