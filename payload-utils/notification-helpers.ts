import type { Payload } from "payload"

/**
 * Creates a notification in the database
 */
export async function createNotification({
  payload,
  recipient,
  type,
  title,
  message,
  relatedTo,
}: {
  payload: Payload
  recipient: string
  type: "follow" | "like" | "comment" | "mention" | "reminder" | "event_update"
  title: string
  message?: string
  relatedTo?: {
    id: string
    collection: "posts" | "comments" | "users" | "locations" | "events" | "specials"
  }
}) {
  try {
    await payload.create({
      collection: "notifications",
      data: {
        recipient,
        type,
        title,
        message,
        relatedTo: relatedTo
          ? {
              relationTo: relatedTo.collection,
              value: relatedTo.id,
            }
          : undefined,
        read: false,
        createdAt: new Date().toISOString(),
      },
    })
    console.log(`Created ${type} notification for user ${recipient}`)
  } catch (error) {
    console.error("Error creating notification:", error)
  }
}

/**
 * Extracts mentions from text content
 */
export function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g
  const matches = content.match(mentionRegex) || []
  return matches.map((match) => match.substring(1)) // Remove the @ symbol
}

/**
 * Finds user IDs from usernames
 */
export async function findUserIdsByUsernames(payload: Payload, usernames: string[]): Promise<string[]> {
  if (!usernames.length) return []

  try {
    const { docs } = await payload.find({
      collection: "users",
      where: {
        name: {
          in: usernames,
        },
      },
      limit: usernames.length,
    })

    return docs.map((user) => String(user.id))
  } catch (error) {
    console.error("Error finding users by usernames:", error)
    return []
  }
}
