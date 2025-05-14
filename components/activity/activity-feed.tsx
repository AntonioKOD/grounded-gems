"use client"

import { useState, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { Loader2, Heart, MessageCircle, UserPlus, Award, MapPin } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

interface ActivityItem {
  id: string
  type: "like" | "comment" | "follow" | "post" | "review" | "achievement"
  actor: {
    id: string
    name: string
    avatar?: string
  }
  target?: {
    id: string
    type: string
    title?: string
  }
  createdAt: string
}

interface ActivityFeedProps {
  userId?: string
  limit?: number
}

export default function ActivityFeed({ userId, limit = 5 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true)
      try {
        // In a real app, you would fetch from an API
        // const response = await fetch(`/api/activities?userId=${userId}&limit=${limit}`)
        // const data = await response.json()
        // setActivities(data.activities)
        
        // For now, use mock data
        setTimeout(() => {
          setActivities(generateMockActivities(userId, limit))
          setIsLoading(false)
        }, 500)
      } catch (error) {
        console.error("Error fetching activities:", error)
        setActivities([])
        setIsLoading(false)
      }
    }

    fetchActivities()
  }, [userId, limit])

  // Generate mock activities
  const generateMockActivities = (userId?: string, limit = 5): ActivityItem[] => {
    const activityTypes = ["like", "comment", "follow", "post", "review", "achievement"] as const
    const names = ["Alex Johnson", "Jamie Smith", "Taylor Wilson", "Jordan Lee", "Casey Brown"]
    
    return Array.from({ length: limit }).map((_, i) => {
      const type = activityTypes[Math.floor(Math.random() * activityTypes.length)]
      const isOwnActivity = Math.random() > 0.5
      
      return {
        id: `activity_${i}`,
        type,
        actor: {
          id: isOwnActivity && userId ? userId : `user_${i}`,
          name: isOwnActivity && userId ? "You" : names[Math.floor(Math.random() * names.length)],
          avatar: `/diverse-avatars.png`,
        },
        target: type !== "achievement" ? {
          id: `target_${i}`,
          type: type === "follow" ? "user" : "post",
          title: type === "follow" ? undefined : "Example post title",
        } : undefined,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
      }
    })
  }

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-4 w-4 text-red-500" />
      case "comment":
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      case "follow":
        return <UserPlus className="h-4 w-4 text-green-500" />
      case "post":
        return <MapPin className="h-4 w-4 text-purple-500" />
      case "review":
        return <MapPin className="h-4 w-4 text-amber-500" />
      case "achievement":
        return <Award className="h-4 w-4 text-yellow-500" />
      default:
        return null
    }
  }

  // Get activity text
  const getActivityText = (activity: ActivityItem) => {
    const { type, actor, target } = activity
    
    switch (type) {
      case "like":
        return (
          <>
            <span className="font-medium">{actor.name}</span> liked{" "}
            {target?.type === "post" ? (
              <>
                a <span className="text-gray-600">post</span>
              </>
            ) : (
              "something"
            )}
          </>
        )
      case "comment":
        return (
          <>
            <span className="font-medium">{actor.name}</span> commented on{" "}
            {target?.type === "post" ? (
              <>
                a <span className="text-gray-600">post</span>
              </>
            ) : (
              "something"
            )}
          </>
        )
      case "follow":
        return (
          <>
            <span className="font-medium">{actor.name}</span> started following{" "}
            {target?.type === "user" ? "you" : "someone"}
          </>
        )
      case "post":
        return (
          <>
            <span className="font-medium">{actor.name}</span> created a new post
          </>
        )
      case "review":
        return (
          <>
            <span className="font-medium">{actor.name}</span> wrote a review
          </>
        )
      case "achievement":
        return (
          <>
            <span className="font-medium">{actor.name}</span> earned a new achievement
          </>
        )
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (activities.length === 0) {
    return <p className="text-center text-muted-foreground py-4">No recent activity</p>
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={activity.id}>
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={activity.actor.avatar || "/placeholder.svg"} alt={activity.actor.name} />
              <AvatarFallback>
                {activity.actor.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <p className="text-sm">{getActivityText(activity)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
            <div className="mt-1">{getActivityIcon(activity.type)}</div>
          </div>
          {index < activities.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </div>
  )
}
