import type { User } from "./feed"

export type NotificationType = "follow" | "like" | "comment" | "mention" | "reminder" | "event_update" | 'event'

export interface Notification {
  id: string
  recipient: string | User
  type: NotificationType
  title: string
  message?: string
  relatedTo?: {
    id: string
    collection: "posts" | "comments" | "users" | "locations" | 'events'
  }
  read: boolean
  createdAt: string
}
