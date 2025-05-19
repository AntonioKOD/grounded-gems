import { User } from "./user"

export type RSVPStatus = "going" | "maybe" | "not_going" | "invited" | "waitlist"

export interface EventRSVP {
  id: string
  event: {
    id: string
    name: string
  }
  user: {
    id: string
    name: string
    avatar?: string
  }
  status: RSVPStatus
  createdAt: string
  updatedAt?: string
  responseMessage?: string
  checkInTime?: string
  checkInCode?: string
  isCheckedIn?: boolean
  invitedBy?: Partial<User>
  plusOneCount?: number
  plusOneNames?: string[]
}

export interface EventRSVPFormData {
  status: RSVPStatus
  responseMessage?: string
  plusOneCount?: number
  plusOneNames?: string[]
}
