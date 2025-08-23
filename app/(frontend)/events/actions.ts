"use server"

import { getPayload } from "payload"
import config from "@payload-config"
import { revalidatePath } from "next/cache"
import type { EventFormData } from "@/types/event"
import type { EventFilterOptions } from "@/types/event-filter"
import { LocationFormData } from "@/types/location"
import type { Where } from "payload"

import {cookies } from "next/headers"
import { getAuthenticatedUserForServerActions } from '@/lib/auth-server'

export async function createEvent(formData: EventFormData) {
  try {
    const payload = await getPayload({ config })

    // Upload the image if provided
    let imageId = null
    if (formData.image) {
      try {
        // Convert the File to a Buffer that Payload can process
        const uploadedImage = await payload.create({
          collection: "media",
          data: {
            alt: `Image for ${formData.name}`,
          },
          file: {
            data: Buffer.from(await formData.image.arrayBuffer()),
            mimetype: formData.image.type,
            name: formData.image.name,
            size: formData.image.size,
          },
        })

        imageId = uploadedImage.id
        console.log("Event image uploaded successfully:", imageId)
      } catch (uploadError) {
        console.error("Error uploading event image:", uploadError)
        // Continue with event creation even if image upload fails
      }
    }

    // Prepare the event data for Payload CMS
    const eventData = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      
      // Media
      image: imageId,

      // Timing
      startDate: formData.startDate,
      endDate: formData.endDate,
      durationMinutes: formData.durationMinutes,

      // Taxonomy
      category: formData.category,
      eventType: formData.eventType,

      // Location
      location: formData.location, // This is the ID from the locations collection

      // Capacity
      capacity: formData.capacity,

      // Privacy
      privacy: formData.privacy || "public",
      privateAccess: formData.privateAccess || [],

      // Organizer - this should be the user ID
      organizer: formData.organizer,

      // Status
      status: formData.status || "draft",

      // Tags
      tags: formData.tags?.map(tag => ({ tag })) || [],

      // Meta
      meta: formData.meta ? {
        title: formData.meta.title,
        description: formData.meta.description,
      } : undefined,
    }

    // Create the event in Payload CMS
    const event = await payload.create({
      collection: "events",
      data: eventData,
    })

    console.log(`Event created successfully: ${event.id}`)

    // Create a notification for followers if the event is published
    if (formData.status === "published") {
      try {
        // Get the user's followers
        const user = await payload.findByID({
          collection: "users",
          id: formData.organizer,
          depth: 0,
        })

        if (user && user.followers && user.followers.length > 0) {
          // Create notifications for each follower
          await Promise.all(
            user.followers.map(async (followerId: string) => {
              await payload.create({
                collection: "notifications",
                data: {
                  recipient: followerId,
                  type: "new_event",
                  title: `New Event: ${formData.name}`,
                  message: `${user.name || user.email} created a new event: ${formData.name}`,
                  relatedTo: {
                    relationTo: "events",
                    value: event.id,
                  },
                  read: false,
                  createdAt: new Date().toISOString(),
                },
              })
            }),
          )
        }
      } catch (notificationError) {
        console.error("Error creating event notifications:", notificationError)
        // Continue even if notifications fail
      }
    }

    // Revalidate relevant paths
    revalidatePath("/events")
    revalidatePath(`/events/${event.id}`)
    revalidatePath(`/events/${event.slug}`)
    revalidatePath(`/profile/${formData.organizer}`)

    return {
      success: true,
      event: event,
    }
  } catch (error) {
    console.error("Error creating event:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create event",
    }
  }
}

export async function getLocations() {
  try {
    const payload = await getPayload({ config })
    
    const locationsResult = await payload.find({
      collection: "locations",
      limit: 100,
    })
    
    return locationsResult.docs
  } catch (error) {
    console.error("Error fetching locations:", error)
    return []
  }
}

export async function getUsers() {
  try {
    const payload = await getPayload({ config })
    
    const usersResult = await payload.find({
      collection: "users",
      limit: 100,
    })
    
    return usersResult.docs
  } catch (error) {
    console.error("Error fetching users:", error)
    return []
  }
}

/**
 * Update an existing event
 */
