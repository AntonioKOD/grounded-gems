import type { User } from "./feed"

export type NotificationType = "follow" | "like" | "comment" | "mention" | "reminder" | "event_update" | 'event'

export interface Notification {
  id: string
  recipient: string | User
  type: NotificationType
  title: string
  message?: string
  relatedTo?: {
    id?: string
    value?: string
    relationTo?: "posts" | "comments" | "users" | "locations" | "events" | "journeys"
    collection?: string
  }
  read: boolean
  createdAt: string
  // Journey invite fields (optional)
  inviteStatus?: 'pending' | 'accepted' | 'declined'
  journeyTitle?: string
  journeyOwner?: string
}
