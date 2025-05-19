import type { User } from "./user"
import type { Location } from "./location"

export type TimeWindow = {
  start: string
  end: string
}

export type AgeRange = {
  min: number
  max: number
}

export type Availability = {
  day: string
  timeSlot: string
}

export type Preferences = {
  ageRange?: AgeRange
  gender?: "any" | "male" | "female"
  availability?: Availability[]
}

export type MatchedGroup = {
  group: {
    user: User
  }[]
}

export type MatchmakingSession = {
  id: string
  title: string
  description?: string
  sportType: string
  skillLevel: "beginner" | "intermediate" | "advanced"
  location: Location
  virtualUrl?: string
  timeWindow: TimeWindow
  minPlayers: number
  maxPlayers: number
  participants?: User[]
  preferences?: Preferences
  autoMatch: boolean
  matchedGroups?: MatchedGroup[]
  organizer: User
  status: "draft" | "open" | "in_progress" | "completed" | "cancelled"
  createdAt: string
  updatedAt: string
}

export type MatchmakingFilter = {
  sportType?: string
  skillLevel?: string
  status?: string
  timeFrame?: string
}