export async function updateEvent(eventId: string, data: Partial<EventFormData>, userId: string) {
  try {
    const payload = await getPayload({ config })

    // Check if user has permission to update this event
    const event = await payload.findByID({
      collection: "events",
      id: eventId,
    })

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      }
    }

    // Handle image upload if a new one is provided
    let imageId = event.image
    if (data.image && data.image instanceof File) {
      try {
        const uploadedImage = await payload.create({
          collection: "media",
          data: {
            alt: `Image for ${data.name || event.name}`,
          },
          file: {
            data: Buffer.from(await data.image.arrayBuffer()),
            mimetype: data.image.type,
            name: data.image.name,
            size: data.image.size,
          },
        })

        imageId = uploadedImage.id
      } catch (uploadError) {
        console.error("Error uploading new event image:", uploadError)
      }
    }

    // Prepare update data
    const updateData = {
      ...data,
      image: imageId,
    }

    // Update the event
    const updatedEvent = await payload.update({
      collection: "events",
      id: eventId,
      data: updateData,
    })

    // Revalidate paths
    revalidatePath("/events")
    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/events/${updatedEvent.slug}`)

    return {
      success: true,
      eventId: updatedEvent.id,
    }
  } catch (error) {
    console.error("Error updating event:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update event",
    }
  }
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId: string, userId: string) {
  try {
    const payload = await getPayload({ config })

    // Check if user has permission to delete this event
    const event = await payload.findByID({
      collection: "events",
      id: eventId,
    })

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      }
    }

    // Delete the event
    await payload.delete({
      collection: "events",
      id: eventId,
    })

    // Revalidate paths
    revalidatePath("/events")

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error deleting event:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete event",
    }
  }
}

export async function getEvents(filters: EventFilterOptions = {
  startDate: { from: new Date().toISOString() },
  sort: "startDate",
}) {
  try {
    const payload = await getPayload({ config })
    
    // Build query for Payload
    const query: any = {}
    
    
    
    if (filters.status) {
      query.status = { equals: filters.status }
    }
    
    // Date range filtering
    if (filters.startDate) {
      if (typeof filters.startDate === 'string') {
        // Handle string date (backward compatibility)
        query.startDate = { 
          greater_than_equal: filters.startDate 
        }
      } else if (filters.startDate.from || filters.startDate.to) {
        // Handle date range object
        if (filters.startDate.from) {
          query.startDate = { 
            greater_than_equal: filters.startDate.from 
          }
        }
        if (filters.startDate.to) {
          query.startDate = { 
            ...query.startDate,
            less_than_equal: filters.startDate.to 
          }
        }
      }
    }
    
   
    
    // Search
    
    
    // Creator filtering
   
    // Determine sort options
    let sort = "startDate"
    let sortDirection = "desc"
    
    if (filters.sort) {
      const [field, direction] = filters.sort.split(":")
      sort = field || "startDate"
      if (direction) {
        sortDirection = direction
      }
    }
    
    // Execute query with Payload
    const result = await payload.find({
      collection: "events",
      where: query,
      sort: sortDirection === 'desc' ? `-${sort}` : sort,
      page: filters.page || 1,
      limit: filters.limit || 10,
      depth: 2, // Include relationships with depth of 2 to populate image field
    })
    
    return {
      docs: result.docs || [],
      totalDocs: result.totalDocs || 0,
      page: result.page || 1,
      totalPages: result.totalPages || 1,
      hasNextPage: result.hasNextPage || false,
      hasPrevPage: result.hasPrevPage || false,
    }
  } catch (error) {
    console.error("Error fetching events:", error)
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

export async function getEventBySlug(slug: string) {
  try {
    const payload = await getPayload({ config })
    
    const { docs } = await payload.find({
      collection: "events",
      where: {
        slug: { equals: slug }
      },
      depth: 2, // Include relationships with depth of 2
      limit: 1
    })
    
    if (docs && docs.length > 0) {
      return {
        success: true,
        event: docs[0],
      }
    } else {
      return {
        success: false,
        error: "Event not found",
      }
    }
  } catch (error) {
    console.error("Error fetching event by slug:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
    }
  }
}



interface GetNearbyEventsParams {
  userId?: string
  radiusKm?: number
  category?: string
  eventType?: string
  isMatchmaking?: boolean
  limit?: number
  offset?: number
}

// Haversine formula to calculate distance between two coordinates
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function getNearbyEventsAction({
  userId = "",
  radiusKm = 50,
  category = "",
  eventType = "",
  isMatchmaking = false,
  limit = 12,
  offset = 0,
}: GetNearbyEventsParams = {}) {
  try {


    const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ')
 
    const payload = await getPayload({config})

    // Build the query conditions
    const where: any = { 
      status: { equals: "published" },
      startDate: { greater_than_equal: new Date().toISOString() } 
    }

    // Add category filter if provided
    if (category) {
      where.category = { equals: category }
    }

    // Add event type filter if provided
    if (eventType) {
      where.eventType = { equals: eventType }
    }

    // Add matchmaking filter if true
    if (isMatchmaking) {
      where.isMatchmaking = { equals: true }
    }

    // If no userId is provided, we can only return events without distance calculation
    if (!userId) {
      const { docs: events, totalDocs } = await payload.find({
        collection: "events",
        where,
        depth: 1,
        limit,
        page: Math.floor(offset / limit) + 1,
      })

      // Return events without distance calculation
      return events.map((event) => ({ event, distance: null }))
    }

    // 1. Try to fetch user document
    let userCoords
    try {
      const userDoc = await payload.findByID({ collection: "users", id: userId, depth: 0 })
      userCoords = (userDoc as any).location?.coordinates

      // If user has no coordinates, we can't do a location-based search
      if (!userCoords || typeof userCoords.latitude !== "number" || typeof userCoords.longitude !== "number") {
        console.warn(`User ${userId} has no valid coordinates. Returning non-distance-based results.`)
        const { docs: events } = await payload.find({
          collection: "events",
          where,
          depth: 1,
          limit,
          page: Math.floor(offset / limit) + 1,
        })
        return events.map((event) => ({ event, distance: null }))
      }
    } catch (error) {
      console.warn(`User with ID ${userId} not found or error occurred. Returning non-distance-based results.`)
      const { docs: events } = await payload.find({
        collection: "events",
        where,
        depth: 1,
        limit,
        page: Math.floor(offset / limit) + 1,
      })
      return events.map((event) => ({ event, distance: null }))
    }

    // 2. Fetch all published events with location populated
    // Note: We fetch all events to calculate distances, then apply pagination after sorting
    const { docs: events } = await payload.find({
      collection: "events",
      where,
      depth: 1,
    })

    // 3. Compute distance and filter events within radius
    const { latitude: userLat, longitude: userLng } = userCoords
    const nearby = events
      .map((ev: any) => {
        const loc = ev.location
        const coords = loc?.coordinates
        if (!coords || typeof coords.latitude !== "number" || typeof coords.longitude !== "number") return null

        const distance = haversineDistance(userLat, userLng, coords.latitude, coords.longitude)
        return { event: ev, distance }
      })
      .filter((item): item is { event: any; distance: number } => item !== null && item.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)

    // Apply pagination after sorting by distance
    const paginatedResults = nearby.slice(offset, offset + limit)

    // Return array of events with computed distance
    return paginatedResults
  } catch (error) {
    console.error("Error in getNearbyEventsAction:", error)
    return []
  }
}


interface GetEventByIdParams {
  eventId: string;
}

/**
 * Fetch a single event by ID, including RSVP counts and details.
 * Accessible by anyone.
 */
export async function getEventById({ eventId }: GetEventByIdParams) {
  const payload = await getPayload({config});
  const event = await payload.findByID({
    collection: "events",
    id: eventId,
    depth: 2, // populate related location and RSVPs join
  });
  if (!event) throw new Error(`Event ${eventId} not found.`);
  return event;
}

interface UpdateParticipationParams {
  eventId: string;
  userId: string;
  status: "interested" | "going" | "not_going";
}

/**
 * Create or update an RSVP for the given user on the given event.
 * Only the user themself may call this.
 */
export async function updateEventParticipation({ eventId, userId, status }: UpdateParticipationParams) {
  const payload =  await getPayload({config});

  // Check existing RSVP
  const { docs } = await payload.find({
    collection: "eventRSVPs",
    where: {
      and: [
        { event: { equals: eventId } },
        { user:  { equals: userId  } },
      ],
    },
  });

  let rsvp;
  if (docs.length > 0) {
    // Update existing
    const [existing] = docs;
    if (existing && existing.id) {
      rsvp = await payload.update({
        collection: "eventRSVPs",
        id: existing.id,
        data: { status },
      });
    }
  } else {
    // Create new
    rsvp = await payload.create({
      collection: "eventRSVPs",
      data: { event: eventId, user: userId, status },
    });
  }

  // Revalidate event page
  revalidatePath(`/events/${eventId}`);
  return rsvp;
}

interface RemoveParticipantParams {
  eventId: string;
  userId: string;
}

/**
 * Remove a user's RSVP from an event.
 * Only the user themself may call this.
 */


interface CancelEventParams {
  eventId: string;
  userId: string;
}

/**
 * Cancel an event (set status to 'cancelled').
 * Only the organizer may call this.
 */
export async function cancelEvent({ eventId, userId }: CancelEventParams) {
  const payload = await getPayload({config});

  // Fetch event and verify organizer
  const event = await payload.findByID({ collection: "events", id: eventId, depth: 0 });
  if (!event) throw new Error(`Event ${eventId} not found.`);

  // event.organizer is a relationship
  const organizerId =
    typeof event.organizer === 'string'
      ? event.organizer
      : (event.organizer as any).value || (event.organizer as any).id;
  if (organizerId !== userId) {
    throw new Error("Only the organizer can cancel this event.");
  }

  const updated = await payload.update({
    collection: "events",
    id: eventId,
    data: { status: 'cancelled' },
  });

  revalidatePath(`/events`);
  revalidatePath(`/events/${eventId}`);
  return updated;
}



export async function addEventParticipant({
  eventId,
  userId,
  status = "going",
}: {
  eventId: string
  userId: string
  status?: "interested" | "going" | "not_going"
}) {
  try {
    // Initialize Payload CMS
    const payload = await getPayload({ config })

    // Verify the event exists
    const event = await payload.findByID({
      collection: "events",
      id: eventId,
    })

    if (!event) {
      return {
        success: false,
        error: "Event not found",
      }
    }

    // Verify the user exists
    const user = await payload.findByID({
      collection: "users",
      id: userId,
    })

    if (!user) {
      return {
        success: false,
        error: "User not found",
      }
    }

    // Check if the event is at capacity (only for "going" status)
    if (status === "going" && event.capacity) {
      const { totalDocs: goingCount } = await payload.find({
        collection: "eventRSVPs",
        where: {
          event: { equals: eventId },
          status: { equals: "going" },
        },
      })

      if (goingCount >= event.capacity) {
        return {
          success: false,
          error: "Event is at capacity",
        }
      }
    }

    // Check if the user already has an RSVP for this event
    const { docs: existingRSVPs } = await payload.find({
      collection: "eventRSVPs",
      where: {
        event: { equals: eventId },
        user: { equals: userId },
      },
      limit: 1,
    })

    let rsvp

    if (existingRSVPs[0] && existingRSVPs[0].id) {
      // Update existing RSVP
      rsvp = await payload.update({
        collection: "eventRSVPs",
        id: existingRSVPs[0]?.id,
        data: {
          status,
        },
      })
    } else {
      // Create new RSVP
      rsvp = await payload.create({
        collection: "eventRSVPs",
        data: {
          event: eventId,
          user: userId,
          status,
        },
      })
    }

    // Revalidate relevant paths
    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/profile/${userId}`)
    revalidatePath("/events")

    return {
      success: true,
      rsvp,
    }
  } catch (error) {
    console.error("Error adding event participant:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add participant",
    }
  }
}



  export async function getEventAttendees(eventId: string) {
    try {
      const payload = await getPayload({ config })
  
      // Find all RSVPs for this event where status === 'going'
      const { docs: goingRsvps } = await payload.find({
        collection: "eventRSVPs",
        depth: 2,
        where: {
          event: { equals: eventId },
          status: { equals: "going" },
        },
         // populates the `user` relationship one level deep
      })
  
      // Extract the user objects
      const attendees = goingRsvps
        .map((rsvp) => rsvp.user)
        // rsvp.user may be a string ID or a populated object; normalize:
        .map((user) => (typeof user === "string" ? { id: user } : user))
  
      return {
        success: true,
        attendees,
      }
    } catch (error) {
      console.error("Error fetching event attendees:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch attendees",
        attendees: [],
      }
    }
  }


