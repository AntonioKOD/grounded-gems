/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Edit, ImageIcon, Plus } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import CreatePostForm from "./create-post-form"

interface CollapsiblePostFormProps {
  user: {
    id: string
    name: string
    avatar?: string
  }
  className?: string
  onSuccess?: () => void
}

export default function CollapsiblePostForm({ user, className = "" }: CollapsiblePostFormProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [quickText, setQuickText] = useState("")

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const handleExpandForm = () => {
    setIsExpanded(true)
  }

  const handleCollapseForm = () => {
    setIsExpanded(false)
    setQuickText("")
  }

  return (
    <div className={className}>
      {!isExpanded ? (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div
                className="flex-1 bg-muted/30 hover:bg-muted/50 rounded-full px-4 py-2.5 text-muted-foreground cursor-pointer transition-colors"
                onClick={handleExpandForm}
              >
                What&apos;s on your mind, {user.name.split(" ")[0]}?
              </div>
            </div>

            <div className="mt-3 pt-3 border-t flex gap-2 justify-between">
              <Button
                variant="ghost"
                className="flex-1 justify-center text-muted-foreground hover:text-foreground hover:bg-muted/20"
                onClick={handleExpandForm}
              >
                <Edit className="h-4 w-4 mr-2" />
                Post
              </Button>
              <Button
                variant="ghost"
                className="flex-1 justify-center text-muted-foreground hover:text-foreground hover:bg-muted/20"
                onClick={handleExpandForm}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Photo
              </Button>
              <Button
                variant="ghost"
                className="flex-1 justify-center text-muted-foreground hover:text-foreground hover:bg-muted/20"
                onClick={handleExpandForm}
              >
                <Plus className="h-4 w-4 mr-2" />
                More
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md">
          <CardContent className="p-4 pb-0">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-lg">Create Post</h3>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleCollapseForm}>
                <ChevronUp className="h-5 w-5" />
              </Button>
            </div>
            <Separator className="mb-4" />

            <div className="flex gap-3 mb-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.name}</p>
                <Button variant="outline" size="sm" className="mt-1 h-6 text-xs gap-1 rounded-full">
                  Public <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <CreatePostForm/>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
