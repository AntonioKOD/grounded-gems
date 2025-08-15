import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'

interface UseFollowProps {
  profileUserId: string
  currentUserId?: string
  initialIsFollowing: boolean
  onFollowStateChange?: (isFollowing: boolean) => void
  onFollowersUpdate?: (followers: any[] | ((prev: any[]) => any[])) => void
  onProfileUpdate?: (updater: (prev: any) => any) => void
}

export function useFollow({
  profileUserId,
  currentUserId,
  initialIsFollowing,
  onFollowStateChange,
  onFollowersUpdate,
  onProfileUpdate
}: UseFollowProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isProcessing, setIsProcessing] = useState(false)
  const lastActionRef = useRef<number>(0)

  // Helper function to normalize user ID for comparison
  const normalizeId = (id: any): string => {
    if (typeof id === 'string') return id
    if (id && typeof id === 'object' && id.id) return String(id.id)
    return String(id)
  }

  const handleFollowToggle = useCallback(async () => {
    if (isProcessing || !currentUserId) return

    // Prevent self-following
    if (profileUserId === currentUserId) {
      toast.error("You cannot follow yourself")
      return
    }

    // Rate limit follow actions to prevent spam
    const now = Date.now()
    const timeSinceLastAction = now - lastActionRef.current
    if (timeSinceLastAction < 500) {
      toast.error("Please wait before performing another follow action")
      return
    }

    setIsProcessing(true)
    lastActionRef.current = now

    try {
      console.log(`${isFollowing ? 'Unfollowing' : 'Following'} user:`, profileUserId)
      
      const response = await fetch('/api/users/follow', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId: profileUserId }),
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update local state immediately
        const newFollowingState = !isFollowing
        setIsFollowing(newFollowingState)
        
        // Call the callback to update parent component
        onFollowStateChange?.(newFollowingState)
        
        // Show success message
        toast.success(
          newFollowingState 
            ? `Now following user` 
            : `Unfollowed user`
        )

        // Clear cache for both users to ensure fresh data
        if (typeof globalThis !== 'undefined' && globalThis._followCache) {
          globalThis._followCache.delete(`followers-${profileUserId}`)
          globalThis._followCache.delete(`following-${profileUserId}`)
          globalThis._followCache.delete(`followers-${currentUserId}`)
          globalThis._followCache.delete(`following-${currentUserId}`)
          console.log('🗑️ Cleared follow cache for both users')
        }

        // Update followers list immediately
        if (onFollowersUpdate) {
          if (newFollowingState) {
            // Add current user to followers list
            const newFollower = {
              id: currentUserId,
              name: 'Current User', // This will be updated when data is refreshed
              username: 'user',
              email: '',
              profileImage: null,
              bio: '',
              isVerified: false,
              followerCount: 0
            }
            onFollowersUpdate((prev: any[]) => [newFollower, ...(Array.isArray(prev) ? prev : [])])
          } else {
            // Remove current user from followers list
            onFollowersUpdate((prev: any[]) => 
              Array.isArray(prev) ? prev.filter(follower => {
                const followerId = normalizeId(follower.id || follower)
                const currentId = normalizeId(currentUserId)
                return followerId !== currentId
              }) : []
            )
          }
        }

        // Update profile follower count immediately
        if (onProfileUpdate) {
          onProfileUpdate((prev: any) => prev ? {
            ...prev,
            followerCount: Math.max(0, (prev.followerCount || 0) + (newFollowingState ? 1 : -1))
          } : prev)
        }

        // Add haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }

        // Force refresh data after a delay to ensure server has recorded the action
        setTimeout(async () => {
          try {
            // Refresh profile data
            const refreshResponse = await fetch(`/api/users/${profileUserId}/profile`, {
              credentials: 'include',
            })
            
            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json()
              if (refreshData.success && refreshData.user && onProfileUpdate) {
                onProfileUpdate(() => refreshData.user)
              }
            }

            // Refresh followers list
            const followersResponse = await fetch(`/api/users/${profileUserId}/followers`, {
              credentials: 'include',
            })
            
            if (followersResponse.ok) {
              const followersData = await followersResponse.json()
              if (followersData.success && Array.isArray(followersData.followers) && onFollowersUpdate) {
                onFollowersUpdate(followersData.followers)
                
                // Update following state based on refreshed data
                if (currentUserId) {
                  const currentId = normalizeId(currentUserId)
                  const isUserFollowing = followersData.followers.some((follower: any) => {
                    const followerId = normalizeId(follower.id || follower)
                    return followerId === currentId
                  })
                  
                  if (isFollowing !== isUserFollowing) {
                    setIsFollowing(isUserFollowing)
                    onFollowStateChange?.(isUserFollowing)
                  }
                }
              }
            }
          } catch (refreshError) {
            console.error('Error refreshing data after follow action:', refreshError)
          }
        }, 1000)

      } else {
        const errorData = await response.json()
        
        if (errorData.error === 'Already following this user') {
          // User is already following, update state to reflect this
          setIsFollowing(true)
          onFollowStateChange?.(true)
          toast.info("You are already following this user")
          
          // Clear cache and refresh data to ensure consistency
          if (typeof globalThis !== 'undefined' && globalThis._followCache) {
            globalThis._followCache.delete(`followers-${profileUserId}`)
            globalThis._followCache.delete(`following-${profileUserId}`)
            globalThis._followCache.delete(`followers-${currentUserId}`)
            globalThis._followCache.delete(`following-${currentUserId}`)
          }
        } else {
          throw new Error(errorData.error || `Failed to ${isFollowing ? 'unfollow' : 'follow'}`)
        }
      }
    } catch (error: any) {
      console.error("Error toggling follow:", error)
      
      // Handle specific error types
      if (error.message === 'Users cannot follow themselves') {
        toast.error("You cannot follow yourself")
      } else if (error.message?.includes('429')) {
        toast.error("Too many requests. Please wait a moment before trying again.")
      } else if (error.message?.includes('Rate limit')) {
        toast.error("Please wait before performing another action")
      } else {
        toast.error("Failed to update follow status")
      }
    } finally {
      // Add delay before re-enabling button
      setTimeout(() => {
        setIsProcessing(false)
      }, 300)
    }
  }, [
    isFollowing,
    isProcessing,
    profileUserId,
    currentUserId,
    onFollowStateChange,
    onFollowersUpdate,
    onProfileUpdate
  ])

  return {
    isFollowing,
    setIsFollowing,
    isProcessing,
    handleFollowToggle
  }
}