export async function removeEventParticipant({
  eventId,
  userId,
}: {
  eventId: string
  userId: string
}) {
  try {
    // Initialize Payload CMS
    const payload = await getPayload({ config })

    // Find the RSVP to delete
    const { docs: existingRSVPs } = await payload.find({
      collection: "eventRSVPs",
      where: {
        event: { equals: eventId },
        user: { equals: userId },
      },
      limit: 1,
    })

    if (existingRSVPs.length === 0) {
      return {
        success: false,
        error: "RSVP not found",
      }
    }

    if (existingRSVPs[0] && existingRSVPs[0].id) {
      await payload.delete({
        collection: "eventRSVPs",
        id: existingRSVPs[0].id,
      })
    }

    // Revalidate relevant paths
    revalidatePath(`/events/${eventId}`)
    revalidatePath(`/profile/${userId}`)
    revalidatePath("/events")

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error removing event participant:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove participant",
    }
  }
}


export async function isAttending(eventId: string, userId: string) {
  try {
    const payload = await getPayload({ config })

    // Find all RSVPs for this event where status === 'going'
    const { docs: goingRsvps } = await payload.find({
      collection: "eventRSVPs",
      where: {
        event: { equals: eventId },
        status: { equals: "going" },
      },
    })

    // Check if the user has an RSVP with status "going"
    const isUserAttending = goingRsvps.some(
      (rsvp) =>
        (typeof rsvp.user === "string" && rsvp.user === userId) ||
        (typeof rsvp.user === "object" && rsvp.user?.id === userId),
    )

    return {
      success: true,
      isAttending: isUserAttending,
      participantCount: goingRsvps.length,
    }
  } catch (error) {
    console.error("Error checking attendance:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check attendance",
      isAttending: false,
      participantCount: 0,
    }
  }
}

