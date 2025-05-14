/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { Users, UserCheck, MapPin, Star, Award, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { formatDistanceToNow } from "date-fns"

interface UserStatsProps {
  userId: string
  followers: any[]
  following: any[]
  joinDate: string
  postCount: number
  reviewCount: number
  recommendationCount: number
  averageRating?: number
  className?: string
}

export function UserStats({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId,
  followers,
  following,
  joinDate,
  postCount,
  reviewCount,
  recommendationCount,
  averageRating,
  className = "",
}: UserStatsProps) {
  const [activeTab, setActiveTab] = useState("stats")

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <Card className={className}>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{postCount + reviewCount + recommendationCount}</div>
                <div className="text-sm text-muted-foreground">Total Posts</div>
              </div>

              <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{followers.length}</div>
                <div className="text-sm text-muted-foreground">Followers</div>
              </div>

              <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{reviewCount}</div>
                <div className="text-sm text-muted-foreground">Reviews</div>
              </div>

              <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{recommendationCount}</div>
                <div className="text-sm text-muted-foreground">Recommendations</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm">Joined {formatDistanceToNow(new Date(joinDate), { addSuffix: true })}</span>
              </div>

              {averageRating && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-2 text-yellow-500" />
                  <span className="text-sm">{averageRating.toFixed(1)} average rating on reviews</span>
                </div>
              )}

              <div className="flex items-center">
                <Award className="h-4 w-4 mr-2 text-[#FF6B6B]" />
                <span className="text-sm">{reviewCount > 10 ? "Expert Reviewer" : "Community Contributor"}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="followers" className="p-4">
            <div className="space-y-4">
              {followers.length > 0 ? (
                followers.map((follower) => (
                  <div key={follower.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={follower.avatar || "/placeholder.svg"} alt={follower.name} />
                        <AvatarFallback>{getInitials(follower.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{follower.name}</div>
                        {follower.location && (
                          <div className="text-xs text-muted-foreground flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {follower.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Follower
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No followers yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="following" className="p-4">
            <div className="space-y-4">
              {following.length > 0 ? (
                following.map((follow) => (
                  <div key={follow.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={follow.avatar || "/placeholder.svg"} alt={follow.name} />
                        <AvatarFallback>{getInitials(follow.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{follow.name}</div>
                        {follow.location && (
                          <div className="text-xs text-muted-foreground flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {follow.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Following
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Not following anyone yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
