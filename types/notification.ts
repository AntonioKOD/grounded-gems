import type { User } from "./feed"

export type NotificationType = "follow" | "like" | "comment" | "mention" | "reminder" | "event_update"

export interface Notification {
  id: string
  recipient: string | User
  type: NotificationType
  title: string
  message?: string
  relatedTo?: {
    id: string
    collection: "posts" | "comments" | "users" | "locations"
  }
  read: boolean
  createdAt: string
}