export async function getUserEventsByCategory(userId: string) {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map(c => `${c.name}=${c.value}`)
    .join('; ')
  try {
    const payload = await getPayload({ config })
    const currentDate = new Date().toISOString()

    // Alternative approach to fetch events created by the user
    let createdEvents: Record<string, any>[] = []
    try {
      // First get all future events (events that haven't ended yet)
      const { docs: allEvents } = await payload.find({
        collection: "events",
        where: {
          or: [
            // Events with endDate in the future
            {
              endDate: {
                greater_than_equal: currentDate
              }
            },
            // Events without endDate but startDate in the future
            {
              and: [
                {
                  endDate: {
                    exists: false
                  }
                },
                {
                  startDate: {
                    greater_than_equal: currentDate
                  }
                }
              ]
            }
          ]
        },
        limit: 100, // Adjust as needed
        depth: 1,
      })

      // Then filter them by user on the client side
      createdEvents = allEvents.filter((event) => {
        // Check different possible creator fields
        return (
          (event.organizer &&
            (event.organizer === userId || (typeof event.organizer === "object" && event.organizer.id === userId))) ||
          (event.creator &&
            (event.creator === userId || (typeof event.creator === "object" && event.creator.id === userId)))
        )
      })
    } catch (error) {
      console.error("Error fetching all events:", error)
    }

    // Fetch RSVPs where the user is participating
    const { docs: userRsvps } = await payload.find({
      collection: "eventRSVPs",
      where: {
        user: { equals: userId },
        status: { equals: "going" },
      },
      depth: 2, // Load event data
    })

    // Extract the events from the RSVPs and filter out any that might be null or past events
    const joinedEvents = userRsvps
      .map((rsvp) =>
        typeof rsvp.event === "string"
          ? null // Skip if event is just an ID string
          : rsvp.event,
      )
      .filter((event) => {
        if (!event) return false
        
        // Filter out past events
        const eventEndDate = event.endDate || event.startDate
        if (eventEndDate) {
          const eventDate = new Date(eventEndDate)
          return eventDate >= new Date()
        }
        
        return true // Include event if no date can be determined
      })

    return {
      success: true,
      createdEvents,
      joinedEvents,
    }
  } catch (error) {
    console.error("Error fetching user events by category:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch user events",
      createdEvents: [],
      joinedEvents: [],
    }
  }
}


