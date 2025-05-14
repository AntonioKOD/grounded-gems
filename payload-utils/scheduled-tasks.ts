import type { Payload } from "payload"

/**
 * Sends event reminder notifications
 * This should be called by a cron job or scheduler
 */
export async function sendEventReminders(payload: Payload) {
  try {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Format dates for query
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString()
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString()

    // Find events happening tomorrow
    const { docs: upcomingEvents } = await payload.find({
      collection: "events",
      where: {
        startDate: {
          greater_than_equal: tomorrowStart,
          less_than_equal: tomorrowEnd,
        },
        status: {
          equals: "published",
        },
      },
    })

    // For each event, find users who are going and send reminders
    for (const event of upcomingEvents) {
      // Find RSVPs for this event
      const { docs: rsvps } = await payload.find({
        collection: "eventRSVPs",
        where: {
          event: { equals: event.id },
          status: { equals: "going" }, // Only remind users who confirmed they're going
        },
      })

      // Send reminder notifications
      for (const rsvp of rsvps) {
        await payload.create({
          collection: "notifications",
          data: {
            recipient: rsvp.user,
            type: "reminder",
            title: `Reminder: ${event.name} is tomorrow`,
            message: `Don't forget! The event starts at ${new Date(event.startDate).toLocaleTimeString()}.`,
            relatedTo: {
              relationTo: "events",
              value: event.id,
            },
            read: false,
            createdAt: new Date().toISOString(),
          },
        })
      }
    }

    console.log(`Sent reminders for ${upcomingEvents.length} events`)
  } catch (error) {
    console.error("Error sending event reminders:", error)
  }
}
