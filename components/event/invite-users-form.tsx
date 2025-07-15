"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, UserPlus, X, Users, Mail } from "lucide-react"
import { searchUsers } from "@/app/(frontend)/events/actions"
import { inviteUserToEvent } from "@/app/(frontend)/events/actions"
import { toast } from "sonner"

interface User {
  id: string
  name: string
  email: string
  username?: string
  avatar?: string
  bio?: string
}

interface InviteUsersFormProps {
  eventId: string
  eventName: string
  onInvited?: () => void
  currentUserId?: string
}

export default function InviteUsersForm({ 
  eventId, 
  eventName, 
  onInvited,
  currentUserId 
}: InviteUsersFormProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [invitedUsers, setInvitedUsers] = useState<User[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  // Search users
  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      toast.error("Please enter at least 2 characters to search")
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const users = await searchUsers(searchQuery, currentUserId, 10)
      setSearchResults(users as User[])
    } catch (error) {
      console.error("Error searching users:", error)
      toast.error("Failed to search users")
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (e.target.value.trim().length === 0) {
      setSearchResults([])
      setHasSearched(false)
    }
  }

  // Handle key press in search input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSearch()
    }
  }

  // Invite user
  const handleInvite = async (user: User) => {
    setIsInviting(true)

    try {
      const result = await inviteUserToEvent(eventId, user.id)

      if (result.success) {
        toast.success(`Invited ${user.name} to ${eventName}`)
        setInvitedUsers(prev => [...prev, user])
        setSearchResults(prev => prev.filter(u => u.id !== user.id))
        onInvited?.()
      } else {
        throw new Error(result.error || "Failed to invite user")
      }
    } catch (error) {
      console.error("Error inviting user:", error)
      toast.error(error instanceof Error ? error.message : "Failed to invite user")
    } finally {
      setIsInviting(false)
    }
  }

  // Remove from invited list
  const handleRemoveInvited = (userId: string) => {
    setInvitedUsers(prev => prev.filter(user => user.id !== userId))
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite People to {eventName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search users by name, email, or username..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || searchQuery.trim().length < 2}
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>
          </div>

          {/* Search Results */}
          {hasSearched && !isSearching && (
            <div className="space-y-2">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">
                    Found {searchResults.length} user{searchResults.length !== 1 ? "s" : ""}
                  </p>
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {user.avatar ? (
                            <AvatarImage src={user.avatar} alt={user.name} />
                          ) : (
                            <AvatarFallback>
                              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {user.username && (
                              <span>@{user.username}</span>
                            )}
                            {user.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </span>
                            )}
                          </div>
                          {user.bio && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleInvite(user)}
                        disabled={isInviting}
                        className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90"
                      >
                        {isInviting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Invite"
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">
                    No users found for "{searchQuery}"
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Try searching with a different name or email
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invited Users Section */}
      {invitedUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600" />
              Recently Invited ({invitedUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.name} />
                      ) : (
                        <AvatarFallback>
                          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                      Invited
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveInvited(user.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 