export async function searchLocations(query: string) {
  try {
    const payload = await getPayload({ config });

    // Return empty if query is too short
    if (!query || query.trim().length < 2) {
      return { success: true, locations: [] };
    }

    const searchTerm = query.trim();

    // Build an array of properly typed Where clauses
    const clauses: Where[] = [
      { name:        { like: searchTerm } },
      { 'address.street':  { like: searchTerm } },
      { 'address.city':    { like: searchTerm } },
      { 'address.state':   { like: searchTerm } },
      { 'address.zip':     { like: searchTerm } },
      { 'address.country': { like: searchTerm } },
    ];

    const whereClause: Where = { or: clauses };

    // Fetch matching locations
    const result = await payload.find({
      collection: 'locations',
      where: whereClause,
      limit: 10,
      depth: 1,
    });

    // Process results
    const locations = result.docs.map(loc => {
      const addressParts = [
        loc.address?.street,
        loc.address?.city,
        loc.address?.state,
        loc.address?.zip,
        loc.address?.country,
      ].filter(Boolean);

      const formattedAddress = addressParts.join(', ');
      const { latitude = null, longitude = null } = loc.coordinates || {};

      return {
        id: loc.id,
        name: loc.name,
        address: formattedAddress,
        coordinates: { latitude, longitude },
      };
    });

    return { success: true, locations };
  } catch (error: any) {
    console.error('Error searching locations:', error);
    return {
      success: false,
      error: error.message || 'Failed to search locations',
      locations: [],
    };
  }
}



