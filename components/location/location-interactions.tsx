'use client'

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { Heart, Bookmark, MapPin, Share2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { optimizedFetch, debounce } from '@/lib/api-cache'

interface Address {
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
}

interface Coordinates {
  latitude?: number
  longitude?: number
}

interface Location {
  id: string
  name: string
  description?: string
  address?: string | Address | Record<string, string>
  coordinates?: Coordinates
  categories?: Array<string | { name: string }>
  eventCapability?: 'none' | 'direct_creation' | 'request_required'
  isPrivateVenue?: boolean
  isPublicSpace?: boolean
  hasOwner?: boolean
}

interface LocationInteractionsProps {
  location: Location
  currentUserId?: string
  className?: string
  compact?: boolean
  showEventRequest?: boolean
}

interface EventRequestFormData {
  eventTitle: string
  eventDescription: string
  eventType: string
  requestedDate: string
  requestedTime: string
  expectedAttendees: number
  expectedGuests: number
  specialRequests: string
  contactEmail: string
}

interface InteractionData {
  type: string
  user?: string
  location?: string
}

interface InteractionResponse {
  success?: boolean
  interactions?: InteractionData[]
  counts?: {
    likes: number
    saves: number
    checkIns: number
    visits: number
    shares: number
  }
}

const LocationInteractions = memo(function LocationInteractions({ 
  location, 
  currentUserId, 
  className = '',
  compact = false,
  showEventRequest = true
}: LocationInteractionsProps) {
  const [interactions, setInteractions] = useState({
    liked: false,
    saved: false,
    subscribed: false,
    checkedIn: false,
  })
  
  const [counts, setCounts] = useState({
    likes: 0,
    saves: 0,
    checkIns: 0,
    visits: 0,
    shares: 0,
  })
  
  const [isLoading, setIsLoading] = useState({
    like: false,
    save: false,
    checkIn: false,
    share: false,
    eventRequest: false,
  })
  
  const [isEventRequestOpen, setIsEventRequestOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eventRequest, setEventRequest] = useState<EventRequestFormData>({
    eventTitle: '',
    eventDescription: '',
    eventType: 'private_event',
    requestedDate: '',
    requestedTime: '',
    expectedAttendees: 10,
    expectedGuests: 0,
    specialRequests: '',
    contactEmail: '',
  })

  // Debounced interaction handler
  const debouncedInteraction = useCallback(
    debounce(async (type: string, coordinates?: { latitude: number; longitude: number }) => {
      if (!currentUserId) {
        toast.error('Please log in to interact with locations')
        return
      }

      setIsLoading(prev => ({ ...prev, [type]: true }))
      
      try {
        const { data, response } = await optimizedFetch('/api/locations/interactions', {
          method: 'POST',
          body: JSON.stringify({
            locationId: location.id,
            interactionType: type,
            coordinates,
            platform: 'web',
            metadata: {
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
            }
          }),
          skipCache: true, // Don't cache POST requests
        })

        if (response.ok) {
          // Update local state optimistically
          setInteractions(prev => ({ ...prev, [type]: true }))
          setCounts(prev => ({ 
            ...prev, 
            [`${type}s`]: (prev[`${type}s` as keyof typeof prev] as number) + 1 
          }))
          
          toast.success(`Successfully ${type}d this location!`)
        } else {
          throw new Error(data.error || `Failed to ${type} location`)
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error ${type}ing location:`, error)
        
        // Handle specific error cases
        if (errorMessage.includes('429')) {
          toast.error('Too many requests, please wait a moment')
        } else if (errorMessage.includes('409')) {
          toast.info(`You have already ${type}d this location`)
        } else {
          toast.error(`Failed to ${type} location. Please try again.`)
        }
      } finally {
        setIsLoading(prev => ({ ...prev, [type]: false }))
      }
    }, 1000), // Increased debounce time to prevent spam
    [currentUserId, location.id]
  )

  // Load interactions with caching
  const loadUserInteractions = useCallback(async () => {
    if (!currentUserId || !location.id) return

    try {
      const { data } = await optimizedFetch(
        `/api/locations/interactions?locationId=${location.id}&userId=${currentUserId}`, 
        { ttl: 60 * 1000 } // 1 minute cache
      ) as { data: InteractionResponse }

      if (data.success !== false) {
        const userInteractions = {
          liked: data.interactions?.some((i: InteractionData) => i.type === 'like') || false,
          saved: data.interactions?.some((i: InteractionData) => i.type === 'save') || false,
          subscribed: data.interactions?.some((i: InteractionData) => i.type === 'subscribe') || false,
          checkedIn: data.interactions?.some((i: InteractionData) => i.type === 'checkIn' || i.type === 'check_in') || false,
        }
        
        setInteractions(userInteractions)
        
        if (data.counts) {
          setCounts(data.counts)
        }
      }
    } catch (error) {
      console.error('Error loading user interactions:', error)
    }
  }, [currentUserId, location.id])

  // Only load interactions once when component mounts or dependencies change
  useEffect(() => {
    // Only attempt to load interactions if we have a current user
    if (currentUserId) {
      loadUserInteractions()
    }
    // If no currentUserId, just continue without loading - don't show loading state
  }, [loadUserInteractions, currentUserId])

  // Event handlers with debouncing
  const handleLike = useCallback(() => {
    debouncedInteraction('like')
  }, [debouncedInteraction])

  const handleSave = useCallback(() => {
    debouncedInteraction('save')
  }, [debouncedInteraction])

  const handleCheckIn = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          debouncedInteraction('checkIn', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        () => {
          debouncedInteraction('checkIn')
        }
      )
    } else {
      debouncedInteraction('checkIn')
    }
  }, [debouncedInteraction])

  const handleShare = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, share: true }))
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: location.name,
          text: `Check out ${location.name}!`,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
      }

      // Record share interaction
      debouncedInteraction('share')
    } catch (error) {
      console.error('Error sharing:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, share: false }))
    }
  }, [location.name, debouncedInteraction])

  const submitEventRequest = useCallback(async () => {
    if (!currentUserId) {
      toast.error('Please log in to submit event requests')
      return
    }

    console.log('=== FORM SUBMISSION START ===');
    console.log('Current form state before validation:', JSON.stringify(eventRequest, null, 2));

    // Improved validation with specific field checks
    const missingFields = [];
    if (!eventRequest.eventTitle.trim()) missingFields.push('Event Title');
    if (!eventRequest.eventDescription.trim()) missingFields.push('Event Description');

    console.log('Validation results:', {
      eventTitle: { value: eventRequest.eventTitle, valid: eventRequest.eventTitle.trim().length > 0 },
      eventDescription: { value: eventRequest.eventDescription, valid: eventRequest.eventDescription.trim().length > 0 },
      missingFields
    });

    if (missingFields.length > 0) {
      console.log('Validation failed, missing fields:', missingFields);
      toast.error(`Please fill in the following required fields: ${missingFields.join(', ')}`)
      return
    }

    setIsSubmitting(true)
    
    try {
      // Get current user's email for contact
      const userResponse = await fetch('/api/users/me')
      let userEmail = eventRequest.contactEmail
      let userData = null
      
      if (userResponse.ok) {
        userData = await userResponse.json()
        userEmail = userData.user?.email || eventRequest.contactEmail
      } else if (userResponse.status === 401) {
        // User not authenticated - use provided email or empty
        userEmail = eventRequest.contactEmail
      } else {
        // Other error - use provided email or empty
        userEmail = eventRequest.contactEmail
      }

      console.log('User data from API:', { userEmail, accountEmail: userData?.user?.email });

      // Basic email validation if provided
      if (eventRequest.contactEmail && eventRequest.contactEmail.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(eventRequest.contactEmail)) {
          console.log('Email validation failed:', eventRequest.contactEmail);
          toast.error('Please enter a valid email address')
          return
        }
      }

      const requestBody = {
        eventTitle: eventRequest.eventTitle.trim(),
        eventDescription: eventRequest.eventDescription.trim(),
        eventType: 'event_request', // Simple type for requests
        locationId: location.id,
        requestedDate: new Date().toISOString().split('T')[0], // Use today as placeholder
        requestedTime: '18:00', // Default time placeholder
        expectedAttendees: eventRequest.expectedAttendees || 10,
        expectedGuests: eventRequest.expectedGuests || 0,
        specialRequests: eventRequest.specialRequests?.trim() || '',
        contactEmail: eventRequest.contactEmail?.trim() || userEmail,
      };

      console.log('=== FINAL REQUEST DETAILS ===');
      console.log('Request body to send:', JSON.stringify(requestBody, null, 2));
      console.log('Request headers will include: Content-Type: application/json');
      console.log('=====================================');

      const { data, response } = await optimizedFetch('/api/locations/event-requests', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        skipCache: true,
      })

      console.log('=== API RESPONSE ===');
      console.log('Response status:', response.status, response.statusText);
      console.log('Response data:', data);
      console.log('===================');

      if (response.ok) {
        console.log('✅ Request submitted successfully');
        toast.success('Event request submitted successfully!')
        setIsEventRequestOpen(false)
        // Reset form
        setEventRequest({
          eventTitle: '',
          eventDescription: '',
          eventType: 'private_event',
          requestedDate: '',
          requestedTime: '',
          expectedAttendees: 10,
          expectedGuests: 0,
          specialRequests: '',
          contactEmail: '',
        })
      } else {
        console.log('❌ Request failed with status:', response.status);
        console.log('Error data:', data);
        // Handle different error types based on the new API responses
        if (data.suggestion === 'redirect_to_create_event') {
          // Public space - suggest creating event directly
          toast.error(
            <div className="space-y-2">
              <p className="font-medium">This is a public space!</p>
              <p className="text-sm">{data.message}</p>
              <button 
                onClick={() => {
                  setIsEventRequestOpen(false)
                  // Redirect to create event page with location pre-filled
                  window.location.href = `/events/create?locationId=${location.id}&locationName=${encodeURIComponent(location.name)}`
                }}
                className="text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Create Event Instead →
              </button>
            </div>
          )
        } else if (data.suggestion === 'contact_support') {
          // Unknown location type
          toast.error(
            <div className="space-y-2">
              <p className="font-medium">Location not supported</p>
              <p className="text-sm">{data.message}</p>
            </div>
          )
        } else {
          // Generic error
          toast.error(data.error || 'Failed to submit event request')
        }
      }
    } catch (error) {
      console.error('❌ Exception during request submission:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
      console.log('=== FORM SUBMISSION END ===');
    }
  }, [currentUserId, eventRequest, location.id, location.name])

  // Memoize the interaction buttons to prevent unnecessary re-renders
  const interactionButtons = useMemo(() => {
    if (compact) {
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLoading.like}
            className="h-8 px-2"
          >
            <Heart className={`h-3 w-3 ${interactions.liked ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="ml-1 text-xs">{counts.likes}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={isLoading.save}
            className="h-8 px-2"
          >
            <Bookmark className={`h-3 w-3 ${interactions.saved ? 'fill-blue-500 text-blue-500' : ''}`} />
            <span className="ml-1 text-xs">{counts.saves}</span>
          </Button>
        </div>
      )
    }

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant={interactions.liked ? "default" : "outline"}
          size="sm"
          onClick={handleLike}
          disabled={isLoading.like}
          className="flex items-center gap-1"
        >
          <Heart className={`h-4 w-4 ${interactions.liked ? 'fill-current' : ''}`} />
          <span>{interactions.liked ? 'Liked' : 'Like'}</span>
          <span className="text-xs opacity-70">({counts.likes})</span>
        </Button>

        <Button
          variant={interactions.saved ? "default" : "outline"}
          size="sm"
          onClick={handleSave}
          disabled={isLoading.save}
          className="flex items-center gap-1"
        >
          <Bookmark className={`h-4 w-4 ${interactions.saved ? 'fill-current' : ''}`} />
          <span>{interactions.saved ? 'Saved' : 'Save'}</span>
          <span className="text-xs opacity-70">({counts.saves})</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCheckIn}
          disabled={isLoading.checkIn}
          className="flex items-center gap-1"
        >
          <MapPin className="h-4 w-4" />
          <span>Check In</span>
          <span className="text-xs opacity-70">({counts.checkIns})</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          disabled={isLoading.share}
          className="flex items-center gap-1"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
          <span className="text-xs opacity-70">({counts.shares})</span>
        </Button>

        {showEventRequest && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (location.eventCapability === 'direct_creation') {
                // Redirect to create event for public spaces
                window.location.href = `/events/create?locationId=${location.id}&locationName=${encodeURIComponent(location.name)}`
              } else {
                // Pre-populate contact email if empty
                if (!eventRequest.contactEmail) {
                  try {
                    const userResponse = await fetch('/api/users/me')
                    if (userResponse.ok) {
                      const userData = await userResponse.json()
                      if (userData.user?.email) {
                        setEventRequest(prev => ({ 
                          ...prev, 
                          contactEmail: userData.user.email 
                        }))
                      }
                    } else if (userResponse.status === 401) {
                      // User not authenticated - skip pre-population
                      console.log('User not authenticated, skipping email pre-population')
                    }
                  } catch (error) {
                    console.log('Could not fetch user email:', error)
                  }
                }
                // Show request form for private venues
                setIsEventRequestOpen(true)
              }
            }}
            disabled={!currentUserId}
            className="flex items-center gap-1"
          >
            <Calendar className="h-4 w-4" />
            <span>
              {location.eventCapability === 'direct_creation' ? 'Create Event' : 'Request Event'}
            </span>
          </Button>
        )}
      </div>
    )
  }, [compact, interactions, counts, isLoading, handleLike, handleSave, handleCheckIn, handleShare, showEventRequest, currentUserId, location.eventCapability, eventRequest.contactEmail])

  return (
    <div className={className}>
      {interactionButtons}

      {/* Event Request Modal */}
      <Dialog open={isEventRequestOpen} onOpenChange={setIsEventRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Event at {location.name}</DialogTitle>
            <DialogDescription>
              Submit a request to host an event at this location. The location owner will review your request and get back to you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="eventTitle">Event Title *</Label>
              <Input
                id="eventTitle"
                value={eventRequest.eventTitle}
                onChange={(e) => setEventRequest(prev => ({ ...prev, eventTitle: e.target.value }))}
                placeholder="What&apos;s your event called?"
              />
            </div>
            
            <div>
              <Label htmlFor="eventDescription">Event Description *</Label>
              <Textarea
                id="eventDescription"
                value={eventRequest.eventDescription}
                onChange={(e) => setEventRequest(prev => ({ ...prev, eventDescription: e.target.value }))}
                placeholder="Describe your event idea and what you&apos;d like to do..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="expectedAttendees">Expected Attendees (Optional)</Label>
              <Input
                id="expectedAttendees"
                type="number"
                min="1"
                value={eventRequest.expectedAttendees}
                onChange={(e) => setEventRequest(prev => ({ ...prev, expectedAttendees: parseInt(e.target.value) || 10 }))}
                placeholder="Approximate number of guests"
              />
            </div>

            <div>
              <Label htmlFor="expectedGuests">Expected Guests (Optional)</Label>
              <Input
                id="expectedGuests"
                type="number"
                min="0"
                value={eventRequest.expectedGuests}
                onChange={(e) => setEventRequest(prev => ({ ...prev, expectedGuests: parseInt(e.target.value) || 0 }))}
                placeholder="How many guests do you expect? (e.g., 1 for single guest, 12 for monthly series)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Helps the location owner understand if this is a one-time or recurring arrangement
              </p>
            </div>

            <div>
              <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
              <Textarea
                id="specialRequests"
                value={eventRequest.specialRequests}
                onChange={(e) => setEventRequest(prev => ({ ...prev, specialRequests: e.target.value }))}
                placeholder="Any special requirements, setup needs, or questions..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="contactEmail">Contact Email (Optional)</Label>
              <Input
                id="contactEmail"
                type="email"
                value={eventRequest.contactEmail}
                onChange={(e) => setEventRequest(prev => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="Leave blank to use your account email"
              />
              <p className="text-xs text-gray-500 mt-1">
                We&apos;ll use your account email if you don&apos;t provide one
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventRequestOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitEventRequest} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})

export default LocationInteractions