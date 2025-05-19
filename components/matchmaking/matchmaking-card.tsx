/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, Clock, Trophy } from 'lucide-react'
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface MatchmakingSession {
  id: string
  title: string
  description: string
  sportType: string
  skillLevel: string
  location: {
    id: string
    name: string
  }
  timeWindow: {
    start: string
    end: string
  }
  minPlayers: number
  maxPlayers: number
  participants: {
    id: string
    name: string
  }[]
  status: string
  organizer: {
    id: string
    name: string
  }
}

interface MatchmakingCardProps {
  session: MatchmakingSession
}

export function MatchmakingCard({ session }: MatchmakingCardProps) {
  const [joining, setJoining] = useState(false)
  
  const sportTypeColors = {
    tennis: "bg-green-100 text-green-800",
    soccer: "bg-blue-100 text-blue-800",
    basketball: "bg-orange-100 text-orange-800",
  }
  
  const skillLevelColors = {
    beginner: "bg-blue-100 text-blue-800",
    intermediate: "bg-yellow-100 text-yellow-800",
    advanced: "bg-red-100 text-red-800",
  }
  
  const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    open: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-purple-100 text-purple-800",
    cancelled: "bg-red-100 text-red-800",
  }
  
  const handleJoin = async () => {
    try {
      setJoining(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success("Successfully joined the matchmaking session!")
    } catch (error) {
      toast.error("Failed to join the session. Please try again.")
    } finally {
      setJoining(false)
    }
  }
  
  const startDate = new Date(session.timeWindow.start)
  const isFull = session.participants.length >= session.maxPlayers
  const spotsLeft = session.maxPlayers - session.participants.length
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <Badge className={sportTypeColors[session.sportType as keyof typeof sportTypeColors] || "bg-gray-100"}>
            {session.sportType.charAt(0).toUpperCase() + session.sportType.slice(1)}
          </Badge>
          <Badge className={statusColors[session.status as keyof typeof statusColors] || "bg-gray-100"}>
            {session.status.replace('_', ' ').charAt(0).toUpperCase() + session.status.replace('_', ' ').slice(1)}
          </Badge>
        </div>
        <Link href={`/matchmaking/${session.id}`} className="hover:underline">
          <h3 className="text-lg font-semibold mt-2">{session.title}</h3>
        </Link>
        <div className="flex items-center text-sm text-muted-foreground">
          <Trophy className="h-4 w-4 mr-1" />
          <span className="capitalize">
            {session.skillLevel} Level
          </span>
          <Badge className={`ml-2 ${skillLevelColors[session.skillLevel as keyof typeof skillLevelColors] || "bg-gray-100"}`}>
            {session.skillLevel}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {session.description}
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>
              {formatDistanceToNow(startDate, { addSuffix: true })}
            </span>
          </div>
          
          <div className="flex items-center text-sm">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{session.location.name}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>
              {session.participants.length} / {session.maxPlayers} participants
            </span>
          </div>
          
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>
              {session.minPlayers}-{session.maxPlayers} players needed
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        {session.status === "open" ? (
          <Button 
            className="w-full" 
            onClick={handleJoin} 
            disabled={joining || isFull}
          >
            {joining ? "Joining..." : isFull ? "Session Full" : `Join (${spotsLeft} spots left)`}
          </Button>
        ) : (
          <Button asChild variant="secondary" className="w-full">
            <Link href={`/matchmaking/${session.id}`}>View Details</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