export async function createLocation(data: LocationFormData) {
  try {
    console.log("Creating new location:", data.name)

    // 1. Build full address string for geocoding
    const { street, city, state, zip, country } = data.address
    const fullAddress = [street, city, state, zip, country].filter(Boolean).join(", ")

    console.log(`Geocoding address: ${fullAddress}`)

    // 2. Forward-geocode via Mapbox
    let coordinates = { latitude: 0, longitude: 0 }

    try {
      const mapboxToken = process.env.NEXT_SECRET_MAPBOX_ACCESS_TOKEN

      if (!mapboxToken) {
        throw new Error("Mapbox access token is not configured")
      }

      const geoRes = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
          `${encodeURIComponent(fullAddress)}.json` +
          `?access_token=${mapboxToken}`,
      )

      if (!geoRes.ok) {
        throw new Error(`Mapbox geocoding failed: ${geoRes.status} ${geoRes.statusText}`)
      }

      const geoJson = await geoRes.json()

      if (geoJson.features && geoJson.features.length > 0) {
        const [longitude, latitude] = geoJson.features[0].geometry.coordinates
        coordinates = { latitude, longitude }
        console.log(`Geocoded coordinates: [${latitude}, ${longitude}]`)
      } else {
        console.warn("No geocoding results found for address")
      }
    } catch (geocodeError) {
      console.error("Error during geocoding:", geocodeError)
      // Continue with location creation even if geocoding fails
    }

    // 3. Create the location in Payload CMS
    const payload = await getPayload({ config })

    // Clean and validate data before creating
    const cleanData: any = {
      name: data.name,
      description: data.description || "",
      address: data.address,
      coordinates,
      categories: data.categories || [],  // Include categories
      contactInfo: data.contactInfo || {},
      businessHours: data.businessHours || [],
      accessibility: data.accessibility || {},
      status: 'review', // Set as review by default for new locations
    }

    // Remove featuredImage if it's a blob URL or invalid ObjectId
    if (data.featuredImage && (
      typeof data.featuredImage !== 'string' || 
      data.featuredImage.startsWith('blob:') ||
      data.featuredImage.length !== 24 || 
      !/^[0-9a-fA-F]{24}$/.test(data.featuredImage)
    )) {
      // Don't include featuredImage
    } else if (data.featuredImage) {
      cleanData.featuredImage = data.featuredImage;
    }

    // Validate category IDs
    if (cleanData.categories && Array.isArray(cleanData.categories)) {
      cleanData.categories = cleanData.categories.filter((id: string) => 
        id && typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)
      );
      if (cleanData.categories.length === 0) {
        delete cleanData.categories;
      }
    }

    // Validate createdBy if present
    if (data.createdBy && (
      typeof data.createdBy !== 'string' || 
      data.createdBy.length !== 24 || 
      !/^[0-9a-fA-F]{24}$/.test(data.createdBy)
    )) {
      // Don't include createdBy
    } else if (data.createdBy) {
      cleanData.createdBy = data.createdBy;
    }

    const locationData = cleanData

    console.log("Creating location in Payload CMS")

    const created = await payload.create({
      collection: "locations",
      data: locationData,
    })

    console.log(`Location created successfully: ${created.id}`)

    // Format the address for the response
    let formattedAddress = ""
    if (created.address) {
      const addressParts = [
        created.address.street,
        created.address.city,
        created.address.state,
        created.address.zip,
        created.address.country,
      ].filter(Boolean)
      formattedAddress = addressParts.join(", ")
    }

    // Revalidate paths that might display locations
    revalidatePath("/events")
    revalidatePath("/locations")

    return {
      success: true,
      location: {
        id: created.id,
        name: created.name,
        address: formattedAddress,
        coordinates: created.coordinates,
      },
    }
  } catch (error) {
    console.error("Error creating location:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create location",
    }
  }
}

export async function getSavedGemJourneys() {
  const user = await getAuthenticatedUserForServerActions()
  if (!user) return []

  const payload = await getPayload({ config })
  const dbUser = await payload.findByID({ collection: 'users', id: user.id, depth: 0 })
  const savedJourneyIds = Array.isArray(dbUser.savedGemJourneys)
    ? dbUser.savedGemJourneys.map((j: any) => typeof j === 'string' ? j : j.id || j._id)
    : []

  if (!savedJourneyIds.length) return []

  const journeys = await payload.find({
    collection: 'journeys',
    where: { id: { in: savedJourneyIds } },
    depth: 2,
    limit: 100,
  })

  return journeys.docs
}

export async function saveGemJourney(journeyId: string) {
  const user = await getAuthenticatedUserForServerActions()
  if (!user) return { success: false, error: 'Unauthorized' }
  const payload = await getPayload({ config })
  const dbUser = await payload.findByID({ collection: 'users', id: user.id, depth: 0 })
  const savedJourneyIds = Array.isArray(dbUser.savedGemJourneys)
    ? dbUser.savedGemJourneys.map((j: any) => typeof j === 'string' ? j : j.id || j._id)
    : []
  if (savedJourneyIds.includes(journeyId)) return { success: true }
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { savedGemJourneys: [...savedJourneyIds, journeyId] }
  })
  return { success: true }
}

export async function unsaveGemJourney(journeyId: string) {
  const user = await getAuthenticatedUserForServerActions()
  if (!user) return { success: false, error: 'Unauthorized' }
  const payload = await getPayload({ config })
  const dbUser = await payload.findByID({ collection: 'users', id: user.id, depth: 0 })
  const savedJourneyIds = Array.isArray(dbUser.savedGemJourneys)
    ? dbUser.savedGemJourneys.map((j: any) => typeof j === 'string' ? j : j.id || j._id)
    : []
  if (!savedJourneyIds.includes(journeyId)) return { success: true }
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { savedGemJourneys: savedJourneyIds.filter((id: string) => id !== journeyId) }
  })
  return { success: true }
}

// Search Functions
export async function searchUsers(query: string, currentUserId?: string, limit = 10) {
  try {
    const payload = await getPayload({ config })
    
    const { docs: users } = await payload.find({
      collection: 'users',
      where: {
        or: [
          {
            name: {
              contains: query,
            },
          },
          {
            email: {
              contains: query,
            },
          },
          {
            username: {
              contains: query,
            },
          },
        ],
      },
      limit,
      depth: 1,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        profileImage: true,
        bio: true,
        followers: true,
        isVerified: true,
        lastSeen: true,
        location: true,
      },
    })
    
    // Filter out current user
    const filteredUsers = users.filter(user => user.id !== currentUserId)
    
    return filteredUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      avatar: (user.profileImage as any)?.url || undefined,
      bio: user.bio,
      profileImage: (user.profileImage as any)?.url,
      followerCount: Array.isArray(user.followers) ? user.followers.length : 0,
      isVerified: user.isVerified || false,
      isFollowing: false, // This would need to be calculated based on current user
      lastActiveAt: user.lastSeen,
      location: user.location
    }))
  } catch (error) {
    console.error('Error searching users:', error)
    return []
  }
}

export async function searchLocationsAction(query: string, limit = 10) {
  try {
    const payload = await getPayload({ config })
    
    const { docs: locations } = await payload.find({
      collection: 'locations',
      where: {
        or: [
          {
            name: {
              contains: query,
            },
          },
          {
            description: {
              contains: query,
            },
          },
          {
            'address.city': {
              contains: query,
            },
          },
        ],
        status: { equals: 'published' },
      },
      limit,
      depth: 1,
    })
    
    return locations.map(location => ({
      id: location.id,
      name: location.name,
      description: location.description,
      address: location.address,
      coordinates: location.coordinates,
      featuredImage: location.featuredImage,
      categories: location.categories,
    }))
  } catch (error) {
    console.error('Error searching locations:', error)
    return []
  }
}

export async function searchEventsAction(query: string, limit = 10) {
  try {
    const payload = await getPayload({ config })
    
    const { docs: events } = await payload.find({
      collection: 'events',
      where: {
        or: [
          {
            name: {
              contains: query,
            },
          },
          {
            description: {
              contains: query,
            },
          },
        ],
        status: { equals: 'published' },
      },
      limit,
      depth: 1,
    })
    
    return events.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      date: event.date,
      location: event.location,
      featuredImage: event.featuredImage,
      categories: event.categories,
    }))
  } catch (error) {
    console.error('Error searching events:', error)
    return []
  }
}

export async function inviteUserToEvent(eventId: string, inviteeId: string) {
  try {
    const payload = await getPayload({ config })
    const user = await getAuthenticatedUserForServerActions()
    
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Get the event
    const event = await payload.findByID({
      collection: 'events',
      id: eventId,
    })

    if (!event) {
      return { success: false, error: 'Event not found' }
    }

    // Check if user is the event organizer
    const organizerId = typeof event.organizer === 'string' ? event.organizer : event.organizer?.id
    if (user.id !== organizerId) {
      return { success: false, error: 'Only event organizers can invite users' }
    }

    // Check if user is already invited or attending
    const existingRSVPs = await payload.find({
      collection: 'eventRSVPs',
      where: {
        and: [
          { event: { equals: eventId } },
          { user: { equals: inviteeId } }
        ]
      }
    })

    console.log('Existing RSVPs for user:', existingRSVPs.docs.length, existingRSVPs.docs)

    let rsvp;
    if (existingRSVPs.docs.length > 0) {
      const existing = existingRSVPs.docs[0];
      console.log('Existing RSVP status:', existing?.status)
      
      // If user is already going or interested, they can't be invited again
      if (existing?.status === "going") {
        return { success: false, error: 'User is already attending this event' }
      } else if (existing?.status === "interested") {
        return { success: false, error: 'User is already interested in this event' }
      } else if (existing?.status === "invited") {
        return { success: false, error: 'User has already been invited to this event' }
      } else if (existing?.status === "not_going") {
        // Update RSVP to invited
        console.log('Updating existing RSVP from not_going to invited')
        rsvp = await payload.update({
          collection: 'eventRSVPs',
          id: existing.id,
          data: {
            status: 'invited',
            invitedBy: user.id,
            invitedAt: new Date().toISOString(),
          }
        })
      } else {
        // For any other status, update to invited
        console.log('Updating existing RSVP to invited')
        if (existing && existing.id) {
        rsvp = await payload.update({
          collection: 'eventRSVPs',
          id: existing?.id,
          data: {
            status: 'invited',
            invitedBy: user.id,
            invitedAt: new Date().toISOString(),
          }
        })
      }
    }
    } else {
      // Create RSVP with 'invited' status
      console.log('Creating new RSVP with invited status')
      rsvp = await payload.create({
        collection: 'eventRSVPs',
        data: {
          event: eventId,
          user: inviteeId,
          status: 'invited',
          invitedBy: user.id,
          invitedAt: new Date().toISOString(),
        }
      })
    }

    // Get invitee details for notification
    const invitee = await payload.findByID({
      collection: 'users',
      id: inviteeId,
    })

    // Create notification for the invitee
    await payload.create({
      collection: 'notifications',
      data: {
        recipient: inviteeId,
        type: 'event_invitation',
        title: `You're invited to ${event.name}`,
        message: `${user.name} has invited you to attend "${event.name}" on ${new Date(event.startDate).toLocaleDateString()}.`,
        relatedTo: {
          relationTo: 'events',
          value: eventId,
        },
        actionBy: user.id,
        metadata: {
          eventName: event.name,
          eventDate: event.startDate,
          organizerName: user.name,
        },
        priority: 'normal',
        read: false,
      },
    })

    return {
      success: true,
      message: `Successfully invited ${invitee?.name || 'user'} to the event`,
      rsvp: rsvp,
    }
  } catch (error) {
    console.error('Error inviting user to event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to invite user',
    }
  }
}